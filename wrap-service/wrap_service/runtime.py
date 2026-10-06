"""Executable production composition for the monthly wrap API process."""
import uvicorn

from service_kit.auth import RedisPostgresSessionVerifier
from service_kit.db import DatabaseManager
from service_kit.redis_ import RedisManager
from wrap_service.config import WrapSettings
from wrap_service.main import create_app

settings = WrapSettings()
database = DatabaseManager(settings.DATABASE_URL, min_size=1, max_size=20)
redis_manager = RedisManager(settings.REDIS_URL)
session_verifier = RedisPostgresSessionVerifier()
app = create_app(settings, database, redis_manager, session_verifier)

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=settings.PORT, timeout_graceful_shutdown=25)
