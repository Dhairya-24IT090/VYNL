# Derived requirements (provisional)

The requested authoritative task source `Dhairya_tasks.md` is absent from the repository and the prompt provides detailed derived requirements for only four task IDs. This file records those supplied derivations; it cannot substitute for the missing task bodies or the stated PRD/Rev2 source hierarchy.

- **F10-5-a-b:** Playlist playback returns items ordered by fractional position; playback context includes no more than 50 items. Read access permits viewers and rejects non-members. Large playlists and missing/not-ready songs have defined behavior.
- **F11-2-a:** WebSocket handshake validates session and Origin, rejects unauthenticated/non-members with defined close behavior, enforces a connection cap consistently across instances (ledger says cluster-wide 50; F11-5 says 50 per playlist), releases slots on all disconnects, and implements ping/pong/idle timeout.
- **F18-1-a:** Every API request receives valid W3C traceparent (new span; trace continuity within user action); state-changing requests attach CSRF; SSE reconnects with Last-Event-ID and backoff; errors normalize to Appendix B and surface request_id.
- **F19-4-a-b:** Shared retry has full jitter, attempt limits, retry classification, idempotency protection, Retry-After support, deadline, and a concurrency-safe closed/open/half-open breaker; both services use it at actual call sites.

**Documentation gap:** The named source task file is missing, so these requirements are sourced only from the supplied audit prompt/ledger criteria. Obtain the source file to validate completeness and resolve ambiguity against the stated precedence hierarchy.
