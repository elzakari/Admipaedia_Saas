from __future__ import annotations

import json
import uuid
from datetime import datetime
from typing import Any, Optional

from sqlalchemy import JSON
from sqlalchemy.dialects.postgresql import JSONB, UUID as PGUUID
from sqlalchemy.sql import func

from app.extensions import db
from app.utils.secret_crypto import encrypt_value, decrypt_value


def _uuid_type():
    return db.String(36).with_variant(PGUUID(as_uuid=True), 'postgresql')


def _json_type():
    return JSON().with_variant(JSONB(), 'postgresql')


class _EncryptedConfigMixin:
    config_encrypted = db.Column(db.Text, nullable=True)

    def _crypto_secret(self) -> tuple[str, str]:
        from flask import current_app

        secret = current_app.config.get('SECRET_KEY') or ''
        salt = current_app.config.get('SECURITY_PASSWORD_SALT') or ''
        return secret, salt

    def set_config(self, value: Optional[dict[str, Any]]):
        secret, salt = self._crypto_secret()
        payload = None if value is None else json.dumps(value, separators=(',', ':'))
        self.config_encrypted = encrypt_value(payload, secret=secret, salt=salt)

    def get_config(self) -> Optional[dict[str, Any]]:
        if not self.config_encrypted:
            return None
        secret, salt = self._crypto_secret()
        raw = decrypt_value(self.config_encrypted, secret=secret, salt=salt)
        if not raw:
            return None
        try:
            parsed = json.loads(raw)
        except Exception:
            return None
        if isinstance(parsed, dict):
            return parsed
        return None


class PlatformServiceProviderConfig(db.Model, _EncryptedConfigMixin):
    __tablename__ = 'platform_service_provider_configs'
    __table_args__ = (
        db.Index('ix_platform_provider_service', 'service_type'),
        db.Index('ix_platform_provider_active', 'service_type', 'is_active'),
    )

    id = db.Column(db.Integer, primary_key=True)
    service_type = db.Column(db.String(32), nullable=False)
    provider_key = db.Column(db.String(64), nullable=False)
    display_name = db.Column(db.String(128), nullable=True)
    priority = db.Column(db.Integer, nullable=False, server_default=db.text('100'))
    is_active = db.Column(db.Boolean, nullable=False, server_default=db.text('true'))

    created_at = db.Column(db.DateTime(timezone=True), server_default=func.now())
    updated_at = db.Column(db.DateTime(timezone=True), server_default=func.now(), onupdate=func.now())


class TenantServiceProviderOverride(db.Model, _EncryptedConfigMixin):
    __tablename__ = 'tenant_service_provider_overrides'
    __table_args__ = (
        db.UniqueConstraint('tenant_id', 'service_type', 'provider_key', name='uq_tenant_provider_override'),
        db.Index('ix_tenant_provider_override_tenant', 'tenant_id'),
        db.Index('ix_tenant_provider_override_service', 'tenant_id', 'service_type'),
    )

    id = db.Column(db.Integer, primary_key=True)
    tenant_id = db.Column(_uuid_type(), db.ForeignKey('tenants.id'), nullable=False)
    service_type = db.Column(db.String(32), nullable=False)
    provider_key = db.Column(db.String(64), nullable=False)
    display_name = db.Column(db.String(128), nullable=True)
    priority = db.Column(db.Integer, nullable=False, server_default=db.text('100'))
    is_active = db.Column(db.Boolean, nullable=False, server_default=db.text('true'))
    source = db.Column(db.String(32), nullable=False, server_default='manual')

    created_at = db.Column(db.DateTime(timezone=True), server_default=func.now())
    updated_at = db.Column(db.DateTime(timezone=True), server_default=func.now(), onupdate=func.now())


class TenantServiceToken(db.Model):
    __tablename__ = 'tenant_service_tokens'
    __table_args__ = (
        db.UniqueConstraint('tenant_id', 'service_type', name='uq_tenant_service_token'),
        db.Index('ix_tenant_service_tokens_tenant', 'tenant_id'),
        db.Index('ix_tenant_service_tokens_active', 'tenant_id', 'service_type', 'status'),
        db.Index('ix_tenant_service_tokens_hash', 'token_hash'),
    )

    id = db.Column(_uuid_type(), primary_key=True, default=lambda: str(uuid.uuid4()))
    tenant_id = db.Column(_uuid_type(), db.ForeignKey('tenants.id'), nullable=False)
    service_type = db.Column(db.String(32), nullable=False)
    token_hash = db.Column(db.String(128), nullable=False)
    token_last4 = db.Column(db.String(8), nullable=False)
    status = db.Column(db.String(16), nullable=False, server_default='active')

    provisioned_plan_id = db.Column(db.Integer, db.ForeignKey('plans.id'), nullable=True)
    monthly_allowance = db.Column(db.String(32), nullable=True)

    created_at = db.Column(db.DateTime(timezone=True), server_default=func.now())
    rotated_at = db.Column(db.DateTime(timezone=True), nullable=True)
    revoked_at = db.Column(db.DateTime(timezone=True), nullable=True)
    last_used_at = db.Column(db.DateTime(timezone=True), nullable=True)

    def mark_rotated(self):
        self.rotated_at = datetime.utcnow()

    def mark_used(self):
        self.last_used_at = datetime.utcnow()


class TenantServiceTokenUsage(db.Model):
    __tablename__ = 'tenant_service_token_usage'
    __table_args__ = (
        db.UniqueConstraint('tenant_id', 'service_type', 'year', 'month', name='uq_tenant_service_token_usage_period'),
        db.Index('ix_tenant_token_usage_tenant', 'tenant_id'),
        db.Index('ix_tenant_token_usage_period', 'year', 'month'),
    )

    id = db.Column(db.Integer, primary_key=True)
    tenant_id = db.Column(_uuid_type(), db.ForeignKey('tenants.id'), nullable=False)
    service_type = db.Column(db.String(32), nullable=False)
    year = db.Column(db.Integer, nullable=False)
    month = db.Column(db.Integer, nullable=False)
    used_count = db.Column(db.Integer, nullable=False, server_default=db.text('0'))

    created_at = db.Column(db.DateTime(timezone=True), server_default=func.now())
    updated_at = db.Column(db.DateTime(timezone=True), server_default=func.now(), onupdate=func.now())


class TenantServiceTokenEvent(db.Model):
    __tablename__ = 'tenant_service_token_events'
    __table_args__ = (
        db.Index('ix_tenant_token_events_tenant', 'tenant_id'),
        db.Index('ix_tenant_token_events_service', 'tenant_id', 'service_type'),
        db.Index('ix_tenant_token_events_created', 'created_at'),
    )

    id = db.Column(_uuid_type(), primary_key=True, default=lambda: str(uuid.uuid4()))
    tenant_id = db.Column(_uuid_type(), db.ForeignKey('tenants.id'), nullable=True)
    token_id = db.Column(_uuid_type(), db.ForeignKey('tenant_service_tokens.id'), nullable=True)
    service_type = db.Column(db.String(32), nullable=False)
    event_type = db.Column(db.String(32), nullable=False)

    actor_user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=True)
    ip_address = db.Column(db.String(64), nullable=True)
    user_agent = db.Column(db.Text, nullable=True)
    details = db.Column(_json_type(), nullable=True)

    created_at = db.Column(db.DateTime(timezone=True), server_default=func.now())
