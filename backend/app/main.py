from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import ORJSONResponse

from app.api.middleware import CorrelationIdMiddleware
from app.api.middleware.rate_limit import RateLimitMiddleware
from app.api.router import api_router
from app.core.config import get_settings
from app.core.logging import configure_logging
from app.db.session import engine
from app.models.base import Base
from app.schemas.common import HealthResponse

settings = get_settings()
configure_logging()


@asynccontextmanager
async def lifespan(_: FastAPI):
    # In production, tables are managed by Alembic migrations (alembic upgrade head).
    # create_all is kept for development/test convenience only.
    if settings.environment in ("development", "test"):
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
    yield


app = FastAPI(
    title=settings.app_name,
    version=settings.app_version,
    default_response_class=ORJSONResponse,
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["X-Request-ID"],
)

# Place custom middleware after CORS so preflight OPTIONS requests receive
# CORS headers even if earlier middleware would return a response.
app.add_middleware(RateLimitMiddleware)
app.add_middleware(CorrelationIdMiddleware)

app.include_router(api_router, prefix=settings.api_v1_prefix)


@app.get("/health", response_model=HealthResponse)
async def health() -> HealthResponse:
    return HealthResponse(status="ok", service="reponexus-backend")
