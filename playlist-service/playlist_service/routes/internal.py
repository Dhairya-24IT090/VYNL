from typing import Any, Dict, List
from fastapi import APIRouter, Request
from pydantic import BaseModel
from service_kit.context import RequestContext
from service_kit.errors import UnauthorizedError, ForbiddenError
from playlist_service.drafts import DraftStore
from playlist_service.service import PlaylistService
from service_kit.sse import SSEManager

class InternalDraftPayload(BaseModel):
    user_id: str
    seeds: Dict[str, Any]
    items: List[Dict[str, Any]]
    title: str = "AI Playlist"

def create_internal_router(
    playlist_service: PlaylistService,
    draft_store: DraftStore,
    sse_manager: SSEManager,
) -> APIRouter:
    router = APIRouter(tags=["internal"])

    def _require_internal(request: Request) -> RequestContext:
        ctx = getattr(request.state, "context")
        if not ctx.actor.is_internal:
            raise UnauthorizedError("Internal authentication required")
        return ctx

    @router.put("/internal/drafts/{draft_id}")
    async def save_internal_draft(draft_id: str, payload: InternalDraftPayload, request: Request):
        _require_internal(request)
        saved = await draft_store.save_internal_draft(
            draft_id=draft_id,
            user_id=payload.user_id,
            seeds=payload.seeds,
            items=payload.items,
            title=payload.title,
        )
        # Publish SSE event draft.ready
        await sse_manager.publish_event(
            user_id=payload.user_id,
            event_type="draft.ready",
            data={"draft_id": draft_id, "title": payload.title},
        )
        return saved

    @router.get("/internal/playlists/{playlist_id}/context")
    async def get_playlist_context(playlist_id: str, request: Request):
        _require_internal(request)
        return await playlist_service.get_recommender_context(playlist_id)

    @router.delete("/users/{user_id}/data")
    async def delete_user_data(user_id: str, request: Request):
        _require_internal(request)
        counts = await playlist_service.purge_user_data(user_id)
        return {"status": "purged", "counts": counts}

    return router
