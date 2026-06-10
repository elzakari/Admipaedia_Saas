"""
Security-related database models for ADMIPAEDIA
"""

from datetime import datetime, timedelta, timezone
import hashlib
import secrets
from app.extensions import db


def _as_utc_aware(dt) -> datetime:
    if isinstance(dt, str):
        try:
            dt = datetime.fromisoformat(dt.replace('Z', '+00:00'))
        except Exception:
            from dateutil.parser import parse
            dt = parse(dt)
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
    
    @classmethod
    def get_recent_attempts(cls, identifier, minutes=30, limit=100):
        """Get recent login attempts for the identifier."""
        time_limit = datetime.utcnow() - timedelta(minutes=minutes)
        return cls.query.filter(
            cls.identifier == identifier,
            cls.attempted_at >= time_limit
        ).order_by(cls.attempted_at.desc()).limit(limit).all()

    @classmethod
    def count_failed_attempts(cls, identifier, minutes=30):
        """Count failed login attempts for the identifier within specified minutes."""
        time_limit = datetime.utcnow() - timedelta(minutes=minutes)
        return cls.query.filter(
            cls.identifier == identifier,
            cls.success == False,
            cls.attempted_at >= time_limit
        ).count()

    @classmethod
    def has_recent_success(cls, identifier, minutes=30):
        """Check if the identifier has had a successful login recently."""
        time_limit = datetime.utcnow() - timedelta(minutes=minutes)
        attempt = cls.query.filter(
            cls.identifier == identifier,
            cls.success == True,
            cls.attempted_at >= time_limit
        ).first()
        return attempt is not None

    @classmethod
    def cleanup_old_attempts(cls, days=30):
        """Clean up login attempts older than specified days."""
        time_limit = datetime.utcnow() - timedelta(days=days)
        deleted = cls.query.filter(cls.attempted_at < time_limit).delete()
        try:
            from app.models.user import db as user_db
            user_db.session.commit()
        except ImportError:
            db.session.commit()
        return deleted

    def __repr__(self):
        return f'<LoginAttempt {self.identifier} - {"Success" if self.success else "Failed"}>'

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
    user = db.relationship('User', backref=db.backref('password_history', cascade='all, delete-orphan'))
    
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
        """Validate a password reset token.

        Returns a plain dict on success, or (None, error_str) on failure.
        The plain dict is guaranteed to contain: 'id', 'user_id', 'expires_at',
        'is_used', and 'used_at' — always accessible via string key regardless of
        the underlying SQLAlchemy driver row type.
        """
        import logging as _logging
        _log = _logging.getLogger(__name__)

        if not token:
            return None, 'Reset token is required'

        # Defensive log — only type info and a safe token prefix, never the full value
        _log.debug(
            'validate_token called',
            extra={
                'token_prefix': (token[:8] + '...') if len(token) > 8 else '[short]',
                'token_type': type(token).__name__,
            }
        )

        from sqlalchemy import text
        token_hash = hashlib.sha256(token.encode('utf-8')).hexdigest()
        query = text(
            "SELECT id, user_id, expires_at, is_used, used_at "
            "FROM password_reset_tokens "
            "WHERE token_hash = :token_hash "
            "LIMIT 1"
        )
        raw_row = db.session.execute(query, {"token_hash": token_hash}).mappings().first()

        _log.debug(
            'validate_token raw_row type',
            extra={'raw_row_type': type(raw_row).__name__}
        )

        if not raw_row:
            return None, 'Invalid reset token'

        # Normalize: extract fields explicitly into a plain dict so callers are
        # never exposed to RowMapping, LegacyRow, KeyedTuple, or any other driver
        # variant that might later reject string-key access.
        try:
            reset_token = {
                'id':         int(raw_row['id']),
                'user_id':    int(raw_row['user_id']),
                'expires_at': raw_row['expires_at'],
                'is_used':    bool(raw_row['is_used']),
                'used_at':    raw_row['used_at'],
            }
        except Exception as norm_err:
            _log.error(
                'validate_token normalization failed',
                extra={
                    'error': str(norm_err),
                    'raw_row_type': type(raw_row).__name__,
                }
            )
            return None, 'Token lookup error'

        if reset_token['is_used']:
            return None, 'Reset token has already been used'

        expires_at = reset_token['expires_at']
        if expires_at and _as_utc_aware(expires_at) < _utcnow():
            return None, 'Reset token has expired'

        return reset_token, None

    @staticmethod
    def mark_as_used_by_id(token_id: int):
        """Mark a password reset token as used by its primary key ID (for use after validate_token)."""
        from sqlalchemy import text
        db.session.execute(
            text(
                "UPDATE password_reset_tokens "
                "SET is_used = :is_used, used_at = :used_at "
                "WHERE id = :id"
            ),
            {"is_used": True, "used_at": datetime.utcnow(), "id": token_id}
        )

    def mark_as_used(self):
        """Mark this ORM-loaded token instance as used."""
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


class TenantCredentialCounter(db.Model):
    """Atomic counter to prevent race conditions during parallel credential generation"""
    __tablename__ = 'tenant_credential_counters'
    
    tenant_id = db.Column(db.String(36), primary_key=True)
    year = db.Column(db.Integer, primary_key=True)
    last_value = db.Column(db.Integer, default=0, nullable=False)
    
    @classmethod
    def get_next_serial(cls, tenant_id, year: int) -> int:
        tenant_str = str(tenant_id)
        # 1. Lock row using SELECT FOR UPDATE
        counter = cls.query.filter_by(tenant_id=tenant_str, year=year).with_for_update().first()
        if not counter:
            # Row doesn't exist, create it.
            # To handle concurrency, try-except integrity errors during initial insert
            counter = cls(tenant_id=tenant_str, year=year, last_value=0)
            db.session.add(counter)
            try:
                db.session.flush()
            except Exception:
                db.session.rollback()
                counter = cls.query.filter_by(tenant_id=tenant_str, year=year).with_for_update().first()
                
        counter.last_value += 1
        db.session.add(counter)
        db.session.flush()
        return counter.last_value
