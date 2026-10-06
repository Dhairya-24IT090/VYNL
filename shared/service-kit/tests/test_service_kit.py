import asyncio
import io
import json
import logging
import pytest
import time
from service_kit.config import BaseServiceSettings, validate_or_exit
from service_kit.logging import setup_logger, redact_text
from service_kit.errors import (
    AppException,
    ValidationError,
    UnauthorizedError,
    ForbiddenError,
    NotFoundError,
    PreconditionFailedError,
    PreconditionRequiredError,
    RateLimitedError,
    DependencyUnavailableError,
    create_error_response,
)
from service_kit.context import Actor, RequestContext
from service_kit.auth import (
    InMemorySessionVerifier,
    verify_internal_auth,
    sign_internal_auth,
)
from service_kit.resilience import CircuitBreaker, CircuitState, retry_with_backoff
from service_kit.lifecycle import GracefulShutdownManager
from service_kit.testing import ActorFactory, FakeClock, CanaryFixture

# 1. Config Validation Test
def test_config_validation(monkeypatch):
    class TestSettings(BaseServiceSettings):
        REQUIRED_VAR: str

    monkeypatch.delenv("REQUIRED_VAR", raising=False)
    with pytest.raises(SystemExit) as exc_info:
        validate_or_exit(TestSettings)
    assert exc_info.value.code == 1

def test_production_config_tls_enforcement(monkeypatch):
    class ProdSettings(BaseServiceSettings):
        ENV: str = "production"
        DATABASE_URL: str = "postgresql://localhost/vynl"  # Missing sslmode=require
        REDIS_URL: str = "redis://localhost:6379"  # Missing rediss://

    with pytest.raises(SystemExit) as exc_info:
        validate_or_exit(ProdSettings)
    assert exc_info.value.code == 1

# 2. Logging & Secret Redaction (Task F20-1-c-b)
def test_redact_sensitive_values():
    canaries = CanaryFixture.generate_canaries()
    raw_log = (
        f"User logged in with {canaries['session_token']}. "
        f"API key is api_key={canaries['api_key']}. "
        f"Presigned URL is {canaries['presigned_url']}. "
        f"File id is file_id={canaries['file_id']}."
    )
    redacted = redact_text(raw_log, list(canaries.values()))
    assert canaries["session_token"] not in redacted
    assert canaries["api_key"] not in redacted
    assert "token=canary_token" not in redacted
    assert canaries["file_id"] not in redacted

# 3. Error Mapping Test (Task F19-6-c-b)
def test_error_response_formatting():
    resp = create_error_response(
        status_code=422,
        code="validation_error",
        message="Invalid input provided",
        request_id="00000000-0000-0000-0000-000000000001",
        fields=[{"field": "title", "issue": "Field is required"}],
    )
    assert resp.status_code == 422
    assert resp.headers["X-Request-ID"] == "00000000-0000-0000-0000-000000000001"
    data = json.loads(resp.body.decode("utf-8"))
    assert data["error"]["code"] == "validation_error"
    assert data["error"]["fields"][0]["field"] == "title"

# 4. Auth & Internal HMAC Test (Task F20-2-c-b)
@pytest.mark.asyncio
async def test_session_verifier_inactivity_and_revocation():
    verifier = InMemorySessionVerifier()
    token = "opaque-session-token-12345"
    verifier.add_session(token=token, user_id="user-1")

    # Success
    res = await verifier.verify_session(token)
    assert res is not None
    assert res[0] == "user-1"

    # Revoked session
    verifier.add_session(token="revoked-token", user_id="user-2", revoked=True)
    res_revoked = await verifier.verify_session("revoked-token")
    assert res_revoked is None

def test_internal_hmac_signing_and_skew():
    secret = "secret-key-for-internal-testing-32chars"
    ts, sig = sign_internal_auth(secret, "DELETE", "/users/123/data", "req-1")
    assert verify_internal_auth(secret, "DELETE", "/users/123/data", ts, "req-1", sig) is True

    # Reject tampered path
    assert verify_internal_auth(secret, "DELETE", "/users/wrong/data", ts, "req-1", sig) is False

    # Reject expired timestamp (>60s)
    old_ts = str(time.time() - 100)
    _, old_sig = sign_internal_auth(secret, "DELETE", "/users/123/data", "req-1", ts=float(old_ts))
    assert verify_internal_auth(secret, "DELETE", "/users/123/data", old_ts, "req-1", old_sig) is False

# 5. Circuit Breaker & Retry Test (Task F19-4-a-b)
@pytest.mark.asyncio
async def test_circuit_breaker_trip_and_half_open():
    breaker = CircuitBreaker("test-service", failure_threshold=3, probe_timeout_seconds=0.1)
    
    async def failing_call():
        raise RuntimeError("Service failure")

    for _ in range(3):
        try:
            await breaker.call(failing_call)
        except RuntimeError:
            pass

    assert breaker.state == CircuitState.OPEN
    with pytest.raises(DependencyUnavailableError):
        await breaker.call(failing_call)

    # Wait for probe timeout -> transitions to HALF_OPEN
    await asyncio.sleep(0.15)
    assert breaker.can_execute() is True
    assert breaker.state == CircuitState.HALF_OPEN

    # Success restores to CLOSED
    async def passing_call():
        return "success"

    res = await breaker.call(passing_call)
    assert res == "success"
    assert breaker.state == CircuitState.CLOSED

@pytest.mark.asyncio
async def test_retry_with_backoff():
    attempts = 0
    async def flaky_call():
        nonlocal attempts
        attempts += 1
        if attempts < 3:
            raise ValueError("Transient error")
        return "recovered"

    result = await retry_with_backoff(flaky_call, max_retries=4, base_delay=0.01)
    assert result == "recovered"
    assert attempts == 3

# 6. Graceful Shutdown Manager Test (Task P-5-c-b)
@pytest.mark.asyncio
async def test_graceful_shutdown():
    manager = GracefulShutdownManager(
        service_name="test-service",
        drain_timeout_seconds=1.0,
        readiness_delay_seconds=0.01,
    )
    ws_closed = False
    cleaned_up = False

    async def mock_ws_close():
        nonlocal ws_closed
        ws_closed = True

    async def mock_cleanup():
        nonlocal cleaned_up
        cleaned_up = True

    manager.register_ws_closer(mock_ws_close)
    manager.register_cleanup(mock_cleanup)

    await manager.initiate_shutdown()
    assert manager.is_draining is True
    assert ws_closed is True
    assert cleaned_up is True

# 7. Flow 0 Middleware Integration Test
@pytest.mark.asyncio
async def test_flow0_middleware_pipeline():
    from fastapi import FastAPI
    import httpx
    from service_kit.middleware import Flow0Middleware

    app = FastAPI()
    verifier = InMemorySessionVerifier()
    verifier.add_session("valid-token", "user-100")

    app.add_middleware(
        Flow0Middleware,
        service_name="test-service",
        session_verifier=verifier,
        max_body_bytes=100,  # small for testing
    )

    @app.get("/test-route")
    async def sample_get():
        return {"hello": "world"}

    @app.post("/test-post")
    async def sample_post():
        return {"created": True}

    @app.get("/panic")
    async def panic_route():
        raise RuntimeError("Something exploded")

    async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://test") as client:
        # Standard GET echoes X-Request-ID and traceparent
        resp = await client.get("/test-route", headers={"X-Request-ID": "test-req-123"})
        assert resp.status_code == 200
        assert resp.headers["X-Request-ID"] == "test-req-123"
        assert "traceparent" in resp.headers

        # Body cap rejection -> 413
        oversize_payload = "x" * 200
        resp_413 = await client.post("/test-post", content=oversize_payload, headers={"Content-Length": "200"})
        assert resp_413.status_code == 413
        data_413 = resp_413.json()
        assert data_413["error"]["code"] == "payload_too_large"

        # Panic recovery -> 500 without stack leakage
        resp_500 = await client.get("/panic")
        assert resp_500.status_code == 500
        data_500 = resp_500.json()
        assert data_500["error"]["code"] == "internal_error"
        assert "RuntimeError" not in data_500["error"]["message"]

