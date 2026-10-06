import base64
import hashlib
import hmac
import json
import time
import uuid
from typing import Any, Dict, List, Optional, Tuple
from service_kit.errors import GoneError, NotFoundError, ConflictError

class InviteManager:
    def __init__(self, signing_keys: List[str], default_ttl_seconds: int = 86400):
        if not signing_keys:
            raise ValueError("At least one signing key is required")
        self.signing_keys = signing_keys
        self.default_ttl_seconds = default_ttl_seconds

    def generate_token(self, invite_id: str, playlist_id: str, role: str, expires_at: float) -> str:
        """
        Creates an HMAC-signed token using the primary (first) signing key.
        Token format: base64(payload).signature
        """
        payload = {
            "iid": invite_id,
            "pid": playlist_id,
            "role": role,
            "exp": expires_at,
        }
        raw_payload = json.dumps(payload, separators=(",", ":")).encode("utf-8")
        b64_payload = base64.urlsafe_b64encode(raw_payload).decode("utf-8")

        # Sign using primary key
        primary_key = self.signing_keys[0].encode("utf-8")
        sig = hmac.new(primary_key, b64_payload.encode("utf-8"), hashlib.sha256).hexdigest()
        return f"{b64_payload}.{sig}"

    def verify_token(self, token: str, now: Optional[float] = None) -> Dict[str, Any]:
        """
        Verifies token against all rotating keys in self.signing_keys.
        Throws NotFoundError on forged/malformed token (anti-oracle), GoneError on expired.
        """
        parts = token.split(".")
        if len(parts) != 2:
            raise NotFoundError("Invite not found")

        b64_payload, signature = parts
        try:
            raw_payload = base64.urlsafe_b64decode(b64_payload.encode("utf-8"))
            payload = json.loads(raw_payload)
        except Exception:
            raise NotFoundError("Invite not found")

        # Verify signature with any key in the rotation list
        sig_bytes = signature.encode("utf-8")
        valid_sig = False
        for key in self.signing_keys:
            expected_sig = hmac.new(key.encode("utf-8"), b64_payload.encode("utf-8"), hashlib.sha256).hexdigest()
            if hmac.compare_digest(expected_sig, signature):
                valid_sig = True
                break

        if not valid_sig:
            raise NotFoundError("Invite not found")

        # Check expiration timestamp in payload
        current_time = now if now is not None else time.time()
        if payload.get("exp", 0) <= current_time:
            # Expired -> 410 Gone (same body as used/revoked, anti-oracle)
            raise GoneError("Invite is no longer available")

        return payload
