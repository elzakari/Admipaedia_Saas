from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.sql import func

from app.extensions import db


class Plan(db.Model):
    __tablename__ = 'plans'
    __table_args__ = (
        db.UniqueConstraint('name', name='uq_billing_plans_name'),
        db.UniqueConstraint('slug', name='uq_billing_plans_slug'),
    )

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(64), nullable=False)
    slug = db.Column(db.String(64), nullable=False)
    description = db.Column(db.Text, nullable=True)
    price_per_student = db.Column(db.Numeric(12, 2), nullable=False, server_default='0')
    currency = db.Column(db.String(3), nullable=False, server_default='USD')
    features = db.Column(db.JSON().with_variant(JSONB(), 'postgresql'), nullable=True)
    benefits = db.Column(db.JSON().with_variant(JSONB(), 'postgresql'), nullable=True)
    is_active = db.Column(db.Boolean, nullable=False, server_default='true')
    billing_min_months = db.Column(db.Integer, nullable=False, server_default='3')
    created_at = db.Column(db.DateTime(timezone=True), server_default=func.now())
    updated_at = db.Column(db.DateTime(timezone=True), server_default=func.now(), onupdate=func.now())


class PlanFeature(db.Model):
    __tablename__ = 'plan_features'
    __table_args__ = (
        db.UniqueConstraint('plan_id', 'feature_key', name='uq_plan_features_plan_key'),
        db.Index('ix_plan_features_plan_id', 'plan_id'),
        db.Index('ix_plan_features_feature_key', 'feature_key'),
    )

    id = db.Column(db.Integer, primary_key=True)
    plan_id = db.Column(db.Integer, db.ForeignKey('plans.id'), nullable=False)
    feature_key = db.Column(db.String(128), nullable=False)
    is_enabled = db.Column(db.Boolean, nullable=False, server_default='true')
    created_at = db.Column(db.DateTime(timezone=True), server_default=func.now())
    updated_at = db.Column(db.DateTime(timezone=True), server_default=func.now(), onupdate=func.now())


class PlanLimit(db.Model):
    __tablename__ = 'plan_limits'
    __table_args__ = (
        db.UniqueConstraint('plan_id', 'limit_key', name='uq_plan_limits_plan_key'),
        db.Index('ix_plan_limits_plan_id', 'plan_id'),
        db.Index('ix_plan_limits_limit_key', 'limit_key'),
    )

    id = db.Column(db.Integer, primary_key=True)
    plan_id = db.Column(db.Integer, db.ForeignKey('plans.id'), nullable=False)
    limit_key = db.Column(db.String(128), nullable=False)
    limit_value = db.Column(db.Text, nullable=True)
    value_type = db.Column(db.String(16), nullable=False, server_default='string')
    created_at = db.Column(db.DateTime(timezone=True), server_default=func.now())
    updated_at = db.Column(db.DateTime(timezone=True), server_default=func.now(), onupdate=func.now())


class SchoolPlanSubscription(db.Model):
    __tablename__ = 'school_plan_subscriptions'
    __table_args__ = (
        db.Index('idx_school_plan_subs_school_status', 'school_id', 'status'),
    )

    id = db.Column(db.Integer, primary_key=True)
    school_id = db.Column(UUID(as_uuid=True), db.ForeignKey('tenants.id'), nullable=False, index=True)
    plan_id = db.Column(db.Integer, db.ForeignKey('plans.id'), nullable=False, index=True)
    starts_at = db.Column(db.Date, nullable=False)
    ends_at = db.Column(db.Date, nullable=True)
    status = db.Column(db.String(20), nullable=False, server_default='active')
    price_per_student_snapshot = db.Column(db.Numeric(12, 2), nullable=True)
    currency_snapshot = db.Column(db.String(3), nullable=True)
    features_snapshot = db.Column(db.JSON().with_variant(JSONB(), 'postgresql'), nullable=True)
    limits_snapshot = db.Column(db.JSON().with_variant(JSONB(), 'postgresql'), nullable=True)
    created_at = db.Column(db.DateTime(timezone=True), server_default=func.now())
    updated_at = db.Column(db.DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    plan = db.relationship('Plan', backref=db.backref('subscriptions', lazy=True))


class SchoolFeatureOverride(db.Model):
    __tablename__ = 'school_feature_overrides'
    __table_args__ = (
        db.UniqueConstraint('school_id', 'feature_key', name='uq_school_feature_overrides_school_key'),
        db.Index('ix_school_feature_overrides_school_id', 'school_id'),
        db.Index('ix_school_feature_overrides_feature_key', 'feature_key'),
    )

    id = db.Column(db.Integer, primary_key=True)
    school_id = db.Column(UUID(as_uuid=True), db.ForeignKey('tenants.id'), nullable=False)
    feature_key = db.Column(db.String(128), nullable=False)
    is_enabled = db.Column(db.Boolean, nullable=False)
    reason = db.Column(db.Text, nullable=True)
    created_by = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=True)
    created_at = db.Column(db.DateTime(timezone=True), server_default=func.now())
    updated_at = db.Column(db.DateTime(timezone=True), server_default=func.now(), onupdate=func.now())


class SchoolLimitOverride(db.Model):
    __tablename__ = 'school_limit_overrides'
    __table_args__ = (
        db.UniqueConstraint('school_id', 'limit_key', name='uq_school_limit_overrides_school_key'),
        db.Index('ix_school_limit_overrides_school_id', 'school_id'),
        db.Index('ix_school_limit_overrides_limit_key', 'limit_key'),
    )

    id = db.Column(db.Integer, primary_key=True)
    school_id = db.Column(UUID(as_uuid=True), db.ForeignKey('tenants.id'), nullable=False)
    limit_key = db.Column(db.String(128), nullable=False)
    limit_value = db.Column(db.Text, nullable=True)
    value_type = db.Column(db.String(16), nullable=False, server_default='string')
    reason = db.Column(db.Text, nullable=True)
    created_by = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=True)
    created_at = db.Column(db.DateTime(timezone=True), server_default=func.now())
    updated_at = db.Column(db.DateTime(timezone=True), server_default=func.now(), onupdate=func.now())


class StudentTermRegistration(db.Model):
    __tablename__ = 'student_term_registrations'
    __table_args__ = (
        db.UniqueConstraint('tenant_id', 'academic_term_id', 'student_id', name='uq_student_term_registration'),
        db.Index('idx_str_tenant_term_status', 'tenant_id', 'academic_term_id', 'registration_status', 'student_status'),
    )

    id = db.Column(db.Integer, primary_key=True)
    tenant_id = db.Column(UUID(as_uuid=True), db.ForeignKey('tenants.id'), nullable=False, index=True)
    student_id = db.Column(db.Integer, db.ForeignKey('students.id'), nullable=False, index=True)
    academic_term_id = db.Column(db.Integer, db.ForeignKey('academic_terms.id'), nullable=False, index=True)
    registration_status = db.Column(db.String(20), nullable=False, server_default='registered')
    student_status = db.Column(db.String(20), nullable=False, server_default='active')
    registered_at = db.Column(db.DateTime(timezone=True), nullable=True)
    created_at = db.Column(db.DateTime(timezone=True), server_default=func.now())
    updated_at = db.Column(db.DateTime(timezone=True), server_default=func.now(), onupdate=func.now())


class BillingInvoice(db.Model):
    __tablename__ = 'billing_invoices'
    __table_args__ = (
        db.UniqueConstraint('tenant_id', 'academic_term_id', name='uq_billing_invoice_tenant_term'),
        db.UniqueConstraint('invoice_number', name='uq_billing_invoice_number'),
        db.Index('idx_billing_invoices_tenant_status', 'tenant_id', 'status'),
    )

    id = db.Column(db.Integer, primary_key=True)
    invoice_number = db.Column(db.String(64), nullable=False)
    tenant_id = db.Column(UUID(as_uuid=True), db.ForeignKey('tenants.id'), nullable=False, index=True)
    plan_id = db.Column(db.Integer, db.ForeignKey('plans.id'), nullable=False, index=True)
    academic_term_id = db.Column(db.Integer, db.ForeignKey('academic_terms.id'), nullable=False, index=True)

    price_per_student_snapshot = db.Column(db.Numeric(12, 2), nullable=False)
    billing_months = db.Column(db.Integer, nullable=False, server_default='3')
    active_student_count = db.Column(db.Integer, nullable=False, server_default='0')

    subtotal = db.Column(db.Numeric(12, 2), nullable=False, server_default='0')
    discount_amount = db.Column(db.Numeric(12, 2), nullable=False, server_default='0')
    tax_amount = db.Column(db.Numeric(12, 2), nullable=False, server_default='0')
    total_amount = db.Column(db.Numeric(12, 2), nullable=False, server_default='0')
    currency = db.Column(db.String(3), nullable=False)

    status = db.Column(db.String(20), nullable=False, server_default='pending')
    due_date = db.Column(db.Date, nullable=True)
    paid_at = db.Column(db.DateTime(timezone=True), nullable=True)

    payment_status = db.Column(db.String(20), nullable=False, server_default='unpaid')
    payment_link = db.Column(db.Text, nullable=True)
    payment_reference = db.Column(db.String(200), nullable=True)
    gateway_name = db.Column(db.String(64), nullable=True)
    amount_paid = db.Column(db.Numeric(12, 2), nullable=False, server_default='0')
    balance_due = db.Column(db.Numeric(12, 2), nullable=False, server_default='0')
    created_at = db.Column(db.DateTime(timezone=True), server_default=func.now())
    updated_at = db.Column(db.DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    plan = db.relationship('Plan', backref=db.backref('invoices', lazy=True))


# NOTE: BillingInvoicePayment (billing_invoice_payments) has been consolidated
# into the Payment model in app/models/payments.py, which now owns this table
# with the full schema including manual_method, idempotency_key, gateway_name, etc.
# The Payment.invoice relationship carries backref='gateway_payments' on BillingInvoice.


class PlanPricingTier(db.Model):
    __tablename__ = 'plan_pricing_tiers'
    __table_args__ = (
        db.Index('idx_plan_pricing_tiers_plan_country_currency_active', 'plan_id', 'country_code', 'currency', 'is_active'),
        db.Index('idx_plan_pricing_tiers_plan_range', 'plan_id', 'min_students', 'max_students'),
    )

    id = db.Column(db.Integer, primary_key=True)
    plan_id = db.Column(db.Integer, db.ForeignKey('plans.id'), nullable=False, index=True)

    country_code = db.Column(db.String(2), nullable=True)
    currency = db.Column(db.String(3), nullable=False)

    min_students = db.Column(db.Integer, nullable=False)
    max_students = db.Column(db.Integer, nullable=True)

    price_per_student_month = db.Column(db.Numeric(12, 2), nullable=False)
    is_active = db.Column(db.Boolean, nullable=False, server_default=db.text('true'))

    created_at = db.Column(db.DateTime(timezone=True), server_default=func.now())
    updated_at = db.Column(db.DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    plan = db.relationship('Plan', backref=db.backref('pricing_tiers', lazy=True, cascade='all, delete-orphan'))


class SubscriptionChangeRequest(db.Model):
    __tablename__ = 'subscription_change_requests'
    __table_args__ = (
        db.Index('idx_subscription_change_school_status', 'school_id', 'status'),
        db.Index('idx_subscription_change_status_created', 'status', 'created_at'),
    )

    id = db.Column(db.Integer, primary_key=True)
    school_id = db.Column(UUID(as_uuid=True), db.ForeignKey('tenants.id'), nullable=False, index=True)
    requested_plan_id = db.Column(db.Integer, db.ForeignKey('plans.id'), nullable=False, index=True)
    request_type = db.Column(db.String(16), nullable=False)
    status = db.Column(db.String(16), nullable=False, server_default='pending')

    effective_academic_term_id = db.Column(db.Integer, db.ForeignKey('academic_terms.id'), nullable=True)
    effective_date = db.Column(db.Date, nullable=True)

    created_by_user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=True)
    approved_by_user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=True)
    decision_note = db.Column(db.Text, nullable=True)
    decided_at = db.Column(db.DateTime(timezone=True), nullable=True)

    created_at = db.Column(db.DateTime(timezone=True), server_default=func.now())
    updated_at = db.Column(db.DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    requested_plan = db.relationship('Plan', backref=db.backref('change_requests', lazy=True))


class PendingInvoiceAdjustment(db.Model):
    __tablename__ = 'pending_invoice_adjustments'
    __table_args__ = (
        db.Index('idx_pending_invoice_adj_tenant_status', 'tenant_id', 'status'),
    )

    id = db.Column(db.Integer, primary_key=True)
    tenant_id = db.Column(UUID(as_uuid=True), db.ForeignKey('tenants.id'), nullable=False, index=True)
    invoice_id = db.Column(db.Integer, db.ForeignKey('billing_invoices.id'), nullable=True, index=True)
    amount = db.Column(db.Numeric(12, 2), nullable=False, server_default='0')
    currency = db.Column(db.String(3), nullable=False, server_default='USD')
    description = db.Column(db.Text, nullable=True)
    status = db.Column(db.String(20), nullable=False, server_default='pending') # pending, billed

    created_at = db.Column(db.DateTime(timezone=True), server_default=func.now())
    updated_at = db.Column(db.DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

