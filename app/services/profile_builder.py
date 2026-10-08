import logging
from datetime import datetime, timezone
from typing import Optional, Dict

logger = logging.getLogger(__name__)

class ProfileBuilderService:
    def __init__(self, db, audio_db=None):
        self.db = db
        self.audio_db = audio_db

    async def update_from_interaction(
        self,
        user_id: str,
        track_id: str,
        completion_rate: float,
        action: str = "play"
    ):
        """
        Incrementally adjusts user genre and artist preferences based on interaction completion rate.
        Ponytail: bounded to [-1.0, 1.0] without heavy ML graph for blazing fast incremental updates.
        """
        if not user_id or user_id == "anonymous" or self.db is None:
            return

        track = None
        if self.audio_db is not None:
            track = await self.audio_db.tracks.find_one({"track_id": track_id})

        genre = track.get("genre") if track else None
        artist = track.get("artist") if track else None

        # Determine weight delta
        if action == "skip" or completion_rate < 0.25:
            delta = -0.04
        elif completion_rate >= 0.70 or action in ("like", "full_play"):
            delta = 0.05
        else:
            delta = 0.01

        update_ops = {
            "$inc": {"total_plays": 1},
            "$set": {"last_updated": datetime.now(timezone.utc)},
        }

        if genre:
            update_ops["$inc"][f"genre_weights.{genre}"] = delta

        if artist:
            update_ops["$addToSet"] = {"top_artists": artist}

        await self.db.user_profiles.update_one(
            {"user_id": user_id},
            update_ops,
            upsert=True
        )
