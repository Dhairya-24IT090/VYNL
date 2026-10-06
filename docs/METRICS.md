# VYNL Prometheus Metrics Catalog (`docs/METRICS.md`)

This document defines the metrics dictionary, labeling standards, recording rules, and alert rules per Task `[O-2-c-b]`.

---

## 1. Naming & Labeling Standards

- **Prefix**: All metrics are prefixed with `vynl_`.
- **Mandatory Labels**:
  - `service`: `playlist-service` or `wrap-service`.
  - `route`: Templated route pattern (e.g., `/v1/playlists/{id}`, never raw IDs to prevent high cardinality).
  - `method`: HTTP method in uppercase (`GET`, `POST`, `PATCH`, `DELETE`).
  - `status_class`: HTTP response status group (`2xx`, `4xx`, `5xx`).

---

## 2. Golden Signals & Standard Metrics

| Metric Name | Type | Description | Labels |
|---|---|---|---|
| `vynl_http_request_duration_seconds` | Histogram | Request latency distribution | `service, route, method, status_code` |
| `vynl_http_requests_total` | Counter | Total HTTP requests completed | `service, route, method, status_class` |
| `vynl_http_errors_total` | Counter | Total HTTP 5xx errors | `service, route, method, error_code` |
| `vynl_inflight_requests` | Gauge | Currently executing in-flight requests | `service` |
| `vynl_db_pool_in_use` | Gauge | Active asyncpg connections in use | `service` |
| `vynl_db_pool_size` | Gauge | Total asyncpg pool capacity | `service` |
| `vynl_redis_pool_in_use` | Gauge | Active Redis connections in use | `service` |
| `vynl_ws_connections` | Gauge | Active collaborative WebSocket connections | `service, playlist_id` |
| `vynl_worker_busy` | Gauge | Worker busy status | `service, worker_type` |
| `vynl_dlq_depth` | Gauge | Count of messages in dead-letter queue stream | `service, job_name` |
| `vynl_queue_lag_seconds` | Gauge | Age of oldest unprocessed message | `service, job_name` |

---

## 3. Slice-Shared Metrics (Declared at 0)

Per Task `[O-2-c-b]`, metrics owned by other developers' future services are exported with standard labels (initialized to 0) so Prometheus scrapers find them immediately:
- `vynl_song_resolve_total{result="hit|miss"}`: Incremented when checking song status.
- `vynl_telegram_reuse_vs_fetch_total{outcome="reuse|fetch"}`: Placeholder counter initialized at 0.
- `vynl_llm_validation_failures_total`: Placeholder counter initialized at 0.

---

## 4. Prometheus Recording & Alert Rules

```yaml
groups:
  - name: vynl_rules
    rules:
      - record: vynl_song_cache_hit_ratio
        expr: sum(rate(vynl_song_resolve_total{result="hit"}[5m])) / sum(rate(vynl_song_resolve_total[5m]))

      - alert: VynlHighHttpErrorRate
        expr: sum(rate(vynl_http_errors_total[5m])) / sum(rate(vynl_http_requests_total[5m])) > 0.02
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "HTTP 5xx error rate exceeds 2% for 5 minutes"

      - alert: VynlQueueLagCritical
        expr: vynl_queue_lag_seconds > 60
        for: 1m
        labels:
          severity: warning
        annotations:
          summary: "Job queue lag exceeds 60 seconds"

      - alert: VynlDeadLetterQueueNotEmpty
        expr: vynl_dlq_depth > 0
        for: 30s
        labels:
          severity: critical
        annotations:
          summary: "Dead letter queue contains unrecoverable failed jobs"
```
