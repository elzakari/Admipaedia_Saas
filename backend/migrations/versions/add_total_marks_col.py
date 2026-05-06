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

def upgrade():
    # Add the missing total_marks column
    op.add_column('enhanced_grades', sa.Column('total_marks', sa.Float(), nullable=True))
    
    # Update existing records with a default value (assuming 100 as total marks)
    op.execute("UPDATE enhanced_grades SET total_marks = 100.0 WHERE total_marks IS NULL")
    
    # Make the column non-nullable after populating it
    op.alter_column('enhanced_grades', 'total_marks', nullable=False)

def downgrade():
    # Remove the total_marks column
    op.drop_column('enhanced_grades', 'total_marks')