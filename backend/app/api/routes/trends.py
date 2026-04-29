from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.core.exceptions import ForbiddenError, NotFoundError
from app.db.session import get_db_session
from app.models.user import User
from app.schemas.trend import TrendPoint, TrendSeriesResponse
from app.services.trend_service import TrendService

router = APIRouter()


@router.get("/{repo_id}", response_model=TrendSeriesResponse)
async def get_trend_series(
    repo_id: int,
    period: str = Query(default="90d", pattern="^(30d|90d|1y)$"),
    session: AsyncSession = Depends(get_db_session),
    current_user: User = Depends(get_current_user),
) -> TrendSeriesResponse:
    service = TrendService(session)
    try:
        points = await service.get_series(repo_id=repo_id, user_id=current_user.id, period=period)
    except NotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except ForbiddenError as exc:
        raise HTTPException(status_code=403, detail=str(exc)) from exc
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    return TrendSeriesResponse(
        period=period,
        points=[
            TrendPoint(
                analysis_run_id=p.analysis_run_id,
                timestamp=p.created_at,
                overall_score=p.overall_score,
                complexity_score=p.complexity_score,
                duplication_score=p.duplication_score,
                security_score=p.security_score,
                test_coverage_score=p.test_coverage_score,
                total_estimated_debt_hours=p.total_estimated_debt_hours,
            )
            for p in points
        ],
    )
