# VYNL Task Ledger (Dhairya's 50 Tasks)

This ledger tracks the status of all 50 tasks. A task is marked `DONE` only when its stated "Done when" criterion is demonstrated by an automated test (or executable script) that has passed.

Status values: `TODO`, `IN_PROGRESS`, `DONE`.

| # | ID | Title | Repo(s) | Status | Done when criterion | Test Path / Verification | Commit Hash |
|---|---|---|---|---|---|---|---|
| 1 | P-5-c-b | Health, boot validation, graceful shutdown | playlist, wrap | TODO | Rolling restart in compose drops no requests or jobs | `tests/test_lifecycle.py`, `scripts/rolling_restart_test.sh` | |
| 2 | F1-8 | Sign-in page and auth guard | web | TODO | Refresh keeps user signed in; expired session sends to sign-in | `web/tests/auth.test.tsx` | |
| 3 | F2-6 | Search UI | web | TODO | Fast typing = one request per pause; errors show retry | `web/tests/search.test.tsx` | |
| 4 | F3-18 | Audio player | web | TODO | Long track keeps playing across a link expiry | `web/tests/player.test.tsx` | |
| 5 | F3-19-b | Performance targets | web | TODO | Dashboards show p95 vs targets | `web/tests/perf.test.tsx` | |
| 6 | F5-7 | Now-playing metadata panel | web | TODO | Renders with missing fields; updates after enrichment | `web/tests/now_playing.test.tsx` | |
| 7 | F6-3 | Download UI | web | TODO | Works on desktop and mobile browsers | `web/tests/download.test.tsx` | |
| 8 | F7-11 | Recommendation UI | web | TODO | Interactions appear in activity data | `web/tests/recommendations.test.tsx` | |
| 9 | F9-3-b | Redis drafts | playlist | DONE | Drafts expire cleanly | `playlist-service/tests/test_drafts.py` | `6f38eb2` |
| 10 | F9-4 | Save draft as playlist | playlist | DONE | Failed save leaves no partial playlist | `playlist-service/tests/test_save_draft.py` | `9714acf` |
| 11 | F9-5 | Generation wizard UI | web | TODO | Generate, adjust, save without leaving the flow | `web/tests/wizard.test.tsx` | |
| 12 | F10-1 | Playlist CRUD with authz | playlist | DONE | Authz tests cover every role on every route | `playlist-service/tests/test_authz.py` | `37ae21f` |
| 13 | F10-2 | Optimistic locking | playlist | DONE | Two concurrent edits = one success + one conflict | `playlist-service/tests/test_optimistic_lock.py` | `5f72ea4` |
| 14 | F10-3 | Fractional-index positions | playlist | DONE | Moving an item never rewrites the list | `playlist-service/tests/test_fractional.py` | `9235907` |
| 15 | F10-4 | Add/remove/reorder items | playlist | DONE | All operations atomic and logged | `playlist-service/tests/test_items_atomic.py` | `aea218f` |
| 16 | F10-5-a-b | Playlists as playback source and context | playlist | DONE | Playback endpoint returns ordered items; context caps at 50 | `playlist-service/tests/test_playback_context.py` | `a90852e` |
| 17 | F10-6 | Playlist UI | web | TODO | Stale edit shows clear message and recovers, no data loss | `web/tests/playlist_ui.test.tsx` | |
| 18 | F11-1 | Collaborators and invites | playlist | DONE | Invite redeemable once; expired fail | `playlist-service/tests/test_invites.py` | `7523d34` |
| 19 | F11-2-a | WebSocket connection | playlist | DONE | Handshake validates auth; 50 socket cluster limit enforced | `playlist-service/tests/test_ws_connection.py` | `2ff67c8` |
| 20 | F11-3 | Edit message protocol | playlist | DONE | Viewer's edit rejected on open socket | `playlist-service/tests/test_ws_protocol.py` | `f711854` |
| 21 | F11-4 | Versioned updates, conflict snapshots | playlist | DONE | Concurrent edits converge for all participants | `playlist-service/tests/test_ws_convergence.py` | `62d048c` |
| 22 | F11-5 | Redis pub/sub fan-out | playlist | DONE | Clients on different instances see each other's edits | `playlist-service/tests/test_ws_pubsub.py` | `6adc8c5` |
| 23 | F11-6 | Close codes and shutdown behavior | playlist | DONE | Rolling deploy causes reconnects without data loss | `playlist-service/tests/test_ws_shutdown.py` | `1072658` |
| 24 | F12-1-b | Collaborative AI trigger | playlist | DONE | Rapid editing = one suggestion job per window | `playlist-service/tests/test_collab_ai_trigger.py` | `2e82849` |
| 25 | F12-3-b | Broadcast suggestions | playlist | DONE | Accepted songs added via normal versioned edit path | `playlist-service/tests/test_broadcast_suggestions.py` | `11b94d7` |
| 26 | F12-4 | Collaboration UI | web | TODO | Two browsers edit same playlist and stay in sync | `web/tests/collab_ui.test.tsx` | |
| 27 | F13-3 | Client lyric sync | web | TODO | Seeking updates highlighted line instantly | `web/tests/lyrics_sync.test.tsx` | |
| 28 | F14-1 | Pre-designed backdrops | web | TODO | Lyrics readable on every backdrop | `web/tests/backdrops.test.tsx` | |
| 29 | F14-2-b | Custom backdrop upload | web | TODO | Disguised non-images rejected | `web/tests/backdrop_upload.test.tsx` | |
| 30 | F14-4 | Lyrics screen | web | TODO | Works end to end on desktop and phone | `web/tests/lyrics_screen.test.tsx` | |
| 31 | F15-4 | Client event buffer | web | TODO | Closing the tab does not lose events | `web/tests/event_buffer.test.tsx` | |
| 32 | F17-1 | Metric definitions | wrap, docs | DONE | Definitions in docs + edge-case unit tests | `wrap-service/tests/test_metrics_defs.py` | `0b4f1f6` |
| 33 | F17-2 | Aggregation | wrap | DONE | Output matches hand-calculated fixture | `wrap-service/tests/test_aggregator.py` | `24ecdab` |
| 34 | F17-3 | Scheduled generation | wrap | DONE | Reruns never double-compute | `wrap-service/tests/test_scheduler.py` | `5e2435f` |
| 35 | F17-4 | Wrap endpoints | wrap | DONE | Refresh limit returns 429 + Retry-After | `wrap-service/tests/test_wrap_endpoints.py` | `6e795a5` |
| 36 | F17-5 | Wrap caching | wrap | DONE | Repeated reads hit cache | `wrap-service/tests/test_wrap_cache.py` | `2c2d05b` |
| 37 | F17-6 | Wrap UI | web | TODO | Renders correctly for little or no history | `web/tests/wrap_ui.test.tsx` | |
| 38 | F18-1-a | App shell and API client | web | TODO | Traceparent injected, CSRF attached, SSE reconnection | `web/tests/app_shell.test.tsx` | |
| 39 | F18-2 | Player and queue UI | web | TODO | Playback persists across route changes | `web/tests/player_queue.test.tsx` | |
| 40 | F18-3 | Core pages | web | TODO | Every documented feature has a reachable page | `web/tests/core_pages.test.tsx` | |
| 41 | F18-4 | Real-time clients | web | TODO | Network drops recover without page refresh | `web/tests/realtime_client.test.tsx` | |
| 42 | F18-5 | Responsiveness and accessibility | web | TODO | Key flows pass an accessibility audit | `web/tests/a11y.test.tsx` | |
| 43 | F19-4-a-b | Retry policy | playlist, wrap | DONE | Exp backoff, full jitter, circuit breaker probe | `shared/service-kit/tests/test_resilience.py` | pending |
| 44 | F19-5-c-b | Chaos tests | playlist, wrap | TODO | Results documented and repeatable | `scripts/chaos.py`, `docs/CHAOS_RESULTS.md` | |
| 45 | F19-6-c-b | Error mapping | playlist, wrap | TODO | Every service passes shared contract test | `shared/contracts/error_contract/test_errors.py` | |
| 46 | F20-1-c-b | Transport and secret hygiene | playlist, wrap | TODO | Log audit finds no sensitive values | `scripts/log_audit.py` | |
| 47 | F20-2-c-b | Service-level authorization | playlist, wrap | TODO | Direct service calls with wrong user rejected | `shared/service-kit/tests/test_service_authz.py` | |
| 48 | F20-5-c-b | Deletion fan-out | playlist, wrap | TODO | Deleted user leaves no personal data | `tests/test_deletion_fanout.py` | |
| 49 | O-1-c-b | Distributed tracing | playlist, wrap | TODO | One trace spans browser through worker | `tests/test_tracing.py` | |
| 50 | O-2-c-b | Metrics | playlist, wrap | TODO | Each metric scraped and labeled consistently | `tests/test_metrics.py` | |
