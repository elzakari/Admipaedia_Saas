"""Add missing columns to calendar_events table

Revision ID: cal_events_cols
Revises: dc58558fcaff
Create Date: 2025-01-21 12:00:00.000000

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = 'cal_events_cols'
down_revision = 'dc58558fcaff'  # Updated to point to the current head
branch_labels = None
depends_on = None

def upgrade():
    # Add missing columns to calendar_events table
    op.add_column('calendar_events', sa.Column('created_by', sa.Integer, sa.ForeignKey('users.id'), nullable=True))
    op.add_column('calendar_events', sa.Column('location', sa.String(100), nullable=True))
    op.add_column('calendar_events', sa.Column('start_time', sa.String(10), nullable=True))
    op.add_column('calendar_events', sa.Column('end_time', sa.String(10), nullable=True))
    
    # Create the event_role_association table for many-to-many relationship
    op.create_table('event_role_association',
        sa.Column('event_id', sa.String(36), sa.ForeignKey('calendar_events.id'), primary_key=True),
        sa.Column('role_id', sa.Integer, sa.ForeignKey('roles.id'), primary_key=True)
    )

def downgrade():
    # Remove the association table
    op.drop_table('event_role_association')
    
    # Remove the added columns
    op.drop_column('calendar_events', 'end_time')
    op.drop_column('calendar_events', 'start_time')
    op.drop_column('calendar_events', 'location')
    op.drop_column('calendar_events', 'created_by')