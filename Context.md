# Context.md — VYNL Project State

**Living Context Document** (Maintained per `RULES.md §8.1` & `UISKILL.md §12`).

---

## 1. Project Overview & Mission

**VYNL** is an AI-powered, glassmorphic music streaming web application designed around a continuous personalization loop.
This repository encompasses Dhairya's ownership slice: **50 tasks** across three primary codebases and supporting libraries:
- `playlist-service`: FastAPI application + background workers (personal playlists, Redis drafts, fractional-indexing atomic reordering, collaborative WebSocket protocol, invites, collaborative AI triggers).
- `wrap-service`: FastAPI application + background workers + scheduler (monthly listening insights aggregation, UTC calendar metrics, scheduled leader generation, write-through caching, rate-limited user refreshes).
- `web`: React 18 + Vite + TypeScript frontend (dark-themed glassmorphic UI based on `Design.md` & `UISKILL.md`, player persistence, synchronized lyrics, custom backdrops, audio downloads, AI wizard, collaborative editing).
- `shared/service-kit`: Shared Python library (config validation, JSON logging with secret redaction, Rev2 Flow 0 middleware, SessionVerifier, raw SQL asyncpg pool, Redis Streams job runner with DLQ, resilience/circuit breakers, graceful shutdown, OTel/Prometheus).
- `shared/contracts`: Shared OpenAPI specs, JSON Schemas, WebSocket/SSE/job/event schemas, and shared error contract tests.
- `infra/`: Docker compose orchestration, dev/test platform stubs, Prometheus scrape configs & alert rules, Jaeger, TLS proxy.
- `scripts/`: Verification scripts for zero-downtime rolling restarts, chaos injection, secret canary log auditing, and full task ledger verification.

---

## 2. Directory Structure

```
/
├── Context.md                               # Living context document (this file)
├── Changelog.md                             # Running log of changes (RULES.md §8.1)
├── Makefile                                 # Monorepo build and verification commands
├── docs/                                    # System architecture, schemas, and specifications
│   ├── source/                              # Source reference documents
│   ├── TASK_LEDGER.md                       # Master 50-task ledger
│   ├── ASSUMPTIONS.md                       # Architectural decisions and conflict resolutions
│   ├── CONTRACTS.md                         # API, SSE, WS, and job contracts
│   ├── AUTHZ.md                             # Service-layer authorization matrix
│   ├── METRIC_DEFINITIONS.md                # Monthly wrap exact calculation rules
│   ├── WRAP_PAYLOAD.md                      # Monthly wrap JSON schema
│   ├── ERROR_MAPPING.md                     # Rev2 Appendix B status mappings
│   ├── DELETION_MATRIX.md                   # Ownership & PII purge matrix
│   ├── OBSERVABILITY.md                     # W3C traceparent propagation guide
│   ├── METRICS.md                           # Prometheus metrics dictionary & rules
│   └── chaos/                               # Chaos testing scripts and reports
├── shared/
│   ├── service-kit/                         # Reusable Python package for backend services
│   └── contracts/                           # JSON Schemas, OpenAPI, shared contract tests
├── playlist-service/                        # FastAPI personal/collaborative playlist service
├── wrap-service/                            # FastAPI monthly wrap service
├── web/                                     # React 18 + Vite + TypeScript web client
├── infra/                                   # Compose, configs, and dev platform stub
└── scripts/                                 # Automated audit and verification scripts
```

---

## 3. Technology Stack & Key Patterns

- **Backend Stack**: Python 3.12, FastAPI, Uvicorn, raw SQL with `asyncpg` (strictly no ORM), Pydantic v2 (`extra="forbid"`), `redis.asyncio` (Streams, token bucket, pub/sub, locks, caching), `httpx`, OpenTelemetry, `prometheus-client`, Pytest, Hypothesis.
- **Frontend Stack**: React 18, Vite, TypeScript (strict), CSS Modules, Framer Motion (`framer-motion`), React Router v6, TanStack Query, Zustand (player & session state), `@dnd-kit` (accessible drag-and-drop), Vitest, Playwright, `@axe-core/playwright`.
- **Database Architecture**: PostgreSQL 16 schemas (`playlist.*`, `wrap.*`). Tables owned by other developers (`users`, `sessions`, `songs`, `activity_*`) exist only in dev/test platform stubs and are never part of service migrations.
- **Concurrency & Locking**:
  - Row versioning (`version int default 1`) with `If-Match` / `ETag`.
  - Version bump `UPDATE playlists SET version = version + 1 WHERE id=$1 AND version=$2 RETURNING version;` executed as the first statement in mutating transactions to lock the row.
  - Fractional-indexing (`fractional.py`) over base-62 digits with PostgreSQL `COLLATE "C"`.
- **Outbox Pattern**:
  - Mutating transactions write logical activity events into `activity_outbox` within the same transaction. A worker flushes outbox records to `/v1/activity/batch`.
- **Error Semantics**: Centralized in `service-kit.errors` adhering to Rev2 Appendix B (`{"error": {"code": str, "message": str, "fields"?: [...]}, "request_id": str}`).

---

## 4. Active Categories State

### 4.1 Dev
- **Implemented**:
  - Phase 1 architectural documents, contracts, authorization matrix, error mappings, deletion matrices, and living documentation.
  - Completed backend tasks (22/50):
    - F10-3 (Fractional indexing, commit 9235907)
    - F10-1 (Playlist CRUD with authz, commit 37ae21f)
    - F10-2 (Optimistic locking 428/412, commit 5f72ea4)
    - F10-4 (Add/remove/reorder items atomic + 500 cap, commit aea218f)
    - F9-3-b (Redis drafts TTL and caps, commit 6f38eb2)
    - F9-4 (Save draft as playlist atomic rollback, commit 9714acf)
    - F10-5-a-b (Playlists as playback source/context <=50 tokens, commit a90852e)
    - F11-1 (Collaborators and HMAC single-use invites, commit 7523d34)
    - F11-2-a (WebSocket connection auth & 50-socket cluster limit, commit 2ff67c8)
    - F11-3 (Edit message protocol & role-enforced frames, commit f711854)
    - F11-4 (Versioned updates & 5-client convergence, commit 62d048c)
    - F11-5 (Redis pub/sub multi-node fan-out, commit 6adc8c5)
    - F11-6 (Close codes 1001/4403 & graceful draining, commit 1072658)
    - F12-1-b (Collaborative AI trigger deduplication, commit 2e82849)
    - F12-3-b (Broadcast suggestions & accept/reject, commit 11b94d7)
    - F17-1 (Metric definitions & pure engine, commit 0b4f1f6)
    - F17-2 (Monthly wrap aggregation golden fixtures, commit 24ecdab)
    - F17-3 (Scheduled generation leader election & 500-user batches, commit 5e2435f)
    - F17-4 (Wrap endpoints & 429 Retry-After, commit 6e795a5)
    - F17-5 (Wrap caching layer & dual TTL policies, commit 2c2d05b)
    - F19-4-a-b (Retry backoff, full jitter, circuit breaker, commit a66013a)
    - F19-6-c-b (Unified error mapping contract, commit 433ae1a)
- **In-Progress**: Cross-cutting backend tasks (F20-2-c-b, F20-5-c-b, O-1-c-b, O-2-c-b, F19-5-c-b, F20-1-c-b, P-5-c-b).
- **Planned**: React 18 + Vite frontend client (`web`) and end-to-end verification.

### 4.2 UI/Motion (per UISKILL.md)
- **Palette**: `#0F0F0F` background, white foreground with translucency (80%, 60%, 8%), soft glass fills (`backdrop-filter: blur(10px - 27px)` with solid fallback).
- **Typography**: Display font `Zen Dots` (wordmark, hero moments); Body font `Urbanist` (labels, rows, meta).
- **Motion Budget**: Restrained functional transitions; standard durations (100ms, 150ms, 250ms, 400ms); `prefers-reduced-motion` fallbacks across all motion primitives.

### 4.3 Audit Findings & Security Posture
- CSRF double-submit token checking on all state-changing endpoints.
- Cookie configuration: `vynl_session` with `HttpOnly`, `Secure`, `SameSite=Lax`.
- Zero credential logging; structured JSON logs filtered by redaction engine for tokens, URLs, and planted canary values.
