import asyncio
import os
from sqlalchemy import select
from app.db.session import AsyncSessionLocal
from app.models.user import User
from app.models.repository import Repository
from app.core.encryption import decrypt_token
from app.ml.pipeline import AnalysisPipeline

async def main():
    async with AsyncSessionLocal() as session:
        # Get repo id 3 (FastAPI)
        repo = (await session.execute(select(Repository).where(Repository.id == 3))).scalar_one()
        user = (await session.execute(select(User).where(User.id == repo.user_id))).scalar_one()
        
        access_token = decrypt_token(user.encrypted_access_token)
        print(f"Testing pipeline for {repo.full_name}...")
        
        pipeline = AnalysisPipeline()
        result = pipeline.run(
            repo_full_name=repo.full_name,
            default_branch=repo.default_branch,
            access_token=access_token,
        )
        print(f"Analysis complete: {result['total_files_analyzed']} files analyzed.")
        print(f"Score: {result['overall_debt_score']}")

if __name__ == "__main__":
    asyncio.run(main())
