from __future__ import annotations

from app.ml.retriever import CodeIndex, build_index
from app.ml.types import CodeFile


class CodebaseEmbedder:
    """Builds a per-analysis code index used to give the LLM relevant repository context."""

    available = True

    def build_index(self, code_files: list[CodeFile]) -> CodeIndex:
        return build_index([(f.path, f.content) for f in code_files])

    def query(self, index: CodeIndex | None, query_text: str, k: int = 4) -> list[str]:
        if index is None:
            return []
        return [f"# {c.path}:{c.start_line}-{c.end_line}\n{c.text}" for c in index.search(query_text, k=k)]
