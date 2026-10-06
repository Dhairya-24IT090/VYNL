"""
Integration test for Account Deletion Fan-Out per Task 48 [F20-5-c-b] and docs/DELETION_MATRIX.md.
Verifies that deleting a user removes or anonymizes all personal data across
playlist-service (tables + Redis drafts) and wrap-service (tables + Redis cache),
leaving 0 personal data matches and executing idempotently.
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
from wrap_service.repository import WrapRepository

SECRET = "test-internal-secret"

@pytest_asyncio.fixture
async def deletion_test_env():
    # Playlist service setup
    p_settings = PlaylistSettings()
    p_settings.INTERNAL_AUTH_SECRET = SECRET
    db = MockDatabaseManager()
    redis_mgr = RedisManager(redis_url="redis://127.0.0.1:6379")
    redis_client = await redis_mgr.get_client()
    verifier = InMemorySessionVerifier()
    drafts = DraftStore(redis_client)
    p_repo = MockPlaylistRepository()

    # Wrap service setup
    w_settings = WrapSettings()
    w_settings.INTERNAL_AUTH_SECRET = SECRET
    w_repo = WrapRepository()

    # Create applications
    playlist_app = create_playlist_app(p_settings, db, redis_mgr, verifier, drafts, repo=p_repo)
    wrap_app = create_wrap_app(w_settings, db, redis_mgr, verifier, repo=w_repo)

    return {
        "playlist_app": playlist_app,
        "wrap_app": wrap_app,
        "p_repo": p_repo,
        "w_repo": w_repo,
        "redis_client": redis_mgr._client,
        "drafts": drafts,
    }

@pytest.mark.asyncio
async def test_account_deletion_fanout_complete_pii_purge(deletion_test_env):
    user_to_delete = str(uuid.uuid4())
    other_user = str(uuid.uuid4())
    viewer_user = str(uuid.uuid4())

    p_repo = deletion_test_env["p_repo"]
    w_repo = deletion_test_env["w_repo"]
    redis = deletion_test_env["redis_client"]
    drafts = deletion_test_env["drafts"]

    # 1. Seed Playlist Data
    # 1a. Personal playlist owned by user_to_delete -> must be deleted
    p_personal = await p_repo.create_playlist(
        conn=None,
        playlist_id=str(uuid.uuid4()),
        owner_id=user_to_delete,
        title="Personal Playlist",
    )
    await p_repo.add_item(
        conn=None,
        item_id=str(uuid.uuid4()),
        playlist_id=p_personal["id"],
        song_id="song-1",
        position="a0",
        added_by=user_to_delete,
    )

    # 1b. Collaborative playlist owned by user_to_delete with an editor (other_user)
    # -> must be transferred to other_user
    p_collab_transfer = await p_repo.create_playlist(
        conn=None,
        playlist_id=str(uuid.uuid4()),
        owner_id=user_to_delete,
        title="Collab Playlist With Editor",
        is_collaborative=True,
    )
    await p_repo.add_collaborator(None, p_collab_transfer["id"], other_user, "editor")

    # 1c. Collaborative playlist owned by user_to_delete with ONLY viewer
    # -> must be deleted
    p_collab_no_editor = await p_repo.create_playlist(
        conn=None,
        playlist_id=str(uuid.uuid4()),
        owner_id=user_to_delete,
        title="Collab Playlist With Only Viewer",
        is_collaborative=True,
    )
    await p_repo.add_collaborator(None, p_collab_no_editor["id"], viewer_user, "viewer")

    # 1d. Item added by user_to_delete in other_user's playlist
    # -> must be anonymized to '00000000-0000-0000-0000-000000000000'
    p_other = await p_repo.create_playlist(
        conn=None,
        playlist_id=str(uuid.uuid4()),
        owner_id=other_user,
        title="Other User Playlist",
    )
    item_in_other = await p_repo.add_item(
        conn=None,
        item_id=str(uuid.uuid4()),
        playlist_id=p_other["id"],
        song_id="song-shared",
        position="a0",
        added_by=user_to_delete,
    )
    # Collaborator membership of user_to_delete in other_user's playlist -> must be deleted
    await p_repo.add_collaborator(None, p_other["id"], user_to_delete, "editor")

    # 1e. Seed Redis drafts for user_to_delete
    await drafts.save_internal_draft(
        draft_id="draft-1",
        user_id=user_to_delete,
        seeds={"genre": "rock"},
        items=[{"song_id": "song-draft-1"}],
    )
    await drafts.save_internal_draft(
        draft_id="draft-2",
        user_id=user_to_delete,
        seeds={"genre": "jazz"},
        items=[{"song_id": "song-draft-2"}],
    )

    # 2. Seed Wrap Data
    # 2a. Monthly wrap records in repository
    await w_repo.save_wrap(user_to_delete, "2026-06", {"period": "2026-06", "minutes": 1200})
    await w_repo.save_wrap(user_to_delete, "2026-07", {"period": "2026-07", "minutes": 1500})

    # 2b. Redis wrap cache keys
    await redis.set(f"vynl:wrap:{user_to_delete}:2026-06", '{"cached": true}', ex=3600)
    await redis.set(f"vynl:wrap:{user_to_delete}:2026-07", '{"cached": true}', ex=3600)

    # Verify pre-deletion state
    pre_draft_keys = [k async for k in redis.scan_iter(f"draft:{user_to_delete}:*")]
    pre_wrap_keys = [k async for k in redis.scan_iter(f"vynl:wrap:{user_to_delete}:*")]
    assert len(pre_draft_keys) == 2
    assert len(pre_wrap_keys) == 2

    # ==========================================================================
    # EXECUTE DELETION FAN-OUT
    # ==========================================================================

    path = f"/users/{user_to_delete}/data"

    # Step A: Delete across playlist-service
    p_app = deletion_test_env["playlist_app"]
    async with httpx.AsyncClient(transport=httpx.ASGITransport(app=p_app), base_url="http://test") as p_client:
        req_id = str(uuid.uuid4())
        ts, sig = sign_internal_auth(SECRET, "DELETE", path, req_id)
        resp_p = await p_client.delete(
            path,
            headers={
                "X-Request-ID": req_id,
                "X-Internal-Timestamp": ts,
                "X-Internal-Auth": sig,
            },
        )
        assert resp_p.status_code == 200
        assert resp_p.json()["status"] == "purged"

    # Step B: Delete across wrap-service
    w_app = deletion_test_env["wrap_app"]
    async with httpx.AsyncClient(transport=httpx.ASGITransport(app=w_app), base_url="http://test") as w_client:
        req_id = str(uuid.uuid4())
        ts, sig = sign_internal_auth(SECRET, "DELETE", path, req_id)
        resp_w = await w_client.delete(
            path,
            headers={
                "X-Request-ID": req_id,
                "X-Internal-Timestamp": ts,
                "X-Internal-Auth": sig,
            },
        )
        assert resp_w.status_code == 200
        assert resp_w.json()["status"] == "purged"

    # ==========================================================================
    # POST-DELETION VERIFICATION (0 PII MATCHES)
    # ==========================================================================

    # 1. Personal playlist deleted
    assert p_personal["id"] not in p_repo.playlists
    assert p_personal["id"] not in p_repo.items

    # 2. Collaborative playlist with editor transferred to other_user
    assert p_collab_transfer["id"] in p_repo.playlists
    assert p_repo.playlists[p_collab_transfer["id"]]["owner_id"] == other_user

    # 3. Collaborative playlist with only viewer deleted
    assert p_collab_no_editor["id"] not in p_repo.playlists

    # 4. Item in other_user's playlist anonymized
    items_in_other = p_repo.items[p_other["id"]]
    anonymized_item = next(it for it in items_in_other if it["id"] == item_in_other["id"])
    assert anonymized_item["added_by"] == "00000000-0000-0000-0000-000000000000"

    # 5. Collaborator membership removed
    assert (p_other["id"], user_to_delete) not in p_repo.collaborators

    # 6. Redis draft keys completely purged (0 matches)
    post_draft_keys = [k async for k in redis.scan_iter(f"draft:{user_to_delete}:*")]
    assert len(post_draft_keys) == 0

    # 7. Wrap repository records purged
    assert await w_repo.get_wrap(user_to_delete, "2026-06") is None
    assert await w_repo.get_wrap(user_to_delete, "2026-07") is None

    # 8. Redis wrap cache keys completely purged (0 matches)
    post_wrap_keys = [k async for k in redis.scan_iter(f"vynl:wrap:{user_to_delete}:*")]
    assert len(post_wrap_keys) == 0

    # ==========================================================================
    # IDEMPOTENCY VERIFICATION
    # Subsequent deletion call must succeed with 0 deleted
    # ==========================================================================
    async with httpx.AsyncClient(transport=httpx.ASGITransport(app=p_app), base_url="http://test") as p_client2:
        req_id = str(uuid.uuid4())
        ts, sig = sign_internal_auth(SECRET, "DELETE", path, req_id)
        resp_idemp = await p_client2.delete(
            path,
            headers={
                "X-Request-ID": req_id,
                "X-Internal-Timestamp": ts,
                "X-Internal-Auth": sig,
            },
        )
        assert resp_idemp.status_code == 200
        assert resp_idemp.json()["status"] == "purged"
