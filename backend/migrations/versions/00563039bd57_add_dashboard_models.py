"""Add dashboard models

Revision ID: 00563039bd57
Revises: 92b0a6da9753
Create Date: 2025-06-06 02:27:50.421359

"""
from alembic import op
import sqlalchemy as sa
import uuid


# revision identifiers, used by Alembic.
revision = '00563039bd57'
down_revision = '92b0a6da9753'
branch_labels = ('new_branch',)
depends_on = None


def upgrade():
    # Create dashboard_statistics table
    op.create_table('dashboard_statistics',
        sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('title', sa.String(100), nullable=False),
        sa.Column('value', sa.String(100), nullable=False),
        sa.Column('change_value', sa.Float, nullable=True),
        sa.Column('change_is_positive', sa.Boolean, default=True),
        sa.Column('color', sa.String(20), nullable=False),
        sa.Column('role', sa.String(20), nullable=True),
        sa.Column('created_at', sa.DateTime, default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime, default=sa.func.now(), onupdate=sa.func.now())
    )
    
    # Create calendar_events table
    op.create_table('calendar_events',
        sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('title', sa.String(100), nullable=False),
        sa.Column('date', sa.DateTime, nullable=False),
        sa.Column('type', sa.String(20), nullable=False),
        sa.Column('description', sa.Text, nullable=True),
        sa.Column('created_at', sa.DateTime, default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime, default=sa.func.now(), onupdate=sa.func.now())
    )
    
    # Create notifications table
    op.create_table('notifications',
        sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('title', sa.String(100), nullable=False),
        sa.Column('message', sa.Text, nullable=False),
        sa.Column('time', sa.DateTime, default=sa.func.now()),
        sa.Column('read', sa.Boolean, default=False),
        sa.Column('type', sa.String(20), nullable=False),
        sa.Column('user_id', sa.Integer, sa.ForeignKey('users.id'), nullable=True),
        sa.Column('created_at', sa.DateTime, default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime, default=sa.func.now(), onupdate=sa.func.now())
    )


def downgrade():
    op.drop_table('notifications')
    op.drop_table('calendar_events')
    op.drop_table('dashboard_statistics')
