import base64
import hmac
import hashlib
import secrets
from datetime import datetime, timedelta, timezone
from typing import Optional

from flask import current_app, request

from app.extensions import db
from app.middleware.security_middleware import rate_limiter
from app.models.invitation import (
    InvitationLink,
    InvitationEvent,
    INVITATION_INVITEE_TYPES,
    INVITATION_EVENT_TYPES,
)


def _secret_bytes() -> bytes:
    secret = (
        current_app.config.get('INVITATION_SIGNING_SECRET')
        or current_app.config.get('SECRET_KEY')
        or ''
    )
    return str(secret).encode('utf-8')


def _b64url(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).decode('utf-8').rstrip('=')


def _sha256_hex(value: str) -> str:
    return hashlib.sha256((value or '').encode('utf-8')).hexdigest()


def _msg_v1(invite: InvitationLink, exp_ts: int) -> str:
    return f"v1:{invite.id}:{invite.tenant_id}:{invite.invitee_type}:{exp_ts}:{invite.nonce_hash}"


def sign_invitation(invite: InvitationLink) -> tuple[int, str]:
    exp_ts = int(invite.expires_at.timestamp())
    mac = hmac.new(_secret_bytes(), _msg_v1(invite, exp_ts).encode('utf-8'), hashlib.sha256).digest()
    return exp_ts, _b64url(mac)


def verify_invitation_signature(invite: InvitationLink, exp_ts: int, sig: str) -> bool:
    if not sig:
        return False
    mac = hmac.new(_secret_bytes(), _msg_v1(invite, exp_ts).encode('utf-8'), hashlib.sha256).digest()
    expected = _b64url(mac)
    if not secrets.compare_digest(expected, sig):
        return False
    if invite.sig_hash and not secrets.compare_digest(invite.sig_hash, _sha256_hex(sig)):
        return False
    return True


def _event(invite_id, event_type: str, tenant_id=None, actor_user_id: Optional[int] = None, metadata: Optional[dict] = None):
    if event_type not in INVITATION_EVENT_TYPES:
        event_type = 'validation_failed'
    ev = InvitationEvent(
        invite_id=invite_id,
        event_type=event_type,
        actor_user_id=actor_user_id,
        tenant_id=tenant_id,
        ip_address=request.remote_addr,
        user_agent=request.headers.get('User-Agent'),
        metadata_json=metadata or None,
    )
    db.session.add(ev)
    return ev


def enforce_create_rate_limit(tenant_id, actor_user_id: int, limit: int = 20, window: int = 3600, burst_limit: int = 5):
    identifier = f"invitation_create:{tenant_id}:{actor_user_id}"
    allowed, info = rate_limiter.is_allowed(identifier, limit=limit, window=window, burst_limit=burst_limit)
    return allowed, info


def create_invitation_link(*, tenant_id, invitee_type: str, created_by_user_id: int, expires_in_days: int = 7) -> tuple[InvitationLink, int, str]:
    invitee_type = (invitee_type or '').strip().lower()
    if invitee_type not in INVITATION_INVITEE_TYPES:
        raise ValueError('Invalid invitee_type')

    days = int(expires_in_days or 7)
    if days < 1:
        days = 1
    if days > 30:
        days = 30

    _, nonce_hash = InvitationLink.new_nonce()
    expires_at = datetime.now(timezone.utc) + timedelta(days=days)

    invite = InvitationLink(
        tenant_id=tenant_id,
        invitee_type=invitee_type,
        status='active',
        expires_at=expires_at,
        nonce_hash=nonce_hash,
        created_by_user_id=int(created_by_user_id),
        sig_hash='__pending__',
    )

    db.session.add(invite)
    db.session.flush()

    exp_ts, sig = sign_invitation(invite)
    invite.sig_hash = _sha256_hex(sig)

    _event(invite.id, 'created', tenant_id=tenant_id, actor_user_id=int(created_by_user_id), metadata={'invitee_type': invitee_type, 'exp': exp_ts})
    return invite, exp_ts, sig


def mark_expired_if_needed(invite: InvitationLink) -> bool:
    if invite.status != 'active' or not invite.expires_at:
        return False

    expires_at = invite.expires_at
    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)
    else:
        expires_at = expires_at.astimezone(timezone.utc)

    if expires_at < datetime.now(timezone.utc):
        invite.status = 'expired'
        _event(invite.id, 'expired', tenant_id=invite.tenant_id, actor_user_id=None)
        return True
    return False
