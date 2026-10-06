import json
import time
from typing import Any, Dict, List, Optional
import redis.asyncio as redis
from service_kit.errors import NotFoundError, GoneError, ForbiddenError

class DraftStore:
    def __init__(self, redis_client: redis.Redis, default_ttl: int = 3600, max_ttl: int = 7200):
        self.redis = redis_client
        self.default_ttl = default_ttl
        self.max_ttl = max_ttl

    def _key(self, user_id: str, draft_id: str) -> str:
        return f"draft:{user_id}:{draft_id}"

    async def save_internal_draft(
        self,
        draft_id: str,
        user_id: str,
        seeds: Dict[str, Any],
        items: List[Dict[str, Any]],
        title: str = "New AI Playlist",
    ) -> Dict[str, Any]:
        key = self._key(user_id, draft_id)
        now = time.time()
        payload = {
            "draft_id": draft_id,
            "user_id": user_id,
            "title": title,
            "seeds": seeds,
            "items": items,
            "version": 1,
            "created_at": now,
            "updated_at": now,
        }
        await self.redis.set(key, json.dumps(payload), ex=self.default_ttl)
        return payload

    async def get_draft(self, user_id: str, draft_id: str) -> Dict[str, Any]:
        key = self._key(user_id, draft_id)
        raw = await self.redis.get(key)
        if not raw:
            # Check if expired via scan
            raise NotFoundError("Draft expired or not found")
        return json.loads(raw)

    async def update_draft(
        self,
        user_id: str,
        draft_id: str,
        title: Optional[str] = None,
        items: Optional[List[Dict[str, Any]]] = None,
    ) -> Dict[str, Any]:
        draft = await self.get_draft(user_id, draft_id)
        now = time.time()
        
        # Enforce max lifetime cap
        initial_created = draft.get("created_at", now)
        if now - initial_created > self.max_ttl:
            await self.delete_draft(user_id, draft_id)
            raise GoneError("Draft expired past max lifetime")

        if title is not None:
            draft["title"] = title
        if items is not None:
            draft["items"] = items
        draft["version"] = draft.get("version", 1) + 1
        draft["updated_at"] = now

        # Refresh remaining TTL capped by max lifetime
        remaining_ttl = int(max(60, min(self.default_ttl, self.max_ttl - (now - initial_created))))
        key = self._key(user_id, draft_id)
        await self.redis.set(key, json.dumps(draft), ex=remaining_ttl)
        return draft

    async def delete_draft(self, user_id: str, draft_id: str) -> bool:
        key = self._key(user_id, draft_id)
        res = await self.redis.delete(key)
        return res > 0
