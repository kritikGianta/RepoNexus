from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import ForbiddenError, NotFoundError
from app.models.debt_item import DebtItem
from app.models.enums import DebtCategory, SeverityLevel
from app.models.repository import Repository


class DebtService:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def list_items(
        self,
        repo_id: int,
        user_id: int,
        page: int,
        page_size: int,
        severity: SeverityLevel | None,
        category: DebtCategory | None,
        file_glob: str | None,
        sort: str,
    ) -> tuple[list[DebtItem], int]:
        await self._assert_repo_access(repo_id, user_id)

        filters = [DebtItem.repo_id == repo_id]
        if severity:
            filters.append(DebtItem.severity_level == severity)
        if category:
            filters.append(DebtItem.debt_category == category)
        if file_glob:
            filters.append(DebtItem.file_path.like(self._glob_to_sql_like(file_glob), escape="\\"))

        total_stmt = select(func.count(DebtItem.id)).where(*filters)
        total = (await self.session.execute(total_stmt)).scalar_one()

        order_col = DebtItem.debt_score.desc() if sort == "score_desc" else DebtItem.created_at.desc()
        stmt = (
            select(DebtItem)
            .where(*filters)
            .order_by(order_col)
            .offset((page - 1) * page_size)
            .limit(page_size)
        )
        rows = (await self.session.execute(stmt)).scalars().all()
        return list(rows), total

    async def get_item(self, item_id: int, user_id: int) -> DebtItem:
        stmt = select(DebtItem).where(DebtItem.id == item_id)
        item = (await self.session.execute(stmt)).scalar_one_or_none()
        if item is None:
            raise NotFoundError("Debt item not found")
        await self._assert_repo_access(item.repo_id, user_id)
        return item

    async def mark_fixed(self, item_id: int, user_id: int, is_fixed: bool) -> DebtItem:
        item = await self.get_item(item_id, user_id)
        item.is_fixed = is_fixed
        await self.session.commit()
        await self.session.refresh(item)
        return item

    async def _assert_repo_access(self, repo_id: int, user_id: int) -> None:
        stmt = select(Repository).where(Repository.id == repo_id)
        repo = (await self.session.execute(stmt)).scalar_one_or_none()
        if repo is None:
            raise NotFoundError("Repository not found")
        if repo.user_id != user_id:
            raise ForbiddenError("Access denied")

    def _glob_to_sql_like(self, pattern: str) -> str:
        escaped = pattern.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_")
        return escaped.replace("*", "%").replace("?", "_")
