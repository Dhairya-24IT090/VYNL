import json
import uuid
from typing import Any, Dict, Optional

class WrapRepository:
    def __init__(self):
        self._wraps: Dict[str, Dict[str, Any]] = {} # (user_id, period) -> payload

    def _make_key(self, user_id: str, period: str) -> str:
        return f"{user_id}:{period}"

    async def get_wrap(self, user_id: str, period: str) -> Optional[Dict[str, Any]]:
        return self._wraps.get(self._make_key(user_id, period))

    async def save_wrap(self, user_id: str, period: str, payload: Dict[str, Any]) -> None:
        self._wraps[self._make_key(user_id, period)] = payload

    async def has_final_wrap(self, user_id: str, period: str) -> bool:
        w = self._wraps.get(self._make_key(user_id, period))
        return bool(w and w.get("is_final"))

    async def delete_user_wraps(self, user_id: str) -> int:
        keys_to_del = [k for k in self._wraps.keys() if k.startswith(f"{user_id}:")]
        for k in keys_to_del:
            self._wraps.pop(k, None)
        return len(keys_to_del)
