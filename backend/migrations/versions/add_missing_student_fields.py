from alembic import op
import sqlalchemy as sa

# revision identifiers
revision = 'add_missing_student_fields'
down_revision = 'add_enhanced_student_fields'  # This should point to your most recent migration
branch_labels = None
depends_on = None

def upgrade():
    # Add only the missing column to students table
    op.add_column('students', sa.Column('medical_conditions', sa.Text(), nullable=True))
    # Removed other columns since they already exist

def downgrade():
    # Remove column if needed to rollback
    op.drop_column('students', 'medical_conditions')