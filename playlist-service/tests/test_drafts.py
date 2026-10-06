import asyncio
import time
import pytest
from service_kit.errors import NotFoundError, GoneError
from playlist_service.drafts import DraftStore

class MockRedisClient:
    def __init__(self):
        self._data: dict = {}
        self._ttls: dict = {}

    async def get(self, key: str):
        if key in self._ttls and time.time() > self._ttls[key]:
            self._data.pop(key, None)
            self._ttls.pop(key, None)
            return None
        return self._data.get(key)

    async def set(self, key: str, value: str, ex: int = 3600):
        self._data[key] = value
        self._ttls[key] = time.time() + ex

    async def delete(self, *keys: str):
        count = 0
        for k in keys:
            if k in self._data:
                del self._data[k]
                self._ttls.pop(k, None)
                count += 1
        return count

    async def scan(self, cursor: int = 0, match: str = "*"):
        # Simple pattern match
        import fnmatch
        matched = [k for k in self._data.keys() if fnmatch.fnmatch(k, match)]
        return 0, matched

@pytest.mark.asyncio
async def test_drafts_lifecycle_and_clean_expiration():
    """
    Done-When Verification for [F9-3-b]:
    Drafts expire cleanly, return 404, leave no leaked keys, and reject saves with 410.
    """
    redis_mock = MockRedisClient()
    store = DraftStore(redis_mock, default_ttl=1, max_ttl=2)  # short for test
    user_id = "user-123"
    draft_id = "draft-abc"

    # 1. Save draft
    saved = await store.save_internal_draft(
        draft_id=draft_id,
        user_id=user_id,
        seeds={"genres": ["synth-pop"]},
        items=[{"song_id": "song-1", "status": "READY"}],
        title="Synthwave Mix",
    )
    assert saved["title"] == "Synthwave Mix"

    # 2. Retrieve draft before expiry -> 200
    retrieved = await store.get_draft(user_id, draft_id)
    assert retrieved["title"] == "Synthwave Mix"
    assert len(retrieved["items"]) == 1

    # 3. Time travel past TTL
    await asyncio.sleep(1.1)

    # 4. GET after expiry -> 404 NotFoundError
    with pytest.raises(NotFoundError, match="Draft expired or not found"):
        await store.get_draft(user_id, draft_id)

    # 5. Assert no leaked keys in Redis
    _, keys = await redis_mock.scan(match=f"draft:{user_id}:*")
    assert len(keys) == 0, "Expired draft must leave zero leaked keys in Redis"

@pytest.mark.asyncio
async def test_draft_max_lifetime_cap():
    redis_mock = MockRedisClient()
    # 2 second max lifetime cap
    store = DraftStore(redis_mock, default_ttl=5, max_ttl=1)
    user_id = "user-123"
    draft_id = "draft-xyz"

    await store.save_internal_draft(
        draft_id=draft_id,
        user_id=user_id,
        seeds={},
        items=[],
    )

    await asyncio.sleep(1.1)

    # Update draft past max lifetime -> raises GoneError (410)
    with pytest.raises(GoneError, match="Draft expired"):
        await store.update_draft(user_id, draft_id, title="Updated Title")
