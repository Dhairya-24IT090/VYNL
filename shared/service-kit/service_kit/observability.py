import time
from typing import Callable, Optional
from fastapi import APIRouter, Response, Request
from prometheus_client import (
    CollectorRegistry,
    Counter,
    Gauge,
    Histogram,
    generate_latest,
    CONTENT_TYPE_LATEST,
)
from opentelemetry import trace
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.trace.propagation.tracecontext import TraceContextTextMapPropagator

# Initialize global tracer provider if none set
if not isinstance(trace.get_tracer_provider(), TracerProvider):
    trace.set_tracer_provider(TracerProvider())

tracer = trace.get_tracer("vynl")
propagator = TraceContextTextMapPropagator()

def extract_traceparent(headers: dict) -> tuple[str, str]:
    """Extracts or generates W3C traceparent (trace_id, span_id)."""
    context = propagator.extract(carrier=headers)
    span = trace.get_current_span(context)
    span_ctx = span.get_span_context()
    if span_ctx.is_valid:
        return f"{span_ctx.trace_id:032x}", f"{span_ctx.span_id:016x}"
    
    # Check direct traceparent header
    raw_tp = headers.get("traceparent") or headers.get("Traceparent")
    if raw_tp:
        parts = raw_tp.split("-")
        if len(parts) == 4:
            return parts[1], parts[2]

    # Generate fresh IDs
    import uuid
    trace_id = uuid.uuid4().hex
    span_id = uuid.uuid4().hex[:16]
    return trace_id, span_id

class MetricsRegistry:
    def __init__(self, service_name: str):
        self.service_name = service_name
        self.registry = CollectorRegistry()

        # Golden Signals & Standard Metrics
        self.http_requests_total = Counter(
            "vynl_http_requests_total",
            "Total HTTP requests completed",
            ["service", "route", "method", "status_class"],
            registry=self.registry,
        )
        self.http_errors_total = Counter(
            "vynl_http_errors_total",
            "Total HTTP 5xx errors",
            ["service", "route", "method", "error_code"],
            registry=self.registry,
        )
        self.http_duration_seconds = Histogram(
            "vynl_http_request_duration_seconds",
            "HTTP request duration in seconds",
            ["service", "route", "method", "status_class"],
            registry=self.registry,
            buckets=(0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1.0, 2.5, 5.0, 10.0),
        )
        self.inflight_requests = Gauge(
            "vynl_inflight_requests",
            "Currently executing requests",
            ["service"],
            registry=self.registry,
        )
        self.db_pool_in_use = Gauge(
            "vynl_db_pool_in_use",
            "Active database pool connections",
            ["service"],
            registry=self.registry,
        )
        self.db_pool_size = Gauge(
            "vynl_db_pool_size",
            "Total database pool capacity",
            ["service"],
            registry=self.registry,
        )
        self.redis_pool_in_use = Gauge(
            "vynl_redis_pool_in_use",
            "Active Redis pool connections",
            ["service"],
            registry=self.registry,
        )
        self.ws_connections = Gauge(
            "vynl_ws_connections",
            "Active collaborative WebSocket connections",
            ["service", "playlist_id"],
            registry=self.registry,
        )
        self.worker_busy = Gauge(
            "vynl_worker_busy",
            "Worker busy indicator (1=busy, 0=idle)",
            ["service", "worker_type"],
            registry=self.registry,
        )
        self.dlq_depth = Gauge(
            "vynl_dlq_depth",
            "Current depth of the dead-letter queue",
            ["service", "job_name"],
            registry=self.registry,
        )
        self.queue_lag_seconds = Gauge(
            "vynl_queue_lag_seconds",
            "Age of the oldest pending message",
            ["service", "job_name"],
            registry=self.registry,
        )

        # Slice-shared metrics declared at 0 for scraper consistency
        self.song_resolve_total = Counter(
            "vynl_song_resolve_total",
            "Song resolution outcomes",
            ["service", "result"],
            registry=self.registry,
        )
        self.song_resolve_total.labels(service=self.service_name, result="hit")
        self.song_resolve_total.labels(service=self.service_name, result="miss")

        self.telegram_reuse_vs_fetch_total = Counter(
            "vynl_telegram_reuse_vs_fetch_total",
            "Audio delivery storage source",
            ["service", "outcome"],
            registry=self.registry,
        )
        self.telegram_reuse_vs_fetch_total.labels(service=self.service_name, outcome="reuse")
        self.telegram_reuse_vs_fetch_total.labels(service=self.service_name, outcome="fetch")

        self.llm_validation_failures_total = Counter(
            "vynl_llm_validation_failures_total",
            "LLM response structural validation errors",
            ["service"],
            registry=self.registry,
        )
        self.llm_validation_failures_total.labels(service=self.service_name)

def create_health_router(
    service_name: str,
    metrics_registry: MetricsRegistry,
    is_draining_fn: Callable[[], bool],
    ready_check_fn: Optional[Callable[[], bool]] = None,
) -> APIRouter:
    router = APIRouter(tags=["observability"])

    @router.get("/healthz")
    async def healthz():
        # Liveness check: always 200 while process is up
        return {"status": "ok", "service": service_name}

    @router.get("/readyz")
    async def readyz(response: Response):
        # Readiness check: returns 503 if draining or dependencies failing
        if is_draining_fn():
            response.status_code = 503
            return {"status": "draining", "service": service_name}

        if ready_check_fn:
            try:
                is_ready = await ready_check_fn() if callable(ready_check_fn) else True
                if not is_ready:
                    response.status_code = 503
                    return {"status": "unready", "service": service_name}
            except Exception:
                response.status_code = 503
                return {"status": "error", "service": service_name}

        return {"status": "ready", "service": service_name}

    @router.get("/metrics")
    async def metrics():
        data = generate_latest(metrics_registry.registry)
        return Response(content=data, media_type=CONTENT_TYPE_LATEST)

    return router
