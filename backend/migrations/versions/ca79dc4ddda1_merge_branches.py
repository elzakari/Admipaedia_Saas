"""merge branches

Revision ID: ca79dc4ddda1
Revises: abd5466b4121, add_awards_achievements_column
Create Date: 2025-07-18 04:30:11.680348

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'ca79dc4ddda1'
down_revision = ('abd5466b4121', 'add_awards_achievements_column')
branch_labels = None
depends_on = None


def upgrade():
    pass


def downgrade():
    pass
