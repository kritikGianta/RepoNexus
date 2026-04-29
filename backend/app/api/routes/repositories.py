from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.core.config import get_settings
from app.core.encryption import decrypt_token
from app.core.exceptions import ForbiddenError, NotFoundError
from app.db.session import get_db_session
from app.models.user import User
from app.schemas.repository import RepoConnectRequest, RepoListResponse, RepoResponse, WebhookRegisterResponse
from app.services.github_service import GitHubService
from app.services.repository_service import RepositoryService

router = APIRouter()
settings = get_settings()


@router.get("", response_model=RepoListResponse)
async def list_repositories(
    session: AsyncSession = Depends(get_db_session),
    current_user: User = Depends(get_current_user),
) -> RepoListResponse:
    repos = await RepositoryService(session).list_repositories_for_user(current_user.id)
    return RepoListResponse(repositories=[RepoResponse.model_validate(repo) for repo in repos])


@router.post("/connect", response_model=RepoResponse)
async def connect_repository(
    payload: RepoConnectRequest,
    session: AsyncSession = Depends(get_db_session),
    current_user: User = Depends(get_current_user),
) -> RepoResponse:
    try:
        token = decrypt_token(current_user.encrypted_access_token)
        github = GitHubService(token)
        metadata = github.get_repo_metadata(payload.full_name)
        repo = await RepositoryService(session).upsert_repository(current_user.id, metadata)
        return RepoResponse.model_validate(repo)
    except Exception as exc:
        raise HTTPException(status_code=400, detail=f"Failed to connect repository: {exc}") from exc


@router.delete("/{repo_id}", status_code=status.HTTP_204_NO_CONTENT)
async def disconnect_repository(
    repo_id: int,
    session: AsyncSession = Depends(get_db_session),
    current_user: User = Depends(get_current_user),
) -> None:
    service = RepositoryService(session)
    try:
        await service.delete_repository_for_user(repo_id=repo_id, user_id=current_user.id)
    except NotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except ForbiddenError as exc:
        raise HTTPException(status_code=403, detail=str(exc)) from exc


@router.post("/{repo_id}/webhook", response_model=WebhookRegisterResponse)
async def register_webhook(
    repo_id: int,
    session: AsyncSession = Depends(get_db_session),
    current_user: User = Depends(get_current_user),
) -> WebhookRegisterResponse:
    service = RepositoryService(session)
    try:
        repo = await service.get_repository_for_user(repo_id=repo_id, user_id=current_user.id)
        token = decrypt_token(current_user.encrypted_access_token)
        github = GitHubService(token)
        webhook_url = f"{settings.api_base_url}{settings.api_v1_prefix}/webhooks/github"
        webhook_id = github.register_push_webhook(
            full_name=repo.full_name,
            callback_url=webhook_url,
            secret=settings.github_webhook_secret,
        )
        return WebhookRegisterResponse(success=True, webhook_id=webhook_id)
    except NotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except ForbiddenError as exc:
        raise HTTPException(status_code=403, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(status_code=400, detail=f"Webhook registration failed: {exc}") from exc
