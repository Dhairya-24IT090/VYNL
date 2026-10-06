# Fix plan

| Order | Severity | Owner area | Gap(s) | Suggested work | Effort |
|---:|---|---|---|---|---|
| 1 | S0 | Web authentication | GAP-F1-8-1 | Remove the credential from localStorage and use the server-managed HttpOnly; Secure; SameSite=Lax cookie. Verify bootstrap, expiry, parallel 401 behavior, and absence from browser storage. | M |
| 2 | S1 | Reliability / lifecycle | GAP-P-5-c-b-1 | Replace sequential /healthz polling with compose rolling restarts under concurrent HTTP + queue load; assert no loss or duplicate side effects and sabotage detection. | M |
| 3 | S1 | Wrap service | GAP-F17-4-1 | Change the refresh limit from 60 to 600 seconds and verify atomic per-user behavior with real Redis and Retry-After. | S |
| 4 | S1 | Web routing | GAP-F18-3-1 | Add reachable playlist detail and settings/account deletion routes, then verify deletion through the gateway and sign-out. | M |
| 5 | S1 | Audit environment / CI | GAP-ENV-1, GAP-K7, GAP-K8 | Run collection and per-variable boot validation with Docker, Python 3.12, Postgres 16, Redis, and browser automation. | M |
| 6 | S1-S2 | Collaboration contracts | GAP-K2, GAP-K5 | Resolve whether 50 sockets is a cluster total or per playlist, document it, and exercise 49/50/51 across at least two instances. | M |
| 7 | S1-S2 | Remaining verification | GAP-WEB-1 and all UNVERIFIED tasks | Run service-backed probes, mutations/sabotage, browser E2E, security, tracing, metrics, deletion, chaos, load, soak, and schema invariants. | XL |

Recommended order: fix credential exposure first, repair the lifecycle evidence and incorrect cooldown, restore missing routes, then provision the runtime stack and close the ambiguous contract. A Docker/Python/browser-capable CI environment unlocks the largest set of remaining acceptance checks.


## Remediation checkpoint (2026-10-07)

Status: **BLOCKED**. Python 3.12 and Docker Desktop were provisioned. Compose config validates but stack startup fails with `unknown shorthand flag: 'f' in -f`. Latest backend run was 120 passed / 1 failed (wrap repository mock DB API mismatch); latest web run was 47 passed / 2 failed (legacy route tests assume storage auth); TypeScript and build passed. Do not close the four source findings or downgrade remaining tasks to PASS. Immediate order: resolve Compose CLI invocation; fix the backend mock integration mismatch and auth-bootstrap test fixtures without weakening criteria; run the focused red/green/sabotage/probe protocol; then execute the full acceptance matrix. See `REMEDIATION_BLOCKED.md`.
