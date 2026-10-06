# VYNL Error Mapping Specification (`docs/ERROR_MAPPING.md`)

This document defines the centralized HTTP error status code mapping and response body schema per `VYNL_Backend_Flowcharts_Rev2.pdf` Appendix B.

---

## 1. Unified Error Body Schema

Every error response returned by any VYNL service must strictly conform to:

```json
{
  "error": {
    "code": "string_identifier",
    "message": "Human-readable description without internal leakages",
    "fields": [
      {
        "field": "title",
        "issue": "Field is required"
      }
    ]
  },
  "request_id": "00000000-0000-0000-0000-000000000000"
}
```

- `fields` is optional and present only for field-level validation errors.
- Internal stack traces, raw SQL queries, and internal system paths are strictly forbidden in response bodies (logged only to structured server logs).

---

## 2. Rev2 Appendix B Status Mapping Matrix

| Error Class | Status Code | Error Code Example | Headers | Description / Behavior |
|---|---|---|---|---|
| **Validation** | `400` / `422` | `validation_error` | None | Malformed JSON body or Pydantic constraint violations. No client retry. |
| **Authentication** | `401` | `unauthorized` | Clear-Cookie (optional) | Missing, invalid, or expired session token. Client must re-authenticate. |
| **Authorization** | `403` | `forbidden` | None | Authenticated user lacks permission for the resource. |
| **Not Found / Hidden** | `404` | `not_found` | None | Resource does not exist OR user is a stranger (hiding resource existence). |
| **Conflict** | `409` | `conflict` | None | Resource state conflict (e.g. invite already redeemed or owner self-redeeming). |
| **Precondition Failed** | `412` | `version_conflict` | None | Stale `If-Match` header on optimistic lock update. Client must fetch fresh state. |
| **Precondition Missing** | `428` | `precondition_required`| None | Missing `If-Match` header on mutating versioned endpoint. |
| **Gone** | `410` | `invite_unavailable` | None | Invite expired, already used, or revoked. Same code for all 3 cases (anti-oracle). |
| **Payload Too Large** | `413` | `payload_too_large` | None | Request body exceeds 1 MB limit (enforced at middleware). |
| **Rate Limit** | `429` | `rate_limited` | `Retry-After: <sec>` | Token bucket exhausted or refresh rate limit triggered. |
| **Async / Not Ready** | `202` | N/A | `Location: <url>` | Resource currently being acquired/computed (e.g. song resolve). |
| **Dependency Down** | `502` / `503` | `dependency_unavailable`| `Retry-After: <sec>` | Upstream service breaker open (e.g., Discogs, LLM). Core audio unaffected. |
| **Dependency Timeout** | `504` | `gateway_timeout` | None | Outbound service call timed out past the request deadline. |
| **Internal Server Error**| `500` | `internal_error` | None | Uncaught exception. Generic safe message returned; details in server logs. |
