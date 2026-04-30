from __future__ import annotations

import os

from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain_core.documents import Document

from app.core.config import get_settings
from app.ml.types import CodeFile

settings = get_settings()

# On Render free tier (512MB), loading sentence-transformers + the 90MB model
# causes an OOM crash. Detect production by checking for the RENDER env var.
_IS_CLOUD = os.environ.get("RENDER") or os.environ.get("environment") == "production"


class CodebaseEmbedder:
    def __init__(self) -> None:
        self.available = False
        self.embeddings = None
        self.splitter = RecursiveCharacterTextSplitter(chunk_size=1000, chunk_overlap=150)

        if _IS_CLOUD:
            # Skip loading the heavy ML model entirely in production
            return

        # In local development, try to use the full embedding pipeline
        try:
            from langchain_community.embeddings import HuggingFaceEmbeddings
            from langchain_community.vectorstores import FAISS
            self.embeddings = HuggingFaceEmbeddings(model_name=settings.embedding_model_name)
            self.available = True
            self._FAISS = FAISS
        except Exception:
            self.available = False
            self.embeddings = None

    def build_index(self, code_files: list[CodeFile]):
        if not self.available:
            return None
        documents: list[Document] = []
        for file in code_files:
            for chunk in self.splitter.split_text(file.content):
                documents.append(Document(page_content=chunk, metadata={"path": file.path, "sha": file.sha}))

        if not documents:
            return None

        return self._FAISS.from_documents(documents, self.embeddings)

    def query(self, index, query_text: str, k: int = 4) -> list[str]:
        if not self.available or index is None:
            return []
        docs = index.similarity_search(query_text, k=k)
        return [doc.page_content for doc in docs]
