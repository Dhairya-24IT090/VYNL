from fastapi import APIRouter, Depends
from app.dependencies import get_current_user, get_db
from app.db.mongo import get_audio_db
from app.services.recommendation_engine import RecommendationEngine

router = APIRouter(prefix="/api/v1/recommendations", tags=["recommendations"])

@router.get("/for-you")
async def get_for_you(
    user_id: str = Depends(get_current_user), 
    db=Depends(get_db), 
    audio_db=Depends(get_audio_db)
):
    engine = RecommendationEngine(db, audio_db)
    recs = await engine.get_for_you_recommendations(user_id)
    return {"recommendations": recs}

@router.get("/trending")
async def get_trending(
    db=Depends(get_db), 
    audio_db=Depends(get_audio_db)
):
    engine = RecommendationEngine(db, audio_db)
    trending = await engine.get_trending()
    return {"trending": trending}
