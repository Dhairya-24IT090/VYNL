import json
import uuid
import pytest
import pytest_asyncio
import redis.asyncio as aioredis
from datetime import datetime, timezone

from service_kit.context import Actor
from wrap_service.aggregation import WrapAggregator
from wrap_service.caching import TTL_CURRENT_MONTH, TTL_PAST_MONTH, WrapCache
from wrap_service.repository import WrapRepository
from wrap_service.service import WrapService

@pytest_asyncio.fixture
async def cache_setup():
    redis_client = aioredis.from_url("redis://127.0.0.1:6379")
    cache = WrapCache(redis_client=redis_client)
    repo = WrapRepository()
    aggregator = WrapAggregator()
    service = WrapService(repo=repo, cache=cache, aggregator=aggregator, redis_client=redis_client)

    yield {
        "redis": redis_client,
        "cache": cache,
        "repo": repo,
        "service": service,
    }

    try:
        await redis_client.aclose()
    except Exception:
        pass

@pytest.mark.asyncio
async def test_repeated_reads_hit_cache(cache_setup):
    """
    Task 36 Done when: Repeated reads hit cache; serves directly from Redis.
    """
    service = cache_setup["service"]
    repo = cache_setup["repo"]
    redis_client = cache_setup["redis"]

    user_id = str(uuid.uuid4())
    period = "2026-08"
    actor = Actor(user_id=user_id)

    # Clean redis key if exists
    cache_key = f"vynl:wrap:{user_id}:{period}"
    await redis_client.delete(cache_key)

    # Initial record in repository
    wrap_payload = {
        "user_id": user_id,
        "period": period,
        "is_final": True,
        "empty": False,
        "summary": {"total_counted_plays": 42},
    }
    await repo.save_wrap(user_id, period, wrap_payload)

    # 1. First read: Misses Redis, fetches repo, writes to Redis
    res1 = await service.get_user_wrap(actor, period)
    assert res1["summary"]["total_counted_plays"] == 42

    # Verify key now exists in Redis
    cached_raw = await redis_client.get(cache_key)
    assert cached_raw is not None
    assert json.loads(cached_raw)["summary"]["total_counted_plays"] == 42

    # 2. Modify repository directly to something else
    await repo.save_wrap(user_id, period, {"summary": {"total_counted_plays": 9999}})

    # 3. Second read: Hits Redis cache, still returns 42 (proving cache was hit!)
    res2 = await service.get_user_wrap(actor, period)
    assert res2["summary"]["total_counted_plays"] == 42

@pytest.mark.asyncio
async def test_ttl_differentiation_past_month_vs_current_month(cache_setup):
    """
    Task 36 Done when: 30d TTL past month, 10m current month.
    """
    cache = cache_setup["cache"]
    redis_client = cache_setup["redis"]

    user_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc)
    current_period = f"{now.year:04d}-{now.month:02d}"
    past_period = "2025-01"

    key_past = f"vynl:wrap:{user_id}:{past_period}"
    key_current = f"vynl:wrap:{user_id}:{current_period}"

    # Set past month (is_final=True)
    await cache.set(user_id, past_period, {"period": past_period, "is_final": True}, is_final=True)
    ttl_past = await redis_client.ttl(key_past)
    # Expected ~30 days (2,592,000s)
    assert 2500000 <= ttl_past <= 2592000

    # Set current month (is_final=False)
    await cache.set(user_id, current_period, {"period": current_period, "is_final": False}, is_final=False)
    ttl_curr = await redis_client.ttl(key_current)
    # Expected ~10 minutes (600s)
    assert 550 <= ttl_curr <= 600

    # Clean up
    await redis_client.delete(key_past, key_current)
