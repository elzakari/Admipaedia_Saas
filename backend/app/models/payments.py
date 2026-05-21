from __future__ import annotations

from datetime import datetime
import uuid

from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.sql import func
from sqlalchemy import JSON

from app.extensions import db
from app.utils.secret_crypto import encrypt_value, decrypt_value


class PaymentGateway(db.Model):
    __tablename__ = 'payment_gateways'
    __table_args__ = (
        db.Index('idx_payment_gateways_country_currency_active', 'country_code', 'currency', 'is_active'),
        db.Index('idx_payment_gateways_name_active', 'name', 'is_active'),
    )

    id = db.Column(db.Integer, primary_key=True)

    name = db.Column(db.String(64), nullable=False)
    display_name = db.Column(db.String(128), nullable=True)

    country_code = db.Column(db.String(2), nullable=True)
    currency = db.Column(db.String(3), nullable=True)

    public_key = db.Column(db.String(255), nullable=True)
    secret_key_encrypted = db.Column(db.Text, nullable=True)
    webhook_secret_encrypted = db.Column(db.Text, nullable=True)

    is_active = db.Column(db.Boolean, nullable=False, server_default=db.text('true'))
    is_default = db.Column(db.Boolean, nullable=False, server_default=db.text('false'))

    supported_channels = db.Column(JSON().with_variant(JSONB(), 'postgresql'), default=list)
    environment = db.Column(db.String(16), nullable=False, server_default='sandbox')

    created_at = db.Column(db.DateTime(timezone=True), server_default=func.now())
    updated_at = db.Column(db.DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    def _crypto_secret(self) -> tuple[str, str]:
        from flask import current_app

        secret = current_app.config.get('SECRET_KEY') or ''
        salt = current_app.config.get('SECURITY_PASSWORD_SALT') or ''
        return secret, salt

    def set_secret_key(self, value: str | None):
        secret, salt = self._crypto_secret()
        self.secret_key_encrypted = encrypt_value(value, secret=secret, salt=salt)

    def get_secret_key(self) -> str | None:
        if not self.secret_key_encrypted:
            return None
        secret, salt = self._crypto_secret()
        return decrypt_value(self.secret_key_encrypted, secret=secret, salt=salt)

    def set_webhook_secret(self, value: str | None):
        secret, salt = self._crypto_secret()
        self.webhook_secret_encrypted = encrypt_value(value, secret=secret, salt=salt)

    def get_webhook_secret(self) -> str | None:
        if not self.webhook_secret_encrypted:
            return None
        secret, salt = self._crypto_secret()
        return decrypt_value(self.webhook_secret_encrypted, secret=secret, salt=salt)


class Payment(db.Model):
    __tablename__ = 'billing_invoice_payments'
    __table_args__ = (
        db.Index('idx_billing_invoice_payments_invoice', 'invoice_id'),
        # Index references the DB column name 'tenant_id' (mapped from school_id attr)
        db.Index('idx_billing_invoice_payments_school', 'tenant_id'),
        db.Index('idx_billing_invoice_payments_reference', 'payment_reference'),
        db.UniqueConstraint('gateway_name', 'payment_reference', name='uq_billing_invoice_payments_gateway_reference'),
    )

    id = db.Column(db.Integer, primary_key=True)

    invoice_id = db.Column(db.Integer, db.ForeignKey('billing_invoices.id'), nullable=False)

    # `school_id` is the canonical Python attribute name used throughout the application
    # (views, serializers, service methods).  The DB column is named `tenant_id` — the
    # original NOT NULL column from the first migration.  The `name` parameter below
    # ensures SQLAlchemy maps writes from this attribute directly to the `tenant_id`
    # DB column, eliminating the school_id/tenant_id desync that caused NULL violations.
    school_id = db.Column(
        UUID(as_uuid=True),
        db.ForeignKey('tenants.id'),
        nullable=False,
        index=True,
        name='tenant_id',       # canonical DB column name
    )

    payment_gateway_id = db.Column(db.Integer, db.ForeignKey('payment_gateways.id'), nullable=True)
    gateway_name = db.Column(db.String(64), nullable=False)

    payment_reference = db.Column(db.String(200), nullable=False)
    gateway_transaction_id = db.Column(db.String(200), nullable=True)

    amount = db.Column(db.Numeric(12, 2), nullable=False)
    currency = db.Column(db.String(3), nullable=False)

    payment_channel = db.Column(db.String(32), nullable=False)
    status = db.Column(db.String(16), nullable=False, server_default='pending')

    payment_link = db.Column(db.Text, nullable=True)
    gateway_response = db.Column(JSON().with_variant(JSONB(), 'postgresql'), nullable=True)

    # paid_at is NULL for pending/failed payments; set only when status → successful
    paid_at = db.Column(db.DateTime(timezone=True), nullable=True)
    verified_at = db.Column(db.DateTime(timezone=True), nullable=True)

    submitted_by_user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=True)
    reviewed_by_user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=True)
    review_note = db.Column(db.Text, nullable=True)
    reviewed_at = db.Column(db.DateTime(timezone=True), nullable=True)

    proof_path = db.Column(db.String(512), nullable=True)
    manual_method = db.Column(db.String(32), nullable=True)
    manual_reference = db.Column(db.String(200), nullable=True)
    manual_paid_at = db.Column(db.DateTime(timezone=True), nullable=True)

    idempotency_key = db.Column(db.String(64), nullable=True, unique=True)

    created_at = db.Column(db.DateTime(timezone=True), server_default=func.now())
    updated_at = db.Column(db.DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    gateway = db.relationship('PaymentGateway', backref=db.backref('payments', lazy=True))
    invoice = db.relationship('BillingInvoice', backref=db.backref('payments', lazy=True, cascade='all, delete-orphan'))


def new_reference(prefix: str = 'PMT') -> str:
    return f"{prefix}-{uuid.uuid4().hex[:20]}"

