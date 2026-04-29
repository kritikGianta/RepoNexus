import hashlib
import hmac
import json

from fastapi import APIRouter, Depends, Header, HTTPException, Request
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.db.session import get_db_session
from app.models.analysis_run import AnalysisRun
from app.models.enums import AnalysisRunStatus, TriggerType
from app.models.repository import Repository
from app.tasks.analysis_tasks import run_analysis_task

router = APIRouter()
settings = get_settings()


def verify_github_signature(raw_body: bytes, signature_header: str | None) -> bool:
    if not settings.github_webhook_secret:
        return True
    if not signature_header or not signature_header.startswith("sha256="):
        return False

    signature = signature_header.split("=", maxsplit=1)[1]
    expected = hmac.new(
        settings.github_webhook_secret.encode(), raw_body, hashlib.sha256
    ).hexdigest()
    return hmac.compare_digest(signature, expected)


@router.post("/github")
async def github_webhook(
    request: Request,
    x_github_event: str | None = Header(default=None),
    x_hub_signature_256: str | None = Header(default=None),
    session: AsyncSession = Depends(get_db_session),
) -> dict:
    raw_body = await request.body()

    if not verify_github_signature(raw_body, x_hub_signature_256):
        raise HTTPException(status_code=401, detail="Invalid webhook signature")

    if x_github_event != "push":
        return {"received": True, "queued": False}

    try:
        payload = json.loads(raw_body.decode("utf-8"))
    except (UnicodeDecodeError, json.JSONDecodeError) as exc:
        raise HTTPException(status_code=400, detail="Malformed webhook payload") from exc
    repository_data = payload.get("repository", {})
    full_name = repository_data.get("full_name")
    default_branch = repository_data.get("default_branch")
    ref = payload.get("ref", "")
    head_commit = payload.get("after")

    if not full_name or not default_branch:
        raise HTTPException(status_code=400, detail="Malformed webhook payload")

    branch_ref = f"refs/heads/{default_branch}"
    if ref != branch_ref:
        return {"received": True, "queued": False}

    repo_stmt = select(Repository).where(Repository.full_name == full_name)
    repo = (await session.execute(repo_stmt)).scalar_one_or_none()
    if repo is None:
        return {"received": True, "queued": False}

    run = AnalysisRun(
        repo_id=repo.id,
        commit_sha=head_commit,
        status=AnalysisRunStatus.QUEUED,
        trigger_type=TriggerType.WEBHOOK,
    )
    session.add(run)
    await session.commit()
    await session.refresh(run)

    run_analysis_task.delay(run.id)
    return {"received": True, "queued": True, "run_id": run.id}
