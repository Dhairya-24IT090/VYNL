from typing import Any, Dict, List, Optional
from fastapi.responses import JSONResponse

class AppException(Exception):
    def __init__(
        self,
        code: str,
        message: str,
        status_code: int = 400,
        fields: Optional[List[Dict[str, str]]] = None,
        headers: Optional[Dict[str, str]] = None,
    ):
        super().__init__(message)
        self.code = code
        self.message = message
        self.status_code = status_code
        self.fields = fields
        self.headers = headers or {}

class ValidationError(AppException):
    def __init__(self, message: str = "Validation failed", fields: Optional[List[Dict[str, str]]] = None):
        super().__init__("validation_error", message, 422, fields)

class UnauthorizedError(AppException):
    def __init__(self, message: str = "Authentication required"):
        super().__init__("unauthorized", message, 401)

class ForbiddenError(AppException):
    def __init__(self, message: str = "Access denied"):
        super().__init__("forbidden", message, 403)

class NotFoundError(AppException):
    def __init__(self, message: str = "Resource not found"):
        super().__init__("not_found", message, 404)

class ConflictError(AppException):
    def __init__(self, message: str = "Resource conflict"):
        super().__init__("conflict", message, 409)

class PreconditionRequiredError(AppException):
    def __init__(self, message: str = "Precondition required (missing If-Match)"):
        super().__init__("precondition_required", message, 428)

class PreconditionFailedError(AppException):
    def __init__(self, message: str = "Precondition failed (version mismatch)"):
        super().__init__("version_conflict", message, 412)

class GoneError(AppException):
    def __init__(self, message: str = "Resource unavailable"):
        super().__init__("invite_unavailable", message, 410)

class PayloadTooLargeError(AppException):
    def __init__(self, message: str = "Payload exceeds maximum limit"):
        super().__init__("payload_too_large", message, 413)

class RateLimitedError(AppException):
    def __init__(self, message: str = "Rate limit exceeded", retry_after: int = 60):
        super().__init__(
            "rate_limited",
            message,
            429,
            headers={"Retry-After": str(retry_after)},
        )
        self.retry_after = retry_after

class DependencyUnavailableError(AppException):
    def __init__(self, message: str = "Downstream service unavailable", retry_after: int = 30):
        super().__init__(
            "dependency_unavailable",
            message,
            503,
            headers={"Retry-After": str(retry_after)},
        )
        self.retry_after = retry_after

class GatewayTimeoutError(AppException):
    def __init__(self, message: str = "Downstream service timed out"):
        super().__init__("gateway_timeout", message, 504)

class InternalServerError(AppException):
    def __init__(self, message: str = "An unexpected error occurred"):
        super().__init__("internal_error", message, 500)

def format_error_body(
    code: str,
    message: str,
    request_id: str,
    fields: Optional[List[Dict[str, str]]] = None,
) -> Dict[str, Any]:
    err: Dict[str, Any] = {
        "code": code,
        "message": message,
    }
    if fields:
        err["fields"] = fields
    return {
        "error": err,
        "request_id": request_id,
    }

def create_error_response(
    status_code: int,
    code: str,
    message: str,
    request_id: str,
    fields: Optional[List[Dict[str, str]]] = None,
    headers: Optional[Dict[str, str]] = None,
) -> JSONResponse:
    content = format_error_body(code, message, request_id, fields)
    resp_headers = {"X-Request-ID": request_id}
    if headers:
        resp_headers.update(headers)
    return JSONResponse(
        status_code=status_code,
        content=content,
        headers=resp_headers,
    )
