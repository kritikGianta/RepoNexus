from pydantic import BaseModel


class PageMeta(BaseModel):
    total: int
    page: int
    page_size: int


class HealthResponse(BaseModel):
    status: str
    service: str


class ReadinessResponse(BaseModel):
    status: str
    checks: dict[str, str]


class SystemStatusResponse(BaseModel):
    version: str
    environment: str
    ai_configured: bool
    github_oauth_configured: bool
    task_execution_mode: str
    mlflow_enabled: bool
