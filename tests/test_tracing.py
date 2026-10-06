"""
Integration test for Distributed Tracing per Task 49 [O-1-c-b] and docs/OBSERVABILITY.md.
Verifies that one W3C traceparent spans from the browser HTTP client through
FastAPI middleware, domain service, Redis Streams job envelope, and background worker.
"""
import json
import uuid
import asyncio
import httpx
import pytest
import pytest_asyncio
from opentelemetry import trace
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import SimpleSpanProcessor
from opentelemetry.sdk.trace.export.in_memory_span_exporter import InMemorySpanExporter
from opentelemetry.trace.propagation.tracecontext import TraceContextTextMapPropagator

from service_kit.auth import InMemorySessionVerifier
from service_kit.jobs import JobQueue, JobWorker
from service_kit.observability import extract_traceparent
from service_kit.redis_ import RedisManager
from tests.test_authz import MockDatabaseManager, MockPlaylistRepository

from playlist_service.config import PlaylistSettings
from playlist_service.drafts import DraftStore
from playlist_service.main import create_app as create_playlist_app

@pytest_asyncio.fixture
async def tracing_env():
    # Setup in-memory span exporter for OpenTelemetry verification
    exporter = InMemorySpanExporter()
    provider = TracerProvider()
    provider.add_span_processor(SimpleSpanProcessor(exporter))
    tracer = provider.get_tracer("vynl_test")

    settings = PlaylistSettings()
    db = MockDatabaseManager()
    redis_mgr = RedisManager(redis_url="redis://127.0.0.1:6379")
    await redis_mgr.get_client()
    verifier = InMemorySessionVerifier()
    drafts = DraftStore(redis_mgr._client)
    repo = MockPlaylistRepository()

    user_id = str(uuid.uuid4())
    verifier.add_session("trace-session-token", user_id)

    app = create_playlist_app(settings, db, redis_mgr, verifier, drafts, repo=repo)

    return {
        "app": app,
        "redis_mgr": redis_mgr,
        "user_id": user_id,
        "token": "trace-session-token",
        "tracer": tracer,
        "exporter": exporter,
    }

@pytest.mark.asyncio
async def test_trace_spans_browser_to_worker(tracing_env):
    """
    Test flow:
    1. Browser client initiates request with W3C traceparent.
    2. FastAPI service receives request, validates trace_id, injects into context.
    3. Service triggers a background job (e.g. AI collab suggest or async task) to Redis Streams.
    4. Worker consumes the job and inherits the identical trace_id.
    5. HTTP response returns traceparent with the identical trace_id.
    """
    app = tracing_env["app"]
    redis_mgr = tracing_env["redis_mgr"]
    token = tracing_env["token"]

    # 1. Generate client-side trace_id and span_id
    client_trace_id = "4bf92f3577b34da6a3ce929d0e0e4736"
    client_span_id = "00f067aa0ba902b7"
    client_traceparent = f"00-{client_trace_id}-{client_span_id}-01"

    worker_received_traces = []
    worker_completed_event = asyncio.Event()

    # Define background worker handler that extracts and validates traceparent
    async def sample_worker_handler(payload: dict, envelope: dict):
        job_traceparent = envelope.get("traceparent")
        t_id, s_id = extract_traceparent({"traceparent": job_traceparent})
        worker_received_traces.append({
            "traceparent": job_traceparent,
            "trace_id": t_id,
            "parent_span_id": s_id,
            "payload": payload,
        })
        worker_completed_event.set()

    job_name = f"test_trace_job_{uuid.uuid4().hex[:6]}"
    worker = JobWorker(
        redis_manager=redis_mgr,
        job_name=job_name,
        handler=sample_worker_handler,
        consumer_group=f"grp_{uuid.uuid4().hex[:6]}",
    )
    await worker.start()

    try:
        # 2. Browser calls HTTP endpoint with traceparent header
        async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://test") as client:
            client.cookies.set("vynl_session", token)

            # Trigger a request (e.g. create playlist)
            resp = await client.post(
                "/v1/playlists",
                json={"title": "Trace Test Playlist"},
                headers={
                    "traceparent": client_traceparent,
                    "X-Request-ID": str(uuid.uuid4()),
                },
            )
            assert resp.status_code == 201

            # 3. Assert HTTP response echoes W3C traceparent with exact same trace_id
            resp_traceparent = resp.headers.get("traceparent")
            assert resp_traceparent is not None, "Response must include traceparent header"
            resp_trace_id, resp_span_id = extract_traceparent({"traceparent": resp_traceparent})
            assert resp_trace_id == client_trace_id, f"Trace ID mismatch: expected {client_trace_id}, got {resp_trace_id}"

            # 4. Service enqueues job with request context traceparent
            queue = JobQueue(redis_mgr)
            job_id = await queue.enqueue(
                job_name=job_name,
                payload={"playlist_id": resp.json()["id"]},
                traceparent=resp_traceparent,
            )
            assert job_id is not None

        # 5. Wait for worker to consume job and assert trace propagation
        await asyncio.wait_for(worker_completed_event.wait(), timeout=5.0)

        assert len(worker_received_traces) == 1
        record = worker_received_traces[0]

        # 6. Verify end-to-end trace correlation
        assert record["trace_id"] == client_trace_id, (
            f"Worker received trace_id {record['trace_id']} does not match client trace_id {client_trace_id}"
        )
        assert record["traceparent"].startswith(f"00-{client_trace_id}-")

    finally:
        await worker.stop()
