from __future__ import annotations

import asyncio
import logging

from fastapi import BackgroundTasks
from sqlalchemy import select

from app.core.config import get_settings
from app.core.encryption import decrypt_token
from app.db.session import AsyncSessionLocal, engine
from app.ml.pipeline import AnalysisPipeline
from app.models.enums import AnalysisRunStatus
from app.models.repository import Repository
from app.models.user import User
from app.services.analysis_service import AnalysisService
from app.services.github_service import GitHubService
from app.tasks.celery_app import celery_app

logger = logging.getLogger(__name__)
settings = get_settings()


@celery_app.task(name="analysis.run", bind=True, acks_late=True)
def run_analysis_task(self, run_id: int) -> dict:
    return asyncio.run(_run_in_worker(run_id))


async def _run_in_worker(run_id: int) -> dict:
    # Each Celery task gets a fresh event loop via asyncio.run(); pooled connections are bound
    # to the loop that created them, so the pool must be disposed before the loop closes.
    try:
        return await _run_analysis(run_id)
    finally:
        await engine.dispose()


async def run_analysis_inline(run_id: int) -> None:
    """Entry point for FastAPI BackgroundTasks (TASK_EXECUTION_MODE=inline)."""
    try:
        await _run_analysis(run_id)
    except Exception:  # noqa: BLE001 - failure is already persisted on the run
        logger.exception("Inline analysis run %s failed", run_id)


def dispatch_analysis(run_id: int, background_tasks: BackgroundTasks | None = None) -> str:
    """Queue an analysis run on Celery, falling back to in-process execution."""
    if settings.use_celery:
        try:
            run_analysis_task.delay(run_id)
            return "celery"
        except Exception:  # noqa: BLE001 - broker unavailable
            logger.exception("Celery dispatch failed for run %s; running inline", run_id)
    if background_tasks is None:
        asyncio.get_running_loop().create_task(run_analysis_inline(run_id))
    else:
        background_tasks.add_task(run_analysis_inline, run_id)
    return "inline"


async def _run_analysis(run_id: int) -> dict:
    async with AsyncSessionLocal() as session:
        service = AnalysisService(session)
        run = await service.get_run_for_worker(run_id)

        if run.status in (AnalysisRunStatus.COMPLETED, AnalysisRunStatus.RUNNING):
            return {"run_id": run_id, "status": run.status.value, "skipped": True}

        repo = (await session.execute(select(Repository).where(Repository.id == run.repo_id))).scalar_one()
        user = (await session.execute(select(User).where(User.id == repo.user_id))).scalar_one()

        try:
            access_token = decrypt_token(user.encrypted_access_token)
            github = GitHubService(access_token)
            commit_sha = run.commit_sha or await asyncio.to_thread(
                github.get_default_branch_head_sha, repo.full_name, repo.default_branch
            )
            await service.mark_run_running(run, commit_sha=commit_sha)

            pipeline = AnalysisPipeline()
            result = await asyncio.to_thread(
                pipeline.run,
                repo_full_name=repo.full_name,
                default_branch=repo.default_branch,
                access_token=access_token,
                commit_sha=commit_sha,
            )

            await service.persist_run_results(
                run=run,
                total_files_analyzed=result["total_files_analyzed"],
                overall_debt_score=result["overall_debt_score"],
                category_breakdown=result["category_breakdown"],
                debt_items_payload=result["debt_items_payload"],
                trend_payload=result["trend_payload"],
                mlflow_run_id=result["mlflow_run_id"],
            )
            return {"run_id": run_id, "status": "completed", "items": len(result["debt_items_payload"])}
        except Exception as exc:
            await session.rollback()
            await service.mark_run_failed(run=run, error_message=str(exc) or exc.__class__.__name__)
            raise
