import random
from typing import List, Dict, Any
from app.utils.similarity import compute_cosine_similarity

class RecommendationEngine:
    def __init__(self, db, audio_db):
        self.db = db
        self.audio_db = audio_db

    async def get_for_you_recommendations(self, user_id: str, limit: int = 20) -> List[dict]:
        user_profile = await self.db.user_profiles.find_one({"user_id": user_id})
        
        # Cold start fallback if no profile or empty weights
        if not user_profile or not user_profile.get("genre_weights"):
            return await self.get_trending(limit)

        # 1. Fetch all available songs (in real life, limit or pre-filter)
        cursor = self.audio_db.tracks.find({})
        catalog = await cursor.to_list(length=1000)

        # 2. Get recent history to avoid repeating
        recent_history = await self.db.listening_history.find(
            {"user_id": user_id}
        ).sort("played_at", -1).limit(50).to_list(length=50)
        recent_track_ids = {h["track_id"] for h in recent_history}

        recommendations = []
        for song in catalog:
            if song["track_id"] in recent_track_ids:
                continue
            
            score = self.score_song(user_profile, song)
            recommendations.append({"track": song, "score": score})

        # Sort by score
        recommendations.sort(key=lambda x: x["score"], reverse=True)
        
        # Diversify and limit
        return self.diversify_results(recommendations, limit)

    def score_song(self, user_profile: dict, song: dict) -> float:
        # Simplified scoring based on System Design Doc
        genre_score = user_profile.get("genre_weights", {}).get(song.get("genre"), 0.0)
        lang_score = user_profile.get("language_weights", {}).get(song.get("language", "en"), 0.05)
        
        artist_cluster = song.get("artist_cluster")
        locality_score = 0.2 if artist_cluster in user_profile.get("artist_cluster_ids", []) else 0.0
        
        total_score = (0.30 * genre_score) + (0.20 * lang_score) + locality_score
        return total_score

    def diversify_results(self, scored_items: List[dict], limit: int) -> List[dict]:
        artist_counts = {}
        final_results = []
        
        for item in scored_items:
            if len(final_results) >= limit:
                break
                
            artist_id = item["track"].get("artist_id")
            if artist_counts.get(artist_id, 0) < 2:
                final_results.append(item["track"])
                artist_counts[artist_id] = artist_counts.get(artist_id, 0) + 1

        return final_results

    async def get_trending(self, limit: int = 20) -> List[dict]:
        cursor = self.audio_db.tracks.find({}).sort("popularity_score", -1).limit(limit)
        return await cursor.to_list(length=limit)
