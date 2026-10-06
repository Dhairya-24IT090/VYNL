import json
import uuid
from typing import Any, Dict, List, Optional
import asyncpg

class PlaylistRepository:
    async def create_playlist(
        self,
        conn: asyncpg.Connection,
        playlist_id: str,
        owner_id: str,
        title: str,
        description: str = "",
        is_collaborative: bool = False,
    ) -> Dict[str, Any]:
        row = await conn.fetchrow(
            """
            INSERT INTO playlist.playlists (id, owner_id, title, description, is_collaborative, version)
            VALUES ($1, $2, $3, $4, $5, 1)
            RETURNING id, owner_id, title, description, is_collaborative, version, created_at, updated_at
            """,
            uuid.UUID(playlist_id),
            uuid.UUID(owner_id),
            title,
            description,
            is_collaborative,
        )
        return dict(row)

    async def get_playlist(self, conn: asyncpg.Connection, playlist_id: str) -> Optional[Dict[str, Any]]:
        row = await conn.fetchrow(
            """
            SELECT id, owner_id, title, description, is_collaborative, version, created_at, updated_at
            FROM playlist.playlists
            WHERE id = $1
            """,
            uuid.UUID(playlist_id),
        )
        return dict(row) if row else None

    async def list_user_playlists(self, conn: asyncpg.Connection, user_id: str) -> List[Dict[str, Any]]:
        rows = await conn.fetch(
            """
            SELECT DISTINCT p.id, p.owner_id, p.title, p.description, p.is_collaborative, p.version, p.created_at, p.updated_at
            FROM playlist.playlists p
            LEFT JOIN playlist.playlist_collaborators c ON p.id = c.playlist_id
            WHERE p.owner_id = $1 OR c.user_id = $1
            ORDER BY p.updated_at DESC
            """,
            uuid.UUID(user_id),
        )
        return [dict(r) for r in rows]

    async def bump_version_first(
        self,
        conn: asyncpg.Connection,
        playlist_id: str,
        expected_version: int,
    ) -> Optional[int]:
        """
        Locks the playlist row and increments version in the same atomic statement.
        Executed as the FIRST statement in mutating transactions (Brief §6.2).
        Returns new version or None if expected_version does not match.
        """
        new_version = await conn.fetchval(
            """
            UPDATE playlist.playlists
            SET version = version + 1, updated_at = now()
            WHERE id = $1 AND version = $2
            RETURNING version
            """,
            uuid.UUID(playlist_id),
            expected_version,
        )
        return new_version

    async def update_playlist_metadata(
        self,
        conn: asyncpg.Connection,
        playlist_id: str,
        title: Optional[str] = None,
        description: Optional[str] = None,
        is_collaborative: Optional[bool] = None,
    ) -> Dict[str, Any]:
        row = await conn.fetchrow(
            """
            UPDATE playlist.playlists
            SET title = COALESCE($2, title),
                description = COALESCE($3, description),
                is_collaborative = COALESCE($4, is_collaborative),
                updated_at = now()
            WHERE id = $1
            RETURNING id, owner_id, title, description, is_collaborative, version, created_at, updated_at
            """,
            uuid.UUID(playlist_id),
            title,
            description,
            is_collaborative,
        )
        return dict(row)

    async def delete_playlist(self, conn: asyncpg.Connection, playlist_id: str) -> bool:
        res = await conn.execute(
            "DELETE FROM playlist.playlists WHERE id = $1",
            uuid.UUID(playlist_id),
        )
        return "DELETE 1" in res

    async def get_playlist_items(self, conn: asyncpg.Connection, playlist_id: str) -> List[Dict[str, Any]]:
        rows = await conn.fetch(
            """
            SELECT id, playlist_id, song_id, position, added_by, added_at
            FROM playlist.playlist_items
            WHERE playlist_id = $1
            ORDER BY position COLLATE "C" ASC
            """,
            uuid.UUID(playlist_id),
        )
        return [dict(r) for r in rows]

    async def get_item(self, conn: asyncpg.Connection, item_id: str) -> Optional[Dict[str, Any]]:
        row = await conn.fetchrow(
            """
            SELECT id, playlist_id, song_id, position, added_by, added_at
            FROM playlist.playlist_items
            WHERE id = $1
            """,
            uuid.UUID(item_id),
        )
        return dict(row) if row else None

    async def add_item(
        self,
        conn: asyncpg.Connection,
        item_id: str,
        playlist_id: str,
        song_id: str,
        position: str,
        added_by: str,
    ) -> Dict[str, Any]:
        row = await conn.fetchrow(
            """
            INSERT INTO playlist.playlist_items (id, playlist_id, song_id, position, added_by)
            VALUES ($1, $2, $3, $4, $5)
            RETURNING id, playlist_id, song_id, position, added_by, added_at
            """,
            uuid.UUID(item_id),
            uuid.UUID(playlist_id),
            uuid.UUID(song_id),
            position,
            uuid.UUID(added_by),
        )
        return dict(row)

    async def delete_item(self, conn: asyncpg.Connection, item_id: str) -> bool:
        res = await conn.execute(
            "DELETE FROM playlist.playlist_items WHERE id = $1",
            uuid.UUID(item_id),
        )
        return "DELETE 1" in res

    async def update_item_position(self, conn: asyncpg.Connection, item_id: str, new_position: str) -> bool:
        res = await conn.execute(
            """
            UPDATE playlist.playlist_items
            SET position = $2
            WHERE id = $1
            """,
            uuid.UUID(item_id),
            new_position,
        )
        return "UPDATE 1" in res

    async def count_playlist_items(self, conn: asyncpg.Connection, playlist_id: str) -> int:
        return await conn.fetchval(
            "SELECT count(*) FROM playlist.playlist_items WHERE playlist_id = $1",
            uuid.UUID(playlist_id),
        )

    async def get_membership_role(self, conn: asyncpg.Connection, playlist_id: str, user_id: str) -> Optional[str]:
        p = await self.get_playlist(conn, playlist_id)
        if not p:
            return None
        if str(p["owner_id"]) == str(user_id):
            return "owner"
        collab_role = await conn.fetchval(
            """
            SELECT role FROM playlist.playlist_collaborators
            WHERE playlist_id = $1 AND user_id = $2
            """,
            uuid.UUID(playlist_id),
            uuid.UUID(user_id),
        )
        return collab_role

    async def add_collaborator(self, conn: asyncpg.Connection, playlist_id: str, user_id: str, role: str):
        await conn.execute(
            """
            INSERT INTO playlist.playlist_collaborators (playlist_id, user_id, role)
            VALUES ($1, $2, $3)
            ON CONFLICT (playlist_id, user_id) DO UPDATE SET role = EXCLUDED.role
            """,
            uuid.UUID(playlist_id),
            uuid.UUID(user_id),
            role,
        )

    async def remove_collaborator(self, conn: asyncpg.Connection, playlist_id: str, user_id: str) -> bool:
        res = await conn.execute(
            "DELETE FROM playlist.playlist_collaborators WHERE playlist_id = $1 AND user_id = $2",
            uuid.UUID(playlist_id),
            uuid.UUID(user_id),
        )
        return "DELETE 1" in res

    async def list_collaborators(self, conn: asyncpg.Connection, playlist_id: str) -> List[Dict[str, Any]]:
        rows = await conn.fetch(
            """
            SELECT user_id, role, added_at
            FROM playlist.playlist_collaborators
            WHERE playlist_id = $1
            ORDER BY added_at ASC
            """,
            uuid.UUID(playlist_id),
        )
        return [dict(r) for r in rows]

    async def create_invite(
        self,
        conn: asyncpg.Connection,
        invite_id: str,
        playlist_id: str,
        role: str,
        created_by: str,
        expires_at: Any,
    ) -> Dict[str, Any]:
        row = await conn.fetchrow(
            """
            INSERT INTO playlist.playlist_invites (id, playlist_id, role, created_by, expires_at)
            VALUES ($1, $2, $3, $4, $5)
            RETURNING id, playlist_id, role, created_by, expires_at
            """,
            uuid.UUID(invite_id),
            uuid.UUID(playlist_id),
            role,
            uuid.UUID(created_by),
            expires_at,
        )
        return dict(row)

    async def get_invite(self, conn: asyncpg.Connection, invite_id: str) -> Optional[Dict[str, Any]]:
        row = await conn.fetchrow(
            """
            SELECT id, playlist_id, role, created_by, expires_at, redeemed_by, redeemed_at, revoked_at
            FROM playlist.playlist_invites
            WHERE id = $1
            """,
            uuid.UUID(invite_id),
        )
        return dict(row) if row else None

    async def redeem_invite(self, conn: asyncpg.Connection, invite_id: str, user_id: str) -> Optional[Dict[str, Any]]:
        row = await conn.fetchrow(
            """
            UPDATE playlist.playlist_invites
            SET redeemed_at = now(), redeemed_by = $2
            WHERE id = $1 AND redeemed_at IS NULL AND revoked_at IS NULL AND expires_at > now()
            RETURNING id, playlist_id, role, created_by
            """,
            uuid.UUID(invite_id),
            uuid.UUID(user_id),
        )
        return dict(row) if row else None

    async def revoke_invite(self, conn: asyncpg.Connection, invite_id: str) -> bool:
        res = await conn.execute(
            """
            UPDATE playlist.playlist_invites
            SET revoked_at = now()
            WHERE id = $1 AND revoked_at IS NULL
            """,
            uuid.UUID(invite_id),
        )
        return "UPDATE 1" in res

    async def write_outbox_event(self, conn: asyncpg.Connection, event_id: str, payload: Dict[str, Any]):
        await conn.execute(
            """
            INSERT INTO playlist.activity_outbox (event_id, payload)
            VALUES ($1, $2)
            """,
            uuid.UUID(event_id),
            json.dumps(payload),
        )
