"""merge heads before calendar events

Revision ID: f29144f4bd28
Revises: dc58558fcaff, cal_events_cols
Create Date: 2025-01-21 14:30:00.000000

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = 'f29144f4bd28'
down_revision = ('dc58558fcaff', 'cal_events_cols')
branch_labels = None
depends_on = None

def upgrade():
    pass

def downgrade():
    pass
