import asyncio
import pytest
from service_kit.context import Actor
from service_kit.errors import NotFoundError
from playlist_service.service import PlaylistService
from playlist_service.drafts import DraftStore
from tests.test_authz import MockDatabaseManager, MockPlaylistRepository
from tests.test_drafts import MockRedisClient

class PartialFailurePlaylistRepository(MockPlaylistRepository):
    """Simulates a failure during bulk item insert at item N."""
    def __init__(self, fail_at_item_index: int = 1):
        super().__init__()
        self.fail_at_item_index = fail_at_item_index
        self._item_counter = 0

    async def add_item(self, conn, item_id, playlist_id, song_id, position, added_by):
        self._item_counter += 1
        if self._item_counter == self.fail_at_item_index:
            raise RuntimeError(f"Simulated DB error inserting item {self._item_counter}")
        return await super().add_item(conn, item_id, playlist_id, song_id, position, added_by)

class RollingBackDatabaseManager(MockDatabaseManager):
    def __init__(self, repo: MockPlaylistRepository):
        self.repo = repo

    from contextlib import asynccontextmanager
    @asynccontextmanager
    async def transaction(self):
        p_snap = {k: v.copy() for k, v in self.repo.playlists.items()}
        it_snap = {k: [i.copy() for i in v] for k, v in self.repo.items.items()}
        outbox_len = len(self.repo.outbox)
        try:
            yield None
        except Exception:
            # Transaction rollback
            self.repo.playlists = p_snap
            self.repo.items = it_snap
            self.repo.outbox = self.repo.outbox[:outbox_len]
            raise

@pytest.mark.asyncio
async def test_save_draft_as_playlist_success():
    redis_mock = MockRedisClient()
    draft_store = DraftStore(redis_mock)
    repo = MockPlaylistRepository()
    db = MockDatabaseManager()
    service = PlaylistService(db, repo, draft_store)
    owner = Actor(user_id="user-1")

    # 1. Seed draft
    draft_id = "draft-123"
    await draft_store.save_internal_draft(
        draft_id=draft_id,
        user_id="user-1",
        seeds={"genres": ["electronic"]},
        items=[
            {"song_id": "song-1", "status": "READY"},
            {"song_id": "song-2", "status": "READY"},
        ],
        title="Saved Synth Playlist",
    )

    # 2. Save draft as playlist
    created = await service.create_playlist(owner, title="Saved Synth Playlist", draft_id=draft_id)
    playlist_id = created["id"]

    assert created["title"] == "Saved Synth Playlist"
    assert len(created["items"]) == 2
    # Verify items have fractional positions
    assert created["items"][0]["position"] < created["items"][1]["position"]

    # Verify outbox records
    outbox_types = [ev[1]["type"] for ev in repo.outbox]
    assert "playlist_generate" in outbox_types
    assert "playlist_save" in outbox_types

    # Verify draft was deleted post-commit
    with pytest.raises(NotFoundError):
        await draft_store.get_draft("user-1", draft_id)

@pytest.mark.asyncio
async def test_save_draft_partial_failure_leaves_no_traces():
    """
    Done-When Verification for [F9-4]:
    Failed save leaves no partial playlist, no items, no outbox, and draft is still intact.
    """
    redis_mock = MockRedisClient()
    draft_store = DraftStore(redis_mock)
    failing_repo = PartialFailurePlaylistRepository(fail_at_item_index=2)
    rolling_db = RollingBackDatabaseManager(failing_repo)
    service = PlaylistService(rolling_db, failing_repo, draft_store)
    owner = Actor(user_id="user-1")

    draft_id = "draft-failing"
    await draft_store.save_internal_draft(
        draft_id=draft_id,
        user_id="user-1",
        seeds={},
        items=[
            {"song_id": "song-1", "status": "READY"},
            {"song_id": "song-2", "status": "READY"},
        ],
        title="Draft To Fail",
    )

    with pytest.raises(RuntimeError, match="Simulated DB error inserting item 2"):
        await service.create_playlist(owner, title="Draft To Fail", draft_id=draft_id)

    # Assert ZERO partial playlist, ZERO items, ZERO outbox records
    assert len(failing_repo.playlists) == 0, "No partial playlist should exist"
    assert len(failing_repo.items) == 0, "No partial playlist items should exist"
    assert len(failing_repo.outbox) == 0, "No outbox records should have been committed"

    # Assert draft is STILL INTACT in Redis
    draft_intact = await draft_store.get_draft("user-1", draft_id)
    assert draft_intact is not None
    assert draft_intact["title"] == "Draft To Fail"
