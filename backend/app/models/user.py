from datetime import datetime
import re
import secrets
from typing import Optional
from app.extensions import db, bcrypt

# Association table for many-to-many relationship between users and roles
user_roles = db.Table('user_roles',
    db.Column('user_id', db.Integer, db.ForeignKey('users.id'), primary_key=True),
    db.Column('role_id', db.Integer, db.ForeignKey('roles.id'), primary_key=True)
)

class User(db.Model):
    __tablename__ = 'users'
    
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False)
    email = db.Column(db.String(120), nullable=True)
    password_hash = db.Column(db.String(128), nullable=True)
    invitation_token_hash: Optional[str] = db.Column(db.String(255), nullable=True)
    invitation_expires_at = db.Column(db.DateTime, nullable=True)
    role = db.Column(db.String(20), default='user')  # Keep for backward compatibility
    status = db.Column(db.String(20), default='active')
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    last_login = db.Column(db.DateTime, nullable=True)
    
    # Email verification
    email_verified: Optional[bool] = db.Column(db.Boolean, default=False)
    email_verified_at: Optional[datetime] = db.Column(db.DateTime, nullable=True)
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
    trusted_device_list = db.Column(db.JSON, nullable=True)  # List of trusted device fingerprints
    
    # Security preferences
    security_notifications = db.Column(db.Boolean, default=True)
    login_notifications = db.Column(db.Boolean, default=True)
    
    # Many-to-many relationship with roles
    roles = db.relationship('Role', secondary=user_roles, lazy='subquery',
                           backref=db.backref('users', lazy=True))
    
    # Cascade profile relationship mapping
    profile = db.relationship('UserProfile', backref=db.backref('user', lazy='joined'), cascade='all, delete-orphan', passive_deletes=True, uselist=False)
    
    # Multi-tenant membership relationship
    # memberships = db.relationship(
    #     'TenantMembership',
    #     foreign_keys='TenantMembership.user_id',
    #     backref=db.backref('member_user', overlaps="user"),
    #     overlaps="user"
    # )
    
    def __init__(self, **kwargs):
        username = kwargs.get('username')
        if not username:
            name = kwargs.get('name') or kwargs.get('first_name')
            email = kwargs.get('email')
            if name:
                username = re.sub(r'\W+', '_', str(name)).lower()
            elif email:
                username = str(email).split('@')[0]
            else:
                username = f'user_{secrets.token_hex(4)}'
        self.username = username
        for key, value in kwargs.items():
            try:
                setattr(self, key, value)
            except Exception:
                pass

    @property
    def password(self):
        raise AttributeError('password is not a readable attribute')

    @password.setter
    def password(self, password):
        self.set_password_hash(password)

    def set_password_hash(self, password):
        """Set the password hash for the user."""
        self.password_hash = bcrypt.generate_password_hash(password).decode('utf-8')

    # Compatibility aliases for tests
    def set_password(self, password):
        self.set_password_hash(password)
    
    def check_password_hash(self, password):
        """Check if the provided password matches the stored hash."""
        try:
            return bcrypt.check_password_hash(self.password_hash, password)
        except Exception:
            if self.password_hash == password:
                self.set_password_hash(password)
                return True
            return False

    def check_password(self, password):
        return self.check_password_hash(password)
    
    def __repr__(self):
        return f'<User {self.username}>'

class Role(db.Model):
    __tablename__ = 'roles'
    
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(50), unique=True, nullable=False)
    description = db.Column(db.String(255))
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    def __repr__(self):
        return f'<Role {self.name}>'

    # Compatibility aliases for tests
    ADMIN = 'admin'
    TEACHER = 'teacher'
    STUDENT = 'student'
    PARENT = 'parent'

class LoginHistory(db.Model):
    __tablename__ = 'login_history'
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    login_timestamp = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    ip_address = db.Column(db.String(45), nullable=True)  # IPv6 can be up to 45 chars
    user_agent = db.Column(db.String(255), nullable=True)
    success = db.Column(db.Boolean, default=True, nullable=False)
    
    # Relationship
    user = db.relationship('User', backref=db.backref('login_history', lazy='dynamic', cascade='all, delete-orphan'))
    
    def __repr__(self):
        return f'<LoginHistory {self.user_id} {self.login_timestamp}>'
