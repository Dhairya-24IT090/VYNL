# Changelog.md — VYNL Work History

All notable changes across all categories (Dev, SEO, UI, Audit) are documented here in reverse-chronological order per `RULES.md §8.1`.

---

## [2026-10-07 00:05]

### [Category: Dev & UI] — Frontend Web Client Implementation and 50/50 Task Completion (Commit 15d41bd)
What changed:
- Built full React 19 + Vite 8 + TypeScript client in `web/` with dark glassmorphic design system (`#0F0F0F`, `#FFFFFF`, Urbanist and Zen Dots fonts, `backdrop-filter: blur(20px)`).
- Implemented and verified all 21 frontend tasks with 48 automated Vitest unit/integration specs in `web/tests/`:
  - `F1-8` (`tests/auth.test.tsx`): AuthGuard and persistent session across refresh, 14-day expiry check, auto logout on expiration.
  - `F2-6` (`tests/search.test.tsx`): Debounced search (1 request per pause), error retry banner recovery.
  - `F3-18` (`tests/player.test.tsx`): Continuous audio playback across expired presigned URLs without interruption.
  - `F3-19-b` (`tests/perf.test.tsx`): Performance target dashboard tracking p95 vs strict SLA targets (TTFB, LCP, INP, audio start, lyric seek).
  - `F5-7` (`tests/now_playing.test.tsx`): Now playing metadata panel with graceful fallback on missing fields and instant enrichment.
  - `F6-3` (`tests/download.test.tsx`): Cross-browser blob downloader with progress bar, cancellation, and mobile/desktop support.
  - `F7-11` (`tests/recommendations.test.tsx`): Recommendation cards logging user interactions into telemetry activity buffer.
  - `F9-5` (`tests/wizard.test.tsx`): AI playlist generation wizard adjusting seeds, previewing drafts, and saving as playlist in-flow.
  - `F10-6` (`tests/playlist_ui.test.tsx`): Playlist editor with 412 optimistic locking conflict recovery and zero data loss.
  - `F12-4` (`tests/collab_ui.test.tsx`): Collaborative playlist room with peer presence and broadcasted AI suggestions.
  - `F13-3` (`tests/lyrics_sync.test.tsx`): Synchronized LRC lyrics parser with sub-50ms seek highlighting.
  - `F14-1` (`tests/backdrops.test.tsx`): Pre-designed glass backdrops ensuring readable high-contrast (#FFFFFF) typography.
  - `F14-2-b` (`tests/backdrop_upload.test.tsx`): Custom backdrop file upload with magic byte inspection rejecting disguised scripts/binaries.
  - `F14-4` (`tests/lyrics_screen.test.tsx`): Fullscreen synchronized lyrics screen for mobile and desktop viewports.
  - `F15-4` (`tests/event_buffer.test.tsx`): Client telemetry buffer in localStorage with `navigator.sendBeacon` dispatch on unload.
  - `F17-6` (`tests/wrap_ui.test.tsx`): Monthly wrap viewing interface with streak cards, top artists/tracks, and empty state handling.
  - `F18-1-a` (`tests/app_shell.test.tsx`): ApiClient with W3C `traceparent` injection, CSRF double-submit token attachment, SSE reconnection.
  - `F18-2` (`tests/player_queue.test.tsx`): Audio player and queue persistence across client route transitions.
  - `F18-3` (`tests/core_pages.test.tsx`): Full reachability and routing of all 7 core application pages.
  - `F18-4` (`tests/realtime_client.test.tsx`): Real-time collaborative clients automatically recovering from network drops with message queueing.
  - `F18-5` (`tests/a11y.test.tsx`): Accessibility audit verifying landmarks, button labels, and `prefers-reduced-motion` compliance.
- Master task ledger (`docs/TASK_LEDGER.md`) updated: all 50/50 tasks verified and marked `DONE`.
Why:
- Completes the entire 50-task scope assigned to Dhairya for VYNL.
Bug fixed: N/A.
Root cause: N/A.



### [Category: Dev] — F19-6-c-b Unified Error Mapping Contract Across Services
What changed:
- Implemented `register_error_handlers(app: FastAPI)` in `shared/service-kit/service_kit/errors.py`.
- Formatted `RequestValidationError` (422) and `AppException` into strict Rev2 Appendix B error JSON responses (`{"error": {"code": "...", "message": "...", "fields": [...]}, "request_id": "<uuid>"}`).
- Updated `playlist-service` and `wrap-service` application factories to register global error handlers.
- Updated `list_playlists` in `playlist_service/service.py` to require authentication, raising `UnauthorizedError` (401) when actor is anonymous.
- Verified in `shared/contracts/error_contract/test_errors.py` against both `playlist-service` and `wrap-service`: invalid request payload yields 422 standard schema, unauthenticated yields 401 standard schema, hidden resource yields 404, with zero sensitive tracebacks or internal query leaks.
Why:
- Requirement [F19-6-c-b]: cross-service API response consistency, security hygiene, and error contract enforcement.
Bug fixed: Unhandled validation errors previously bypassed middleware formatting.
Root cause: FastAPI's default exception handler took precedence over Starlette middleware for body validation failures.

## [2026-10-06 23:40]

### [Category: Dev] — F19-4-a-b Exponential Backoff, Full Jitter, and Circuit Breaker Probing
What changed:
- Implemented `CircuitBreaker` and `retry_with_backoff` in `shared/service-kit/service_kit/resilience.py`.
- Formulated exponential backoff with full jitter formula (`uniform(0, min(max_delay, base_delay * 2**(attempt - 1)))`), preventing thundering herd problems on downstream dependencies.
- Implemented state machine for circuit breaker (`CLOSED` -> `OPEN` -> `HALF_OPEN` -> `CLOSED`), fast-failing open circuits with `DependencyUnavailableError` (503) and `Retry-After`, and probing downstream recovery via single canary calls during `HALF_OPEN`.
- Verified in `shared/service-kit/tests/test_resilience.py`: jitter bounds across retry attempts, retry exhaustion raising original exception, consecutive failure tripping, fail-fast rejection, and single-probe recovery/re-tripping.
Why:
- Requirement [F19-4-a-b]: fault isolation preventing cascading failures across microservices.
Bug fixed: N/A.
Root cause: N/A.


### [Category: Dev] — F17-5 Wrap Caching Layer and Dual TTL Policies
What changed:
- Implemented `WrapCache` in `wrap_service/caching.py` backed by Redis with write-through and read-through caching semantics.
- Formulated differentiated TTL rules: past months / finalized wraps cache with a 30-day TTL (`2,592,000s`); current ongoing months cache with a 10-minute TTL (`600s`).
- Built complete `wrap_service/main.py` application entrypoint with graceful shutdown and middleware integration.
- Verified in `wrap-service/tests/test_wrap_cache.py` with real Redis: repeated reads hit cache directly without querying repository; TTL duration verified for past vs current months.
Why:
- Requirement [F17-5]: optimizes read performance, mitigating database load during high-traffic monthly wrap viewing spikes.
Bug fixed: N/A.
Root cause: N/A.


### [Category: Dev] — F17-4 Monthly Wrap Endpoints and 429 Retry-After Enforcement
What changed:
- Implemented `GET /v1/wrap/{period}` and `POST /v1/wrap/current/refresh` in `wrap_service/routes/wrap.py` and `wrap_service/service.py`.
- Enforced strict authorization per `docs/AUTHZ.md`: users can view only their own wrap (200), strangers accessing another user's wrap receive 403 Forbidden, and unauthenticated requests receive 401 Unauthorized.
- Implemented on-demand refresh with rate limiting: refreshing current wrap returns 202 Accepted with `Location: /v1/wrap/{period}`; exceeding the 60-second cooldown rate limit returns `429 Too Many Requests` with a mandatory `Retry-After: <seconds>` response header.
- Verified in `wrap-service/tests/test_wrap_endpoints.py`: 200 on existing wrap, 404 on missing wrap, 403 on stranger access, 401 on unauthenticated, and 429 with `Retry-After` on burst refresh attempts.
Why:
- Requirement [F17-4]: secure API delivery with defense against refresh flooding and DDOS.
Bug fixed: N/A.
Root cause: N/A.


### [Category: Dev] — F17-3 Scheduled Wrap Generation and Idempotent Batches
What changed:
- Implemented `WrapScheduler` in `wrap_service/scheduler.py` managing monthly batch wrap computation.
- Integrated distributed leader election guard to ensure single runner across multi-replica deployments.
- Implemented 500-user keyset batch pagination (`WHERE id > :last_id ORDER BY id ASC LIMIT 500`).
- Implemented strict idempotency checks (`has_final_wrap`): reruns skip completed users with zero double-computation.
- Verified in `wrap-service/tests/test_scheduler.py`: leader election halts non-leader replicas; 1,250 users processed across 3 keyset batches (500 + 500 + 250); reruns process 0 users and skip 1,250 with zero database changes.
Why:
- Requirement [F17-3]: safe, scalable, and crash-resilient automated monthly wrap generation.
Bug fixed: N/A.
Root cause: N/A.


### [Category: Dev] — F17-2 Monthly Wrap Aggregator and Golden Fixture Verification
What changed:
- Implemented `WrapAggregator` in `wrap_service/aggregation.py` integrating daily rollups and raw activity streams into complete Monthly Wrap payloads matching `docs/WRAP_PAYLOAD.md`.
- Evaluated multi-artist equal attribution, genre aggregation, streak tracking, and 12-month historical artist lookups.
- Verified in `wrap-service/tests/test_aggregator.py`: exact match against hand-calculated golden fixtures across total listening time (260,000ms), 5 counted plays, 2 skips (skip rate 0.286), unique entity counts, newly discovered artists, streaks, peak hours, and daily rollups.
Why:
- Requirement [F17-2]: deterministic data aggregation ensuring identical analytics across all executions.
Bug fixed: N/A.
Root cause: N/A.


### [Category: Dev] — F17-1 Wrap Metric Definitions and Pure Computation Engine
What changed:
- Implemented pure computation engine `wrap_service/metrics_defs.py` with zero network and database dependencies.
- Formulated exact mathematical rules: strict UTC `[period_start, next_month_start)` temporal boundaries, 30,000ms counted play precision threshold, dual classification for explicit skips >= 30,000ms, replay counting (`max(0, plays - 1)`), 12-month historical artist exclusion window boundary for discovery, longest daily active streak, peak hour and 24h / 7d histograms, and empty history payload formatting.
- Verified in `wrap-service/tests/test_metrics_defs.py`: 30s threshold boundaries (29,999 vs 30,000 ms), skip/dual classifications, UTC month and leap year boundaries, loop repeat counts, newly discovered artist exclusion window precision, longest streak days, and empty periods.
Why:
- Requirement [F17-1]: authoritative and deterministic monthly listening analytics engine.
Bug fixed: N/A.
Root cause: N/A.


### [Category: Dev] — F12-3-b Broadcast AI Suggestions and Editor Accept/Reject Lifecycle
What changed:
- Implemented real-time AI suggestions broadcast and lifecycle management in `playlist_service/ws.py`.
- Connected sockets receive real-time `suggestions` frame broadcasts upon generation.
- Implemented editor accept flow: editor sends `{"op": "add", "suggestion_id": "...", "base_version": ...}`, which resolves suggested song, marks suggestion status `accepted`, adds song through standard versioned edit path (`service.add_item`), broadcasts `op_applied` with incremented version, and broadcasts updated suggestions state.
- Implemented editor reject flow: editor sends `{"op": "suggestion.reject", "suggestion_id": "..."}`, marking suggestion status `rejected` and broadcasting update without mutating playlist version.
- Enforced role permissions: viewers attempting to accept or reject suggestions are rejected with error frame `{"type": "error", "code": "forbidden"}`.
- Verified in `playlist-service/tests/test_broadcast_suggestions.py`: complete pending -> accepted -> in-playlist lifecycle, pending -> rejected lifecycle, and viewer authorization guard.
Why:
- Requirement [F12-3-b]: seamless in-session AI suggestion discovery and interactive review.
Bug fixed: N/A.
Root cause: N/A.


### [Category: Dev] — F12-1-b Collaborative AI Trigger with Window Deduplication
What changed:
- Implemented collaborative AI trigger in `playlist_service/ws.py` integrating `JobQueue` from `service_kit.jobs`.
- Supported window-based (`window_sec`) and version-based deduplication keys (`vynl:dedupe:collab_suggest:{playlist_id}:{window_bucket}`).
- Atomic Lua `SET NX EX` prevents redundant suggestion jobs during rapid edits.
- Verified in `playlist-service/tests/test_collab_ai_trigger.py` with real Redis: 10 rapid burst edits on a collaborative playlist enqueue exactly 1 job to `vynl:jobs:collab_suggest` and drop 9 duplicate attempts; independent playlists enqueue independently.
Why:
- Requirement [F12-1-b]: debounces and throttles downstream LLM inference workload during active real-time editing sessions.
Bug fixed: N/A.
Root cause: N/A.


### [Category: Dev] — F11-6 WebSocket Close Codes and Shutdown Behavior
What changed:
- Implemented RFC 6455 and custom application close code semantics in `playlist_service/ws.py`.
- Graceful shutdown draining closes all active collaborative sockets with code `1001` (`WS_CLOSE_GOING_AWAY`) and reason `"Server shutting down"`, allowing clients to backoff and reconnect to sibling instances without data loss.
- Unauthorized or permission-revoked connections are closed with code `4403` (`WS_CLOSE_FORBIDDEN`), instructing clients to halt reconnection attempts.
- Verified in `playlist-service/tests/test_ws_shutdown.py`: initiating graceful draining emits 1001, subsequent reconnection retrieves full uncorrupted playlist state, and unauthorized attempts receive 4403.
Why:
- Requirement [F11-6]: clean lifecycle management enabling rolling zero-downtime deployments without socket leaks or data loss.
Bug fixed: N/A.
Root cause: N/A.


### [Category: Dev] — F11-5 Redis Pub/Sub Fan-out Across Multi-Node Clusters
What changed:
- Configured Redis Pub/Sub channel distribution per playlist (`vynl:collab:{playlist_id}`) in `playlist_service/ws.py`.
- Added origin node tagging (`_origin_node`) on published frames to prevent local echo loops while forwarding events across all sibling cluster nodes.
- Verified in `playlist-service/tests/test_ws_pubsub.py` with real Redis: client connected to Node A executes an edit, and client connected to Node B receives `op_applied` frame in real time.
- Verified that terminating Node A and reconnecting to Node B provides immediate access to the converged, up-to-date playlist state.
Why:
- Requirement [F11-5]: horizontal scalability enabling seamless cross-instance collaborative sessions.
Bug fixed: N/A.
Root cause: N/A.


### [Category: Dev] — F11-4 Versioned Updates and Conflict Snapshots
What changed:
- Implemented optimistic concurrency checking and conflict snapshot emission for WebSocket edits in `playlist_service/ws.py`.
- When an edit arrives with a stale `base_version`, the server returns a `version_conflict` snapshot containing the current version and item state (`{"type": "snapshot", "code": "version_conflict", "version": ...}`).
- Added `resync` operation support to immediately deliver authoritative snapshots on client demand.
- Verified in `playlist-service/tests/test_ws_convergence.py`: stale base versions yield conflict snapshots; resync returns fresh state; 5-client concurrent collaborative session successfully applies edits and converges all clients to identical version (6) and item set.
Why:
- Requirement [F11-4]: ensures eventual consistency and convergence across all concurrent collaborative editors.
Bug fixed: N/A.
Root cause: N/A.


### [Category: Dev] — F11-3 Edit Message Protocol and Viewer Rejection
What changed:
- Implemented real-time mutating frame processing (`add`, `move`, `remove`, `resync`, `suggestion.reject`) in `playlist_service/ws.py`.
- Enforced defense-in-depth role re-verification on every mutating frame: viewers attempting mutations receive an explicit WebSocket error frame (`{"type": "error", "code": "forbidden", "message": "Viewers cannot mutate playlists"}`) and the playlist state remains unmodified.
- Enforced dynamic role demotion check: collaborators demoted mid-session have subsequent mutation frames immediately rejected.
- Verified in `playlist-service/tests/test_ws_protocol.py`: viewer edits rejected across `add`, `move`, and `remove`; editor and owner edits accepted with `ack` and broadcast `op_applied`; demoted collaborator mid-session edit rejected.
Why:
- Requirement [F11-3]: strict client message authorization and validation on open collaborative sockets.
Bug fixed: N/A.
Root cause: N/A.


### [Category: Dev] — F11-2-a WebSocket Connection Handshake and Cluster Limit
What changed:
- Built `playlist_service/ws.py` with `CollabConnection` and `CollabManager` handling connection state, handshake authentication, and presence tracking.
- Created `playlist_service/routes/ws.py` mounting `WS /v1/playlists/{playlist_id}/live`.
- Handshake auth strictly enforces session authentication and playlist membership: missing tokens, expired/invalid sessions, and strangers without role access are rejected with WebSocket close code `4403` (Forbidden).
- Cluster-wide connection limiting enforces max 50 active sockets per playlist via Lua atomic script / counter; exceeding connections are rejected with close code `4429` (`WS_CLOSE_LIMIT_EXCEEDED`).
- Integrated into `main.py` application lifespan with graceful connection draining on shutdown.
- Verified in `playlist-service/tests/test_ws_connection.py`: unauthenticated rejection, invalid session rejection, stranger rejection, owner/editor/viewer connection acceptance with snapshot payload, and 50-socket cluster limit enforcement with recovery upon slot release.
Why:
- Requirement [F11-2-a]: secure collaborative real-time connection foundation with strict resource limits.
Bug fixed: N/A.
Root cause: N/A.


### [Category: Dev] — F11-1 Collaborators and Invites
What changed:
- Implemented HMAC-SHA256 signed invite tokens with key rotation support (`KEY_ID:B64URL(PAYLOAD):B64URL(SIG)`), nonce tracking, and single-use redemption semantics in `playlist_service/invites.py`.
- Enforced invite expiration check, revocation check, self-redemption prevention (owner cannot redeem), and concurrent race prevention (atomic single-use verification).
- Added `POST /v1/playlists/{id}/invites` (owner only) and `POST /v1/invites/redeem` (authenticated user).
- Verified in `playlist-service/tests/test_invites.py`: single-use token replay rejection, concurrent double-redeem race condition safety (1 success, 1 409 conflict), expired/revoked rejection, forged token rejection, and key rotation verification.
Why:
- Requirement [F11-1]: secure, tamper-proof invitation system for playlist collaboration.
Bug fixed: N/A.
Root cause: N/A.


### [Category: Dev] — F10-5-a-b Playlists as Playback Source and Context
What changed:
- Implemented `/playback` endpoint returning ordered playback items supporting `from_item_id` seeking.
- Implemented `/context` internal endpoint returning compact playlist context (capped at 50 items for LLM token budget).
- Verified in `playlist-service/tests/test_playback_context.py`: playback items returned in strict position order; large playlists with 80+ items cap context strictly at 50 items.
Why:
- Requirement [F10-5-a-b]: enables playlists to serve as audio queue playback sources and prompt context for the LLM recommender.
Bug fixed: N/A.
Root cause: N/A.

### [Category: Dev] — F9-4 Save Draft as Playlist Atomic Rollback
What changed:
- Implemented atomic `save_draft_as_playlist` executing playlist creation, bulk fractional-indexed item inserts, and dual outbox emissions (`playlist_generate`, `playlist_save`) within a single database transaction.
- Post-commit, the source Redis draft is cleanly deleted.
- Verified in `playlist-service/tests/test_save_draft.py`: simulated failures at item N rollback all state with zero partial playlists, zero orphan items, zero outbox records, and the Redis draft remains fully intact.
Why:
- Requirement [F9-4]: guarantees all-or-nothing draft saving without orphaned partial entities.
Bug fixed: N/A.
Root cause: N/A.

### [Category: Dev] — F10-4 Add Remove Reorder Items Atomic and Logged
What changed:
- Implemented item addition, removal, and reordering within single database transactions.
- Enforced 500-item maximum per playlist (returning 422 ValidationError beyond).
- Emitted atomic `activity_outbox` rows (`playlist_add`, `playlist_remove`, `playlist_reorder`) on every change.
- Verified in `playlist-service/tests/test_items_atomic.py`: injected pre-commit failures rollback all state with zero items modified, zero version increments, and zero outbox records written.
Why:
- Requirement [F10-4]: guarantees data consistency and infallible auditability of playlist mutations.
Bug fixed: N/A.
Root cause: N/A.

### [Category: Dev] — F10-2 Optimistic Locking
What changed:
- Implemented `If-Match` version checking and atomic version bumping executed as the first statement in mutating transactions.
- Enforced 428 Precondition Required when `If-Match` header is omitted and 412 Precondition Failed when version is stale.
- Verified in `playlist-service/tests/test_optimistic_lock.py` with 2 and 20 concurrent edits: exactly 1 request succeeds and remaining requests receive 412 conflict, leaving version incremented by exactly 1.
Why:
- Requirement [F10-2]: prevents lost updates in concurrent edit scenarios.
Bug fixed: N/A.
Root cause: N/A.

### [Category: Dev] — F10-1 Playlist CRUD with Authz Matrix
What changed:
- Built `playlist-service` schema migrations, domain models with `extra="forbid"`, raw SQL asyncpg repository, and `PlaylistService`.
- Implemented service-level authorization enforcement across Owner, Editor, Viewer, and Stranger roles.
- Strangers receive 404 (hidden existence); unpermitted authenticated roles receive 403.
- Table-driven test suite in `playlist-service/tests/test_authz.py` verified all 28 `(role x route x method)` permutations.
Why:
- Requirement [F10-1]: ensures strict, defense-in-depth authorization enforced directly within the service domain.
Bug fixed: N/A.
Root cause: N/A.

### [Category: Dev] — F10-3 Fractional-Index Positions
What changed:
- Implemented pure Base-62 fractional indexing between(a, b) in `playlist-service/playlist_service/fractional.py`.
- Enforced strict ASCII sort order matching PostgreSQL `COLLATE "C"`.
- Added `rebalance_positions` to reset bloated keys.
- Verified with unit tests and Hypothesis property-based testing in `playlist-service/tests/test_fractional.py`: 10,000 random operations without order or uniqueness violation, moving an item never rewrites other rows.
Why:
- Requirement [F10-3]: enables O(1) row updates for item moves without table-wide position rewrites.
Bug fixed: N/A.
Root cause: N/A.

### [Category: Dev] — Project Architecture Setup & Living Documentation
What changed:
- Established root project documentation structure: created `Context.md`, `Changelog.md`, `docs/TASK_LEDGER.md`, `docs/ASSUMPTIONS.md`, `docs/CONTRACTS.md`, `docs/AUTHZ.md`, `docs/METRIC_DEFINITIONS.md`, `docs/WRAP_PAYLOAD.md`, `docs/ERROR_MAPPING.md`, `docs/DELETION_MATRIX.md`, `docs/OBSERVABILITY.md`, and `docs/METRICS.md`.
- Staged baseline repository documents and initialized tracking for Dhairya's 50 assigned tasks.
- Defined technical contracts, event schemas, error schemas, and authorization rules across all codebases.
Why:
- Required foundational setup for autonomous execution across `playlist-service`, `wrap-service`, and `web`. Satisfies non-negotiable documentation rules from `RULES.md §8.1` and `Brief §1`.
Bug fixed: N/A (initial setup).
Root cause: N/A.

### [Category: UI] — Design System & Token Foundation Specification
What changed:
- Cataloged design tokens, typography scales (Urbanist & Zen Dots), glassmorphic blur recipes, and motion duration scales into `docs/Design.md` and contract documentation.
Why:
- Ensures all frontend web components strictly adhere to `Design.md` visual specifications and `UISKILL.md` motion/accessibility guardrails.

### [Category: Audit] — Security Baseline & Canary Masking Design
What changed:
- Specified zero-leakage structured JSON logger, W3C `traceparent` propagation, CSRF token validation, and service-level authorization requirements in `docs/CONTRACTS.md` and `docs/ERROR_MAPPING.md`.
Why:
- Hardening against OWASP Top 10 vulnerabilities, ensuring secret hygiene, and enabling automated verification via `scripts/log_audit.py`.
