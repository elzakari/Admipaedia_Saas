from alembic import op
import sqlalchemy as sa
from datetime import datetime

# revision identifiers
revision = 'enhance_grade_model'
down_revision = 'add_enhanced_student_fields'  # This creates a chain
branch_labels = None
depends_on = None

def upgrade():
    # Add new columns to grades table
    op.add_column('grades', sa.Column('subject_id', sa.Integer(), nullable=True))
    op.add_column('grades', sa.Column('class_id', sa.Integer(), nullable=True))
    op.add_column('grades', sa.Column('term', sa.String(20), nullable=True))
    op.add_column('grades', sa.Column('academic_year', sa.String(20), nullable=True))
    op.add_column('grades', sa.Column('assessment_type', sa.String(20), nullable=True))
    op.add_column('grades', sa.Column('is_final', sa.Boolean(), nullable=True, default=False))
    op.add_column('grades', sa.Column('weight', sa.Float(), nullable=True, default=1.0))
    
    # Add foreign key constraints
    op.create_foreign_key('fk_grades_subject_id', 'grades', 'subjects', ['subject_id'], ['id'])
    op.create_foreign_key('fk_grades_class_id', 'grades', 'classes', ['class_id'], ['id'])

def downgrade():
    # Remove foreign key constraints
    op.drop_constraint('fk_grades_subject_id', 'grades', type_='foreignkey')
    op.drop_constraint('fk_grades_class_id', 'grades', type_='foreignkey')
    
    # Remove columns
    op.drop_column('grades', 'subject_id')
    op.drop_column('grades', 'class_id')
    op.drop_column('grades', 'term')
    op.drop_column('grades', 'academic_year')
    op.drop_column('grades', 'assessment_type')
    op.drop_column('grades', 'is_final')
    op.drop_column('grades', 'weight')