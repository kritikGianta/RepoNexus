from fastapi import APIRouter, Depends, HTTPException, Query, BackgroundTasks
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.core.config import get_settings
from app.core.exceptions import ForbiddenError, NotFoundError
from app.db.session import get_db_session
from app.models.enums import TriggerType
from app.models.user import User
from app.schemas.analysis import AnalysisRunListResponse, AnalysisRunResponse, TriggerAnalysisResponse
from app.schemas.common import PageMeta
from app.services.analysis_service import AnalysisService
from app.tasks.analysis_tasks import run_analysis_task, _run_analysis

router = APIRouter()
settings = get_settings()

@router.post("/{repo_id}/runs", response_model=TriggerAnalysisResponse)
async def trigger_analysis_run(
    repo_id: int,
    background_tasks: BackgroundTasks,
    trigger_type: TriggerType = Query(default=TriggerType.MANUAL),
    session: AsyncSession = Depends(get_db_session),
    current_user: User = Depends(get_current_user),
) -> TriggerAnalysisResponse:
    service = AnalysisService(session)
    try:
        run = await service.create_run(repo_id=repo_id, user_id=current_user.id, trigger_type=trigger_type)
        if settings.environment in ("development", "test"):
            background_tasks.add_task(_run_analysis, run.id)
        else:
            run_analysis_task.delay(run.id)
        return TriggerAnalysisResponse(run_id=run.id, status=run.status)
    except NotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except ForbiddenError as exc:
        raise HTTPException(status_code=403, detail=str(exc)) from exc


@router.get("/{repo_id}/runs", response_model=AnalysisRunListResponse)
async def list_analysis_runs(
    repo_id: int,
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    session: AsyncSession = Depends(get_db_session),
    current_user: User = Depends(get_current_user),
) -> AnalysisRunListResponse:
    service = AnalysisService(session)
    try:
        runs, total = await service.list_runs(repo_id=repo_id, user_id=current_user.id, page=page, page_size=page_size)
        return AnalysisRunListResponse(
            items=[AnalysisRunResponse.model_validate(item) for item in runs],
            page=PageMeta(total=total, page=page, page_size=page_size),
        )
    except NotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except ForbiddenError as exc:
        raise HTTPException(status_code=403, detail=str(exc)) from exc


@router.get("/runs/{run_id}", response_model=AnalysisRunResponse)
async def get_analysis_run(
    run_id: int,
    session: AsyncSession = Depends(get_db_session),
    current_user: User = Depends(get_current_user),
) -> AnalysisRunResponse:
    service = AnalysisService(session)
    try:
        run = await service.get_run(run_id=run_id, user_id=current_user.id)
        return AnalysisRunResponse.model_validate(run)
    except NotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except ForbiddenError as exc:
        raise HTTPException(status_code=403, detail=str(exc)) from exc
