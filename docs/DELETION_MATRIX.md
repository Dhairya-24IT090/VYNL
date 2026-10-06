# VYNL Deletion & PII Fan-Out Matrix (`docs/DELETION_MATRIX.md`)

This document defines schema and data ownership for account deletion fan-out (`DELETE /users/{id}/data`) per Task `[F20-5-c-b]`.

---

## 1. Table Ownership & Cascading Rules

| Table / Resource | Owning Service / Schema | Action on User Deletion | Edge Cases / Ownership Transfer |
|---|---|---|---|
| `playlists` (non-collab) | `playlist-service` (`playlist`) | Hard delete playlist & items | All items in owned playlist deleted. |
| `playlists` (collaborative) | `playlist-service` (`playlist`) | **Transfer ownership or Delete** | If >= 1 editor exists, transfer ownership to the earliest-added editor (by `added_at`). If no editors exist, hard delete. |
| `playlist_items` (other's playlist)| `playlist-service` (`playlist`) | **Anonymize item** | Set `added_by = '00000000-0000-0000-0000-000000000000'` (tombstone UUID). Keep item and position intact. |
| `playlist_collaborators` | `playlist-service` (`playlist`) | Hard delete row | Removes user membership from all shared playlists. |
| `playlist_invites` | `playlist-service` (`playlist`) | Hard delete / Revoke | Revoke pending invites issued by or redeemed by user. |
| `activity_outbox` | `playlist-service` (`playlist`) | Hard delete user rows | Unsent outbox items for deleted user are discarded. |
| Redis drafts | `playlist-service` (Redis) | Hard delete keys | Delete `draft:{user_id}:*` keys. |
| Redis WS sockets | `playlist-service` (Redis) | Close connections | Disconnect active user sockets with close code `4403`. |
| `monthly_wraps` | `wrap-service` (`wrap`) | Hard delete rows | `DELETE FROM wrap.monthly_wraps WHERE user_id = $1`. |
| Redis wrap cache | `wrap-service` (Redis) | Hard delete keys | Delete `wrap:{user_id}:*` and rate limit keys. |
| `users`, `sessions` | Auth Service (External) | Owned by Auth Dev | Handled by Auth Service orchestrator. |
| `songs`, `song_attributes`| Streaming Service (External) | **Never Touched** | Shared audio catalog is public/system data; never deleted. |
| `activity_events`, rollups| Activity Service (External)| Handled by Activity Dev | Anonymize or delete activity records per data policy. |
| `recommendations`, LLM log | Recs / LLM Service (External)| Handled by Recs Dev | Handled by Recs service deletion worker. |

---

## 2. Verification Protocol (PII Sweep)

The integration test seeds records across all `playlist-service` and `wrap-service` tables and Redis keys.
After `DELETE /users/{id}/data` executes:
1. Every table column across `playlist.*` and `wrap.*` is scanned for `user_id`. Result must be **0 matches**.
2. Redis `SCAN` searches for keys containing `user_id`. Result must be **0 keys**.
3. A subsequent call to `DELETE /users/{id}/data` succeeds idempotently returning zero deleted rows.
