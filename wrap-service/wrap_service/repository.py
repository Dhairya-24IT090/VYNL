import json
import uuid
from typing import Any, Dict, Optional

class WrapRepository:
    def __init__(self, db_manager=None):
        self.db = db_manager
        self._wraps: Dict[str, Dict[str, Any]] = {} # (user_id, period) -> payload

    def _make_key(self, user_id: str, period: str) -> str:
        return f"{user_id}:{period}"

    async def get_wrap(self, user_id: str, period: str) -> Optional[Dict[str, Any]]:
        if self.db:
            async with self.db.connection() as conn:
                raw = await conn.fetchval(
                    "SELECT payload FROM wrap.monthly_wraps WHERE user_id = $1 AND period = $2",
                    uuid.UUID(user_id), period,
                )
            if raw is None:
                return None
            return json.loads(raw) if isinstance(raw, str) else dict(raw)
        return self._wraps.get(self._make_key(user_id, period))

    async def save_wrap(self, user_id: str, period: str, payload: Dict[str, Any]) -> None:
        if self.db:
            async with self.db.connection() as conn:
                await conn.execute(
                    """
                    INSERT INTO wrap.monthly_wraps (user_id, period, payload, is_final)
                    VALUES ($1, $2, $3::jsonb, $4)
                    ON CONFLICT (user_id, period) DO UPDATE
                    SET payload = EXCLUDED.payload, is_final = EXCLUDED.is_final,
                        updated_at = now()
                    """,
                    uuid.UUID(user_id), period, json.dumps(payload), bool(payload.get("is_final")),
                )
            return
        self._wraps[self._make_key(user_id, period)] = payload

    async def has_final_wrap(self, user_id: str, period: str) -> bool:
        if self.db:
            async with self.db.connection() as conn:
                result = await conn.fetchval(
                    "SELECT is_final FROM wrap.monthly_wraps WHERE user_id = $1 AND period = $2",
                    uuid.UUID(user_id), period,
                )
            return bool(result)
        w = self._wraps.get(self._make_key(user_id, period))
        return bool(w and w.get("is_final"))

    async def save_monthly_wrap(self, user_id: str, period: str, payload: Dict[str, Any]) -> None:
        await self.save_wrap(user_id, period, payload)

    async def delete_user_wraps(self, user_id: str) -> int:
        if self.db:
            async with self.db.connection() as conn:
                status = await conn.execute(
                    "DELETE FROM wrap.monthly_wraps WHERE user_id = $1", uuid.UUID(user_id)
                )
            return int(status.split()[-1])
        keys_to_del = [k for k in self._wraps.keys() if k.startswith(f"{user_id}:")]
        for k in keys_to_del:
            self._wraps.pop(k, None)
        return len(keys_to_del)
