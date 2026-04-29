import hashlib
import hmac

from fastapi.testclient import TestClient

from app.api.routes import webhooks


def test_verify_github_signature_valid_and_invalid() -> None:
    raw = b'{"action":"push"}'
    secret = "unit-test-secret"

    previous = webhooks.settings.github_webhook_secret
    webhooks.settings.github_webhook_secret = secret
    try:
        digest = hmac.new(secret.encode(), raw, hashlib.sha256).hexdigest()
        assert webhooks.verify_github_signature(raw, f"sha256={digest}") is True
        assert webhooks.verify_github_signature(raw, "sha256=deadbeef") is False
        assert webhooks.verify_github_signature(raw, None) is False
    finally:
        webhooks.settings.github_webhook_secret = previous


def test_webhook_non_push_event_is_ignored() -> None:
    from app.main import app

    client = TestClient(app)
    response = client.post(
        "/api/v1/webhooks/github",
        headers={"x-github-event": "ping"},
        json={"zen": "keep it logically awesome"},
    )

    assert response.status_code == 200
    assert response.json() == {"received": True, "queued": False}


def test_webhook_malformed_payload_returns_400() -> None:
    from app.main import app

    client = TestClient(app)
    response = client.post(
        "/api/v1/webhooks/github",
        headers={"x-github-event": "push", "content-type": "application/json"},
        data="{",
    )

    assert response.status_code == 400
    assert response.json()["detail"] == "Malformed webhook payload"
