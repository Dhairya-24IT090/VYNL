from fastapi import APIRouter, Depends
from pydantic import BaseModel
from app.dependencies import get_current_user, get_db

router = APIRouter(prefix="/api/v1/history", tags=["history"])

class PlayEventRequest(BaseModel):
    track_id: str
    duration_listened_ms: int
    total_duration_ms: int
    source: str = "unknown"
    action: str = "full_play"

@router.post("/play")
async def record_play(event: PlayEventRequest, user_id: str = Depends(get_current_user), db=Depends(get_db)):
    completion_rate = event.duration_listened_ms / event.total_duration_ms if event.total_duration_ms > 0 else 0.0
    
    doc = {
        "user_id": user_id,
        "track_id": event.track_id,
        "duration_listened_ms": event.duration_listened_ms,
        "total_duration_ms": event.total_duration_ms,
        "completion_rate": completion_rate,
        "source": event.source,
        "action": event.action
    }
    await db.listening_history.insert_one(doc)
    
    # In real app, trigger async task to update user profile taste vector
    return {"status": "recorded"}

@router.get("/recent")
async def get_recent_history(user_id: str = Depends(get_current_user), db=Depends(get_db)):
    history = await db.listening_history.find({"user_id": user_id}).sort("_id", -1).limit(50).to_list(length=50)
    return {"history": history}
