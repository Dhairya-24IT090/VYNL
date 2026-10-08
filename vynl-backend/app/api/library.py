from fastapi import APIRouter, Depends, HTTPException
from app.dependencies import get_current_user, get_db

router = APIRouter(prefix="/api/v1/library", tags=["library"])

@router.get("/liked")
async def get_liked_songs(user_id: str = Depends(get_current_user), db=Depends(get_db)):
    # Placeholder
    liked = await db.liked_songs.find({"user_id": user_id}).to_list(length=100)
    return {"liked_songs": liked}

@router.post("/like/{track_id}")
async def like_song(track_id: str, user_id: str = Depends(get_current_user), db=Depends(get_db)):
    await db.liked_songs.update_one(
        {"user_id": user_id, "track_id": track_id},
        {"$set": {"user_id": user_id, "track_id": track_id}},
        upsert=True
    )
    return {"status": "liked"}

@router.delete("/like/{track_id}")
async def unlike_song(track_id: str, user_id: str = Depends(get_current_user), db=Depends(get_db)):
    await db.liked_songs.delete_one({"user_id": user_id, "track_id": track_id})
    return {"status": "unliked"}
