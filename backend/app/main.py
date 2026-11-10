import logging
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.responses import ORJSONResponse
from sqlalchemy import text

from app.api.middleware import CorrelationIdMiddleware, SecurityHeadersMiddleware
from app.api.middleware.rate_limit import RateLimitMiddleware
from app.api.router import api_router
from app.core.config import get_settings
from app.core.exceptions import AppError
from app.core.logging import configure_logging
from app.db.session import AsyncSessionLocal, engine
from app.models.base import Base
from app.schemas.common import HealthResponse, ReadinessResponse

settings = get_settings()
configure_logging(settings.log_level)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(_: FastAPI):
    Path(settings.rag_store_dir).mkdir(parents=True, exist_ok=True)
    # Schema is owned by Alembic (the container entrypoint runs `alembic upgrade head`).
    # create_all only exists to make zero-config local development and tests work.
    if settings.environment in ("development", "test"):
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
    try:
        from app.services.analysis_service import AnalysisService

        async with AsyncSessionLocal() as session:
            recovered = await AnalysisService(session).fail_stale_runs()
            if recovered:
                logger.info("Marked %s stale analysis runs as failed", recovered)
    except Exception:  # noqa: BLE001 - never block startup on housekeeping
        logger.exception("Stale run recovery failed")
    yield
    await engine.dispose()


app = FastAPI(
    title=settings.app_name,
    version=settings.app_version,
    description="AI-powered repository intelligence and technical-debt governance for GitHub.",
    default_response_class=ORJSONResponse,
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
)


@app.exception_handler(AppError)
async def app_error_handler(_: Request, exc: AppError) -> ORJSONResponse:
    return ORJSONResponse(status_code=exc.status_code, content={"detail": str(exc)})


@app.exception_handler(Exception)
async def unhandled_error_handler(request: Request, exc: Exception) -> ORJSONResponse:
    logger.exception("Unhandled error on %s %s", request.method, request.url.path)
    return ORJSONResponse(status_code=500, content={"detail": "Internal server error"})


# Starlette runs the most recently added middleware first, so CORS is added last to make it
# the outermost layer: preflight requests and error responses always carry CORS headers.
app.add_middleware(GZipMiddleware, minimum_size=1024)
app.add_middleware(RateLimitMiddleware)
app.add_middleware(SecurityHeadersMiddleware)
app.add_middleware(CorrelationIdMiddleware)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["X-Request-ID"],
)

app.include_router(api_router, prefix=settings.api_v1_prefix)


@app.get("/health", response_model=HealthResponse, tags=["system"])
async def health() -> HealthResponse:
    """Liveness probe: the process is up."""
    return HealthResponse(status="ok", service="reponexus-backend")


@app.get("/health/ready", response_model=ReadinessResponse, tags=["system"])
async def readiness() -> ORJSONResponse:
    """Readiness probe: database (and Redis when Celery is enabled) are reachable."""
    checks: dict[str, str] = {}
    try:
        async with engine.connect() as conn:
            await conn.execute(text("SELECT 1"))
        checks["database"] = "ok"
    except Exception as exc:  # noqa: BLE001
        checks["database"] = f"error: {exc.__class__.__name__}"

    if settings.use_celery:
        try:
            import redis.asyncio as aioredis

            client = aioredis.from_url(settings.redis_url, socket_connect_timeout=2)
            await client.ping()
            await client.aclose()
            checks["redis"] = "ok"
        except Exception as exc:  # noqa: BLE001
            checks["redis"] = f"error: {exc.__class__.__name__}"

    healthy = all(v == "ok" for v in checks.values())
    body = ReadinessResponse(status="ok" if healthy else "degraded", checks=checks)
    return ORJSONResponse(status_code=200 if healthy else 503, content=body.model_dump())
