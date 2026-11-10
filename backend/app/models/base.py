from datetime import datetime

from enum import Enum as PyEnum

from sqlalchemy import DateTime, Enum, func
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column


class Base(DeclarativeBase):
    pass


class TimestampMixin:
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )


def enum_column(enum_cls: type[PyEnum], name: str) -> Enum:
    """Persist enum *values* (e.g. "queued") to match the Alembic migrations, not member names."""
    return Enum(enum_cls, name=name, values_callable=lambda members: [m.value for m in members], validate_strings=True)
