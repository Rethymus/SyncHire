"""Performance optimization indexes

Revision ID: 002
Revises: 001
Create Date: 2025-05-21

Adds indexes for:
- Resumes created_at for ordering
- JDs created_at for ordering
- Applications created_at for ordering
- Applications match_score for filtering
- Applications status for filtering
- Vector similarity search optimization
"""

from typing import Sequence, Union

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "002"
down_revision: Union[str, None] = "001"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add indexes for common query patterns

    # Resumes: ordering by created_at DESC
    op.create_index(
        "ix_resumes_created_at",
        "resumes",
        ["created_at"],
    )

    # JDs: ordering by created_at DESC
    op.create_index(
        "ix_jds_created_at",
        "job_descriptions",
        ["created_at"],
    )

    # Applications: ordering by created_at DESC
    op.create_index(
        "ix_applications_created_at",
        "applications",
        ["created_at"],
    )

    # Applications: filtering by match_score
    op.create_index(
        "ix_applications_match_score",
        "applications",
        ["match_score"],
    )

    # Composite index for user filtering with status
    op.create_index(
        "ix_applications_user_status",
        "applications",
        ["user_id", "status"],
    )

    # Partial index for pending applications (common query)
    op.execute("""
        CREATE INDEX ix_applications_pending
        ON applications (user_id, created_at DESC)
        WHERE status = 'pending'
    """)

    # Partial index for optimized applications
    op.execute("""
        CREATE INDEX ix_applications_optimized
        ON applications (user_id, created_at DESC)
        WHERE status = 'optimized'
    """)

    # Create a vector similarity search index for resumes
    # Note: This requires the vector extension to be installed
    op.execute("""
        CREATE INDEX ix_resumes_embedding_vector
        ON resumes USING ivfflat (embedding vector_cosine_ops)
        WITH (lists = 100)
    """)

    # Create a vector similarity search index for JDs
    op.execute("""
        CREATE INDEX ix_jds_embedding_vector
        ON job_descriptions USING ivfflat (embedding vector_cosine_ops)
        WITH (lists = 100)
    """)


def downgrade() -> None:
    op.drop_index("ix_jds_embedding_vector", table_name="job_descriptions")
    op.drop_index("ix_resumes_embedding_vector", table_name="resumes")
    op.execute("DROP INDEX IF EXISTS ix_applications_optimized")
    op.execute("DROP INDEX IF EXISTS ix_applications_pending")
    op.drop_index("ix_applications_user_status", table_name="applications")
    op.drop_index("ix_applications_match_score", table_name="applications")
    op.drop_index("ix_applications_created_at", table_name="applications")
    op.drop_index("ix_jds_created_at", table_name="job_descriptions")
    op.drop_index("ix_resumes_created_at", table_name="resumes")
