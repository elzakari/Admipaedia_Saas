"""extend_alembic_version_num

Revision ID: 20260513_alembic_vnum_001
Revises: 20260506_edu_tpl_001
Create Date: 2026-05-13 00:00:00.000000

"""

from alembic import op
import sqlalchemy as sa


revision = '20260513_alembic_vnum_001'
down_revision = '20260506_edu_tpl_001'
branch_labels = None
depends_on = None


def upgrade():
    conn = op.get_bind()
    insp = sa.inspect(conn)
    if not insp.has_table('alembic_version'):
        return
    cols = {c['name']: c for c in insp.get_columns('alembic_version')}
    col = cols.get('version_num')
    if not col:
        return
    op.alter_column(
        'alembic_version',
        'version_num',
        type_=sa.String(length=64),
        existing_type=sa.String(length=32),
        existing_nullable=False,
    )


def downgrade():
    conn = op.get_bind()
    insp = sa.inspect(conn)
    if not insp.has_table('alembic_version'):
        return
    op.alter_column(
        'alembic_version',
        'version_num',
        type_=sa.String(length=32),
        existing_type=sa.String(length=64),
        existing_nullable=False,
    )

