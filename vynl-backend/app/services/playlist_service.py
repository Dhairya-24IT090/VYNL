from typing import List

class PlaylistService:
    def __init__(self, db):
        self.db = db

    async def get_playlists(self, user_id: str) -> List[dict]:
        return await self.db.playlists.find({"user_id": user_id}).to_list(length=100)

    async def delete_playlist(self, user_id: str, playlist_id: str):
        await self.db.playlists.delete_one({"user_id": user_id, "playlist_id": playlist_id})
