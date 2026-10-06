"""Executable production composition for the playlist API process."""
import uvicorn

from playlist_service.config import PlaylistSettings
from playlist_service.drafts import DraftStore
from playlist_service.main import create_app
from service_kit.auth import RedisPostgresSessionVerifier
from service_kit.config import validate_or_exit
from service_kit.db import DatabaseManager
from service_kit.redis_ import RedisManager

settings = validate_or_exit(PlaylistSettings)
database = DatabaseManager(settings.DATABASE_URL, min_size=1, max_size=20)
redis_manager = RedisManager(settings.REDIS_URL)
session_verifier = RedisPostgresSessionVerifier()
draft_store = DraftStore(None)  # Bound to the real Redis pool during lifespan startup.
app = create_app(settings, database, redis_manager, session_verifier, draft_store)

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=settings.PORT, timeout_graceful_shutdown=25)
