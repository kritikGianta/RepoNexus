"""Groq LLM access with multi-key rotation.

All LLM calls in the code base go through :func:`invoke_llm`. Keys are taken from
``GROQ_API_KEYS`` (comma separated) plus the legacy ``GROQ_API_KEY`` / ``GROQ_API_KEY_2``.
When a key is rate limited it is put on a short cool-down and the next key is tried.
"""

from __future__ import annotations

import logging
import threading
import time
from typing import Any

from app.core.config import get_settings
from app.core.exceptions import AIUnavailableError

logger = logging.getLogger(__name__)

_RATE_LIMIT_MARKERS = ("rate_limit", "rate limit", "429", "limit_reached", "too many requests")
_COOLDOWN_SECONDS = 60.0


def _is_rate_limited(exc: Exception) -> bool:
    text = str(exc).lower()
    return any(marker in text for marker in _RATE_LIMIT_MARKERS)


class GroqClientManager:
    """Thread-safe round-robin over the configured Groq keys."""

    def __init__(self) -> None:
        self._lock = threading.Lock()
        self._cursor = 0
        self._cooldown_until: dict[str, float] = {}

    @property
    def keys(self) -> list[str]:
        return get_settings().groq_keys

    @property
    def available(self) -> bool:
        return bool(self.keys)

    def _ordered_keys(self) -> list[str]:
        keys = self.keys
        if not keys:
            return []
        with self._lock:
            start = self._cursor % len(keys)
            self._cursor += 1
        ordered = keys[start:] + keys[:start]
        now = time.monotonic()
        fresh = [k for k in ordered if self._cooldown_until.get(k, 0) <= now]
        # If every key is cooling down, still try them rather than failing outright.
        return fresh or ordered

    def _mark_limited(self, key: str) -> None:
        self._cooldown_until[key] = time.monotonic() + _COOLDOWN_SECONDS

    def build_client(self, key: str, temperature: float = 0.3, max_tokens: int = 4096, timeout: int = 60):
        from langchain_groq import ChatGroq

        return ChatGroq(
            api_key=key,
            model_name=get_settings().groq_model_name,
            temperature=temperature,
            max_tokens=max_tokens,
            timeout=timeout,
            max_retries=0,
        )

    def invoke(self, prompt: Any, temperature: float = 0.3, max_tokens: int = 4096, timeout: int = 60):
        keys = self._ordered_keys()
        if not keys:
            raise AIUnavailableError(
                "AI features are not configured. Add GROQ_API_KEY (or GROQ_API_KEYS) to backend/.env and restart."
            )

        last_exc: Exception | None = None
        for key in keys:
            client = self.build_client(key, temperature=temperature, max_tokens=max_tokens, timeout=timeout)
            try:
                return client.invoke(prompt)
            except Exception as exc:  # noqa: BLE001 - provider errors are heterogeneous
                last_exc = exc
                if _is_rate_limited(exc):
                    logger.warning("Groq key rate limited, rotating to next key")
                    self._mark_limited(key)
                    continue
                raise
        assert last_exc is not None
        raise last_exc


groq_manager = GroqClientManager()


def invoke_llm(prompt: Any, temperature: float = 0.3, max_tokens: int = 4096, timeout: int = 60):
    """Invoke the configured LLM, rotating across keys on rate limits."""
    return groq_manager.invoke(prompt, temperature=temperature, max_tokens=max_tokens, timeout=timeout)
