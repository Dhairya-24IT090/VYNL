import asyncio
import json
import logging
import uuid
from typing import Any, Dict, List, Optional, Set, Tuple
from fastapi import WebSocket, WebSocketDisconnect, status
from service_kit.auth import SessionVerifier
from service_kit.context import Actor
from playlist_service.service import PlaylistService
from playlist_service.fractional import between

logger = logging.getLogger("playlist_service.ws")

# Close codes
WS_CLOSE_NORMAL = 1000
WS_CLOSE_GOING_AWAY = 1001       # Graceful shutdown / server restart
WS_CLOSE_POLICY_VIOLATION = 1008
WS_CLOSE_FORBIDDEN = 4403        # Auth failure / Stranger / Revoked role
WS_CLOSE_LIMIT_EXCEEDED = 4429   # 50-socket cluster limit exceeded

MAX_CLUSTER_SOCKETS_PER_PLAYLIST = 50

LUA_ACQUIRE_SLOT = """
local count = redis.call('GET', KEYS[1])
if count and tonumber(count) >= tonumber(ARGV[1]) then
    return 0
end
redis.call('INCR', KEYS[1])
redis.call('EXPIRE', KEYS[1], 86400)
return 1
"""

LUA_RELEASE_SLOT = """
local count = redis.call('GET', KEYS[1])
if count and tonumber(count) > 0 then
    redis.call('DECR', KEYS[1])
end
return 1
"""

class CollabConnection:
    def __init__(self, websocket: WebSocket, user_id: str, display_name: str, role: str, playlist_id: str):
        self.websocket = websocket
        self.user_id = user_id
        self.display_name = display_name
        self.role = role
        self.playlist_id = playlist_id
        self.is_alive = True

    async def send_json(self, data: Dict[str, Any]) -> None:
        if self.is_alive:
            try:
                await self.websocket.send_text(json.dumps(data))
            except Exception:
                self.is_alive = False

class CollabManager:
    def __init__(self, service: PlaylistService, session_verifier: SessionVerifier, redis_client=None, jobs_manager=None):
        self.service = service
        self.session_verifier = session_verifier
        self.redis = redis_client
        self.jobs = jobs_manager
        
        # Local active connections: playlist_id -> Set[CollabConnection]
        self._local_connections: Dict[str, Set[CollabConnection]] = {}
        # Local socket count fallback when redis is absent
        self._local_counts: Dict[str, int] = {}
        # PubSub listening tasks: playlist_id -> asyncio.Task
        self._pubsub_tasks: Dict[str, asyncio.Task] = {}
        self._is_draining = False

        self.node_id = str(uuid.uuid4())
        # In-memory suggestions store: playlist_id -> Dict[suggestion_id, dict]
        self._suggestions: Dict[str, Dict[str, Any]] = {}

    def _cluster_counter_key(self, playlist_id: str) -> str:
        return f"vynl:playlist:{playlist_id}:sockets_count"

    def _pubsub_channel(self, playlist_id: str) -> str:
        return f"vynl:collab:{playlist_id}"

    async def acquire_cluster_slot(self, playlist_id: str) -> bool:
        if self.redis:
            try:
                res = await self.redis.eval(
                    LUA_ACQUIRE_SLOT,
                    1,
                    self._cluster_counter_key(playlist_id),
                    str(MAX_CLUSTER_SOCKETS_PER_PLAYLIST)
                )
                return bool(res == 1)
            except Exception as e:
                logger.warning(f"Redis slot acquisition error: {e}, falling back to local count")
        
        # In-memory fallback
        current = self._local_counts.get(playlist_id, 0)
        if current >= MAX_CLUSTER_SOCKETS_PER_PLAYLIST:
            return False
        self._local_counts[playlist_id] = current + 1
        return True

    async def release_cluster_slot(self, playlist_id: str) -> None:
        if self.redis:
            try:
                await self.redis.eval(
                    LUA_RELEASE_SLOT,
                    1,
                    self._cluster_counter_key(playlist_id)
                )
                return
            except Exception as e:
                logger.warning(f"Redis slot release error: {e}")
        
        current = self._local_counts.get(playlist_id, 0)
        if current > 0:
            self._local_counts[playlist_id] = current - 1

    async def get_cluster_count(self, playlist_id: str) -> int:
        if self.redis:
            try:
                val = await self.redis.get(self._cluster_counter_key(playlist_id))
                return int(val) if val else 0
            except Exception:
                pass
        return self._local_counts.get(playlist_id, 0)

    async def authenticate_and_authorize(self, websocket: WebSocket, playlist_id: str) -> Tuple[Optional[Actor], Optional[str]]:
        """
        Validates session and verifies user has owner, editor, or viewer role for playlist.
        Returns (Actor, role) or (None, None).
        """
        # Extract token from cookies or query params
        token = websocket.cookies.get("vynl_session")
        if not token:
            token = websocket.query_params.get("token") or websocket.query_params.get("session_id")
        
        if not token:
            return None, None

        res = await self.session_verifier.verify_session(token)
        if not res:
            return None, None
        user_id = res[0] if isinstance(res, tuple) else res

        actor = Actor(user_id=user_id, is_internal=False)
        try:
            role = await self.service.get_user_role(actor, playlist_id)
            if role not in ("owner", "editor", "viewer"):
                return None, None
            return actor, role
        except Exception:
            return None, None

    async def register(self, conn: CollabConnection) -> None:
        if conn.playlist_id not in self._local_connections:
            self._local_connections[conn.playlist_id] = set()
            # Start pubsub listener if redis is connected
            if self.redis:
                self._pubsub_tasks[conn.playlist_id] = asyncio.create_task(
                    self._listen_pubsub(conn.playlist_id)
                )

        self._local_connections[conn.playlist_id].add(conn)

    async def deregister(self, conn: CollabConnection) -> None:
        conn.is_alive = False
        conns = self._local_connections.get(conn.playlist_id, set())
        conns.discard(conn)
        await self.release_cluster_slot(conn.playlist_id)

        if not conns:
            self._local_connections.pop(conn.playlist_id, None)
            task = self._pubsub_tasks.pop(conn.playlist_id, None)
            if task:
                task.cancel()
        else:
            # Broadcast updated presence
            await self.broadcast(conn.playlist_id, {
                "type": "presence",
                "presence": self.get_presence(conn.playlist_id)
            })

    def get_presence(self, playlist_id: str) -> List[Dict[str, Any]]:
        conns = self._local_connections.get(playlist_id, set())
        # Deduplicate users
        seen = set()
        pres = []
        for c in conns:
            if c.user_id not in seen:
                seen.add(c.user_id)
                pres.append({
                    "user_id": c.user_id,
                    "display_name": c.display_name,
                    "role": c.role
                })
        return pres

    async def broadcast(self, playlist_id: str, message: Dict[str, Any], publish_to_redis: bool = True) -> None:
        """
        Broadcasts message to local connections and optionally publishes to Redis channel.
        """
        # Send locally
        conns = list(self._local_connections.get(playlist_id, set()))
        for c in conns:
            await c.send_json(message)

        # Publish to Redis channel for multi-node sibling fan-out
        if publish_to_redis and self.redis:
            try:
                channel = self._pubsub_channel(playlist_id)
                payload = dict(message)
                payload["_origin_node"] = self.node_id
                await self.redis.publish(channel, json.dumps(payload))
            except Exception as e:
                logger.warning(f"Error publishing to pubsub channel: {e}")

    async def _listen_pubsub(self, playlist_id: str) -> None:
        """
        Listens on Redis channel and fans out frames to local connections.
        """
        channel_name = self._pubsub_channel(playlist_id)
        try:
            pubsub = self.redis.pubsub()
            await pubsub.subscribe(channel_name)
            async for raw in pubsub.listen():
                if raw and raw.get("type") == "message":
                    try:
                        data = json.loads(raw["data"])
                        # Ignore frames originating from this node (already broadcast locally)
                        if data.get("_origin_node") == self.node_id:
                            continue
                        data.pop("_origin_node", None)
                        conns = list(self._local_connections.get(playlist_id, set()))
                        for c in conns:
                            await c.send_json(data)
                    except Exception as e:
                        logger.error(f"Error decoding pubsub frame: {e}")
        except asyncio.CancelledError:
            pass
        except Exception as e:
            logger.warning(f"PubSub listener terminated: {e}")

    async def handle_frame(self, conn: CollabConnection, frame: Dict[str, Any]) -> None:
        """
        Processes incoming client frame with strict role validation and optimistic locking.
        """
        op = frame.get("op")
        client_msg_id = frame.get("client_msg_id")

        if op == "resync":
            # Send latest snapshot to requesting client
            p = await self.service.get_playlist(Actor(user_id=conn.user_id), conn.playlist_id)
            await conn.send_json({
                "type": "snapshot",
                "version": p["version"],
                "items": p["items"],
                "role": conn.role,
                "collaborators": p["collaborators"],
                "client_msg_id": client_msg_id
            })
            return

        if op == "suggestion.reject":
            # Editor or owner can reject suggestion
            if conn.role not in ("owner", "editor"):
                await conn.send_json({
                    "type": "error",
                    "code": "forbidden",
                    "message": "Viewers cannot reject suggestions",
                    "client_msg_id": client_msg_id
                })
                return
            s_id = frame.get("suggestion_id")
            if s_id and conn.playlist_id in self._suggestions and s_id in self._suggestions[conn.playlist_id]:
                self._suggestions[conn.playlist_id][s_id]["status"] = "rejected"
                await self.broadcast(conn.playlist_id, {
                    "type": "suggestions",
                    "suggestions": list(self._suggestions[conn.playlist_id].values())
                })
            await conn.send_json({"type": "ack", "client_msg_id": client_msg_id})
            return

        if op in ("add", "move", "remove"):
            # TASK 20: Role check on every mutating frame
            # Re-verify user's role from service
            actor = Actor(user_id=conn.user_id)
            current_role = await self.service.get_user_role(actor, conn.playlist_id)
            if current_role not in ("owner", "editor"):
                await conn.send_json({
                    "type": "error",
                    "code": "forbidden",
                    "message": "Viewers cannot mutate playlists",
                    "client_msg_id": client_msg_id
                })
                return

            # TASK 21: Optimistic concurrency check
            base_version = frame.get("base_version")
            current_playlist = await self.service.get_playlist(actor, conn.playlist_id)
            if base_version != current_playlist["version"]:
                # Version mismatch -> send conflict snapshot
                await conn.send_json({
                    "type": "snapshot",
                    "version": current_playlist["version"],
                    "items": current_playlist["items"],
                    "code": "version_conflict",
                    "message": f"Base version {base_version} is stale, current version is {current_playlist['version']}",
                    "client_msg_id": client_msg_id
                })
                return

            # Apply mutation
            try:
                if op == "add":
                    song_id = frame.get("song_id")
                    suggestion_id = frame.get("suggestion_id")
                    after_position = frame.get("after_position")
                    
                    # If suggestion_id is provided, resolve song_id and mark accepted
                    if suggestion_id and conn.playlist_id in self._suggestions and suggestion_id in self._suggestions[conn.playlist_id]:
                        sug = self._suggestions[conn.playlist_id][suggestion_id]
                        if not song_id:
                            song_id = sug["song_id"]
                        sug["status"] = "accepted"
                        await self.broadcast(conn.playlist_id, {
                            "type": "suggestions",
                            "suggestions": list(self._suggestions[conn.playlist_id].values())
                        })

                    res = await self.service.add_item(
                        actor=actor,
                        playlist_id=conn.playlist_id,
                        expected_version=base_version,
                        song_id=song_id,
                        after_item_id=None, # will append or insert
                    )
                elif op == "move":
                    item_id = frame.get("item_id")
                    after_item_id = frame.get("after_item_id")
                    res = await self.service.move_item(
                        actor=actor,
                        playlist_id=conn.playlist_id,
                        expected_version=base_version,
                        item_id=item_id,
                        after_item_id=after_item_id,
                    )
                elif op == "remove":
                    item_id = frame.get("item_id")
                    res = await self.service.delete_item(
                        actor=actor,
                        playlist_id=conn.playlist_id,
                        expected_version=base_version,
                        item_id=item_id,
                    )

                fresh_p = await self.service.get_playlist(actor, conn.playlist_id)

                # Send ack to author
                await conn.send_json({
                    "type": "ack",
                    "client_msg_id": client_msg_id,
                    "version": fresh_p["version"]
                })

                # Broadcast op_applied to all participants
                await self.broadcast(conn.playlist_id, {
                    "type": "op_applied",
                    "op": op,
                    "version": fresh_p["version"],
                    "items": fresh_p["items"],
                    "actor_id": conn.user_id
                })

                # Trigger AI Suggestion job (TASK 24)
                await self.trigger_ai_suggestions_if_needed(conn.playlist_id, fresh_p["version"])

            except Exception as err:
                logger.error(f"Error applying WS op {op}: {err}")
                await conn.send_json({
                    "type": "error",
                    "code": "operation_failed",
                    "message": str(err),
                    "client_msg_id": client_msg_id
                })
            return

        await conn.send_json({
            "type": "error",
            "code": "unknown_op",
            "message": f"Unsupported operation {op}",
            "client_msg_id": client_msg_id
        })

    async def trigger_ai_suggestions_if_needed(self, playlist_id: str, version: int, window_sec: Optional[int] = 10) -> Optional[str]:
        """
        Enqueues collab_suggest job to Redis Streams with atomic deduplication.
        Rapid edits within window_sec produce at most 1 suggestion job per window.
        """
        if not self.jobs:
            return None

        import time
        if window_sec:
            window_bucket = int(time.time() // window_sec)
            dedupe_key = f"vynl:dedupe:collab_suggest:{playlist_id}:{window_bucket}"
            ttl = window_sec * 2
        else:
            dedupe_key = f"vynl:dedupe:collab_suggest:{playlist_id}:{version}"
            ttl = 60

        return await self.jobs.enqueue(
            job_name="collab_suggest",
            payload={"playlist_id": playlist_id, "version": version},
            dedupe_key=dedupe_key,
            dedupe_ttl=ttl,
        )

    async def add_suggestion(self, playlist_id: str, suggestion_id: str, song_id: str, title: str, artist: str, reason: str = "") -> None:
        """
        Adds suggestion to playlist and broadcasts to all connected sockets.
        """
        if playlist_id not in self._suggestions:
            self._suggestions[playlist_id] = {}
        
        self._suggestions[playlist_id][suggestion_id] = {
            "suggestion_id": suggestion_id,
            "song_id": song_id,
            "title": title,
            "artist": artist,
            "reason": reason,
            "status": "pending"
        }

        await self.broadcast(playlist_id, {
            "type": "suggestions",
            "suggestions": list(self._suggestions[playlist_id].values())
        })

    def get_suggestions(self, playlist_id: str) -> List[Dict[str, Any]]:
        return list(self._suggestions.get(playlist_id, {}).values())

    async def close_all_draining(self) -> None:
        """
        Closes all sockets with code 1001 (Going Away) for graceful shutdown.
        """
        self._is_draining = True
        for playlist_id, conns in list(self._local_connections.items()):
            for c in list(conns):
                try:
                    await c.websocket.close(code=WS_CLOSE_GOING_AWAY, reason="Server shutting down")
                except Exception:
                    pass
        self._local_connections.clear()
