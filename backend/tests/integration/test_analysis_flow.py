"""Integration tests for analysis run endpoints."""

import pytest
from unittest.mock import patch

pytestmark = pytest.mark.asyncio


@patch("app.api.routes.analysis.dispatch_analysis")
async def test_trigger_run(mock_dispatch, client, auth_headers, seed_repo):
    """POST /analysis/{repo_id}/runs should create and enqueue a run."""
    resp = await client.post(
        f"/api/v1/analysis/{seed_repo.id}/runs?trigger_type=manual",
        headers=auth_headers,
    )
    assert resp.status_code == 202
    data = resp.json()
    assert data["status"] == "queued"
    assert "run_id" in data
    mock_dispatch.assert_called_once()

    # A second trigger while the first is still queued must be rejected.
    again = await client.post(f"/api/v1/analysis/{seed_repo.id}/runs", headers=auth_headers)
    assert again.status_code == 409


async def test_list_runs(client, auth_headers, seed_run, seed_repo):
    """GET /analysis/{repo_id}/runs returns paginated run list."""
    resp = await client.get(
        f"/api/v1/analysis/{seed_repo.id}/runs",
        headers=auth_headers,
    )
    assert resp.status_code == 200
    data = resp.json()
    assert len(data["items"]) == 1
    assert data["items"][0]["status"] == "completed"
    assert data["page"]["total"] == 1


async def test_get_run_detail(client, auth_headers, seed_run):
    """GET /analysis/runs/{run_id} returns run detail."""
    resp = await client.get(
        f"/api/v1/analysis/runs/{seed_run.id}",
        headers=auth_headers,
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["id"] == seed_run.id
    assert data["total_files_analyzed"] == 42
    assert data["overall_debt_score"] == pytest.approx(65.3)
    assert data["category_breakdown"]["high_complexity"] == 3


async def test_get_run_not_found(client, auth_headers, seed_user):
    """GET /analysis/runs/9999 returns 404."""
    resp = await client.get("/api/v1/analysis/runs/9999", headers=auth_headers)
    assert resp.status_code == 404
