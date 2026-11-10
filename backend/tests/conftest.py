"""Test environment. Values are set before any `app` module is imported."""

import os

from cryptography.fernet import Fernet

os.environ.update(
    {
        "ENVIRONMENT": "test",
        "DATABASE_URL": "sqlite+aiosqlite:///:memory:",
        "REDIS_URL": "redis://localhost:6379/0",
        "TASK_EXECUTION_MODE": "inline",
        "GITHUB_CLIENT_ID": "test-client-id",
        "GITHUB_CLIENT_SECRET": "test-client-secret",
        "GITHUB_REDIRECT_URI": "http://localhost:5175/auth/github/callback",
        "JWT_SECRET": "x" * 32,
        "ENCRYPTION_KEY": Fernet.generate_key().decode(),
        "GROQ_API_KEY": "test-key",
        "MLFLOW_TRACKING_URI": "",
        "API_BASE_URL": "http://localhost:8000",
        "CORS_ORIGINS": "http://localhost:5175",
        "RATE_LIMIT_ENABLED": "false",
        "RAG_STORE_DIR": os.path.join(os.path.dirname(__file__), ".rag_test"),
    }
)
