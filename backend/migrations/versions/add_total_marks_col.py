"""Add missing total_marks column to enhanced_grades table

Revision ID: add_total_marks
Revises: 06ee3e4c3bee
Create Date: 2025-01-28 14:45:00.000000

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = 'add_total_marks'
down_revision = '06ee3e4c3bee'
branch_labels = None
depends_on = None


def _table_exists(conn, table_name):
    inspector = sa.inspect(conn)
    return table_name in inspector.get_table_names()


def _column_exists(conn, table_name, column_name):
    if not _table_exists(conn, table_name):
        return False
    inspector = sa.inspect(conn)
    return any(column["name"] == column_name for column in inspector.get_columns(table_name))


def upgrade():
    conn = op.get_bind()
    if not _table_exists(conn, 'enhanced_grades'):
        return
    if _column_exists(conn, 'enhanced_grades', 'total_marks'):
        try:
            op.alter_column('enhanced_grades', 'total_marks', nullable=False)
        except Exception:
            pass
        return
    try:
        op.add_column('enhanced_grades', sa.Column('total_marks', sa.Float(), nullable=True))
    except Exception:
        return
    try:
        op.execute("UPDATE enhanced_grades SET total_marks = 100.0 WHERE total_marks IS NULL")
    except Exception:
        pass
    try:
        op.alter_column('enhanced_grades', 'total_marks', nullable=False)
    except Exception:
        pass

def downgrade():
    # Remove the total_marks column
    op.drop_column('enhanced_grades', 'total_marks')