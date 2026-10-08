from fastapi import APIRouter, Depends, Request
from typing import Optional
from app.db.mongo import get_db
from app.models.history import ActivityBatchRequest
from app.dependencies import get_current_user
from app.services.history_service import HistoryService
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/activity", tags=["activity"])

@router.post("/batch")
async def record_activity_batch(
    payload: ActivityBatchRequest,
    request: Request,
    db=Depends(get_db)
):
    """
    Receives batched interaction telemetry flushed by frontend eventBuffer.js.
    Supports both authenticated sessions and anonymous telemetry safely.
    """
    user_id: Optional[str] = None
    try:
        user_id = await get_current_user(request)
    except Exception:
        user_id = "anonymous"

    service = HistoryService(db)
    processed_count = await service.record_activity_batch(user_id=user_id, events=payload.events)
    return {"status": "ok", "processed": processed_count}
