import os
from pathlib import Path

from cryptography.fernet import Fernet


def pytest_sessionstart(session):
    db_path = Path(__file__).parent / "test.db"
    os.environ.setdefault("DATABASE_URL", f"sqlite+aiosqlite:///{db_path.as_posix()}")
    os.environ.setdefault("REDIS_URL", "redis://localhost:6379/0")
    os.environ.setdefault("GITHUB_CLIENT_ID", "test-client-id")
    os.environ.setdefault("GITHUB_CLIENT_SECRET", "test-client-secret")
    os.environ.setdefault("GITHUB_REDIRECT_URI", "http://localhost/callback")
    os.environ.setdefault("JWT_SECRET", "x" * 32)
    os.environ.setdefault("ENCRYPTION_KEY", Fernet.generate_key().decode())
    os.environ.setdefault("GROQ_API_KEY", "test-key")
    os.environ.setdefault("MLFLOW_TRACKING_URI", "http://localhost:5000")
    os.environ.setdefault("API_BASE_URL", "http://localhost:8000")
    os.environ.setdefault("CORS_ORIGINS", "http://localhost:5173")
