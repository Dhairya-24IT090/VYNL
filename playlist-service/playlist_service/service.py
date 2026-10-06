import time
import uuid
from typing import Any, Dict, List, Optional
from service_kit.context import Actor
from service_kit.errors import (
    ForbiddenError,
    NotFoundError,
    PreconditionFailedError,
    PreconditionRequiredError,
    ValidationError,
    GoneError,
)
from playlist_service.fractional import between, generate_initial_keys
from playlist_service.repository import PlaylistRepository
from playlist_service.drafts import DraftStore
from service_kit.db import DatabaseManager

class PlaylistService:
    def __init__(self, db_manager: DatabaseManager, repo: PlaylistRepository, draft_store: Optional[DraftStore] = None):
        self.db = db_manager
        self.repo = repo
        self.draft_store = draft_store

    async def _resolve_role(self, conn, playlist_id: str, actor: Actor) -> str:
        if not actor.user_id:
            raise NotFoundError("Playlist not found")
        role = await self.repo.get_membership_role(conn, playlist_id, actor.user_id)
        if not role:
            # Stranger receives 404 (Hidden Existence)
            raise NotFoundError("Playlist not found")
        return role

    async def get_playlist(self, actor: Actor, playlist_id: str) -> Dict[str, Any]:
        async with self.db.connection() as conn:
            role = await self._resolve_role(conn, playlist_id, actor)
            p = await self.repo.get_playlist(conn, playlist_id)
            items = await self.repo.get_playlist_items(conn, playlist_id)
            p["items"] = items
            p["user_role"] = role
            return p

    async def list_playlists(self, actor: Actor) -> List[Dict[str, Any]]:
        if not actor.user_id:
            return []
        async with self.db.connection() as conn:
            return await self.repo.list_user_playlists(conn, actor.user_id)

    async def create_playlist(
        self,
        actor: Actor,
        title: str,
        description: str = "",
        is_collaborative: bool = False,
        draft_id: Optional[str] = None,
    ) -> Dict[str, Any]:
        if not actor.user_id:
            raise ForbiddenError("Authentication required")

        if draft_id and self.draft_store:
            return await self.save_draft_as_playlist(actor, draft_id, title)

        playlist_id = str(uuid.uuid4())
        async with self.db.transaction() as conn:
            p = await self.repo.create_playlist(
                conn, playlist_id, actor.user_id, title, description, is_collaborative
            )
            # Write activity outbox event
            await self.repo.write_outbox_event(
                conn,
                str(uuid.uuid4()),
                {"type": "playlist_create", "user_id": actor.user_id, "playlist_id": playlist_id},
            )
            p["items"] = []
            p["user_role"] = "owner"
            return p

    async def update_playlist_metadata(
        self,
        actor: Actor,
        playlist_id: str,
        expected_version: Optional[int],
        title: Optional[str] = None,
        description: Optional[str] = None,
        is_collaborative: Optional[bool] = None,
    ) -> Dict[str, Any]:
        if expected_version is None:
            raise PreconditionRequiredError()

        async with self.db.transaction() as conn:
            role = await self._resolve_role(conn, playlist_id, actor)
            if role != "owner":
                raise ForbiddenError("Only the owner can update playlist metadata")

            # 1. Version-bump first
            new_version = await self.repo.bump_version_first(conn, playlist_id, expected_version)
            if new_version is None:
                raise PreconditionFailedError()

            updated = await self.repo.update_playlist_metadata(
                conn, playlist_id, title, description, is_collaborative
            )
            items = await self.repo.get_playlist_items(conn, playlist_id)
            updated["items"] = items
            updated["user_role"] = "owner"
            return updated

    async def delete_playlist(self, actor: Actor, playlist_id: str) -> bool:
        async with self.db.transaction() as conn:
            role = await self._resolve_role(conn, playlist_id, actor)
            if role != "owner":
                raise ForbiddenError("Only the owner can delete this playlist")
            return await self.repo.delete_playlist(conn, playlist_id)

    async def add_item(
        self,
        actor: Actor,
        playlist_id: str,
        expected_version: Optional[int],
        song_id: str,
        after_item_id: Optional[str] = None,
    ) -> Dict[str, Any]:
        if expected_version is None:
            raise PreconditionRequiredError()

        async with self.db.transaction() as conn:
            role = await self._resolve_role(conn, playlist_id, actor)
            if role not in ("owner", "editor"):
                raise ForbiddenError("Viewers cannot add items")

            # Check capacity limit
            count = await self.repo.count_playlist_items(conn, playlist_id)
            if count >= 500:
                raise ValidationError("Playlist item limit (500) exceeded")

            # 1. Version bump first
            new_version = await self.repo.bump_version_first(conn, playlist_id, expected_version)
            if new_version is None:
                raise PreconditionFailedError()

            # 2. Compute fractional index position
            items = await self.repo.get_playlist_items(conn, playlist_id)
            if not items:
                pos = between(None, None)
            elif after_item_id is None:
                # Append to end
                pos = between(items[-1]["position"], None)
            else:
                after_idx = next((i for i, it in enumerate(items) if str(it["id"]) == str(after_item_id)), None)
                if after_idx is None:
                    pos = between(items[-1]["position"], None)
                else:
                    prev_pos = items[after_idx]["position"]
                    next_pos = items[after_idx + 1]["position"] if after_idx + 1 < len(items) else None
                    pos = between(prev_pos, next_pos)

            item_id = str(uuid.uuid4())
            new_item = await self.repo.add_item(
                conn, item_id, playlist_id, song_id, pos, actor.user_id
            )

            # 3. Write activity outbox event
            await self.repo.write_outbox_event(
                conn,
                str(uuid.uuid4()),
                {
                    "type": "playlist_add",
                    "user_id": actor.user_id,
                    "playlist_id": playlist_id,
                    "song_id": song_id,
                    "version": new_version,
                },
            )
            return {"item": new_item, "version": new_version}

    async def delete_item(
        self,
        actor: Actor,
        playlist_id: str,
        expected_version: Optional[int],
        item_id: str,
    ) -> Dict[str, Any]:
        if expected_version is None:
            raise PreconditionRequiredError()

        async with self.db.transaction() as conn:
            role = await self._resolve_role(conn, playlist_id, actor)
            if role not in ("owner", "editor"):
                raise ForbiddenError("Viewers cannot remove items")

            # 1. Version bump first
            new_version = await self.repo.bump_version_first(conn, playlist_id, expected_version)
            if new_version is None:
                raise PreconditionFailedError()

            item = await self.repo.get_item(conn, item_id)
            if not item or str(item["playlist_id"]) != str(playlist_id):
                raise NotFoundError("Item not found in playlist")

            await self.repo.delete_item(conn, item_id)

            # 2. Write activity outbox event
            await self.repo.write_outbox_event(
                conn,
                str(uuid.uuid4()),
                {
                    "type": "playlist_remove",
                    "user_id": actor.user_id,
                    "playlist_id": playlist_id,
                    "song_id": str(item["song_id"]),
                    "version": new_version,
                },
            )
            return {"deleted": True, "version": new_version}

    async def move_item(
        self,
        actor: Actor,
        playlist_id: str,
        expected_version: Optional[int],
        item_id: str,
        after_item_id: Optional[str] = None,
    ) -> Dict[str, Any]:
        if expected_version is None:
            raise PreconditionRequiredError()

        async with self.db.transaction() as conn:
            role = await self._resolve_role(conn, playlist_id, actor)
            if role not in ("owner", "editor"):
                raise ForbiddenError("Viewers cannot reorder items")

            # 1. Version bump first
            new_version = await self.repo.bump_version_first(conn, playlist_id, expected_version)
            if new_version is None:
                raise PreconditionFailedError()

            items = await self.repo.get_playlist_items(conn, playlist_id)
            target = next((it for it in items if str(it["id"]) == str(item_id)), None)
            if not target:
                raise NotFoundError("Item not found")

            # Filter out moved item to compute new slot
            other_items = [it for it in items if str(it["id"]) != str(item_id)]
            if after_item_id is None:
                # Move to head
                pos = between(None, other_items[0]["position"] if other_items else None)
            else:
                after_idx = next((i for i, it in enumerate(other_items) if str(it["id"]) == str(after_item_id)), None)
                if after_idx is None:
                    pos = between(other_items[-1]["position"] if other_items else None, None)
                else:
                    prev_p = other_items[after_idx]["position"]
                    next_p = other_items[after_idx + 1]["position"] if after_idx + 1 < len(other_items) else None
                    pos = between(prev_p, next_p)

            # Single row update
            await self.repo.update_item_position(conn, item_id, pos)

            # Write activity outbox event
            await self.repo.write_outbox_event(
                conn,
                str(uuid.uuid4()),
                {
                    "type": "playlist_reorder",
                    "user_id": actor.user_id,
                    "playlist_id": playlist_id,
                    "item_id": item_id,
                    "version": new_version,
                },
            )
            return {"item_id": item_id, "new_position": pos, "version": new_version}

    async def save_draft_as_playlist(
        self,
        actor: Actor,
        draft_id: str,
        title: Optional[str] = None,
    ) -> Dict[str, Any]:
        if not self.draft_store:
            raise ValidationError("Draft store unavailable")

        draft = await self.draft_store.get_draft(actor.user_id, draft_id)
        playlist_id = str(uuid.uuid4())
        final_title = title or draft.get("title") or "AI Playlist"
        items_data = draft.get("items", [])

        async with self.db.transaction() as conn:
            p = await self.repo.create_playlist(
                conn, playlist_id, actor.user_id, final_title, "Created from AI draft"
            )

            # Bulk generate spaced fractional positions
            positions = generate_initial_keys(len(items_data))
            created_items = []
            for item_spec, pos in zip(items_data, positions):
                item_id = str(uuid.uuid4())
                song_id = item_spec["song_id"]
                it = await self.repo.add_item(
                    conn, item_id, playlist_id, song_id, pos, actor.user_id
                )
                created_items.append(it)

            # Write outbox events
            await self.repo.write_outbox_event(
                conn,
                str(uuid.uuid4()),
                {"type": "playlist_generate", "user_id": actor.user_id, "playlist_id": playlist_id},
            )
            await self.repo.write_outbox_event(
                conn,
                str(uuid.uuid4()),
                {"type": "playlist_save", "user_id": actor.user_id, "playlist_id": playlist_id},
            )

            # Delete draft post-commit
            await self.draft_store.delete_draft(actor.user_id, draft_id)

            p["items"] = created_items
            p["user_role"] = "owner"
            return p

    async def get_playback_source(self, actor: Actor, playlist_id: str, from_item_id: Optional[str] = None) -> List[Dict[str, Any]]:
        async with self.db.connection() as conn:
            await self._resolve_role(conn, playlist_id, actor)
            items = await self.repo.get_playlist_items(conn, playlist_id)
            if from_item_id:
                start_idx = next((i for i, it in enumerate(items) if str(it["id"]) == str(from_item_id)), 0)
                items = items[start_idx:]
            return [
                {
                    "item_id": str(it["id"]),
                    "song_id": str(it["song_id"]),
                    "position": it["position"],
                    "status": "READY",
                }
                for it in items
            ]

    async def get_recommender_context(self, playlist_id: str) -> Dict[str, Any]:
        async with self.db.connection() as conn:
            p = await self.repo.get_playlist(conn, playlist_id)
            if not p:
                raise NotFoundError("Playlist not found")
            items = await self.repo.get_playlist_items(conn, playlist_id)
            # Token budget cap: <= 50 items (Brief §6.7)
            capped_items = items[:50]
            collabs = await self.repo.list_collaborators(conn, playlist_id)
            return {
                "playlist_id": playlist_id,
                "title": p["title"],
                "items": [str(it["song_id"]) for it in capped_items],
                "contributors": [str(p["owner_id"])] + [str(c["user_id"]) for c in collabs],
            }
