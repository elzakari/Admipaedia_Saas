"""Enhanced authentication models

Revision ID: enhanced_auth_001
Revises: database_schema_optimization
Create Date: 2024-12-20 10:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers
revision = 'enhanced_auth_001'
down_revision = 'database_schema_optimization'
branch_labels = None
depends_on = None

def upgrade():
    """Create enhanced authentication tables"""
    
    # MFA Devices table
    op.create_table('mfa_devices',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('device_name', sa.String(length=100), nullable=False),
        sa.Column('device_type', sa.String(length=20), nullable=False),
        sa.Column('secret_key', sa.String(length=32), nullable=True),
        sa.Column('backup_codes', sa.JSON(), nullable=True),
        sa.Column('phone_number', sa.String(length=20), nullable=True),
        sa.Column('email_address', sa.String(length=120), nullable=True),
        sa.Column('is_active', sa.Boolean(), nullable=False, default=True),
        sa.Column('is_verified', sa.Boolean(), nullable=False, default=False),
        sa.Column('last_used', sa.DateTime(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_mfa_devices_user_id', 'mfa_devices', ['user_id'])
    
    # Trusted Devices table
    op.create_table('trusted_devices',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('device_fingerprint', sa.String(length=64), nullable=False),
        sa.Column('device_name', sa.String(length=100), nullable=True),
        sa.Column('user_agent', sa.Text(), nullable=True),
        sa.Column('ip_address', sa.String(length=45), nullable=True),
        sa.Column('location', sa.JSON(), nullable=True),
        sa.Column('is_trusted', sa.Boolean(), nullable=False, default=False),
        sa.Column('trust_expires_at', sa.DateTime(), nullable=True),
        sa.Column('last_seen', sa.DateTime(), nullable=False),
        sa.Column('login_count', sa.Integer(), nullable=False, default=1),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('device_fingerprint')
    )
    op.create_index('ix_trusted_devices_user_id', 'trusted_devices', ['user_id'])
    op.create_index('ix_trusted_devices_device_fingerprint', 'trusted_devices', ['device_fingerprint'])
    
    # Authentication Attempts table
    op.create_table('authentication_attempts',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=True),
        sa.Column('identifier', sa.String(length=255), nullable=False),
        sa.Column('attempt_type', sa.String(length=20), nullable=False),
        sa.Column('success', sa.Boolean(), nullable=False, default=False),
        sa.Column('ip_address', sa.String(length=45), nullable=True),
        sa.Column('user_agent', sa.Text(), nullable=True),
        sa.Column('device_fingerprint', sa.String(length=64), nullable=True),
        sa.Column('country', sa.String(length=2), nullable=True),
        sa.Column('city', sa.String(length=100), nullable=True),
        sa.Column('risk_score', sa.Float(), nullable=False, default=0.0),
        sa.Column('is_suspicious', sa.Boolean(), nullable=False, default=False),
        sa.Column('blocked_reason', sa.String(length=100), nullable=True),
        sa.Column('failure_reason', sa.String(length=100), nullable=True),
        sa.Column('metadata', sa.JSON(), nullable=True),
        sa.Column('attempted_at', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_authentication_attempts_user_id', 'authentication_attempts', ['user_id'])
    op.create_index('ix_authentication_attempts_identifier', 'authentication_attempts', ['identifier'])
    op.create_index('ix_authentication_attempts_attempted_at', 'authentication_attempts', ['attempted_at'])
    
    # Password Reset Tokens table
    op.create_table('password_reset_tokens',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('token_hash', sa.String(length=64), nullable=False),
        sa.Column('expires_at', sa.DateTime(), nullable=False),
        sa.Column('is_used', sa.Boolean(), nullable=False, default=False),
        sa.Column('used_at', sa.DateTime(), nullable=True),
        sa.Column('ip_address', sa.String(length=45), nullable=True),
        sa.Column('user_agent', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('token_hash')
    )
    op.create_index('ix_password_reset_tokens_user_id', 'password_reset_tokens', ['user_id'])
    op.create_index('ix_password_reset_tokens_token_hash', 'password_reset_tokens', ['token_hash'])
    op.create_index('ix_password_reset_tokens_expires_at', 'password_reset_tokens', ['expires_at'])
    
    # User Security Settings table
    op.create_table('user_security_settings',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('mfa_enabled', sa.Boolean(), nullable=False, default=False),
        sa.Column('mfa_required', sa.Boolean(), nullable=False, default=False),
        sa.Column('backup_codes_generated', sa.Boolean(), nullable=False, default=False),
        sa.Column('session_timeout_minutes', sa.Integer(), nullable=False, default=480),
        sa.Column('max_concurrent_sessions', sa.Integer(), nullable=False, default=5),
        sa.Column('login_notifications', sa.Boolean(), nullable=False, default=True),
        sa.Column('suspicious_activity_alerts', sa.Boolean(), nullable=False, default=True),
        sa.Column('password_expiry_days', sa.Integer(), nullable=True),
        sa.Column('last_password_change', sa.DateTime(), nullable=True),
        sa.Column('trust_new_devices', sa.Boolean(), nullable=False, default=False),
        sa.Column('device_trust_duration_days', sa.Integer(), nullable=False, default=30),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('user_id')
    )
    op.create_index('ix_user_security_settings_user_id', 'user_security_settings', ['user_id'])
    
    # Security Audit Logs table
    op.create_table('security_audit_logs',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=True),
        sa.Column('event_type', sa.String(length=50), nullable=False),
        sa.Column('event_category', sa.String(length=30), nullable=False),
        sa.Column('severity', sa.String(length=20), nullable=False, default='info'),
        sa.Column('resource', sa.String(length=100), nullable=True),
        sa.Column('action', sa.String(length=50), nullable=True),
        sa.Column('ip_address', sa.String(length=45), nullable=True),
        sa.Column('user_agent', sa.Text(), nullable=True),
        sa.Column('endpoint', sa.String(length=255), nullable=True),
        sa.Column('method', sa.String(length=10), nullable=True),
        sa.Column('details', sa.JSON(), nullable=True),
        sa.Column('old_values', sa.JSON(), nullable=True),
        sa.Column('new_values', sa.JSON(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_security_audit_logs_user_id', 'security_audit_logs', ['user_id'])
    op.create_index('ix_security_audit_logs_event_type', 'security_audit_logs', ['event_type'])
    op.create_index('ix_security_audit_logs_event_category', 'security_audit_logs', ['event_category'])
    op.create_index('ix_security_audit_logs_created_at', 'security_audit_logs', ['created_at'])
    
    # Performance indexes for enhanced authentication
    op.create_index('ix_mfa_devices_active_verified', 'mfa_devices', ['user_id', 'is_active', 'is_verified'])
    op.create_index('ix_trusted_devices_active_trust', 'trusted_devices', ['user_id', 'is_trusted', 'trust_expires_at'])
    op.create_index('ix_auth_attempts_recent', 'authentication_attempts', ['identifier', 'attempted_at', 'success'])
    op.create_index('ix_security_logs_recent_events', 'security_audit_logs', ['event_type', 'created_at', 'severity'])

def downgrade():
    """Drop enhanced authentication tables"""
    
    # Drop indexes first
    op.drop_index('ix_security_logs_recent_events', 'security_audit_logs')
    op.drop_index('ix_auth_attempts_recent', 'authentication_attempts')
    op.drop_index('ix_trusted_devices_active_trust', 'trusted_devices')
    op.drop_index('ix_mfa_devices_active_verified', 'mfa_devices')
    
    # Drop tables
    op.drop_table('security_audit_logs')
    op.drop_table('user_security_settings')
    op.drop_table('password_reset_tokens')
    op.drop_table('authentication_attempts')
    op.drop_table('trusted_devices')
    op.drop_table('mfa_devices')