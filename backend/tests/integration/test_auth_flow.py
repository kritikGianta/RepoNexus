"""Integration tests for auth flow endpoints."""

import pytest
from unittest.mock import patch, AsyncMock

pytestmark = pytest.mark.asyncio


async def test_github_login_returns_authorize_url(client):
    """GET /auth/github/login should return a GitHub OAuth URL and state."""
    resp = await client.get("/api/v1/auth/github/login")
    assert resp.status_code == 200
    data = resp.json()
    assert "authorize_url" in data
    assert "github.com/login/oauth/authorize" in data["authorize_url"]
    assert "state" in data
    assert len(data["state"]) > 20


async def test_github_callback_invalid_state(client):
    """GET /auth/github/callback with invalid state should return 400."""
    resp = await client.get("/api/v1/auth/github/callback?code=1234567890&state=invalid-state-that-is-long-enough")
    assert resp.status_code == 400
    assert "Invalid OAuth state" in resp.json()["detail"]


@patch("app.api.routes.auth.exchange_code_for_token", new_callable=AsyncMock)
@patch("app.api.routes.auth.fetch_github_user", new_callable=AsyncMock)
@patch("app.api.routes.auth.verify_oauth_state", return_value=True)
async def test_github_callback_success(mock_verify, mock_fetch_user, mock_exchange, client):
    """GET /auth/github/callback with mocked GitHub returns JWT."""
    mock_exchange.return_value = "ghp_mock_token_from_github"
    mock_fetch_user.return_value = {
        "id": 99001,
        "login": "mockuser",
        "email": "mock@example.com",
        "avatar_url": "https://avatars.example.com/u/99001",
    }

    resp = await client.get("/api/v1/auth/github/callback?code=1234567890&state=valid-state-long-enough1234")
    assert resp.status_code == 200
    data = resp.json()
    assert "access_token" in data
    assert data["token_type"] == "bearer"


async def test_me_unauthenticated(client):
    """GET /auth/me without token should return 401."""
    resp = await client.get("/api/v1/auth/me")
    assert resp.status_code == 401


async def test_me_authenticated(client, auth_headers, seed_user):
    """GET /auth/me with valid JWT returns user profile."""
    resp = await client.get("/api/v1/auth/me", headers=auth_headers)
    assert resp.status_code == 200
    data = resp.json()
    assert data["username"] == "testuser"
    assert data["email"] == "test@example.com"
    assert data["plan_tier"] == "free"
