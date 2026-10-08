import uuid
from datetime import datetime, timezone
from typing import List, Optional, Dict, Any
from app.utils.serializers import serialize_mongo_doc

class PlaylistService:
    def __init__(self, db):
        self.db = db

    async def get_playlists(self, user_id: str) -> List[Dict[str, Any]]:
        if self.db is None:
            return []
        cursor = self.db.playlists.find({"user_id": user_id}).sort("updated_at", -1)
        docs = await cursor.to_list(length=100)
        return serialize_mongo_doc(docs)

    async def get_playlist(self, user_id: str, playlist_id: str) -> Optional[Dict[str, Any]]:
        if self.db is None:
            return None
        doc = await self.db.playlists.find_one({
            "user_id": user_id,
            "playlist_id": playlist_id,
        })
        return serialize_mongo_doc(doc) if doc else None

    async def create_playlist(self, user_id: str, name: str, description: str = "") -> Dict[str, Any]:
        playlist_id = str(uuid.uuid4())
        now = datetime.now(timezone.utc)
        doc = {
            "playlist_id": playlist_id,
            "user_id": user_id,
            "name": name.strip(),
            "description": description.strip(),
            "tracks": [],
            "track_count": 0,
            "created_at": now,
            "updated_at": now,
        }
        if self.db is not None:
            await self.db.playlists.insert_one(doc)
        return serialize_mongo_doc(doc)

    async def delete_playlist(self, user_id: str, playlist_id: str) -> bool:
        if self.db is None:
            return False
        res = await self.db.playlists.delete_one({"user_id": user_id, "playlist_id": playlist_id})
        return res.deleted_count > 0

    async def add_track(self, user_id: str, playlist_id: str, track_id: str) -> bool:
        if self.db is None:
            return False
        now = datetime.now(timezone.utc)
        res = await self.db.playlists.update_one(
            {"user_id": user_id, "playlist_id": playlist_id},
            {
                "$push": {"tracks": {"track_id": track_id, "added_at": now}},
                "$inc": {"track_count": 1},
                "$set": {"updated_at": now},
            }
        )
        return res.modified_count > 0

    async def remove_track(self, user_id: str, playlist_id: str, track_id: str) -> bool:
        if self.db is None:
            return False
        now = datetime.now(timezone.utc)
        res = await self.db.playlists.update_one(
            {"user_id": user_id, "playlist_id": playlist_id},
            {
                "$pull": {"tracks": {"track_id": track_id}},
                "$inc": {"track_count": -1},
                "$set": {"updated_at": now},
            }
        )
        return res.modified_count > 0
