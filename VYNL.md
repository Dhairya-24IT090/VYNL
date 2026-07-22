# VYNL — AI-Powered Recommendations. Community-Driven Listening.

**Team:** Dhairya Shah (24IT090) · Maharsh Solanki (24IT093) · Milan Vadhel (24IT101)

---

## 1. Project Overview

VYNL is a music streaming and discovery platform built around three pillars: **explainable AI-driven recommendations**, **real-time collaborative curation**, and **music-first community spaces**.

Unlike mainstream platforms (Spotify, Apple Music, YouTube Music) that rely on opaque, black-box recommendation systems, VYNL is designed so that every suggestion is traceable to a reason — genre similarity, artist similarity, or learned listening behavior. The platform combines a custom-trained recommendation engine, a full-featured streaming player (web + mobile), collaborative real-time playlists, and genre-based discussion hubs, replacing the fragmented experience of using Discord/Reddit/Twitter alongside a music app.

**Core pillars:**
- **Transparent Recommendations** — users understand *why* a track was suggested.
- **Active Curation** — users can seed a session from a genre/artist and let AI build it out, rather than passively accepting a queue.
- **Social Listening** — discussion threads tied directly to songs/playlists, and genre-based channels, native to the app.
- **Collaborative Playlists** — real-time, multi-user, conflict-free playlist editing.

---

## 2. Business Objectives

| Objective | Description |
|---|---|
| **Differentiation via Explainability** | Build user trust by surfacing the reasoning behind recommendations (genre/artist similarity, behavioral signals). |
| **Increase Engagement Time** | Drive higher session length through AI-curated, mood/genre-consistent listening flows. |
| **Community Retention** | Reduce churn to external platforms (Discord/Reddit) by hosting music discussion natively. |
| **Collaborative Growth Loop** | Use collaborative playlists as a viral/organic growth mechanic (invite-based multi-user editing). |
| **Data Moat** | Build a self-improving recommendation model whose accuracy compounds with scale — a long-term competitive advantage. |
| **Premium Audio Differentiation** | Offer studio-grade (EAC-3) audio streaming as a premium tier differentiator. |
| **Personalization Depth** | Support fully customizable lyric display as a unique personalization/branding hook. |

---

## 3. Functional Requirements

### 3.1 Recommendation & Curation
- FR1: System shall analyze the currently playing song/playlist and suggest tracks based on genre and artist similarity.
- FR2: System shall allow a user to select a genre or artist and auto-generate a full playlist.
- FR3: System shall refine future recommendations based on skips, likes, replays, and manual edits.
- FR4: System shall expose a "why this was recommended" explanation per track.

### 3.2 Streaming & Playback
- FR5: System shall support high-quality streaming (EAC-3) and offline downloads.
- FR6: System shall support adaptive bitrate streaming based on network conditions.
- FR7: System shall support background playback and cross-device session handoff.

### 3.3 Collaborative Playlists
- FR8: Multiple users shall be able to edit the same playlist concurrently in real time.
- FR9: System shall resolve concurrent edit conflicts without data loss (CRDT-based merge).
- FR10: System shall show live presence indicators (who's editing/listening).

### 3.4 Community & Discussion
- FR11: System shall provide genre-based text channels.
- FR12: System shall allow threaded discussions attached to a specific song or playlist.
- FR13: System shall support reactions, replies, and mentions within discussion threads.

### 3.5 Lyrics
- FR14: System shall display synced lyrics using pre-built templates.
- FR15: Users shall be able to upload/customize their own lyric display templates.

### 3.6 Account & Personalization
- FR16: System shall support user registration/login (email + OAuth).
- FR17: System shall maintain per-user listening history and preference profiles.
- FR18: System shall support user-level privacy controls (public/private listening activity).

---

## 4. Non-Functional Requirements

| Category | Requirement |
|---|---|
| **Performance** | Recommendation inference latency < 200ms (p95); audio start latency < 1s. |
| **Scalability** | Support horizontal scaling per microservice independently based on load (e.g., streaming vs. chat scale differently). |
| **Availability** | 99.9% uptime target for core streaming and auth services. |
| **Reliability** | Collaborative playlist edits must never be silently lost (CRDT guarantees). |
| **Security** | All data encrypted in transit (TLS 1.3) and at rest (AES-256). |
| **Maintainability** | Each microservice independently deployable, versioned, and testable. |
| **Observability** | Full distributed tracing and centralized logging across services. |
| **Portability** | Core services containerized (Docker) and orchestrated via Docker Compose on a single VM. |
| **Usability** | Recommendation explanations must be understandable to non-technical users. |
| **Compliance** | Music licensing metadata handling must support royalty/reporting requirements. |

---

## 5. System Architecture

VYNL follows a **microservices architecture** deployed as Docker Compose services on a single **Oracle Cloud Always-Free VM** (4 OCPU ARM, 24 GB RAM). The API Gateway (Traefik/Nginx) is the single entry point, event-driven communication runs over **Redis Streams** instead of Kafka, and audio is stored in a **Telegram private channel** via Pyrogram instead of S3/R2.

**Architectural principles:**
- **Database-per-service** — no service directly accesses another's database.
- **Event-driven core** — listening behavior (play/skip/like/replay) is emitted as events via Redis Streams, consumed asynchronously by the Recommendation Engine and Analytics service.
- **Real-time layer** — WebSocket-based services (Playlist, Chat) run independently from the request/response REST services.
- **Stateless services** — all services can scale within the single VM; session/user state lives in Redis/Postgres.
- **Zero-cost infra** — everything except domain registration and the free-tier VM is priced at $0.

---

## 6. System Architecture Diagram

```
                     ┌─────────────────────┐
                     │      Clients         │
                     │  Web (Next.js/CF Pages)│
                     │  Mobile (Flutter)      │
                     └──────────┬───────────┘
                                │ HTTPS / WSS
                     ┌──────────▼───────────┐
                     │  Cloudflare (free)     │  ← edge cache + DDoS/WAF, $0
                     └──────────┬───────────┘
                     ┌──────────▼───────────┐
                     │  Traefik / Nginx       │  ← replaces Kong
                     └──────────┬───────────┘
       ┌───────────────┬───────┼───────────────┬───────────────┐
  ┌────▼────┐   ┌───────▼──────┐ ┌──────▼──────┐ ┌──────▼──────┐
  │ Auth     │   │ Catalog      │ │ Streaming    │ │ Playlist /  │
  │ (FastAPI)│   │ (FastAPI)    │ │ (FastAPI)    │ │ Discussion  │
  └────┬────┘   └──────┬───────┘ └──────┬───────┘ │ (FastAPI+WS)│
       │               │                 │         └──────┬──────┘
       │               │        ┌────────▼────────┐       │
       │               │        │ Pyrogram Storage  │      │
       │               │        │ Worker → Telegram  │      │
       │               │        │ private channel    │      │
       │               │        └────────────────────┘      │
       └───────┬───────┴────────────────┬───────────────────┘
       ┌────────▼────────┐    ┌──────────▼──────────┐
       │ Redis Streams     │◄──►│ Recommendation      │
       │ (event bus + cache)│   │ Engine (FastAPI+FAISS)│
       └────────┬───────────┘   └──────────┬──────────┘
       ┌────────▼────────┐        ┌────────▼────────┐
       │ Postgres (Neon)  │        │ ClickHouse/Postgres│
       │ + MongoDB Atlas  │        │ analytics (self-host)│
       └──────────────────┘        └────────────────────┘

 Everything above right of "Cloudflare" runs as Docker Compose
 services on a single Oracle Cloud Always-Free VM.
```

---

## 7. High Level Components

| Component | Responsibility |
|---|---|
| **API Gateway (Traefik/Nginx)** | Routing, auth token validation, rate limiting, request aggregation. |
| **Auth & User Service** | Identity, sessions, profile data, preferences. |
| **Catalog/Metadata Service** | Song/artist/album/genre metadata, search, full-text search (`tsvector` or Meilisearch). |
| **Streaming Service** | Audio delivery via Telegram/Pyrogram proxy, adaptive streaming, offline packaging. |
| **Recommendation Engine** | Similarity-based + behavioral recommendations, explanations, in-process FAISS index. |
| **Playlist Service** | Real-time collaborative playlist CRUD and sync. |
| **Discussion Hub Service** | Genre channels, song/playlist threads, chat. |
| **Lyrics Service** | Synced lyrics, custom templates. |
| **Analytics & History Service** | Event storage, listening history, feeds model training. |
| **Notification Service** | Push/email notifications for social & playlist activity. |
| **Pyrogram Storage Worker** | Uploads/retrieves audio files from Telegram private channel. |
| **Redis** | Cache, event bus (Redis Streams), task queue broker (Celery). |

---

## 8. Folder Structure

```
vynl/
├── services/
│   ├── auth-service/
│   │   ├── app/
│   │   │   ├── api/            # FastAPI routers
│   │   │   ├── models/         # SQLAlchemy models
│   │   │   ├── schemas/        # Pydantic schemas
│   │   │   ├── core/           # config, security, deps
│   │   │   └── main.py
│   │   ├── tests/
│   │   ├── Dockerfile
│   │   └── requirements.txt
│   ├── catalog-service/
│   ├── streaming-service/
│   │   ├── app/
│   │   │   ├── api/
│   │   │   ├── pyrogram_worker/  # Telegram upload/download logic
│   │   │   └── main.py
│   │   └── ...
│   ├── recommendation-service/
│   │   ├── app/
│   │   │   ├── api/
│   │   │   ├── model/          # trained model artifacts + inference code
│   │   │   ├── faiss_index/    # in-process FAISS index files
│   │   │   ├── training/       # training scripts
│   │   │   └── main.py
│   │   └── ...
│   ├── playlist-service/
│   ├── discussion-service/
│   ├── lyrics-service/
│   ├── analytics-service/
│   └── notification-service/
├── gateway/
│   └── traefik/                # Traefik config (dynamic.yml, acme.json)
├── infra/
│   ├── provisioning/           # Ansible or bash setup script for the free VM
│   └── ci-cd/
│       └── github-actions/
├── clients/
│   ├── web/                    # Next.js → Cloudflare Pages
│   └── mobile/                 # Flutter
├── ml/
│   ├── notebooks/
│   ├── datasets/
│   ├── pipelines/              # Scheduled GitHub Actions or APScheduler jobs
│   └── evaluation/
├── docs/
│   └── VYNL.md
└── docker-compose.yml
```

---

## 9. Tech Stack

| Layer | Technology (Free Redesign) |
|---|---|
| **Backend Framework** | Python — FastAPI (all services, unchanged) |
| **ML/Recommendation** | PyTorch, scikit-learn, Pandas/Polars |
| **Vector Search** | FAISS (in-process, zero infra) |
| **Relational DB** | PostgreSQL — Neon.tech free tier (serverless, 3 GB) or self-hosted Docker on free VM |
| **Document DB** | MongoDB Atlas M0 free tier (512 MB) for chat/threads |
| **Analytics DB** | ClickHouse self-hosted (Docker on free VM) or partitioned Postgres tables |
| **Cache** | Redis (self-hosted Docker or Upstash Redis free tier) |
| **Event Bus** | Redis Streams (no separate broker) |
| **Task Queue** | Celery + Redis (Redis as broker, drop RabbitMQ) |
| **Audio Storage** | Telegram private channel + Pyrogram |
| **CDN** | Cloudflare Free Plan |
| **Search** | Postgres full-text search (`tsvector`) or self-hosted Meilisearch/Typesense |
| **Auth** | JWT (`python-jose`), OAuth2 (`authlib`) — both free, unchanged |
| **Real-time** | FastAPI WebSockets, Ypy (CRDT) — unchanged |
| **Batch/ML Orchestration** | GitHub Actions scheduled workflows or `APScheduler` in-process |
| **Feature Store** | Dropped — compute features in code, cache hot ones in Redis |
| **API Gateway** | Traefik (free, auto-config) or plain Nginx reverse proxy |
| **Containerization** | Docker (unchanged) |
| **Orchestration** | Docker Compose on Oracle Cloud Always-Free VM (4 OCPU ARM, 24 GB RAM) |
| **Service Mesh** | Dropped — unnecessary without multi-node cluster |
| **CI/CD** | GitHub Actions → SSH/rsync + `docker compose pull && up -d` |
| **IaC** | Terraform (free tool) or bash/Ansible provisioning script |
| **Observability** | Prometheus + Grafana + Loki, all self-hosted on the same VM |
| **Secrets Management** | GitHub Actions encrypted secrets + `.env` on VM (or Doppler free tier) |
| **Testing** | Pytest (unchanged) |
| **Web Client** | Next.js on Cloudflare Pages or Vercel free tier |
| **Mobile Client** | Flutter (unchanged, free to build) |

---

## 10. Microservice Architecture

| Service | Owner | Data Store | Communication |
|---|---|---|---|
| Auth & User | Backend | PostgreSQL + Redis | REST (sync) |
| Catalog/Metadata | Backend | PostgreSQL + `tsvector`/Meilisearch | REST (sync) |
| Streaming | Backend | Telegram (Pyrogram) + Redis | REST + CDN (Cloudflare) |
| Recommendation Engine | ML | FAISS (in-process) + Redis | REST (sync) + Redis Streams (async consume) |
| Playlist | Full-stack | PostgreSQL/MongoDB | WebSocket (real-time) |
| Discussion Hub | Full-stack | MongoDB | WebSocket (real-time) |
| Lyrics | ||API calling|
| Analytics & History | ML | ClickHouse (self-hosted) | Redis Streams (async consume) |

**Design rules:**
- Each service owns its schema; no shared database.
- Cross-service reads happen via API calls, never direct DB joins.
- All state-changing events (play, skip, like, edit) are published to Redis Streams (e.g., `listening.events`, `playlist.events`) for downstream consumption.
- Services are versioned independently (`/v1/`, `/v2/`) to allow non-breaking rollout.

---

## 11. API Design

RESTful conventions with resource-based URIs, versioned under `/api/v1/`. WebSocket endpoints used only for Playlist and Discussion services.

### Sample Endpoints

**Auth Service**
```
POST   /api/v1/auth/register
POST   /api/v1/auth/login
POST   /api/v1/auth/refresh
GET    /api/v1/users/{id}
PATCH  /api/v1/users/{id}/preferences
```

**Catalog Service**
```
GET    /api/v1/tracks/{id}
GET    /api/v1/search?q={query}&type=track|artist|album
GET    /api/v1/genres
```

**Recommendation Service**
```
GET    /api/v1/recommendations/next?track_id={id}
GET    /api/v1/recommendations/explain?track_id={id}
POST   /api/v1/playlists/auto-generate   { "seed_type": "genre", "seed_value": "lofi" }
```

**Playlist Service (REST + WS)**
```
POST   /api/v1/playlists
GET    /api/v1/playlists/{id}
WS     /ws/playlists/{id}     # real-time collaborative edits
```

**Discussion Service**
```
GET    /api/v1/channels/{genre}
POST   /api/v1/threads              { "song_id": "...", "message": "..." }
WS     /ws/channels/{channel_id}
```

**Streaming Service**
```
GET    /api/v1/stream/{track_id}/manifest   # HLS/DASH manifest
GET    /api/v1/stream/{track_id}/download   # offline package
```

**Response Envelope (standard across services)**
```json
{
  "success": true,
  "data": { },
  "error": null,
  "meta": { "request_id": "uuid", "timestamp": "iso8601" }
}
```

---

## 12. Database Design

### 12.1 PostgreSQL — Auth/User Service
```
users (id, email, password_hash, display_name, created_at, oauth_provider)
user_preferences (user_id FK, favorite_genres[], explicit_content_allowed, theme)
sessions (id, user_id FK, refresh_token, expires_at)
```

### 12.2 PostgreSQL — Catalog Service
```
tracks (id, title, artist_id FK, album_id FK, genre_id FK, duration_ms, audio_url)  -- audio_url = Telegram file ID resolved via Pyrogram worker
artists (id, name, bio, image_url)
albums (id, title, artist_id FK, release_date)
genres (id, name, parent_genre_id)
```

### 12.3 PostgreSQL/MongoDB — Playlist Service
```
playlists (id, owner_id, title, is_collaborative, created_at)
playlist_tracks (playlist_id FK, track_id FK, position, added_by)
playlist_collaborators (playlist_id FK, user_id FK, role)
```

### 12.4 MongoDB — Discussion Service
```
channels { _id, genre, name, description }
threads { _id, channel_id, song_id, playlist_id, title, created_by }
messages { _id, thread_id, user_id, content, reactions[], created_at }
```

### 12.5 ClickHouse — Analytics Service
```
listening_events (event_id, user_id, track_id, event_type, timestamp, session_id)
-- event_type: play | skip | like | replay | download
```

### 12.6 FAISS Index — Recommendation Engine
```
track_embeddings (track_id, vector[dim], genre_tags[], artist_id)
user_taste_vectors (user_id, vector[dim], last_updated)

# In-process FAISS index on disk: faiss_index/tracks.index
# Loaded into memory at recommendation-service startup
# No external vector DB infrastructure needed
```

---

## 13. Authentication & Authorization

- **Authentication:** Email/password + OAuth2 (Google, Apple) via `authlib`. Passwords hashed with bcrypt/argon2.
- **Tokens:** JWT access tokens (short-lived, ~15 min) + refresh tokens (long-lived, stored hashed in DB, rotation on use).
- **Authorization:** Role-based access control (RBAC) — roles: `listener`, `playlist_collaborator`, `channel_moderator`, `admin`.
- **Service-to-service auth:** Internal network on the Docker Compose overlay — trusted zone; short-lived service JWTs for cross-service API calls.
- **Playlist permissions:** owner / editor / viewer roles enforced at the Playlist Service level before WebSocket edit events are broadcast.
- **API Gateway (Traefik):** validates JWT signature and expiry before routing; downstream services trust the gateway-injected user context header.

---

## 14. Pipelines & Workflows

### 14.1 Data Pipeline (Listening Events → Recommendations)
1. Client emits play/skip/like/replay events → Streaming/Playlist services.
2. Events published to Redis Stream `listening.events`.
3. Analytics Service consumes and writes to ClickHouse (long-term storage).
4. Recommendation Engine consumes the same stream for near-real-time taste vector updates via FAISS index in-place.
5. GitHub Actions scheduled workflow (or `APScheduler` in-process) runs nightly batch retraining using ClickHouse data + FAISS index rebuild.

### 14.2 Playlist Auto-Generation Workflow
1. User selects genre/artist seed → Recommendation Service.
2. Service queries in-process FAISS index for nearest-neighbor tracks.
3. Candidate list filtered by user taste vector + explicit content preferences.
4. Playlist Service creates a new playlist populated with the result.

### 14.3 CI/CD Pipeline
1. PR opened → GitHub Actions runs lint + Pytest per service.
2. On merge to `main` → Docker image built and pushed to container registry.
3. GitHub Actions workflow SSHes into the Oracle VM → `docker compose pull && docker compose up -d`.

---

## 15. Event Flow

**Redis Streams:**

| Stream | Producers | Consumers |
|---|---|---|
| `listening.events` | Streaming, Playlist Service | Analytics, Recommendation Engine |
| `playlist.events` | Playlist Service | Notification, Analytics |
| `discussion.events` | Discussion Hub | Notification, Analytics |
| `user.events` | Auth Service | Analytics, Notification |
| `model.retrain.trigger` | GitHub Actions / APScheduler | Recommendation Engine |

**Example flow — user likes a song:**
```
Client → Streaming Service (like action)
       → Redis Stream: listening.events {user_id, track_id, type: "like"}
           ├── Analytics Service: persists to ClickHouse
           └── Recommendation Engine: updates user_taste_vector in FAISS index
                   → next recommendation call reflects updated taste immediately
```

---

## 16. AI/ML Architecture

**Goal:** Recommend tracks based on (a) content similarity — genre/artist embeddings, and (b) collaborative/behavioral signals — skips, likes, replays.

**Architecture:**
- **Embedding Layer:** Tracks embedded into a shared vector space using audio features (tempo, key, timbre via `librosa`/spectrogram CNN) + metadata (genre, artist, era) via a two-tower model.
- **Two-Tower Model:**
  - *Item tower:* encodes track features → track embedding.
  - *User tower:* encodes listening history/taste profile → user embedding.
  - Similarity (cosine/dot-product) between towers ranks candidate tracks.
- **Candidate Generation:** Approximate Nearest Neighbor (ANN) search via **FAISS** (in-process library) narrows the full catalog to a top-K candidate set — zero infrastructure, loads index into memory at service startup.
- **Re-ranking Layer:** Lightweight gradient-boosted model (LightGBM) re-ranks candidates using recency, skip-rate, and session context.
- **Explainability Layer:** For each recommendation, the top contributing similarity signal (e.g., "similar artist to X", "matches your recent lo-fi listening") is surfaced.
- **Online Learning Loop:** User taste vectors updated incrementally on each play/skip/like event (streaming update, not full retrain).

---

## 17. Model Training Guide

### 17.1 Data Requirements
- Track metadata (genre, artist, tempo, key) from Catalog Service.
- Listening event logs (play, skip, like, replay, duration listened) from ClickHouse.
- Minimum recommended: 3–6 months of listening history for meaningful behavioral signal.

### 17.2 Training Steps
1. **Data extraction:** Pull labeled interaction data from ClickHouse via scheduled GitHub Actions workflow (or `APScheduler` in-process).
2. **Feature engineering:** Generate track audio features (`librosa`) and normalize metadata features (genre one-hot/embedding, artist embedding).
3. **Two-tower model training:**
   ```
   python ml/pipelines/train_two_tower.py \
       --data-path /data/interactions.parquet \
       --epochs 20 --batch-size 512 --embedding-dim 128
   ```
4. **Negative sampling:** Use in-batch negatives + hard negatives (skipped tracks) to improve discrimination.
5. **Re-ranker training:** Train LightGBM on (candidate, context) pairs with skip/like as labels.
6. **Embedding export:** Build and save the FAISS index to `faiss_index/tracks.index`.
7. **Validation split:** Hold out most recent 2 weeks of interaction data as validation.

### 17.3 Retraining Cadence
- Embedding refresh: nightly (incremental, via GitHub Actions schedule).
- Full model retrain: weekly, triggered via GitHub Actions scheduled workflow or `APScheduler` job.

---

## 18. Model Evaluation

| Metric | Purpose |
|---|---|
| **Precision@K / Recall@K** | Measures relevance of top-K recommended tracks. |
| **NDCG@K** | Measures ranking quality, rewarding relevant tracks placed higher. |
| **Skip Rate** | Lower skip rate on recommended tracks indicates better relevance. |
| **Session Length Lift** | A/B comparison of session duration with vs. without AI curation. |
| **Explanation Agreement Score** | User survey/feedback on whether the stated recommendation reason "made sense." |
| **Coverage** | % of catalog surfaced across all users (avoids over-recommending popular tracks). |
| **Diversity** | Intra-list similarity to ensure playlists aren't overly repetitive. |

**Evaluation workflow:** offline metrics computed on holdout set after each training run → gate deployment if Precision@10 or NDCG@10 regresses beyond a set threshold (e.g., >3% drop) → online A/B test on a small user cohort before full rollout.

---

## 19. Model Deployment

- **Serving:** Trained model wrapped in FastAPI inference service (`recommendation-service`), model artifacts (PyTorch weights + FAISS index) loaded from a Docker volume bind-mount at container startup.
- **Versioning:** Models tagged (`model-v1.2.0`) and stored alongside the repo or in a simple file registry (e.g., Git LFS or a local directory).
- **Rollback:** Previous model version kept on disk; instant rollback via Docker volume mount path change or `docker compose restart`.
- **Scaling:** Single VM limits vertical scaling; inference handled in-process by FAISS (sub-ms lookup) + PyTorch (GPU if ARM NPU available).
- **Batch vs. Real-time:** FAISS index rebuild runs as nightly scheduled job; user taste vector updates happen in near real-time via Redis Streams consumer.

---

## 20. Infrastructure

- **Host:** Oracle Cloud "Always Free" VM (4 OCPU ARM, 24 GB RAM) — free forever.
- **Containerization:** Docker Compose runs all services on the single VM; no cluster needed.
- **API Gateway:** Traefik (free, auto-config with Let's Encrypt TLS) or plain Nginx reverse proxy.
- **CDN:** Cloudflare Free Plan cached in front of the Streaming Service for audio delivery.
- **Audio Storage:** Telegram private channel accessed via Pyrogram — $0.
- **Event Bus:** Redis Streams replaces Kafka — no separate broker to manage.
- **Secrets:** GitHub Actions encrypted secrets for CI, `.env` file on the VM.
- **CI/CD:** GitHub Actions → SSH/rsync to the VM → `docker compose pull && up -d` (no ArgoCD, no cluster to sync).
- **IaC:** Terraform (free tool) for the VM, or skip and use a bash/Ansible provisioning script.
- **Observability:** Prometheus + Grafana + Loki, all self-hosted on the same VM (lighter stack than ELK).
- **Environments:** `dev` → `prod` promoted manually via Git tags / GitHub Actions workflow gates.

---

## 24. Security

- **Transport Security:** TLS 1.3 via Traefik automatic Let's Encrypt certificates; internal traffic over Docker Compose network (trusted zone).
- **Data at Rest:** AES-256 encryption for databases and Telegram-hosted audio.
- **Secrets Management:** No secrets in code/config; GitHub Actions encrypted secrets for CI, `.env` file on the VM (locked down).
- **Input Validation:** Pydantic schema validation on all FastAPI endpoints.
- **Rate Limiting:** Enforced at API Gateway (Traefik) per user/IP to prevent abuse.
- **Content Moderation:** Automated filtering (profanity/toxicity model) on Discussion Hub messages before broadcast.
- **Audit Logging:** All auth events and playlist/permission changes logged immutably to ClickHouse.
- **Dependency Scanning:** Automated CVE scanning (e.g., Trivy, `pip-audit`) in CI pipeline for all Docker images.
- **DDoS Protection:** Cloudflare Free Plan WAF/CDN layer in front of the gateway.

---

## 25. Scalability

- **Vertical Scaling:** Single Oracle VM (4 OCPU, 24 GB RAM) — upgrade to a larger VM or add a second VM when scale demands it.
- **Hot Paths:** Streaming and Recommendation services optimized for CPU/memory on the single VM; Redis caches hot tracks, trending playlists to reduce DB load.
- **Caching:** Redis caches hot tracks, trending playlists, and frequently requested recommendations to reduce DB/model load.
- **Database Scaling:** Neon.tech Postgres scales serverless; ClickHouse self-hosted on the same VM retains analytics at moderate scale.
- **Redis Streams Consumer Groups:** Partition consumption across workers for the same stream without a separate broker.
- **CDN Offload:** Cloudflare edge cache reduces load on the Streaming Service for repeated audio requests.
- **FAISS:** In-process ANN search is memory-bound; the index can handle millions of vectors in < 1 GB RAM on the free VM.

---

## 27. Testing Strategy

| Level | Approach |
|---|---|
| **Unit Tests** | Pytest per service, covering business logic, schema validation, edge cases. |
| **Integration Tests** | Test service-to-service contracts using local Docker Compose (Redis, Postgres, etc.). |
| **Contract Tests** | Pact or similar to ensure API compatibility across service versions. |
| **Load Testing** | Locust/k6 against Streaming and Recommendation services to validate latency SLAs under load. |
| **ML Model Testing** | Offline metric regression tests (Precision@K, NDCG) run in CI before model promotion. |
| **E2E Testing** | Playwright/Cypress for critical user flows (login → play → collaborative edit → chat). |

---

## 30. Development Workflow

1. **Branching:** Trunk-based development with short-lived feature branches (`feature/<ticket-id>-desc`).
2. **Local Dev:** `docker compose up` spins up all services + dependencies (Postgres, MongoDB, Redis, ClickHouse) locally.
3. **Code Review:** PR requires at least 1 approval + passing CI (lint, Pytest, type-check via `mypy`).
4. **Linting/Formatting:** `ruff` + `black` enforced via pre-commit hooks.
5. **Commit Convention:** Conventional Commits (`feat:`, `fix:`, `chore:`) for changelog automation.
6. **Issue Tracking:** GitHub Projects/Jira mapped to sprints.

---

## 31. Deployment Guide

1. **Build:** GitHub Actions builds a Docker image per service on merge to `main`.
2. **Push:** Image pushed to Docker Hub or GitHub Container Registry, tagged with commit SHA.
3. **Deploy:** GitHub Actions workflow SSHes into the Oracle Cloud VM:
   ```bash
   ssh user@oracle-vm
   cd /opt/vynl
   docker compose pull
   docker compose up -d
   ```
4. **Smoke Tests:** Automated smoke tests run against the staging compose profile.
5. **Rollback:** Previous Docker image tag is kept; re-run `docker compose up -d` with the prior tag.
6. **Post-Deploy:** Health checks + Grafana dashboards monitored for 30 minutes post-release.

---

## 32. Future Enhancements

- Federated/open discussion protocol (e.g., Matrix) for cross-platform community reach.
- Podcast and audiobook support within the same recommendation framework.
- Artist-facing analytics dashboard (listener demographics, skip points).
- Live listening rooms (synchronized playback + voice chat).
- On-device recommendation caching for offline-first mobile experience.
- Multi-modal recommendations incorporating lyrics sentiment analysis.
- Integration with wearable devices for mood-based auto-curation (heart rate, activity).

---

## 33. Appendix

**A. Team & Roles**
| Name | Roll No. | Role |
|---|---|---|
| Dhairya Shah | 24IT090 | Full-Stack / App Development / ML |
| Maharsh Solanki | 24IT093 | Backend / Infrastructure & Streaming |
| Milan Vadhel | 24IT101 | Recommendation Engine Lead / ML |

**B. Glossary**
- **CRDT** — Conflict-free Replicated Data Type; enables real-time collaborative editing without central locking.
- **ANN** — Approximate Nearest Neighbor search, used for fast similarity lookup via FAISS (in-process index).
- **Two-Tower Model** — A recommendation architecture with separate encoders for users and items, compared via similarity in shared embedding space.
- **NDCG** — Normalized Discounted Cumulative Gain, a ranking quality metric.
- **EAC-3** — Enhanced AC-3, a high-fidelity audio codec used for premium streaming quality.

**C. Reference Diagram Legend**
- Solid arrows: synchronous REST/WebSocket calls.
- Redis Streams: asynchronous event-driven communication (replaces Kafka).
- Dashed boundaries (conceptual): independently deployable service units.
- Cloudflare edge: Free Plan caching + DDoS/WAF in front of the gateway.

---

*Document maintained under `docs/VYNL.md`. Last updated: July 2026.*