"""merge_multiple_heads

Revision ID: dc58558fcaff
Revises: 226fabe1098f, add_status_to_classes
Create Date: 2025-08-06 13:53:13.281057

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'dc58558fcaff'
down_revision = ('226fabe1098f', 'add_status_to_classes')
branch_labels = None
depends_on = None


def upgrade():
    pass


def downgrade():
    pass
