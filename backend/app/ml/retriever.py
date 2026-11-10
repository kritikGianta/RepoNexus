"""Lightweight code retriever built on scikit-learn TF-IDF.

It replaces the earlier sentence-transformers + FAISS stack, which was too heavy to ship
in the default image (and was never installed, leaving RAG silently disabled). TF-IDF over
identifier-aware tokens works well for code search and needs no model download.
"""

from __future__ import annotations

import pickle
import re
from dataclasses import dataclass, field
from pathlib import Path

from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import linear_kernel

_CAMEL = re.compile(r"(?<=[a-z0-9])(?=[A-Z])")
_TOKEN = re.compile(r"[A-Za-z_][A-Za-z0-9_]{1,}")


def code_tokenizer(text: str) -> list[str]:
    """Split identifiers on snake_case and camelCase so `getUserName` matches "user name"."""
    tokens: list[str] = []
    for raw in _TOKEN.findall(text):
        tokens.append(raw.lower())
        parts = [p for p in _CAMEL.sub("_", raw).lower().split("_") if len(p) > 1]
        if len(parts) > 1:
            tokens.extend(parts)
    return tokens


@dataclass
class CodeChunk:
    path: str
    start_line: int
    end_line: int
    text: str


@dataclass
class CodeIndex:
    chunks: list[CodeChunk] = field(default_factory=list)
    vectorizer: TfidfVectorizer | None = None
    matrix: object | None = None

    def search(self, query: str, k: int = 6) -> list[CodeChunk]:
        if not self.chunks or self.vectorizer is None or self.matrix is None:
            return []
        query_vec = self.vectorizer.transform([query])
        scores = linear_kernel(query_vec, self.matrix).ravel()
        ranked = scores.argsort()[::-1][:k]
        return [self.chunks[i] for i in ranked if scores[i] > 0]

    def save(self, path: Path) -> None:
        path.parent.mkdir(parents=True, exist_ok=True)
        with open(path, "wb") as fp:
            pickle.dump(self, fp)

    @staticmethod
    def load(path: Path) -> "CodeIndex":
        # Index files are written only by this service into its private data volume.
        with open(path, "rb") as fp:
            return pickle.load(fp)  # noqa: S301


def chunk_file(path: str, content: str, chunk_lines: int = 50, overlap: int = 10) -> list[CodeChunk]:
    lines = content.splitlines()
    chunks: list[CodeChunk] = []
    step = max(1, chunk_lines - overlap)
    for start in range(0, max(1, len(lines)), step):
        window = lines[start : start + chunk_lines]
        if any(line.strip() for line in window):
            chunks.append(
                CodeChunk(path=path, start_line=start + 1, end_line=start + len(window), text="\n".join(window))
            )
        if start + chunk_lines >= len(lines):
            break
    return chunks


def build_index(files: list[tuple[str, str]]) -> CodeIndex:
    """Build an index from (path, content) pairs."""
    chunks: list[CodeChunk] = []
    for path, content in files:
        chunks.extend(chunk_file(path, content))
    if not chunks:
        return CodeIndex()

    vectorizer = TfidfVectorizer(
        tokenizer=code_tokenizer,
        lowercase=False,
        token_pattern=None,
        sublinear_tf=True,
        max_features=50_000,
    )
    try:
        matrix = vectorizer.fit_transform([f"{c.path}\n{c.text}" for c in chunks])
    except ValueError:  # empty vocabulary
        return CodeIndex()
    return CodeIndex(chunks=chunks, vectorizer=vectorizer, matrix=matrix)
