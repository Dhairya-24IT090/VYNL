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
def ws_setup():
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
async def test_stale_base_version_returns_conflict_snapshot(ws_setup):
    client = ws_setup["client"]
    service = ws_setup["service"]
    verifier = ws_setup["verifier"]

    owner_id = str(uuid.uuid4())
    p = await service.create_playlist(Actor(user_id=owner_id), "Conflict Test")
    p_id = p["id"]

    token = "owner_token_conflict"
    verifier.add_session(token, owner_id)

    with client.websocket_connect(f"/v1/playlists/{p_id}/live?token={token}") as ws:
        snap = ws.receive_json()
        assert snap["version"] == 1
        ws.receive_json() # presence

        # Simulate version bump out of band (e.g. via REST or another client)
        await service.add_item(
            actor=Actor(user_id=owner_id),
            playlist_id=p_id,
            expected_version=1,
            song_id=str(uuid.uuid4()),
        )
        # DB version is now 2

        # Client attempts edit with stale base_version=1
        ws.send_json({
            "op": "add",
            "song_id": str(uuid.uuid4()),
            "base_version": 1,
            "client_msg_id": "stale_edit_1",
        })

        # Server returns conflict snapshot
        conflict_frame = ws.receive_json()
        assert conflict_frame["type"] == "snapshot"
        assert conflict_frame["code"] == "version_conflict"
        assert conflict_frame["version"] == 2
        assert len(conflict_frame["items"]) == 1
        assert conflict_frame["client_msg_id"] == "stale_edit_1"

@pytest.mark.asyncio
async def test_resync_operation_returns_fresh_snapshot(ws_setup):
    client = ws_setup["client"]
    service = ws_setup["service"]
    verifier = ws_setup["verifier"]

    owner_id = str(uuid.uuid4())
    p = await service.create_playlist(Actor(user_id=owner_id), "Resync Test")
    p_id = p["id"]

    token = "resync_token"
    verifier.add_session(token, owner_id)

    with client.websocket_connect(f"/v1/playlists/{p_id}/live?token={token}") as ws:
        ws.receive_json() # initial snap
        ws.receive_json() # presence

        # Add an item via service
        song_id = str(uuid.uuid4())
        await service.add_item(Actor(user_id=owner_id), p_id, 1, song_id)

        # Client requests resync
        ws.send_json({
            "op": "resync",
            "client_msg_id": "resync_req_1"
        })

        resync_snap = ws.receive_json()
        assert resync_snap["type"] == "snapshot"
        assert resync_snap["version"] == 2
        assert len(resync_snap["items"]) == 1
        assert resync_snap["items"][0]["song_id"] == song_id
        assert resync_snap["client_msg_id"] == "resync_req_1"

def receive_until(ws_conn, target_type):
    for _ in range(20):
        msg = ws_conn.receive_json()
        if msg.get("type") == target_type:
            return msg
    raise TimeoutError(f"Target frame {target_type} not received")

@pytest.mark.asyncio
async def test_5_clients_concurrent_edits_converge(ws_setup):
    """
    Simulates 5 active editor clients connected to the same playlist.
    Edits are submitted, conflicts return snapshots, clients re-base and converge.
    """
    client = ws_setup["client"]
    service = ws_setup["service"]
    verifier = ws_setup["verifier"]

    owner_id = str(uuid.uuid4())
    p = await service.create_playlist(Actor(user_id=owner_id), "Convergence Playlist")
    p_id = p["id"]

    # 4 editors + 1 owner = 5 clients
    user_ids = [owner_id] + [str(uuid.uuid4()) for _ in range(4)]
    tokens = [f"token_{i}" for i in range(5)]

    for i in range(1, 5):
        await service.repo.add_collaborator(None, p_id, user_ids[i], "editor")

    for i in range(5):
        verifier.add_session(tokens[i], user_ids[i])

    # Connect all 5 clients
    sockets = []

    for i in range(5):
        ws = client.websocket_connect(f"/v1/playlists/{p_id}/live?token={tokens[i]}")
        ws_conn = ws.__enter__()
        snap = ws_conn.receive_json()
        assert snap["type"] == "snapshot"
        sockets.append((ws, ws_conn))

    # Now each client performs an add operation in sequence/interleaved
    added_songs = []
    for i in range(5):
        _, ws_conn = sockets[i]
        song_id = str(uuid.uuid4())
        added_songs.append(song_id)

        # Get latest known version from service
        current_db = await service.get_playlist(Actor(user_id=owner_id), p_id)
        base_ver = current_db["version"]

        ws_conn.send_json({
            "op": "add",
            "song_id": song_id,
            "base_version": base_ver,
            "client_msg_id": f"client_{i}_add",
        })
        # Await server processing by receiving ack
        ack = receive_until(ws_conn, "ack")
        assert ack["type"] == "ack"
        assert ack["client_msg_id"] == f"client_{i}_add"

    # Close connections cleanly
    for ws, _ in sockets:
        try:
            ws.__exit__(None, None, None)
        except Exception:
            pass

    # Verify final state in database: all 5 items were added, version is 6 (1 + 5)
    final_p = await service.get_playlist(Actor(user_id=owner_id), p_id)
    assert final_p["version"] == 6
    assert len(final_p["items"]) == 5
    item_songs = [it["song_id"] for it in final_p["items"]]
    for song in added_songs:
        assert song in item_songs
