import json
import uuid
import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

from service_kit.auth import InMemorySessionVerifier
from service_kit.context import Actor
from playlist_service.routes.ws import create_ws_router
from playlist_service.service import PlaylistService
from playlist_service.ws import CollabManager
from tests.test_authz import MockDatabaseManager, MockPlaylistRepository

class FrameCollector:
    def __init__(self, ws):
        self.ws = ws
        self.frames = []

    def get_frame(self, target_type, match_fn=None):
        for f in self.frames:
            if f.get("type") == target_type and (match_fn is None or match_fn(f)):
                return f
        for _ in range(30):
            f = self.ws.receive_json()
            self.frames.append(f)
            if f.get("type") == target_type and (match_fn is None or match_fn(f)):
                return f
        raise TimeoutError(f"Frame {target_type} not received")

@pytest.fixture
def suggestions_setup():
    db = MockDatabaseManager()
    repo = MockPlaylistRepository()
    service = PlaylistService(db, repo, draft_store=None)
    verifier = InMemorySessionVerifier()
    collab = CollabManager(service=service, session_verifier=verifier, redis_client=None)

    app = FastAPI()
    app.include_router(create_ws_router(collab))
    client = TestClient(app)

    return {
        "db": db,
        "repo": repo,
        "service": service,
        "verifier": verifier,
        "collab": collab,
        "client": client,
    }

@pytest.mark.asyncio
async def test_suggestion_lifecycle_pending_to_accepted_in_playlist(suggestions_setup):
    """
    Task 25 Done when: Accepted songs added via normal versioned edit path.
    Lifecycle: pending -> accepted -> in-playlist.
    """
    client = suggestions_setup["client"]
    service = suggestions_setup["service"]
    verifier = suggestions_setup["verifier"]
    collab = suggestions_setup["collab"]

    owner_id = str(uuid.uuid4())
    editor_id = str(uuid.uuid4())

    p = await service.create_playlist(Actor(user_id=owner_id), "AI Suggestions Playlist")
    p_id = p["id"]
    await service.repo.add_collaborator(None, p_id, editor_id, "editor")

    token_editor = "editor_sug_token"
    verifier.add_session(token_editor, editor_id)

    # 1. Suggestion is generated in system (status: pending)
    sug_id = str(uuid.uuid4())
    song_id = str(uuid.uuid4())
    await collab.add_suggestion(
        playlist_id=p_id,
        suggestion_id=sug_id,
        song_id=song_id,
        title="Bohemian Rhapsody",
        artist="Queen",
        reason="Matches rock style of playlist",
    )

    with client.websocket_connect(f"/v1/playlists/{p_id}/live?token={token_editor}") as ws:
        fc = FrameCollector(ws)
        snap = fc.get_frame("snapshot")
        assert snap["version"] == 1

        # Client receives pending suggestions
        sug_frame = fc.get_frame("suggestions", lambda f: any(s["suggestion_id"] == sug_id for s in f.get("suggestions", [])))
        sug_entry = next(s for s in sug_frame["suggestions"] if s["suggestion_id"] == sug_id)
        assert sug_entry["status"] == "pending"

        # Clear seen frames for new turn
        fc.frames.clear()

        # 2. Editor accepts suggestion via normal versioned edit frame
        ws.send_json({
            "op": "add",
            "suggestion_id": sug_id,
            "base_version": 1,
            "client_msg_id": "accept_sug_1",
        })

        # Editor receives ack with version 2
        ack = fc.get_frame("ack")
        assert ack["client_msg_id"] == "accept_sug_1"
        assert ack["version"] == 2

        # Sockets receive op_applied with new item added in playlist
        op_applied = fc.get_frame("op_applied")
        assert op_applied["version"] == 2
        assert len(op_applied["items"]) == 1
        assert op_applied["items"][0]["song_id"] == song_id

        # Suggestion status transitioned to accepted
        updated_sugs = fc.get_frame("suggestions", lambda f: any(s["suggestion_id"] == sug_id and s["status"] == "accepted" for s in f.get("suggestions", [])))
        accepted_entry = next(s for s in updated_sugs["suggestions"] if s["suggestion_id"] == sug_id)
        assert accepted_entry["status"] == "accepted"

    # 3. Verify playlist in DB has version 2 and contains the accepted song
    db_p = await service.get_playlist(Actor(user_id=owner_id), p_id)
    assert db_p["version"] == 2
    assert len(db_p["items"]) == 1
    assert db_p["items"][0]["song_id"] == song_id

@pytest.mark.asyncio
async def test_suggestion_lifecycle_pending_to_rejected(suggestions_setup):
    """
    Lifecycle: pending -> rejected.
    Rejected suggestions do NOT mutate playlist version or items.
    """
    client = suggestions_setup["client"]
    service = suggestions_setup["service"]
    verifier = suggestions_setup["verifier"]
    collab = suggestions_setup["collab"]

    owner_id = str(uuid.uuid4())
    p = await service.create_playlist(Actor(user_id=owner_id), "Reject Test Playlist")
    p_id = p["id"]

    token = "owner_rej_token"
    verifier.add_session(token, owner_id)

    # Suggestion generated
    sug_id = str(uuid.uuid4())
    song_id = str(uuid.uuid4())
    await collab.add_suggestion(
        playlist_id=p_id,
        suggestion_id=sug_id,
        song_id=song_id,
        title="Unwanted Track",
        artist="Unknown Artist",
    )

    with client.websocket_connect(f"/v1/playlists/{p_id}/live?token={token}") as ws:
        fc = FrameCollector(ws)
        fc.get_frame("snapshot")

        sug_frame = fc.get_frame("suggestions")
        assert sug_frame["suggestions"][0]["status"] == "pending"

        fc.frames.clear()

        # Owner rejects suggestion
        ws.send_json({
            "op": "suggestion.reject",
            "suggestion_id": sug_id,
            "client_msg_id": "reject_sug_1",
        })

        # Receives ack
        ack = fc.get_frame("ack")
        assert ack["client_msg_id"] == "reject_sug_1"

        # Receives updated suggestions with rejected status
        updated_sugs = fc.get_frame("suggestions")
        rej_entry = next(s for s in updated_sugs["suggestions"] if s["suggestion_id"] == sug_id)
        assert rej_entry["status"] == "rejected"

    # Playlist items and version remain unchanged in DB
    db_p = await service.get_playlist(Actor(user_id=owner_id), p_id)
    assert db_p["version"] == 1
    assert len(db_p["items"]) == 0

@pytest.mark.asyncio
async def test_viewer_cannot_accept_or_reject_suggestion(suggestions_setup):
    """
    Viewers must be forbidden from accepting or rejecting suggestions.
    """
    client = suggestions_setup["client"]
    service = suggestions_setup["service"]
    verifier = suggestions_setup["verifier"]
    collab = suggestions_setup["collab"]

    owner_id = str(uuid.uuid4())
    viewer_id = str(uuid.uuid4())

    p = await service.create_playlist(Actor(user_id=owner_id), "Viewer Guard Playlist")
    p_id = p["id"]
    await service.repo.add_collaborator(None, p_id, viewer_id, "viewer")

    token_viewer = "viewer_guard_token"
    verifier.add_session(token_viewer, viewer_id)

    sug_id = str(uuid.uuid4())
    song_id = str(uuid.uuid4())
    await collab.add_suggestion(p_id, sug_id, song_id, "Song", "Artist")

    with client.websocket_connect(f"/v1/playlists/{p_id}/live?token={token_viewer}") as ws:
        fc = FrameCollector(ws)
        fc.get_frame("snapshot")
        fc.get_frame("suggestions")

        fc.frames.clear()

        # Attempt to reject
        ws.send_json({
            "op": "suggestion.reject",
            "suggestion_id": sug_id,
            "client_msg_id": "viewer_rej_attempt",
        })
        err = fc.get_frame("error")
        assert err["code"] == "forbidden"

        fc.frames.clear()

        # Attempt to accept (add)
        ws.send_json({
            "op": "add",
            "suggestion_id": sug_id,
            "base_version": 1,
            "client_msg_id": "viewer_acc_attempt",
        })
        err2 = fc.get_frame("error")
        assert err2["code"] == "forbidden"
