# Changelog.md — VYNL Work History

All notable changes across all categories (Dev, SEO, UI, Audit) are documented here in reverse-chronological order per `RULES.md §8.1`.

---

## [2026-10-06 23:05]

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
