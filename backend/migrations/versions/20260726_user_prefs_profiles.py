"""Create user_preferences and user_profiles tables

Revision ID: 20260726_user_prefs_profiles
Revises: 20260726_add_missing_cols
Create Date: 2026-07-26

Creates two tables that exist as SQLAlchemy models but were never added
via a migration, causing UndefinedTable errors in CI:

  - user_preferences  (user settings: theme, language, notifications, etc.)
  - user_profiles     (user display info: display_name, phone, avatar, etc.)

Both tables have idempotent guards so they are safe to run against
databases that already have these tables (e.g. production).
"""

from alembic import op
import sqlalchemy as sa


# revision identifiers — must be ≤ 32 chars
revision = '20260726_user_prefs_profiles'
down_revision = '20260726_add_missing_cols'
branch_labels = None
depends_on = None


# ── helpers ───────────────────────────────────────────────────────────────────

def _table_exists(conn, table: str) -> bool:
    result = conn.execute(sa.text(
        "SELECT 1 FROM information_schema.tables "
        "WHERE table_schema = 'public' AND table_name = :t"
    ), {"t": table}).fetchone()
    return result is not None


# ── upgrade ───────────────────────────────────────────────────────────────────

def upgrade():
    conn = op.get_bind()

    # -- user_preferences -------------------------------------------------------
    if not _table_exists(conn, 'user_preferences'):
        op.create_table(
            'user_preferences',
            sa.Column('id', sa.Integer(), primary_key=True),
            sa.Column('user_id', sa.Integer(),
                      sa.ForeignKey('users.id', ondelete='CASCADE'),
                      unique=True, nullable=False, index=True),
            sa.Column('theme_mode', sa.String(20), nullable=False, server_default='casaos'),
            sa.Column('language', sa.String(12), nullable=False, server_default='en'),
            sa.Column('date_time_format', sa.String(12), nullable=False, server_default='auto'),
            sa.Column('default_profile_tab', sa.String(20), nullable=False, server_default='profile'),
            sa.Column('notify_product_updates', sa.Boolean(), nullable=False, server_default=sa.text('true')),
            sa.Column('notify_security_alerts', sa.Boolean(), nullable=False, server_default=sa.text('true')),
            sa.Column('created_at', sa.DateTime(), nullable=True),
            sa.Column('updated_at', sa.DateTime(), nullable=True),
        )

    # -- user_profiles ----------------------------------------------------------
    if not _table_exists(conn, 'user_profiles'):
        op.create_table(
            'user_profiles',
            sa.Column('id', sa.Integer(), primary_key=True),
            sa.Column('user_id', sa.Integer(),
                      sa.ForeignKey('users.id', ondelete='CASCADE'),
                      unique=True, nullable=False, index=True),
            sa.Column('display_name', sa.String(120), nullable=False),
            sa.Column('legal_name', sa.String(200), nullable=True),
            sa.Column('phone', sa.String(32), nullable=True),
            sa.Column('country', sa.String(80), nullable=True),
            sa.Column('timezone', sa.String(80), nullable=True),
            sa.Column('avatar_url', sa.String(512), nullable=True),
            sa.Column('created_at', sa.DateTime(), nullable=True),
            sa.Column('updated_at', sa.DateTime(), nullable=True),
        )


# ── downgrade ─────────────────────────────────────────────────────────────────

def downgrade():
    conn = op.get_bind()

    if _table_exists(conn, 'user_profiles'):
        op.drop_table('user_profiles')

    if _table_exists(conn, 'user_preferences'):
        op.drop_table('user_preferences')
