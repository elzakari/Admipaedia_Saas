"""merge all migration heads

Revision ID: 0b4b9763b6ff
Revises: 382906b374e4, 65b98d8703fb, abc123def456, ghana_educational_service
Create Date: 2025-08-28 13:19:17.373618

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '0b4b9763b6ff'
down_revision = ('382906b374e4', '65b98d8703fb', 'abc123def456', 'ghana_educational_service')
branch_labels = None
depends_on = None


def upgrade():
    pass


def downgrade():
    pass
