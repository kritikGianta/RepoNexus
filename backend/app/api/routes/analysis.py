from fastapi import APIRouter, BackgroundTasks, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.db.session import get_db_session
from app.models.enums import TriggerType
from app.models.user import User
from app.schemas.analysis import AnalysisRunListResponse, AnalysisRunResponse, TriggerAnalysisResponse
from app.schemas.common import PageMeta
from app.services.analysis_service import AnalysisService
from app.tasks.analysis_tasks import dispatch_analysis

router = APIRouter()


@router.post("/{repo_id}/runs", response_model=TriggerAnalysisResponse, status_code=202)
async def trigger_analysis_run(
    repo_id: int,
    background_tasks: BackgroundTasks,
    trigger_type: TriggerType = Query(default=TriggerType.MANUAL),
    session: AsyncSession = Depends(get_db_session),
    current_user: User = Depends(get_current_user),
) -> TriggerAnalysisResponse:
    run = await AnalysisService(session).create_run(repo_id=repo_id, user_id=current_user.id, trigger_type=trigger_type)
    dispatch_analysis(run.id, background_tasks)
    return TriggerAnalysisResponse(run_id=run.id, status=run.status)


@router.get("/{repo_id}/runs", response_model=AnalysisRunListResponse)
async def list_analysis_runs(
    repo_id: int,
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    session: AsyncSession = Depends(get_db_session),
    current_user: User = Depends(get_current_user),
) -> AnalysisRunListResponse:
    runs, total = await AnalysisService(session).list_runs(
        repo_id=repo_id, user_id=current_user.id, page=page, page_size=page_size
    )
    return AnalysisRunListResponse(
        items=[AnalysisRunResponse.model_validate(item) for item in runs],
        page=PageMeta(total=total, page=page, page_size=page_size),
    )


@router.get("/runs/{run_id}", response_model=AnalysisRunResponse)
async def get_analysis_run(
    run_id: int,
    session: AsyncSession = Depends(get_db_session),
    current_user: User = Depends(get_current_user),
) -> AnalysisRunResponse:
    run = await AnalysisService(session).get_run(run_id=run_id, user_id=current_user.id)
    return AnalysisRunResponse.model_validate(run)
