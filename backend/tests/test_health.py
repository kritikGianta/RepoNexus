from fastapi.testclient import TestClient


def test_health_endpoint() -> None:
    from app.main import app

    response = TestClient(app).get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok", "service": "reponexus-backend"}
    assert response.headers["X-Content-Type-Options"] == "nosniff"
    assert "X-Request-ID" in response.headers


def test_system_status_reports_configuration() -> None:
    from app.main import app

    body = TestClient(app).get("/api/v1/system/status").json()
    assert body["ai_configured"] is True
    assert body["github_oauth_configured"] is True
    assert body["task_execution_mode"] == "inline"
