# VYNL Service Contracts & Interfaces

This document defines the contractual agreements between `playlist-service`, `wrap-service`, `web`, and external microservices owned by other developers.

---

## 1. HTTP Conventions

- **Base Path**: `/v1` prefix on all public routes.
- **Payload Format**: `application/json; charset=utf-8`.
- **Idempotency**: POST requests that create resources or trigger jobs accept an `Idempotency-Key: <uuid|string>` header.
- **Optimistic Concurrency**:
  - Mutating requests on versioned resources require `If-Match: "<version>"`. Missing header returns `428 Precondition Required`. Stale version returns `412 Precondition Failed`.
  - Responses return the new version in the `ETag: "<version>"` header.
- **Asynchronous Operations**: Not-yet-ready resources return `202 Accepted` with a `Location: /v1/...` header and optional `job_id`.
- **Rate Limiting**: `429 Too Many Requests` responses must include a `Retry-After: <seconds>` header.
- **Request Tracing**: Every response echoes `X-Request-ID: <uuid>` and emits standard W3C `traceparent`.

---

## 2. Authentication & Session Contract (Owned by Auth Dev)

- **Cookie**: `vynl_session` (HttpOnly, Secure, SameSite=Lax). Contains an opaque session token.
- **CSRF Protection**: Double-submit cookie `csrf_token` and request header `X-CSRF-Token`.
- **Endpoints**:
  - `GET /v1/auth/me` -> `200 {"user_id": "uuid", "display_name": "string", "avatar_url": "string"}` or `401 Unauthorized`.
  - `GET /v1/auth/google/start?return_to=/path` -> `302 Redirect` to Google OAuth.
  - `POST /v1/auth/logout` -> `200 {"status": "ok"}` (clears session cookie).

---

## 3. Song Catalog & Streaming Contract (Owned by Streaming Dev)

- **Endpoints**:
  - `GET /v1/songs/search?q={query}&limit={limit}` -> `200 {"items": [Song]}`.
  - `POST /v1/songs/{id}/resolve` -> `200 {"song": Song, "link": {"url": "string", "expires_at": "ISO-8601"}}` or `202 Accepted` with `Location: /v1/songs/{id}`.
  - `GET /v1/songs/{id}` -> `200 {"id": "uuid", "title": "string", "status": "NEW|ACQUIRING|READY|FAILED", "attributes": {...}}`.
  - `GET /v1/songs/{id}/lyrics` -> `200 {"synced": bool, "lines": [{"t_ms": int, "text": "string"}]}` or `200 {"synced": false, "text": "string"}`.
  - `GET /v1/songs/{id}?dl=1` -> `200 {"url": "string", "expires_at": "ISO-8601"}` (download URL).
- **Security Rule**: Storage file references, Telegram internal IDs, and raw bucket keys are never returned to clients.

---

## 4. Server-Sent Events (SSE) Contract

- **Endpoint**: `GET /v1/events` (`text/event-stream`).
- **Heartbeat**: Comment ping `: heartbeat\n\n` emitted every 15 seconds.
- **Envelope**:
  ```
  id: <event_id>
  event: <event_type>
  data: {"key": "value"}
  ```
- **Event Types**:
  - `job.completed`, `job.failed`
  - `draft.ready` (`{"draft_id": "uuid"}`)
  - `song.ready`, `song.enriched`
  - `suggestions.ready` (`{"playlist_id": "uuid", "suggestion_id": "uuid"}`)

---

## 5. Activity Ingestion Contract (Owned by Activity Dev)

- **Endpoint**: `POST /v1/activity/batch`
- **Request Body**:
  ```json
  {
    "events": [
      {
        "event_id": "uuid",
        "type": "play|skip|like|search|queue_add|queue_remove|playlist_add|playlist_remove|playlist_reorder|playlist_generate|playlist_save|rec_accept|rec_reject|rec_explanation_view|download",
        "ts": "2026-10-06T22:00:00Z",
        "song_id": "uuid",
        "playlist_id": "uuid",
        "listened_ms": 32500,
        "meta": {}
      }
    ],
    "csrf": "optional_token_for_beacon"
  }
  ```
- Maximum batch size: 100 events. Ingestion is idempotent on `event_id`.

---

## 6. Internal Service-to-Service Authentication

- **Header**: `X-Internal-Auth: <hmac-signature>`
- **Signature Calculation**: HMAC-SHA256 over `"{method}\n{path}\n{timestamp}\n{request_id}"` using shared secret `INTERNAL_AUTH_SECRET`.
- **Clock Skew**: Maximum allowable timestamp skew is 60 seconds.
- **Protected Endpoints**:
  - `DELETE /users/{id}/data` (PII deletion fan-out)
  - `PUT /internal/drafts/{id}` (LLM worker draft emission)
  - `GET /internal/playlists/{id}/context` (Recommender context)

---

## 7. Job Streams Contract (Redis Streams)

- **Stream Naming**: `vynl:jobs:{job_name}`
- **Consumer Group**: `workers`
- **DLQ Stream**: `vynl:jobs:dlq`
- **Envelope Fields**: `job_id`, `traceparent`, `payload`, `attempt`, `enqueued_at`, `dedupe_key`.
- **Deduplication**: Atomic `SET NX` key `vynl:dedupe:{dedupe_key}` with job-specific TTL.
