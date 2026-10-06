from typing import Optional
from fastapi import APIRouter, Header, Request, Response, status
from service_kit.context import RequestContext
from service_kit.errors import UnauthorizedError
from wrap_service.service import WrapService

def create_wrap_router(service: WrapService) -> APIRouter:
    router = APIRouter(tags=["wrap"])

    def _get_ctx(request: Request) -> RequestContext:
        ctx = getattr(request.state, "context", None)
        if not ctx or not ctx.actor:
            raise UnauthorizedError("Authentication required")
        return ctx

    @router.get("/v1/wrap/{period}")
    async def get_monthly_wrap(period: str, request: Request, user_id: Optional[str] = None):
        ctx = _get_ctx(request)
        return await service.get_user_wrap(
            actor=ctx.actor,
            period_str=period,
            target_user_id=user_id,
        )

    @router.post("/v1/wrap/current/refresh", status_code=status.HTTP_202_ACCEPTED)
    async def refresh_current_wrap(request: Request, response: Response):
        ctx = _get_ctx(request)
        result = await service.refresh_user_wrap(actor=ctx.actor)
        response.headers["Location"] = f"/v1/wrap/{result['period']}"
        return result

    @router.post("/v1/wrap/refresh", status_code=status.HTTP_202_ACCEPTED)
    async def refresh_wrap_generic(request: Request, response: Response, period: Optional[str] = None):
        ctx = _get_ctx(request)
        result = await service.refresh_user_wrap(actor=ctx.actor, period_str=period)
        response.headers["Location"] = f"/v1/wrap/{result['period']}"
        return result

    @router.delete("/users/{user_id}/data")
    async def delete_user_data(user_id: str, request: Request):
        ctx = _get_ctx(request)
        if not ctx.actor.is_internal:
            raise UnauthorizedError("Internal authentication required")

        deleted_count = await service.repo.delete_user_wraps(user_id)
        # Invalidate all cached wraps for this user
        await service.cache.purge_user(user_id)
        return {"status": "purged", "deleted_wraps": deleted_count}

    return router
