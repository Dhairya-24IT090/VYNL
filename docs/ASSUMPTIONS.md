# VYNL Architectural Assumptions & Conflict Resolutions

This document logs all architectural decisions, precedence determinations, and contract proposals.

---

## 1. Source-of-Truth Hierarchy

When requirements conflict, the precedence order is:
1. `Dhairya_tasks.md` (reproduced in brief §3 & `docs/TASK_LEDGER.md`): authoritative scope and completion criteria.
2. `VYNL_Backend_Flowcharts_Rev2.pdf`: authoritative backend behavior, numbers, error semantics, job catalog.
3. `VYNL_PRD_SRS_Architecture_Updated.docx`: product requirements, non-functional requirements, stack boundaries.
4. `Design.md`: visual design tokens, layout specifications, glassmorphic recipes, component inventory.
5. `UISKILL.md`: motion tokens, performance, accessibility, and focus management manual.
6. `The-VYNL-Updated.md`: background product narrative.

---

## 2. Explicit Conflict Resolutions

| Conflict | Resolution | Rationale |
|---|---|---|
| ML Recommendation Model vs. LLM | **LLM-only decision layer** | Rev2 and PRD state no VYNL-owned ML model is trained. LLM handles song recommendation decisions. Daily ML training text is ignored. |
| User Registration & Passwords | **Google OAuth only** | Rev2 Flow 1 supersedes SRS FR-1.1. No passwords, bcrypt, or registration forms exist. Sessions are server-side opaque tokens in cookies. |
| Audio Delivery Mechanism | **Presigned URL / `/stream/{token}`** | Web client treats stream URLs as opaque `{url, expires_at}` payloads. Works with both direct presigned storage URLs and streaming proxies. |
| Motion Library | **`framer-motion`** | Architecture doc specifies `framer-motion`; imports from `motion/react` are fully compatible. |
| Visual Identity vs. Anti-Card Heuristics | **`Design.md` wins for visuals** | Glass cards, `#0F0F0F`, `#FFFFFF`, Urbanist, and Zen Dots are mandated by `Design.md`. `UISKILL.md` governs motion tokens, reduced motion, a11y, and performance. |
| Empty Task Bodies (`F11-2-a`, `F10-5-a-b`, `F19-4-a-b`, `F18-1-a`) | **Derived from Rev2** | Handshake/WS limits from Flow 10; playback context from Flows 5/6; retry policies from Flow 19 & Appendix A; shell/API client from Flow 0. |

---

## 3. Proposed Service Contracts (Marked `[PROPOSED]`)

1. **`return_to` OAuth Validation `[PROPOSED]`**:
   - `GET /v1/auth/google/start?return_to=/path`: `return_to` must be a relative path on the same origin (starting with `/`, not `//`) to prevent open redirects.
2. **`sendBeacon` CSRF Handling `[PROPOSED]`**:
   - Because `navigator.sendBeacon` does not support custom headers, `POST /v1/activity/batch` accepts the CSRF token either in the `X-CSRF-Token` header or as an optional top-level `csrf` field in the JSON payload.
3. **Draft TTL Extension Policy `[PROPOSED]`**:
   - Redis draft keys (`draft:{user_id}:{draft_id}`) have an initial TTL of 3600 seconds. Mutations refresh the TTL by up to 3600s, capped at an absolute max lifetime of 7200 seconds (2 hours) from initial creation.
4. **WebSocket Op Protocol Extensions `[PROPOSED]`**:
   - Client frames include `item_id` and `client_msg_id` for atomic remove and move operations, enabling exact message tracking and duplicate suppression.
5. **Multi-Artist Credit & Genre Resolution `[PROPOSED]`**:
   - In Monthly Wrap metrics, songs with multiple artists credit each listed artist equally. Genres are derived from artist-level genre associations.
