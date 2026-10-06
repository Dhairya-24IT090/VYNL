import pytest
from service_kit.context import Actor
from service_kit.errors import NotFoundError
from playlist_service.service import PlaylistService
from tests.test_authz import MockDatabaseManager, MockPlaylistRepository

@pytest.mark.asyncio
async def test_playlists_as_playback_source():
    repo = MockPlaylistRepository()
    db = MockDatabaseManager()
    service = PlaylistService(db, repo)
    owner = Actor(user_id="user-1")

    p = await service.create_playlist(owner, "Workout Mix")
    p_id = p["id"]

    # Add 3 items in order
    await repo.add_item(None, "item-1", p_id, "song-1", "A", "user-1")
    await repo.add_item(None, "item-2", p_id, "song-2", "B", "user-1")
    await repo.add_item(None, "item-3", p_id, "song-3", "C", "user-1")

    # Get full playback source
    playback = await service.get_playback_source(owner, p_id)
    assert len(playback) == 3
    assert [it["item_id"] for it in playback] == ["item-1", "item-2", "item-3"]
    assert all(it["status"] == "READY" for it in playback)

    # Get playback source from item-2
    from_item2 = await service.get_playback_source(owner, p_id, from_item_id="item-2")
    assert len(from_item2) == 2
    assert [it["item_id"] for it in from_item2] == ["item-2", "item-3"]

@pytest.mark.asyncio
async def test_recommender_context_token_cap():
    """
    Done-When Verification for [F10-5-a-b]:
    Context endpoint returns compact summary capped at <= 50 items for LLM budget.
    """
    repo = MockPlaylistRepository()
    db = MockDatabaseManager()
    service = PlaylistService(db, repo)
    owner = Actor(user_id="user-1")

    p = await service.create_playlist(owner, "Massive Playlist")
    p_id = p["id"]

    # Add 80 items
    for i in range(80):
        await repo.add_item(None, f"item-{i}", p_id, f"song-{i}", f"pos-{i:03d}", "user-1")

    # Recommender context should cap at 50
    ctx = await service.get_recommender_context(p_id)
    assert ctx["playlist_id"] == p_id
    assert ctx["title"] == "Massive Playlist"
    assert len(ctx["items"]) == 50, "Recommender context must be capped at 50 items"
    assert ctx["items"][0] == "song-0"
    assert ctx["items"][49] == "song-49"
    assert "user-1" in ctx["contributors"]
