from datetime import datetime

from pydantic import BaseModel, ConfigDict

from app.models.enums import AnalysisRunStatus, TriggerType
from app.schemas.common import PageMeta


class AnalysisRunResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    repo_id: int
    commit_sha: str | None
    status: AnalysisRunStatus
    trigger_type: TriggerType
    total_files_analyzed: int
    total_debt_items_found: int
    overall_debt_score: float | None
    category_breakdown: dict | None
    started_at: datetime | None
    ended_at: datetime | None
    mlflow_run_id: str | None
    error_message: str | None


class TriggerAnalysisResponse(BaseModel):
    run_id: int
    status: AnalysisRunStatus


class AnalysisRunListResponse(BaseModel):
    items: list[AnalysisRunResponse]
    page: PageMeta
