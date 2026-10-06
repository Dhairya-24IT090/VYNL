"""
Redis caching layer for VYNL Monthly Wrap per Task 36.
Past month / final wrap: 30-day TTL (2,592,000s).
Current month / non-final wrap: 10-minute TTL (600s).
"""
import json
import logging
from typing import Any, Dict, Optional
from datetime import datetime, timezone
from wrap_service.metrics_defs import parse_period

logger = logging.getLogger("wrap_service.caching")

TTL_PAST_MONTH = 30 * 86400  # 30 days in seconds
TTL_CURRENT_MONTH = 10 * 60  # 10 minutes in seconds

class WrapCache:
    def __init__(self, redis_client=None):
        self.redis = redis_client
        self._local_cache: Dict[str, Tuple[Dict[str, Any], float]] = {} # fallback: key -> (val, expire_time)

    def _cache_key(self, user_id: str, period_str: str) -> str:
        return f"vynl:wrap:{user_id}:{period_str}"

    def get_ttl_for_period(self, period_str: str, is_final: bool) -> int:
        """
        Calculates TTL: 30d for past month or final, 10m for current month.
        """
        if is_final:
            return TTL_PAST_MONTH

        now = datetime.now(timezone.utc)
        current_period = f"{now.year:04d}-{now.month:02d}"
        if period_str < current_period:
            return TTL_PAST_MONTH
        return TTL_CURRENT_MONTH

    async def get(self, user_id: str, period_str: str) -> Optional[Dict[str, Any]]:
        key = self._cache_key(user_id, period_str)
        if self.redis:
            try:
                raw = await self.redis.get(key)
                if raw:
                    return json.loads(raw)
            except Exception as e:
                logger.warning(f"Redis cache get error: {e}")
                return None

        # Fallback local in-memory
        import time
        entry = self._local_cache.get(key)
        if entry:
            val, exp = entry
            if time.time() < exp:
                return val
            self._local_cache.pop(key, None)
        return None

    async def set(self, user_id: str, period_str: str, payload: Dict[str, Any], is_final: bool = False) -> None:
        key = self._cache_key(user_id, period_str)
        ttl = self.get_ttl_for_period(period_str, is_final or payload.get("is_final", False))
        serialized = json.dumps(payload)

        if self.redis:
            try:
                await self.redis.set(key, serialized, ex=ttl)
                return
            except Exception as e:
                logger.warning(f"Redis cache set error: {e}")

        import time
        self._local_cache[key] = (payload, time.time() + ttl)

    async def delete(self, user_id: str, period_str: str) -> None:
        key = self._cache_key(user_id, period_str)
        if self.redis:
            try:
                await self.redis.delete(key)
            except Exception as e:
                logger.warning(f"Redis cache delete error: {e}")
        self._local_cache.pop(key, None)

    async def purge_user(self, user_id: str) -> None:
        """Purges all cached wrap keys for user_id during account deletion."""
        if self.redis:
            try:
                cursor = 0
                while True:
                    cursor, keys = await self.redis.scan(cursor, match=f"vynl:wrap:{user_id}:*")
                    if keys:
                        await self.redis.delete(*keys)
                    if cursor == 0:
                        break
            except Exception as e:
                logger.warning(f"Redis purge_user error: {e}")
        prefix = f"vynl:wrap:{user_id}:"
        to_del = [k for k in self._local_cache if k.startswith(prefix)]
        for k in to_del:
            self._local_cache.pop(k, None)

