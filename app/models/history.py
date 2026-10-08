from pydantic import BaseModel, Field
from datetime import datetime

class PlayEvent(BaseModel):
    user_id: str
    track_id: str
    played_at: datetime = Field(default_factory=datetime.utcnow)
    duration_listened_ms: int
    total_duration_ms: int
    completion_rate: float
    source: str
    action: str
