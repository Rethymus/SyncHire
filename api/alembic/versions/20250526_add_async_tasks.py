"""Add async task processing table

Revision ID: 20250526_add_async_tasks
Revises: 20250526_add_2fa_support
Create Date: 2026-05-26 14:30:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = '20250526_add_async_tasks'
down_revision = '20250526_add_2fa_support'
branch_labels = None
depends_on = None


def upgrade():
    """Create the tasks table for async processing."""
    op.create_table(
        'tasks',
        sa.Column(
            'id',
            postgresql.UUID(as_uuid=True),
            primary_key=True,
            server_default=sa.text('gen_random_uuid()')
        ),
        sa.Column(
            'user_id',
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey('users.id', ondelete='CASCADE'),
            nullable=False
        ),
        sa.Column('task_type', sa.String(), nullable=False),
        sa.Column('status', sa.String(), nullable=False, server_default='pending'),
        sa.Column('input_data', postgresql.JSONB(), nullable=True),
        sa.Column('result_data', postgresql.JSONB(), nullable=True),
        sa.Column('error_message', sa.Text(), nullable=True),
        sa.Column('error_details', postgresql.JSONB(), nullable=True),
        sa.Column('priority', sa.String(), nullable=True, server_default='normal'),
        sa.Column('progress', postgresql.JSONB(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.text('now()')),
        sa.Column('started_at', sa.DateTime(), nullable=True),
        sa.Column('completed_at', sa.DateTime(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), nullable=False, server_default=sa.text('now()')),
    )

    # Create indexes for performance
    op.create_index('ix_tasks_user_id', 'tasks', ['user_id'])
    op.create_index('ix_tasks_task_type', 'tasks', ['task_type'])
    op.create_index('ix_tasks_status', 'tasks', ['status'])
    op.create_index('ix_tasks_created_at', 'tasks', ['created_at'])
    op.create_index('ix_tasks_user_status', 'tasks', ['user_id', 'status'])


def downgrade():
    """Drop the tasks table."""
    op.drop_index('ix_tasks_user_status', 'tasks')
    op.drop_index('ix_tasks_created_at', 'tasks')
    op.drop_index('ix_tasks_status', 'tasks')
    op.drop_index('ix_tasks_task_type', 'tasks')
    op.drop_index('ix_tasks_user_id', 'tasks')
    op.drop_table('tasks')
