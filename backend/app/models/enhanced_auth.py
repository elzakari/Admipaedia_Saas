"""
Enhanced authentication models for ADMIPAEDIA system
Supports MFA, device tracking, and advanced security features
"""

from datetime import datetime, timedelta
from app.extensions import db
import secrets
import json

class MFADevice(db.Model):
    """Multi-Factor Authentication device management"""
    __tablename__ = 'mfa_devices'
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False, index=True)
    
    # Device information
    device_name = db.Column(db.String(100), nullable=False)
    device_type = db.Column(db.String(20), nullable=False)  # 'totp', 'sms', 'email'
    
    # TOTP specific fields
    secret_key = db.Column(db.String(32), nullable=True)  # Base32 encoded secret
    backup_codes = db.Column(db.JSON, nullable=True)  # List of backup codes
    
    # SMS/Email specific fields
    phone_number = db.Column(db.String(20), nullable=True)
    email_address = db.Column(db.String(120), nullable=True)
    
    # Status and metadata
    is_active = db.Column(db.Boolean, default=True, nullable=False)
    is_verified = db.Column(db.Boolean, default=False, nullable=False)
    last_used = db.Column(db.DateTime, nullable=True)
    
    # Timestamps
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    user = db.relationship('User', backref='mfa_devices')
    
    def __repr__(self):
        return f'<MFADevice {self.device_name} for user {self.user_id}>'

class TrustedDevice(db.Model):
    """Trusted device management for reduced MFA prompts"""
    __tablename__ = 'trusted_devices'
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False, index=True)
    
    # Device identification
    device_fingerprint = db.Column(db.String(64), nullable=False, unique=True, index=True)
    device_name = db.Column(db.String(100), nullable=True)
    
    # Device details
    user_agent = db.Column(db.Text, nullable=True)
    ip_address = db.Column(db.String(45), nullable=True)
    location = db.Column(db.JSON, nullable=True)  # Country, city, etc.
    
    # Trust status
    is_trusted = db.Column(db.Boolean, default=False, nullable=False)
    trust_expires_at = db.Column(db.DateTime, nullable=True)
    
    # Activity tracking
    last_seen = db.Column(db.DateTime, default=datetime.utcnow)
    login_count = db.Column(db.Integer, default=1)
    
    # Timestamps
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    user = db.relationship('User', backref='trusted_devices')
    
    def __repr__(self):
        return f'<TrustedDevice {self.device_fingerprint} for user {self.user_id}>'

class AuthenticationAttempt(db.Model):
    """Enhanced authentication attempt tracking"""
    __tablename__ = 'authentication_attempts'
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=True, index=True)
    
    # Attempt details
    identifier = db.Column(db.String(255), nullable=False, index=True)  # Email or username
    attempt_type = db.Column(db.String(20), nullable=False)  # 'login', 'mfa', 'password_reset'
    success = db.Column(db.Boolean, nullable=False, default=False)
    
    # Location and device info
    ip_address = db.Column(db.String(45), nullable=True)
    user_agent = db.Column(db.Text, nullable=True)
    device_fingerprint = db.Column(db.String(64), nullable=True)
    
    # Geographic info
    country = db.Column(db.String(2), nullable=True)
    city = db.Column(db.String(100), nullable=True)
    
    # Risk assessment
    risk_score = db.Column(db.Float, default=0.0)
    is_suspicious = db.Column(db.Boolean, default=False)
    blocked_reason = db.Column(db.String(100), nullable=True)
    
    # Failure details
    failure_reason = db.Column(db.String(100), nullable=True)
    attempt_metadata = db.Column(db.JSON, nullable=True)  # Changed from 'metadata' to 'attempt_metadata'
    
    # Timestamps
    attempted_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False, index=True)
    
    # Relationships
    user = db.relationship('User', backref='authentication_attempts')
    
    def __repr__(self):
        return f'<AuthenticationAttempt {self.identifier} - {"Success" if self.success else "Failed"} at {self.attempted_at}>'

class UserSecuritySettings(db.Model):
    """User-specific security settings and preferences"""
    __tablename__ = 'user_security_settings'
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False, unique=True, index=True)
    
    # MFA settings
    mfa_enabled = db.Column(db.Boolean, default=False, nullable=False)
    mfa_required = db.Column(db.Boolean, default=False, nullable=False)  # Admin enforced
    backup_codes_generated = db.Column(db.Boolean, default=False, nullable=False)
    
    # Session settings
    session_timeout_minutes = db.Column(db.Integer, default=480)  # 8 hours
    max_concurrent_sessions = db.Column(db.Integer, default=5)
    
    # Security preferences
    login_notifications = db.Column(db.Boolean, default=True, nullable=False)
    suspicious_activity_alerts = db.Column(db.Boolean, default=True, nullable=False)
    
    # Password policy
    password_expiry_days = db.Column(db.Integer, nullable=True)
    last_password_change = db.Column(db.DateTime, nullable=True)
    
    # Device trust settings
    trust_new_devices = db.Column(db.Boolean, default=False, nullable=False)
    device_trust_duration_days = db.Column(db.Integer, default=30)
    
    # Timestamps
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    user = db.relationship('User', backref=db.backref('security_settings', uselist=False))
    
    def __repr__(self):
        return f'<UserSecuritySettings for user {self.user_id}>'

class SecurityAuditLog(db.Model):
    """Comprehensive security audit logging"""
    __tablename__ = 'security_audit_logs'
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=True, index=True)
    
    # Event details
    event_type = db.Column(db.String(50), nullable=False, index=True)
    event_category = db.Column(db.String(30), nullable=False, index=True)  # auth, access, admin, etc.
    severity = db.Column(db.String(20), nullable=False, default='info')  # info, warning, error, critical
    
    # Context
    resource = db.Column(db.String(100), nullable=True)  # What was accessed/modified
    action = db.Column(db.String(50), nullable=True)  # What action was performed
    
    # Request context
    ip_address = db.Column(db.String(45), nullable=True)
    user_agent = db.Column(db.Text, nullable=True)
    endpoint = db.Column(db.String(255), nullable=True)
    method = db.Column(db.String(10), nullable=True)
    
    # Event data
    details = db.Column(db.JSON, nullable=True)
    old_values = db.Column(db.JSON, nullable=True)  # For change tracking
    new_values = db.Column(db.JSON, nullable=True)  # For change tracking
    
    # Timestamps
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False, index=True)
    
    # Relationships
    user = db.relationship('User', backref='security_audit_logs')
    
    def __repr__(self):
        return f'<SecurityAuditLog {self.event_type} - {self.severity} at {self.created_at}>'
