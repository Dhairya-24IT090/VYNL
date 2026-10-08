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


@router.post("/google/callback")
async def google_callback(req: GoogleLoginRequest, response: Response, db=Depends(get_db)):
    # Placeholder for actual Google token exchange
    # Mocking user data
    user_data = {
        "user_id": "test-uuid",
        "email": "user@gmail.com",
        "username": "testuser",
        "google_sub": "12345"
    }

    # Check if user exists
    user = await db.users.find_one({"google_sub": user_data["google_sub"]})
    if not user:
        await db.users.insert_one(user_data)
        user = user_data
    
    access_token = create_access_token({"sub": user["user_id"]})
    refresh_token = create_refresh_token({"sub": user["user_id"]})
    
    response.set_cookie(
        key="refresh_token",
        value=refresh_token,
        httponly=True,
        secure=True, # Should be False in local dev without HTTPS
        samesite="lax",
        max_age=settings.REFRESH_TOKEN_EXPIRE_DAYS * 24 * 60 * 60
    )

    return {"access_token": access_token, "token_type": "bearer", "onboarding_complete": user.get("onboarding_complete", False)}

@router.get("/me")
async def get_me(user_id: str = Depends(get_current_user), db=Depends(get_db)):
    user = await db.users.find_one({"user_id": user_id}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user
