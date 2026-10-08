from pydantic import BaseModel, Field
from datetime import datetime
from typing import List, Optional

class PlaylistTrack(BaseModel):
    track_id: str
    added_at: datetime = Field(default_factory=datetime.utcnow)
    position: int

class PlaylistBase(BaseModel):
    name: str
    description: Optional[str] = None
    is_public: bool = False

class PlaylistCreate(PlaylistBase):
    pass

class PlaylistDB(PlaylistBase):
    playlist_id: str
    user_id: str
    cover_url: Optional[str] = None
    tracks: List[PlaylistTrack] = []
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
