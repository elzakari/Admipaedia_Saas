"""
Security-related database models for ADMIPAEDIA
"""

from datetime import datetime, timedelta, timezone
import hashlib
import secrets
from app.extensions import db


def _as_utc_aware(dt: datetime) -> datetime:
    if dt.tzinfo is None:
        return dt.replace(tzinfo=timezone.utc)
    return dt.astimezone(timezone.utc)


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)

class LoginAttempt(db.Model):
    """Track login attempts for security monitoring and account lockout"""
    __tablename__ = 'login_attempts'
    
    id = db.Column(db.Integer, primary_key=True)
    identifier = db.Column(db.String(255), nullable=False, index=True)  # Email or username
    ip_address = db.Column(db.String(45), nullable=True)  # IPv4 or IPv6
    user_agent = db.Column(db.Text, nullable=True)
    success = db.Column(db.Boolean, nullable=False, default=False)
    attempted_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow, index=True)
    
    # Additional security context
    country = db.Column(db.String(2), nullable=True)  # ISO country code
    city = db.Column(db.String(100), nullable=True)
    is_suspicious = db.Column(db.Boolean, default=False)
    
    def __repr__(self):
        return f'<LoginAttempt {self.identifier} - {"Success" if self.success else "Failed"} at {self.attempted_at}>'

class SecurityEvent(db.Model):
    """Log security events for monitoring and analysis"""
    __tablename__ = 'security_events'
    
    id = db.Column(db.Integer, primary_key=True)
    event_type = db.Column(db.String(50), nullable=False, index=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=True)
    ip_address = db.Column(db.String(45), nullable=True)
    user_agent = db.Column(db.Text, nullable=True)
    endpoint = db.Column(db.String(255), nullable=True)
    method = db.Column(db.String(10), nullable=True)
    
    # Event details (JSON)
    details = db.Column(db.JSON, nullable=True)
    
    # Severity level
    severity = db.Column(db.String(20), nullable=False, default='info')  # info, warning, error, critical
    
    created_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)
    
    # Relationships
    user = db.relationship('User', backref='security_events')
    
    def __repr__(self):
        return f'<SecurityEvent {self.event_type} - {self.severity} at {self.created_at}>'

class PasswordHistory(db.Model):
    """Track password history to prevent reuse"""
    __tablename__ = 'password_history'
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    password_hash = db.Column(db.String(255), nullable=False)
    created_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)
    
    # Relationships
    user = db.relationship('User', backref='password_history')
    
    def __repr__(self):
        return f'<PasswordHistory for user {self.user_id} at {self.created_at}>'

class APIKey(db.Model):
    """API keys for external integrations"""
    __tablename__ = 'api_keys'
    
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    key_hash = db.Column(db.String(255), nullable=False, unique=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    
    # Permissions and restrictions
    permissions = db.Column(db.JSON, nullable=True)  # List of allowed endpoints/actions
    ip_whitelist = db.Column(db.JSON, nullable=True)  # Allowed IP addresses
    
    # Usage tracking
    last_used = db.Column(db.DateTime, nullable=True)
    usage_count = db.Column(db.Integer, default=0)
    
    # Status
    is_active = db.Column(db.Boolean, default=True)
    expires_at = db.Column(db.DateTime, nullable=True)
    
    created_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    user = db.relationship('User', backref='api_keys')
    
    def __repr__(self):
        return f'<APIKey {self.name} for user {self.user_id}>'


class PasswordResetToken(db.Model):
    __tablename__ = 'password_reset_tokens'

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False, index=True)

    token_hash = db.Column(db.String(64), nullable=False, unique=True, index=True)
    expires_at = db.Column(db.DateTime, nullable=False, index=True)

    is_used = db.Column(db.Boolean, default=False, nullable=False)
    used_at = db.Column(db.DateTime, nullable=True)

    ip_address = db.Column(db.String(45), nullable=True)
    user_agent = db.Column(db.Text, nullable=True)

    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)

    user = db.relationship('User', backref='password_reset_tokens')

    @staticmethod
    def generate_token(user_id: int, ip_address: str = None, user_agent: str = None, expires_in_hours: int = 1) -> str:
        token = secrets.token_urlsafe(32)
        token_hash = hashlib.sha256(token.encode('utf-8')).hexdigest()

        reset_token = PasswordResetToken(
            user_id=user_id,
            token_hash=token_hash,
            expires_at=datetime.utcnow() + timedelta(hours=expires_in_hours),
            ip_address=ip_address,
            user_agent=user_agent
        )

        db.session.add(reset_token)
        db.session.commit()

        return token

    @staticmethod
    def validate_token(token: str):
        if not token:
            return None, 'Reset token is required'

        token_hash = hashlib.sha256(token.encode('utf-8')).hexdigest()
        reset_token = PasswordResetToken.query.filter_by(token_hash=token_hash).first()
        if not reset_token:
            return None, 'Invalid reset token'

        if reset_token.is_used:
            return None, 'Reset token has already been used'

        if reset_token.expires_at and _as_utc_aware(reset_token.expires_at) < _utcnow():
            return None, 'Reset token has expired'

        return reset_token, None

    def mark_as_used(self):
        self.is_used = True
        self.used_at = datetime.utcnow()


class SchoolRegistrationToken(db.Model):
    __tablename__ = 'school_registration_tokens'

    id = db.Column(db.Integer, primary_key=True)
    created_by_user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False, index=True)

    token_hash = db.Column(db.String(64), nullable=False, unique=True, index=True)
    expires_at = db.Column(db.DateTime, nullable=False, index=True)

    is_used = db.Column(db.Boolean, default=False, nullable=False)
    used_at = db.Column(db.DateTime, nullable=True)

    school_name = db.Column(db.String(255), nullable=False)
    school_slug = db.Column(db.String(63), nullable=False)
    country_code = db.Column(db.String(2), nullable=False)
    currency = db.Column(db.String(3), nullable=False, default='USD')

    admin_email = db.Column(db.String(255), nullable=False)

    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)

    created_by = db.relationship('User', foreign_keys=[created_by_user_id])

    @staticmethod
    def generate_token(
        created_by_user_id: int,
        school_name: str,
        school_slug: str,
        country_code: str,
        currency: str,
        admin_email: str,
        expires_in_hours: int = 24
    ):
        token = secrets.token_urlsafe(32)
        token_hash = hashlib.sha256(token.encode('utf-8')).hexdigest()

        reg = SchoolRegistrationToken(
            created_by_user_id=int(created_by_user_id),
            token_hash=token_hash,
            expires_at=datetime.utcnow() + timedelta(hours=expires_in_hours),
            school_name=(school_name or '').strip(),
            school_slug=(school_slug or '').strip(),
            country_code=(country_code or '').strip().upper(),
            currency=(currency or 'USD').strip().upper(),
            admin_email=(admin_email or '').strip().lower()
        )

        db.session.add(reg)
        db.session.commit()
        return token, reg

    @staticmethod
    def validate_token(token: str):
        token = str(token or '').strip()
        if not token:
            return None, 'Registration token is required'

        token_hash = hashlib.sha256(token.encode('utf-8')).hexdigest()
        reg = SchoolRegistrationToken.query.filter_by(token_hash=token_hash).first()
        if not reg:
            return None, 'Invalid registration token'

        if reg.is_used:
            return None, 'Registration token has already been used'

        if reg.expires_at and _as_utc_aware(reg.expires_at) < _utcnow():
            return None, 'Registration token has expired'

        return reg, None

    def mark_as_used(self):
        self.is_used = True
        self.used_at = datetime.utcnow()
