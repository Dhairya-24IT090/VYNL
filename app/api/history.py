from fastapi import APIRouter, Depends
from pydantic import BaseModel
from app.dependencies import get_current_user, get_db
from app.services.history_service import HistoryService

router = APIRouter(prefix="/api/v1/history", tags=["history"])

class PlayEventRequest(BaseModel):
    track_id: str
    duration_listened_ms: int
    total_duration_ms: int
    source: str = "web_player"
    action: str = "full_play"

@router.post("/play")
async def record_play(event: PlayEventRequest, user_id: str = Depends(get_current_user), db=Depends(get_db)):
    completion_rate = event.duration_listened_ms / event.total_duration_ms if event.total_duration_ms > 0 else 0.0
    service = HistoryService(db)
    doc = await service.record_play(user_id, {
        "track_id": event.track_id,
        "duration_listened_ms": event.duration_listened_ms,
        "total_duration_ms": event.total_duration_ms,
        "completion_rate": completion_rate,
        "source": event.source,
        "action": event.action,
    })
    return {"status": "recorded", "event": doc}

@router.get("/recent")
async def get_recent_history(user_id: str = Depends(get_current_user), db=Depends(get_db)):
    service = HistoryService(db)
    history = await service.get_recent_history(user_id, limit=50)
    return {"history": history}

