import asyncio
import pytest
from service_kit.context import Actor
from service_kit.errors import PreconditionFailedError, PreconditionRequiredError
from playlist_service.service import PlaylistService
from tests.test_authz import MockDatabaseManager, MockPlaylistRepository

@pytest.mark.asyncio
async def test_optimistic_locking_missing_if_match():
    repo = MockPlaylistRepository()
    db = MockDatabaseManager()
    service = PlaylistService(db, repo)
    owner = Actor(user_id="user-1")

    # Create playlist
    p = await service.create_playlist(owner, "Test")
    playlist_id = p["id"]

    # Mutation with expected_version = None raises 428 Precondition Required
    with pytest.raises(PreconditionRequiredError):
        await service.update_playlist_metadata(owner, playlist_id, expected_version=None, title="New Title")

@pytest.mark.asyncio
async def test_optimistic_locking_two_concurrent_edits():
    """
    Done-When Verification for [F10-2]:
    Two concurrent edits with the same version = exactly one success + one conflict.
    """
    repo = MockPlaylistRepository()
    db = MockDatabaseManager()
    service = PlaylistService(db, repo)
    owner = Actor(user_id="user-1")

    p = await service.create_playlist(owner, "Test")
    playlist_id = p["id"]
    initial_version = p["version"]  # 1

    results = []
    errors = []

    async def attempt_edit(new_title: str):
        try:
            res = await service.update_playlist_metadata(
                owner, playlist_id, expected_version=initial_version, title=new_title
            )
            results.append(res)
        except PreconditionFailedError as e:
            errors.append(e)

    # 2 concurrent edits
    await asyncio.gather(attempt_edit("Title A"), attempt_edit("Title B"))

    assert len(results) == 1, f"Expected exactly 1 success, got {len(results)}"
    assert len(errors) == 1, f"Expected exactly 1 conflict (412), got {len(errors)}"

    # Verify version incremented by exactly 1
    final_playlist = await service.get_playlist(owner, playlist_id)
    assert final_playlist["version"] == initial_version + 1

@pytest.mark.asyncio
async def test_optimistic_locking_twenty_concurrent_edits():
    """
    Stress test from Brief §6.2:
    20 concurrent edits with the same If-Match -> exactly one 2xx, 19 conflicts; final version = start + 1.
    """
    repo = MockPlaylistRepository()
    db = MockDatabaseManager()
    service = PlaylistService(db, repo)
    owner = Actor(user_id="user-1")

    p = await service.create_playlist(owner, "Stress Test")
    playlist_id = p["id"]
    base_version = p["version"]

    successes = []
    conflicts = []

    async def worker(i: int):
        try:
            res = await service.update_playlist_metadata(
                owner, playlist_id, expected_version=base_version, title=f"Edit {i}"
            )
            successes.append(res)
        except PreconditionFailedError as e:
            conflicts.append(e)

    tasks = [worker(i) for i in range(20)]
    await asyncio.gather(*tasks)

    assert len(successes) == 1, f"Expected exactly 1 success, got {len(successes)}"
    assert len(conflicts) == 19, f"Expected exactly 19 conflicts (412), got {len(conflicts)}"

    final_p = await service.get_playlist(owner, playlist_id)
    assert final_p["version"] == base_version + 1
