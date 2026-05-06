from alembic import op
import sqlalchemy as sa

# revision identifiers
revision = 'add_missing_student_columns'
down_revision = 'ca79dc4ddda1'  # Updated to point to the merge migration
branch_labels = None
depends_on = None

def upgrade():
    # Add missing columns to students table
    op.add_column('students', sa.Column('standardized_test_scores', sa.Text(), nullable=True))
    op.add_column('students', sa.Column('secondary_contact_name', sa.String(100), nullable=True))
    op.add_column('students', sa.Column('secondary_contact_phone', sa.String(20), nullable=True))
    op.add_column('students', sa.Column('secondary_contact_relationship', sa.String(50), nullable=True))
    op.add_column('students', sa.Column('individualized_education_plan', sa.Boolean(), server_default='false', nullable=False))
    op.add_column('students', sa.Column('iep_details', sa.Text(), nullable=True))
    op.add_column('students', sa.Column('student_email', sa.String(100), nullable=True))
    op.add_column('students', sa.Column('library_card_number', sa.String(50), nullable=True))

def downgrade():
    # Remove columns if needed to rollback
    columns_to_remove = [
        'standardized_test_scores', 'secondary_contact_name', 'secondary_contact_phone',
        'secondary_contact_relationship', 'individualized_education_plan', 'iep_details',
        'student_email', 'library_card_number'
    ]
    
    for column in columns_to_remove:
        op.drop_column('students', column)