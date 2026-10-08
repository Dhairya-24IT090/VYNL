from pydantic import BaseModel, Field
from datetime import datetime
from typing import Optional, Dict, Any, List

class PlayEvent(BaseModel):
    user_id: str
    track_id: str
    played_at: datetime = Field(default_factory=datetime.utcnow)
    duration_listened_ms: int
    total_duration_ms: int
    completion_rate: float
    source: str = "web_player"
    action: str = "full_play"

class ActivityEventItem(BaseModel):
    event_type: str = "play"  # "play", "skip", "pause", "seek", "like", "add_queue"
    track_id: Optional[str] = None
    timestamp: Optional[int] = None
    duration_listened_ms: Optional[int] = 0
    total_duration_ms: Optional[int] = 0
    source: Optional[str] = "web_player"
    metadata: Optional[Dict[str, Any]] = None

class ActivityBatchRequest(BaseModel):
    events: List[ActivityEventItem]

