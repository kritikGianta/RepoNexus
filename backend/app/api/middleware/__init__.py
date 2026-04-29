import uuid
import time

from starlette.middleware.base import BaseHTTPMiddleware, RequestResponseEndpoint
from starlette.requests import Request
from starlette.responses import Response

import structlog


class CorrelationIdMiddleware(BaseHTTPMiddleware):
    """Attaches a unique X-Request-ID to every request/response and binds it to structlog context."""

    async def dispatch(self, request: Request, call_next: RequestResponseEndpoint) -> Response:
        request_id = request.headers.get("x-request-id", str(uuid.uuid4()))
        structlog.contextvars.clear_contextvars()
        structlog.contextvars.bind_contextvars(request_id=request_id)

        start = time.perf_counter()
        response = await call_next(request)
        elapsed_ms = round((time.perf_counter() - start) * 1000, 2)

        response.headers["X-Request-ID"] = request_id
        log = structlog.get_logger()
        await log.ainfo(
            "http_request",
            method=request.method,
            path=str(request.url.path),
            status=response.status_code,
            duration_ms=elapsed_ms,
        )
        return response
