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

def upgrade():
    # Add only the truly missing columns to enhanced_grades table
    with op.batch_alter_table('enhanced_grades', schema=None) as batch_op:
        # Grading results columns
        batch_op.add_column(sa.Column('grade_symbol', sa.String(length=5), nullable=True))
        batch_op.add_column(sa.Column('grade_points', sa.Float(), nullable=True))
        batch_op.add_column(sa.Column('is_passing', sa.Boolean(), nullable=True))
        
        # Assessment weight and contribution
        batch_op.add_column(sa.Column('weight', sa.Float(), nullable=True))
        batch_op.add_column(sa.Column('contributes_to_final', sa.Boolean(), nullable=True))
        
        # Continuous assessment tracking
        batch_op.add_column(sa.Column('is_class_score', sa.Boolean(), nullable=True))
        batch_op.add_column(sa.Column('is_external_exam', sa.Boolean(), nullable=True))
        
        # Additional details
        batch_op.add_column(sa.Column('teacher_comments', sa.Text(), nullable=True))
        batch_op.add_column(sa.Column('remedial_action', sa.Text(), nullable=True))
    
    # Populate default values for existing records
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
    
    # Make required columns non-nullable after populating data
    with op.batch_alter_table('enhanced_grades', schema=None) as batch_op:
        batch_op.alter_column('weight', nullable=False)
        batch_op.alter_column('contributes_to_final', nullable=False)
        batch_op.alter_column('is_class_score', nullable=False)
        batch_op.alter_column('is_external_exam', nullable=False)
        batch_op.alter_column('is_passing', nullable=False)
        batch_op.alter_column('grade_points', nullable=False)

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