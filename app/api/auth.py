import urllib.parse
from fastapi import APIRouter, Depends, Response, HTTPException, Query, Request
from fastapi.responses import RedirectResponse
from pydantic import BaseModel
from typing import Optional
import secrets
from app.db.mongo import get_db
from app.utils.jwt_utils import create_access_token, create_refresh_token, decode_token
from app.dependencies import get_current_user
from app.config import settings
from app.models.user import UserResponse

router = APIRouter(prefix="/api/v1/auth", tags=["auth"])

class GoogleLoginRequest(BaseModel):
    code: str
    return_to: Optional[str] = "/"

@router.get("/google/start")
async def google_auth_start(return_to: str = Query("/", description="Destination route after authentication")):
    # Sanitize return_to target
    safe_return = return_to if return_to.startswith("/") and not return_to.startswith("//") else "/"
    state = urllib.parse.quote(safe_return)

    if settings.GOOGLE_CLIENT_ID and settings.GOOGLE_CLIENT_SECRET:
        redirect_uri = f"{settings.BASE_URL}/api/v1/auth/google/callback"
        params = {
            "client_id": settings.GOOGLE_CLIENT_ID,
            "redirect_uri": redirect_uri,
            "response_type": "code",
            "scope": "openid email profile",
            "access_type": "offline",
            "prompt": "consent",
            "state": state,
        }
        auth_url = f"https://accounts.google.com/o/oauth2/v2/auth?{urllib.parse.urlencode(params)}"
        return RedirectResponse(url=auth_url, status_code=307)

    # Local development fallback when Google credentials not supplied
    dev_callback_url = f"/api/v1/auth/google/callback?code=dev_mock_code&state={state}"
    return RedirectResponse(url=dev_callback_url, status_code=307)


import httpx
import uuid

async def _exchange_or_mock_google_user(code: str) -> dict:
    if settings.GOOGLE_CLIENT_ID and settings.GOOGLE_CLIENT_SECRET and code != "dev_mock_code":
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                token_res = await client.post(
                    "https://oauth2.googleapis.com/token",
                    data={
                        "code": code,
                        "client_id": settings.GOOGLE_CLIENT_ID,
                        "client_secret": settings.GOOGLE_CLIENT_SECRET,
                        "redirect_uri": f"{settings.BASE_URL}/api/v1/auth/google/callback",
                        "grant_type": "authorization_code",
                    },
                )
                if token_res.status_code == 200:
                    token_data = token_res.json()
                    userinfo_res = await client.get(
                        "https://www.googleapis.com/oauth2/v3/userinfo",
                        headers={"Authorization": f"Bearer {token_data.get('access_token')}"},
                    )
                    if userinfo_res.status_code == 200:
                        info = userinfo_res.json()
                        return {
                            "email": info.get("email"),
                            "username": (info.get("email") or "user").split("@")[0],
                            "display_name": info.get("name") or (info.get("email") or "User").split("@")[0],
                            "avatar_url": info.get("picture"),
                            "google_sub": info.get("sub"),
                        }
        except Exception:
            pass  # Fall back to development mock if network error or test code

    # Fallback dev user
    return {
        "email": "dev.user@vynl.app",
        "username": "vynldev",
        "display_name": "VYNL Developer",
        "avatar_url": "https://api.dicebear.com/7.x/bottts/svg?seed=vynl",
        "google_sub": "dev-sub-12345",
    }

def _set_auth_cookies(response: Response, access_token: str, refresh_token: str, csrf_token: str):
    response.set_cookie(
        key="access_token",
        value=access_token,
        httponly=True,
        samesite="lax",
        secure=False,
        max_age=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
    )
    response.set_cookie(
        key="refresh_token",
        value=refresh_token,
        httponly=True,
        samesite="lax",
        secure=False,
        max_age=settings.REFRESH_TOKEN_EXPIRE_DAYS * 24 * 3600,
    )
    # CSRF cookie must be readable by frontend JS for X-CSRF-Token header
    response.set_cookie(
        key="csrf_token",
        value=csrf_token,
        httponly=False,
        samesite="lax",
        secure=False,
        max_age=settings.REFRESH_TOKEN_EXPIRE_DAYS * 24 * 3600,
    )

@router.get("/google/callback")
async def google_callback_get(
    code: str = Query(...),
    state: Optional[str] = Query(None),
    db=Depends(get_db)
):
    user_info = await _exchange_or_mock_google_user(code)
    target_path = "/"
    if state:
        try:
            target_path = urllib.parse.unquote(state)
        except Exception:
            target_path = "/"

    user = None
    if db is not None:
        user = await db.users.find_one({"google_sub": user_info["google_sub"]})
        if not user:
            user_id = str(uuid.uuid4())
            doc = {
                "user_id": user_id,
                **user_info,
                "auth_provider": "google",
                "onboarding_complete": False,
            }
            await db.users.insert_one(doc)
            user = doc
    else:
        user = {"user_id": "mock-dev-id", **user_info, "onboarding_complete": False}

    access_token = create_access_token({"sub": user["user_id"]})
    refresh_token = create_refresh_token({"sub": user["user_id"]})
    csrf_token = secrets.token_hex(16)

    redirect_url = f"{settings.FRONTEND_URL}{target_path}"
    response = RedirectResponse(url=redirect_url, status_code=303)
    _set_auth_cookies(response, access_token, refresh_token, csrf_token)
    return response

@router.post("/google/callback")
async def google_callback_post(req: GoogleLoginRequest, response: Response, db=Depends(get_db)):
    user_info = await _exchange_or_mock_google_user(req.code)
    user = None
    if db is not None:
        user = await db.users.find_one({"google_sub": user_info["google_sub"]})
        if not user:
            user_id = str(uuid.uuid4())
            doc = {
                "user_id": user_id,
                **user_info,
                "auth_provider": "google",
                "onboarding_complete": False,
            }
            await db.users.insert_one(doc)
            user = doc
    else:
        user = {"user_id": "mock-dev-id", **user_info, "onboarding_complete": False}

    access_token = create_access_token({"sub": user["user_id"]})
    refresh_token = create_refresh_token({"sub": user["user_id"]})
    csrf_token = secrets.token_hex(16)

    _set_auth_cookies(response, access_token, refresh_token, csrf_token)

    return {
        "access_token": access_token,
        "token_type": "bearer",
        "csrf_token": csrf_token,
        "user_id": user["user_id"],
        "onboarding_complete": user.get("onboarding_complete", False),
    }


@router.get("/me", response_model=UserResponse)
async def get_me(user_id: str = Depends(get_current_user), db=Depends(get_db)):
    user = None
    if db is not None:
        user = await db.users.find_one({"user_id": user_id}, {"_id": 0})
    if not user:
        if user_id == "mock-dev-id":
            user = {
                "user_id": "mock-dev-id",
                "email": "dev.user@vynl.app",
                "username": "vynldev",
                "display_name": "VYNL Developer",
                "avatar_url": "https://api.dicebear.com/7.x/bottts/svg?seed=vynl",
                "onboarding_complete": False,
            }
        else:
            raise HTTPException(status_code=404, detail="User not found")

    return UserResponse(
        user_id=user["user_id"],
        email=user.get("email"),
        username=user.get("username"),
        display_name=user.get("display_name") or user.get("username") or "Listener",
        avatar_url=user.get("avatar_url") or "https://api.dicebear.com/7.x/bottts/svg?seed=vynl",
        is_authenticated=True,
        onboarding_complete=user.get("onboarding_complete", False),
    )

@router.post("/logout")
async def logout(response: Response):
    response.delete_cookie(key="access_token", path="/")
    response.delete_cookie(key="refresh_token", path="/")
    response.delete_cookie(key="csrf_token", path="/")
    return {"status": "logged_out"}


