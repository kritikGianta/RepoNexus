from sqlalchemy import Float, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin


class DebtTrend(TimestampMixin, Base):
    __tablename__ = "debt_trends"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    repo_id: Mapped[int] = mapped_column(ForeignKey("repositories.id", ondelete="CASCADE"), nullable=False, index=True)
    analysis_run_id: Mapped[int] = mapped_column(
        ForeignKey("analysis_runs.id", ondelete="CASCADE"), nullable=False, unique=True, index=True
    )
    overall_score: Mapped[float] = mapped_column(Float, nullable=False)
    complexity_score: Mapped[float] = mapped_column(Float, nullable=False)
    duplication_score: Mapped[float] = mapped_column(Float, nullable=False)
    security_score: Mapped[float] = mapped_column(Float, nullable=False)
    test_coverage_score: Mapped[float] = mapped_column(Float, nullable=False)
    total_estimated_debt_hours: Mapped[float] = mapped_column(Float, nullable=False)

    repository = relationship("Repository", back_populates="debt_trends")
    analysis_run = relationship("AnalysisRun", back_populates="debt_trend")
