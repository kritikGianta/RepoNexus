from sqlalchemy import Boolean, Enum, Float, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin
from app.models.enums import DebtCategory, SeverityLevel


class DebtItem(TimestampMixin, Base):
    __tablename__ = "debt_items"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    analysis_run_id: Mapped[int] = mapped_column(ForeignKey("analysis_runs.id", ondelete="CASCADE"), nullable=False, index=True)
    repo_id: Mapped[int] = mapped_column(ForeignKey("repositories.id", ondelete="CASCADE"), nullable=False, index=True)
    file_path: Mapped[str] = mapped_column(String(1024), nullable=False, index=True)
    start_line: Mapped[int] = mapped_column(Integer, nullable=False)
    end_line: Mapped[int] = mapped_column(Integer, nullable=False)
    debt_category: Mapped[DebtCategory] = mapped_column(Enum(DebtCategory), nullable=False, index=True)
    severity_level: Mapped[SeverityLevel] = mapped_column(Enum(SeverityLevel), nullable=False, index=True)
    debt_score: Mapped[float] = mapped_column(Float, nullable=False)
    estimated_effort_hours: Mapped[float] = mapped_column(Float, nullable=False)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    ai_explanation: Mapped[str] = mapped_column(Text, nullable=False)
    ai_fix_suggestion: Mapped[str] = mapped_column(Text, nullable=False)
    offending_code_snippet: Mapped[str] = mapped_column(Text, nullable=False)
    is_fixed: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    github_issue_url: Mapped[str | None] = mapped_column(String(512), nullable=True)
    fix_pr_url: Mapped[str | None] = mapped_column(String(512), nullable=True)

    analysis_run = relationship("AnalysisRun", back_populates="debt_items")
    repository = relationship("Repository", back_populates="debt_items")
