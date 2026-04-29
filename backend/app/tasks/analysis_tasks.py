from __future__ import annotations

import asyncio

from sqlalchemy import select

from app.core.encryption import decrypt_token
from app.db.session import AsyncSessionLocal
from app.ml.pipeline import AnalysisPipeline
from app.models.repository import Repository
from app.models.enums import AnalysisRunStatus
from app.models.user import User
from app.services.analysis_service import AnalysisService
from app.services.github_service import GitHubService
from app.tasks.celery_app import celery_app


@celery_app.task(name="analysis.run", bind=True, autoretry_for=(Exception,), retry_backoff=True, retry_kwargs={"max_retries": 2})
def run_analysis_task(self, run_id: int) -> dict:
    return asyncio.run(_run_analysis(run_id))


async def _run_analysis(run_id: int) -> dict:
    async with AsyncSessionLocal() as session:
        service = AnalysisService(session)
        run = await service.get_run_for_worker(run_id)

        if run.status == AnalysisRunStatus.COMPLETED:
            return {"run_id": run_id, "status": "completed", "skipped": True}
        if run.status == AnalysisRunStatus.RUNNING:
            return {"run_id": run_id, "status": "running", "skipped": True}

        repo = (await session.execute(select(Repository).where(Repository.id == run.repo_id))).scalar_one()
        user = (await session.execute(select(User).where(User.id == repo.user_id))).scalar_one()

        try:
            access_token = decrypt_token(user.encrypted_access_token)
            github = GitHubService(access_token)
            commit_sha = run.commit_sha or github.get_default_branch_head_sha(repo.full_name, repo.default_branch)
            await service.mark_run_running(run, commit_sha=commit_sha)

            pipeline = AnalysisPipeline()
            loop = asyncio.get_running_loop()
            result = await loop.run_in_executor(
                None,
                lambda: pipeline.run(
                    repo_full_name=repo.full_name,
                    default_branch=repo.default_branch,
                    access_token=access_token,
                    commit_sha=commit_sha,
                )
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
            await service.mark_run_failed(run=run, error_message=str(exc))
            raise
