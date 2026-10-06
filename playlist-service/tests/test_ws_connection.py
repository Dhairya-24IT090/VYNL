import asyncio
import json
import uuid
import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient
from starlette.websockets import WebSocketDisconnect

from service_kit.auth import InMemorySessionVerifier
from service_kit.context import Actor
from playlist_service.models import CreatePlaylistDTO
from playlist_service.routes.ws import create_ws_router
from playlist_service.ws import (
    CollabManager,
    WS_CLOSE_FORBIDDEN,
    WS_CLOSE_LIMIT_EXCEEDED,
    MAX_CLUSTER_SOCKETS_PER_PLAYLIST,
)
from tests.test_authz import MockDatabaseManager, MockPlaylistRepository
from playlist_service.service import PlaylistService

@pytest.fixture
def test_setup():
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
async def test_ws_handshake_rejects_missing_auth(test_setup):
    client = test_setup["client"]
    service = test_setup["service"]
    owner_id = str(uuid.uuid4())

    # Create playlist
    p = await service.create_playlist(Actor(user_id=owner_id), "Rock Anthems")
    p_id = p["id"]

    # Connect without cookie or token
    with pytest.raises(WebSocketDisconnect) as exc_info:
        with client.websocket_connect(f"/v1/playlists/{p_id}/live"):
            pass
    assert exc_info.value.code == WS_CLOSE_FORBIDDEN

@pytest.mark.asyncio
async def test_ws_handshake_rejects_invalid_session(test_setup):
    client = test_setup["client"]
    service = test_setup["service"]
    owner_id = str(uuid.uuid4())

    p = await service.create_playlist(Actor(user_id=owner_id), "Rock Anthems")
    p_id = p["id"]

    # Connect with invalid session
    with pytest.raises(WebSocketDisconnect) as exc_info:
        with client.websocket_connect(f"/v1/playlists/{p_id}/live?token=bogus_token"):
            pass
    assert exc_info.value.code == WS_CLOSE_FORBIDDEN

@pytest.mark.asyncio
async def test_ws_handshake_rejects_stranger(test_setup):
    client = test_setup["client"]
    service = test_setup["service"]
    verifier = test_setup["verifier"]

    owner_id = str(uuid.uuid4())
    stranger_id = str(uuid.uuid4())

    p = await service.create_playlist(Actor(user_id=owner_id), "Secret Playlist")
    p_id = p["id"]

    # Valid session for stranger
    stranger_token = "stranger_session"
    verifier.add_session(stranger_token, stranger_id)

    with pytest.raises(WebSocketDisconnect) as exc_info:
        with client.websocket_connect(f"/v1/playlists/{p_id}/live?token={stranger_token}"):
            pass
    assert exc_info.value.code == WS_CLOSE_FORBIDDEN

@pytest.mark.asyncio
async def test_ws_handshake_allows_owner_editor_viewer(test_setup):
    client = test_setup["client"]
    service = test_setup["service"]
    verifier = test_setup["verifier"]

    owner_id = str(uuid.uuid4())
    editor_id = str(uuid.uuid4())
    viewer_id = str(uuid.uuid4())

    p = await service.create_playlist(Actor(user_id=owner_id), "Team Playlist")
    p_id = p["id"]

    # Add collaborators
    await service.repo.add_collaborator(None, p_id, editor_id, "editor")
    await service.repo.add_collaborator(None, p_id, viewer_id, "viewer")

    # Tokens
    owner_token = "owner_sess"
    editor_token = "editor_sess"
    viewer_token = "viewer_sess"

    verifier.add_session(owner_token, owner_id)
    verifier.add_session(editor_token, editor_id)
    verifier.add_session(viewer_token, viewer_id)

    # Owner connects
    with client.websocket_connect(f"/v1/playlists/{p_id}/live?token={owner_token}") as ws:
        init_frame = ws.receive_json()
        assert init_frame["type"] == "snapshot"
        assert init_frame["role"] == "owner"
        assert init_frame["version"] == 1

    # Editor connects
    with client.websocket_connect(f"/v1/playlists/{p_id}/live?token={editor_token}") as ws:
        init_frame = ws.receive_json()
        assert init_frame["type"] == "snapshot"
        assert init_frame["role"] == "editor"

    # Viewer connects
    with client.websocket_connect(f"/v1/playlists/{p_id}/live?token={viewer_token}") as ws:
        init_frame = ws.receive_json()
        assert init_frame["type"] == "snapshot"
        assert init_frame["role"] == "viewer"

@pytest.mark.asyncio
async def test_ws_enforces_50_socket_cluster_limit(test_setup):
    client = test_setup["client"]
    service = test_setup["service"]
    verifier = test_setup["verifier"]
    collab = test_setup["collab"]

    owner_id = str(uuid.uuid4())
    p = await service.create_playlist(Actor(user_id=owner_id), "Hot 100")
    p_id = p["id"]

    owner_token = "owner_token"
    verifier.add_session(owner_token, owner_id)

    # Simulate 50 active sockets already acquired in cluster
    for _ in range(MAX_CLUSTER_SOCKETS_PER_PLAYLIST):
        slot = await collab.acquire_cluster_slot(p_id)
        assert slot is True

    # 51st attempt must be rejected with 4429
    with pytest.raises(WebSocketDisconnect) as exc_info:
        with client.websocket_connect(f"/v1/playlists/{p_id}/live?token={owner_token}"):
            pass
    assert exc_info.value.code == WS_CLOSE_LIMIT_EXCEEDED

    # Release one slot
    await collab.release_cluster_slot(p_id)

    # Now connection succeeds
    with client.websocket_connect(f"/v1/playlists/{p_id}/live?token={owner_token}") as ws:
        frame = ws.receive_json()
        assert frame["type"] == "snapshot"
