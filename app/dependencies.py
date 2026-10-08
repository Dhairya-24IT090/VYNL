from fastapi import Depends, Request
from jose import JWTError
from app.utils.jwt_utils import decode_token
from app.exceptions import UnauthorizedException
from app.db.mongo import get_db

async def get_current_user(request: Request):
    auth_header = request.headers.get("Authorization")
    if not auth_header or not auth_header.startswith("Bearer "):
        raise UnauthorizedException("Missing or invalid token")
    
    token = auth_header.split(" ")[1]
    try:
        payload = decode_token(token)
        user_id: str = payload.get("sub")
        if user_id is None:
            raise UnauthorizedException("Token payload invalid")
        return user_id
    except JWTError:
        raise UnauthorizedException("Could not validate credentials")

async def get_current_user_profile(user_id: str = Depends(get_current_user), db=Depends(get_db)):
    profile = await db.user_profiles.find_one({"user_id": user_id})
    return profile
