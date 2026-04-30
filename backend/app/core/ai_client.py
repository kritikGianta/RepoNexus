from __future__ import annotations
import logging
from typing import Any
from langchain_groq import ChatGroq
from app.core.config import get_settings

settings = get_settings()
logger = logging.getLogger(__name__)

class GroqClientManager:
    """Manages Groq API clients with automatic key rotation on rate limits."""
    
    def __init__(self):
        self.primary_key = settings.groq_api_key
        self.secondary_key = settings.groq_api_key_2
        self._current_key = self.primary_key
        self._using_fallback = False

    def get_client(self, temperature: float = 0.3, max_tokens: int = 4096, timeout: int = 20) -> ChatGroq:
        return ChatGroq(
            api_key=self._current_key,
            model_name=settings.groq_model_name,
            temperature=temperature,
            max_tokens=max_tokens,
            timeout=timeout,
            max_retries=0, # We handle retries manually with rotation
        )

    def rotate_key(self) -> bool:
        """Switches to the secondary key if available. Returns True if rotated."""
        if not self.secondary_key or self._using_fallback:
            return False
        
        logger.warning("Primary Groq API key rate limited. Rotating to secondary key.")
        self._current_key = self.secondary_key
        self._using_fallback = True
        return True

    def reset_key(self):
        """Resets to the primary key."""
        self._current_key = self.primary_key
        self._using_fallback = False

# Global instance
groq_manager = GroqClientManager()

def call_groq_safe(func, *args, **kwargs):
    """
    Wraps a Groq call with automatic key rotation.
    'func' should be a lambda or function that takes a ChatGroq client.
    """
    try:
        client = groq_manager.get_client(**kwargs.pop('client_kwargs', {}))
        return func(client, *args, **kwargs)
    except Exception as e:
        error_str = str(e).lower()
        if ("rate_limit" in error_str or "429" in error_str or "limit_reached" in error_str) and groq_manager.rotate_key():
            # Retry once with the new key
            client = groq_manager.get_client(**kwargs.pop('client_kwargs', {}))
            return func(client, *args, **kwargs)
        raise e
