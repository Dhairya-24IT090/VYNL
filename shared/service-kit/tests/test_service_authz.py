"""
Service-level authorization tests per Task 47 [F20-2-c-b] and docs/AUTHZ.md.
Verifies that direct service calls with wrong user or missing/spoofed credentials
are strictly rejected across playlist-service and wrap-service.
"""
import uuid
import httpx
import pytest
import pytest_asyncio

from service_kit.auth import InMemorySessionVerifier, sign_internal_auth
from service_kit.redis_ import RedisManager
from tests.test_authz import MockDatabaseManager, MockPlaylistRepository

# Playlist Service App
from playlist_service.config import PlaylistSettings
from playlist_service.drafts import DraftStore
from playlist_service.main import create_app as create_playlist_app

# Wrap Service App
from wrap_service.config import WrapSettings
from wrap_service.main import create_app as create_wrap_app

SECRET = "test-internal-secret"

@pytest_asyncio.fixture
async def playlist_authz_setup():
    settings = PlaylistSettings()
    settings.INTERNAL_AUTH_SECRET = SECRET
    db = MockDatabaseManager()
    redis_mgr = RedisManager(redis_url="redis://127.0.0.1:6379")
    verifier = InMemorySessionVerifier()
    drafts = DraftStore(redis_mgr._client)
    repo = MockPlaylistRepository()

    # Pre-populate repository with User A's playlist
    user_a = str(uuid.uuid4())
    user_b = str(uuid.uuid4())
    user_c = str(uuid.uuid4())  # Viewer

    p_a = await repo.create_playlist(
        conn=None,
        playlist_id=str(uuid.uuid4()),
        owner_id=user_a,
        title="User A Private Playlist",
        is_collaborative=False,
    )
    # Add an item to playlist A
    item_id = str(uuid.uuid4())
    repo.items[p_a["id"]] = [{
        "id": item_id,
        "playlist_id": p_a["id"],
        "song_id": "song-101",
        "position": "a0",
        "added_by": user_a,
    }]

    # Collaborative playlist where User C is a viewer
    p_collab = await repo.create_playlist(
        conn=None,
        playlist_id=str(uuid.uuid4()),
        owner_id=user_a,
        title="Collab Playlist",
        is_collaborative=True,
    )
    repo.collaborators[(p_collab["id"], user_c)] = "viewer"

    # Register sessions
    verifier.add_session("token-a", user_a)
    verifier.add_session("token-b", user_b)
    verifier.add_session("token-c", user_c)

    app = create_playlist_app(settings, db, redis_mgr, verifier, drafts, repo=repo)

    return {
        "app": app,
        "user_a": user_a,
        "user_b": user_b,
        "user_c": user_c,
        "p_a": p_a,
        "item_id": item_id,
        "p_collab": p_collab,
        "repo": repo,
    }

@pytest_asyncio.fixture
async def wrap_authz_setup():
    settings = WrapSettings()
    settings.INTERNAL_AUTH_SECRET = SECRET
    db = MockDatabaseManager()
    redis_mgr = RedisManager(redis_url="redis://127.0.0.1:6379")
    verifier = InMemorySessionVerifier()

    user_a = str(uuid.uuid4())
    user_b = str(uuid.uuid4())

    verifier.add_session("token-a", user_a)
    verifier.add_session("token-b", user_b)

    app = create_wrap_app(settings, db, redis_mgr, verifier)
    return {
        "app": app,
        "user_a": user_a,
        "user_b": user_b,
    }

# ==============================================================================
# PLAYLIST SERVICE AUTHZ TESTS
# ==============================================================================

@pytest.mark.asyncio
async def test_playlist_direct_call_unauthenticated_rejected(playlist_authz_setup):
    app = playlist_authz_setup["app"]
    async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://test") as client:
        # 1. Unauthenticated list playlists -> 401
        resp = await client.get("/v1/playlists")
        assert resp.status_code == 401
        assert resp.json()["error"]["code"] == "unauthorized"

@pytest.mark.asyncio
async def test_playlist_direct_call_wrong_user_hidden_existence(playlist_authz_setup):
    """
    Direct service calls with wrong user (stranger) must return 404,
    preventing resource enumeration per Hidden Existence Principle.
    """
    app = playlist_authz_setup["app"]
    p_a = playlist_authz_setup["p_a"]
    item_id = playlist_authz_setup["item_id"]

    async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://test") as client:
        client.cookies.set("vynl_session", "token-b")  # User B is stranger

        # 1. Read stranger's playlist -> 404
        resp = await client.get(f"/v1/playlists/{p_a['id']}")
        assert resp.status_code == 404
        assert resp.json()["error"]["code"] == "not_found"

        # 2. Modify stranger's playlist -> 404
        resp = await client.patch(
            f"/v1/playlists/{p_a['id']}",
            json={"title": "Hacked Title"},
            headers={"If-Match": '"1"'},
        )
        assert resp.status_code == 404

        # 3. Add item to stranger's playlist -> 404
        resp = await client.post(
            f"/v1/playlists/{p_a['id']}/items",
            json={"song_id": "song-999"},
            headers={"If-Match": '"1"'},
        )
        assert resp.status_code == 404

        # 4. Delete item from stranger's playlist -> 404
        resp = await client.delete(
            f"/v1/playlists/{p_a['id']}/items/{item_id}",
            headers={"If-Match": '"1"'},
        )
        assert resp.status_code == 404

        # 5. Delete stranger's playlist -> 404
        resp = await client.delete(f"/v1/playlists/{p_a['id']}")
        assert resp.status_code == 404

@pytest.mark.asyncio
async def test_playlist_direct_call_viewer_role_rejected(playlist_authz_setup):
    """
    Viewer role on collaborative playlist has read access (200),
    but mutating direct calls must be rejected with 403 Forbidden.
    """
    app = playlist_authz_setup["app"]
    p_collab = playlist_authz_setup["p_collab"]

    async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://test") as client:
        client.cookies.set("vynl_session", "token-c")  # User C is viewer

        # 1. Read is permitted
        resp = await client.get(f"/v1/playlists/{p_collab['id']}")
        assert resp.status_code == 200

        # 2. Mutating items is forbidden (403)
        resp = await client.post(
            f"/v1/playlists/{p_collab['id']}/items",
            json={"song_id": "song-new"},
            headers={"If-Match": '"1"'},
        )
        assert resp.status_code == 403
        assert resp.json()["error"]["code"] == "forbidden"

@pytest.mark.asyncio
async def test_playlist_internal_routes_hmac_enforcement(playlist_authz_setup):
    """
    Internal endpoints require valid X-Internal-Auth HMAC.
    Unauthenticated or forged requests must be rejected with 401.
    """
    app = playlist_authz_setup["app"]
    p_a = playlist_authz_setup["p_a"]

    async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://test") as client:
        path = f"/internal/playlists/{p_a['id']}/context"

        # 1. Direct call without internal headers -> 401
        resp = await client.get(path)
        assert resp.status_code == 401
        assert resp.json()["error"]["code"] == "unauthorized"

        # 2. Direct call with forged signature -> 401
        req_id = str(uuid.uuid4())
        resp = await client.get(
            path,
            headers={
                "X-Request-ID": req_id,
                "X-Internal-Timestamp": "1000000000",
                "X-Internal-Auth": "forged_hex_signature",
            },
        )
        assert resp.status_code == 401

        # 3. Direct call with legitimate signed HMAC -> 200
        ts, sig = sign_internal_auth(SECRET, "GET", path, req_id)
        resp = await client.get(
            path,
            headers={
                "X-Request-ID": req_id,
                "X-Internal-Timestamp": ts,
                "X-Internal-Auth": sig,
            },
        )
        assert resp.status_code == 200

# ==============================================================================
# WRAP SERVICE AUTHZ TESTS
# ==============================================================================

@pytest.mark.asyncio
async def test_wrap_direct_call_unauthenticated_rejected(wrap_authz_setup):
    app = wrap_authz_setup["app"]
    async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://test") as client:
        resp = await client.get("/v1/wrap/2026-08")
        assert resp.status_code == 401
        assert resp.json()["error"]["code"] == "unauthorized"

        resp_refresh = await client.post("/v1/wrap/current/refresh")
        assert resp_refresh.status_code == 401

@pytest.mark.asyncio
async def test_wrap_direct_call_wrong_user_forbidden(wrap_authz_setup):
    """
    Authenticated User A attempting to query another user's wrap
    must be rejected with 403 Forbidden.
    """
    app = wrap_authz_setup["app"]
    user_b = wrap_authz_setup["user_b"]

    async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://test") as client:
        client.cookies.set("vynl_session", "token-a")  # Authenticated as User A

        # Direct service query targeting user B
        resp = await client.get(f"/v1/wrap/2026-08?user_id={user_b}")
        assert resp.status_code == 403
        assert resp.json()["error"]["code"] == "forbidden"

@pytest.mark.asyncio
async def test_wrap_internal_purge_hmac_enforcement(wrap_authz_setup):
    """
    DELETE /users/{id}/data must require valid internal HMAC authentication.
    """
    app = wrap_authz_setup["app"]
    user_a = wrap_authz_setup["user_a"]
    path = f"/users/{user_a}/data"

    async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://test") as client:
        # 1. Direct unauthenticated call -> 401
        resp = await client.delete(path)
        assert resp.status_code == 401

        # 2. Valid signed call -> 200
        req_id = str(uuid.uuid4())
        ts, sig = sign_internal_auth(SECRET, "DELETE", path, req_id)
        resp = await client.delete(
            path,
            headers={
                "X-Request-ID": req_id,
                "X-Internal-Timestamp": ts,
                "X-Internal-Auth": sig,
            },
        )
        assert resp.status_code == 200
        assert resp.json()["status"] == "purged"
