from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime, timezone
from app.dependencies import get_current_user, get_db

router = APIRouter(prefix="/onboarding", tags=["onboarding"])

class OnboardingRequest(BaseModel):
    genres: List[str] = Field(..., description="Selected favorite genres (min 1)")
    artists: Optional[List[str]] = Field(default=[], description="Selected favorite artists")
    languages: Optional[List[str]] = Field(default=["en"], description="Preferred song languages")

GENRE_CATALOG = [
    {"id": "pop", "name": "Pop", "default_energy": 0.65, "default_danceability": 0.70},
    {"id": "hip-hop", "name": "Hip-Hop", "default_energy": 0.75, "default_danceability": 0.80},
    {"id": "r&b", "name": "R&B / Soul", "default_energy": 0.50, "default_danceability": 0.60},
    {"id": "rock", "name": "Rock", "default_energy": 0.85, "default_danceability": 0.45},
    {"id": "indie", "name": "Indie & Alternative", "default_energy": 0.55, "default_danceability": 0.50},
    {"id": "electronic", "name": "Electronic / EDM", "default_energy": 0.88, "default_danceability": 0.78},
    {"id": "classical", "name": "Classical & Ambient", "default_energy": 0.25, "default_danceability": 0.20},
    {"id": "jazz", "name": "Jazz & Blues", "default_energy": 0.40, "default_danceability": 0.50},
]

@router.get("/genres")
async def get_genres():
    return {"genres": GENRE_CATALOG}

@router.post("/preferences")
async def submit_preferences(
    req: OnboardingRequest,
    user_id: str = Depends(get_current_user),
    db=Depends(get_db)
):
    total_picks = len(req.genres) + len(req.artists)
    if total_picks < 3:
        raise HTTPException(status_code=400, detail="Please select at least 3 genres or artists to calibrate recommendations")
    if total_picks > 15:
        raise HTTPException(status_code=400, detail="Maximum 15 selections allowed")

    # Seed genre weights with initial strong preference (0.8)
    genre_weights = {g.lower().strip(): 0.8 for g in req.genres}

    # Derive baseline audio feature vector from selected genres
    selected_meta = [g for g in GENRE_CATALOG if g["id"] in genre_weights]
    avg_energy = sum(g["default_energy"] for g in selected_meta) / len(selected_meta) if selected_meta else 0.5
    avg_danceability = sum(g["default_danceability"] for g in selected_meta) / len(selected_meta) if selected_meta else 0.5

    feature_preferences = {
        "energy": round(avg_energy, 2),
        "danceability": round(avg_danceability, 2),
        "acousticness": 0.3,
        "valence": 0.5,
    }

    lang_weights = {l.lower().strip(): 0.8 for l in (req.languages or ["en"])}

    now = datetime.now(timezone.utc)
    if db is not None:
        await db.user_profiles.update_one(
            {"user_id": user_id},
            {"$set": {
                "user_id": user_id,
                "genre_weights": genre_weights,
                "top_artists": [a.strip() for a in req.artists],
                "language_weights": lang_weights,
                "feature_preferences": feature_preferences,
                "total_plays": 0,
                "last_updated": now,
            }},
            upsert=True
        )
        await db.users.update_one(
            {"user_id": user_id},
            {"$set": {"onboarding_complete": True, "updated_at": now}}
        )

    return {"status": "onboarding_complete", "feature_preferences": feature_preferences}
