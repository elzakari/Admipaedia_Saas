from app.extensions import db
from sqlalchemy.dialects.postgresql import UUID, JSONB, INET
from sqlalchemy import JSON
from sqlalchemy.sql import func
import uuid


TENANT_MEMBER_ROLES = (
    'school_admin',
    'school_finance',
    'school_staff_readonly',
    'teacher',
    'student',
    'parent',
    'staff'
)

class Tenant(db.Model):
    """
    SaaS Tenant (School) Model.
    """
    __tablename__ = 'tenants'

    id = db.Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    slug = db.Column(db.String(63), unique=True, nullable=False) # subdomain
    name = db.Column(db.String(255), nullable=False)
    country_code = db.Column(db.String(2), nullable=False)
    
    plan = db.Column(db.String(50), default='trial')
    plan_expires_at = db.Column(db.DateTime(timezone=True), nullable=True)
    trial_ends_at = db.Column(db.DateTime(timezone=True), nullable=True)
    status = db.Column(db.String(20), default='active') # active, suspended, trial
    
    custom_domain = db.Column(db.String(255), unique=True, nullable=True)
    schema_name = db.Column(db.String(63), unique=True, nullable=False)
    
    settings = db.Column(JSON().with_variant(JSONB(), 'postgresql'), default={})
    enabled_features = db.Column(JSON().with_variant(db.ARRAY(db.Text), 'postgresql'), default=[])
    
    default_language = db.Column(db.String(10), default='en')
    timezone = db.Column(db.String(100), default='UTC')
    currency = db.Column(db.String(3), default='USD')
    
    created_at = db.Column(db.DateTime(timezone=True), server_default=func.now())
    updated_at = db.Column(db.DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    def __repr__(self):
        return f'<Tenant {self.name} ({self.slug})>'

class Subscription(db.Model):
    __tablename__ = 'subscriptions'

    id = db.Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tenant_id = db.Column(UUID(as_uuid=True), db.ForeignKey('tenants.id'), nullable=False)
    
    plan = db.Column(db.String(50), nullable=False)
    student_count = db.Column(db.Integer, nullable=False)
    amount_usd = db.Column(db.Numeric(12, 2), nullable=True)
    billing_cycle = db.Column(db.String(20), nullable=True) # monthly, annual
    
    starts_at = db.Column(db.DateTime(timezone=True), nullable=False)
    ends_at = db.Column(db.DateTime(timezone=True), nullable=True)
    status = db.Column(db.String(20), default='active')
    
    payment_reference = db.Column(db.String(200), nullable=True)
    created_at = db.Column(db.DateTime(timezone=True), server_default=func.now())

    tenant = db.relationship('Tenant', backref='subscriptions')

class PlatformAuditLog(db.Model):
    __tablename__ = 'platform_audit_log'

    id = db.Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tenant_id = db.Column(UUID(as_uuid=True), db.ForeignKey('tenants.id'), nullable=True)
    actor_id = db.Column(UUID(as_uuid=True), nullable=True) # User ID (might be from different schemas)
    
    action = db.Column(db.String(200), nullable=False)
    resource_type = db.Column(db.String(100), nullable=True)
    resource_id = db.Column(db.String(200), nullable=True)
    
    details = db.Column(JSON().with_variant(JSONB(), 'postgresql'), nullable=True)
    ip_address = db.Column(db.String(45).with_variant(INET(), 'postgresql'), nullable=True)
    
    created_at = db.Column(db.DateTime(timezone=True), server_default=func.now())


class TenantMembership(db.Model):
    __tablename__ = 'tenant_memberships'
    __table_args__ = (
        db.UniqueConstraint('tenant_id', 'user_id', name='uq_tenant_membership_tenant_user'),
    )

    id = db.Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tenant_id = db.Column(UUID(as_uuid=True), db.ForeignKey('tenants.id'), nullable=False)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)

    role = db.Column(db.String(32), nullable=False)
    status = db.Column(db.String(20), default='active')
    invited_by_user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=True)

    created_at = db.Column(db.DateTime(timezone=True), server_default=func.now())
    updated_at = db.Column(db.DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    tenant = db.relationship('Tenant', backref='memberships')
    user = db.relationship('User', foreign_keys=[user_id])
    invited_by = db.relationship('User', foreign_keys=[invited_by_user_id])


class TenantInvitation(db.Model):
    __tablename__ = 'tenant_invitations'
    __table_args__ = (
        db.Index('idx_tenant_invite_token', 'token'),
    )

    id = db.Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tenant_id = db.Column(UUID(as_uuid=True), db.ForeignKey('tenants.id'), nullable=False)

    email = db.Column(db.String(255), nullable=False)
    role = db.Column(db.String(32), nullable=False)
    token = db.Column(db.String(64), unique=True, nullable=False)
    status = db.Column(db.String(20), default='pending')
    expires_at = db.Column(db.DateTime(timezone=True), nullable=True)

    invited_by_user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=True)
    created_at = db.Column(db.DateTime(timezone=True), server_default=func.now())

    tenant = db.relationship('Tenant', backref='invitations')
    invited_by = db.relationship('User', foreign_keys=[invited_by_user_id])


class PlatformInvoice(db.Model):
    __tablename__ = 'platform_invoices'
    __table_args__ = (
        db.Index('idx_platform_invoices_tenant_id', 'tenant_id'),
        db.Index('idx_platform_invoices_status', 'status'),
    )

    id = db.Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tenant_id = db.Column(UUID(as_uuid=True), db.ForeignKey('tenants.id'), nullable=False)

    invoice_number = db.Column(db.String(64), nullable=False)
    status = db.Column(db.String(20), default='draft')
    amount = db.Column(db.Numeric(12, 2), nullable=False)
    currency = db.Column(db.String(3), default='USD')

    issued_on = db.Column(db.Date, nullable=False)
    due_on = db.Column(db.Date, nullable=True)

    created_at = db.Column(db.DateTime(timezone=True), server_default=func.now())

    tenant = db.relationship('Tenant', backref='platform_invoices')


class PlatformPayment(db.Model):
    __tablename__ = 'platform_payments'
    __table_args__ = (
        db.Index('idx_platform_payments_tenant_id', 'tenant_id'),
        db.Index('idx_platform_payments_invoice_id', 'invoice_id'),
    )

    id = db.Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tenant_id = db.Column(UUID(as_uuid=True), db.ForeignKey('tenants.id'), nullable=False)
    invoice_id = db.Column(UUID(as_uuid=True), db.ForeignKey('platform_invoices.id'), nullable=True)

    amount = db.Column(db.Numeric(12, 2), nullable=False)
    currency = db.Column(db.String(3), default='USD')
    method = db.Column(db.String(50), nullable=True)
    reference = db.Column(db.String(200), nullable=True)
    paid_on = db.Column(db.Date, nullable=False)

    created_at = db.Column(db.DateTime(timezone=True), server_default=func.now())

    tenant = db.relationship('Tenant', backref='platform_payments')
    invoice = db.relationship('PlatformInvoice', backref='payments')
