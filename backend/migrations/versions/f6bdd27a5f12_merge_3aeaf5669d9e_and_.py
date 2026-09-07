"""merge 3aeaf5669d9e and c79e9c8casttccuuid0001 heads

Revision ID: f6bdd27a5f12
Revises: 3aeaf5669d9e, c79e9c8casttccuuid0001
Create Date: 2026-09-07 20:09:19.828999

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'f6bdd27a5f12'
down_revision = ('3aeaf5669d9e', 'c79e9c8casttccuuid0001')
branch_labels = None
depends_on = None


def upgrade():
    pass


def downgrade():
    pass
