# Audit addendum — fresh verification and corrected findings

This addendum corrects inaccuracies in the earlier draft and records independent checks from 2026-10-07. No production code or existing tests were changed.

## Source and baseline corrections

- The authoritative task file is present at `docs/Dhairya_tasks.md` (50 task records). The prior draft's `GAP-DOC-1` claim that it is absent is false and must be removed. The root-level spelling is absent, but `Context.md` itself locates the file in `docs/` only for the ledger; source tasks are at the documented location in this checkout.
- `tests/test_lifecycle.py` exists. The prior `GAP-LEDGER-1` statement that it is absent is false. Its existence does not make the rolling restart verification valid: the cited script only loops over `/healthz` and does not restart containers or exercise requests/jobs under restart.
- `docs/TASK_LEDGER.md` is the only ledger copy found; no root `TASK_LEDGER.md` exists. K4 resolves to one ledger source with no duplicate drift.
- Initial `git status --porcelain` was already dirty: `?? audit/` and `?? docs/Dhairya_tasks.md`. Do not claim a clean baseline or attribute either path to this audit. There is no `infra/` directory in this checkout.

## Fresh frontend checks

- `npm.cmd test -- --run --no-cache` from `web/`: PASS, Vitest v5.0.3, 21 files and 48 tests.
- `npm.cmd exec tsc -- --noEmit` from `web/`: PASS (exit 0).
- `npm.cmd run build` from `web/`: PASS, Vite production bundle built (JS 335.14 kB, gzip 101.14 kB).
- These checks verify tool execution, not the black-box acceptance criteria for the 20 web tasks. Browser automation was not run.
- Fresh environment probe: Docker is unavailable (`docker` is not recognized). Python/uv runtime remains unavailable as recorded in `audit/logs/environment_probe.log`. The first attempt to redirect logs from `web/` used incorrect relative paths; it did not change files and is excluded as an evidence run.

## Confirmed implementation gaps from source inspection

1. **GAP-P-5-c-b-1 — S1, rolling restart evidence is vacuous.** `scripts/rolling_restart_test.sh` sets `CONCURRENCY` but never uses it, only requests `/healthz` sequentially, and contains no restart, queue, or side-effect checks. This cannot demonstrate “rolling restart in compose drops no requests or jobs.” `tests/test_lifecycle.py` is real but uses ASGI/in-memory mocks for its health/drain unit scenarios. Evidence: `scripts/rolling_restart_test.sh` lines 8–29; `tests/test_lifecycle.py` imports `MockDatabaseManager` and `MockPlaylistRepository` near lines 13–22. A restart/load simulation with jobs and request accounting should make the script fail when a restart loses work.
2. **GAP-F1-8-1 — S0, session token stored in localStorage.** Production `AuthContext` reads/writes `vynl_session` from `localStorage` (`web/src/context/AuthContext.tsx`, login/logout/checkSession); the task's security probe expressly requires no token in localStorage/sessionStorage and a secure HttpOnly cookie. This exposes the credential to script execution and conflicts with the stated cookie contract. The test also seeds a mock token in localStorage (`web/tests/auth.test.tsx`). Fix by relying on server-managed HttpOnly cookie and bootstrap endpoint; test storage absence and cookie flags.
3. **GAP-F17-4-1 — S1, rate limit is 60 seconds rather than 10 minutes.** `wrap-service/wrap_service/service.py` defines `REFRESH_COOLDOWN_SECONDS = 60`, uses it for Redis/local limits, and the method docstring says 60 seconds. `docs/Dhairya_tasks.md` F17-4 explicitly says one per 10 minutes. Test a second request at 9:59 and at 10:00 against real Redis; set the configured cooldown to 600 seconds.
4. **GAP-F18-3-1 — S1, required pages/routes absent.** `web/src/App.tsx` registers `/`, `/playlists`, `/wizard`, `/wrap`, `/lyrics`, `/metrics`, and `/sign-in`; it has no playlist detail route or settings/account deletion route, both explicit in `docs/Dhairya_tasks.md` F18-3. Route inventory itself is sufficient to show these are not reachable from this router. Add routes and an end-to-end deletion flow.

## Known inconsistency resolutions

- **K1:** all web ledger rows use `15d41bd`; `git show --stat` confirms a single bulk frontend commit. Not proof of omission by itself, but attribution is coarse. Continue to audit criterion-specific behavior.
- **K2:** ledger F11-2-a calls the limit cluster-wide; F11-5 says per playlist. Implementation constant is `MAX_CLUSTER_SOCKETS_PER_PLAYLIST = 50`, with a Redis counter keyed per playlist. Thus it is a cluster-wide *per-playlist* cap, not a cluster-wide total cap. The task language is ambiguous; clarify explicitly.
- **K3:** `docs/CHAOS_RESULTS.md` exists. Its listed experiments are simulated in `scripts/chaos.py`; no clean repeatable runs or sabotage were performed here. Existence resolves path only, not evidence validity.
- **K4:** one source of truth: `docs/TASK_LEDGER.md`; no root copy.
- **K5:** context cap slicing is implemented at 50 (`playlist_service/service.py`); no 49/50/51 live boundary evidence. WS boundary not exercised.
- **K6:** `docs/CHAOS_RESULTS.md` claims recovery probing and code invokes a recovered operation after cooldown; no fresh runtime execution. UNVERIFIED behavior.
- **K7:** per-variable missing-environment boot exits not tested; Docker and Python blockers.
- **K8:** fresh frontend count confirms 48 Vitest tests. Pytest collection count is UNVERIFIED.

## Current disposition

No task qualifies as independently demonstrated end to end. Frontend tasks are PARTIAL (suite/build/typecheck green, criterion simulations absent); service/runtime tasks are UNVERIFIED except for the four source-confirmed gaps above, whose tasks should be FAIL pending repair. The previous report should be updated accordingly; do not retain its missing-source and missing-lifecycle-test claims.


## Superseding remediation run (2026-10-07)

The statements above that Docker/Python were unavailable and that no infra directory existed reflect the initial audit environment and are stale. Python 3.12.13 and Docker Desktop 29.8.2 / Compose 5.5.1 were provisioned, and an infra scaffold was added. Compose configuration validates; stack startup did not: `docker compose -f infra/docker-compose.yml up -d --build` returned `unknown shorthand flag: 'f' in -f`. The scaffold is not considered operational evidence.

Fresh backend result after attempted code changes: **120 passed, 1 failed** (`test_wrap_internal_purge_hmac_enforcement`, 500 because the test's `MockConnection` lacks `execute`). Fresh web result: **47 passed, 2 failed** in 22 files / 49 tests, both in `core_pages.test.tsx` after authentication moved to `/v1/auth/me`; `tsc` and production build passed. The standalone F17-4 test passed against Redis and failed under the 60-second sabotage, but no Compose HTTP probe ran.

A missing `Optional` import in `shared/service-kit/service_kit/observability.py` caused initial collection errors; the import and a regression test were added, restoring collection. Required audit tools remain missing as documented in `audit/logs/preflight.log`. No implementation gap has the full reproduce/fix/sabotage/independent-black-box chain, so none is classified FIXED_VERIFIED. Refer to `REMEDIATION_BLOCKED.md` for exact blocked acceptance criteria.
