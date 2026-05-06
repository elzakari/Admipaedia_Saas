"""merge_all_migration_heads_final

Revision ID: 2505e0eb938c
Revises: 2847b2a927c7, 398b401a2e97, 5f46bd5ff7d0, 66797b21f0a7, 6a88585c4fbc, add_assess_name_col, add_class_id_final, add_rbac_system, add_remaining_cols, b00a1e3c02e9, enhanced_auth_001, enhanced_auth_002, fix_subject_deletion_cascade
Create Date: 2025-10-08 04:43:43.220465

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '2505e0eb938c'
down_revision = ('2847b2a927c7', '398b401a2e97', '5f46bd5ff7d0', '66797b21f0a7', '6a88585c4fbc', 'add_assess_name_col', 'add_class_id_final', 'add_rbac_system', 'add_remaining_cols', 'b00a1e3c02e9', 'enhanced_auth_001', 'enhanced_auth_002', 'fix_subject_deletion_cascade')
branch_labels = None
depends_on = None


def upgrade():
    pass


def downgrade():
    pass
