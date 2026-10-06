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

@pytest.fixture
def protocol_setup():
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
async def test_viewer_edit_rejected_on_open_socket(protocol_setup):
    client = protocol_setup["client"]
    service = protocol_setup["service"]
    verifier = protocol_setup["verifier"]

    owner_id = str(uuid.uuid4())
    viewer_id = str(uuid.uuid4())

    # Create playlist and add viewer
    p = await service.create_playlist(Actor(user_id=owner_id), "Summer Hits")
    p_id = p["id"]
    await service.repo.add_collaborator(None, p_id, viewer_id, "viewer")

    viewer_token = "viewer_token_abc"
    verifier.add_session(viewer_token, viewer_id)

    with client.websocket_connect(f"/v1/playlists/{p_id}/live?token={viewer_token}") as ws:
        # Receive snapshot and presence
        snap = ws.receive_json()
        assert snap["type"] == "snapshot"
        assert snap["role"] == "viewer"
        presence = ws.receive_json()
        assert presence["type"] == "presence"

        # Attempt to add an item
        add_msg_id = "msg_viewer_add_1"
        ws.send_json({
            "op": "add",
            "song_id": str(uuid.uuid4()),
            "base_version": 1,
            "client_msg_id": add_msg_id,
        })

        # Must receive error frame rejecting the mutation
        err_frame = ws.receive_json()
        assert err_frame["type"] == "error"
        assert err_frame["code"] == "forbidden"
        assert "cannot mutate" in err_frame["message"]
        assert err_frame["client_msg_id"] == add_msg_id

        # Attempt to move an item
        move_msg_id = "msg_viewer_move_1"
        ws.send_json({
            "op": "move",
            "item_id": str(uuid.uuid4()),
            "base_version": 1,
            "client_msg_id": move_msg_id,
        })
        err_frame2 = ws.receive_json()
        assert err_frame2["type"] == "error"
        assert err_frame2["code"] == "forbidden"
        assert err_frame2["client_msg_id"] == move_msg_id

        # Attempt to remove an item
        remove_msg_id = "msg_viewer_remove_1"
        ws.send_json({
            "op": "remove",
            "item_id": str(uuid.uuid4()),
            "base_version": 1,
            "client_msg_id": remove_msg_id,
        })
        err_frame3 = ws.receive_json()
        assert err_frame3["type"] == "error"
        assert err_frame3["code"] == "forbidden"
        assert err_frame3["client_msg_id"] == remove_msg_id

    # Verify playlist remains unchanged at version 1 with 0 items
    current = await service.get_playlist(Actor(user_id=owner_id), p_id)
    assert current["version"] == 1
    assert len(current["items"]) == 0

@pytest.mark.asyncio
async def test_editor_and_owner_edits_accepted_on_open_socket(protocol_setup):
    client = protocol_setup["client"]
    service = protocol_setup["service"]
    verifier = protocol_setup["verifier"]

    owner_id = str(uuid.uuid4())
    editor_id = str(uuid.uuid4())

    p = await service.create_playlist(Actor(user_id=owner_id), "Collab Jam")
    p_id = p["id"]
    await service.repo.add_collaborator(None, p_id, editor_id, "editor")

    editor_token = "editor_token_xyz"
    verifier.add_session(editor_token, editor_id)

    with client.websocket_connect(f"/v1/playlists/{p_id}/live?token={editor_token}") as ws:
        snap = ws.receive_json()
        assert snap["type"] == "snapshot"
        assert snap["role"] == "editor"
        pres = ws.receive_json()
        assert pres["type"] == "presence"

        song1 = str(uuid.uuid4())
        ws.send_json({
            "op": "add",
            "song_id": song1,
            "base_version": 1,
            "client_msg_id": "editor_add_1",
        })

        # Editor receives ack frame
        ack = ws.receive_json()
        assert ack["type"] == "ack"
        assert ack["client_msg_id"] == "editor_add_1"
        assert ack["version"] == 2

        # And local broadcast op_applied frame
        op_applied = ws.receive_json()
        assert op_applied["type"] == "op_applied"
        assert op_applied["op"] == "add"
        assert op_applied["version"] == 2
        assert len(op_applied["items"]) == 1
        assert op_applied["items"][0]["song_id"] == song1

    # Verify playlist has version 2 in DB
    current = await service.get_playlist(Actor(user_id=owner_id), p_id)
    assert current["version"] == 2
    assert len(current["items"]) == 1

@pytest.mark.asyncio
async def test_demoted_collaborator_rejected_on_subsequent_edit(protocol_setup):
    client = protocol_setup["client"]
    service = protocol_setup["service"]
    verifier = protocol_setup["verifier"]

    owner_id = str(uuid.uuid4())
    user_id = str(uuid.uuid4())

    p = await service.create_playlist(Actor(user_id=owner_id), "Dynamic Roles")
    p_id = p["id"]
    # Initially user is an editor
    await service.repo.add_collaborator(None, p_id, user_id, "editor")

    user_token = "user_dyn_token"
    verifier.add_session(user_token, user_id)

    with client.websocket_connect(f"/v1/playlists/{p_id}/live?token={user_token}") as ws:
        snap = ws.receive_json()
        assert snap["role"] == "editor"
        pres = ws.receive_json()

        # Demote user to viewer mid-session in DB
        await service.repo.add_collaborator(None, p_id, user_id, "viewer")

        # Now attempt edit frame
        ws.send_json({
            "op": "add",
            "song_id": str(uuid.uuid4()),
            "base_version": 1,
            "client_msg_id": "attempt_after_demote",
        })

        # Due to per-frame authorization re-check, edit is rejected!
        err = ws.receive_json()
        assert err["type"] == "error"
        assert err["code"] == "forbidden"
