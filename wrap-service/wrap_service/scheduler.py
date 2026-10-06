"""
Scheduled monthly wrap generation worker for VYNL.
Enforces distributed leader election, 500-user keyset batching, and idempotency.
"""
import asyncio
import logging
import uuid
from typing import Any, Callable, Coroutine, Dict, List, Optional, Set
from wrap_service.aggregation import WrapAggregator

logger = logging.getLogger("wrap_service.scheduler")

BATCH_SIZE = 500

class WrapScheduler:
    def __init__(
        self,
        aggregator: WrapAggregator,
        user_provider: Any,
        wrap_store: Any,
        leader_election: Optional[Any] = None,
    ):
        self.aggregator = aggregator
        self.user_provider = user_provider
        self.wrap_store = wrap_store
        self.leader_election = leader_election

    async def run_monthly_generation(self, period_str: str) -> Dict[str, Any]:
        """
        Runs monthly wrap generation for all users for period_str.
        Returns execution statistics: {status, users_processed, users_skipped, is_leader}.
        """
        # 1. Leader election check: ensure single runner
        if self.leader_election:
            is_leader = await self.leader_election.try_acquire()
            if not is_leader:
                logger.info("Not the leader instance; skipping scheduled wrap run")
                return {
                    "status": "skipped_not_leader",
                    "period": period_str,
                    "users_processed": 0,
                    "users_skipped": 0,
                    "is_leader": False,
                }

        logger.info(f"Leader acquired. Starting scheduled wrap generation for {period_str}")
        processed_count = 0
        skipped_count = 0

        last_user_id: Optional[str] = None

        while True:
            # Keyset pagination: batches of up to 500 users
            user_batch = await self.user_provider.get_user_keyset_batch(
                last_user_id=last_user_id,
                limit=BATCH_SIZE,
            )
            if not user_batch:
                break

            for user_id in user_batch:
                last_user_id = user_id

                # Idempotency check: if final wrap already exists, skip
                already_final = await self.wrap_store.has_final_wrap(user_id, period_str)
                if already_final:
                    skipped_count += 1
                    continue

                # Fetch activity and compute
                events = await self.user_provider.get_user_events_for_period(user_id, period_str)
                hist_artists = await self.user_provider.get_historical_artists(user_id, period_str)
                meta = await self.user_provider.get_metadata_lookup(events)

                wrap_payload = await self.aggregator.aggregate_user_wrap(
                    user_id=user_id,
                    period_str=period_str,
                    raw_events=events,
                    historical_artist_plays=hist_artists,
                    song_metadata_lookup=meta,
                    is_final=True,
                )

                # Save atomically
                await self.wrap_store.save_monthly_wrap(user_id, period_str, wrap_payload)
                processed_count += 1

            if len(user_batch) < BATCH_SIZE:
                break

        return {
            "status": "completed",
            "period": period_str,
            "users_processed": processed_count,
            "users_skipped": skipped_count,
            "is_leader": True,
        }
