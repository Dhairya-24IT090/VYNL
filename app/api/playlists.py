from fastapi import APIRouter, Depends, HTTPException
from app.dependencies import get_current_user, get_db
import uuid

router = APIRouter(prefix="/api/v1/playlists", tags=["playlists"])

@router.get("/")
async def get_playlists(user_id: str = Depends(get_current_user), db=Depends(get_db)):
    playlists = await db.playlists.find({"user_id": user_id}).to_list(length=50)
    return {"playlists": playlists}

@router.post("/")
async def create_playlist(name: str, user_id: str = Depends(get_current_user), db=Depends(get_db)):
    playlist_id = str(uuid.uuid4())
    doc = {
        "playlist_id": playlist_id,
        "user_id": user_id,
        "name": name,
        "tracks": []
    }
    await db.playlists.insert_one(doc)
    del doc["_id"]
    return doc

@router.post("/{playlist_id}/tracks")
async def add_track(playlist_id: str, track_id: str, user_id: str = Depends(get_current_user), db=Depends(get_db)):
    res = await db.playlists.update_one(
        {"playlist_id": playlist_id, "user_id": user_id},
        {"$push": {"tracks": {"track_id": track_id, "position": 0}}}
    )
    if res.modified_count == 0:
        raise HTTPException(status_code=404, detail="Playlist not found")
    return {"status": "added"}
