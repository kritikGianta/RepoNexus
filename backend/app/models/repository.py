from datetime import datetime

from sqlalchemy import BigInteger, Float, ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin


class Repository(TimestampMixin, Base):
    __tablename__ = "repositories"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    github_repo_id: Mapped[int] = mapped_column(BigInteger, unique=True, nullable=False, index=True)
    full_name: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    default_branch: Mapped[str] = mapped_column(String(255), nullable=False)
    primary_language: Mapped[str | None] = mapped_column(String(128), nullable=True)
    last_analyzed_at: Mapped[datetime | None] = mapped_column(nullable=True)
    current_overall_debt_score: Mapped[float | None] = mapped_column(Float, nullable=True)
    rag_embedded_at: Mapped[datetime | None] = mapped_column(nullable=True)

    owner = relationship("User", back_populates="repositories")
    analysis_runs = relationship("AnalysisRun", back_populates="repository", cascade="all, delete-orphan")
    debt_items = relationship("DebtItem", back_populates="repository", cascade="all, delete-orphan")
    debt_trends = relationship("DebtTrend", back_populates="repository", cascade="all, delete-orphan")
