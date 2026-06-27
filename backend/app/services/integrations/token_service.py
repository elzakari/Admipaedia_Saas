from __future__ import annotations

import hmac
import hashlib
import secrets
from dataclasses import dataclass
from datetime import datetime
from typing import Any, Optional, Tuple

from flask import current_app, request

from app.extensions import db
from app.models.billing import Plan
from app.models.service_tokens import (
    TenantServiceToken,
    TenantServiceTokenUsage,
    TenantServiceTokenEvent,
)
from app.services.entitlements.service import EntitlementService


SERVICE_TYPES = ('email', 'sms', 'whatsapp', 'ai')

SERVICE_FEATURE_KEYS = {
    'email': 'integrations.email',
    'sms': 'integrations.sms',
    'whatsapp': 'integrations.whatsapp',
    'ai': 'ai.external'
}

SERVICE_LIMIT_KEYS = {
    'email': 'tokens.email.monthly',
    'sms': 'tokens.sms.monthly',
    'whatsapp': 'tokens.whatsapp.monthly',
    'ai': 'tokens.ai.monthly'
}


def _as_uuid(value):
    import uuid

    return value if isinstance(value, uuid.UUID) else uuid.UUID(str(value))


def _as_db_tenant_id(value: str):
    try:
        tid = _as_uuid(value)
    except Exception:
        return value
    if db.engine.dialect.name == 'sqlite':
        return str(tid)
    return tid


def _token_pepper() -> str:
    secret = current_app.config.get('SECRET_KEY') or ''
    salt = current_app.config.get('SECURITY_PASSWORD_SALT') or ''
    return f'{secret}:{salt}'


def hash_token(plain_token: str) -> str:
    key = _token_pepper().encode('utf-8')
    return hmac.new(key, plain_token.encode('utf-8'), hashlib.sha256).hexdigest()


def tokens_equal(hash_a: str, hash_b: str) -> bool:
    return hmac.compare_digest(str(hash_a or ''), str(hash_b or ''))


def generate_token_plain() -> str:
    return f'adm_{secrets.token_urlsafe(32)}'


def _parse_allowance(value: Any) -> Tuple[Optional[int], bool]:
    if value is None:
        return None, False
    if isinstance(value, str) and value.strip().lower() in ('unlimited', 'contracted'):
        return None, True
    try:
        n = int(float(value))
        if n < 0:
            n = 0
        return n, False
    except Exception:
        return None, False


def current_period_ym() -> tuple[int, int]:
    now = datetime.utcnow()
    return now.year, now.month


@dataclass
class TokenStatus:
    tenant_id: str
    service_type: str
    allowance: Optional[int]
    unlimited: bool
    used: int

    @property
    def remaining(self) -> Optional[int]:
        if self.unlimited:
            return None
        if self.allowance is None:
            return 0
        return max(0, int(self.allowance) - int(self.used))


class ServiceTokenService:
    @staticmethod
    def _desired_allowance_for_tenant(tenant_id: str, service_type: str) -> tuple[Optional[int], bool, Optional[int]]:
        active, err = EntitlementService.getSchoolActivePlan(tenant_id)
        if err or not active:
            return 0, False, None

        plan_id = int(active.plan.id)
        feature_key = SERVICE_FEATURE_KEYS.get(service_type)
        if feature_key and not EntitlementService.hasFeature(tenant_id, feature_key):
            return 0, False, plan_id

        limits, _ = EntitlementService.getSchoolLimits(tenant_id)
        limit_key = SERVICE_LIMIT_KEYS.get(service_type)
        raw = (limits or {}).get(limit_key)
        allowance, unlimited = _parse_allowance(raw)
        if unlimited:
            return None, True, plan_id
        return allowance if allowance is not None else 0, False, plan_id

    @staticmethod
    def _event(
        *,
        tenant_id: Optional[str],
        service_type: str,
        event_type: str,
        token_id: Optional[str] = None,
        actor_user_id: Optional[int] = None,
        details: Optional[dict[str, Any]] = None,
    ):
        clean_tenant = None if str(tenant_id) == 'None' or not tenant_id else tenant_id
        clean_token = None if str(token_id) == 'None' or not token_id else token_id
        
        ev = TenantServiceTokenEvent(
            tenant_id=clean_tenant,
            token_id=clean_token,
            service_type=service_type,
            event_type=event_type,
            actor_user_id=actor_user_id,
            ip_address=getattr(request, 'remote_addr', None),
            user_agent=request.headers.get('User-Agent') if request else None,
            details=details or None,
        )
        db.session.add(ev)

    @staticmethod
    def provision_for_tenant(tenant_id: str, actor_user_id: Optional[int] = None) -> dict[str, Optional[str]]:
        issued: dict[str, Optional[str]] = {k: None for k in SERVICE_TYPES}
        tid_uuid = _as_uuid(tenant_id)
        tid_db = _as_db_tenant_id(tenant_id)
        for service_type in SERVICE_TYPES:
            allowance, unlimited, plan_id = ServiceTokenService._desired_allowance_for_tenant(str(tid_uuid), service_type)
            token = TenantServiceToken.query.filter_by(tenant_id=tid_db, service_type=service_type).first()

            if not token:
                plain = generate_token_plain()
                token = TenantServiceToken(
                    tenant_id=tid_db,
                    service_type=service_type,
                    token_hash=hash_token(plain),
                    token_last4=plain[-4:],
                    status='active',
                    provisioned_plan_id=plan_id,
                    monthly_allowance='unlimited' if unlimited else str(int(allowance or 0)),
                )
                db.session.add(token)
                db.session.flush()
                ServiceTokenService._event(
                    tenant_id=str(tid_uuid),
                    service_type=service_type,
                    event_type='issued',
                    token_id=str(token.id),
                    actor_user_id=actor_user_id,
                    details={'plan_id': plan_id, 'allowance': token.monthly_allowance},
                )
                issued[service_type] = plain
                continue

            token.provisioned_plan_id = plan_id
            token.monthly_allowance = 'unlimited' if unlimited else str(int(allowance or 0))
        return issued

    @staticmethod
    def rotate_token(tenant_id: str, service_type: str, actor_user_id: Optional[int] = None) -> str:
        if service_type not in SERVICE_TYPES:
            raise ValueError('Invalid service type')

        tid_uuid = _as_uuid(tenant_id)
        tid_db = _as_db_tenant_id(tenant_id)
        token = TenantServiceToken.query.filter_by(tenant_id=tid_db, service_type=service_type).first()
        if not token:
            ServiceTokenService.provision_for_tenant(str(tid_uuid), actor_user_id=actor_user_id)
            token = TenantServiceToken.query.filter_by(tenant_id=tid_db, service_type=service_type).first()

        plain = generate_token_plain()
        token.token_hash = hash_token(plain)
        token.token_last4 = plain[-4:]
        token.status = 'active'
        token.mark_rotated()
        token.revoked_at = None
        ServiceTokenService._event(
            tenant_id=str(tid_uuid),
            service_type=service_type,
            event_type='rotated',
            token_id=str(token.id),
            actor_user_id=actor_user_id,
        )
        return plain

    @staticmethod
    def _usage_row(tenant_id: str, service_type: str, year: int, month: int) -> TenantServiceTokenUsage:
        tid_db = _as_db_tenant_id(tenant_id)
        row = (
            TenantServiceTokenUsage.query.filter_by(
                tenant_id=tid_db,
                service_type=service_type,
                year=year,
                month=month,
            )
            .with_for_update()
            .first()
        )
        if row:
            return row
        row = TenantServiceTokenUsage(tenant_id=tid_db, service_type=service_type, year=year, month=month, used_count=0)
        db.session.add(row)
        db.session.flush()
        return row

    @staticmethod
    def get_status(tenant_id: str, service_type: str) -> TokenStatus:
        tid_uuid = _as_uuid(tenant_id)
        tid_db = _as_db_tenant_id(tenant_id)
        token = TenantServiceToken.query.filter_by(tenant_id=tid_db, service_type=service_type).first()
        if not token or token.status != 'active':
            return TokenStatus(tenant_id=str(tid_uuid), service_type=service_type, allowance=0, unlimited=False, used=0)
        allowance, unlimited = _parse_allowance(token.monthly_allowance)
        year, month = current_period_ym()
        usage = TenantServiceTokenUsage.query.filter_by(tenant_id=tid_db, service_type=service_type, year=year, month=month).first()
        used = int(getattr(usage, 'used_count', 0) or 0)
        return TokenStatus(tenant_id=str(tid_uuid), service_type=service_type, allowance=allowance, unlimited=unlimited, used=used)

    @staticmethod
    def get_status_map(tenant_id: str, service_types: tuple[str, ...] = SERVICE_TYPES) -> dict[str, TokenStatus]:
        tid_uuid = _as_uuid(tenant_id)
        tid_db = _as_db_tenant_id(tenant_id)
        year, month = current_period_ym()

        tokens = (
            TenantServiceToken.query
            .filter(
                TenantServiceToken.tenant_id == tid_db,
                TenantServiceToken.service_type.in_(service_types)
            )
            .all()
        )
        usage_rows = (
            TenantServiceTokenUsage.query
            .filter(
                TenantServiceTokenUsage.tenant_id == tid_db,
                TenantServiceTokenUsage.service_type.in_(service_types),
                TenantServiceTokenUsage.year == year,
                TenantServiceTokenUsage.month == month,
            )
            .all()
        )

        token_map = {str(row.service_type): row for row in tokens}
        usage_map = {str(row.service_type): int(getattr(row, 'used_count', 0) or 0) for row in usage_rows}

        result: dict[str, TokenStatus] = {}
        for service_type in service_types:
            token = token_map.get(service_type)
            if not token or token.status != 'active':
                result[service_type] = TokenStatus(
                    tenant_id=str(tid_uuid),
                    service_type=service_type,
                    allowance=0,
                    unlimited=False,
                    used=0,
                )
                continue

            allowance, unlimited = _parse_allowance(token.monthly_allowance)
            result[service_type] = TokenStatus(
                tenant_id=str(tid_uuid),
                service_type=service_type,
                allowance=allowance,
                unlimited=unlimited,
                used=usage_map.get(service_type, 0),
            )
        return result

    @staticmethod
    def validate_token(plain_token: str, service_type: str, tenant_id_hint: Optional[str] = None) -> tuple[Optional[TenantServiceToken], Optional[str]]:
        if service_type not in SERVICE_TYPES:
            return None, 'Invalid service type'
        if not plain_token or len(plain_token) < 16:
            return None, 'Invalid token'

        h = hash_token(plain_token)
        q = TenantServiceToken.query.filter_by(token_hash=h, service_type=service_type, status='active')
        token = q.first()
        if not token:
            ServiceTokenService._event(
                tenant_id=tenant_id_hint,
                service_type=service_type,
                event_type='validation_failed',
                details={'reason': 'not_found'},
            )
            return None, 'Invalid token'

        if tenant_id_hint and str(token.tenant_id) != str(_as_uuid(tenant_id_hint)):
            ServiceTokenService._event(
                tenant_id=str(token.tenant_id),
                service_type=service_type,
                event_type='validation_failed',
                token_id=str(token.id),
                details={'reason': 'tenant_mismatch', 'tenant_id_hint': tenant_id_hint},
            )
            return None, 'Invalid token'

        token.mark_used()
        return token, None

    @staticmethod
    def consume(plain_token: str, service_type: str, amount: int = 1, tenant_id_hint: Optional[str] = None) -> tuple[Optional[TokenStatus], Optional[str], int]:
        if amount <= 0:
            amount = 1

        token, err = ServiceTokenService.validate_token(plain_token, service_type, tenant_id_hint=tenant_id_hint)
        if err or not token:
            db.session.commit()
            return None, err or 'Invalid token', 401

        tenant_id = str(token.tenant_id)
        year, month = current_period_ym()
        allowance, unlimited = _parse_allowance(token.monthly_allowance)

        usage = ServiceTokenService._usage_row(tenant_id, service_type, year, month)
        used = int(usage.used_count or 0)

        if not unlimited:
            allowed = int(allowance or 0)
            if used + amount > allowed:
                ServiceTokenService._event(
                    tenant_id=tenant_id,
                    service_type=service_type,
                    event_type='quota_exceeded',
                    token_id=str(token.id),
                    details={'allowed': allowed, 'used': used, 'attempted': amount},
                )
                db.session.commit()
                return TokenStatus(tenant_id=tenant_id, service_type=service_type, allowance=allowed, unlimited=False, used=used), 'Quota exceeded', 429

        usage.used_count = used + amount
        ServiceTokenService._event(
            tenant_id=tenant_id,
            service_type=service_type,
            event_type='used',
            token_id=str(token.id),
            details={'amount': amount, 'year': year, 'month': month},
        )
        db.session.commit()
        status = ServiceTokenService.get_status(tenant_id, service_type)
        return status, None, 200

    @staticmethod
    def ensure_plan_limits_exist():
        for key in SERVICE_LIMIT_KEYS.values():
            if not Plan.query.first():
                break
            _ = key
