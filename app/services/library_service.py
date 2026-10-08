from datetime import datetime, timezone
from typing import List, Dict, Any
from app.utils.serializers import serialize_mongo_doc
from app.services.profile_builder import ProfileBuilderService
from app.db.mongo import get_audio_db

class LibraryService:
    def __init__(self, db):
        self.db = db
        self.audio_db = get_audio_db()
        self.profile_builder = ProfileBuilderService(db, self.audio_db)

    async def get_library_tracks(self, user_id: str, limit: int = 50) -> List[Dict[str, Any]]:
        if self.db is None:
            return []
        cursor = self.db.library.find({"user_id": user_id}).sort("added_at", -1).limit(limit)
        docs = await cursor.to_list(length=limit)
        if self.audio_db is not None and docs:
            track_ids = [d["track_id"] for d in docs]
            track_docs = await self.audio_db.tracks.find({"track_id": {"$in": track_ids}}).to_list(length=len(track_ids))
            track_map = {t["track_id"]: t for t in track_docs}
            for d in docs:
                t = track_map.get(d["track_id"])
                if t:
                    d["title"] = t.get("title") or "Unknown Title"
                    d["artist"] = t.get("artist") or "Unknown Artist"
                    d["album"] = t.get("album") or ""
                    d["cover_url"] = t.get("cover_url") or t.get("artwork_url") or ""
                    d["duration_seconds"] = t.get("duration_seconds") or 0
        return serialize_mongo_doc(docs)

    async def add_to_library(self, user_id: str, track_id: str) -> Dict[str, Any]:
        now = datetime.now(timezone.utc)
        doc = {
            "user_id": user_id,
            "track_id": track_id,
            "added_at": now,
        }
        if self.db is not None:
            await self.db.library.update_one(
                {"user_id": user_id, "track_id": track_id},
                {"$set": doc},
                upsert=True
            )
            # Liking/saving boosts recommendation taste profile
            await self.profile_builder.update_from_interaction(
                user_id=user_id,
                track_id=track_id,
                completion_rate=1.0,
                action="like"
            )
        return serialize_mongo_doc(doc)

    async def remove_from_library(self, user_id: str, track_id: str) -> bool:
        if self.db is None:
            return False
        res = await self.db.library.delete_one({"user_id": user_id, "track_id": track_id})
        return res.deleted_count > 0

    async def is_in_library(self, user_id: str, track_id: str) -> bool:
        if self.db is None:
            return False
        doc = await self.db.library.find_one({"user_id": user_id, "track_id": track_id})
        return doc is not None
