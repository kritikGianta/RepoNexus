from __future__ import annotations

from langchain.text_splitter import RecursiveCharacterTextSplitter
try:
    from langchain_community.embeddings import HuggingFaceEmbeddings
    from langchain_community.vectorstores import FAISS
except Exception:  # pragma: no cover - optional dependency
    HuggingFaceEmbeddings = None  # type: ignore
    FAISS = None  # type: ignore
from langchain_core.documents import Document

from app.core.config import get_settings
from app.ml.types import CodeFile

settings = get_settings()


class CodebaseEmbedder:
    def __init__(self) -> None:
        # If langchain_community is not installed, keep embedder disabled so the
        # app can start without heavy ML dependencies. Features depending on
        # embeddings will be no-ops.
        if HuggingFaceEmbeddings is None or FAISS is None:
            self.available = False
            self.embeddings = None
        else:
            try:
                self.embeddings = HuggingFaceEmbeddings(model_name=settings.embedding_model_name)
                self.available = True
            except ImportError:
                self.available = False
                self.embeddings = None
        self.splitter = RecursiveCharacterTextSplitter(chunk_size=1000, chunk_overlap=150)

    def build_index(self, code_files: list[CodeFile]) -> FAISS | None:
        if not self.available:
            return None
        documents: list[Document] = []
        for file in code_files:
            for chunk in self.splitter.split_text(file.content):
                documents.append(Document(page_content=chunk, metadata={"path": file.path, "sha": file.sha}))

        if not documents:
            return None

        return FAISS.from_documents(documents, self.embeddings)

    def query(self, index: FAISS | None, query_text: str, k: int = 4) -> list[str]:
        if not self.available or index is None:
            return []
        docs = index.similarity_search(query_text, k=k)
        return [doc.page_content for doc in docs]
