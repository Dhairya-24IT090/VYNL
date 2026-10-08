from datetime import datetime, timezone
from typing import List, Dict, Any, Optional
from app.models.history import ActivityEventItem
from app.services.profile_builder import ProfileBuilderService
from app.db.mongo import get_audio_db

class HistoryService:
    def __init__(self, db):
        self.db = db
        self.audio_db = get_audio_db()
        self.profile_builder = ProfileBuilderService(db, self.audio_db)

    async def record_play(self, user_id: str, data: dict) -> dict:
        doc = {
            "user_id": user_id,
            "track_id": data.get("track_id"),
            "duration_listened_ms": data.get("duration_listened_ms", 0),
            "total_duration_ms": data.get("total_duration_ms", 0),
            "completion_rate": data.get("completion_rate", 0.0),
            "source": data.get("source", "web_player"),
            "action": data.get("action", "full_play"),
            "played_at": datetime.now(timezone.utc),
        }
        if self.db is not None:
            await self.db.listening_history.insert_one(doc)
            await self.profile_builder.update_from_interaction(
                user_id=user_id,
                track_id=doc["track_id"],
                completion_rate=doc["completion_rate"],
                action=doc["action"],
            )
            doc.pop("_id", None)
        return doc

    async def record_activity_batch(self, user_id: str, events: List[ActivityEventItem]) -> int:
        if not events:
            return 0

        docs_to_insert = []
        now = datetime.now(timezone.utc)
        for ev in events:
            if not ev.track_id:
                continue

            duration = ev.duration_listened_ms or 0
            total = ev.total_duration_ms or 0
            completion_rate = (duration / total) if total > 0 else 1.0

            doc = {
                "user_id": user_id,
                "track_id": ev.track_id,
                "event_type": ev.event_type,
                "duration_listened_ms": duration,
                "total_duration_ms": total,
                "completion_rate": completion_rate,
                "source": ev.source or "web_player",
                "metadata": ev.metadata or {},
                "played_at": now,
            }
            docs_to_insert.append(doc)

            if user_id != "anonymous":
                await self.profile_builder.update_from_interaction(
                    user_id=user_id,
                    track_id=ev.track_id,
                    completion_rate=completion_rate,
                    action=ev.event_type,
                )

        if docs_to_insert and self.db is not None:
            await self.db.listening_history.insert_many(docs_to_insert)

        return len(docs_to_insert)

    async def get_recent_history(self, user_id: str, limit: int = 50) -> List[Dict[str, Any]]:
        if self.db is None:
            return []
        cursor = self.db.listening_history.find(
            {"user_id": user_id},
            {"_id": 0}
        ).sort("played_at", -1).limit(limit)
        docs = await cursor.to_list(length=limit)
        if self.audio_db is not None and docs:
            track_ids = [d["track_id"] for d in docs if "track_id" in d]
            track_docs = await self.audio_db.tracks.find({"track_id": {"$in": track_ids}}).to_list(length=len(track_ids))
            track_map = {t["track_id"]: t for t in track_docs}
            for d in docs:
                t = track_map.get(d.get("track_id"))
                if t:
                    d["title"] = t.get("title") or "Unknown Title"
                    d["artist"] = t.get("artist") or "Unknown Artist"
                    d["cover_url"] = t.get("cover_url") or t.get("artwork_url") or ""
        return docs
