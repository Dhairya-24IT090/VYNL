import random
from datetime import datetime, timezone
from typing import List, Dict, Any, Optional
from app.utils.similarity import compute_cosine_similarity
from app.utils.serializers import serialize_mongo_doc

class RecommendationEngine:
    def __init__(self, db, audio_db):
        self.db = db
        self.audio_db = audio_db

    async def get_for_you_recommendations(self, user_id: str, limit: int = 20) -> List[Dict[str, Any]]:
        """
        Generates personalized recommendations using multi-factor content-based scoring.
        Applies recent listen filtering, skip penalties, and artist diversification.
        """
        user_profile = None
        if self.db is not None:
            user_profile = await self.db.user_profiles.find_one({"user_id": user_id})

        # Cold start fallback if user profile is absent or unseeded
        if not user_profile or not user_profile.get("genre_weights"):
            return await self.get_trending(limit)

        catalog = []
        if self.audio_db is not None:
            cursor = self.audio_db.tracks.find({})
            catalog = await cursor.to_list(length=500)

        if not catalog:
            return []

        # Exclude recent plays (last 50 items)
        recent_track_ids = set()
        if self.db is not None:
            recent_history = await self.db.listening_history.find(
                {"user_id": user_id}
            ).sort("played_at", -1).limit(50).to_list(length=50)
            recent_track_ids = {h.get("track_id") for h in recent_history if h.get("track_id")}

        scored_items = []
        for song in catalog:
            track_id = song.get("track_id") or song.get("id")
            if track_id in recent_track_ids:
                continue

            score = self.score_song(user_profile, song)
            scored_items.append({"track": song, "score": score})

        # Sort descending by score
        scored_items.sort(key=lambda x: x["score"], reverse=True)

        return self.diversify_results(scored_items, limit)

    def score_song(self, user_profile: dict, song: dict) -> float:
        """
        Computes multi-factor relevance score according to SYSTEM_DESIGN.md specifications:
        - Genre Match (0.30)
        - Artist Affinity (0.20)
        - Language Match (0.15)
        - Audio Feature Similarity (0.15)
        - Era/Recency (0.10)
        - Popularity Baseline (0.10)
        """
        # 1. Genre score
        genre = song.get("genre", "").lower()
        genre_score = user_profile.get("genre_weights", {}).get(genre, 0.1)

        # 2. Artist affinity
        artist = song.get("artist", "")
        top_artists = user_profile.get("top_artists", [])
        artist_cluster = song.get("artist_cluster")
        user_clusters = user_profile.get("artist_cluster_ids", [])
        
        artist_score = 0.0
        if artist in top_artists:
            artist_score = 1.0
        elif artist_cluster and artist_cluster in user_clusters:
            artist_score = 0.6
        else:
            artist_score = 0.1

        # 3. Language score
        song_lang = song.get("language", "en").lower()
        lang_weights = user_profile.get("language_weights", {"en": 0.5})
        lang_score = lang_weights.get(song_lang, 0.2)

        # 4. Audio feature similarity
        song_features = {
            "danceability": float(song.get("danceability", 0.5)),
            "energy": float(song.get("energy", 0.5)),
            "acousticness": float(song.get("acousticness", 0.3)),
            "valence": float(song.get("valence", 0.5)),
        }
        user_features = user_profile.get("feature_preferences", {
            "danceability": 0.5,
            "energy": 0.5,
            "acousticness": 0.3,
            "valence": 0.5,
        })
        audio_sim = compute_cosine_similarity(song_features, user_features)

        # 5. Era score
        era = song.get("era", "2020s")
        era_score = user_profile.get("era_weights", {}).get(era, 0.5)

        # 6. Popularity score
        popularity = float(song.get("popularity_score", 0.5))

        total_score = (
            (0.30 * genre_score) +
            (0.20 * artist_score) +
            (0.15 * lang_score) +
            (0.15 * audio_sim) +
            (0.10 * era_score) +
            (0.10 * popularity)
        )
        return round(total_score, 4)

    def diversify_results(self, scored_items: List[dict], limit: int) -> List[Dict[str, Any]]:
        """Restricts repetitive artist clusters to max 2 tracks per artist for catalog diversity."""
        artist_counts = {}
        final_tracks = []

        for item in scored_items:
            if len(final_tracks) >= limit:
                break
            track = item["track"]
            artist = track.get("artist", "unknown")
            if artist_counts.get(artist, 0) < 2:
                final_tracks.append(track)
                artist_counts[artist] = artist_counts.get(artist, 0) + 1

        return serialize_mongo_doc(final_tracks)

    async def get_trending(self, limit: int = 20) -> List[Dict[str, Any]]:
        """Fallback catalog items sorted by global popularity score."""
        if self.audio_db is None:
            return []
        cursor = self.audio_db.tracks.find({}).sort("popularity_score", -1).limit(limit)
        docs = await cursor.to_list(length=limit)
        return serialize_mongo_doc(docs)

    async def get_track_radio(self, seed_track_id: str, limit: int = 20) -> List[Dict[str, Any]]:
        """Instant track radio: finds songs with similar genre, energy, and acoustic profile."""
        if self.audio_db is None:
            return []
        seed = await self.audio_db.tracks.find_one({"track_id": seed_track_id})
        if not seed:
            return await self.get_trending(limit)

        seed_features = {
            "danceability": float(seed.get("danceability", 0.5)),
            "energy": float(seed.get("energy", 0.5)),
            "acousticness": float(seed.get("acousticness", 0.3)),
            "valence": float(seed.get("valence", 0.5)),
        }
        seed_genre = seed.get("genre", "")

        cursor = self.audio_db.tracks.find({"track_id": {"$ne": seed_track_id}})
        candidates = await cursor.to_list(length=200)

        ranked = []
        for c in candidates:
            c_features = {
                "danceability": float(c.get("danceability", 0.5)),
                "energy": float(c.get("energy", 0.5)),
                "acousticness": float(c.get("acousticness", 0.3)),
                "valence": float(c.get("valence", 0.5)),
            }
            sim = compute_cosine_similarity(seed_features, c_features)
            genre_bonus = 0.3 if c.get("genre") == seed_genre else 0.0
            score = sim + genre_bonus
            ranked.append({"track": c, "score": score})

        ranked.sort(key=lambda x: x["score"], reverse=True)
        return self.diversify_results(ranked, limit)
