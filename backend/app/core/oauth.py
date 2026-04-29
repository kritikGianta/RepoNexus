from urllib.parse import urlencode

import httpx

from app.core.config import get_settings

settings = get_settings()

GITHUB_AUTH_URL = "https://github.com/login/oauth/authorize"
GITHUB_TOKEN_URL = "https://github.com/login/oauth/access_token"
GITHUB_USER_URL = "https://api.github.com/user"
GITHUB_USER_EMAILS_URL = "https://api.github.com/user/emails"


def build_github_oauth_url(state: str | None = None) -> str:
    params = {
        "client_id": settings.github_client_id,
        "redirect_uri": settings.github_redirect_uri,
        "scope": "repo read:user user:email admin:repo_hook",
    }
    if state:
        params["state"] = state
    return f"{GITHUB_AUTH_URL}?{urlencode(params)}"


async def exchange_code_for_token(code: str) -> str:
    payload = {
        "client_id": settings.github_client_id,
        "client_secret": settings.github_client_secret,
        "code": code,
        "redirect_uri": settings.github_redirect_uri,
    }
    headers = {"Accept": "application/json"}
    async with httpx.AsyncClient(timeout=30.0) as client:
        response = await client.post(GITHUB_TOKEN_URL, data=payload, headers=headers)
    response.raise_for_status()
    data = response.json()
    token = data.get("access_token")
    if not token:
        raise ValueError("GitHub token exchange failed")
    return token


async def fetch_github_user(access_token: str) -> dict:
    headers = {
        "Authorization": f"Bearer {access_token}",
        "Accept": "application/vnd.github+json",
    }
    async with httpx.AsyncClient(timeout=30.0) as client:
        user_resp = await client.get(GITHUB_USER_URL, headers=headers)
        user_resp.raise_for_status()
        emails_resp = await client.get(GITHUB_USER_EMAILS_URL, headers=headers)

    user = user_resp.json()
    if emails_resp.is_success:
        emails = emails_resp.json()
        primary = next((e["email"] for e in emails if e.get("primary")), None)
        if primary:
            user["email"] = primary
    return user
