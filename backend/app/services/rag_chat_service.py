"""Repository Q&A: builds a persistent per-repo code index and retrieves context for the LLM."""

from __future__ import annotations

import asyncio
from datetime import datetime, timezone
from pathlib import Path

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.core.encryption import decrypt_token
from app.core.exceptions import NotFoundError
from app.ml.retriever import CodeIndex, build_index
from app.models.repository import Repository
from app.models.user import User
from app.services.github_service import GitHubService

settings = get_settings()


def _store_path(repo_id: int) -> Path:
    return Path(settings.rag_store_dir) / f"repo_{repo_id}.idx"


def index_exists(repo_id: int) -> bool:
    return _store_path(repo_id).exists()


async def embed_repository(session: AsyncSession, repo_id: int, user_id: int) -> dict:
    """Download repository files and build (or rebuild) the persistent code index."""
    repo = (await session.execute(select(Repository).where(Repository.id == repo_id))).scalar_one_or_none()
    if repo is None or repo.user_id != user_id:
        raise NotFoundError("Repository not found")

    user = (await session.execute(select(User).where(User.id == user_id))).scalar_one()
    github = GitHubService(decrypt_token(user.encrypted_access_token))

    def _build() -> CodeIndex:
        files = github.fetch_repository_files(
            full_name=repo.full_name,
            branch=repo.default_branch,
            allowed_extensions=settings.supported_extensions,
            max_files=500,
        )
        index = build_index([(f.path, f.content) for f in files])
        if index.chunks:
            index.save(_store_path(repo_id))
        return index

    index = await asyncio.to_thread(_build)
    if not index.chunks:
        return {"status": "no_files", "count": 0}

    repo.rag_embedded_at = datetime.now(timezone.utc)
    await session.commit()
    return {"status": "ok", "count": len(index.chunks)}


def query_repository(repo_id: int, question: str, k: int = 8) -> list[str]:
    """Return the most relevant code chunks, formatted for the LLM prompt."""
    store_path = _store_path(repo_id)
    if not store_path.exists():
        return []
    index = CodeIndex.load(store_path)
    return [
        f"📄 **{c.path}** (lines {c.start_line}-{c.end_line})\n```\n{c.text}\n```"
        for c in index.search(question, k=k)
    ]
