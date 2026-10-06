import asyncio
import json
import uuid
import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient
from starlette.websockets import WebSocketDisconnect

from service_kit.auth import InMemorySessionVerifier
from service_kit.context import Actor
from playlist_service.routes.ws import create_ws_router
from playlist_service.service import PlaylistService
from playlist_service.ws import (
    CollabManager,
    WS_CLOSE_GOING_AWAY,
    WS_CLOSE_FORBIDDEN,
)
from tests.test_authz import MockDatabaseManager, MockPlaylistRepository

@pytest.fixture
def shutdown_setup():
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
        "app": app,
    }

@pytest.mark.asyncio
async def test_shutdown_draining_sends_1001_and_preserves_state(shutdown_setup):
    """
    Verifies that initiating shutdown drains all connected sockets with code 1001 (Going Away).
    Client reconnects to healthy node/after restart and verifies no data loss.
    """
    client = shutdown_setup["client"]
    service = shutdown_setup["service"]
    verifier = shutdown_setup["verifier"]
    collab = shutdown_setup["collab"]

    owner_id = str(uuid.uuid4())
    p = await service.create_playlist(Actor(user_id=owner_id), "Draining Test Playlist")
    p_id = p["id"]

    token = "token_drain_1"
    verifier.add_session(token, owner_id)

    # 1. Connect client and perform an edit
    with client.websocket_connect(f"/v1/playlists/{p_id}/live?token={token}") as ws:
        snap = ws.receive_json()
        assert snap["version"] == 1

        song1 = str(uuid.uuid4())
        ws.send_json({
            "op": "add",
            "song_id": song1,
            "base_version": 1,
            "client_msg_id": "drain_add_1",
        })

        # Drain messages until ack
        while True:
            msg = ws.receive_json()
            if msg.get("type") == "ack":
                assert msg["version"] == 2
                break

        # 2. Server initiates graceful shutdown / draining
        await collab.close_all_draining()

        # 3. Reading from socket drains queued frames and raises WebSocketDisconnect with code 1001
        with pytest.raises(WebSocketDisconnect) as exc_info:
            while True:
                ws.receive_text()
        assert exc_info.value.code == WS_CLOSE_GOING_AWAY
        assert "shutting down" in exc_info.value.reason.lower()

    # 4. Client reconnects (simulating reconnection to sibling node or post-restart)
    # Verifies zero data loss: state preserved at version 2 with song1 intact
    with client.websocket_connect(f"/v1/playlists/{p_id}/live?token={token}") as ws_reconnected:
        reconnect_snap = ws_reconnected.receive_json()
        assert reconnect_snap["type"] == "snapshot"
        assert reconnect_snap["version"] == 2
        assert len(reconnect_snap["items"]) == 1
        assert reconnect_snap["items"][0]["song_id"] == song1

@pytest.mark.asyncio
async def test_close_code_4403_on_permission_revocation(shutdown_setup):
    """
    Verifies close code 4403 is emitted for unauthorized attempts, halting reconnection.
    """
    client = shutdown_setup["client"]
    service = shutdown_setup["service"]
    verifier = shutdown_setup["verifier"]

    owner_id = str(uuid.uuid4())
    stranger_id = str(uuid.uuid4())

    p = await service.create_playlist(Actor(user_id=owner_id), "Private Playlist")
    p_id = p["id"]

    stranger_token = "stranger_token_revoked"
    verifier.add_session(stranger_token, stranger_id)

    # Stranger attempts connection -> receives 4403
    with pytest.raises(WebSocketDisconnect) as exc_info:
        with client.websocket_connect(f"/v1/playlists/{p_id}/live?token={stranger_token}"):
            pass
    assert exc_info.value.code == WS_CLOSE_FORBIDDEN
