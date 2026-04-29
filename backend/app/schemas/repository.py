from datetime import datetime

from pydantic import BaseModel, ConfigDict


class RepoConnectRequest(BaseModel):
    full_name: str


class WebhookRegisterResponse(BaseModel):
    success: bool
    webhook_id: int | None = None


class RepoResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    github_repo_id: int
    full_name: str
    default_branch: str
    primary_language: str | None
    last_analyzed_at: datetime | None
    current_overall_debt_score: float | None
    rag_embedded_at: datetime | None


class RepoListResponse(BaseModel):
    repositories: list[RepoResponse]
