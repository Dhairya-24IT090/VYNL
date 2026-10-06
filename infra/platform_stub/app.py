"""Dev/test implementation of the documented auth, activity, and deletion contracts."""
import hashlib
import json
import os
import secrets
import uuid
from urllib.parse import urlparse

import asyncpg
import httpx
from fastapi import FastAPI, HTTPException, Request, Response
from fastapi.responses import RedirectResponse

DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://postgres:postgres@postgres:5432/vynl")
INTERNAL_AUTH_SECRET = os.getenv("INTERNAL_AUTH_SECRET", "dev-internal-auth-secret-key-32charsmin")
PLAYLIST_URL = os.getenv("PLAYLIST_URL", "http://playlist-service:8000")
WRAP_URL = os.getenv("WRAP_URL", "http://wrap-service:8000")
app = FastAPI(title="VYNL platform dev/test stub")


async def db():
    return await asyncpg.connect(DATABASE_URL)


async def current_user(request: Request):
    token = request.cookies.get("vynl_session")
    if not token:
        raise HTTPException(401, "Authentication required")
    conn = await db()
    try:
        row = await conn.fetchrow(
            "SELECT user_id FROM auth_sessions WHERE token_hash=$1 AND revoked_at IS NULL AND expires_at>now()",
            hashlib.sha256(token.encode()).hexdigest(),
        )
    finally:
        await conn.close()
    if not row:
        raise HTTPException(401, "Authentication required")
    return str(row["user_id"])


@app.get("/healthz")
async def healthz():
    return {"status": "ok"}


@app.get("/readyz")
async def readyz(response: Response):
    try:
        conn = await db()
        await conn.fetchval("SELECT 1")
        await conn.close()
        return {"status": "ready"}
    except Exception:
        response.status_code = 503
        return {"status": "unready"}


@app.get("/v1/auth/me")
async def auth_me(request: Request):
    user_id = await current_user(request)
    conn = await db()
    try:
        user = await conn.fetchrow("SELECT display_name, avatar_url FROM users WHERE id=$1", uuid.UUID(user_id))
    finally:
        await conn.close()
    if not user:
        raise HTTPException(401, "Authentication required")
    return {"user_id": user_id, "display_name": user["display_name"], "avatar_url": user["avatar_url"]}


@app.get("/v1/auth/google/start")
async def auth_google_start(return_to: str = "/"):
    parsed = urlparse(return_to)
    if not return_to.startswith("/") or return_to.startswith("//") or parsed.scheme or parsed.netloc:
        return_to = "/"
    user_id = os.getenv("STUB_USER_ID", "00000000-0000-4000-8000-000000000001")
    token = secrets.token_urlsafe(32)
    conn = await db()
    try:
        await conn.execute(
            "INSERT INTO users (id, display_name, email) VALUES ($1,$2,$3) ON CONFLICT (id) DO NOTHING",
            uuid.UUID(user_id), "VYNL Test User", "vynl-test@example.invalid",
        )
        await conn.execute(
            "INSERT INTO auth_sessions(token_hash,user_id,created_at,last_active,expires_at) VALUES($1,$2,now(),now(),now()+interval '14 days')",
            hashlib.sha256(token.encode()).hexdigest(), uuid.UUID(user_id),
        )
    finally:
        await conn.close()
    response = RedirectResponse(return_to, status_code=302)
    response.set_cookie("vynl_session", token, httponly=True, secure=True, samesite="lax", path="/", max_age=1209600)
    response.set_cookie("csrf_token", secrets.token_urlsafe(24), httponly=False, secure=True, samesite="lax", path="/", max_age=1209600)
    return response


@app.post("/v1/auth/logout")
async def auth_logout(request: Request, response: Response):
    token = request.cookies.get("vynl_session")
    if token:
        conn = await db()
        try:
            await conn.execute("UPDATE auth_sessions SET revoked_at=now() WHERE token_hash=$1", hashlib.sha256(token.encode()).hexdigest())
        finally:
            await conn.close()
    response.delete_cookie("vynl_session", path="/", secure=True, httponly=True, samesite="lax")
    response.delete_cookie("csrf_token", path="/", secure=True, samesite="lax")
    return {"status": "ok"}


@app.post("/v1/activity/batch")
async def activity_batch(request: Request):
    user_id = await current_user(request)
    body = await request.json()
    events = body.get("events", [])
    if len(events) > 100:
        raise HTTPException(413, "Maximum activity batch is 100 events")
    conn = await db()
    try:
        async with conn.transaction():
            for event in events:
                await conn.execute(
                    "INSERT INTO activity_events(event_id,user_id,event_type,payload) VALUES($1,$2,$3,$4::jsonb) ON CONFLICT(event_id) DO NOTHING",
                    uuid.UUID(event["event_id"]), uuid.UUID(user_id), event["type"], json.dumps(event),
                )
    finally:
        await conn.close()
    return {"accepted": len(events)}


def internal_headers(method: str, path: str):
    import hmac
    import time
    request_id = str(uuid.uuid4())
    timestamp = str(time.time())
    message = f"{method.upper()}\n{path}\n{timestamp}\n{request_id}".encode()
    signature = hmac.new(INTERNAL_AUTH_SECRET.encode(), message, hashlib.sha256).hexdigest()
    return {"X-Internal-Auth": signature, "X-Internal-Timestamp": timestamp, "X-Request-ID": request_id}


@app.delete("/v1/users/me")
async def delete_account(request: Request):
    user_id = await current_user(request)
    async with httpx.AsyncClient(timeout=20) as client:
        for base_url in (PLAYLIST_URL, WRAP_URL):
            path = f"/users/{user_id}/data"
            response = await client.delete(base_url + path, headers=internal_headers("DELETE", path))
            if response.status_code >= 400:
                raise HTTPException(503, "Account deletion is temporarily unavailable")
    conn = await db()
    try:
        async with conn.transaction():
            await conn.execute("DELETE FROM activity_events WHERE user_id=$1", uuid.UUID(user_id))
            await conn.execute("DELETE FROM auth_sessions WHERE user_id=$1", uuid.UUID(user_id))
            await conn.execute("DELETE FROM users WHERE id=$1", uuid.UUID(user_id))
    finally:
        await conn.close()
    return {"status": "deleted"}
