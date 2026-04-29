"""Shared integration test fixtures with in-memory DB and deterministic mocks."""

import asyncio
import os
from pathlib import Path
from datetime import datetime, timezone
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
import pytest_asyncio
from cryptography.fernet import Fernet
from httpx import AsyncClient, ASGITransport

# Ensure test environment vars are set before any app imports
os.environ.setdefault("DATABASE_URL", "sqlite+aiosqlite:///:memory:")
os.environ.setdefault("REDIS_URL", "redis://localhost:6379/0")
os.environ.setdefault("GITHUB_CLIENT_ID", "test-client-id")
os.environ.setdefault("GITHUB_CLIENT_SECRET", "test-client-secret")
os.environ.setdefault("GITHUB_REDIRECT_URI", "http://localhost:8000/api/v1/auth/github/callback")
os.environ.setdefault("JWT_SECRET", "x" * 32)
os.environ.setdefault("ENCRYPTION_KEY", Fernet.generate_key().decode())
os.environ.setdefault("GROQ_API_KEY", "test-key")
os.environ.setdefault("MLFLOW_TRACKING_URI", "http://localhost:5000")
os.environ.setdefault("API_BASE_URL", "http://localhost:8000")
os.environ.setdefault("CORS_ORIGINS", "http://localhost:5173")
os.environ.setdefault("environment", "test")

from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from app.models.base import Base
from app.db.session import get_db_session
from app.core.security import create_access_token
from app.core.encryption import encrypt_token
from app.models.user import User
from app.models.repository import Repository
from app.models.analysis_run import AnalysisRun
from app.models.debt_item import DebtItem
from app.models.debt_trend import DebtTrend
from app.models.enums import PlanTier, AnalysisRunStatus, TriggerType, DebtCategory, SeverityLevel


@pytest.fixture(scope="session")
def event_loop():
    loop = asyncio.new_event_loop()
    yield loop
    loop.close()


@pytest_asyncio.fixture
async def db_engine():
    engine = create_async_engine("sqlite+aiosqlite:///:memory:", echo=False)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield engine
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
    await engine.dispose()


@pytest_asyncio.fixture
async def db_session(db_engine):
    session_factory = async_sessionmaker(bind=db_engine, class_=AsyncSession, expire_on_commit=False)
    async with session_factory() as session:
        yield session


@pytest_asyncio.fixture
async def client(db_session):
    from app.main import app

    async def override_db():
        yield db_session

    app.dependency_overrides[get_db_session] = override_db
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://testserver") as c:
        yield c
    app.dependency_overrides.clear()


@pytest_asyncio.fixture
async def seed_user(db_session: AsyncSession) -> User:
    """Create a test user and return it."""
    user = User(
        github_user_id=12345,
        username="testuser",
        email="test@example.com",
        avatar_url="https://avatars.example.com/u/12345",
        encrypted_access_token=encrypt_token("ghp_test_token_12345"),
        plan_tier=PlanTier.FREE,
    )
    db_session.add(user)
    await db_session.commit()
    await db_session.refresh(user)
    return user


@pytest_asyncio.fixture
async def auth_headers(seed_user: User) -> dict[str, str]:
    """Return Bearer auth headers for the seed user."""
    token = create_access_token(str(seed_user.id), extra_claims={"username": seed_user.username})
    return {"Authorization": f"Bearer {token}"}


@pytest_asyncio.fixture
async def seed_repo(db_session: AsyncSession, seed_user: User) -> Repository:
    """Create a test repository."""
    repo = Repository(
        user_id=seed_user.id,
        github_repo_id=99999,
        full_name="testuser/testrepo",
        default_branch="main",
        primary_language="Python",
    )
    db_session.add(repo)
    await db_session.commit()
    await db_session.refresh(repo)
    return repo


@pytest_asyncio.fixture
async def seed_run(db_session: AsyncSession, seed_repo: Repository) -> AnalysisRun:
    """Create a completed test analysis run."""
    run = AnalysisRun(
        repo_id=seed_repo.id,
        commit_sha="abc1234567890",
        status=AnalysisRunStatus.COMPLETED,
        trigger_type=TriggerType.MANUAL,
        total_files_analyzed=42,
        total_debt_items_found=5,
        overall_debt_score=65.3,
        category_breakdown={"high_complexity": 3, "missing_tests": 2},
        started_at=datetime(2026, 4, 20, 10, 0, 0, tzinfo=timezone.utc),
        ended_at=datetime(2026, 4, 20, 10, 5, 0, tzinfo=timezone.utc),
    )
    db_session.add(run)
    await db_session.commit()
    await db_session.refresh(run)
    return run


@pytest_asyncio.fixture
async def seed_debt(db_session: AsyncSession, seed_run: AnalysisRun, seed_repo: Repository) -> DebtItem:
    """Create a test debt item."""
    debt = DebtItem(
        analysis_run_id=seed_run.id,
        repo_id=seed_repo.id,
        file_path="src/utils.py",
        start_line=10,
        end_line=30,
        debt_category=DebtCategory.HIGH_COMPLEXITY,
        severity_level=SeverityLevel.HIGH,
        debt_score=78.5,
        estimated_effort_hours=4.0,
        title="Complex nested logic",
        description="Multiple nested conditions create cognitive complexity.",
        ai_explanation="This code has cyclomatically complex paths that are hard to test.",
        ai_fix_suggestion="Extract inner conditions into separate well-named functions.",
        offending_code_snippet="def process(data):\n  for item in data:\n    if item.valid:\n      ...",
        is_fixed=False,
    )
    db_session.add(debt)
    await db_session.commit()
    await db_session.refresh(debt)
    return debt


@pytest_asyncio.fixture
async def seed_trend(db_session: AsyncSession, seed_run: AnalysisRun, seed_repo: Repository) -> DebtTrend:
    """Create a test trend point."""
    trend = DebtTrend(
        repo_id=seed_repo.id,
        analysis_run_id=seed_run.id,
        overall_score=65.3,
        complexity_score=72.0,
        duplication_score=45.0,
        security_score=30.0,
        test_coverage_score=55.0,
        total_estimated_debt_hours=120.0,
    )
    db_session.add(trend)
    await db_session.commit()
    await db_session.refresh(trend)
    return trend
