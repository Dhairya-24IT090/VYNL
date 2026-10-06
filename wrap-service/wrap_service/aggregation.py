"""
Wrap Aggregator module for VYNL Monthly Wrap.
Aggregates activity data and daily rollups into comprehensive monthly wrap payloads.
"""
from datetime import datetime, timezone
import json
import logging
from typing import Any, Dict, List, Optional
from wrap_service.metrics_defs import compute_metrics, parse_period

logger = logging.getLogger("wrap_service.aggregation")

class WrapAggregator:
    def __init__(self, activity_repo=None, metadata_repo=None):
        self.activity_repo = activity_repo
        self.metadata_repo = metadata_repo

    async def aggregate_user_wrap(
        self,
        user_id: str,
        period_str: str,
        raw_events: Optional[List[Dict[str, Any]]] = None,
        daily_rollups: Optional[List[Dict[str, Any]]] = None,
        historical_artist_plays: Optional[Dict[str, int]] = None,
        song_metadata_lookup: Optional[Dict[str, Dict[str, Any]]] = None,
        is_final: bool = True,
    ) -> Dict[str, Any]:
        """
        Computes monthly wrap for a user.
        Combines daily rollups and un-rolled raw activity events.
        """
        events = list(raw_events or [])

        # If daily rollups are provided, expand their recorded event contributions or combine
        # For full fidelity, if daily rollups contain aggregated events/stats, incorporate them
        has_rollups = bool(daily_rollups)
        if daily_rollups:
            for rollup in daily_rollups:
                # Add synthetic/summarized events from rollup if not already in raw_events
                r_events = rollup.get("events", [])
                events.extend(r_events)

        # Compute pure metrics
        metrics = compute_metrics(
            period_str=period_str,
            events=events,
            historical_artist_plays=historical_artist_plays,
            song_metadata_lookup=song_metadata_lookup,
        )

        now_iso = datetime.now(timezone.utc).isoformat()

        payload = {
            "user_id": user_id,
            "period": period_str,
            "is_final": is_final,
            "empty": metrics["empty"],
            "generated_at": now_iso,
            "partial_rollup": has_rollups and not is_final,
            "summary": metrics["summary"],
            "top_songs": metrics["top_songs"],
            "top_artists": metrics["top_artists"],
            "top_genres": metrics["top_genres"],
            "listening_patterns": metrics["listening_patterns"],
        }
        return payload
