import json
import logging
import re
import sys
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional
from urllib.parse import urlparse

# Patterns for sensitive data redaction
REDACTION_PATTERNS = [
    (re.compile(r"(Bearer\s+)[A-Za-z0-9_\-\.]+", re.IGNORECASE), r"\1[REDACTED]"),
    (re.compile(r"(vynl_session=)[^;\s\"']+", re.IGNORECASE), r"\1[REDACTED]"),
    (re.compile(r"(csrf_token=)[^;\s\"']+", re.IGNORECASE), r"\1[REDACTED]"),
    (re.compile(r"(api[_-]?key[\"']?\s*[:=]\s*[\"']?)[A-Za-z0-9_\-\.]+", re.IGNORECASE), r"\1[REDACTED]"),
    (re.compile(r"(file_id[\"']?\s*[:=]\s*[\"']?)[A-Za-z0-9_\-\.]+", re.IGNORECASE), r"\1[REDACTED]"),
    (re.compile(r"(storage_ref[\"']?\s*[:=]\s*[\"']?)[A-Za-z0-9_\-\.]+", re.IGNORECASE), r"\1[REDACTED]"),
    (re.compile(r"(telegram:[A-Za-z0-9_\-\.]+)", re.IGNORECASE), r"[REDACTED_TELEGRAM]"),
    (re.compile(r"(canary_[a-zA-Z0-9_\-]+)", re.IGNORECASE), r"[REDACTED_CANARY]"),
    (re.compile(r"(token=)[^&\s\"']+", re.IGNORECASE), r"\1[REDACTED]"),
    (re.compile(r"(sig=)[^&\s\"']+", re.IGNORECASE), r"\1[REDACTED]"),
    (re.compile(r"(signature=)[^&\s\"']+", re.IGNORECASE), r"\1[REDACTED]"),
]

def sanitize_url(url: str) -> str:
    """Strips query parameters and fragments from URLs to avoid leaking signed params."""
    try:
        parsed = urlparse(url)
        if parsed.scheme and parsed.netloc:
            return f"{parsed.scheme}://{parsed.netloc}{parsed.path}"
        return url
    except Exception:
        return "[INVALID_URL]"

def redact_text(text: str, custom_canaries: Optional[List[str]] = None) -> str:
    if not isinstance(text, str):
        text = str(text)

    # Sanitize known URLs with query strings
    if "http://" in text or "https://" in text:
        text = re.sub(
            r"https?://[^\s\"']+",
            lambda m: sanitize_url(m.group(0)),
            text,
        )

    for pattern, replacement in REDACTION_PATTERNS:
        text = pattern.sub(replacement, text)

    if custom_canaries:
        for canary in custom_canaries:
            if canary and canary in text:
                text = text.replace(canary, "[REDACTED_CANARY]")

    return text

class JsonFormatter(logging.Formatter):
    def __init__(self, custom_canaries: Optional[List[str]] = None):
        super().__init__()
        self.custom_canaries = custom_canaries or []

    def format(self, record: logging.LogRecord) -> str:
        ts = datetime.now(timezone.utc).isoformat()
        log_entry: Dict[str, Any] = {
            "ts": ts,
            "level": record.levelname,
            "message": redact_text(record.getMessage(), self.custom_canaries),
            "request_id": getattr(record, "request_id", None),
            "trace_id": getattr(record, "trace_id", None),
            "user_id": getattr(record, "user_id", None),
            "route": getattr(record, "route", None),
            "status": getattr(record, "status", None),
            "latency_ms": getattr(record, "latency_ms", None),
            "error_code": getattr(record, "error_code", None),
        }

        # Include extra attributes if passed
        if hasattr(record, "extra") and isinstance(record.extra, dict):
            for k, v in record.extra.items():
                if k not in log_entry:
                    log_entry[k] = redact_text(str(v), self.custom_canaries)

        raw_json = json.dumps(log_entry, default=str)
        return redact_text(raw_json, self.custom_canaries)

def setup_logger(name: str = "vynl", level: int = logging.INFO, custom_canaries: Optional[List[str]] = None) -> logging.Logger:
    logger = logging.getLogger(name)
    logger.setLevel(level)
    logger.propagate = False

    # Remove existing handlers
    while logger.handlers:
        logger.removeHandler(logger.handlers[0])

    handler = logging.StreamHandler(sys.stdout)
    handler.setFormatter(JsonFormatter(custom_canaries))
    logger.addHandler(handler)
    return logger
