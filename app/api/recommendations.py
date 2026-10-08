from fastapi import APIRouter, Depends, Query
from app.dependencies import get_current_user, get_db
from app.db.mongo import get_audio_db
from app.services.recommendation_engine import RecommendationEngine

router = APIRouter(prefix="/api/v1/recommendations", tags=["recommendations"])

@router.get("/for-you")
async def get_for_you(
    limit: int = Query(20, ge=1, le=50),
    user_id: str = Depends(get_current_user),
    db=Depends(get_db),
    audio_db=Depends(get_audio_db)
):
    engine = RecommendationEngine(db, audio_db)
    recs = await engine.get_for_you_recommendations(user_id, limit=limit)
    return {"recommendations": recs, "count": len(recs)}

@router.get("/trending")
async def get_trending(
    limit: int = Query(20, ge=1, le=50),
    db=Depends(get_db),
    audio_db=Depends(get_audio_db)
):
    engine = RecommendationEngine(db, audio_db)
    trending = await engine.get_trending(limit=limit)
    return {"trending": trending, "count": len(trending)}

@router.get("/radio/{track_id}")
async def get_track_radio(
    track_id: str,
    limit: int = Query(20, ge=1, le=50),
    db=Depends(get_db),
    audio_db=Depends(get_audio_db)
):
    engine = RecommendationEngine(db, audio_db)
    radio_tracks = await engine.get_track_radio(track_id, limit=limit)
    return {"seed_track_id": track_id, "recommendations": radio_tracks, "count": len(radio_tracks)}
