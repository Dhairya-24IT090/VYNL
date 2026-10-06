import hashlib
import hmac
import time
from abc import ABC, abstractmethod
from datetime import datetime, timezone
from typing import Dict, Optional, Tuple
from service_kit.context import Actor

class SessionVerifier(ABC):
    @abstractmethod
    async def verify_session(self, token: str) -> Optional[Tuple[str, Dict]]:
        """
        Verifies opaque session token.
        Returns (user_id, session_data) or None if invalid/expired/revoked.
        """
        pass

class InMemorySessionVerifier(SessionVerifier):
    def __init__(self):
        self._sessions: Dict[str, Dict] = {}  # sha256 -> session_dict

    def add_session(
        self,
        token: str,
        user_id: str,
        created_at: Optional[float] = None,
        last_active: Optional[float] = None,
        revoked: bool = False,
    ):
        token_hash = hashlib.sha256(token.encode("utf-8")).hexdigest()
        now = time.time()
        self._sessions[token_hash] = {
            "user_id": user_id,
            "created_at": created_at or now,
            "last_active": last_active or now,
            "revoked": revoked,
        }

    async def verify_session(self, token: str) -> Optional[Tuple[str, Dict]]:
        token_hash = hashlib.sha256(token.encode("utf-8")).hexdigest()
        session = self._sessions.get(token_hash)
        if not session or session.get("revoked"):
            return None

        now = time.time()
        # 14 days absolute expiry = 14 * 86400 = 1209600 s
        if now - session["created_at"] > 1209600:
            return None

        # 30 minutes inactivity = 1800 s
        if now - session["last_active"] > 1800:
            return None

        # Update last_active
        session["last_active"] = now
        return (session["user_id"], session)

class RedisPostgresSessionVerifier(SessionVerifier):
    def __init__(self, redis_client=None, pg_pool=None):
        self.redis = redis_client
        self.pool = pg_pool

    async def verify_session(self, token: str) -> Optional[Tuple[str, Dict]]:
        token_hash = hashlib.sha256(token.encode("utf-8")).hexdigest()
        
        # 1. Try Redis cache
        if self.redis:
            try:
                cached = await self.redis.get(f"session:{token_hash}")
                if cached:
                    import json
                    data = json.loads(cached)
                    now = time.time()
                    if now - data["last_active"] > 1800 or now - data["created_at"] > 1209600:
                        return None
                    data["last_active"] = now
                    await self.redis.set(f"session:{token_hash}", json.dumps(data), ex=1800)
                    return (data["user_id"], data)
            except Exception:
                pass

        # 2. Try Postgres if pool available
        if self.pool:
            try:
                async with self.pool.acquire() as conn:
                    row = await conn.fetchrow(
                        "SELECT user_id, created_at, last_active, revoked_at FROM auth_sessions WHERE token_hash = $1",
                        token_hash,
                    )
                    if not row or row["revoked_at"] is not None:
                        return None
                    now = datetime.now(timezone.utc)
                    created_at = row["created_at"]
                    last_active = row["last_active"]
                    if (now - created_at).total_seconds() > 1209600:
                        return None
                    if (now - last_active).total_seconds() > 1800:
                        return None

                    await conn.execute(
                        "UPDATE auth_sessions SET last_active = now() WHERE token_hash = $1",
                        token_hash,
                    )
                    session_data = {"user_id": str(row["user_id"]), "created_at": created_at.timestamp(), "last_active": now.timestamp()}
                    if self.redis:
                        import json
                        await self.redis.set(f"session:{token_hash}", json.dumps(session_data), ex=1800)
                    return (str(row["user_id"]), session_data)
            except Exception:
                pass

        return None

def verify_internal_auth(
    secret: str,
    method: str,
    path: str,
    timestamp_str: str,
    request_id: str,
    received_signature: str,
    max_skew_seconds: int = 60,
) -> bool:
    """Verifies HMAC X-Internal-Auth with timestamp skew defense."""
    try:
        req_ts = float(timestamp_str)
        now = time.time()
        if abs(now - req_ts) > max_skew_seconds:
            return False

        message = f"{method.upper()}\n{path}\n{timestamp_str}\n{request_id}".encode("utf-8")
        expected_sig = hmac.new(secret.encode("utf-8"), message, hashlib.sha256).hexdigest()
        return hmac.compare_digest(expected_sig, received_signature)
    except Exception:
        return False

def sign_internal_auth(secret: str, method: str, path: str, request_id: str, ts: Optional[float] = None) -> Tuple[str, str]:
    """Generates (timestamp_str, signature) for internal service requests."""
    t = str(ts or time.time())
    message = f"{method.upper()}\n{path}\n{t}\n{request_id}".encode("utf-8")
    sig = hmac.new(secret.encode("utf-8"), message, hashlib.sha256).hexdigest()
    return (t, sig)
