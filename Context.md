# Project Context — VYNL Music Streaming Platform

Living context and operational state for developers and AI agents working on the VYNL workspace.

---

## 1. Workspace & Architecture Overview

VYNL is an end-to-end continuous music streaming web application designed with high aesthetic standards, real-time telemetry, personalized recommendations, and instant audio ingestion and delivery.

### Directory Structure & Responsibilities

```
New folder/
├── RULES.md                      # Agent operating rules & non-negotiable constraints
├── Context.md                    # System-wide living context document
├── Changelog.md                  # Unified reverse-chronological change record
├── VYNL/                         # Frontend client (Vite + React 19)
│   ├── src/
│   │   ├── components/           # UI components (TrackCard, SearchUI, AddToPlaylistModal, NowPlayingBar, etc.)
│   │   ├── context/              # Global state (PlayerContext, AuthContext, BackdropContext)
│   │   ├── pages/                # App views (HomePage, DiscoverPage, PlaylistsPage, PlaylistDetailPage, etc.)
│   │   └── services/             # API client (apiClient.js), event telemetry (eventBuffer.js)
│   ├── tests/                    # Vitest testing suite
│   ├── package.json
│   └── vite.config.js            # Reverse proxies for /v1 (8001), /api & /stream (8000)
├── vynl-backend/                 # Core backend service (FastAPI, Port 8001)
│   ├── app/
│   │   ├── api/                  # Endpoints (auth, playlists, library, recommendations, history)
│   │   ├── db/                   # MongoDB connection & indexes
│   │   ├── services/             # Domain logic (PlaylistService, RecommendationEngine, etc.)
│   │   └── utils/                # JWT tokens, doc serialization, cosine math
│   ├── tests/                    # Pytest test suite
│   └── requirements.txt
└── vynl-streaming/               # Audio streaming microservice (FastAPI, Port 8000)
    ├── app/
    │   ├── api/                  # Endpoints (search, resolve, ingest, stream tokens)
    │   ├── db/                   # Audio MongoDB client (vynl_audio database)
    │   └── services/             # Apple Music / iTunes resolver, Telegram CDN uploader
    └── requirements.txt
```

### Dual-Mount & Routing Map

- **Frontend Client**: Runs on `http://localhost:5173`
- **Core Backend (`vynl-backend`)**: Runs on `http://localhost:8001`
  - Routes mounted at `/v1/*` and `/api/v1/*` for playlists, auth, user profiles, library, activity, recommendations.
- **Audio Streaming Service (`vynl-streaming`)**: Runs on `http://localhost:8000`
  - Routes mounted at `/api/*` and `/stream/*` for track search (iTunes), audio ingest/download, and Telegram CDN streaming.

---

## 2. Full Feature List

### Implemented
- **Personalized Playlist Management**:
  - Unlimited user-created custom playlists with persistent metadata in MongoDB.
  - Playlist creation, listing, inspection, track deletion, and playlist deletion.
  - Quick action controls (Play and Shuffle) on both playlist gallery cards and playlist detail views.
- **Search & Ingest Integration**:
  - Live iTunes track search with real-time debouncing.
  - One-click track ingest and direct "Add to Playlist" action on all search results.
  - Multi-source playlist insertion from search results, library, and recommended track cards.
- **Queue & Continuous Playback**:
  - Persistent HTML5 audio playback across route transitions.
  - In-context stream URL resolution for queued and shuffled tracks.
  - True randomized playlist shuffling via Fisher-Yates algorithm.
- **Authentication**:
  - Google OAuth with seamless local dev fallback (`/v1/auth/google/callback?code=dev_mock_code`).
  - HttpOnly cookies (`access_token`, `refresh_token`, `csrf_token`) with transparent token refresh.
- **Audio Streaming Pipeline**:
  - Track resolution, dedup checking, background telegram storage, and time-limited tokenized stream URLs.

### In-Progress / Planned
- Collaborative real-time playlist editing with version concurrency recovery.
- Synced time-coded lyrics viewer.
- Monthly user wrap visualizer.

---

## 3. Key Conventions & Patterns

- **Defensive API Extraction**: Endpoints returning wrappers like `{ "playlists": [...] }` or `{ "tracks": [...] }` must always be defensively unwrapped on the frontend via `Array.isArray(data) ? data : (data?.playlists || [])`.
- **Dry & Modular Design**: Modals like [AddToPlaylistModal.jsx](file:///c:/Projects/New%20folder/VYNL/src/components/AddToPlaylistModal.jsx) are shared across search, library, and recommendation surfaces.
- **Track Identification**: Tracks may originate as external references (`apple_track_id`) or internal ingested entities (`track_id`). Any action requiring playback or library persistence resolves or ingests the track first to acquire a persistent `track_id`.

---

## 4. Operational Categories

### UI/Motion
- Clean glassmorphism theme (`glass-panel`, `glass-card`, `btn-glass`) with curated dark palette.
- Hover scales, active feedback badges ("Added"), and micro-spinners for asynchronous actions.

### SEO
- Semantic page headers, descriptive titles, unique test IDs (`data-testid`), and accessible keyboard-operable elements.

### Audit Findings
- Resolved silent promise catches in playlist creation and addition flows.
- Ensured proper CORS handling and credentials forwarding across Vite proxy targets.
