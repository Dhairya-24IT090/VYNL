from fastapi import APIRouter, Depends, Query, HTTPException
from typing import Optional, List
import httpx
from app.db.mongo import get_audio_db
from app.config import settings
from app.utils.serializers import serialize_mongo_doc

router = APIRouter(prefix="/tracks", tags=["tracks"])

@router.get("/search")
async def search_tracks(
    title: Optional[str] = Query(None),
    q: Optional[str] = Query(None),
    limit: int = Query(20, ge=1, le=50),
    audio_db=Depends(get_audio_db)
):
    query_text = (title or q or "").strip()
    if not query_text:
        return []

    # Attempt to proxy to audio-streaming microservice if running
    if settings.STREAMING_SERVICE_URL:
        try:
            async with httpx.AsyncClient(timeout=3.0) as client:
                res = await client.get(
                    f"{settings.STREAMING_SERVICE_URL}/api/v1/tracks/search",
                    params={"title": query_text}
                )
                if res.status_code == 200:
                    return res.json()
        except Exception:
            pass  # Fallback to direct Mongo query

    if audio_db is None:
        return []

    # Regex search on title and artist
    regex_pattern = {"$regex": query_text, "$options": "i"}
    cursor = audio_db.tracks.find({
        "$or": [
            {"title": regex_pattern},
            {"artist": regex_pattern},
        ]
    }).limit(limit)
    docs = await cursor.to_list(length=limit)
    return serialize_mongo_doc(docs)

@router.get("/{track_id}")
async def get_track_by_id(track_id: str, audio_db=Depends(get_audio_db)):
    if audio_db is None:
        raise HTTPException(status_code=404, detail="Track not found")
    track = await audio_db.tracks.find_one({"track_id": track_id})
    if not track:
        raise HTTPException(status_code=404, detail="Track not found")
    return serialize_mongo_doc(track)

@router.get("/{track_id}/stream-link")
async def get_stream_link(track_id: str):
    """Fallback streaming link routing to audio streaming service."""
    stream_url = f"{settings.STREAMING_SERVICE_URL}/stream/{track_id}/audio.mp3"
    return {"track_id": track_id, "stream_url": stream_url}
