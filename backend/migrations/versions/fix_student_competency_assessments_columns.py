"""Fix student_competency_assessments schema to match models

Revision ID: fix_student_comp_assessments
Revises: a63c99909932
Create Date: 2025-10-25 12:00:00.000000
"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = 'fix_student_comp_assessments'
down_revision = 'a63c99909932'
branch_labels = None
depends_on = None


def upgrade():
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    existing_cols = {c['name'] for c in inspector.get_columns('student_competency_assessments')}

    with op.batch_alter_table('student_competency_assessments', schema=None) as batch_op:
        if 'term' not in existing_cols:
            batch_op.add_column(sa.Column('term', sa.String(length=20), nullable=True))
        if 'academic_year' not in existing_cols:
            batch_op.add_column(sa.Column('academic_year', sa.String(length=20), nullable=True))
        if 'level_achieved' not in existing_cols:
            batch_op.add_column(sa.Column('level_achieved', sa.Integer(), nullable=True))
        if 'teacher_comments' not in existing_cols:
            batch_op.add_column(sa.Column('teacher_comments', sa.Text(), nullable=True))
        if 'assessed_by' not in existing_cols:
            batch_op.add_column(sa.Column('assessed_by', sa.Integer(), nullable=True))
            batch_op.create_foreign_key(
                'fk_comp_assessed_by_users',
                'users',
                ['assessed_by'],
                ['id']
            )

    # Minimal backfill defaults if newly added
    if 'term' not in existing_cols:
        op.execute("UPDATE student_competency_assessments SET term = COALESCE(term, 'unknown')")
    if 'academic_year' not in existing_cols:
        op.execute("UPDATE student_competency_assessments SET academic_year = COALESCE(academic_year, 'unknown')")
    if 'level_achieved' not in existing_cols:
        op.execute("UPDATE student_competency_assessments SET level_achieved = COALESCE(level_achieved, 0)")


def downgrade():
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    existing_cols = {c['name'] for c in inspector.get_columns('student_competency_assessments')}

    with op.batch_alter_table('student_competency_assessments', schema=None) as batch_op:
        if 'assessed_by' in existing_cols:
            batch_op.drop_constraint('fk_comp_assessed_by_users', type_='foreignkey')
            batch_op.drop_column('assessed_by')
        if 'teacher_comments' in existing_cols:
            batch_op.drop_column('teacher_comments')
        if 'level_achieved' in existing_cols:
            batch_op.drop_column('level_achieved')
        if 'academic_year' in existing_cols:
            batch_op.drop_column('academic_year')
        if 'term' in existing_cols:
            batch_op.drop_column('term')