from contextlib import asynccontextmanager
import os
from typing import Optional
from fastapi import FastAPI
from service_kit.auth import InMemorySessionVerifier, SessionVerifier
from service_kit.db import DatabaseManager
from service_kit.errors import register_error_handlers
from service_kit.lifecycle import GracefulShutdownManager
from service_kit.middleware import Flow0Middleware
from service_kit.observability import MetricsRegistry, create_health_router
from service_kit.redis_ import RedisManager
from service_kit.sse import SSEManager

from playlist_service.config import PlaylistSettings
from playlist_service.drafts import DraftStore
from playlist_service.repository import PlaylistRepository
from playlist_service.routes.drafts import create_drafts_router
from playlist_service.routes.internal import create_internal_router
from playlist_service.routes.playlists import create_playlists_router
from playlist_service.routes.ws import create_ws_router
from playlist_service.service import PlaylistService
from playlist_service.ws import CollabManager

def create_app(
    settings: PlaylistSettings,
    db_manager: DatabaseManager,
    redis_manager: RedisManager,
    session_verifier: SessionVerifier,
    draft_store: DraftStore,
    repo: Optional[PlaylistRepository] = None,
) -> FastAPI:
    metrics = MetricsRegistry(service_name=settings.SERVICE_NAME)
    shutdown = GracefulShutdownManager(service_name=settings.SERVICE_NAME)
    sse_mgr = SSEManager(redis_manager._client)
    repo = repo or PlaylistRepository()
    service = PlaylistService(db_manager, repo, draft_store)
    collab_mgr = CollabManager(
        service=service,
        session_verifier=session_verifier,
        redis_client=redis_manager._client,
    )

    @asynccontextmanager
    async def lifespan(app: FastAPI):
        # Startup
        if getattr(settings, "AUTO_MIGRATE", False):
            migration_dir = os.path.join(os.path.dirname(__file__), "..", "migrations")
            await db_manager.run_migrations(migration_dir, "playlist")
            await db_manager.get_pool()
            redis_client = await redis_manager.get_client()
            if hasattr(session_verifier, "redis"):
                session_verifier.redis = redis_client
            if hasattr(session_verifier, "pool"):
                session_verifier.pool = db_manager._pool
            draft_store.redis = redis_client
            collab_mgr.redis = redis_client
            sse_mgr.redis = redis_client
        yield
        # Shutdown
        await shutdown.initiate_shutdown()
        await collab_mgr.close_all_draining()
        await db_manager.close()
        await redis_manager.close()

    app = FastAPI(
        title="VYNL Playlist Service",
        version="1.0.0",
        lifespan=lifespan,
    )
    register_error_handlers(app)

    # Attach Flow 0 middleware
    app.add_middleware(
        Flow0Middleware,
        service_name=settings.SERVICE_NAME,
        session_verifier=session_verifier,
        redis_manager=redis_manager,
        metrics_registry=metrics,
        internal_auth_secret=settings.INTERNAL_AUTH_SECRET,
    )

    # Mount observability router (/healthz, /readyz, /metrics)
    async def check_dependencies() -> bool:
        async with db_manager.connection() as conn:
            await conn.fetchval("SELECT 1")
        await (await redis_manager.get_client()).ping()
        return True

    health_router = create_health_router(
        service_name=settings.SERVICE_NAME,
        metrics_registry=metrics,
        is_draining_fn=lambda: shutdown.is_draining,
        ready_check_fn=check_dependencies,
    )
    app.include_router(health_router)

    # Mount domain routers
    app.include_router(create_playlists_router(service))
    app.include_router(create_drafts_router(draft_store))
    app.include_router(create_internal_router(service, draft_store, sse_mgr))
    app.include_router(create_ws_router(collab_mgr))
    app.state.shutdown_manager = shutdown

    return app
