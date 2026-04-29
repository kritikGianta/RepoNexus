"""initial migration

Revision ID: 0001_initial
Revises:
Create Date: 2026-04-23
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "0001_initial"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "users",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("github_user_id", sa.BigInteger(), nullable=False),
        sa.Column("username", sa.String(255), nullable=False),
        sa.Column("email", sa.String(320), nullable=True),
        sa.Column("avatar_url", sa.String(1024), nullable=True),
        sa.Column("encrypted_access_token", sa.Text(), nullable=False),
        sa.Column("plan_tier", sa.Enum("free", "team", "enterprise", name="plantier"), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("github_user_id"),
    )
    op.create_index("ix_users_github_user_id", "users", ["github_user_id"])
    op.create_index("ix_users_username", "users", ["username"])

    op.create_table(
        "repositories",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("github_repo_id", sa.BigInteger(), nullable=False),
        sa.Column("full_name", sa.String(255), nullable=False),
        sa.Column("default_branch", sa.String(255), nullable=False),
        sa.Column("primary_language", sa.String(128), nullable=True),
        sa.Column("last_analyzed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("current_overall_debt_score", sa.Float(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("github_repo_id"),
    )
    op.create_index("ix_repositories_user_id", "repositories", ["user_id"])
    op.create_index("ix_repositories_github_repo_id", "repositories", ["github_repo_id"])
    op.create_index("ix_repositories_full_name", "repositories", ["full_name"])

    op.create_table(
        "analysis_runs",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("repo_id", sa.Integer(), nullable=False),
        sa.Column("commit_sha", sa.String(64), nullable=True),
        sa.Column("status", sa.Enum("queued", "running", "completed", "failed", name="analysisrunstatus"), nullable=False),
        sa.Column("trigger_type", sa.Enum("manual", "webhook", "scheduled", name="triggertype"), nullable=False),
        sa.Column("total_files_analyzed", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("total_debt_items_found", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("overall_debt_score", sa.Float(), nullable=True),
        sa.Column("category_breakdown", sa.JSON(), nullable=True),
        sa.Column("started_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("ended_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("mlflow_run_id", sa.String(64), nullable=True),
        sa.Column("error_message", sa.String(2048), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(["repo_id"], ["repositories.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_analysis_runs_repo_id", "analysis_runs", ["repo_id"])
    op.create_index("ix_analysis_runs_commit_sha", "analysis_runs", ["commit_sha"])
    op.create_index("ix_analysis_runs_status", "analysis_runs", ["status"])

    op.create_table(
        "debt_items",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("analysis_run_id", sa.Integer(), nullable=False),
        sa.Column("repo_id", sa.Integer(), nullable=False),
        sa.Column("file_path", sa.String(1024), nullable=False),
        sa.Column("start_line", sa.Integer(), nullable=False),
        sa.Column("end_line", sa.Integer(), nullable=False),
        sa.Column(
            "debt_category",
            sa.Enum(
                "high_complexity", "code_duplication", "dead_code", "poor_naming",
                "missing_tests", "security_smells", "performance_antipatterns",
                "outdated_dependencies", "tight_coupling", "missing_documentation",
                name="debtcategory",
            ),
            nullable=False,
        ),
        sa.Column("severity_level", sa.Enum("low", "medium", "high", "critical", name="severitylevel"), nullable=False),
        sa.Column("debt_score", sa.Float(), nullable=False),
        sa.Column("estimated_effort_hours", sa.Float(), nullable=False),
        sa.Column("title", sa.String(255), nullable=False),
        sa.Column("description", sa.Text(), nullable=False),
        sa.Column("ai_explanation", sa.Text(), nullable=False),
        sa.Column("ai_fix_suggestion", sa.Text(), nullable=False),
        sa.Column("offending_code_snippet", sa.Text(), nullable=False),
        sa.Column("is_fixed", sa.Boolean(), nullable=False, server_default="0"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(["analysis_run_id"], ["analysis_runs.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["repo_id"], ["repositories.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_debt_items_analysis_run_id", "debt_items", ["analysis_run_id"])
    op.create_index("ix_debt_items_repo_id", "debt_items", ["repo_id"])
    op.create_index("ix_debt_items_file_path", "debt_items", ["file_path"])
    op.create_index("ix_debt_items_debt_category", "debt_items", ["debt_category"])
    op.create_index("ix_debt_items_severity_level", "debt_items", ["severity_level"])

    op.create_table(
        "debt_trends",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("repo_id", sa.Integer(), nullable=False),
        sa.Column("analysis_run_id", sa.Integer(), nullable=False),
        sa.Column("overall_score", sa.Float(), nullable=False),
        sa.Column("complexity_score", sa.Float(), nullable=False),
        sa.Column("duplication_score", sa.Float(), nullable=False),
        sa.Column("security_score", sa.Float(), nullable=False),
        sa.Column("test_coverage_score", sa.Float(), nullable=False),
        sa.Column("total_estimated_debt_hours", sa.Float(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(["repo_id"], ["repositories.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["analysis_run_id"], ["analysis_runs.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("analysis_run_id"),
    )
    op.create_index("ix_debt_trends_repo_id", "debt_trends", ["repo_id"])
    op.create_index("ix_debt_trends_analysis_run_id", "debt_trends", ["analysis_run_id"])


def downgrade() -> None:
    op.drop_table("debt_trends")
    op.drop_table("debt_items")
    op.drop_table("analysis_runs")
    op.drop_table("repositories")
    op.drop_table("users")
