import pytest
from typing import Dict, List, Optional
from wrap_service.aggregation import WrapAggregator
from wrap_service.scheduler import BATCH_SIZE, WrapScheduler

class MockLeaderElection:
    def __init__(self, is_leader: bool = True):
        self.is_leader = is_leader

    async def try_acquire(self) -> bool:
        return self.is_leader

class MockUserProvider:
    def __init__(self, total_users: int = 1250):
        # Sorted unique user IDs for keyset pagination
        self.users = [f"usr_{i:06d}" for i in range(total_users)]
        self.batch_sizes_queried: List[int] = []

    async def get_user_keyset_batch(self, last_user_id: Optional[str] = None, limit: int = 500) -> List[str]:
        if last_user_id is None:
            batch = [u for u in self.users][:limit]
        else:
            batch = [u for u in self.users if u > last_user_id][:limit]
        self.batch_sizes_queried.append(len(batch))
        return batch

    async def get_user_events_for_period(self, user_id: str, period: str):
        return [
            {"type": "play", "song_id": "s_1", "listened_ms": 40000, "ts": f"{period}-05T12:00:00Z"}
        ]

    async def get_historical_artists(self, user_id: str, period: str):
        return {}

    async def get_metadata_lookup(self, events):
        return {"s_1": {"title": "Song 1", "artists": [{"id": "a_1", "name": "Artist 1"}]}}

class MockWrapStore:
    def __init__(self):
        self.store: Dict[str, dict] = {} # (user_id, period) -> payload

    async def has_final_wrap(self, user_id: str, period: str) -> bool:
        key = f"{user_id}:{period}"
        w = self.store.get(key)
        return bool(w and w.get("is_final"))

    async def save_monthly_wrap(self, user_id: str, period: str, payload: dict):
        key = f"{user_id}:{period}"
        self.store[key] = payload

@pytest.mark.asyncio
async def test_leader_election_ensures_single_runner():
    """
    Non-leader nodes must skip the run.
    """
    aggregator = WrapAggregator()
    provider = MockUserProvider(total_users=10)
    store = MockWrapStore()

    # Non-leader node
    scheduler_follower = WrapScheduler(
        aggregator=aggregator,
        user_provider=provider,
        wrap_store=store,
        leader_election=MockLeaderElection(is_leader=False),
    )

    result = await scheduler_follower.run_monthly_generation("2026-09")
    assert result["status"] == "skipped_not_leader"
    assert result["users_processed"] == 0
    assert len(store.store) == 0

    # Leader node runs
    scheduler_leader = WrapScheduler(
        aggregator=aggregator,
        user_provider=provider,
        wrap_store=store,
        leader_election=MockLeaderElection(is_leader=True),
    )
    result_leader = await scheduler_leader.run_monthly_generation("2026-09")
    assert result_leader["status"] == "completed"
    assert result_leader["users_processed"] == 10
    assert len(store.store) == 10

@pytest.mark.asyncio
async def test_500_user_keyset_batches_and_reruns_never_double_compute():
    """
    Task 34 Done when: 500-user keyset batches; Reruns never double-compute.
    """
    total_users = 1250
    aggregator = WrapAggregator()
    provider = MockUserProvider(total_users=total_users)
    store = MockWrapStore()

    scheduler = WrapScheduler(
        aggregator=aggregator,
        user_provider=provider,
        wrap_store=store,
        leader_election=MockLeaderElection(is_leader=True),
    )

    # 1. First execution
    res1 = await scheduler.run_monthly_generation("2026-09")
    assert res1["status"] == "completed"
    assert res1["users_processed"] == 1250
    assert res1["users_skipped"] == 0

    # Verify keyset batch pagination: 500 + 500 + 250
    assert provider.batch_sizes_queried == [500, 500, 250]
    assert len(store.store) == 1250

    # 2. Re-run for same period: must skip all 1,250 users without double-computing
    provider.batch_sizes_queried.clear()
    res2 = await scheduler.run_monthly_generation("2026-09")
    assert res2["status"] == "completed"
    assert res2["users_processed"] == 0
    assert res2["users_skipped"] == 1250

    # Store size strictly unchanged
    assert len(store.store) == 1250
