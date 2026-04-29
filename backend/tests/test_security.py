from app.core.security import create_oauth_state, verify_oauth_state


def test_oauth_state_roundtrip() -> None:
    state = create_oauth_state()
    assert verify_oauth_state(state) is True


def test_oauth_state_rejects_invalid_token() -> None:
    assert verify_oauth_state("invalid.state.token") is False
