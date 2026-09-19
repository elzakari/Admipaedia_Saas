"""
Authentication session models.

V27C introduces a durable logical-session layer without replacing the
legacy SessionToken implementation yet.

Architecture:

    User
      |
      +-- AuthSession
              |
              +-- RefreshToken generations

An AuthSession represents ONE logical login/device session.

A RefreshToken represents ONE generation in a rotating refresh-token
family.

Important:
    * SessionToken remains the active access-token compatibility layer
      during the V27C migration.
    * Raw refresh tokens are never intended to be persisted here.
    * RefreshToken.jti_hash stores a one-way SHA-256 identifier.
"""

from __future__ import annotations

import uuid
from datetime import datetime

from sqlalchemy import Index, Uuid

from app.extensions import db


class AuthSession(db.Model):
    """One logical authenticated login/device session."""

    __tablename__ = "auth_sessions"

    id = db.Column(
        Uuid(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )

    user_id = db.Column(
        db.Integer,
        db.ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
    )

    # Tenant is contextual, not proof of authorization.
    #
    # A platform session may legitimately have no tenant selected.
    tenant_id = db.Column(
        Uuid(as_uuid=True),
        db.ForeignKey("tenants.id", ondelete="SET NULL"),
        nullable=True,
    )

    device_id = db.Column(
        db.String(128),
        nullable=True,
    )

    device_fingerprint = db.Column(
        db.String(128),
        nullable=True,
    )

    ip_address = db.Column(
        db.String(45),
        nullable=True,
    )

    user_agent = db.Column(
        db.Text,
        nullable=True,
    )

    session_version = db.Column(
        db.Integer,
        nullable=False,
        default=1,
    )

    status = db.Column(
        db.String(20),
        nullable=False,
        default="active",
    )

    created_at = db.Column(
        db.DateTime,
        nullable=False,
        default=datetime.utcnow,
    )

    last_seen_at = db.Column(
        db.DateTime,
        nullable=True,
    )

    expires_at = db.Column(
        db.DateTime,
        nullable=False,
    )

    revoked_at = db.Column(
        db.DateTime,
        nullable=True,
    )

    revocation_reason = db.Column(
        db.String(255),
        nullable=True,
    )

    refresh_tokens = db.relationship(
        "RefreshToken",
        back_populates="session",
        cascade="all, delete-orphan",
        passive_deletes=True,
        lazy="dynamic",
        foreign_keys="RefreshToken.session_id",
    )

    __table_args__ = (
        Index(
            "ix_auth_sessions_user_status",
            "user_id",
            "status",
        ),
        Index(
            "ix_auth_sessions_user_expires",
            "user_id",
            "expires_at",
        ),
        Index(
            "ix_auth_sessions_tenant_status",
            "tenant_id",
            "status",
        ),
        Index(
            "ix_auth_sessions_expires_at",
            "expires_at",
        ),
    )

    @property
    def is_revoked(self) -> bool:
        return (
            self.revoked_at is not None
            or self.status == "revoked"
        )

    @property
    def is_expired(self) -> bool:
        return (
            self.expires_at is not None
            and self.expires_at <= datetime.utcnow()
        )

    @property
    def is_active(self) -> bool:
        return (
            self.status == "active"
            and not self.is_revoked
            and not self.is_expired
        )

    def touch(self, when=None) -> None:
        """
        Update in-memory activity time.

        Deliberately does not commit. Transaction ownership belongs to
        the service/request layer.
        """
        self.last_seen_at = when or datetime.utcnow()

    def revoke(self, reason=None, when=None) -> None:
        """
        Revoke the logical session in memory.

        Deliberately does not commit.
        """
        self.status = "revoked"
        self.revoked_at = when or datetime.utcnow()

        if reason:
            self.revocation_reason = str(reason)[:255]

    def bump_version(self) -> int:
        """
        Increment session security version.

        Future access JWTs can carry this value in a `sv` claim.
        """
        self.session_version = int(self.session_version or 0) + 1
        return self.session_version

    def __repr__(self):
        return (
            f"<AuthSession id={self.id} "
            f"user_id={self.user_id} "
            f"status={self.status}>"
        )


class RefreshToken(db.Model):
    """
    One refresh-token generation.

    jti_hash is expected to contain SHA-256(jti) as a 64-character
    hexadecimal digest. No raw refresh credential belongs in this table.
    """

    __tablename__ = "refresh_tokens"

    id = db.Column(
        Uuid(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )

    session_id = db.Column(
        Uuid(as_uuid=True),
        db.ForeignKey(
            "auth_sessions.id",
            ondelete="CASCADE",
        ),
        nullable=False,
    )

    family_id = db.Column(
        Uuid(as_uuid=True),
        nullable=False,
        default=uuid.uuid4,
    )

    jti_hash = db.Column(
        db.String(64),
        nullable=False,
        unique=True,
    )

    parent_jti_hash = db.Column(
        db.String(64),
        nullable=True,
    )

    issued_at = db.Column(
        db.DateTime,
        nullable=False,
        default=datetime.utcnow,
    )

    expires_at = db.Column(
        db.DateTime,
        nullable=False,
    )

    used_at = db.Column(
        db.DateTime,
        nullable=True,
    )

    revoked_at = db.Column(
        db.DateTime,
        nullable=True,
    )

    revocation_reason = db.Column(
        db.String(255),
        nullable=True,
    )

    replaced_by_id = db.Column(
        Uuid(as_uuid=True),
        db.ForeignKey(
            "refresh_tokens.id",
            ondelete="SET NULL",
        ),
        nullable=True,
    )

    session = db.relationship(
        "AuthSession",
        back_populates="refresh_tokens",
        foreign_keys=[session_id],
    )

    __table_args__ = (
        Index(
            "ix_refresh_tokens_session",
            "session_id",
        ),
        Index(
            "ix_refresh_tokens_family",
            "family_id",
        ),
        Index(
            "ix_refresh_tokens_session_revoked",
            "session_id",
            "revoked_at",
        ),
        Index(
            "ix_refresh_tokens_expires_at",
            "expires_at",
        ),
    )

    @property
    def is_used(self) -> bool:
        return self.used_at is not None

    @property
    def is_revoked(self) -> bool:
        return self.revoked_at is not None

    @property
    def is_expired(self) -> bool:
        return (
            self.expires_at is not None
            and self.expires_at <= datetime.utcnow()
        )

    @property
    def is_active(self) -> bool:
        return (
            not self.is_used
            and not self.is_revoked
            and not self.is_expired
        )

    def mark_used(self, when=None) -> None:
        """
        Mark this generation consumed.

        No database commit occurs here.
        """
        self.used_at = when or datetime.utcnow()

    def revoke(self, reason=None, when=None) -> None:
        """
        Revoke this refresh-token generation.

        No database commit occurs here.
        """
        self.revoked_at = when or datetime.utcnow()

        if reason:
            self.revocation_reason = str(reason)[:255]

    def __repr__(self):
        return (
            f"<RefreshToken id={self.id} "
            f"session_id={self.session_id} "
            f"family_id={self.family_id}>"
        )
