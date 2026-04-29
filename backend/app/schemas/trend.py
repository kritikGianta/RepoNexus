from datetime import datetime

from pydantic import BaseModel


class TrendPoint(BaseModel):
    analysis_run_id: int
    timestamp: datetime
    overall_score: float
    complexity_score: float
    duplication_score: float
    security_score: float
    test_coverage_score: float
    total_estimated_debt_hours: float


class TrendSeriesResponse(BaseModel):
    period: str
    points: list[TrendPoint]
