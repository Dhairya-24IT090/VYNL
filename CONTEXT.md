# Project Context — vynl-backend

Handoff doc for AI agents and teammates. Read this before making changes.

---

## What this project is

**Core backend service** for the VYNL music streaming platform. It provides the REST API for user authentication, library management, playlists, listening history, and the **recommendation engine**.

It interacts with another microservice, `vynl-audio-streaming`, which handles the actual audio downloading, Telegram storage, and streaming.

**Repo:** `https://github.com/Dhairya-24IT090/VYNL`
**Branch:** `backend`

---

## Architecture & Service Map

The platform consists of three coordinated services:

| Service | Directory | Port | Primary Responsibility |
|---|---|---|---|
| **Frontend Web** | `vynl-frontend-streaming` | `5173` | React + Vite client, audio player, queue, search UI |
| **Streaming Microservice** | `vynl-audio-streaming` | `8000` | Track search (iTunes), audio downloader, Telegram CDN streaming |
| **Core Backend** | `vynl-backend` | `8001` | Auth, user profiles, playlists, library, recommendation engine, activity |

---

## Dual-Mount Routing & Frontend Contracts

All backend routers are mounted under both `/v1` and `/api/v1`. Vite proxies requests as follows:
- `/v1/*` → `http://localhost:8001` (Core backend: auth, activity, recs, library, playlists)
- `/api/*` and `/stream/*` → `http://localhost:8000` (Audio streaming service)

### Core Frontend Integration Endpoints:
1. `GET /v1/auth/me`: Returns `{ user_id, display_name, avatar_url, is_authenticated, onboarding_complete }`.
2. `GET /v1/auth/google/start?return_to=...`: Initiates OAuth or dev fallback redirect.
3. `POST /v1/auth/logout`: Clears `access_token`, `refresh_token`, and `csrf_token` cookies.
4. `POST /v1/activity/batch`: Flushed every 5s by `eventBuffer.js` to ingest interaction telemetry.
5. `GET /v1/recommendations/for-you`: Generates personalized track feed based on user taste vector.
6. `GET /v1/recommendations/radio/{track_id}`: Track radio recommendations matching audio feature vectors.

---

## The Recommendation Engine

This is a dynamic, online recommendation system, not a static dataset model.

- **Scoring Equation:**
  `Score = 0.30(Genre) + 0.20(Artist) + 0.15(Language) + 0.15(AudioFeatures) + 0.10(Era) + 0.10(Popularity)`
- **Dynamic Profile Updates:** Listening to songs (>70% completion) or liking tracks boosts taste weights; skipping (<25% completion) penalizes weights.
- **Diversification:** Maximum 2 songs per artist in recommendations.
- **Zero-Dependency Math:** Standard library cosine similarity (`math.sqrt`) avoids heavy external ML dependencies.

---

## Running Locally

1. **Audio Streaming Service (Port 8000):**
   ```bash
   cd vynl-audio-streaming
   uvicorn app.main:app --port 8000 --reload
   ```
2. **Core Backend Service (Port 8001):**
   ```bash
   cd vynl-backend
   uvicorn app.main:app --port 8001 --reload
   ```
3. **Frontend Client (Port 5173):**
   ```bash
   cd vynl-frontend-streaming
   npm run dev
   ```

