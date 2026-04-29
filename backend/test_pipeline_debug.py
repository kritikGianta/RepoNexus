import asyncio
import os
import time
from sqlalchemy import select
from app.db.session import AsyncSessionLocal
from app.models.user import User
from app.models.repository import Repository
from app.core.encryption import decrypt_token
from app.ml.pipeline import AnalysisPipeline
from app.services.github_service import GitHubService
from app.core.config import get_settings

settings = get_settings()

async def main():
    async with AsyncSessionLocal() as session:
        # Get repo id 3 (FastAPI)
        repo = (await session.execute(select(Repository).where(Repository.id == 3))).scalar_one()
        user = (await session.execute(select(User).where(User.id == repo.user_id))).scalar_one()
        
        access_token = decrypt_token(user.encrypted_access_token)
        print(f"Testing pipeline for {repo.full_name}...")
        
        github_service = GitHubService(access_token)
        
        print("1. Fetching files...")
        t0 = time.time()
        try:
            files = github_service.fetch_repository_files(
                full_name=repo.full_name,
                branch=repo.default_branch,
                allowed_extensions=settings.supported_extensions,
                max_files=settings.max_files_per_analysis,
            )
            print(f"   Done in {time.time()-t0:.2f}s. Fetched {len(files)} files.")
        except Exception as e:
            print(f"   FAILED in {time.time()-t0:.2f}s: {e}")
            import traceback
            traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(main())
