"""Add only truly missing columns to enhanced_grades table

Revision ID: add_remaining_cols
Revises: add_percentage_col
Create Date: 2025-01-28 15:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from datetime import datetime

# revision identifiers, used by Alembic.
revision = 'add_remaining_cols'
down_revision = 'add_percentage_col'
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
    all_missing = [
        ('grade_symbol', sa.String(length=5), True),
        ('grade_points', sa.Float(), True),
        ('is_passing', sa.Boolean(), True),
        ('weight', sa.Float(), False),
        ('contributes_to_final', sa.Boolean(), False),
        ('is_class_score', sa.Boolean(), False),
        ('is_external_exam', sa.Boolean(), False),
        ('teacher_comments', sa.Text(), True),
        ('remedial_action', sa.Text(), True),
    ]
    try:
        with op.batch_alter_table('enhanced_grades', schema=None) as batch_op:
            for col_name, col_type, _nullable in all_missing:
                if not _column_exists(conn, 'enhanced_grades', col_name):
                    batch_op.add_column(sa.Column(col_name, col_type, nullable=True))
    except Exception:
        return
    try:
        op.execute("""
            UPDATE enhanced_grades 
            SET 
                grade_symbol = 'C6',
                grade_points = 3.0,
                is_passing = true,
                weight = 1.0,
                contributes_to_final = true,
                is_class_score = true,
                is_external_exam = false
            WHERE 
                grade_symbol IS NULL OR 
                grade_points IS NULL OR 
                is_passing IS NULL OR 
                weight IS NULL OR 
                contributes_to_final IS NULL OR 
                is_class_score IS NULL OR 
                is_external_exam IS NULL
        """)
    except Exception:
        pass
    non_null_required = [
        'weight', 'contributes_to_final', 'is_class_score',
        'is_external_exam', 'is_passing', 'grade_points'
    ]
    try:
        with op.batch_alter_table('enhanced_grades', schema=None) as batch_op:
            for col in non_null_required:
                try:
                    batch_op.alter_column(col, nullable=False)
                except Exception:
                    pass
    except Exception:
        pass

def downgrade():
    # Remove all added columns
    with op.batch_alter_table('enhanced_grades', schema=None) as batch_op:
        batch_op.drop_column('remedial_action')
        batch_op.drop_column('teacher_comments')
        batch_op.drop_column('is_external_exam')
        batch_op.drop_column('is_class_score')
        batch_op.drop_column('contributes_to_final')
        batch_op.drop_column('weight')
        batch_op.drop_column('is_passing')
        batch_op.drop_column('grade_points')
        batch_op.drop_column('grade_symbol')