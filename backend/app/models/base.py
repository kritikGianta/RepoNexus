from datetime import datetime, timezone
from enum import Enum as PyEnum

from sqlalchemy import DateTime, Enum, func
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column
from sqlalchemy.types import TypeDecorator


class Base(DeclarativeBase):
    pass


class UTCDateTime(TypeDecorator):
    """Timezone-aware UTC datetime on every backend.

    MySQL DATETIME (and SQLite) keep no offset, so values are written as naive UTC and
    tagged as UTC again when read back. The MySQL server runs with ``default-time-zone=+00:00``
    so ``CURRENT_TIMESTAMP`` defaults are UTC as well.
    """

    impl = DateTime(timezone=True)
    cache_ok = True

    def process_bind_param(self, value: datetime | None, dialect):
        if value is not None and value.tzinfo is not None:
            value = value.astimezone(timezone.utc)
            if dialect.name in ("mysql", "sqlite"):
                value = value.replace(tzinfo=None)
        return value

    def process_result_value(self, value: datetime | None, dialect):
        if value is not None and value.tzinfo is None:
            value = value.replace(tzinfo=timezone.utc)
        return value


class TimestampMixin:
    created_at: Mapped[datetime] = mapped_column(UTCDateTime(), server_default=func.now(), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(
        UTCDateTime(), server_default=func.now(), onupdate=func.now(), nullable=False
    )


def enum_column(enum_cls: type[PyEnum], name: str) -> Enum:
    """Persist enum *values* (e.g. "queued") to match the Alembic migrations, not member names."""
    return Enum(enum_cls, name=name, values_callable=lambda members: [m.value for m in members], validate_strings=True)
