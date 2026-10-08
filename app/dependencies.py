from fastapi import Depends, Request
import jwt
from typing import Optional
from app.utils.jwt_utils import decode_token
from app.exceptions import UnauthorizedException
from app.db.mongo import get_db

async def get_current_user(request: Request) -> str:
    token: Optional[str] = None
    auth_header = request.headers.get("Authorization")
    if auth_header and auth_header.startswith("Bearer "):
        token = auth_header.split(" ")[1].strip()
    elif "access_token" in request.cookies:
        token = request.cookies.get("access_token")

    if not token:
        raise UnauthorizedException("Authentication required")

    try:
        payload = decode_token(token)
        user_id: Optional[str] = payload.get("sub")
        if not user_id:
            raise UnauthorizedException("Token payload missing subject")
        return user_id
    except jwt.PyJWTError:
        raise UnauthorizedException("Invalid or expired session token")

async def get_current_user_profile(user_id: str = Depends(get_current_user), db=Depends(get_db)):
    if db is None:
        return None
    profile = await db.user_profiles.find_one({"user_id": user_id}, {"_id": 0})
    return profile

