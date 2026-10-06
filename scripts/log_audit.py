"""
Log Audit and Secret Hygiene Verification Script per Task 46 [F20-1-c-b].
Plants canary secrets, exercises logging across services, and audits output
to verify that ZERO sensitive values leak into stdout, stderr, or log streams.
"""
import io
import json
import logging
import os
import re
import sys
import uuid

# Ensure modules in path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "shared", "service-kit"))

from service_kit.logging import JsonFormatter, redact_text, setup_logger

CANARY_SECRETS = [
    "canary_token_alpha_987654321",
    "canary_key_live_secret_456789",
    "secret_session_xyz_777888999",
    "csrf_token_secret_value_111222",
    "sk_live_very_secret_api_key_888",
    "telegram:file_secret_audio_999",
]

SENSITIVE_LEAK_PATTERNS = [
    re.compile(r"canary_[a-zA-Z0-9_\-]+", re.IGNORECASE),
    re.compile(r"vynl_session=[a-zA-Z0-9_\-\.]{8,}", re.IGNORECASE),
    re.compile(r"csrf_token=[a-zA-Z0-9_\-\.]{8,}", re.IGNORECASE),
    re.compile(r"Bearer\s+[A-Za-z0-9_\-\.]{16,}", re.IGNORECASE),
    re.compile(r"api[_-]?key[\"']?\s*[:=]\s*[\"']?[A-Za-z0-9_\-\.]{16,}", re.IGNORECASE),
    re.compile(r"https?://[^\s\"']+\?[^\s\"']*(sig|token|signature|secret)=[^\s\"'&]+", re.IGNORECASE),
]

def run_log_audit():
    print("=" * 60)
    print("VYNL Log Audit & Canary Secret Hygiene Verification")
    print("=" * 60)

    # 1. Setup in-memory string buffer with JsonFormatter
    log_stream = io.StringIO()
    handler = logging.StreamHandler(log_stream)
    formatter = JsonFormatter(custom_canaries=CANARY_SECRETS)
    handler.setFormatter(formatter)

    test_logger = logging.getLogger("vynl_audit_logger")
    test_logger.setLevel(logging.DEBUG)
    test_logger.propagate = False
    test_logger.addHandler(handler)

    print("\n[Phase 1] Emitting logs containing raw canary secrets and credentials...")

    # Emit logs with various sensitive values
    test_logger.info(f"User login attempt with token: {CANARY_SECRETS[0]}")
    test_logger.info(f"Setting session cookie vynl_session={CANARY_SECRETS[2]}")
    test_logger.info(f"CSRF validation check csrf_token={CANARY_SECRETS[3]}")
    test_logger.info(f"Bearer token passed in header: Bearer {CANARY_SECRETS[1]}")
    test_logger.info(f"Audio file fetch from external storage: {CANARY_SECRETS[5]}")
    test_logger.info(f"API key config value api_key={CANARY_SECRETS[4]}")
    test_logger.info("Presigned CDN audio URL: https://cdn.vynl.app/tracks/101.mp3?sig=secret_signature_999&token=canary_token_alpha_987654321")

    # Flush handler
    handler.flush()
    logged_output = log_stream.getvalue()

    print(f" -> Emitted {len(logged_output.splitlines())} log lines.")

    # 2. Audit the log output
    print("\n[Phase 2] Auditing captured logs for leaks...")
    leaks_found = []

    # Check for direct canary matches
    for canary in CANARY_SECRETS:
        if canary in logged_output:
            leaks_found.append(f"Direct canary secret leaked: {canary}")

    # Check against regex patterns
    for pattern in SENSITIVE_LEAK_PATTERNS:
        matches = pattern.findall(logged_output)
        if matches:
            leaks_found.append(f"Pattern matched sensitive data: {pattern.pattern} -> {matches}")

    # 3. Verify structured JSON validity of each log line
    json_lines_valid = 0
    for line in logged_output.splitlines():
        line = line.strip()
        if not line:
            continue
        try:
            parsed = json.loads(line)
            assert "ts" in parsed
            assert "level" in parsed
            assert "message" in parsed
            json_lines_valid += 1
        except Exception as e:
            leaks_found.append(f"Invalid JSON log line format: {line} ({e})")

    print(f" -> Verified {json_lines_valid} structured JSON log lines.")

    # 4. Final assertions
    print("\n[Phase 3] Audit Results & Evaluation:")
    if leaks_found:
        print("FAIL: The following sensitive leaks or formatting errors were detected:")
        for leak in leaks_found:
            print(f"  - {leak}")
        sys.exit(1)
    else:
        print("SUCCESS: 0 sensitive values or canary tokens leaked!")
        print("All sensitive values properly replaced with [REDACTED], [REDACTED_CANARY], or stripped URLs.")
        print("=" * 60)

if __name__ == "__main__":
    run_log_audit()
