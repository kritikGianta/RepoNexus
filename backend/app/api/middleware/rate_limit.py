"""Fixed-window rate limiter.

Uses Redis when TASK_EXECUTION_MODE=celery (Redis is then guaranteed to be running and the
limit is shared by every API worker); otherwise falls back to a per-process in-memory window.
"""

from __future__ import annotations

import logging
import time
from collections import defaultdict

from starlette.middleware.base import BaseHTTPMiddleware, RequestResponseEndpoint
from starlette.requests import Request
from starlette.responses import JSONResponse, Response

from app.core.config import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()

# prefix -> (max_requests, window_seconds); first match wins.
_RATE_LIMITS: list[tuple[str, int, int]] = [
    (f"{settings.api_v1_prefix}/auth", 30, 60),
    (f"{settings.api_v1_prefix}/webhooks", 120, 60),
    (f"{settings.api_v1_prefix}/helpers", 60, 60),
    (f"{settings.api_v1_prefix}/analysis", 60, 60),
]

_memory_log: dict[str, list[float]] = defaultdict(list)
_redis = None


def _get_redis():
    global _redis
    if _redis is None and settings.use_celery:
        try:
            import redis.asyncio as aioredis

            _redis = aioredis.from_url(settings.redis_url, socket_connect_timeout=1, socket_timeout=1)
        except Exception:  # noqa: BLE001
            _redis = None
    return _redis


async def _hit(key: str, max_req: int, window: int) -> bool:
    """Record a request; return True when the caller is over the limit."""
    client = _get_redis()
    if client is not None:
        try:
            bucket = f"rl:{key}:{int(time.time() // window)}"
            count = await client.incr(bucket)
            if count == 1:
                await client.expire(bucket, window)
            return count > max_req
        except Exception:  # noqa: BLE001 - degrade to in-memory limiting
            logger.debug("Redis rate limiter unavailable; using in-memory window")

    now = time.time()
    entries = [t for t in _memory_log[key] if t > now - window]
    over = len(entries) >= max_req
    if not over:
        entries.append(now)
    _memory_log[key] = entries
    return over


class RateLimitMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next: RequestResponseEndpoint) -> Response:
        if not settings.rate_limit_enabled or request.method == "OPTIONS":
            return await call_next(request)

        path = request.url.path
        forwarded = request.headers.get("x-forwarded-for", "")
        client_ip = forwarded.split(",")[0].strip() or (request.client.host if request.client else "unknown")

        for prefix, max_req, window in _RATE_LIMITS:
            if path.startswith(prefix):
                if await _hit(f"{client_ip}:{prefix}", max_req, window):
                    return JSONResponse(
                        status_code=429,
                        content={"detail": "Rate limit exceeded. Please try again later."},
                        headers={"Retry-After": str(window)},
                    )
                break

        return await call_next(request)
