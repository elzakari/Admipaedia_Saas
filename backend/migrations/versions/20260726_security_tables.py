"""Create missing security tables and fix password_hash nullability

Revision ID: 20260726_security_tables
Revises: 20260726_user_prefs_profiles
Create Date: 2026-07-26

1. Creates security tables that existed as SQLAlchemy models but had no migration:
     - login_attempts
     - security_events
     - password_history
     - api_keys
     - school_registration_tokens
     - tenant_credential_counters

2. Relaxes the NOT NULL constraint on users.password_hash to match the model
   definition (nullable=True), which is needed for invitation-based user accounts
   that don't yet have a password set.

All operations are idempotent via table_exists() / column_exists() guards.
"""

from alembic import op
import sqlalchemy as sa


# revision identifiers — must be ≤ 32 chars
revision = '20260726_security_tables'
down_revision = '20260726_user_prefs_profiles'
branch_labels = None
depends_on = None


# ── helpers ───────────────────────────────────────────────────────────────────

def _table_exists(conn, table: str) -> bool:
    result = conn.execute(sa.text(
        "SELECT 1 FROM information_schema.tables "
        "WHERE table_schema = 'public' AND table_name = :t"
    ), {"t": table}).fetchone()
    return result is not None


def _column_nullable(conn, table: str, column: str) -> bool:
    """Returns True if the column is already nullable (is_nullable = 'YES')."""
    result = conn.execute(sa.text(
        "SELECT is_nullable FROM information_schema.columns "
        "WHERE table_schema = 'public' AND table_name = :t AND column_name = :c"
    ), {"t": table, "c": column}).fetchone()
    if result is None:
        return True  # column doesn't exist yet — treat as nullable (no-op)
    return result[0] == 'YES'


# ── upgrade ───────────────────────────────────────────────────────────────────

def upgrade():
    conn = op.get_bind()

    # -- 1. Relax users.password_hash NOT NULL → nullable --------------------
    if not _column_nullable(conn, 'users', 'password_hash'):
        op.alter_column('users', 'password_hash', existing_type=sa.String(128), nullable=True)

    # -- 2. login_attempts ---------------------------------------------------
    if not _table_exists(conn, 'login_attempts'):
        op.create_table(
            'login_attempts',
            sa.Column('id', sa.Integer(), primary_key=True),
            sa.Column('identifier', sa.String(255), nullable=False, index=True),
            sa.Column('ip_address', sa.String(45), nullable=True),
            sa.Column('user_agent', sa.Text(), nullable=True),
            sa.Column('success', sa.Boolean(), nullable=False, server_default=sa.text('false')),
            sa.Column('attempted_at', sa.DateTime(), nullable=False, index=True),
            sa.Column('country', sa.String(2), nullable=True),
            sa.Column('city', sa.String(100), nullable=True),
            sa.Column('is_suspicious', sa.Boolean(), server_default=sa.text('false')),
        )

    # -- 3. security_events --------------------------------------------------
    if not _table_exists(conn, 'security_events'):
        op.create_table(
            'security_events',
            sa.Column('id', sa.Integer(), primary_key=True),
            sa.Column('event_type', sa.String(50), nullable=False, index=True),
            sa.Column('user_id', sa.Integer(), sa.ForeignKey('users.id'), nullable=True),
            sa.Column('ip_address', sa.String(45), nullable=True),
            sa.Column('user_agent', sa.Text(), nullable=True),
            sa.Column('endpoint', sa.String(255), nullable=True),
            sa.Column('method', sa.String(10), nullable=True),
            sa.Column('details', sa.JSON(), nullable=True),
            sa.Column('severity', sa.String(20), nullable=False, server_default='info'),
            sa.Column('created_at', sa.DateTime(), nullable=False),
        )

    # -- 4. password_history -------------------------------------------------
    if not _table_exists(conn, 'password_history'):
        op.create_table(
            'password_history',
            sa.Column('id', sa.Integer(), primary_key=True),
            sa.Column('user_id', sa.Integer(), sa.ForeignKey('users.id'), nullable=False),
            sa.Column('password_hash', sa.String(255), nullable=False),
            sa.Column('created_at', sa.DateTime(), nullable=False),
        )

    # -- 5. api_keys ---------------------------------------------------------
    if not _table_exists(conn, 'api_keys'):
        op.create_table(
            'api_keys',
            sa.Column('id', sa.Integer(), primary_key=True),
            sa.Column('name', sa.String(100), nullable=False),
            sa.Column('key_hash', sa.String(255), nullable=False, unique=True),
            sa.Column('user_id', sa.Integer(), sa.ForeignKey('users.id'), nullable=False),
            sa.Column('permissions', sa.JSON(), nullable=True),
            sa.Column('ip_whitelist', sa.JSON(), nullable=True),
            sa.Column('last_used', sa.DateTime(), nullable=True),
            sa.Column('usage_count', sa.Integer(), server_default='0'),
            sa.Column('is_active', sa.Boolean(), server_default=sa.text('true')),
            sa.Column('expires_at', sa.DateTime(), nullable=True),
            sa.Column('created_at', sa.DateTime(), nullable=False),
            sa.Column('updated_at', sa.DateTime(), nullable=False),
        )

    # -- 6. school_registration_tokens ---------------------------------------
    if not _table_exists(conn, 'school_registration_tokens'):
        op.create_table(
            'school_registration_tokens',
            sa.Column('id', sa.Integer(), primary_key=True),
            sa.Column('created_by_user_id', sa.Integer(),
                      sa.ForeignKey('users.id'), nullable=False, index=True),
            sa.Column('token_hash', sa.String(64), nullable=False, unique=True, index=True),
            sa.Column('expires_at', sa.DateTime(), nullable=False, index=True),
            sa.Column('is_used', sa.Boolean(), nullable=False, server_default=sa.text('false')),
            sa.Column('used_at', sa.DateTime(), nullable=True),
            sa.Column('school_name', sa.String(255), nullable=False),
            sa.Column('school_slug', sa.String(63), nullable=False),
            sa.Column('country_code', sa.String(2), nullable=False),
            sa.Column('currency', sa.String(3), nullable=False, server_default='USD'),
            sa.Column('admin_email', sa.String(255), nullable=False),
            sa.Column('created_at', sa.DateTime(), nullable=False),
        )

    # -- 7. tenant_credential_counters ---------------------------------------
    if not _table_exists(conn, 'tenant_credential_counters'):
        op.create_table(
            'tenant_credential_counters',
            sa.Column('tenant_id', sa.String(36), primary_key=True),
            sa.Column('year', sa.Integer(), primary_key=True),
            sa.Column('last_value', sa.Integer(), nullable=False, server_default='0'),
        )


# ── downgrade ─────────────────────────────────────────────────────────────────

def downgrade():
    conn = op.get_bind()

    for t in ['tenant_credential_counters', 'school_registration_tokens',
              'api_keys', 'password_history', 'security_events', 'login_attempts']:
        if _table_exists(conn, t):
            op.drop_table(t)

    # Re-apply NOT NULL (downgrade only; may fail if nulls exist)
    op.alter_column('users', 'password_hash', existing_type=sa.String(128), nullable=False)
