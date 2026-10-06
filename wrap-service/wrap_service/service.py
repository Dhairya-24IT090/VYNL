from datetime import datetime, timezone
from typing import Any, Dict, Optional
from service_kit.context import Actor
from service_kit.errors import (
    ForbiddenError,
    DependencyUnavailableError,
    NotFoundError,
    RateLimitedError,
    UnauthorizedError,
)
from wrap_service.aggregation import WrapAggregator
from wrap_service.caching import WrapCache
from wrap_service.repository import WrapRepository

REFRESH_COOLDOWN_SECONDS = 600

class WrapService:
    def __init__(
        self,
        repo: WrapRepository,
        cache: WrapCache,
        aggregator: WrapAggregator,
        user_provider: Optional[Any] = None,
        redis_client: Optional[Any] = None,
    ):
        self.repo = repo
        self.cache = cache
        self.aggregator = aggregator
        self.user_provider = user_provider
        self.redis = redis_client

    def _get_current_period(self) -> str:
        now = datetime.now(timezone.utc)
        return f"{now.year:04d}-{now.month:02d}"

    def _rate_limit_key(self, user_id: str) -> str:
        return f"vynl:ratelimit:wrap_refresh:{user_id}"

    async def get_user_wrap(
        self,
        actor: Actor,
        period_str: str,
        target_user_id: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Retrieves monthly wrap for actor.
        Enforces docs/AUTHZ.md:
        - Unauthenticated -> 401
        - Target user != actor -> 403
        - Target user == actor -> 200
        """
        if not actor or not actor.user_id:
            raise UnauthorizedError("Authentication required")

        user_id = target_user_id or actor.user_id
        if user_id != actor.user_id and not actor.is_internal:
            raise ForbiddenError("You cannot access another user's wrap")

        # 1. Check cache first
        cached = await self.cache.get(user_id, period_str)
        if cached:
            return cached

        # 2. Check repository
        wrap = await self.repo.get_wrap(user_id, period_str)
        if not wrap:
            raise NotFoundError(f"Wrap not found for period {period_str}")

        # 3. Populate cache
        await self.cache.set(user_id, period_str, wrap, is_final=wrap.get("is_final", False))
        return wrap

    async def refresh_user_wrap(
        self,
        actor: Actor,
        period_str: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Triggers on-demand recalculation of current month wrap.
        Enforces a 10-minute atomic Redis cooldown per user (429 + Retry-After).
        """
        if not actor or not actor.user_id:
            raise UnauthorizedError("Authentication required")

        period = period_str or self._get_current_period()
        user_id = actor.user_id

        # 1. Check rate limit
        rl_key = self._rate_limit_key(user_id)
        if not self.redis:
            raise DependencyUnavailableError("Refresh rate limiter unavailable")
        try:
            claimed = await self.redis.set(
                rl_key, "1", ex=REFRESH_COOLDOWN_SECONDS, nx=True
            )
            if not claimed:
                remaining = await self.redis.ttl(rl_key)
                raise RateLimitedError(retry_after=max(1, int(remaining)))
        except RateLimitedError:
            raise
        except Exception as exc:
            raise DependencyUnavailableError("Refresh rate limiter unavailable") from exc

        # 2. Recalculate
        events = []
        hist_artists = {}
        meta = {}
        if self.user_provider:
            events = await self.user_provider.get_user_events_for_period(user_id, period)
            hist_artists = await self.user_provider.get_historical_artists(user_id, period)
            meta = await self.user_provider.get_metadata_lookup(events)

        recalc = await self.aggregator.aggregate_user_wrap(
            user_id=user_id,
            period_str=period,
            raw_events=events,
            historical_artist_plays=hist_artists,
            song_metadata_lookup=meta,
            is_final=False,
        )

        # 3. Store and update cache
        await self.repo.save_wrap(user_id, period, recalc)
        await self.cache.set(user_id, period, recalc, is_final=False)

        return recalc
