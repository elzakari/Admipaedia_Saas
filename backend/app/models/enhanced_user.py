"""
Enhanced User model with additional security fields
"""

from datetime import datetime, timedelta, timezone
from app.extensions import db, bcrypt
from app.models.user import User

# Extend the existing User model with additional security fields
class EnhancedUserMixin:
    """Mixin to add enhanced security fields to User model"""
    
    # Email verification
    email_verified = db.Column(db.Boolean, default=False)
    email_verification_token = db.Column(db.String(255), nullable=True)
    email_verification_expires = db.Column(db.DateTime, nullable=True)
    
    # Multi-Factor Authentication
    mfa_enabled = db.Column(db.Boolean, default=False)
    mfa_secret = db.Column(db.String(32), nullable=True)
    mfa_backup_codes = db.Column(db.JSON, nullable=True)  # List of backup codes
    mfa_temp_token = db.Column(db.String(255), nullable=True)
    mfa_temp_token_expires = db.Column(db.DateTime, nullable=True)
    
    # Password security
    password_changed_at = db.Column(db.DateTime, default=datetime.utcnow)
    password_reset_token = db.Column(db.String(255), nullable=True)
    password_reset_expires = db.Column(db.DateTime, nullable=True)
    force_password_change = db.Column(db.Boolean, default=False)
    
    # Account security
    failed_login_attempts = db.Column(db.Integer, default=0)
    account_locked_until = db.Column(db.DateTime, nullable=True)
    last_login_ip = db.Column(db.String(45), nullable=True)
    
    # Device tracking
    trusted_devices = db.Column(db.JSON, nullable=True)  # List of trusted device fingerprints
    
    # Security preferences
    security_notifications = db.Column(db.Boolean, default=True)
    login_notifications = db.Column(db.Boolean, default=True)
    
    def is_account_locked(self):
        """Check if account is currently locked"""
        if self.account_locked_until:
            now = datetime.now(timezone.utc)
            until = self.account_locked_until
            if until.tzinfo is None:
                until = until.replace(tzinfo=timezone.utc)
            else:
                until = until.astimezone(timezone.utc)
            return now < until
        return False
    
    def lock_account(self, duration_minutes=30):
        """Lock account for specified duration"""
        self.account_locked_until = datetime.utcnow() + timedelta(minutes=duration_minutes)
        self.failed_login_attempts = 0
    
    def unlock_account(self):
        """Unlock account"""
        self.account_locked_until = None
        self.failed_login_attempts = 0
    
    def add_trusted_device(self, device_fingerprint):
        """Add a device to trusted devices list"""
        if not self.trusted_devices:
            self.trusted_devices = []
        
        if device_fingerprint not in self.trusted_devices:
            self.trusted_devices.append(device_fingerprint)
            # Keep only last 10 trusted devices
            if len(self.trusted_devices) > 10:
                self.trusted_devices = self.trusted_devices[-10:]
    
    def is_trusted_device(self, device_fingerprint):
        """Check if device is trusted"""
        return self.trusted_devices and device_fingerprint in self.trusted_devices

# Apply the mixin to the existing User model
# This would typically be done by modifying the original User model
# For now, we'll create a new enhanced model that inherits from User

class EnhancedUser(User, EnhancedUserMixin):
    """Enhanced User model with additional security features"""
    __tablename__ = 'enhanced_users'
    
    # This would replace the original User model in a migration
    pass
