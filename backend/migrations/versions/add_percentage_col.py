"""Add percentage column to enhanced_grades table

Revision ID: add_percentage_col
Revises: add_total_marks
Create Date: 2024-01-17 10:00:00.000000

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = 'add_percentage_col'
down_revision = 'add_total_marks'  # Changed from 'add_total_marks_col' to 'add_total_marks'
branch_labels = None
depends_on = None

def upgrade():
    # Add missing percentage column to enhanced_grades table
    with op.batch_alter_table('enhanced_grades', schema=None) as batch_op:
        batch_op.add_column(sa.Column('percentage', sa.Float(), nullable=True))
    
    # Calculate and populate percentage for existing records
    # percentage = (raw_score / total_marks) * 100
    op.execute("""
        UPDATE enhanced_grades 
        SET percentage = CASE 
            WHEN total_marks > 0 THEN (raw_score / total_marks) * 100
            ELSE 0
        END
        WHERE percentage IS NULL
    """)
    
    # Make the column non-nullable after populating data
    with op.batch_alter_table('enhanced_grades', schema=None) as batch_op:
        batch_op.alter_column('percentage', nullable=False)

def downgrade():
    # Remove the percentage column
    with op.batch_alter_table('enhanced_grades', schema=None) as batch_op:
        batch_op.drop_column('percentage')