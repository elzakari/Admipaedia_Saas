"""Enhanced Authentication System

Revision ID: enhanced_auth_002
Revises: database_schema_optimization
Create Date: 2024-12-19 10:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers
revision = 'enhanced_auth_002'
down_revision = 'database_schema_optimization'
branch_labels = None
depends_on = None

def _table_exists(connection, table_name):
    inspector = sa.inspect(connection)
    return table_name in inspector.get_table_names()


def _column_exists(connection, table_name, column_name):
    if not _table_exists(connection, table_name):
        return False
    inspector = sa.inspect(connection)
    return any(column["name"] == column_name for column in inspector.get_columns(table_name))


def _index_exists(connection, table_name, index_name):
    if not _table_exists(connection, table_name):
        return False
    inspector = sa.inspect(connection)
    return any(index["name"] == index_name for index in inspector.get_indexes(table_name))


def _safe_add_column(connection, table_name, column):
    if _table_exists(connection, table_name) and not _column_exists(connection, table_name, column.name):
        op.add_column(table_name, column)


def _safe_create_index(connection, index_name, table_name, columns, **kwargs):
    if not _table_exists(connection, table_name):
        return
    if not all(_column_exists(connection, table_name, column) for column in columns):
        return
    if _index_exists(connection, table_name, index_name):
        return
    op.create_index(index_name, table_name, columns, **kwargs)


def _safe_drop_index(connection, index_name, table_name):
    if _index_exists(connection, table_name, index_name):
        op.drop_index(index_name, table_name)


def upgrade():
    """Add enhanced authentication features"""
    connection = op.get_bind()

    # Add enhanced security fields to users table
    _safe_add_column(connection, 'users', sa.Column('email_verified', sa.Boolean(), default=False))
    _safe_add_column(connection, 'users', sa.Column('email_verification_token', sa.String(255), nullable=True))
    _safe_add_column(connection, 'users', sa.Column('email_verification_expires', sa.DateTime(), nullable=True))
    
    # Multi-Factor Authentication fields
    _safe_add_column(connection, 'users', sa.Column('mfa_enabled', sa.Boolean(), default=False))
    _safe_add_column(connection, 'users', sa.Column('mfa_secret', sa.String(32), nullable=True))
    _safe_add_column(connection, 'users', sa.Column('mfa_backup_codes', sa.JSON(), nullable=True))
    _safe_add_column(connection, 'users', sa.Column('mfa_temp_token', sa.String(255), nullable=True))
    _safe_add_column(connection, 'users', sa.Column('mfa_temp_token_expires', sa.DateTime(), nullable=True))
    
    # Password security fields
    _safe_add_column(connection, 'users', sa.Column('password_changed_at', sa.DateTime(), default=sa.func.now()))
    _safe_add_column(connection, 'users', sa.Column('password_reset_token', sa.String(255), nullable=True))
    _safe_add_column(connection, 'users', sa.Column('password_reset_expires', sa.DateTime(), nullable=True))
    _safe_add_column(connection, 'users', sa.Column('force_password_change', sa.Boolean(), default=False))
    
    # Account security fields
    _safe_add_column(connection, 'users', sa.Column('failed_login_attempts', sa.Integer(), default=0))
    _safe_add_column(connection, 'users', sa.Column('account_locked_until', sa.DateTime(), nullable=True))
    _safe_add_column(connection, 'users', sa.Column('last_login_ip', sa.String(45), nullable=True))
    
    # Device tracking
    _safe_add_column(connection, 'users', sa.Column('trusted_devices', sa.JSON(), nullable=True))
    
    # Security preferences
    _safe_add_column(connection, 'users', sa.Column('security_notifications', sa.Boolean(), default=True))
    _safe_add_column(connection, 'users', sa.Column('login_notifications', sa.Boolean(), default=True))
    
    # Create indexes for enhanced authentication
    _safe_create_index(connection, 'idx_users_email_verification_token', 'users', ['email_verification_token'])
    _safe_create_index(connection, 'idx_users_mfa_temp_token', 'users', ['mfa_temp_token'])
    _safe_create_index(connection, 'idx_users_password_reset_token', 'users', ['password_reset_token'])
    _safe_create_index(connection, 'idx_users_account_locked_until', 'users', ['account_locked_until'])
    _safe_create_index(connection, 'idx_users_mfa_enabled', 'users', ['mfa_enabled'])
    
    # Enhanced session tokens table (if not exists)
    if not _table_exists(connection, 'enhanced_session_tokens'):
        op.create_table('enhanced_session_tokens',
            sa.Column('id', sa.Integer(), primary_key=True),
            sa.Column('jti', sa.String(36), unique=True, nullable=False, index=True),
            sa.Column('user_id', sa.Integer(), sa.ForeignKey('users.id'), nullable=False, index=True),
            sa.Column('token_type', sa.String(20), nullable=False),
            sa.Column('is_revoked', sa.Boolean(), default=False, nullable=False, index=True),
            
            # Enhanced session information
            sa.Column('ip_address', sa.String(45), nullable=True),
            sa.Column('user_agent', sa.Text(), nullable=True),
            sa.Column('device_fingerprint', sa.String(64), nullable=True, index=True),
            sa.Column('location_country', sa.String(2), nullable=True),
            sa.Column('location_city', sa.String(100), nullable=True),
            
            # Timestamps
            sa.Column('issued_at', sa.DateTime(), nullable=False, default=sa.func.now()),
            sa.Column('expires_at', sa.DateTime(), nullable=False, index=True),
            sa.Column('revoked_at', sa.DateTime(), nullable=True),
            sa.Column('last_used_at', sa.DateTime(), nullable=True),
            
            # Security tracking
            sa.Column('revocation_reason', sa.String(100), nullable=True),
            sa.Column('is_trusted_device', sa.Boolean(), default=False),
            sa.Column('risk_score', sa.Float(), default=0.0),
            
            sa.Column('created_at', sa.DateTime(), default=sa.func.now()),
            sa.Column('updated_at', sa.DateTime(), default=sa.func.now(), onupdate=sa.func.now())
        )
    
    # Create indexes for enhanced session tokens
    _safe_create_index(connection, 'idx_enhanced_session_tokens_user_active', 'enhanced_session_tokens', 
                       ['user_id', 'is_revoked'])
    _safe_create_index(connection, 'idx_enhanced_session_tokens_device', 'enhanced_session_tokens', 
                       ['device_fingerprint'])
    _safe_create_index(connection, 'idx_enhanced_session_tokens_expires', 'enhanced_session_tokens', 
                       ['expires_at'])
    
    # Enhanced login attempts table
    if not _table_exists(connection, 'enhanced_login_attempts'):
        op.create_table('enhanced_login_attempts',
            sa.Column('id', sa.Integer(), primary_key=True),
            sa.Column('identifier', sa.String(255), nullable=False, index=True),
            sa.Column('user_id', sa.Integer(), sa.ForeignKey('users.id'), nullable=True, index=True),
            sa.Column('ip_address', sa.String(45), nullable=True, index=True),
            sa.Column('user_agent', sa.Text(), nullable=True),
            sa.Column('success', sa.Boolean(), nullable=False, default=False, index=True),
            sa.Column('attempted_at', sa.DateTime(), nullable=False, default=sa.func.now(), index=True),
            
            # Enhanced security context
            sa.Column('country', sa.String(2), nullable=True),
            sa.Column('city', sa.String(100), nullable=True),
            sa.Column('device_fingerprint', sa.String(64), nullable=True),
            sa.Column('is_suspicious', sa.Boolean(), default=False, index=True),
            sa.Column('threat_score', sa.Float(), default=0.0),
            sa.Column('blocked_reason', sa.String(100), nullable=True),
            
            # Additional context
            sa.Column('browser', sa.String(50), nullable=True),
            sa.Column('os', sa.String(50), nullable=True),
            sa.Column('is_mobile', sa.Boolean(), default=False),
            sa.Column('referrer', sa.String(255), nullable=True)
        )
    
    # Create composite indexes for enhanced login attempts
    _safe_create_index(connection, 'idx_enhanced_login_attempts_identifier_time', 'enhanced_login_attempts',
                       ['identifier', 'attempted_at'])
    _safe_create_index(connection, 'idx_enhanced_login_attempts_ip_time', 'enhanced_login_attempts',
                       ['ip_address', 'attempted_at'])
    _safe_create_index(connection, 'idx_enhanced_login_attempts_suspicious', 'enhanced_login_attempts',
                       ['is_suspicious', 'attempted_at'])
    
    # Device tracking table
    if not _table_exists(connection, 'trusted_devices'):
        op.create_table('trusted_devices',
            sa.Column('id', sa.Integer(), primary_key=True),
            sa.Column('user_id', sa.Integer(), sa.ForeignKey('users.id'), nullable=False, index=True),
            sa.Column('device_fingerprint', sa.String(64), nullable=False, index=True),
            sa.Column('device_name', sa.String(100), nullable=True),
            sa.Column('browser', sa.String(50), nullable=True),
            sa.Column('os', sa.String(50), nullable=True),
            sa.Column('is_mobile', sa.Boolean(), default=False),
            sa.Column('first_seen', sa.DateTime(), nullable=False, default=sa.func.now()),
            sa.Column('last_seen', sa.DateTime(), nullable=False, default=sa.func.now()),
            sa.Column('is_active', sa.Boolean(), default=True),
            sa.Column('trust_level', sa.String(20), default='pending'),
            sa.Column('created_at', sa.DateTime(), default=sa.func.now()),
            sa.Column('updated_at', sa.DateTime(), default=sa.func.now(), onupdate=sa.func.now())
        )
    
    # Create unique constraint for user-device combination
    _safe_create_index(connection, 'idx_trusted_devices_user_fingerprint', 'trusted_devices',
                       ['user_id', 'device_fingerprint'], unique=True)
    
    # MFA backup codes table (for better tracking)
    if not _table_exists(connection, 'mfa_backup_codes'):
        op.create_table('mfa_backup_codes',
            sa.Column('id', sa.Integer(), primary_key=True),
            sa.Column('user_id', sa.Integer(), sa.ForeignKey('users.id'), nullable=False, index=True),
            sa.Column('code_hash', sa.String(255), nullable=False),
            sa.Column('is_used', sa.Boolean(), default=False, index=True),
            sa.Column('used_at', sa.DateTime(), nullable=True),
            sa.Column('created_at', sa.DateTime(), default=sa.func.now()),
            sa.Column('expires_at', sa.DateTime(), nullable=True)
        )
    
    # Security notifications table
    if not _table_exists(connection, 'security_notifications'):
        op.create_table('security_notifications',
            sa.Column('id', sa.Integer(), primary_key=True),
            sa.Column('user_id', sa.Integer(), sa.ForeignKey('users.id'), nullable=False, index=True),
            sa.Column('notification_type', sa.String(50), nullable=False, index=True),
            sa.Column('title', sa.String(200), nullable=False),
            sa.Column('message', sa.Text(), nullable=False),
            sa.Column('is_read', sa.Boolean(), default=False, index=True),
            sa.Column('severity', sa.String(20), default='info'),
            sa.Column('metadata', sa.JSON(), nullable=True),
            sa.Column('created_at', sa.DateTime(), default=sa.func.now(), index=True),
            sa.Column('read_at', sa.DateTime(), nullable=True)
        )
    
    # Create composite indexes for security notifications
    _safe_create_index(connection, 'idx_security_notifications_user_unread', 'security_notifications',
                       ['user_id', 'is_read'])
    _safe_create_index(connection, 'idx_security_notifications_type_time', 'security_notifications',
                       ['notification_type', 'created_at'])

def downgrade():
    """Remove enhanced authentication features"""
    connection = op.get_bind()

    # Drop tables
    for table_name in ('security_notifications', 'mfa_backup_codes', 'trusted_devices', 'enhanced_login_attempts', 'enhanced_session_tokens'):
        if _table_exists(connection, table_name):
            op.drop_table(table_name)
    
    # Remove indexes from users table
    for index_name in (
        'idx_users_login_notifications',
        'idx_users_security_notifications',
        'idx_users_mfa_enabled',
        'idx_users_account_locked_until',
        'idx_users_password_reset_token',
        'idx_users_mfa_temp_token',
        'idx_users_email_verification_token',
    ):
        _safe_drop_index(connection, index_name, 'users')
    
    # Remove columns from users table
    for column_name in (
        'login_notifications',
        'security_notifications',
        'trusted_devices',
        'last_login_ip',
        'account_locked_until',
        'failed_login_attempts',
        'force_password_change',
        'password_reset_expires',
        'password_reset_token',
        'password_changed_at',
        'mfa_temp_token_expires',
        'mfa_temp_token',
        'mfa_backup_codes',
        'mfa_secret',
        'mfa_enabled',
        'email_verification_expires',
        'email_verification_token',
        'email_verified',
    ):
        if _column_exists(connection, 'users', column_name):
            op.drop_column('users', column_name)
