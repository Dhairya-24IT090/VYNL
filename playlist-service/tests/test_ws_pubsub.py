import asyncio
import json
import uuid
import pytest
import redis.asyncio as aioredis
from fastapi import FastAPI
from fastapi.testclient import TestClient

from service_kit.auth import InMemorySessionVerifier
from service_kit.context import Actor
from playlist_service.routes.ws import create_ws_router
from playlist_service.service import PlaylistService
from playlist_service.ws import CollabManager
from tests.test_authz import MockDatabaseManager, MockPlaylistRepository

def receive_until(ws_conn, target_type, max_frames=30):
    for _ in range(max_frames):
        msg = ws_conn.receive_json()
        if msg.get("type") == target_type:
            return msg
    raise TimeoutError(f"Target frame '{target_type}' not received within {max_frames} frames")

@pytest.mark.asyncio
async def test_redis_pubsub_fanout_across_nodes():
    """
    Tests Task 22: Clients on different instances see each other's edits via Redis Pub/Sub fan-out.
    Also verifies reconnecting to sibling node sees identical state.
    """
    # Shared database state
    db = MockDatabaseManager()
    repo = MockPlaylistRepository()
    service = PlaylistService(db, repo, draft_store=None)

    # Shared auth verifier
    verifier = InMemorySessionVerifier()

    # Redis connections for Node A and Node B
    redis_a = aioredis.from_url("redis://127.0.0.1:6379")
    redis_b = aioredis.from_url("redis://127.0.0.1:6379")

    collab_a = CollabManager(service=service, session_verifier=verifier, redis_client=redis_a)
    collab_b = CollabManager(service=service, session_verifier=verifier, redis_client=redis_b)

    app_a = FastAPI()
    app_a.include_router(create_ws_router(collab_a))
    client_a = TestClient(app_a)

    app_b = FastAPI()
    app_b.include_router(create_ws_router(collab_b))
    client_b = TestClient(app_b)

    owner_id = str(uuid.uuid4())
    editor_id = str(uuid.uuid4())

    p = await service.create_playlist(Actor(user_id=owner_id), "PubSub Multi-Node Playlist")
    p_id = p["id"]
    await service.repo.add_collaborator(None, p_id, editor_id, "editor")

    token_owner = "token_pubsub_owner"
    token_editor = "token_pubsub_editor"
    verifier.add_session(token_owner, owner_id)
    verifier.add_session(token_editor, editor_id)

    # Connect Client 1 (owner) to Node A and Client 2 (editor) to Node B
    with client_a.websocket_connect(f"/v1/playlists/{p_id}/live?token={token_owner}") as ws1:
        snap1 = ws1.receive_json()
        assert snap1["type"] == "snapshot"

        with client_b.websocket_connect(f"/v1/playlists/{p_id}/live?token={token_editor}") as ws2:
            snap2 = ws2.receive_json()
            assert snap2["type"] == "snapshot"
            assert snap2["version"] == 1

            # Give a brief moment for Redis pubsub subscription to establish
            await asyncio.sleep(0.1)

            # Client 1 on Node A adds a song
            song_to_add = str(uuid.uuid4())
            ws1.send_json({
                "op": "add",
                "song_id": song_to_add,
                "base_version": 1,
                "client_msg_id": "pubsub_msg_1",
            })

            # Client 1 receives ack and local op_applied
            ack = receive_until(ws1, "ack")
            assert ack["version"] == 2
            op1 = receive_until(ws1, "op_applied")
            assert op1["version"] == 2

            # Client 2 on Node B MUST receive op_applied via Redis pub/sub fan-out!
            op2 = receive_until(ws2, "op_applied")
            assert op2["type"] == "op_applied"
            assert op2["version"] == 2
            assert any(it["song_id"] == song_to_add for it in op2["items"])

    # Node A goes down (graceful draining)
    await collab_a.close_all_draining()

    # Client 1 reconnects to sibling Node B
    with client_b.websocket_connect(f"/v1/playlists/{p_id}/live?token={token_owner}") as ws1_reconnect:
        snap_reconnect = ws1_reconnect.receive_json()
        assert snap_reconnect["type"] == "snapshot"
        assert snap_reconnect["version"] == 2
        assert any(it["song_id"] == song_to_add for it in snap_reconnect["items"])

    # Clean up Redis clients
    try:
        await redis_a.aclose()
    except Exception:
        pass
    try:
        await redis_b.aclose()
    except Exception:
        pass
