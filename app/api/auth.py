from fastapi import APIRouter, Depends, Response, HTTPException
from pydantic import BaseModel
from app.db.mongo import get_db
from app.utils.jwt_utils import create_access_token, create_refresh_token
from app.dependencies import get_current_user
from app.config import settings

router = APIRouter(prefix="/api/v1/auth", tags=["auth"])

class GoogleLoginRequest(BaseModel):
    code: str

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
