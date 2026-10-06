[DHAIRYA] [ ] Task 5c-b [P-5-c-b]: Health, boot validation and graceful shutdown (repo slice)  | Repo: `playlist-service`, `wrap-service`
  Repo slice: implement only the changes for the repo(s) listed above; coordinate with the other slice owner through the existing API/event contract. Do not modify the other developer-owned repos.
Every service exposes `/healthz` (liveness) and `/readyz` (checks DB and Redis), validates required env variables at boot and exits non-zero if any are missing, and handles SIGTERM per flow 20: readiness flips to 503, in-flight requests drain for up to 25 s, workers stop reading and finish or NACK the current job, pools close, exit 0. Done when a rolling restart in docker-compose drops no requests or jobs.

[DHAIRYA] [ ] Task 8 [F1-8]: Sign-in page and auth guard | Repo: `web`
Build the "Sign in with Google" page, a route guard that redirects unauthenticated users, a session bootstrap call on app load, and global handling for 401 (clear state and redirect to sign-in, preserving the intended route). Done when refreshing the page keeps the user signed in and an expired session sends them to sign-in.

[DHAIRYA] [ ] Task 6 [F2-6]: Search UI | Repo: `web`
Build the search bar with debounce, results list with artwork, loading, empty and error states, and a select action that calls resolve. Keyboard navigation and mobile layout included. Done when typing quickly sends one request per pause and errors show a retry option.

---

## F3 + F4. Fetch-Once-and-Reuse Storage, Playback and Streaming (Total tasks = 19)

*The core of the product. Tasks 1 to 9 live in the existing streaming repo (its Phases 3 to 5).*

[DHAIRYA] [ ] Task 18 [F3-18]: Audio player | Repo: `web`
Global player using HTML audio with Range playback, a waiting state for 202 (SSE with polling fallback), silent link refresh before expiry, error recovery on 401/403 from expired links, and playback controls. Done when a long track keeps playing across a link expiry.

[DHAIRYA] [ ] Task 19b [F3-19-b]: Performance targets (repo slice) | Repo: `web`
  Repo slice: implement only the changes for the repo(s) listed above; coordinate with the other slice owner through the existing API/event contract. Do not modify the other developer-owned repos.
Instrument and verify: READY playback begins in under 3 s, first-time acquisition returns 202 immediately, and the worker completes acquisition within the 10 s target excluding third-party latency. Add the resolve hit/miss metrics used by alerts. Done when dashboards show p95 values against the targets.

---

## F5. Metadata and Audio-Feature Enrichment (Total tasks = 7)

[DHAIRYA] [ ] Task 7 [F5-7]: Now-playing metadata panel | Repo: `web`
Show Discogs details (release, label, year, album info) in the player when available and degrade gracefully when partial or missing. Done when the panel renders with missing fields and updates after enrichment finishes.

---

## F6. Music Download (Total tasks = 4)

[DHAIRYA] [ ] Task 3 [F6-3]: Download UI | Repo: `web`
Add a download button with progress, error and retry states, including the waiting state when the song is not yet READY. Native offline playback is out of scope. Done when the button works on desktop and mobile browsers.

[DHAIRYA] [ ] Task 11 [F7-11]: Recommendation UI | Repo: `web`
Show an AI badge on recommended songs, a "Why this?" explanation when present, and log `rec_accept`, `rec_reject` and explanation-view events. Done when interactions appear in activity data.

---

## F9. AI-Assisted Playlist Generation (Total tasks = 5)

[DHAIRYA] [ ] Task 3-b [F9-3-b]: Redis drafts  | Repo: `playlist-service`
  Repo slice: implement only the changes for the repo(s) listed above; coordinate with the other slice owner through the existing API/event contract. Do not modify the other developer-owned repos.
Store the ordered draft in Redis for 1 hour and notify the client over SSE. Provide GET and edit endpoints for the draft. Nothing is written to playlist tables yet. Done when drafts expire cleanly.

[DHAIRYA] [ ] Task 4 [F9-4]: Save draft as playlist | Repo: `playlist-service`
Persist the playlist and ordered items in one transaction, using fractional-index positions, and log generation and save events. Done when a failed save leaves no partial playlist.

[DHAIRYA] [ ] Task 5 [F9-5]: Generation wizard UI | Repo: `web`
Multi-step form for genres, artists and reference songs, a progress view, a review screen with edit and reorder, and a save action. Done when users can generate, adjust and save without leaving the flow.

---

## F10. Personal Playlists (Total tasks = 6)

[DHAIRYA] [ ] Task 1 [F10-1]: Playlist CRUD with authorization | Repo: `playlist-service`
Endpoints: `POST /playlists`, `GET/PATCH/DELETE /playlists/{id}`. Owner, editor and viewer checks live in the service layer; return 403 or 404 to hide existence. Done when authorization tests cover every role on every route.

[DHAIRYA] [ ] Task 2 [F10-2]: Optimistic locking | Repo: `playlist-service`
Require `If-Match` with the playlist version (428 if missing). Update with `version = version + 1 WHERE version = $expected`; zero rows returns 409/412. Return the new ETag. Done when two concurrent edits produce one success and one conflict.

[DHAIRYA] [ ] Task 3 [F10-3]: Fractional-index positions | Repo: `playlist-service`
Order items with fractional index keys so a reorder updates a single row. Include a periodic rebalance when keys get too long. Done when moving an item never rewrites the list.

[DHAIRYA] [ ] Task 4 [F10-4]: Add, remove and reorder items | Repo: `playlist-service`
`PUT /playlists/{id}/items` and item operations, each bumping the version and logging an activity event. Done when all operations are atomic and logged.

[DHAIRYA] [ ] Task 5a-b [F10-5-a-b]: Playlists as playback source and context (repo slice)  | Repo: `playlist-service`
  Repo slice: implement only the changes for the repo(s) listed above; coordinate with the other slice owner through the existing API/event contract. Do not modify the other developer-owned repos.

[DHAIRYA] [ ] Task 6 [F10-6]: Playlist UI | Repo: `web`
List and detail views, drag-and-drop reorder, add from search, and conflict recovery (refetch and retry on 409/412). Done when a stale edit shows a clear message and recovers without data loss.

---

## F11 + F12. Collaborative Playlists with AI Suggestions (Total tasks = 10)

[DHAIRYA] [ ] Task 1 [F11-1]: Collaborators and invites | Repo: `playlist-service`
Roles (owner, editor, viewer), `PUT` collaborator, and signed one-time invite tokens valid for 24 hours. Tokens are single use and revocable. Done when an invite can be redeemed once and expired tokens fail.

[DHAIRYA] [ ] Task 2a [F11-2-a]: WebSocket connection (repo slice) | Repo: `playlist-service`
  Repo slice: implement only the changes for the repo(s) listed above; coordinate with the other slice owner through the existing API/event contract. Do not modify the other developer-owned repos.

[DHAIRYA] [ ] Task 3 [F11-3]: Edit message protocol | Repo: `playlist-service`
Messages `{op, song_id, after_position, base_version}`, max 4 KB, 10 messages per second per socket, with the role re-checked on every mutating message. Done when a viewer's edit is rejected even on an open socket.

[DHAIRYA] [ ] Task 4 [F11-4]: Versioned updates and conflict snapshots | Repo: `playlist-service`
Apply edits with the optimistic version update. On conflict, send the client a full snapshot to resync. Done when concurrent edits converge to the same state for all participants.

[DHAIRYA] [ ] Task 5 [F11-5]: Redis pub/sub fan-out | Repo: `playlist-service`
Publish changes to `playlist:{id}`; every instance relays to its sockets. Limit 50 sockets per playlist. Done when clients on different instances see each other's edits.

[DHAIRYA] [ ] Task 6 [F11-6]: Close codes and shutdown behavior | Repo: `playlist-service`
Send 1001 on server shutdown and 4403 when permission is revoked mid-session. Clients reconnect to another instance. Done when a rolling deploy causes reconnects without data loss.

[DHAIRYA] [ ] Task 7-b [F12-1-b]: Collaborative AI trigger  | Repo: `playlist-service`
  Repo slice: implement only the changes for the repo(s) listed above; coordinate with the other slice owner through the existing API/event contract. Do not modify the other developer-owned repos.
Enqueue `collab_suggest` every 10 playlist versions or after 5 minutes of idle, with dedupe key `suggest:{id}:{version//10}` so bursts coalesce. Done when rapid editing creates one suggestion job per window.

[DHAIRYA] [ ] Task 9-b [F12-3-b]: Broadcast suggestions  | Repo: `playlist-service`
  Repo slice: implement only the changes for the repo(s) listed above; coordinate with the other slice owner through the existing API/event contract. Do not modify the other developer-owned repos.
Broadcast suggestions to participants; a human accepts or rejects each. Nothing is added automatically. Done when accepted songs are added through the normal versioned edit path.

[DHAIRYA] [ ] Task 10 [F12-4]: Collaboration UI | Repo: `web`
Live playlist view with presence, change indicators, a reconnecting WebSocket client, conflict handling and a suggestion panel. Done when two browsers edit the same playlist and stay in sync.

---

## F13 + F14. Synchronized Lyrics and Customization (Total tasks = 7)

[DHAIRYA] [ ] Task 3 [F13-3]: Client lyric sync | Repo: `web`
Binary-search the active line from the playback position, highlight it smoothly and scroll it into view. Handle seeks and untimed lyrics. Done when seeking updates the highlighted line instantly.

[DHAIRYA] [ ] Task 4 [F14-1]: Pre-designed backdrops | Repo: `web`
Ship a curated set of backdrops with accessible contrast defaults. Done when lyrics remain readable on every backdrop.

[DHAIRYA] [ ] Task 5b [F14-2-b]: Custom backdrop upload (repo slice) | Repo: `web`
  Repo slice: implement only the changes for the repo(s) listed above; coordinate with the other slice owner through the existing API/event contract. Do not modify the other developer-owned repos.
Issue a presigned PUT to object storage (2 MB max, png/jpeg/webp), then validate magic bytes on confirm. Image bytes never pass through FastAPI. Done when disguised non-images are rejected.

[DHAIRYA] [ ] Task 7 [F14-4]: Lyrics screen | Repo: `web`
Full-screen synced lyrics over the chosen backdrop with a picker and an upload action, responsive for mobile. Done when the screen works end to end on desktop and phone.

---

## F15 + F16. Activity Tracking and Continuous Personalization (Total tasks = 7)

[DHAIRYA] [ ] Task 4 [F15-4]: Client event buffer | Repo: `web`
Assign a UUID per event, buffer up to 100 events or 15 s, flush with `sendBeacon` on tab close, and retry safely. Done when closing the tab does not lose events.

[DHAIRYA] [ ] Task 1 [F17-1]: Metric definitions | Repo: `wrap-service`, `docs`
Document and implement: counted play = listened 30 s or more; replay = song with 2 or more counted plays; skip = explicit skip or under 30 s; newly discovered artist = 0 plays in the previous 12 months and 1 or more in the period. Done when definitions are in `docs` with unit tests using edge cases.

[DHAIRYA] [ ] Task 2 [F17-2]: Aggregation | Repo: `wrap-service`
Compute total listening, top songs, top artists, genres, listening patterns, replays, skips and new artists from rollups plus the current day's raw events. Done when output matches a hand-calculated fixture.

[DHAIRYA] [ ] Task 3 [F17-3]: Scheduled generation | Repo: `wrap-service`
Scheduler at 00:10 UTC on day 1 in batches of 500 users, job dedupe `wrap:{user}:{period}`, unique `(user_id, period)` upsert. Done when reruns never double-compute.

[DHAIRYA] [ ] Task 4 [F17-4]: Wrap endpoints | Repo: `wrap-service`
`GET /wrap/{yyyy-mm}` and `POST /wrap/current/refresh` limited to 1 per 10 minutes per user. Done when refresh limits return 429 with `Retry-After`.

[DHAIRYA] [ ] Task 5 [F17-5]: Wrap caching | Repo: `wrap-service`
Write-through cache: closed months for 30 days, current month for 10 minutes. Done when repeated reads hit cache.

[DHAIRYA] [ ] Task 6 [F17-6]: Wrap UI | Repo: `web`
Story-style summary with month-to-date state, empty state for new users and a shareable summary. Done when the page renders correctly for users with little or no history.

---

## F18. Responsive Web Application (Total tasks = 5)

[DHAIRYA] [ ] Task 1a [F18-1-a]: App shell and API client (repo slice) | Repo: `web`
  Repo slice: implement only the changes for the repo(s) listed above; coordinate with the other slice owner through the existing API/event contract. Do not modify the other developer-owned repos.

[DHAIRYA] [ ] Task 2 [F18-2]: Player and queue UI | Repo: `web`
Persistent global player, queue drawer, and mobile bottom-sheet player with full playback controls. Done when playback persists across route changes.

[DHAIRYA] [ ] Task 3 [F18-3]: Core pages | Repo: `web`
Search, playlists, playlist detail (live), lyrics, Wrap and settings (including account deletion). Done when every documented feature has a reachable page.

[DHAIRYA] [ ] Task 4 [F18-4]: Real-time clients | Repo: `web`
SSE client for job events and a reconnecting WebSocket client with backoff and resync on reconnect. Done when network drops recover without a page refresh.

[DHAIRYA] [ ] Task 5 [F18-5]: Responsiveness and accessibility | Repo: `web`
Responsive breakpoints for desktop and mobile browsers, keyboard navigation, ARIA labels, and consistent loading and error patterns. Done when key flows pass an accessibility audit.

---

## F19. Fallback and Reliability (Total tasks = 6)

[DHAIRYA] [ ] Task 4a-b [F19-4-a-b]: Retry policy (repo slice)  | Repo: `playlist-service`, `wrap-service`
  Repo slice: implement only the changes for the repo(s) listed above; coordinate with the other slice owner through the existing API/event contract. Do not modify the other developer-owned repos.

[DHAIRYA] [ ] Task 5c-b [F19-5-c-b]: Chaos tests (repo slice)  | Repo: `playlist-service`, `wrap-service`
  Repo slice: implement only the changes for the repo(s) listed above; coordinate with the other slice owner through the existing API/event contract. Do not modify the other developer-owned repos.
Kill the LLM, Discogs and aplmate in a test environment and verify playback, queue and playlists keep working. Done when the results are documented and repeatable.

[DHAIRYA] [ ] Task 6c-b [F19-6-c-b]: Error mapping (repo slice)  | Repo: `playlist-service`, `wrap-service`
  Repo slice: implement only the changes for the repo(s) listed above; coordinate with the other slice owner through the existing API/event contract. Do not modify the other developer-owned repos.
Map failures to Appendix B: 502/503 with `Retry-After` for dependency failure, 504 for timeout, 202 for not-ready songs, 500 generic with `request_id`. Done when every service passes a shared contract test.

---

## F20. Security and Account Deletion (Total tasks = 7)

[DHAIRYA] [ ] Task 1c-b [F20-1-c-b]: Transport and secret hygiene (repo slice)  | Repo: `playlist-service`, `wrap-service`
  Repo slice: implement only the changes for the repo(s) listed above; coordinate with the other slice owner through the existing API/event contract. Do not modify the other developer-owned repos.
Enforce TLS everywhere, the body size cap, secrets only via environment and validated at boot, and no tokens, file IDs, signed URLs or prompts in logs. Done when a log audit finds no sensitive values.

[DHAIRYA] [ ] Task 2c-b [F20-2-c-b]: Service-level authorization (repo slice)  | Repo: `playlist-service`, `wrap-service`
  Repo slice: implement only the changes for the repo(s) listed above; coordinate with the other slice owner through the existing API/event contract. Do not modify the other developer-owned repos.
Every service verifies ownership and collaborator role itself rather than trusting the gateway alone. Done when direct service calls with a wrong user are rejected.

[DHAIRYA] [ ] Task 5c-b [F20-5-c-b]: Deletion fan-out (repo slice)  | Repo: `playlist-service`, `wrap-service`
  Repo slice: implement only the changes for the repo(s) listed above; coordinate with the other slice owner through the existing API/event contract. Do not modify the other developer-owned repos.
Each service exposes an internal `DELETE /users/{id}/data` that removes personal data (queue, activity, wraps, preferences, collaborator rows, owned playlists) and anonymizes shared records (recommendations, llm_requests). Collaborative playlists transfer to the earliest editor if one exists. The song catalog is kept. Done when a deleted user leaves no personal data in any service.

[DHAIRYA] [ ] Task 1c-b [O-1-c-b]: Distributed tracing (repo slice)  | Repo: `playlist-service`, `wrap-service`
  Repo slice: implement only the changes for the repo(s) listed above; coordinate with the other slice owner through the existing API/event contract. Do not modify the other developer-owned repos.
Propagate W3C `traceparent` through gateway, services, queue payloads, workers and provider adapters using OpenTelemetry. Done when one trace shows a request from the browser through a worker.

[DHAIRYA] [ ] Task 2c-b [O-2-c-b]: Metrics (repo slice)  | Repo: `playlist-service`, `wrap-service`
  Repo slice: implement only the changes for the repo(s) listed above; coordinate with the other slice owner through the existing API/event contract. Do not modify the other developer-owned repos.
Expose Prometheus metrics: latency, traffic, errors, saturation, plus `song_cache_hit_ratio`, `telegram_reuse_vs_fetch`, `llm_validation_failures`, `dlq_depth` and `queue_lag`. Done when each metric is scraped and labeled consistently.
