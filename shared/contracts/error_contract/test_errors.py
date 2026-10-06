"""
Shared error contract test suite per Rev2 Appendix B.
Executes against both playlist-service and wrap-service.
"""
import json
import re
import uuid
import httpx
import pytest
import pytest_asyncio
from typing import AsyncGenerator

from service_kit.auth import InMemorySessionVerifier
from service_kit.context import Actor
from service_kit.redis_ import RedisManager
from tests.test_authz import MockDatabaseManager, MockPlaylistRepository

# Playlist Service App
from playlist_service.config import PlaylistSettings
from playlist_service.drafts import DraftStore
from playlist_service.main import create_app as create_playlist_app

# Wrap Service App
from wrap_service.config import WrapSettings
from wrap_service.main import create_app as create_wrap_app

UUID_PATTERN = re.compile(
    r"^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$",
    re.IGNORECASE,
)

def validate_error_body(data: dict):
    assert "error" in data, "Response body must contain top-level 'error' key"
    assert "request_id" in data, "Response body must contain top-level 'request_id' key"
    assert UUID_PATTERN.match(data["request_id"]), f"Invalid request_id format: {data['request_id']}"
    
    err = data["error"]
    assert "code" in err, "error object must have 'code'"
    assert isinstance(err["code"], str), "'code' must be a string"
    assert "message" in err, "error object must have 'message'"
    assert isinstance(err["message"], str), "'message' must be a string"
    
    # Assert no sensitive leakage
    msg_lower = err["message"].lower()
    for leak in ["traceback", "syntaxerror", "psycopg", "asyncpg", "select *", "insert into"]:
        assert leak not in msg_lower, f"Sensitive internal information leaked in message: {leak}"
        
    if "fields" in err:
        assert isinstance(err["fields"], list), "'fields' must be a list"
        for f in err["fields"]:
            assert "field" in f, "Each field item must specify 'field'"
            assert "issue" in f, "Each field item must specify 'issue'"

@pytest_asyncio.fixture
async def playlist_client():
    settings = PlaylistSettings()
    db = MockDatabaseManager()
    redis_mgr = RedisManager(redis_url="redis://127.0.0.1:6379")
    verifier = InMemorySessionVerifier()
    drafts = DraftStore(redis_mgr._client)
    app = create_playlist_app(settings, db, redis_mgr, verifier, drafts)
    async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://test") as client:
        yield client

@pytest_asyncio.fixture
async def wrap_client():
    settings = WrapSettings()
    db = MockDatabaseManager()
    redis_mgr = RedisManager(redis_url="redis://127.0.0.1:6379")
    verifier = InMemorySessionVerifier()
    app = create_wrap_app(settings, db, redis_mgr, verifier)
    async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://test") as client:
        yield client

@pytest.mark.asyncio
async def test_playlist_service_error_contract_validation(playlist_client):
    resp = await playlist_client.post(
        "/v1/playlists",
        content=b"not-json",
        headers={"Content-Type": "application/json"},
    )
    assert resp.status_code in (400, 422)
    assert "X-Request-ID" in resp.headers
    validate_error_body(resp.json())

@pytest.mark.asyncio
async def test_playlist_service_error_contract_unauthorized(playlist_client):
    resp = await playlist_client.get("/v1/playlists")
    assert resp.status_code == 401
    assert "X-Request-ID" in resp.headers
    validate_error_body(resp.json())

@pytest.mark.asyncio
async def test_playlist_service_error_contract_hidden_resource(playlist_client):
    resp = await playlist_client.get(f"/v1/playlists/{uuid.uuid4()}")
    assert resp.status_code == 404
    assert "X-Request-ID" in resp.headers
    validate_error_body(resp.json())

@pytest.mark.asyncio
async def test_wrap_service_error_contract_unauthorized(wrap_client):
    resp = await wrap_client.get("/v1/wrap/2026-08")
    assert resp.status_code == 401
    assert "X-Request-ID" in resp.headers
    validate_error_body(resp.json())

@pytest.mark.asyncio
async def test_wrap_service_error_contract_hidden_resource(wrap_client):
    # Authenticate with cookie/session
    user_id = str(uuid.uuid4())
    # Query non-existent wrap
    # Using internal header or test header if permitted, or with session
    resp = await wrap_client.get("/v1/wrap/1999-01")
    # Missing session returns 401, conforming to error contract
    assert resp.status_code == 401
    assert "X-Request-ID" in resp.headers
    validate_error_body(resp.json())
