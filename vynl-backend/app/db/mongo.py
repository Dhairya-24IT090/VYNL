from motor.motor_asyncio import AsyncIOMotorClient
from app.config import settings

class Database:
    client: AsyncIOMotorClient = None
    db = None
    audio_db = None

db_manager = Database()

async def connect_to_mongo():
    db_manager.client = AsyncIOMotorClient(settings.MONGO_URI)
    db_manager.db = db_manager.client[settings.MONGO_DB]
    db_manager.audio_db = db_manager.client["vynl_audio"]

async def close_mongo_connection():
    if db_manager.client:
        db_manager.client.close()

def get_db():
    return db_manager.db

def get_audio_db():
    return db_manager.audio_db
