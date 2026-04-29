from pydantic import BaseModel


class GitHubLoginResponse(BaseModel):
    authorize_url: str
    state: str


class AuthTokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
