import uuid

import pytest
import redis.asyncio as redis

from service_kit.context import Actor
from service_kit.errors import RateLimitedError
from wrap_service.aggregation import WrapAggregator
from wrap_service.caching import WrapCache
from wrap_service.repository import WrapRepository
from wrap_service.service import REFRESH_COOLDOWN_SECONDS, WrapService


def test_refresh_cooldown_matches_ten_minute_contract():
    assert REFRESH_COOLDOWN_SECONDS == 600


@pytest.mark.asyncio
async def test_real_redis_refresh_limit_is_ten_minutes_and_per_user():
    client = redis.from_url("redis://127.0.0.1:6379/14", decode_responses=True)
    user_a = f"remediation-{uuid.uuid4()}"
    user_b = f"remediation-{uuid.uuid4()}"
    service = WrapService(
        repo=WrapRepository(),
        cache=WrapCache(redis_client=client),
        aggregator=WrapAggregator(),
        redis_client=client,
    )
    try:
        first = await service.refresh_user_wrap(Actor(user_id=user_a))
        key_a = service._rate_limit_key(user_a)
        ttl = await client.ttl(key_a)
        assert first["user_id"] == user_a
        assert 595 <= ttl <= 600
        with pytest.raises(RateLimitedError) as limited:
            await service.refresh_user_wrap(Actor(user_id=user_a))
        assert 1 <= int(limited.value.headers["Retry-After"]) <= 600

        # A second identity has its own bucket and can refresh immediately.
        second = await service.refresh_user_wrap(Actor(user_id=user_b))
        assert second["user_id"] == user_b

        # Move the first user's key to a 1s TTL, verify Retry-After is clamped to 1.
        await client.pexpire(key_a, 1000)
        with pytest.raises(RateLimitedError) as boundary:
            await service.refresh_user_wrap(Actor(user_id=user_a))
        assert boundary.value.headers["Retry-After"] == "1"
    finally:
        await client.delete(service._rate_limit_key(user_a), service._rate_limit_key(user_b))
        await client.aclose()
