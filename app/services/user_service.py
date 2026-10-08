from app.db.mongo import get_db

class UserService:
    def __init__(self, db):
        self.db = db

    async def get_user(self, user_id: str):
        return await self.db.users.find_one({"user_id": user_id})

    async def update_user(self, user_id: str, data: dict):
        await self.db.users.update_one({"user_id": user_id}, {"$set": data})
