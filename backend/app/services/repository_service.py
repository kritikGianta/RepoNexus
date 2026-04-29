from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import ForbiddenError, NotFoundError
from app.models.repository import Repository


class RepositoryService:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def list_repositories_for_user(self, user_id: int) -> list[Repository]:
        stmt = select(Repository).where(Repository.user_id == user_id).order_by(Repository.updated_at.desc())
        result = await self.session.execute(stmt)
        return list(result.scalars().all())

    async def get_repository_for_user(self, repo_id: int, user_id: int) -> Repository:
        stmt = select(Repository).where(Repository.id == repo_id)
        result = await self.session.execute(stmt)
        repo = result.scalar_one_or_none()
        if repo is None:
            raise NotFoundError("Repository not found")
        if repo.user_id != user_id:
            raise ForbiddenError("Repository does not belong to user")
        return repo

    async def upsert_repository(self, user_id: int, repo_metadata: dict) -> Repository:
        stmt = select(Repository).where(Repository.github_repo_id == repo_metadata["id"])
        result = await self.session.execute(stmt)
        repo = result.scalar_one_or_none()

        if repo is None:
            repo = Repository(
                user_id=user_id,
                github_repo_id=repo_metadata["id"],
                full_name=repo_metadata["full_name"],
                default_branch=repo_metadata["default_branch"],
                primary_language=repo_metadata.get("language"),
            )
            self.session.add(repo)
        else:
            repo.user_id = user_id
            repo.full_name = repo_metadata["full_name"]
            repo.default_branch = repo_metadata["default_branch"]
            repo.primary_language = repo_metadata.get("language")

        await self.session.commit()
        await self.session.refresh(repo)
        return repo

    async def delete_repository_for_user(self, repo_id: int, user_id: int) -> None:
        repo = await self.get_repository_for_user(repo_id=repo_id, user_id=user_id)
        await self.session.execute(delete(Repository).where(Repository.id == repo.id))
        await self.session.commit()
