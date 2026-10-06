"""
Integration test for Prometheus Metrics Scraping and Consistency per Task 50 [O-2-c-b] and docs/METRICS.md.
Verifies that /metrics endpoint exports all required metrics with consistent labels
across both playlist-service and wrap-service.
"""
import uuid
import httpx
import pytest
import pytest_asyncio

from service_kit.auth import InMemorySessionVerifier
from service_kit.redis_ import RedisManager
from tests.test_authz import MockDatabaseManager, MockPlaylistRepository

# Playlist Service App
from playlist_service.config import PlaylistSettings
from playlist_service.drafts import DraftStore
from playlist_service.main import create_app as create_playlist_app

# Wrap Service App
from wrap_service.config import WrapSettings
from wrap_service.main import create_app as create_wrap_app

MANDATORY_METRIC_NAMES = [
    "vynl_http_requests_total",
    "vynl_http_errors_total",
    "vynl_http_request_duration_seconds",
    "vynl_inflight_requests",
    "vynl_db_pool_in_use",
    "vynl_db_pool_size",
    "vynl_redis_pool_in_use",
    "vynl_ws_connections",
    "vynl_worker_busy",
    "vynl_dlq_depth",
    "vynl_queue_lag_seconds",
    "vynl_song_resolve_total",
    "vynl_telegram_reuse_vs_fetch_total",
    "vynl_llm_validation_failures_total",
]

@pytest_asyncio.fixture
async def playlist_client():
    settings = PlaylistSettings()
    db = MockDatabaseManager()
    redis_mgr = RedisManager(redis_url="redis://127.0.0.1:6379")
    await redis_mgr.get_client()
    verifier = InMemorySessionVerifier()
    drafts = DraftStore(redis_mgr._client)
    repo = MockPlaylistRepository()
    app = create_playlist_app(settings, db, redis_mgr, verifier, drafts, repo=repo)
    async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://test") as client:
        yield client

@pytest_asyncio.fixture
async def wrap_client():
    settings = WrapSettings()
    db = MockDatabaseManager()
    redis_mgr = RedisManager(redis_url="redis://127.0.0.1:6379")
    await redis_mgr.get_client()
    verifier = InMemorySessionVerifier()
    app = create_wrap_app(settings, db, redis_mgr, verifier)
    async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://test") as client:
        yield client

@pytest.mark.asyncio
async def test_playlist_metrics_scraping_and_label_consistency(playlist_client):
    # 1. Perform requests to exercise the metrics middleware
    await playlist_client.get("/healthz")
    await playlist_client.get("/v1/playlists")  # 401 unauthenticated

    # 2. Scrape /metrics endpoint
    resp = await playlist_client.get("/metrics")
    assert resp.status_code == 200
    metrics_text = resp.text

    # 3. Assert all mandatory metrics are present
    for metric_name in MANDATORY_METRIC_NAMES:
        assert f"# HELP {metric_name}" in metrics_text or f"# TYPE {metric_name}" in metrics_text, (
            f"Metric {metric_name} missing from /metrics output"
        )

    # 4. Assert service label consistency
    assert 'service="playlist-service"' in metrics_text

    # 5. Assert HTTP counter recorded status class and method
    assert 'method="GET"' in metrics_text
    assert 'status_class="2xx"' in metrics_text or 'status_class="4xx"' in metrics_text

    # 6. Assert slice-shared placeholder metrics are declared at 0
    assert 'vynl_song_resolve_total{result="hit",service="playlist-service"} 0.0' in metrics_text
    assert 'vynl_telegram_reuse_vs_fetch_total{outcome="reuse",service="playlist-service"} 0.0' in metrics_text
    assert 'vynl_llm_validation_failures_total{service="playlist-service"} 0.0' in metrics_text

@pytest.mark.asyncio
async def test_wrap_metrics_scraping_and_label_consistency(wrap_client):
    # 1. Perform requests to exercise the metrics middleware
    await wrap_client.get("/healthz")
    await wrap_client.get("/v1/wrap/2026-08")  # 401 unauthenticated

    # 2. Scrape /metrics endpoint
    resp = await wrap_client.get("/metrics")
    assert resp.status_code == 200
    metrics_text = resp.text

    # 3. Assert all mandatory metrics are present
    for metric_name in MANDATORY_METRIC_NAMES:
        assert f"# HELP {metric_name}" in metrics_text or f"# TYPE {metric_name}" in metrics_text, (
            f"Metric {metric_name} missing from wrap-service /metrics output"
        )

    # 4. Assert service label consistency
    assert 'service="wrap-service"' in metrics_text

    # 5. Assert HTTP counter recorded status class and method
    assert 'method="GET"' in metrics_text
    assert 'status_class="2xx"' in metrics_text or 'status_class="4xx"' in metrics_text
