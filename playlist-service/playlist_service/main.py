from contextlib import asynccontextmanager
from fastapi import FastAPI
from service_kit.auth import InMemorySessionVerifier, SessionVerifier
from service_kit.db import DatabaseManager
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
from playlist_service.service import PlaylistService

def create_app(
    settings: PlaylistSettings,
    db_manager: DatabaseManager,
    redis_manager: RedisManager,
    session_verifier: SessionVerifier,
    draft_store: DraftStore,
) -> FastAPI:
    metrics = MetricsRegistry(service_name=settings.SERVICE_NAME)
    shutdown = GracefulShutdownManager(service_name=settings.SERVICE_NAME)
    sse_mgr = SSEManager(redis_manager._client)
    repo = PlaylistRepository()
    service = PlaylistService(db_manager, repo, draft_store)

    @asynccontextmanager
    async def lifespan(app: FastAPI):
        # Startup
        yield
        # Shutdown
        await shutdown.initiate_shutdown()
        await db_manager.close()
        await redis_manager.close()

    app = FastAPI(
        title="VYNL Playlist Service",
        version="1.0.0",
        lifespan=lifespan,
    )

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
    health_router = create_health_router(
        service_name=settings.SERVICE_NAME,
        metrics_registry=metrics,
        is_draining_fn=lambda: shutdown.is_draining,
    )
    app.include_router(health_router)

    # Mount domain routers
    app.include_router(create_playlists_router(service))
    app.include_router(create_drafts_router(draft_store))
    app.include_router(create_internal_router(service, draft_store, sse_mgr))

    return app
