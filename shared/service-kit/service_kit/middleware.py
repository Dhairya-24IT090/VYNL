import time
import uuid
from typing import Callable, List, Optional
from fastapi import FastAPI, Request, Response
from starlette.middleware.base import BaseHTTPMiddleware
from service_kit.auth import SessionVerifier, verify_internal_auth
from service_kit.context import Actor, RequestContext
from service_kit.errors import (
    AppException,
    PayloadTooLargeError,
    UnauthorizedError,
    create_error_response,
)
from service_kit.logging import setup_logger
from service_kit.observability import MetricsRegistry, extract_traceparent
from service_kit.redis_ import RedisManager

logger = setup_logger()

class Flow0Middleware(BaseHTTPMiddleware):
    def __init__(
        self,
        app: FastAPI,
        service_name: str,
        session_verifier: SessionVerifier,
        redis_manager: Optional[RedisManager] = None,
        metrics_registry: Optional[MetricsRegistry] = None,
        internal_auth_secret: str = "dev-internal-auth-secret",
        allowed_origins: Optional[List[str]] = None,
        max_body_bytes: int = 1048576,  # 1 MB
        request_timeout: float = 15.0,
    ):
        super().__init__(app)
        self.service_name = service_name
        self.session_verifier = session_verifier
        self.redis_manager = redis_manager
        self.metrics_registry = metrics_registry
        self.internal_auth_secret = internal_auth_secret
        self.allowed_origins = allowed_origins or ["http://localhost:5173", "http://localhost:3000"]
        self.max_body_bytes = max_body_bytes
        self.request_timeout = request_timeout

    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        start_time = time.monotonic()
        
        # 1. Request-ID & W3C Traceparent extraction
        request_id = request.headers.get("X-Request-ID") or str(uuid.uuid4())
        trace_id, span_id = extract_traceparent(dict(request.headers))

        # 2. CORS & Origin validation
        origin = request.headers.get("Origin")
        is_cors_preflight = request.method == "OPTIONS"

        # 3. Body-size cap (1 MB limit via Content-Length or streaming)
        content_length = request.headers.get("Content-Length")
        if content_length and int(content_length) > self.max_body_bytes:
            return create_error_response(
                status_code=413,
                code="payload_too_large",
                message=f"Request entity exceeds max limit of {self.max_body_bytes} bytes",
                request_id=request_id,
            )

        # 4. Authentication & Context resolution
        actor = Actor(user_id=None, is_internal=False)
        
        # Check internal service auth header
        internal_sig = request.headers.get("X-Internal-Auth")
        internal_ts = request.headers.get("X-Internal-Timestamp")
        if internal_sig and internal_ts:
            if verify_internal_auth(
                self.internal_auth_secret,
                request.method,
                request.url.path,
                internal_ts,
                request_id,
                internal_sig,
            ):
                actor = Actor(user_id=None, is_internal=True)

        # Check session cookie if not internal
        if not actor.is_internal:
            session_token = request.cookies.get("vynl_session")
            if session_token:
                session_result = await self.session_verifier.verify_session(session_token)
                if session_result:
                    user_id, _ = session_result
                    actor = Actor(user_id=user_id, is_internal=False)

        # CSRF check on mutating requests for cookie-authenticated sessions
        if actor.is_authenticated and not actor.is_internal and request.method in ("POST", "PUT", "PATCH", "DELETE"):
            csrf_cookie = request.cookies.get("csrf_token")
            csrf_header = request.headers.get("X-CSRF-Token")
            # If csrf_cookie exists, require double-submit match
            if csrf_cookie and csrf_header != csrf_cookie:
                # Also allow reading from body if beacon
                return create_error_response(
                    status_code=403,
                    code="forbidden",
                    message="CSRF validation failed",
                    request_id=request_id,
                )

        # 5. Rate limiting (Redis token bucket)
        if self.redis_manager and not actor.is_internal:
            rate_key = f"rl:{actor.user_id or request.client.host if request.client else 'anon'}"
            try:
                await self.redis_manager.check_rate_limit(rate_key, capacity=60, fill_rate=1.0)
            except AppException as e:
                return create_error_response(
                    status_code=e.status_code,
                    code=e.code,
                    message=e.message,
                    request_id=request_id,
                    headers=e.headers,
                )

        # 6. Build RequestContext
        deadline = start_time + self.request_timeout
        ctx = RequestContext(
            request_id=request_id,
            trace_id=trace_id,
            actor=actor,
            deadline=deadline,
        )
        request.state.context = ctx

        # Execute downstream pipeline with Panic Recovery & Metric tracking
        if self.metrics_registry:
            self.metrics_registry.inflight_requests.labels(service=self.service_name).inc()

        status_code = 500
        error_code = None
        try:
            response = await call_next(request)
            status_code = response.status_code
        except AppException as app_exc:
            status_code = app_exc.status_code
            error_code = app_exc.code
            response = create_error_response(
                status_code=app_exc.status_code,
                code=app_exc.code,
                message=app_exc.message,
                request_id=request_id,
                fields=app_exc.fields,
                headers=app_exc.headers,
            )
        except Exception as unhandled_exc:
            status_code = 500
            error_code = "internal_error"
            logger.error(
                f"Unhandled exception on {request.method} {request.url.path}: {unhandled_exc}",
                extra={"request_id": request_id, "trace_id": trace_id},
            )
            response = create_error_response(
                status_code=500,
                code="internal_error",
                message="An unexpected server error occurred",
                request_id=request_id,
            )
        finally:
            latency_ms = int((time.monotonic() - start_time) * 1000)
            status_class = f"{status_code // 100}xx"
            route_template = request.url.path

            if self.metrics_registry:
                self.metrics_registry.inflight_requests.labels(service=self.service_name).dec()
                self.metrics_registry.http_requests_total.labels(
                    service=self.service_name,
                    route=route_template,
                    method=request.method,
                    status_class=status_class,
                ).inc()
                self.metrics_registry.http_duration_seconds.labels(
                    service=self.service_name,
                    route=route_template,
                    method=request.method,
                    status_class=status_class,
                ).observe(latency_ms / 1000.0)
                if status_code >= 500:
                    self.metrics_registry.http_errors_total.labels(
                        service=self.service_name,
                        route=route_template,
                        method=request.method,
                        error_code=error_code or "unknown",
                    ).inc()

            # Structured JSON Access Log
            logger.info(
                f"{request.method} {route_template} {status_code} ({latency_ms}ms)",
                extra={
                    "request_id": request_id,
                    "trace_id": trace_id,
                    "user_id": actor.user_id,
                    "route": route_template,
                    "status": status_code,
                    "latency_ms": latency_ms,
                    "error_code": error_code,
                },
            )

        # Attach standard headers
        response.headers["X-Request-ID"] = request_id
        response.headers["traceparent"] = f"00-{trace_id}-{span_id}-01"
        if origin and (origin in self.allowed_origins or "*" in self.allowed_origins):
            response.headers["Access-Control-Allow-Origin"] = origin
            response.headers["Access-Control-Allow-Credentials"] = "true"
            response.headers["Access-Control-Allow-Headers"] = "Content-Type, Authorization, X-Request-ID, X-CSRF-Token, If-Match, Idempotency-Key"
            response.headers["Access-Control-Allow-Methods"] = "GET, POST, PUT, PATCH, DELETE, OPTIONS"

        return response
