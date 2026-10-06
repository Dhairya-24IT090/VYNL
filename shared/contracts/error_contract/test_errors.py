"""
Shared error contract test suite per Rev2 Appendix B.
Can be executed against any VYNL service by specifying SERVICE_BASE_URL.
"""
import pytest
import httpx
import re

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

@pytest.mark.asyncio
async def test_error_contract_validation_error(service_base_url: str):
    async with httpx.AsyncClient(base_url=service_base_url) as client:
        # Send malformed JSON or illegal payload to a POST endpoint
        resp = await client.post(
            "/v1/playlists",
            content=b"not-json",
            headers={"Content-Type": "application/json"},
        )
        assert resp.status_code in (400, 422), f"Expected 400 or 422, got {resp.status_code}"
        assert "X-Request-ID" in resp.headers
        validate_error_body(resp.json())

@pytest.mark.asyncio
async def test_error_contract_unauthorized(service_base_url: str):
    async with httpx.AsyncClient(base_url=service_base_url) as client:
        # Access protected endpoint with no session
        resp = await client.get("/v1/playlists")
        assert resp.status_code == 401, f"Expected 401, got {resp.status_code}"
        assert "X-Request-ID" in resp.headers
        validate_error_body(resp.json())

@pytest.mark.asyncio
async def test_error_contract_hidden_resource(service_base_url: str):
    async with httpx.AsyncClient(base_url=service_base_url) as client:
        # Non-existent ID returns 404 with standard error body
        resp = await client.get("/v1/playlists/00000000-0000-0000-0000-000000000099")
        assert resp.status_code == 404, f"Expected 404, got {resp.status_code}"
        assert "X-Request-ID" in resp.headers
        validate_error_body(resp.json())
