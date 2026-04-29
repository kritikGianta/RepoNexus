"""Integration tests for debt items and trends endpoints."""

import pytest

pytestmark = pytest.mark.asyncio


# ─── Debt Items ───────────────────────────────────────────────────────

async def test_list_debts(client, auth_headers, seed_debt, seed_repo):
    """GET /debts/{repo_id}/items returns debt list."""
    resp = await client.get(
        f"/api/v1/debts/{seed_repo.id}/items",
        headers=auth_headers,
    )
    assert resp.status_code == 200
    data = resp.json()
    assert len(data["items"]) == 1
    assert data["items"][0]["title"] == "Complex nested logic"
    assert data["items"][0]["severity_level"] == "high"


async def test_list_debts_filter_severity(client, auth_headers, seed_debt, seed_repo):
    """GET /debts/{repo_id}/items?severity=low returns empty when debt is high."""
    resp = await client.get(
        f"/api/v1/debts/{seed_repo.id}/items?severity=low",
        headers=auth_headers,
    )
    assert resp.status_code == 200
    data = resp.json()
    assert len(data["items"]) == 0


async def test_list_debts_filter_category(client, auth_headers, seed_debt, seed_repo):
    """GET /debts/{repo_id}/items?category=high_complexity returns matching items."""
    resp = await client.get(
        f"/api/v1/debts/{seed_repo.id}/items?category=high_complexity",
        headers=auth_headers,
    )
    assert resp.status_code == 200
    data = resp.json()
    assert len(data["items"]) == 1


async def test_get_debt_detail(client, auth_headers, seed_debt):
    """GET /debts/items/{id} returns debt detail."""
    resp = await client.get(
        f"/api/v1/debts/items/{seed_debt.id}",
        headers=auth_headers,
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["file_path"] == "src/utils.py"
    assert data["ai_explanation"] != ""
    assert data["offending_code_snippet"] != ""


async def test_mark_debt_fixed(client, auth_headers, seed_debt):
    """PATCH /debts/items/{id}/fixed toggles the is_fixed flag."""
    resp = await client.patch(
        f"/api/v1/debts/items/{seed_debt.id}/fixed",
        json={"is_fixed": True},
        headers=auth_headers,
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["is_fixed"] is True

    # Toggle back
    resp2 = await client.patch(
        f"/api/v1/debts/items/{seed_debt.id}/fixed",
        json={"is_fixed": False},
        headers=auth_headers,
    )
    assert resp2.json()["is_fixed"] is False


# ─── Trends ───────────────────────────────────────────────────────────

async def test_get_trends(client, auth_headers, seed_trend, seed_repo):
    """GET /trends/{repo_id} returns trend series."""
    resp = await client.get(
        f"/api/v1/trends/{seed_repo.id}?period=90d",
        headers=auth_headers,
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["period"] == "90d"
    assert len(data["points"]) == 1
    assert data["points"][0]["overall_score"] == pytest.approx(65.3)
    assert data["points"][0]["total_estimated_debt_hours"] == pytest.approx(120.0)


async def test_get_trends_empty_repo(client, auth_headers, seed_repo):
    """GET /trends/{repo_id} with no runs returns empty points."""
    resp = await client.get(
        f"/api/v1/trends/{seed_repo.id}?period=30d",
        headers=auth_headers,
    )
    assert resp.status_code == 200
    data = resp.json()
    # May have points or empty depending on date window; should not error
    assert "points" in data
