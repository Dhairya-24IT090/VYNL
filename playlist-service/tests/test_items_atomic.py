import asyncio
import pytest
from service_kit.context import Actor
from service_kit.errors import ValidationError, PreconditionFailedError
from playlist_service.service import PlaylistService
from tests.test_authz import MockDatabaseManager, MockPlaylistRepository

class FailingDatabaseManager:
    """Simulates a database crash or rollback right before commit."""
    def __init__(self, repo: MockPlaylistRepository):
        self.repo = repo

    from contextlib import asynccontextmanager
    @asynccontextmanager
    async def transaction(self):
        # Take snapshot before transaction
        p_snapshot = {k: v.copy() for k, v in self.repo.playlists.items()}
        items_snapshot = {k: [i.copy() for i in v] for k, v in self.repo.items.items()}
        outbox_len = len(self.repo.outbox)
        try:
            yield None
            # Force simulated crash before commit
            raise RuntimeError("Database connection terminated before commit")
        except RuntimeError:
            # Rollback state
            self.repo.playlists = p_snapshot
            self.repo.items = items_snapshot
            self.repo.outbox = self.repo.outbox[:outbox_len]
            raise

@pytest.mark.asyncio
async def test_items_add_remove_reorder_atomic_and_logged():
    repo = MockPlaylistRepository()
    db = MockDatabaseManager()
    service = PlaylistService(db, repo)
    owner = Actor(user_id="user-1")

    p = await service.create_playlist(owner, "My Playlist")
    playlist_id = p["id"]
    v = p["version"]

    # 1. Add item
    add_res = await service.add_item(owner, playlist_id, expected_version=v, song_id="song-1")
    v = add_res["version"]
    assert len(repo.items[playlist_id]) == 1
    assert any(ev[1]["type"] == "playlist_add" for ev in repo.outbox)

    # 2. Add second item
    add_res2 = await service.add_item(owner, playlist_id, expected_version=v, song_id="song-2")
    v = add_res2["version"]
    assert len(repo.items[playlist_id]) == 2
    item1_id = repo.items[playlist_id][0]["id"]
    item2_id = repo.items[playlist_id][1]["id"]

    # 3. Reorder item
    move_res = await service.move_item(owner, playlist_id, expected_version=v, item_id=item2_id, after_item_id=None)
    v = move_res["version"]
    assert any(ev[1]["type"] == "playlist_reorder" for ev in repo.outbox)

    # 4. Remove item
    del_res = await service.delete_item(owner, playlist_id, expected_version=v, item_id=item1_id)
    v = del_res["version"]
    assert len(repo.items[playlist_id]) == 1
    assert any(ev[1]["type"] == "playlist_remove" for ev in repo.outbox)

@pytest.mark.asyncio
async def test_items_atomicity_rollback_on_failure():
    """
    Done-When Verification for [F10-4]:
    Inject failure before commit -> zero items added, zero version bump, zero outbox row.
    """
    repo = MockPlaylistRepository()
    normal_db = MockDatabaseManager()
    service = PlaylistService(normal_db, repo)
    owner = Actor(user_id="user-1")

    p = await service.create_playlist(owner, "Atomic Test")
    playlist_id = p["id"]
    base_version = p["version"]
    initial_outbox_count = len(repo.outbox)

    # Swap in failing DB manager
    failing_db = FailingDatabaseManager(repo)
    failing_service = PlaylistService(failing_db, repo)

    with pytest.raises(RuntimeError, match="Database connection terminated before commit"):
        await failing_service.add_item(
            owner, playlist_id, expected_version=base_version, song_id="song-failing"
        )

    # Assert completely untouched state
    assert len(repo.items.get(playlist_id, [])) == 0, "No item should have been committed"
    assert repo.playlists[playlist_id]["version"] == base_version, "Version should not have bumped"
    assert len(repo.outbox) == initial_outbox_count, "No outbox row should have been written"

@pytest.mark.asyncio
async def test_items_capacity_limit():
    repo = MockPlaylistRepository()
    db = MockDatabaseManager()
    service = PlaylistService(db, repo)
    owner = Actor(user_id="user-1")

    p = await service.create_playlist(owner, "Large Playlist")
    playlist_id = p["id"]
    
    # Pre-populate 500 items
    for i in range(500):
        repo.items.setdefault(playlist_id, []).append({
            "id": f"item-{i}",
            "playlist_id": playlist_id,
            "song_id": f"song-{i}",
            "position": f"pos-{i}",
            "added_by": "user-1",
        })

    # 501st item raises ValidationError (422)
    with pytest.raises(ValidationError, match="limit .* exceeded"):
        await service.add_item(owner, playlist_id, expected_version=1, song_id="song-501")
