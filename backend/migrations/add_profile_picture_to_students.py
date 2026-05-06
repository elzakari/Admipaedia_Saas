"""Add profile_picture field to students table

Revision ID: add_profile_picture
Revises: 
Create Date: 2024-01-01 00:00:00.000000

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers
revision = 'add_profile_picture'
down_revision = None
branch_labels = None
depends_on = None

def upgrade():
    """Add profile_picture column to students table."""
    op.add_column('students', sa.Column('profile_picture', sa.String(255), nullable=True))

def downgrade():
    """Remove profile_picture column from students table."""
    op.drop_column('students', 'profile_picture')