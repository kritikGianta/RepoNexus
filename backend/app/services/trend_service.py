from datetime import datetime, timedelta, timezone

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import ForbiddenError, NotFoundError
from app.models.debt_trend import DebtTrend
from app.models.repository import Repository


PERIOD_TO_DELTA = {
    "30d": timedelta(days=30),
    "90d": timedelta(days=90),
    "1y": timedelta(days=365),
}


class TrendService:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def get_series(self, repo_id: int, user_id: int, period: str) -> list[DebtTrend]:
        if period not in PERIOD_TO_DELTA:
            raise ValueError("Unsupported period")

        repo_stmt = select(Repository).where(Repository.id == repo_id)
        repo = (await self.session.execute(repo_stmt)).scalar_one_or_none()
        if repo is None:
            raise NotFoundError("Repository not found")
        if repo.user_id != user_id:
            raise ForbiddenError("Access denied")

        threshold = datetime.now(timezone.utc) - PERIOD_TO_DELTA[period]

        stmt = (
            select(DebtTrend)
            .where(DebtTrend.repo_id == repo_id, DebtTrend.created_at >= threshold)
            .order_by(DebtTrend.created_at.asc())
        )
        result = await self.session.execute(stmt)
        return list(result.scalars().all())
