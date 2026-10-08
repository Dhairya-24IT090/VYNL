# Project Context — vynl-backend

Handoff doc for AI agents and teammates. Read this before making changes.

---

## What this project is

**Core backend service** for the VYNL music streaming platform. It provides the REST API for user authentication, library management, playlists, listening history, and the **recommendation engine**.

It interacts with another microservice, `vynl-audio-streaming`, which handles the actual audio downloading, Telegram storage, and streaming.

**Repo:** `vynl-backend` (New Repo)
**Branch:** `main`

---

## Architecture Context

1. **Database:** Uses MongoDB Atlas. It shares the same physical cluster as `vynl-audio-streaming` but uses a different logical database (`vynl_backend` vs `vynl_audio`).
2. **Catalog Access:** For performance, the recommendation engine does a **read-only cross-database query** to `vynl_audio.tracks` to scan the catalog.
3. **Writes:** Any writes to the catalog or requests for stream links MUST go through HTTP API calls to `vynl-audio-streaming`, not direct DB writes.
4. **Auth:** Google OAuth 2.0 ONLY. Web-first JWT strategy using HttpOnly secure cookies for refresh tokens.

---

## The Recommendation Engine

This is a dynamic, online recommendation system, not a static dataset model.

- **Phase 1 (Current):** Metadata-first content-based filtering. We use genre, artist, era, and language metadata fetched from iTunes to build feature vectors. User taste profiles are built from listening history. Scoring uses weighted cosine similarity + artist locality clustering.
- **Phase 2 (Future):** Background worker using Essentia to extract sonic features (danceability, energy, tempo) directly from the raw audio stored in Telegram.

We cache "for you" recommendation lists per user to avoid computing on every API call.

---

## Project Structure

```
vynl-backend/
├── SYSTEM_DESIGN.md        # Detailed architecture and schema
├── CONTEXT.md              # This file
├── requirements.txt
├── .env
├── app/
│   ├── main.py             # FastAPI application
│   ├── config.py           # Pydantic BaseSettings
│   ├── dependencies.py     # Auth & DB injection
│   ├── api/                # Route handlers
│   ├── db/                 # MongoDB connections
│   ├── models/             # Pydantic schemas
│   ├── services/           # Business logic & recommendation engine
│   └── utils/              # Similarity math, JWT helpers
```

---

## Environment Variables

See `.env.example` for required variables. You will need a Google OAuth Client ID and Secret.
