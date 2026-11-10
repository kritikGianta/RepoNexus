from fastapi import APIRouter

from app.core.config import get_settings
from app.schemas.common import SystemStatusResponse

router = APIRouter()


@router.get("/status", response_model=SystemStatusResponse)
async def system_status() -> SystemStatusResponse:
    """Public, non-sensitive view of which integrations are configured (used by the UI)."""
    settings = get_settings()
    return SystemStatusResponse(
        version=settings.app_version,
        environment=settings.environment,
        ai_configured=settings.ai_configured,
        github_oauth_configured=settings.github_oauth_configured,
        task_execution_mode="celery" if settings.use_celery else "inline",
        mlflow_enabled=bool(settings.mlflow_tracking_uri),
    )
