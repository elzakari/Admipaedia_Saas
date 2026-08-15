"""merge 20260807_payments_tables and 20260815_ensure_acad_struct_enum

Revision ID: 3aeaf5669d9e
Revises: 20260807_payments_tables, 20260815_ensure_acad_struct_enum
Create Date: 2026-08-15 15:34:48.609581

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '3aeaf5669d9e'
down_revision = ('20260807_payments_tables', '20260815_ensure_acad_struct_enum')
branch_labels = None
depends_on = None


def upgrade():
    pass


def downgrade():
    pass
