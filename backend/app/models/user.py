from sqlalchemy import BigInteger, Enum, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin
from app.models.enums import PlanTier


class User(TimestampMixin, Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    github_user_id: Mapped[int] = mapped_column(BigInteger, unique=True, nullable=False, index=True)
    username: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    email: Mapped[str | None] = mapped_column(String(320), nullable=True)
    avatar_url: Mapped[str | None] = mapped_column(String(1024), nullable=True)
    encrypted_access_token: Mapped[str] = mapped_column(Text, nullable=False)
    plan_tier: Mapped[PlanTier] = mapped_column(Enum(PlanTier), nullable=False, default=PlanTier.FREE)

    repositories = relationship("Repository", back_populates="owner", cascade="all, delete-orphan")
