from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.core.oauth import build_github_oauth_url, exchange_code_for_token, fetch_github_user
from app.core.security import create_access_token, create_oauth_state, verify_oauth_state
from app.db.session import get_db_session
from app.models.user import User
from app.schemas.auth import AuthTokenResponse, GitHubLoginResponse
from app.schemas.user import UserResponse
from app.services.auth_service import AuthService

router = APIRouter()


@router.get("/github/login", response_model=GitHubLoginResponse)
async def github_login() -> GitHubLoginResponse:
    state = create_oauth_state()
    return GitHubLoginResponse(authorize_url=build_github_oauth_url(state=state), state=state)


@router.get("/github/callback", response_model=AuthTokenResponse)
async def github_callback(
    code: str = Query(..., min_length=10),
    state: str = Query(..., min_length=20),
    session: AsyncSession = Depends(get_db_session),
) -> AuthTokenResponse:
    if not verify_oauth_state(state):
        raise HTTPException(status_code=400, detail="Invalid OAuth state")

    try:
        token = await exchange_code_for_token(code)
        github_user = await fetch_github_user(token)
    except Exception as exc:
        raise HTTPException(status_code=400, detail="GitHub OAuth failed") from exc

    service = AuthService(session)
    user = await service.upsert_user_from_github(github_user=github_user, access_token=token)
    jwt_token = create_access_token(str(user.id), extra_claims={"username": user.username})
    return AuthTokenResponse(access_token=jwt_token)


@router.get("/me", response_model=UserResponse)
async def me(current_user: User = Depends(get_current_user)) -> UserResponse:
    return UserResponse.model_validate(current_user)
