"""Timezone-aware rag_embedded_at and query indexes

Revision ID: 0003_tz_and_indexes
Revises: 4d01ac430399
Create Date: 2026-11-10
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "0003_tz_and_indexes"
down_revision: Union[str, None] = "4d01ac430399"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    with op.batch_alter_table("repositories") as batch:
        batch.alter_column(
            "rag_embedded_at",
            existing_type=sa.DateTime(),
            type_=sa.DateTime(timezone=True),
            existing_nullable=True,
        )
    op.create_index("ix_debt_items_repo_score", "debt_items", ["repo_id", "debt_score"])
    op.create_index("ix_analysis_runs_repo_created", "analysis_runs", ["repo_id", "created_at"])
    op.create_index("ix_debt_trends_repo_created", "debt_trends", ["repo_id", "created_at"])


def downgrade() -> None:
    op.drop_index("ix_debt_trends_repo_created", table_name="debt_trends")
    op.drop_index("ix_analysis_runs_repo_created", table_name="analysis_runs")
    op.drop_index("ix_debt_items_repo_score", table_name="debt_items")
    with op.batch_alter_table("repositories") as batch:
        batch.alter_column(
            "rag_embedded_at",
            existing_type=sa.DateTime(timezone=True),
            type_=sa.DateTime(),
            existing_nullable=True,
        )
