from datetime import datetime

from sqlalchemy import DateTime, Enum, Float, ForeignKey, Integer, JSON, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin
from app.models.enums import AnalysisRunStatus, TriggerType


class AnalysisRun(TimestampMixin, Base):
    __tablename__ = "analysis_runs"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    repo_id: Mapped[int] = mapped_column(ForeignKey("repositories.id", ondelete="CASCADE"), nullable=False, index=True)
    commit_sha: Mapped[str | None] = mapped_column(String(64), nullable=True, index=True)
    status: Mapped[AnalysisRunStatus] = mapped_column(Enum(AnalysisRunStatus), nullable=False, index=True)
    trigger_type: Mapped[TriggerType] = mapped_column(Enum(TriggerType), nullable=False)
    total_files_analyzed: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    total_debt_items_found: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    overall_debt_score: Mapped[float | None] = mapped_column(Float, nullable=True)
    category_breakdown: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    started_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    ended_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    mlflow_run_id: Mapped[str | None] = mapped_column(String(64), nullable=True)
    error_message: Mapped[str | None] = mapped_column(String(2048), nullable=True)

    repository = relationship("Repository", back_populates="analysis_runs")
    debt_items = relationship("DebtItem", back_populates="analysis_run", cascade="all, delete-orphan")
    debt_trend = relationship("DebtTrend", back_populates="analysis_run", uselist=False)
