"""
Session Token model for JWT token management and revocation
"""
from app.extensions import db
from datetime import datetime, timedelta, timezone
import secrets

class SessionToken(db.Model):
    """Model for managing JWT tokens and implementing token revocation"""
    __tablename__ = 'session_tokens'
    
    id = db.Column(db.Integer, primary_key=True)
    
    # Token identification
    jti = db.Column(db.String(36), unique=True, nullable=False, index=True)  # JWT ID
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False, index=True)
    
    # Token details
    token_type = db.Column(db.String(20), nullable=False)  # 'access' or 'refresh'
    is_revoked = db.Column(db.Boolean, default=False, nullable=False, index=True)
    
    # Session information
    ip_address = db.Column(db.String(45), nullable=True)  # IPv6 support
    user_agent = db.Column(db.Text, nullable=True)
    device_fingerprint = db.Column(db.String(64), nullable=True)
    
    # Timestamps
    issued_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)
    expires_at = db.Column(db.DateTime, nullable=False, index=True)
    revoked_at = db.Column(db.DateTime, nullable=True)
    last_used_at = db.Column(db.DateTime, nullable=True)
    
    # Security tracking
    revocation_reason = db.Column(db.String(100), nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    user = db.relationship('User', backref=db.backref('session_tokens', lazy='dynamic', cascade='all, delete-orphan'))
    
    def __init__(self, jti, user_id, token_type, expires_at, ip_address=None, user_agent=None, device_fingerprint=None):
        self.jti = jti
        self.user_id = user_id
        self.token_type = token_type
        self.expires_at = expires_at
        self.ip_address = ip_address
        self.user_agent = user_agent
        if device_fingerprint:
            self.device_fingerprint = device_fingerprint
        else:
            self.device_fingerprint = self.generate_device_fingerprint(ip_address, user_agent)
    
    @staticmethod
    def generate_device_fingerprint(ip_address, user_agent):
        """Generate a device fingerprint for session tracking"""
        if not ip_address or not user_agent:
            return None
        
        import hashlib
        fingerprint_data = f"{ip_address}:{user_agent}"
        return hashlib.sha256(fingerprint_data.encode()).hexdigest()
    
    def revoke(self, reason=None):
        """Revoke the token"""
        self.is_revoked = True
        self.revoked_at = datetime.utcnow()
        self.revocation_reason = reason
        db.session.commit()
    
    def update_last_used(self):
        """Update the last used timestamp"""
        self.last_used_at = datetime.utcnow()
        db.session.commit()
    
    @staticmethod
    def _as_utc_aware(dt: datetime) -> datetime:
        if dt.tzinfo is None:
            return dt.replace(tzinfo=timezone.utc)
        return dt.astimezone(timezone.utc)

    @property
    def is_expired(self):
        """Check if token is expired"""
        now = datetime.now(timezone.utc)
        exp = self._as_utc_aware(self.expires_at)
        return now > exp
    
    @property
    def is_valid(self):
        """Check if token is valid (not revoked and not expired)"""
        return not self.is_revoked and not self.is_expired
    
    @property
    def is_refresh_token(self):
        """Check if token is a refresh token"""
        return self.token_type == 'refresh'
    
    def time_until_expiry(self):
        """Get time until token expires"""
        now = datetime.now(timezone.utc)
        exp = self._as_utc_aware(self.expires_at)
        return exp - now if exp > now else timedelta(0)
    
    @classmethod
    def create_token(cls, jti, user_id, token_type, expires_at, ip_address=None, user_agent=None):
        """Create a new session token"""
        token = cls(
            jti=jti,
            user_id=user_id,
            token_type=token_type,
            expires_at=expires_at,
            ip_address=ip_address,
            user_agent=user_agent
        )
        db.session.add(token)
        db.session.commit()
        return token
    
    @classmethod
    def find_by_jti(cls, jti):
        """Find token by JWT ID"""
        return cls.query.filter_by(jti=jti).first()
    
    @classmethod
    def revoke_user_tokens(cls, user_id, reason="User logout"):
        """Revoke all tokens for a user"""
        tokens = cls.query.filter_by(user_id=user_id, is_revoked=False).all()
        for token in tokens:
            token.revoke(reason)
        return len(tokens)
    
    @classmethod
    def cleanup_expired_tokens(cls):
        """Clean up expired tokens (should be run periodically)"""
        now = datetime.utcnow()
        expired_tokens = cls.query.filter(
            cls.expires_at < now,
            cls.is_revoked == False
        ).all()
        
        for token in expired_tokens:
            token.revoke("Token expired")
        
        return len(expired_tokens)
    
    @classmethod
    def get_user_active_sessions(cls, user_id):
        """Get all active sessions for a user"""
        now = datetime.utcnow()
        return cls.query.filter_by(
            user_id=user_id,
            is_revoked=False,
            token_type='access'
        ).filter(
            cls.expires_at > now
        ).all()
        
    @classmethod
    def get_session_stats(cls, user_id):
        """Get session statistics for a user"""
        now = datetime.utcnow()
        active_tokens = cls.query.filter_by(user_id=user_id, is_revoked=False).filter(cls.expires_at > now)
        access_tokens = active_tokens.filter_by(token_type='access').count()
        refresh_tokens = active_tokens.filter_by(token_type='refresh').count()
        return {
            'total_active': access_tokens + refresh_tokens,
            'access_tokens': access_tokens,
            'refresh_tokens': refresh_tokens
        }

    def to_dict(self):
        """Convert token to dictionary for API responses"""
        return {
            'id': self.id,
            'token_type': self.token_type,
            'ip_address': self.ip_address,
            'user_agent': self.user_agent[:100] if self.user_agent else None,  # Truncate for display
            'issued_at': self.issued_at.isoformat(),
            'expires_at': self.expires_at.isoformat(),
            'last_used_at': self.last_used_at.isoformat() if self.last_used_at else None,
            'is_current': False  # Will be set by the calling code
        }
    
    def __repr__(self):
        return f'<SessionToken {self.jti} - User {self.user_id} - {self.token_type}>'
