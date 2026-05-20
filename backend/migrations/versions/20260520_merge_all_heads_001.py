"""merge_all_heads_20260520

Revision ID: 20260520_merge_all_heads_001
Revises: 20260513_alembic_vnum_001, 20260513_tiered_plan_pricing_001, 20260520_payments_patch_001
Create Date: 2026-05-20 00:00:00.000000

Merges the four migration branches:
  - 20260513_alembic_vnum_001
  - 20260513_tiered_plan_pricing_001
  - 20260520_payments_patch_001
"""

from alembic import op


revision = '20260520_merge_all_heads_001'
down_revision = (
    '20260513_alembic_vnum_001',
    '20260513_tiered_plan_pricing_001',
    '20260520_payments_patch_001',
)
branch_labels = None
depends_on = None


def upgrade():
    pass


def downgrade():
    pass
