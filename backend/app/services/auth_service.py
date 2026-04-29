from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.core.encryption import encrypt_token
from app.models.enums import PlanTier
from app.models.user import User

settings = get_settings()


class AuthService:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def upsert_user_from_github(self, github_user: dict, access_token: str) -> User:
        github_user_id = github_user["id"]
        stmt = select(User).where(User.github_user_id == github_user_id)
        result = await self.session.execute(stmt)
        user = result.scalar_one_or_none()

        encrypted = encrypt_token(access_token)

        if user is None:
            user = User(
                github_user_id=github_user_id,
                username=github_user["login"],
                email=github_user.get("email"),
                avatar_url=github_user.get("avatar_url"),
                encrypted_access_token=encrypted,
                plan_tier=PlanTier(settings.default_plan_tier),
            )
            self.session.add(user)
        else:
            user.username = github_user["login"]
            user.email = github_user.get("email")
            user.avatar_url = github_user.get("avatar_url")
            user.encrypted_access_token = encrypted

        await self.session.commit()
        await self.session.refresh(user)
        return user
