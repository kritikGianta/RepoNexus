from __future__ import annotations

from datetime import datetime, timezone

from sqlalchemy import delete, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import ForbiddenError, NotFoundError
from app.models.analysis_run import AnalysisRun
from app.models.debt_item import DebtItem
from app.models.debt_trend import DebtTrend
from app.models.enums import AnalysisRunStatus, TriggerType
from app.models.repository import Repository


class AnalysisService:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def create_run(self, repo_id: int, user_id: int, trigger_type: TriggerType) -> AnalysisRun:
        repo = await self._get_repo(repo_id, user_id)

        # Cleanup Zombie Runs: Mark any existing stuck runs for this repo as FAILED
        stuck_stmt = select(AnalysisRun).where(
            AnalysisRun.repo_id == repo.id,
            AnalysisRun.status.in_([AnalysisRunStatus.RUNNING, AnalysisRunStatus.QUEUED])
        )
        stuck_runs = (await self.session.execute(stuck_stmt)).scalars().all()
        for stuck in stuck_runs:
            stuck.status = AnalysisRunStatus.FAILED
            stuck.error_message = "Analysis failed due to server timeout or out-of-memory crash."
            stuck.ended_at = datetime.now(timezone.utc)

        run = AnalysisRun(repo_id=repo.id, status=AnalysisRunStatus.QUEUED, trigger_type=trigger_type)
        self.session.add(run)
        await self.session.commit()
        await self.session.refresh(run)
        return run

    async def list_runs(self, repo_id: int, user_id: int, page: int, page_size: int) -> tuple[list[AnalysisRun], int]:
        await self._get_repo(repo_id, user_id)

        total_stmt = select(func.count(AnalysisRun.id)).where(AnalysisRun.repo_id == repo_id)
        total = (await self.session.execute(total_stmt)).scalar_one()

        stmt = (
            select(AnalysisRun)
            .where(AnalysisRun.repo_id == repo_id)
            .order_by(AnalysisRun.created_at.desc())
            .offset((page - 1) * page_size)
            .limit(page_size)
        )
        rows = await self.session.execute(stmt)
        return list(rows.scalars().all()), total

    async def get_run(self, run_id: int, user_id: int) -> AnalysisRun:
        stmt = select(AnalysisRun).where(AnalysisRun.id == run_id)
        run = (await self.session.execute(stmt)).scalar_one_or_none()
        if run is None:
            raise NotFoundError("Analysis run not found")

        repo = await self._get_repo(run.repo_id, user_id)
        if repo.user_id != user_id:
            raise ForbiddenError("Access denied")
        return run

    async def get_run_for_worker(self, run_id: int) -> AnalysisRun:
        stmt = select(AnalysisRun).where(AnalysisRun.id == run_id)
        run = (await self.session.execute(stmt)).scalar_one_or_none()
        if run is None:
            raise NotFoundError("Analysis run not found")
        return run

    async def mark_run_running(self, run: AnalysisRun, commit_sha: str | None = None) -> None:
        run.status = AnalysisRunStatus.RUNNING
        run.started_at = datetime.now(timezone.utc)
        if commit_sha:
            run.commit_sha = commit_sha
        await self.session.commit()
        await self.session.refresh(run)

    async def mark_run_failed(self, run: AnalysisRun, error_message: str) -> None:
        run.status = AnalysisRunStatus.FAILED
        run.error_message = error_message[:2000]
        run.ended_at = datetime.now(timezone.utc)
        await self.session.commit()
        await self.session.refresh(run)

    async def persist_run_results(
        self,
        run: AnalysisRun,
        total_files_analyzed: int,
        overall_debt_score: float,
        category_breakdown: dict,
        debt_items_payload: list[dict],
        trend_payload: dict,
        mlflow_run_id: str,
    ) -> AnalysisRun:
        await self.session.execute(delete(DebtItem).where(DebtItem.analysis_run_id == run.id))
        await self.session.execute(delete(DebtTrend).where(DebtTrend.analysis_run_id == run.id))

        for payload in debt_items_payload:
            self.session.add(DebtItem(**payload, analysis_run_id=run.id, repo_id=run.repo_id))

        run.total_files_analyzed = total_files_analyzed
        run.total_debt_items_found = len(debt_items_payload)
        run.overall_debt_score = overall_debt_score
        run.category_breakdown = category_breakdown
        run.status = AnalysisRunStatus.COMPLETED
        run.ended_at = datetime.now(timezone.utc)
        run.mlflow_run_id = mlflow_run_id

        trend = DebtTrend(
            repo_id=run.repo_id,
            analysis_run_id=run.id,
            overall_score=trend_payload["overall_score"],
            complexity_score=trend_payload["complexity_score"],
            duplication_score=trend_payload["duplication_score"],
            security_score=trend_payload["security_score"],
            test_coverage_score=trend_payload["test_coverage_score"],
            total_estimated_debt_hours=trend_payload["total_estimated_debt_hours"],
        )
        self.session.add(trend)

        repo_stmt = select(Repository).where(Repository.id == run.repo_id)
        repo = (await self.session.execute(repo_stmt)).scalar_one()
        repo.last_analyzed_at = run.ended_at
        repo.current_overall_debt_score = overall_debt_score

        await self.session.commit()
        await self.session.refresh(run)
        return run

    async def _get_repo(self, repo_id: int, user_id: int) -> Repository:
        stmt = select(Repository).where(Repository.id == repo_id)
        repo = (await self.session.execute(stmt)).scalar_one_or_none()
        if repo is None:
            raise NotFoundError("Repository not found")
        if repo.user_id != user_id:
            raise ForbiddenError("Repository does not belong to user")
        return repo
