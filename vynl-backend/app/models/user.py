from pydantic import BaseModel, EmailStr, Field
from datetime import datetime
from typing import Optional, List, Dict

class UserBase(BaseModel):
    email: EmailStr
    username: str
    avatar_url: Optional[str] = None
    auth_provider: str = "google"
    google_sub: str
    onboarding_complete: bool = False

class UserCreate(UserBase):
    pass

class UserDB(UserBase):
    user_id: str
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

class UserProfile(BaseModel):
    user_id: str
    genre_weights: Dict[str, float] = {}
    language_weights: Dict[str, float] = {}
    top_artists: List[str] = []
    artist_cluster_ids: List[int] = []
    era_weights: Dict[str, float] = {}
    total_plays: int = 0
    avg_completion_rate: float = 0.0
    last_updated: datetime = Field(default_factory=datetime.utcnow)
