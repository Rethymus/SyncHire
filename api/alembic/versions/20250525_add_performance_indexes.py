"""Add performance indexes for common queries

Revision ID: 20250525_add_performance_indexes
Revises: 
Create Date: 2026-05-25

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers
revision = '20250525_add_performance_indexes'
down_revision = '20250525_add_notifications_table'
branch_labels = None
depends_on = None


def upgrade():
    # Add index on ApplicationStatusHistory.application_id
    op.create_index(
        'ix_application_status_history_application_id',
        'application_status_history',
        ['application_id']
    )
    
    # Add index on ApplicationStatusHistory.user_id
    op.create_index(
        'ix_application_status_history_user_id',
        'application_status_history',
        ['user_id']
    )
    
    # Add composite index on applications for filtering
    op.create_index(
        'ix_applications_user_status_created',
        'applications',
        ['user_id', 'status', sa.desc('created_at')]
    )
    
    # Add index on resumes for user filtering
    op.create_index(
        'ix_resumes_user_created',
        'resumes',
        ['user_id', sa.desc('created_at')]
    )
    
    # Add index on JDs for user filtering
    op.create_index(
        'ix_jds_user_created',
        'jds',
        ['user_id', sa.desc('created_at')]
    )
    
    # Add index on notifications for user queries
    op.create_index(
        'ix_notifications_user_read_created',
        'notifications',
        ['user_id', 'read', sa.desc('created_at')]
    )


def downgrade():
    # Remove indexes in reverse order
    op.drop_index('ix_notifications_user_read_created', table_name='notifications')
    op.drop_index('ix_jds_user_created', table_name='jds')
    op.drop_index('ix_resumes_user_created', table_name='resumes')
    op.drop_index('ix_applications_user_status_created', table_name='applications')
    op.drop_index('ix_application_status_history_user_id', table_name='application_status_history')
    op.drop_index('ix_application_status_history_application_id', table_name='application_status_history')
