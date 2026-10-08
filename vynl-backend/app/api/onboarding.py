from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import List
from app.dependencies import get_current_user, get_db

router = APIRouter(prefix="/api/v1/onboarding", tags=["onboarding"])

class OnboardingRequest(BaseModel):
    genres: List[str]
    artists: List[str]

@router.get("/genres")
async def get_genres():
    return {"genres": ["pop", "hip-hop", "r&b", "rock", "indie", "electronic", "classical"]}

@router.post("/preferences")
async def submit_preferences(req: OnboardingRequest, user_id: str = Depends(get_current_user), db=Depends(get_db)):
    if len(req.genres) + len(req.artists) < 3:
        raise HTTPException(status_code=400, detail="Please select at least 3 genres or artists")
    if len(req.genres) + len(req.artists) > 10:
        raise HTTPException(status_code=400, detail="Maximum 10 selections allowed")

    # Update user profile with initial weights
    genre_weights = {g: 0.5 for g in req.genres}
    
    await db.user_profiles.update_one(
        {"user_id": user_id},
        {"$set": {
            "genre_weights": genre_weights,
            "top_artists": req.artists
        }},
        upsert=True
    )
    
    await db.users.update_one({"user_id": user_id}, {"$set": {"onboarding_complete": True}})

    return {"status": "onboarding_complete"}
