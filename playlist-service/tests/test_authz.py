import pytest
import uuid
from typing import Dict, List, Optional
from service_kit.context import Actor
from service_kit.errors import ForbiddenError, NotFoundError, PreconditionFailedError
from playlist_service.fractional import between
from playlist_service.service import PlaylistService

class MockConnection:
    pass

class MockDatabaseManager:
    def __init__(self):
        pass

    from contextlib import asynccontextmanager
    @asynccontextmanager
    async def connection(self):
        yield MockConnection()

    @asynccontextmanager
    async def transaction(self):
        yield MockConnection()

class MockPlaylistRepository:
    def __init__(self):
        self.playlists: Dict[str, dict] = {}
        self.items: Dict[str, list] = {}  # playlist_id -> list of item dicts
        self.collaborators: Dict[str, dict] = {}  # (playlist_id, user_id) -> role
        self.outbox: list = []

    async def get_playlist(self, conn, playlist_id: str):
        return self.playlists.get(playlist_id)

    async def list_user_playlists(self, conn, user_id: str):
        return [p for p in self.playlists.values() if p["owner_id"] == user_id]

    async def create_playlist(self, conn, playlist_id, owner_id, title, description="", is_collaborative=False):
        p = {
            "id": playlist_id,
            "owner_id": owner_id,
            "title": title,
            "description": description,
            "is_collaborative": is_collaborative,
            "version": 1,
        }
        self.playlists[playlist_id] = p
        self.items[playlist_id] = []
        return p

    async def bump_version_first(self, conn, playlist_id, expected_version):
        p = self.playlists.get(playlist_id)
        if not p or p["version"] != expected_version:
            return None
        p["version"] += 1
        return p["version"]

    async def update_playlist_metadata(self, conn, playlist_id, title=None, description=None, is_collaborative=None):
        p = self.playlists[playlist_id]
        if title is not None:
            p["title"] = title
        if description is not None:
            p["description"] = description
        if is_collaborative is not None:
            p["is_collaborative"] = is_collaborative
        return p

    async def delete_playlist(self, conn, playlist_id):
        self.playlists.pop(playlist_id, None)
        self.items.pop(playlist_id, None)
        return True

    async def get_playlist_items(self, conn, playlist_id):
        return sorted(self.items.get(playlist_id, []), key=lambda x: x["position"])

    async def get_item(self, conn, item_id):
        for its in self.items.values():
            for it in its:
                if it["id"] == item_id:
                    return it
        return None

    async def add_item(self, conn, item_id, playlist_id, song_id, position, added_by):
        item = {
            "id": item_id,
            "playlist_id": playlist_id,
            "song_id": song_id,
            "position": position,
            "added_by": added_by,
        }
        self.items.setdefault(playlist_id, []).append(item)
        return item

    async def delete_item(self, conn, item_id):
        for p_id, its in self.items.items():
            self.items[p_id] = [it for it in its if it["id"] != item_id]
        return True

    async def update_item_position(self, conn, item_id, new_position):
        for its in self.items.values():
            for it in its:
                if it["id"] == item_id:
                    it["position"] = new_position
                    return True
        return False

    async def count_playlist_items(self, conn, playlist_id):
        return len(self.items.get(playlist_id, []))

    async def get_membership_role(self, conn, playlist_id, user_id):
        p = self.playlists.get(playlist_id)
        if not p:
            return None
        if p["owner_id"] == user_id:
            return "owner"
        return self.collaborators.get((playlist_id, user_id))

    async def add_collaborator(self, conn, playlist_id, user_id, role):
        self.collaborators[(playlist_id, user_id)] = role

    async def list_collaborators(self, conn, playlist_id):
        return [{"user_id": u, "role": r} for (p, u), r in self.collaborators.items() if p == playlist_id]

    async def write_outbox_event(self, conn, event_id, payload):
        self.outbox.append((event_id, payload))

    async def purge_user_data(self, conn, user_id: str):
        counts = {"playlists_deleted": 0, "playlists_transferred": 0, "items_anonymized": 0}
        to_del = []
        for p_id, p in list(self.playlists.items()):
            if p["owner_id"] == user_id:
                if p.get("is_collaborative"):
                    # Find earliest editor
                    editors = [
                        u for (pl_id, u), r in self.collaborators.items()
                        if pl_id == p_id and r == "editor"
                    ]
                    if editors:
                        new_owner = editors[0]
                        p["owner_id"] = new_owner
                        self.collaborators.pop((p_id, new_owner), None)
                        counts["playlists_transferred"] += 1
                        continue
                to_del.append(p_id)
                counts["playlists_deleted"] += 1

        for p_id in to_del:
            self.playlists.pop(p_id, None)
            self.items.pop(p_id, None)

        # Anonymize items in other playlists
        for p_id, item_list in self.items.items():
            for item in item_list:
                if item.get("added_by") == user_id:
                    item["added_by"] = "00000000-0000-0000-0000-000000000000"
                    counts["items_anonymized"] += 1

        # Remove collaborator entries
        for (pl_id, u) in list(self.collaborators.keys()):
            if u == user_id:
                self.collaborators.pop((pl_id, u), None)

        return counts


# Authorization Matrix Test (Task F10-1)
AUTHZ_MATRIX = [
    # (role, action, expected_status)
    # Owner
    ("owner", "read", 200),
    ("owner", "read_playback", 200),
    ("owner", "add_item", 200),
    ("owner", "delete_item", 200),
    ("owner", "move_item", 200),
    ("owner", "update_meta", 200),
    ("owner", "delete_playlist", 200),

    # Editor
    ("editor", "read", 200),
    ("editor", "read_playback", 200),
    ("editor", "add_item", 200),
    ("editor", "delete_item", 200),
    ("editor", "move_item", 200),
    ("editor", "update_meta", 403),
    ("editor", "delete_playlist", 403),

    # Viewer
    ("viewer", "read", 200),
    ("viewer", "read_playback", 200),
    ("viewer", "add_item", 403),
    ("viewer", "delete_item", 403),
    ("viewer", "move_item", 403),
    ("viewer", "update_meta", 403),
    ("viewer", "delete_playlist", 403),

    # Stranger (404 hidden existence for all routes)
    ("stranger", "read", 404),
    ("stranger", "read_playback", 404),
    ("stranger", "add_item", 404),
    ("stranger", "delete_item", 404),
    ("stranger", "move_item", 404),
    ("stranger", "update_meta", 404),
    ("stranger", "delete_playlist", 404),
]

@pytest.mark.asyncio
@pytest.mark.parametrize("role,action,expected_status", AUTHZ_MATRIX)
async def test_authz_matrix_all_roles_all_routes(role: str, action: str, expected_status: int):
    repo = MockPlaylistRepository()
    db = MockDatabaseManager()
    service = PlaylistService(db, repo)

    owner_id = "user-owner"
    editor_id = "user-editor"
    viewer_id = "user-viewer"
    stranger_id = "user-stranger"
    playlist_id = "playlist-1"

    # Seed playlist and items
    await repo.create_playlist(None, playlist_id, owner_id, "Test Playlist", is_collaborative=True)
    await repo.add_collaborator(None, playlist_id, editor_id, "editor")
    await repo.add_collaborator(None, playlist_id, viewer_id, "viewer")
    await repo.add_item(None, "item-1", playlist_id, "song-1", "V", owner_id)

    actors = {
        "owner": Actor(user_id=owner_id),
        "editor": Actor(user_id=editor_id),
        "viewer": Actor(user_id=viewer_id),
        "stranger": Actor(user_id=stranger_id),
    }
    actor = actors[role]

    async def execute_action():
        p = await repo.get_playlist(None, playlist_id)
        current_version = p["version"] if p else 1
        if action == "read":
            await service.get_playlist(actor, playlist_id)
        elif action == "read_playback":
            await service.get_playback_source(actor, playlist_id)
        elif action == "add_item":
            await service.add_item(actor, playlist_id, current_version, "song-new")
        elif action == "delete_item":
            await service.delete_item(actor, playlist_id, current_version, "item-1")
        elif action == "move_item":
            await service.move_item(actor, playlist_id, current_version, "item-1")
        elif action == "update_meta":
            await service.update_playlist_metadata(actor, playlist_id, current_version, title="New Title")
        elif action == "delete_playlist":
            await service.delete_playlist(actor, playlist_id)

    if expected_status == 200:
        await execute_action()
    elif expected_status == 403:
        with pytest.raises(ForbiddenError):
            await execute_action()
    elif expected_status == 404:
        with pytest.raises(NotFoundError):
            await execute_action()
    else:
        pytest.fail(f"Unhandled expected status: {expected_status}")
