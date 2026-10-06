import asyncio
import time
import uuid
import pytest
import pytest_asyncio
import redis.asyncio as aioredis

from service_kit.jobs import JobQueue
from service_kit.redis_ import RedisManager
from playlist_service.service import PlaylistService
from playlist_service.ws import CollabManager
from tests.test_authz import MockDatabaseManager, MockPlaylistRepository

@pytest_asyncio.fixture
async def jobs_setup():
    redis_mgr = RedisManager(redis_url="redis://127.0.0.1:6379")
    job_queue = JobQueue(redis_mgr)
    
    db = MockDatabaseManager()
    repo = MockPlaylistRepository()
    service = PlaylistService(db, repo, draft_store=None)
    
    collab = CollabManager(
        service=service,
        session_verifier=None,
        redis_client=await redis_mgr.get_client(),
        jobs_manager=job_queue,
    )

    yield {
        "redis_mgr": redis_mgr,
        "job_queue": job_queue,
        "collab": collab,
        "service": service,
    }

    await redis_mgr.close()

@pytest.mark.asyncio
async def test_rapid_editing_triggers_exactly_one_job_per_window(jobs_setup):
    """
    Task 24 Done when: Rapid editing = one suggestion job per window.
    Deduplication prevents duplicate job enqueues into Redis Streams.
    """
    collab = jobs_setup["collab"]
    redis_client = await jobs_setup["redis_mgr"].get_client()

    playlist_id = str(uuid.uuid4())
    stream_key = "vynl:jobs:collab_suggest"

    # Read current stream length before test
    try:
        initial_len = await redis_client.xlen(stream_key)
    except Exception:
        initial_len = 0

    window_sec = 5

    # 1. Simulate 10 rapid edits in the same window
    job_results = []
    for ver in range(1, 11):
        job_id = await collab.trigger_ai_suggestions_if_needed(
            playlist_id=playlist_id,
            version=ver,
            window_sec=window_sec,
        )
        job_results.append(job_id)

    # 2. Exactly one job should have been created (the first one)
    successful_jobs = [j for j in job_results if j is not None]
    deduped_drops = [j for j in job_results if j is None]

    assert len(successful_jobs) == 1, f"Expected 1 job enqueued, got {len(successful_jobs)}"
    assert len(deduped_drops) == 9, f"Expected 9 deduped drops, got {len(deduped_drops)}"

    # 3. Stream length should have increased by exactly 1
    new_len = await redis_client.xlen(stream_key)
    assert new_len == initial_len + 1

    # 4. Verify message payload in Redis stream
    entries = await redis_client.xrevrange(stream_key, count=1)
    assert len(entries) == 1
    _, fields = entries[0]
    import json
    raw_env = fields.get("envelope") or fields.get(b"envelope")
    envelope = json.loads(raw_env)
    assert envelope["job_name"] == "collab_suggest"
    assert envelope["payload"]["playlist_id"] == playlist_id
    assert envelope["payload"]["version"] == 1

@pytest.mark.asyncio
async def test_different_playlists_enqueue_independently(jobs_setup):
    """
    Verifies that deduplication is partitioned per playlist.
    Different playlists enqueue independent jobs within the same time window.
    """
    collab = jobs_setup["collab"]

    p1 = str(uuid.uuid4())
    p2 = str(uuid.uuid4())

    job_1 = await collab.trigger_ai_suggestions_if_needed(playlist_id=p1, version=1, window_sec=10)
    job_2 = await collab.trigger_ai_suggestions_if_needed(playlist_id=p2, version=1, window_sec=10)

    assert job_1 is not None
    assert job_2 is not None
    assert job_1 != job_2
