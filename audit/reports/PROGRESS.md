# Remediation progress

## Checkpoint — provisioning and first regression runs

- Installed Python 3.12.13 and Docker Desktop; started standalone Redis.
- Compose configuration validates, but stack startup is blocked by Docker CLI `unknown shorthand flag: 'f'` on `up`.
- Fresh Python run after current changes: 120 passed, 1 failed (wrap repository mock connection API mismatch).
- Fresh web run: 47 passed, 2 failed (legacy core-page tests depend on localStorage auth); TypeScript/build pass.
- Targeted cooldown fix has red/green/sabotage evidence; no black-box Compose probe.
- Next: resolve Compose invocation and regressions, then run the complete acceptance matrix. Until then all runtime-dependent tasks remain UNVERIFIED.

Current status: BLOCKED. See `REMEDIATION_BLOCKED.md`.
