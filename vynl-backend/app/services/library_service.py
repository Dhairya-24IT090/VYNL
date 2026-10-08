class LibraryService:
    def __init__(self, db):
        self.db = db

    async def get_liked_songs(self, user_id: str):
        return await self.db.liked_songs.find({"user_id": user_id}).to_list(length=100)
