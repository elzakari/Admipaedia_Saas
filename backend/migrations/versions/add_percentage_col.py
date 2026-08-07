"""Add percentage column to enhanced_grades table

Revision ID: add_percentage_col
Revises: add_total_marks
Create Date: 2024-01-17 10:00:00.000000

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = 'add_percentage_col'
down_revision = 'add_total_marks'
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
    if _column_exists(conn, 'enhanced_grades', 'percentage'):
        try:
            op.alter_column('enhanced_grades', 'percentage', nullable=False)
        except Exception:
            pass
        return
    try:
        with op.batch_alter_table('enhanced_grades', schema=None) as batch_op:
            batch_op.add_column(sa.Column('percentage', sa.Float(), nullable=True))
    except Exception:
        return
    try:
        op.execute("""
            UPDATE enhanced_grades 
            SET percentage = CASE 
                WHEN total_marks > 0 THEN (raw_score / total_marks) * 100
                ELSE 0
            END
            WHERE percentage IS NULL
        """)
    except Exception:
        pass
    try:
        with op.batch_alter_table('enhanced_grades', schema=None) as batch_op:
            batch_op.alter_column('percentage', nullable=False)
    except Exception:
        pass

def downgrade():
    # Remove the percentage column
    with op.batch_alter_table('enhanced_grades', schema=None) as batch_op:
        batch_op.drop_column('percentage')