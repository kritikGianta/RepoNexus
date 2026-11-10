"""Unit tests for the retriever and the LLM key rotation logic."""

from unittest.mock import MagicMock

import pytest

from app.core import ai_client
from app.core.config import get_settings
from app.core.exceptions import AIUnavailableError
from app.ml.retriever import build_index, code_tokenizer


def test_code_tokenizer_splits_identifiers() -> None:
    tokens = code_tokenizer("def getUserName(user_id): pass")
    assert {"getusername", "get", "user", "name", "user_id"} <= set(tokens)


def test_retriever_ranks_relevant_chunk_first() -> None:
    index = build_index(
        [
            ("auth/login.py", "def verify_password(hash, password):\n    return bcrypt.check(hash, password)"),
            ("billing/invoice.py", "def total_invoice(items):\n    return sum(i.price for i in items)"),
        ]
    )
    results = index.search("how is the password verified", k=2)
    assert results and results[0].path == "auth/login.py"


def test_placeholder_keys_are_ignored(monkeypatch: pytest.MonkeyPatch) -> None:
    settings = get_settings()
    monkeypatch.setattr(settings, "groq_api_key", "gsk_your_groq_api_key_here")
    monkeypatch.setattr(settings, "groq_api_keys", "")
    monkeypatch.setattr(settings, "groq_api_key_2", None)
    assert settings.ai_configured is False
    with pytest.raises(AIUnavailableError):
        ai_client.GroqClientManager().invoke("hello")


def test_rate_limited_key_rotates(monkeypatch: pytest.MonkeyPatch) -> None:
    settings = get_settings()
    monkeypatch.setattr(settings, "groq_api_keys", "key-a,key-b")
    manager = ai_client.GroqClientManager()

    def build(key, **_):
        client = MagicMock()
        if key == "key-a":
            client.invoke.side_effect = RuntimeError("Error code: 429 rate_limit_exceeded")
        else:
            client.invoke.return_value = "ok"
        return client

    monkeypatch.setattr(manager, "build_client", build)
    assert manager.invoke("hi") == "ok"
