import uuid
import hashlib
import secrets
from datetime import datetime

from sqlalchemy.dialects.postgresql import UUID, INET, JSONB
from sqlalchemy import JSON
from sqlalchemy.sql import func

from app.extensions import db


INVITATION_INVITEE_TYPES = ('parent', 'teacher', 'general')
INVITATION_STATUSES = ('active', 'expired', 'revoked', 'consumed')
INVITATION_EVENT_TYPES = (
    'created',
    'viewed',
    'consumed',
    'revoked',
    'expired',
    'rate_limited',
    'validation_failed',
)


class InvitationLink(db.Model):
    __tablename__ = 'invitation_links'
    __table_args__ = (
        db.Index('idx_invitation_links_tenant_status', 'tenant_id', 'status'),
        db.Index('idx_invitation_links_expires_at', 'expires_at'),
    )

    id = db.Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tenant_id = db.Column(UUID(as_uuid=True), db.ForeignKey('tenants.id'), nullable=False, index=True)

    invitee_type = db.Column(db.String(16), nullable=False)
    status = db.Column(db.String(16), nullable=False, default='active')
    expires_at = db.Column(db.DateTime(timezone=True), nullable=False)

    nonce_hash = db.Column(db.String(64), nullable=False)
    sig_hash = db.Column(db.String(64), nullable=False)

    created_by_user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False, index=True)
    created_at = db.Column(db.DateTime(timezone=True), server_default=func.now())

    consumed_by_user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=True)
    consumed_at = db.Column(db.DateTime(timezone=True), nullable=True)

    revoked_by_user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=True)
    revoked_at = db.Column(db.DateTime(timezone=True), nullable=True)

    created_by = db.relationship('User', foreign_keys=[created_by_user_id])
    consumed_by = db.relationship('User', foreign_keys=[consumed_by_user_id])
    revoked_by = db.relationship('User', foreign_keys=[revoked_by_user_id])
    tenant = db.relationship('Tenant', foreign_keys=[tenant_id])

    @staticmethod
    def _hash(value: str) -> str:
        return hashlib.sha256((value or '').encode('utf-8')).hexdigest()

    @staticmethod
    def new_nonce() -> tuple[str, str]:
        nonce = secrets.token_urlsafe(16)
        return nonce, InvitationLink._hash(nonce)


class InvitationEvent(db.Model):
    __tablename__ = 'invitation_events'
    __table_args__ = (
        db.Index('idx_invitation_events_invite_id', 'invite_id'),
        db.Index('idx_invitation_events_created_at', 'created_at'),
    )

    id = db.Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    invite_id = db.Column(UUID(as_uuid=True), db.ForeignKey('invitation_links.id'), nullable=False)
    event_type = db.Column(db.String(32), nullable=False)

    actor_user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=True)

    tenant_id = db.Column(UUID(as_uuid=True), db.ForeignKey('tenants.id'), nullable=True)
    ip_address = db.Column(db.String(45).with_variant(INET(), 'postgresql'), nullable=True)
    user_agent = db.Column(db.String(255), nullable=True)
    metadata_json = db.Column(JSON().with_variant(JSONB(), 'postgresql'), nullable=True)

    created_at = db.Column(db.DateTime(timezone=True), server_default=func.now())

    invite = db.relationship('InvitationLink', foreign_keys=[invite_id], backref=db.backref('events', lazy=True))
    actor = db.relationship('User', foreign_keys=[actor_user_id])
    tenant = db.relationship('Tenant', foreign_keys=[tenant_id])
