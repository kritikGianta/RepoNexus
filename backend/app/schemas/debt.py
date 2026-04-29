from datetime import datetime

from pydantic import BaseModel, ConfigDict

from app.models.enums import DebtCategory, SeverityLevel
from app.schemas.common import PageMeta


class DebtItemResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    analysis_run_id: int
    repo_id: int
    file_path: str
    start_line: int
    end_line: int
    debt_category: DebtCategory
    severity_level: SeverityLevel
    debt_score: float
    estimated_effort_hours: float
    title: str
    description: str
    ai_explanation: str
    ai_fix_suggestion: str
    offending_code_snippet: str
    is_fixed: bool
    github_issue_url: str | None = None
    fix_pr_url: str | None = None
    created_at: datetime


class DebtItemListResponse(BaseModel):
    items: list[DebtItemResponse]
    page: PageMeta


class MarkFixedRequest(BaseModel):
    is_fixed: bool
