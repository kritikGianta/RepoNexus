import time
from collections import defaultdict

from starlette.middleware.base import BaseHTTPMiddleware, RequestResponseEndpoint
from starlette.requests import Request
from starlette.responses import JSONResponse, Response

# Simple in-memory sliding window rate limiter.
# For production with multiple workers, swap to Redis-based (e.g. redis INCR with TTL).

_RATE_LIMITS: dict[str, tuple[int, int]] = {
    # prefix -> (max_requests, window_seconds)
    "/api/v1/auth": (30, 60),
    "/api/v1/webhooks": (60, 60),
}

_request_log: dict[str, list[float]] = defaultdict(list)


class RateLimitMiddleware(BaseHTTPMiddleware):
    """Very lightweight in-memory rate limiter for auth and webhook routes."""

    async def dispatch(self, request: Request, call_next: RequestResponseEndpoint) -> Response:
        path = request.url.path
        client_ip = request.client.host if request.client else "unknown"

        for prefix, (max_req, window) in _RATE_LIMITS.items():
            if path.startswith(prefix):
                key = f"{client_ip}:{prefix}"
                now = time.time()
                # Prune old entries
                _request_log[key] = [t for t in _request_log[key] if t > now - window]
                if len(_request_log[key]) >= max_req:
                    return JSONResponse(
                        status_code=429,
                        content={"detail": "Rate limit exceeded. Please try again later."},
                        headers={"Retry-After": str(window)},
                    )
                _request_log[key].append(now)
                break

        return await call_next(request)
