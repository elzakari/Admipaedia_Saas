"""Add FK constraint grade_levels.track_id -> grade_tracks and verify column exists

Revision ID: 20260526_grade_levels_track_fk_patch
Revises: 20260526_polymorphic_education_engine
Create Date: 2026-05-26

This patch ensures:
  1. grade_tracks table exists (idempotent CREATE TABLE IF NOT EXISTS).
  2. grade_levels.track_id column exists (ADD COLUMN IF NOT EXISTS — safe on
     servers where the polymorphic_education_engine migration already ran).
  3. The FK constraint grade_levels.track_id → grade_tracks.id is present
     (only added if it doesn't already exist, checked via pg_constraint).

This migration is a no-op on SQLite (test environment).
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy import text

revision = '20260526_grade_levels_track_fk_patch'
down_revision = '20260526_polymorphic_education_engine'
branch_labels = None
depends_on = None


def upgrade():
    bind = op.get_bind()
    if bind.dialect.name == 'sqlite':
        # SQLite is the test environment — skip all DDL that requires PostgreSQL
        return

    # ------------------------------------------------------------------ #
    # 1. Ensure grade_tracks table exists (parent of the FK)             #
    # ------------------------------------------------------------------ #
    bind.execute(text("""
        CREATE TABLE IF NOT EXISTS grade_tracks (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            tenant_id UUID NOT NULL,
            name VARCHAR(255) NOT NULL,
            numeric_level_rank INT NOT NULL DEFAULT 1,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            CONSTRAINT fk_track_tenant FOREIGN KEY (tenant_id)
                REFERENCES tenants(id) ON DELETE CASCADE
        );
    """))

    # ------------------------------------------------------------------ #
    # 2. Ensure track_id column exists on grade_levels                   #
    # ------------------------------------------------------------------ #
    bind.execute(text("""
        ALTER TABLE grade_levels
            ADD COLUMN IF NOT EXISTS track_id UUID;
    """))

    # ------------------------------------------------------------------ #
    # 3. Add FK constraint only if it is not already present             #
    # ------------------------------------------------------------------ #
    result = bind.execute(text("""
        SELECT COUNT(*) FROM pg_constraint
        WHERE conname = 'fk_grade_levels_track_id'
          AND conrelid = 'grade_levels'::regclass;
    """)).fetchone()

    if result[0] == 0:
        bind.execute(text("""
            ALTER TABLE grade_levels
                ADD CONSTRAINT fk_grade_levels_track_id
                FOREIGN KEY (track_id)
                REFERENCES grade_tracks(id)
                ON DELETE CASCADE;
        """))
        print("  [OK] FK constraint fk_grade_levels_track_id added.")
    else:
        print("  [OK] FK constraint fk_grade_levels_track_id already present — skipped.")

    # ------------------------------------------------------------------ #
    # 4. Smoke-test: verify the column is queryable                      #
    # ------------------------------------------------------------------ #
    row = bind.execute(text(
        "SELECT COUNT(*) FROM grade_levels WHERE track_id IS NOT NULL"
    )).fetchone()
    print(f"  [OK] Smoke test passed — grade_levels.track_id is queryable "
          f"({row[0]} rows with non-null track_id).")


def downgrade():
    bind = op.get_bind()
    if bind.dialect.name == 'sqlite':
        return

    # Drop FK only; leave the column in place to avoid data loss
    bind.execute(text("""
        ALTER TABLE grade_levels
            DROP CONSTRAINT IF EXISTS fk_grade_levels_track_id;
    """))
