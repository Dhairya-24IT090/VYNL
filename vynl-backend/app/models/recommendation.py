from pydantic import BaseModel, Field
from datetime import datetime
from typing import Optional, List

class SongFeature(BaseModel):
    track_id: str
    genre: str
    sub_genres: List[str] = []
    artist_id: str
    artist_name: str
    language: str
    release_year: int
    era: str
    explicit: bool
    artist_cluster: int
    popularity_score: float = 0.0
    play_count: int = 0
    audio_features: Optional[dict] = None
    features_extracted_at: Optional[datetime] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
