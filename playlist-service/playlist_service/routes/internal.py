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
        counts = {"playlists_deleted": 0, "playlists_transferred": 0, "items_anonymized": 0}
        
        async with playlist_service.db.transaction() as conn:
            # 1. Fetch playlists owned by user
            import uuid
            owned = await conn.fetch(
                "SELECT id, is_collaborative FROM playlist.playlists WHERE owner_id = $1",
                uuid.UUID(user_id),
            )
            for row in owned:
                p_id = row["id"]
                is_collab = row["is_collaborative"]
                if is_collab:
                    # Transfer to earliest added editor
                    earliest_editor = await conn.fetchrow(
                        """
                        SELECT user_id FROM playlist.playlist_collaborators
                        WHERE playlist_id = $1 AND role = 'editor'
                        ORDER BY added_at ASC LIMIT 1
                        """,
                        p_id,
                    )
                    if earliest_editor:
                        await conn.execute(
                            "UPDATE playlist.playlists SET owner_id = $2 WHERE id = $1",
                            p_id,
                            earliest_editor["user_id"],
                        )
                        await conn.execute(
                            "DELETE FROM playlist.playlist_collaborators WHERE playlist_id = $1 AND user_id = $2",
                            p_id,
                            earliest_editor["user_id"],
                        )
                        counts["playlists_transferred"] += 1
                        continue

                # Delete non-collab or collab without editors
                await conn.execute("DELETE FROM playlist.playlists WHERE id = $1", p_id)
                counts["playlists_deleted"] += 1

            # 2. Anonymize user items in other playlists
            res_anon = await conn.execute(
                """
                UPDATE playlist.playlist_items
                SET added_by = '00000000-0000-0000-0000-000000000000'
                WHERE added_by = $1
                """,
                uuid.UUID(user_id),
            )
            # 3. Delete collaborator rows and invites
            await conn.execute(
                "DELETE FROM playlist.playlist_collaborators WHERE user_id = $1",
                uuid.UUID(user_id),
            )
            await conn.execute(
                "DELETE FROM playlist.playlist_invites WHERE created_by = $1 OR redeemed_by = $1",
                uuid.UUID(user_id),
            )

        # 4. Evict Redis draft keys
        if draft_store and draft_store.redis:
            cursor = 0
            while True:
                cursor, keys = await draft_store.redis.scan(cursor, match=f"draft:{user_id}:*")
                if keys:
                    await draft_store.redis.delete(*keys)
                if cursor == 0:
                    break

        return {"status": "purged", "counts": counts}

    return router
