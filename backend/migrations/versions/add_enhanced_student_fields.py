from alembic import op
import sqlalchemy as sa
from datetime import datetime

# revision identifiers
revision = 'add_enhanced_student_fields'
down_revision = '16ba5c78fa62'  # Replace with the actual ID of your most recent migration
branch_labels = None
depends_on = None

def upgrade():
    # Add new columns to students table
    op.add_column('students', sa.Column('preferred_name', sa.String(100), nullable=True))
    op.add_column('students', sa.Column('birth_certificate_number', sa.String(50), nullable=True))
    op.add_column('students', sa.Column('passport_number', sa.String(50), nullable=True))
    op.add_column('students', sa.Column('passport_expiry', sa.Date(), nullable=True))
    op.add_column('students', sa.Column('primary_language', sa.String(50), nullable=True))
    op.add_column('students', sa.Column('secondary_language', sa.String(50), nullable=True))
    
    # Health information
    op.add_column('students', sa.Column('height', sa.Float(), nullable=True))
    op.add_column('students', sa.Column('weight', sa.Float(), nullable=True))
    op.add_column('students', sa.Column('blood_pressure', sa.String(20), nullable=True))
    op.add_column('students', sa.Column('vision', sa.String(20), nullable=True))
    op.add_column('students', sa.Column('hearing', sa.String(20), nullable=True))
    op.add_column('students', sa.Column('immunization_status', sa.Text(), nullable=True))
    
    # Academic tracking
    op.add_column('students', sa.Column('learning_style', sa.String(50), nullable=True))
    op.add_column('students', sa.Column('special_needs', sa.Text(), nullable=True))
    op.add_column('students', sa.Column('academic_strengths', sa.Text(), nullable=True))
    op.add_column('students', sa.Column('academic_weaknesses', sa.Text(), nullable=True))
    op.add_column('students', sa.Column('career_aspirations', sa.Text(), nullable=True))
    
    # Guardian information
    op.add_column('students', sa.Column('guardian_name', sa.String(100), nullable=True))
    op.add_column('students', sa.Column('guardian_relationship', sa.String(50), nullable=True))
    op.add_column('students', sa.Column('guardian_contact', sa.String(20), nullable=True))
    op.add_column('students', sa.Column('guardian_email', sa.String(100), nullable=True))
    op.add_column('students', sa.Column('guardian_address', sa.String(255), nullable=True))
    
    # Financial information
    op.add_column('students', sa.Column('fee_category', sa.String(50), nullable=True))
    op.add_column('students', sa.Column('scholarship_details', sa.Text(), nullable=True))
    op.add_column('students', sa.Column('payment_method', sa.String(50), nullable=True))

def downgrade():
    # Remove columns if needed to rollback
    columns_to_remove = [
        'preferred_name', 'birth_certificate_number', 'passport_number', 'passport_expiry',
        'primary_language', 'secondary_language', 'height', 'weight', 'blood_pressure',
        'vision', 'hearing', 'immunization_status', 'learning_style', 'special_needs',
        'academic_strengths', 'academic_weaknesses', 'career_aspirations', 'guardian_name',
        'guardian_relationship', 'guardian_contact', 'guardian_email', 'guardian_address',
        'fee_category', 'scholarship_details', 'payment_method'
    ]
    
    for column in columns_to_remove:
        op.drop_column('students', column)