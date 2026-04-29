from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.core.exceptions import ForbiddenError, NotFoundError
from app.db.session import get_db_session
from app.models.enums import DebtCategory, SeverityLevel
from app.models.user import User
from app.schemas.common import PageMeta
from app.schemas.debt import DebtItemListResponse, DebtItemResponse, MarkFixedRequest
from app.services.debt_service import DebtService

router = APIRouter()


@router.get("/{repo_id}/items", response_model=DebtItemListResponse)
async def list_debt_items(
    repo_id: int,
    severity: SeverityLevel | None = Query(default=None),
    category: DebtCategory | None = Query(default=None),
    file_glob: str | None = Query(default=None),
    sort: str = Query(default="score_desc", pattern="^(score_desc|newest)$"),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=25, ge=1, le=100),
    session: AsyncSession = Depends(get_db_session),
    current_user: User = Depends(get_current_user),
) -> DebtItemListResponse:
    service = DebtService(session)
    try:
        items, total = await service.list_items(
            repo_id=repo_id,
            user_id=current_user.id,
            page=page,
            page_size=page_size,
            severity=severity,
            category=category,
            file_glob=file_glob,
            sort=sort,
        )
        return DebtItemListResponse(
            items=[DebtItemResponse.model_validate(item) for item in items],
            page=PageMeta(total=total, page=page, page_size=page_size),
        )
    except NotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except ForbiddenError as exc:
        raise HTTPException(status_code=403, detail=str(exc)) from exc


@router.get("/items/{item_id}", response_model=DebtItemResponse)
async def get_debt_item(
    item_id: int,
    session: AsyncSession = Depends(get_db_session),
    current_user: User = Depends(get_current_user),
) -> DebtItemResponse:
    service = DebtService(session)
    try:
        item = await service.get_item(item_id=item_id, user_id=current_user.id)
        return DebtItemResponse.model_validate(item)
    except NotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except ForbiddenError as exc:
        raise HTTPException(status_code=403, detail=str(exc)) from exc


@router.patch("/items/{item_id}/fixed", response_model=DebtItemResponse)
async def mark_debt_item_fixed(
    item_id: int,
    payload: MarkFixedRequest,
    session: AsyncSession = Depends(get_db_session),
    current_user: User = Depends(get_current_user),
) -> DebtItemResponse:
    service = DebtService(session)
    try:
        item = await service.mark_fixed(item_id=item_id, user_id=current_user.id, is_fixed=payload.is_fixed)
        return DebtItemResponse.model_validate(item)
    except NotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except ForbiddenError as exc:
        raise HTTPException(status_code=403, detail=str(exc)) from exc
