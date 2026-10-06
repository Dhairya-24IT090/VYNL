import uuid
import pytest
from fastapi import FastAPI, Request
from fastapi.testclient import TestClient

from service_kit.context import Actor, RequestContext
from service_kit.errors import AppException, create_error_response
from wrap_service.aggregation import WrapAggregator
from wrap_service.caching import WrapCache
from wrap_service.repository import WrapRepository
from wrap_service.routes.wrap import create_wrap_router
from wrap_service.service import WrapService

@pytest.fixture
def api_setup():
    repo = WrapRepository()
    cache = WrapCache()
    aggregator = WrapAggregator()
    service = WrapService(repo=repo, cache=cache, aggregator=aggregator)

    app = FastAPI()

    @app.exception_handler(AppException)
    async def handle_app_exception(request: Request, exc: AppException):
        ctx = getattr(request.state, "context", None)
        req_id = ctx.request_id if ctx else str(uuid.uuid4())
        return create_error_response(
            status_code=exc.status_code,
            code=exc.code,
            message=exc.message,
            request_id=req_id,
            fields=exc.fields,
            headers=exc.headers,
        )

    # Middleware to inject context from headers
    @app.middleware("http")
    async def fake_auth_middleware(request: Request, call_next):
        user_id = request.headers.get("X-Test-User-Id")
        is_internal = request.headers.get("X-Test-Internal") == "1"
        actor = Actor(user_id=user_id, is_internal=is_internal) if (user_id or is_internal) else None
        req_id = str(uuid.uuid4())
        request.state.context = RequestContext(
            request_id=req_id,
            trace_id=str(uuid.uuid4()),
            actor=actor,
        )
        return await call_next(request)

    app.include_router(create_wrap_router(service))
    client = TestClient(app)

    return {
        "repo": repo,
        "cache": cache,
        "service": service,
        "client": client,
    }

@pytest.mark.asyncio
async def test_get_wrap_success_and_not_found(api_setup):
    client = api_setup["client"]
    repo = api_setup["repo"]
    user_id = str(uuid.uuid4())

    # Pre-populate wrap for user
    await repo.save_wrap(
        user_id=user_id,
        period="2026-08",
        payload={
            "user_id": user_id,
            "period": "2026-08",
            "is_final": True,
            "empty": False,
            "summary": {"total_counted_plays": 50},
        },
    )

    # 1. Successful fetch of existing wrap
    res = client.get("/v1/wrap/2026-08", headers={"X-Test-User-Id": user_id})
    assert res.status_code == 200
    data = res.json()
    assert data["period"] == "2026-08"
    assert data["summary"]["total_counted_plays"] == 50

    # 2. Non-existent period -> 404
    res_404 = client.get("/v1/wrap/2025-01", headers={"X-Test-User-Id": user_id})
    assert res_404.status_code == 404
    assert res_404.json()["error"]["code"] == "not_found"

@pytest.mark.asyncio
async def test_get_wrap_authz_enforcement(api_setup):
    """
    AUTHZ matrix: Self=200, Other=403, Unauth=401.
    """
    client = api_setup["client"]
    repo = api_setup["repo"]
    owner_id = str(uuid.uuid4())
    stranger_id = str(uuid.uuid4())

    await repo.save_wrap(owner_id, "2026-08", {"user_id": owner_id, "period": "2026-08"})

    # 1. Unauthenticated -> 401
    res_unauth = client.get("/v1/wrap/2026-08")
    assert res_unauth.status_code == 401

    # 2. Stranger targeting owner -> 403
    res_forbidden = client.get(
        f"/v1/wrap/2026-08?user_id={owner_id}",
        headers={"X-Test-User-Id": stranger_id},
    )
    assert res_forbidden.status_code == 403
    assert res_forbidden.json()["error"]["code"] == "forbidden"

@pytest.mark.asyncio
async def test_refresh_rate_limit_returns_429_and_retry_after(api_setup):
    """
    Task 35 Done when: Refresh limit returns 429 + Retry-After header.
    """
    client = api_setup["client"]
    user_id = str(uuid.uuid4())

    # 1. First refresh request succeeds -> 202 Accepted
    res1 = client.post(
        "/v1/wrap/current/refresh",
        headers={"X-Test-User-Id": user_id},
    )
    assert res1.status_code == 202
    assert "Location" in res1.headers
    assert res1.json()["period"] is not None

    # 2. Immediate second refresh request triggers rate limit -> 429 Too Many Requests
    res2 = client.post(
        "/v1/wrap/current/refresh",
        headers={"X-Test-User-Id": user_id},
    )
    assert res2.status_code == 429
    assert "Retry-After" in res2.headers
    retry_after = int(res2.headers["Retry-After"])
    assert 0 < retry_after <= 60
    assert res2.json()["error"]["code"] == "rate_limited"
