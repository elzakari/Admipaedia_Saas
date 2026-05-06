"""empty message

Revision ID: abd5466b4121
Revises: 57e22ec84ad2, add_missing_student_fields
Create Date: 2025-07-17 11:35:33.500254

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'abd5466b4121'
down_revision = ('57e22ec84ad2', 'add_missing_student_fields')
branch_labels = None
depends_on = None


def upgrade():
    pass


def downgrade():
    pass
