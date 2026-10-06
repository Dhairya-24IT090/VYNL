from typing import Optional
from fastapi import APIRouter, Header, Request, Response
from service_kit.context import RequestContext
from service_kit.errors import PreconditionRequiredError
from playlist_service.models import (
    AddItemDTO,
    CreatePlaylistDTO,
    MoveItemDTO,
    UpdatePlaylistDTO,
)
from playlist_service.service import PlaylistService

def create_playlists_router(service: PlaylistService) -> APIRouter:
    router = APIRouter(prefix="/v1/playlists", tags=["playlists"])

    def _get_ctx(request: Request) -> RequestContext:
        return getattr(request.state, "context")

    def _parse_if_match(if_match: Optional[str]) -> Optional[int]:
        if not if_match:
            return None
        clean = if_match.strip('"')
        try:
            return int(clean)
        except ValueError:
            return None

    @router.post("", status_code=201)
    async def create_playlist(dto: CreatePlaylistDTO, request: Request, response: Response):
        ctx = _get_ctx(request)
        created = await service.create_playlist(
            actor=ctx.actor,
            title=dto.title,
            description=dto.description or "",
            is_collaborative=dto.is_collaborative,
            draft_id=dto.draft_id,
        )
        response.headers["ETag"] = f'"{created["version"]}"'
        return created

    @router.get("")
    async def list_playlists(request: Request):
        ctx = _get_ctx(request)
        return await service.list_playlists(actor=ctx.actor)

    @router.get("/{playlist_id}")
    async def get_playlist(playlist_id: str, request: Request, response: Response):
        ctx = _get_ctx(request)
        p = await service.get_playlist(actor=ctx.actor, playlist_id=playlist_id)
        response.headers["ETag"] = f'"{p["version"]}"'
        return p

    @router.patch("/{playlist_id}")
    async def update_playlist(
        playlist_id: str,
        dto: UpdatePlaylistDTO,
        request: Request,
        response: Response,
        if_match: Optional[str] = Header(None, alias="If-Match"),
    ):
        ctx = _get_ctx(request)
        ver = _parse_if_match(if_match)
        if ver is None:
            raise PreconditionRequiredError()
        updated = await service.update_playlist_metadata(
            actor=ctx.actor,
            playlist_id=playlist_id,
            expected_version=ver,
            title=dto.title,
            description=dto.description,
            is_collaborative=dto.is_collaborative,
        )
        response.headers["ETag"] = f'"{updated["version"]}"'
        return updated

    @router.delete("/{playlist_id}")
    async def delete_playlist(playlist_id: str, request: Request):
        ctx = _get_ctx(request)
        await service.delete_playlist(actor=ctx.actor, playlist_id=playlist_id)
        return {"deleted": True}

    @router.post("/{playlist_id}/items", status_code=201)
    async def add_item(
        playlist_id: str,
        dto: AddItemDTO,
        request: Request,
        response: Response,
        if_match: Optional[str] = Header(None, alias="If-Match"),
    ):
        ctx = _get_ctx(request)
        ver = _parse_if_match(if_match)
        if ver is None:
            raise PreconditionRequiredError()
        result = await service.add_item(
            actor=ctx.actor,
            playlist_id=playlist_id,
            expected_version=ver,
            song_id=dto.song_id,
            after_item_id=dto.after_item_id,
        )
        response.headers["ETag"] = f'"{result["version"]}"'
        return result

    @router.delete("/{playlist_id}/items/{item_id}")
    async def delete_item(
        playlist_id: str,
        item_id: str,
        request: Request,
        response: Response,
        if_match: Optional[str] = Header(None, alias="If-Match"),
    ):
        ctx = _get_ctx(request)
        ver = _parse_if_match(if_match)
        if ver is None:
            raise PreconditionRequiredError()
        result = await service.delete_item(
            actor=ctx.actor,
            playlist_id=playlist_id,
            expected_version=ver,
            item_id=item_id,
        )
        response.headers["ETag"] = f'"{result["version"]}"'
        return result

    @router.patch("/{playlist_id}/items/{item_id}")
    async def move_item(
        playlist_id: str,
        item_id: str,
        dto: MoveItemDTO,
        request: Request,
        response: Response,
        if_match: Optional[str] = Header(None, alias="If-Match"),
    ):
        ctx = _get_ctx(request)
        ver = _parse_if_match(if_match)
        if ver is None:
            raise PreconditionRequiredError()
        result = await service.move_item(
            actor=ctx.actor,
            playlist_id=playlist_id,
            expected_version=ver,
            item_id=item_id,
            after_item_id=dto.after_item_id,
        )
        response.headers["ETag"] = f'"{result["version"]}"'
        return result

    @router.get("/{playlist_id}/playback")
    async def get_playback(playlist_id: str, request: Request, from_item_id: Optional[str] = None):
        ctx = _get_ctx(request)
        return await service.get_playback_source(
            actor=ctx.actor,
            playlist_id=playlist_id,
            from_item_id=from_item_id,
        )

    @router.get("/{playlist_id}/items/{item_id}/playable")
    async def get_item_playable(playlist_id: str, item_id: str, request: Request):
        ctx = _get_ctx(request)
        # Verify access
        await service.get_playlist(actor=ctx.actor, playlist_id=playlist_id)
        return {"item_id": item_id, "status": "READY"}

    return router
