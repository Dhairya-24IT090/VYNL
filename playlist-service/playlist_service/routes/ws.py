import json
import logging
from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from playlist_service.ws import (
    CollabConnection,
    CollabManager,
    WS_CLOSE_FORBIDDEN,
    WS_CLOSE_LIMIT_EXCEEDED,
)

logger = logging.getLogger("playlist_service.routes.ws")

def create_ws_router(collab_manager: CollabManager) -> APIRouter:
    router = APIRouter(tags=["collaboration"])

    @router.websocket("/v1/playlists/{playlist_id}/live")
    async def playlist_live_ws(websocket: WebSocket, playlist_id: str):
        # 1. Authenticate and authorize (handshake)
        actor, role = await collab_manager.authenticate_and_authorize(websocket, playlist_id)
        if not actor or not role:
            # Per AUTHZ.md / Flow 10: Stranger or unauthenticated gets 4403
            await websocket.close(code=WS_CLOSE_FORBIDDEN, reason="Forbidden")
            return

        # 2. Enforce 50-socket cluster limit
        acquired = await collab_manager.acquire_cluster_slot(playlist_id)
        if not acquired:
            await websocket.close(code=WS_CLOSE_LIMIT_EXCEEDED, reason="Cluster connection limit exceeded (max 50)")
            return

        await websocket.accept()

        conn = CollabConnection(
            websocket=websocket,
            user_id=actor.user_id,
            display_name=f"User {actor.user_id[:6]}",
            role=role,
            playlist_id=playlist_id,
        )
        await collab_manager.register(conn)

        try:
            # Send initial snapshot
            p = await collab_manager.service.get_playlist(actor, playlist_id)
            await conn.send_json({
                "type": "snapshot",
                "version": p["version"],
                "items": p["items"],
                "role": role,
                "collaborators": p["collaborators"],
                "presence": collab_manager.get_presence(playlist_id),
            })

            # Send suggestions if any
            sugs = collab_manager.get_suggestions(playlist_id)
            if sugs:
                await conn.send_json({
                    "type": "suggestions",
                    "suggestions": sugs,
                })

            # Broadcast updated presence to peers
            await collab_manager.broadcast(playlist_id, {
                "type": "presence",
                "presence": collab_manager.get_presence(playlist_id)
            })

            # Process client frames
            while True:
                data = await websocket.receive_text()
                try:
                    frame = json.loads(data)
                except Exception:
                    await conn.send_json({
                        "type": "error",
                        "code": "malformed_json",
                        "message": "Message body is not valid JSON"
                    })
                    continue

                await collab_manager.handle_frame(conn, frame)

        except WebSocketDisconnect:
            pass
        except Exception as e:
            logger.error(f"WebSocket session error: {e}")
        finally:
            await collab_manager.deregister(conn)

    return router
