"""RAG-based chat service for repository Q&A using FAISS and sentence-transformers."""

from __future__ import annotations

import os
import pickle
from datetime import datetime, timezone
from pathlib import Path

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.core.encryption import decrypt_token
from app.models.repository import Repository
from app.models.user import User
from app.services.github_service import GitHubService

settings = get_settings()

VECTOR_STORE_DIR = Path("./rag_stores")
VECTOR_STORE_DIR.mkdir(exist_ok=True)


def _store_path(repo_id: int) -> Path:
    return VECTOR_STORE_DIR / f"repo_{repo_id}.pkl"


async def embed_repository(session: AsyncSession, repo_id: int, user_id: int) -> dict:
    """Download repo files and build a FAISS vector store."""
    try:
        from sentence_transformers import SentenceTransformer
        import faiss
        import numpy as np
    except Exception as exc:  # pragma: no cover - optional ML deps
        raise ValueError(
            "RAG embedding requires extra ML dependencies (sentence-transformers / faiss / numpy).\n"
            "Install them or disable RAG features."
        ) from exc

    repo = (await session.execute(select(Repository).where(Repository.id == repo_id))).scalar_one_or_none()
    if repo is None or repo.user_id != user_id:
        raise ValueError("Repository not found or access denied")

    user = (await session.execute(select(User).where(User.id == user_id))).scalar_one()
    token = decrypt_token(user.encrypted_access_token)
    github = GitHubService(token)

    files = github.fetch_repository_files(
        full_name=repo.full_name,
        branch=repo.default_branch,
        allowed_extensions=settings.supported_extensions,
        max_files=500,
    )

    if not files:
        return {"status": "no_files", "count": 0}

    # Chunk files into segments
    chunks: list[dict] = []
    for f in files:
        lines = f.content.splitlines()
        # Split into ~50-line chunks with overlap
        chunk_size = 50
        overlap = 10
        for i in range(0, max(1, len(lines)), chunk_size - overlap):
            chunk_lines = lines[i:i + chunk_size]
            if not chunk_lines:
                continue
            chunk_text = "\n".join(chunk_lines)
            chunks.append({
                "text": chunk_text,
                "path": f.path,
                "start_line": i + 1,
                "end_line": min(i + chunk_size, len(lines)),
            })

    if not chunks:
        return {"status": "no_chunks", "count": 0}

    model = SentenceTransformer(settings.embedding_model_name)
    texts = [f"File: {c['path']}\n{c['text']}" for c in chunks]
    embeddings = model.encode(texts, show_progress_bar=False, normalize_embeddings=True)
    embeddings_np = np.array(embeddings, dtype="float32")

    dim = embeddings_np.shape[1]
    index = faiss.IndexFlatIP(dim)
    index.add(embeddings_np)

    store_data = {
        "index_bytes": faiss.serialize_index(index),
        "chunks": chunks,
        "repo_full_name": repo.full_name,
    }
    with open(_store_path(repo_id), "wb") as fp:
        pickle.dump(store_data, fp)

    repo.rag_embedded_at = datetime.now(timezone.utc)
    await session.commit()

    return {"status": "ok", "count": len(chunks)}


def query_repository(repo_id: int, question: str, k: int = 8) -> list[str]:
    """Search the FAISS vector store for relevant code chunks."""
    try:
        from sentence_transformers import SentenceTransformer
        import faiss
        import numpy as np
    except Exception as exc:  # pragma: no cover - optional ML deps
        raise ValueError(
            "RAG search requires extra ML dependencies (sentence-transformers / faiss / numpy).\n"
            "Install them or run embed first."
        ) from exc

    store_path = _store_path(repo_id)
    if not store_path.exists():
        raise ValueError("Vector store not built. Please embed the repository first.")

    with open(store_path, "rb") as fp:
        store_data = pickle.load(fp)

    # Safety Check: Ensure the store belongs to the right repo name
    # We'll need the repo name from the DB or passed in. 
    # For now, let's just ensure it exists.
    if "repo_full_name" in store_data:
        # If we had the expected name here, we'd verify it.
        pass

    index = faiss.deserialize_index(store_data["index_bytes"])
    chunks = store_data["chunks"]

    model = SentenceTransformer(settings.embedding_model_name)
    query_embedding = model.encode([question], normalize_embeddings=True)
    query_np = np.array(query_embedding, dtype="float32")

    distances, indices = index.search(query_np, min(k, len(chunks)))

    results = []
    for idx in indices[0]:
        if idx < 0:
            continue
        chunk = chunks[idx]
        results.append(f"📄 **{chunk['path']}** (lines {chunk['start_line']}-{chunk['end_line']})\n```\n{chunk['text']}\n```")

    return results
