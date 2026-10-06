from fastapi import APIRouter, Request
from service_kit.context import RequestContext
from service_kit.errors import UnauthorizedError
from playlist_service.models import AdjustDraftDTO
from playlist_service.drafts import DraftStore

def create_drafts_router(draft_store: DraftStore) -> APIRouter:
    router = APIRouter(prefix="/v1/playlists/drafts", tags=["drafts"])

    def _get_ctx(request: Request) -> RequestContext:
        ctx = getattr(request.state, "context")
        if not ctx.actor.user_id:
            raise UnauthorizedError()
        return ctx

    @router.get("/{draft_id}")
    async def get_draft(draft_id: str, request: Request):
        ctx = _get_ctx(request)
        return await draft_store.get_draft(ctx.actor.user_id, draft_id)

    @router.patch("/{draft_id}")
    async def adjust_draft(draft_id: str, dto: AdjustDraftDTO, request: Request):
        ctx = _get_ctx(request)
        return await draft_store.update_draft(
            ctx.actor.user_id,
            draft_id,
            title=dto.title,
            items=dto.items,
        )

    @router.delete("/{draft_id}")
    async def delete_draft(draft_id: str, request: Request):
        ctx = _get_ctx(request)
        await draft_store.delete_draft(ctx.actor.user_id, draft_id)
        return {"deleted": True}

    return router
