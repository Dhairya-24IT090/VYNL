import asyncio
import time
import pytest
from datetime import datetime, timezone
from service_kit.context import Actor
from service_kit.errors import ConflictError, GoneError, NotFoundError, ForbiddenError
from playlist_service.invites import InviteManager
from playlist_service.service import PlaylistService
from tests.test_authz import MockDatabaseManager, MockPlaylistRepository

class MockInvitePlaylistRepository(MockPlaylistRepository):
    def __init__(self):
        super().__init__()
        self.invites: dict = {}  # invite_id -> dict

    async def create_invite(self, conn, invite_id, playlist_id, role, created_by, expires_at):
        row = {
            "id": invite_id,
            "playlist_id": playlist_id,
            "role": role,
            "created_by": created_by,
            "expires_at": expires_at,
            "redeemed_by": None,
            "redeemed_at": None,
            "revoked_at": None,
        }
        self.invites[invite_id] = row
        return row

    async def get_invite(self, conn, invite_id):
        return self.invites.get(invite_id)

    async def redeem_invite(self, conn, invite_id, user_id):
        # Atomic check-and-set
        inv = self.invites.get(invite_id)
        if not inv:
            return None
        if inv["redeemed_at"] is not None or inv["revoked_at"] is not None:
            return None
        now_dt = datetime.now(timezone.utc)
        if inv["expires_at"] <= now_dt:
            return None

        inv["redeemed_at"] = now_dt
        inv["redeemed_by"] = user_id
        return inv

    async def revoke_invite(self, conn, invite_id):
        inv = self.invites.get(invite_id)
        if not inv or inv["revoked_at"] is not None:
            return False
        inv["revoked_at"] = datetime.now(timezone.utc)
        return True

@pytest.mark.asyncio
async def test_invite_single_use_and_replay_rejection():
    """
    Done-When Verification for [F11-1]:
    Invite redeemable once; expired/used/revoked fail with 410.
    """
    repo = MockInvitePlaylistRepository()
    db = MockDatabaseManager()
    service = PlaylistService(db, repo)
    manager = InviteManager(["secret-key-1"])

    owner = Actor(user_id="user-owner")
    invitee = Actor(user_id="user-invitee")
    second_user = Actor(user_id="user-second")

    # 1. Create playlist and invite
    p = await repo.create_playlist(None, "p-1", "user-owner", "Collab Playlist", is_collaborative=True)
    invite = await service.create_invite(owner, "p-1", role="editor", invite_manager=manager)
    token = invite["token"]

    # 2. First redeem succeeds
    res1 = await service.redeem_invite(invitee, token, manager)
    assert res1["status"] == "redeemed"
    assert res1["role"] == "editor"
    # User is now in collaborators
    assert repo.collaborators[("p-1", "user-invitee")] == "editor"

    # 3. Second redeem of the same token fails with 410 Gone (invite_unavailable)
    with pytest.raises(GoneError, match="Invite is no longer available"):
        await service.redeem_invite(second_user, token, manager)

@pytest.mark.asyncio
async def test_invite_concurrent_double_redeem():
    """20 concurrent redeem attempts -> exactly 1 success, 19 fail."""
    repo = MockInvitePlaylistRepository()
    db = MockDatabaseManager()
    service = PlaylistService(db, repo)
    manager = InviteManager(["secret-key-1"])

    owner = Actor(user_id="user-owner")
    p = await repo.create_playlist(None, "p-1", "user-owner", "Collab Playlist", is_collaborative=True)
    invite = await service.create_invite(owner, "p-1", role="editor", invite_manager=manager)
    token = invite["token"]

    successes = []
    failures = []

    async def redeem_worker(i: int):
        actor = Actor(user_id=f"user-{i}")
        try:
            res = await service.redeem_invite(actor, token, manager)
            successes.append(res)
        except GoneError:
            failures.append(i)

    tasks = [redeem_worker(i) for i in range(20)]
    await asyncio.gather(*tasks)

    assert len(successes) == 1, f"Expected exactly 1 success, got {len(successes)}"
    assert len(failures) == 19, f"Expected 19 failures, got {len(failures)}"

@pytest.mark.asyncio
async def test_invite_expired_and_revoked():
    repo = MockInvitePlaylistRepository()
    db = MockDatabaseManager()
    service = PlaylistService(db, repo)
    manager = InviteManager(["secret-key-1"])

    owner = Actor(user_id="user-owner")
    user = Actor(user_id="user-alice")
    p = await repo.create_playlist(None, "p-1", "user-owner", "Collab Playlist", is_collaborative=True)
    invite = await service.create_invite(owner, "p-1", role="viewer", invite_manager=manager)
    token = invite["token"]

    # 1. Expired token (time travel past 24 hours)
    future_time = time.time() + 90000
    with pytest.raises(GoneError):
        await service.redeem_invite(user, token, manager, now=future_time)

    # 2. Revoked token
    invite2 = await service.create_invite(owner, "p-1", role="viewer", invite_manager=manager)
    await service.revoke_invite(owner, "p-1", invite2["invite_id"])
    with pytest.raises(GoneError):
        await service.redeem_invite(user, invite2["token"], manager)

@pytest.mark.asyncio
async def test_invite_forgery_and_owner_self_redeem():
    repo = MockInvitePlaylistRepository()
    db = MockDatabaseManager()
    service = PlaylistService(db, repo)
    manager = InviteManager(["secret-key-1"])

    owner = Actor(user_id="user-owner")
    p = await repo.create_playlist(None, "p-1", "user-owner", "Collab Playlist", is_collaborative=True)
    invite = await service.create_invite(owner, "p-1", role="editor", invite_manager=manager)

    # Forged token -> 404 (anti-oracle)
    forged = invite["token"][:-4] + "dead"
    with pytest.raises(NotFoundError):
        await service.redeem_invite(Actor(user_id="user-hacker"), forged, manager)

    # Owner redeeming own invite -> 409 Conflict
    with pytest.raises(ConflictError, match="cannot redeem own invite"):
        await service.redeem_invite(owner, invite["token"], manager)

def test_key_rotation_verification():
    # Old key at index 1, new key at index 0
    manager_old = InviteManager(["old-key"])
    manager_rotated = InviteManager(["new-key", "old-key"])

    # Token signed with old key
    old_token = manager_old.generate_token("inv-1", "p-1", "editor", time.time() + 3600)

    # Verifies on rotated instance
    payload = manager_rotated.verify_token(old_token)
    assert payload["iid"] == "inv-1"

    # New tokens are signed with new key
    new_token = manager_rotated.generate_token("inv-2", "p-1", "editor", time.time() + 3600)
    assert manager_rotated.verify_token(new_token)["iid"] == "inv-2"
