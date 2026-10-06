import asyncio
import json
import time
import uuid
from typing import Any, Dict, Optional, Tuple
import redis.asyncio as redis
from service_kit.errors import RateLimitedError

# Lua script for Redis token bucket rate limiting
TOKEN_BUCKET_LUA = """
local key = KEYS[1]
local capacity = tonumber(ARGV[1])
local fill_rate = tonumber(ARGV[2]) -- tokens per second
local cost = tonumber(ARGV[3])
local now = tonumber(ARGV[4])

local data = redis.call('HMGET', key, 'tokens', 'last_update')
local tokens = tonumber(data[1])
local last_update = tonumber(data[2])

if tokens == nil then
    tokens = capacity
    last_update = now
else
    local delta = math.max(0, now - last_update)
    tokens = math.min(capacity, tokens + delta * fill_rate)
end

if tokens >= cost then
    tokens = tokens - cost
    redis.call('HMSET', key, 'tokens', tokens, 'last_update', now)
    redis.call('EXPIRE', key, math.ceil(capacity / fill_rate) * 2)
    return {1, math.floor(tokens)}
else
    local wait_time = math.ceil((cost - tokens) / fill_rate)
    return {0, wait_time}
end
"""

class RedisManager:
    def __init__(self, redis_url: str):
        self.redis_url = redis_url
        self._client: Optional[redis.Redis] = None
        self._token_bucket_script = None

    async def get_client(self) -> redis.Redis:
        if self._client is None:
            self._client = redis.from_url(self.redis_url, decode_responses=True)
            self._token_bucket_script = self._client.register_script(TOKEN_BUCKET_LUA)
        return self._client

    async def close(self):
        if self._client:
            await self._client.aclose()
            self._client = None

    async def consume_token(
        self,
        key: str,
        capacity: int = 60,
        fill_rate: float = 1.0,
        cost: int = 1,
    ) -> Tuple[bool, int]:
        client = await self.get_client()
        now = time.time()
        # [allowed (0 or 1), remaining_tokens or wait_seconds]
        result = await self._token_bucket_script(
            keys=[key],
            args=[capacity, fill_rate, cost, now],
        )
        allowed = bool(result[0] == 1)
        meta = int(result[1])
        return allowed, meta

    async def check_rate_limit(
        self,
        key: str,
        capacity: int = 60,
        fill_rate: float = 1.0,
        cost: int = 1,
    ):
        allowed, wait_seconds = await self.consume_token(key, capacity, fill_rate, cost)
        if not allowed:
            raise RateLimitedError(
                message="Rate limit exceeded. Please wait before retrying.",
                retry_after=max(1, wait_seconds),
            )

    async def get_idempotent_response(self, idempotency_key: str) -> Optional[Dict[str, Any]]:
        client = await self.get_client()
        cached = await client.get(f"idempotency:{idempotency_key}")
        if cached:
            return json.loads(cached)
        return None

    async def store_idempotent_response(
        self,
        idempotency_key: str,
        status_code: int,
        headers: Dict[str, str],
        body: Any,
        ttl_seconds: int = 86400,
    ):
        client = await self.get_client()
        payload = {
            "status_code": status_code,
            "headers": headers,
            "body": body,
        }
        await client.set(f"idempotency:{idempotency_key}", json.dumps(payload), ex=ttl_seconds)

class LeaderElection:
    """Distributed leader election using Redis lock with auto-renewal."""
    def __init__(self, redis_manager: RedisManager, lock_key: str, ttl_seconds: int = 15):
        self.redis_manager = redis_manager
        self.lock_key = f"leader:{lock_key}"
        self.ttl_seconds = ttl_seconds
        self.identifier = str(uuid.uuid4())
        self.is_leader = False
        self._renewal_task: Optional[asyncio.Task] = None

    async def try_acquire(self) -> bool:
        client = await self.redis_manager.get_client()
        acquired = await client.set(self.lock_key, self.identifier, ex=self.ttl_seconds, nx=True)
        if acquired:
            self.is_leader = True
            if self._renewal_task is None or self._renewal_task.done():
                self._renewal_task = asyncio.create_task(self._renew_loop())
            return True
        else:
            val = await client.get(self.lock_key)
            if val == self.identifier:
                self.is_leader = True
                return True
            self.is_leader = False
            return False

    async def _renew_loop(self):
        try:
            while self.is_leader:
                await asyncio.sleep(self.ttl_seconds / 2)
                client = await self.redis_manager.get_client()
                # Renew lock if still owned
                val = await client.get(self.lock_key)
                if val == self.identifier:
                    await client.expire(self.lock_key, self.ttl_seconds)
                else:
                    self.is_leader = False
                    break
        except asyncio.CancelledError:
            pass

    async def release(self):
        self.is_leader = False
        if self._renewal_task:
            self._renewal_task.cancel()
            self._renewal_task = None
        client = await self.redis_manager.get_client()
        val = await client.get(self.lock_key)
        if val == self.identifier:
            await client.delete(self.lock_key)
