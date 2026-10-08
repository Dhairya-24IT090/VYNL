from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from app.dependencies import get_current_user, get_db
from app.services.library_service import LibraryService

router = APIRouter(prefix="/library", tags=["library"])

class TrackActionRequest(BaseModel):
    track_id: str

@router.get("/")
async def get_library(
    limit: int = Query(50, ge=1, le=100),
    user_id: str = Depends(get_current_user),
    db=Depends(get_db)
):
    service = LibraryService(db)
    tracks = await service.get_library_tracks(user_id, limit=limit)
    return {"tracks": tracks, "count": len(tracks)}

@router.post("/tracks")
async def save_track_to_library(
    req: TrackActionRequest,
    user_id: str = Depends(get_current_user),
    db=Depends(get_db)
):
    service = LibraryService(db)
    result = await service.add_to_library(user_id, req.track_id)
    return {"status": "saved", "track": result}

@router.delete("/tracks/{track_id}")
async def delete_track_from_library(
    track_id: str,
    user_id: str = Depends(get_current_user),
    db=Depends(get_db)
):
    service = LibraryService(db)
    removed = await service.remove_from_library(user_id, track_id)
    if not removed:
        raise HTTPException(status_code=404, detail="Track not found in library")
    return {"status": "removed", "track_id": track_id}

@router.get("/check/{track_id}")
async def check_library_status(
    track_id: str,
    user_id: str = Depends(get_current_user),
    db=Depends(get_db)
):
    service = LibraryService(db)
    saved = await service.is_in_library(user_id, track_id)
    return {"saved": saved, "track_id": track_id}
