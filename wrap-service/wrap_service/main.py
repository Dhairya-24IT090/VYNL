from contextlib import asynccontextmanager
import os
from typing import Optional
from fastapi import FastAPI
from service_kit.auth import SessionVerifier
from service_kit.db import DatabaseManager
from service_kit.errors import register_error_handlers
from service_kit.lifecycle import GracefulShutdownManager
from service_kit.middleware import Flow0Middleware
from service_kit.observability import MetricsRegistry, create_health_router
from service_kit.redis_ import RedisManager

from wrap_service.aggregation import WrapAggregator
from wrap_service.caching import WrapCache
from wrap_service.config import WrapSettings
from wrap_service.repository import WrapRepository
from wrap_service.routes.wrap import create_wrap_router
from wrap_service.service import WrapService

def create_app(
    settings: WrapSettings,
    db_manager: DatabaseManager,
    redis_manager: RedisManager,
    session_verifier: SessionVerifier,
    repo: Optional[WrapRepository] = None,
) -> FastAPI:
    metrics = MetricsRegistry(service_name=settings.SERVICE_NAME)
    shutdown = GracefulShutdownManager(service_name=settings.SERVICE_NAME)

    cache = WrapCache(redis_client=redis_manager._client)
    repo = repo or WrapRepository(db_manager)
    aggregator = WrapAggregator()
    service = WrapService(
        repo=repo,
        cache=cache,
        aggregator=aggregator,
        redis_client=redis_manager._client,
    )

    @asynccontextmanager
    async def lifespan(app: FastAPI):
        # Startup
        if getattr(settings, "AUTO_MIGRATE", False):
            migration_dir = os.path.join(os.path.dirname(__file__), "..", "migrations")
            await db_manager.run_migrations(migration_dir, "wrap")
            await db_manager.get_pool()
            redis_client = await redis_manager.get_client()
            if hasattr(session_verifier, "redis"):
                session_verifier.redis = redis_client
            if hasattr(session_verifier, "pool"):
                session_verifier.pool = db_manager._pool
            cache.redis = redis_client
        yield
        # Shutdown
        await shutdown.initiate_shutdown()
        await db_manager.close()
        await redis_manager.close()

    app = FastAPI(
        title="VYNL Wrap Service",
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

    # Health router
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

    # Domain router
    app.include_router(create_wrap_router(service))
    app.state.shutdown_manager = shutdown

    return app
