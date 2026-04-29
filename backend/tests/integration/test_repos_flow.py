"""Integration tests for repository CRUD endpoints."""

import pytest
from unittest.mock import patch, MagicMock

pytestmark = pytest.mark.asyncio


async def test_list_repos_empty(client, auth_headers, seed_user):
    """GET /repos with no connected repos returns empty list."""
    resp = await client.get("/api/v1/repos", headers=auth_headers)
    assert resp.status_code == 200
    data = resp.json()
    assert data["repositories"] == []


async def test_list_repos_with_data(client, auth_headers, seed_repo):
    """GET /repos returns connected repositories."""
    resp = await client.get("/api/v1/repos", headers=auth_headers)
    assert resp.status_code == 200
    repos = resp.json()["repositories"]
    assert len(repos) == 1
    assert repos[0]["full_name"] == "testuser/testrepo"
    assert repos[0]["default_branch"] == "main"


@patch("app.api.routes.repositories.GitHubService")
async def test_connect_repo(mock_github_cls, client, auth_headers, seed_user):
    """POST /repos/connect should create a repository record."""
    mock_instance = MagicMock()
    mock_instance.get_repo_metadata.return_value = {
        "id": 55555,
        "full_name": "testuser/newrepo",
        "default_branch": "main",
        "language": "TypeScript",
    }
    mock_github_cls.return_value = mock_instance

    resp = await client.post(
        "/api/v1/repos/connect",
        json={"full_name": "testuser/newrepo"},
        headers=auth_headers,
    )
    if resp.status_code != 200:
        print("ERROR:", resp.json())
    assert resp.status_code == 200
    data = resp.json()
    assert data["full_name"] == "testuser/newrepo"
    assert data["primary_language"] == "TypeScript"


async def test_disconnect_repo(client, auth_headers, seed_repo):
    """DELETE /repos/{id} should remove the repository."""
    resp = await client.delete(f"/api/v1/repos/{seed_repo.id}", headers=auth_headers)
    assert resp.status_code == 204

    # Verify it's gone
    resp = await client.get("/api/v1/repos", headers=auth_headers)
    assert resp.json()["repositories"] == []


async def test_disconnect_nonexistent_repo(client, auth_headers, seed_user):
    """DELETE /repos/9999 should return 404."""
    resp = await client.delete("/api/v1/repos/9999", headers=auth_headers)
    assert resp.status_code == 404
