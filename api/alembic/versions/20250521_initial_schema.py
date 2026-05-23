"""Initial schema with PGVector support

Revision ID: 001
Revises:
Create Date: 2025-05-21

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = "001"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Enable PGVector extension
    op.execute("CREATE EXTENSION IF NOT EXISTS vector")

    # Create users table
    op.create_table(
        "users",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("email", sa.String(255), nullable=False),
        sa.Column("hashed_password", sa.String(), nullable=False),
        sa.Column("full_name", sa.String(), nullable=True),
        sa.Column("is_active", sa.Boolean(), default=True, nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=True, server_default=sa.text("now()")),
        sa.Column("updated_at", sa.DateTime(), nullable=True, server_default=sa.text("now()")),
    )
    op.create_index("ix_users_email", "users", ["email"], unique=True)

    # Create resumes table
    op.create_table(
        "resumes",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("title", sa.String(255), nullable=False),
        sa.Column("file_url", sa.String(), nullable=False),
        sa.Column("file_type", sa.String(50), nullable=False),
        sa.Column("parsed_data", postgresql.JSONB(), nullable=True),
        sa.Column("embedding", postgresql.ARRAY(sa.Float(), dimensions=1), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=True, server_default=sa.text("now()")),
        sa.Column("updated_at", sa.DateTime(), nullable=True, server_default=sa.text("now()")),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
    )
    op.create_index("ix_resumes_user_id", "resumes", ["user_id"])

    # Create job_descriptions table
    op.create_table(
        "job_descriptions",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("company_name", sa.String(255), nullable=False),
        sa.Column("job_title", sa.String(255), nullable=False),
        sa.Column("description", sa.Text(), nullable=False),
        sa.Column("requirements", sa.Text(), nullable=True),
        sa.Column("raw_data", postgresql.JSONB(), nullable=True),
        sa.Column("embedding", postgresql.ARRAY(sa.Float(), dimensions=1), nullable=True),
        sa.Column("source_url", sa.String(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=True, server_default=sa.text("now()")),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
    )
    op.create_index("ix_job_descriptions_user_id", "job_descriptions", ["user_id"])

    # Create applications table
    op.create_table(
        "applications",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("resume_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("job_description_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("status", sa.String(50), nullable=False, server_default="draft"),
        sa.Column("match_score", sa.Numeric(5, 2), nullable=True),
        sa.Column("applied_at", sa.DateTime(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=True, server_default=sa.text("now()")),
        sa.Column("updated_at", sa.DateTime(), nullable=True, server_default=sa.text("now()")),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["resume_id"], ["resumes.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["job_description_id"], ["job_descriptions.id"], ondelete="CASCADE"),
    )
    op.create_index("ix_applications_user_id", "applications", ["user_id"])
    op.create_index("ix_applications_status", "applications", ["status"])

    # Create interview_prep_sessions table
    op.create_table(
        "interview_prep_sessions",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("application_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("questions", postgresql.JSONB(), nullable=False),
        sa.Column("answers", postgresql.JSONB(), nullable=True),
        sa.Column("feedback", postgresql.JSONB(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=True, server_default=sa.text("now()")),
        sa.ForeignKeyConstraint(["application_id"], ["applications.id"], ondelete="CASCADE"),
    )


def downgrade() -> None:
    op.drop_table("interview_prep_sessions")
    op.drop_index("ix_applications_status", "applications")
    op.drop_index("ix_applications_user_id", "applications")
    op.drop_table("applications")
    op.drop_index("ix_job_descriptions_user_id", "job_descriptions")
    op.drop_table("job_descriptions")
    op.drop_index("ix_resumes_user_id", "resumes")
    op.drop_table("resumes")
    op.drop_index("ix_users_email", "users")
    op.drop_table("users")
    op.execute("DROP EXTENSION IF EXISTS vector")
