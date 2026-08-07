"""Merge daily lessons v2 heads into the linear migration chain.

Revision ID: 20260807_merge_daily_lessons_v2_heads
Revises: (20260728_sync_rbac_detail_schema, 20260806_p2_homework_idx)
Create Date: 2026-08-07

Additive-only merge: no schema changes.  Resolves the multiple-heads
CommandError produced by `alembic upgrade head` because
20260806_add_daily_lessons_v2_tables.py declared down_revision=None
(a disconnected root) so its descendant 20260806_p2_homework_idx and
the normal linear head 20260728_sync_rbac_detail_schema were two
unrelated heads.
"""
from alembic import op
import sqlalchemy as sa


revision = "20260807_merge_daily_lessons_v2_heads"
down_revision = (
    "20260728_sync_rbac_detail_schema",
    "20260806_p2_homework_idx",
)
branch_labels = None
depends_on = None


def upgrade():
    pass


def downgrade():
    pass
