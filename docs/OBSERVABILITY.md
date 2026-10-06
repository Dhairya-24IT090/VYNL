# VYNL Observability & Distributed Tracing (`docs/OBSERVABILITY.md`)

This document details the distributed tracing architecture and context propagation protocol per Task `[O-1-c-b]`.

---

## 1. W3C Traceparent Standard

VYNL standardizes on W3C Trace Context:
```
traceparent: 00-{trace_id}-{parent_id}-{trace_flags}
```

- `version`: Always `00`.
- `trace_id`: 32 hex characters representing the end-to-end distributed transaction.
- `parent_id`: 16 hex characters representing the immediate upstream span.
- `trace_flags`: `01` (sampled) or `00` (not sampled).

---

## 2. Distributed Propagation Path

A single trace must span from the browser through background workers:

```
[Browser / Web API Client]
       │
       ▼ (HTTP Request with W3C `traceparent` header)
[FastAPI Middleware (Rev2 Flow 0)]
       │ (Extracts traceparent, creates root/child OpenTelemetry span)
       │
       ▼
[Service Domain Layer & Repository]
       │
       ▼ (Enqueues job to Redis Streams)
[Redis Stream Envelope (`traceparent` copied into job payload)]
       │
       ▼ (Worker consumes job from stream)
[Background Job Worker Loop]
       │ (Restores trace context as parent span)
       │
       ▼
[Outbound Relay / External HTTP Call]
```

---

## 3. WebSocket Trace Inheritance

WebSocket connections inherit the trace context provided during the initial HTTP handshake `GET /v1/playlists/{id}/live`. All events emitted and processed over that socket belong to the handshake trace.

---

## 4. Verification

1. **In-Memory Exporter Test**: Unit/integration tests configure OpenTelemetry with an `InMemorySpanExporter`. A test simulates an HTTP request enqueuing a job, executes the worker, and asserts all spans share the identical `trace_id`.
2. **Jaeger Integration**: In Docker compose or local proxy, traces exported via OTLP are queryable via Jaeger API at `http://localhost:16686/api/traces/{trace_id}`.
