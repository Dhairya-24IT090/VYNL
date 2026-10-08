class HistoryService:
    def __init__(self, db):
        self.db = db

    async def record_play(self, data: dict):
        await self.db.listening_history.insert_one(data)
