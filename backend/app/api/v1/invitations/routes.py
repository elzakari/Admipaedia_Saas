import uuid
from datetime import date, datetime
from typing import Optional

from flask import current_app, g, jsonify, request
from flask_jwt_extended import create_access_token, create_refresh_token

from app.extensions import db
from app.middleware.security_middleware import (rate_limit,
                                                sanitize_request_data)
from app.models.invitation import InvitationLink
from app.models.parent import Parent
from app.models.rbac import RBACRole, UserRoleAssignment
from app.models.staff import Staff
from app.models.teacher import Teacher
from app.models.tenant import TenantMembership
from app.models.user import User
from app.services.invitation_service import (create_invitation_link,
                                             enforce_create_rate_limit,
                                             mark_expired_if_needed,
                                             verify_invitation_signature)
from app.utils.billing_access import school_admin_required
from app.utils.password_security import PasswordSecurity
from app.utils.tenant_context import tenant_required
from app.utils.url_helpers import get_frontend_base_url

from . import invitations_bp


def _parse_uuid(value: str):
    try:
        return uuid.UUID(str(value))
    except Exception:
        return None


def _frontend_invite_url(invite_id: str, exp_ts: int, sig: str) -> str:
    frontend_url = get_frontend_base_url()
    return f"{frontend_url}/invite/{invite_id}?exp={exp_ts}&sig={sig}"


def _derive_display_names(first_name: Optional[str], last_name: Optional[str],
                          username: Optional[str], email: Optional[str]):
    """Derive a (first_name, last_name) tuple for users that only provide email/username.

    General invitees often skip the dedicated first_name / last_name fields; the
    form only requires email + password.  We still need non-empty names for the
    Staff row because the Staff ORM declares first_name / last_name as not-null.
    """
    first = (first_name or "").strip()
    last = (last_name or "").strip()
    if first and last:
        return first, last
    stem = ""
    if username:
        stem = str(username).strip()
    if not stem and email:
        local = str(email).split("@", 1)[0]
        stem = local.replace(".", " ").replace("_", " ").replace("-", " ").strip()
    stem = stem or "Utilisateur"
    parts = stem.split()
    if not first and not last:
        if len(parts) >= 2:
            return parts[0].title(), " ".join(parts[1:]).title()
        return parts[0].title() if parts else "Invité", "Général"
    if first and not last:
        # user gave first name only; keep last as remaining parts or Général
        return first, " ".join(parts[1:]).title() or "Général"
    # last without first
    return "Invité", last


def _tenant_user_active_role_names(user_id: int) -> list[str]:
    rows = (
        UserRoleAssignment.query
        .filter_by(user_id=int(user_id), is_active=True)
        .join(RBACRole, UserRoleAssignment.role_id == RBACRole.id)
        .add_columns(RBACRole.name, RBACRole.display_name, RBACRole.id, RBACRole.is_system)
        .all()
    )
    names: list[str] = []
    for assignment, name, _display, _rid, _sys in rows:
        if name:
            names.append(str(name))
    return names


@invitations_bp.route("/admin/invitations", methods=["POST"])
@tenant_required
@school_admin_required
@sanitize_request_data({"invitee_type": "text"})
def admin_create_invitation():
    actor = g.current_user
    tenant_id = g.tenant_id
    payload = request.get_json() or {}

    invitee_type = (
        (payload.get("invitee_type") or payload.get("type") or "").strip().lower()
    )
    expires_in_days = (
        payload.get("expires_in_days") or payload.get("expiresInDays") or 7
    )

    allowed, info = enforce_create_rate_limit(
        tenant_id, actor.id, limit=20, window=3600, burst_limit=5
    )
    if not allowed:
        retry_after = int(info.get("retry_after") or 60)
        return (
            jsonify(
                {
                    "success": False,
                    "message": "Rate limit exceeded. Please try again later.",
                    "retry_after": retry_after,
                }
            ),
            429,
        )

    try:
        invite, exp_ts, sig = create_invitation_link(
            tenant_id=tenant_id,
            invitee_type=invitee_type,
            created_by_user_id=actor.id,
            expires_in_days=int(expires_in_days or 7),
        )
        db.session.commit()
    except ValueError as e:
        db.session.rollback()
        return jsonify({"success": False, "message": str(e) or "Invalid request"}), 400
    except Exception:
        db.session.rollback()
        return (
            jsonify({"success": False, "message": "Failed to create invitation link"}),
            500,
        )

    return (
        jsonify(
            {
                "success": True,
                "invite": {
                    "id": str(invite.id),
                    "tenant_id": str(invite.tenant_id),
                    "invitee_type": invite.invitee_type,
                    "status": invite.status,
                    "expires_at": (
                        invite.expires_at.isoformat() if invite.expires_at else None
                    ),
                    "created_at": (
                        invite.created_at.isoformat() if invite.created_at else None
                    ),
                },
                "signed_url": _frontend_invite_url(str(invite.id), exp_ts, sig),
            }
        ),
        201,
    )


@invitations_bp.route("/admin/invitations", methods=["GET"])
@tenant_required
@school_admin_required
def admin_list_invitations():
    tenant_id = g.tenant_id
    status = (request.args.get("status") or "").strip().lower()
    invitee_type = (
        (request.args.get("invitee_type") or request.args.get("type") or "")
        .strip()
        .lower()
    )

    query = InvitationLink.query.filter_by(tenant_id=tenant_id)
    if status:
        query = query.filter(InvitationLink.status == status)
    if invitee_type:
        query = query.filter(InvitationLink.invitee_type == invitee_type)

    invites = query.order_by(InvitationLink.created_at.desc()).limit(200).all()
    changed = False
    for inv in invites:
        changed = mark_expired_if_needed(inv) or changed
    if changed:
        db.session.commit()

    out = []
    for inv in invites:
        consumed_by_user = None
        if inv.consumed_by_user_id:
            u = User.query.filter_by(id=int(inv.consumed_by_user_id)).first()
            if u:
                staff_row = Staff.query.filter_by(
                    user_id=u.id, tenant_id=tenant_id
                ).first()
                teacher_row = Teacher.query.filter_by(
                    user_id=u.id, tenant_id=tenant_id
                ).first()
                role_names = _tenant_user_active_role_names(u.id)
                consumed_by_user = {
                    "id": u.id,
                    "email": u.email,
                    "username": u.username,
                    "role": u.role,
                    "is_active": getattr(u, "is_active", True),
                    "has_staff_profile": staff_row is not None,
                    "staff_id": getattr(staff_row, "id", None),
                    "has_teacher_profile": teacher_row is not None,
                    "teacher_id": getattr(teacher_row, "id", None),
                    "role_names": role_names,
                    "role_count": len(role_names),
                }
        out.append(
            {
                "id": str(inv.id),
                "tenant_id": str(inv.tenant_id),
                "invitee_type": inv.invitee_type,
                "status": inv.status,
                "expires_at": inv.expires_at.isoformat() if inv.expires_at else None,
                "created_at": inv.created_at.isoformat() if inv.created_at else None,
                "created_by_user_id": inv.created_by_user_id,
                "consumed_at": inv.consumed_at.isoformat() if inv.consumed_at else None,
                "consumed_by_user_id": inv.consumed_by_user_id,
                "consumed_by_user": consumed_by_user,
                "revoked_at": inv.revoked_at.isoformat() if inv.revoked_at else None,
                "revoked_by_user_id": inv.revoked_by_user_id,
            }
        )

    return jsonify({"success": True, "invites": out}), 200


@invitations_bp.route("/admin/invitations/<invite_id>/revoke", methods=["POST"])
@tenant_required
@school_admin_required
def admin_revoke_invitation(invite_id: str):
    actor = g.current_user
    tenant_id = g.tenant_id
    iid = _parse_uuid(invite_id)
    if not iid:
        return jsonify({"success": False, "message": "Invalid invitation id"}), 400

    inv = InvitationLink.query.filter_by(id=iid, tenant_id=tenant_id).first()
    if not inv:
        return jsonify({"success": False, "message": "Invitation not found"}), 404

    mark_expired_if_needed(inv)
    if inv.status != "active":
        return (
            jsonify(
                {
                    "success": False,
                    "message": f"Cannot revoke an invitation in status '{inv.status}'",
                }
            ),
            400,
        )

    inv.status = "revoked"
    inv.revoked_at = datetime.utcnow()
    inv.revoked_by_user_id = actor.id

    from app.services.invitation_service import _event

    _event(inv.id, "revoked", tenant_id=tenant_id, actor_user_id=actor.id)

    db.session.commit()
    return jsonify({"success": True, "message": "Invitation revoked"}), 200


@invitations_bp.route("/admin/invitations/<invite_id>/events", methods=["GET"])
@tenant_required
@school_admin_required
def admin_invitation_events(invite_id: str):
    tenant_id = g.tenant_id
    iid = _parse_uuid(invite_id)
    if not iid:
        return jsonify({"success": False, "message": "Invalid invitation id"}), 400

    inv = InvitationLink.query.filter_by(id=iid, tenant_id=tenant_id).first()
    if not inv:
        return jsonify({"success": False, "message": "Invitation not found"}), 404

    rows = inv.events
    rows = sorted(rows, key=lambda e: e.created_at or datetime.min, reverse=True)
    events = []
    for ev in rows[:200]:
        events.append(
            {
                "id": str(ev.id),
                "event_type": ev.event_type,
                "actor_user_id": ev.actor_user_id,
                "created_at": ev.created_at.isoformat() if ev.created_at else None,
                "ip_address": ev.ip_address,
                "user_agent": ev.user_agent,
                "metadata": ev.metadata_json or {},
            }
        )

    return jsonify({"success": True, "events": events}), 200


@invitations_bp.route("/invitations/<invite_id>/validate", methods=["GET"])
@rate_limit(limit=60, window=900, burst_limit=10)
def public_validate_invitation(invite_id: str):
    iid = _parse_uuid(invite_id)
    if not iid:
        return jsonify({"success": False, "message": "Invalid invitation link"}), 400

    sig = (request.args.get("sig") or "").strip()
    exp_raw = (request.args.get("exp") or "").strip()
    try:
        exp_ts = int(exp_raw)
    except Exception:
        exp_ts = 0

    inv = InvitationLink.query.filter_by(id=iid).first()
    if not inv:
        return jsonify({"success": False, "message": "Invitation not found"}), 404

    changed = mark_expired_if_needed(inv)
    if changed:
        db.session.commit()

    from app.services.invitation_service import _event

    expected_exp = int(inv.expires_at.timestamp()) if inv.expires_at else 0
    if exp_ts != expected_exp or not verify_invitation_signature(inv, exp_ts, sig):
        _event(
            inv.id,
            "validation_failed",
            tenant_id=inv.tenant_id,
            actor_user_id=None,
            metadata={"reason": "bad_signature"},
        )
        db.session.commit()
        return (
            jsonify(
                {"success": False, "message": "Invalid or tampered invitation link"}
            ),
            400,
        )

    if inv.status != "active":
        _event(
            inv.id,
            "viewed",
            tenant_id=inv.tenant_id,
            actor_user_id=None,
            metadata={"status": inv.status},
        )
        db.session.commit()
        return (
            jsonify(
                {
                    "success": False,
                    "status": inv.status,
                    "message": "This invitation is no longer valid.",
                }
            ),
            409,
        )

    _event(inv.id, "viewed", tenant_id=inv.tenant_id, actor_user_id=None)
    db.session.commit()
    return (
        jsonify(
            {
                "success": True,
                "invite": {
                    "id": str(inv.id),
                    "tenant_id": str(inv.tenant_id),
                    "invitee_type": inv.invitee_type,
                    "expires_at": (
                        inv.expires_at.isoformat() if inv.expires_at else None
                    ),
                    "status": inv.status,
                },
            }
        ),
        200,
    )


@invitations_bp.route("/invitations/<invite_id>/register", methods=["POST"])
@rate_limit(limit=60, window=60, burst_limit=60)
@sanitize_request_data({"email": "email", "username": "text", "password": "text"})
def public_register_with_invitation(invite_id: str):
    iid = _parse_uuid(invite_id)
    if not iid:
        return jsonify({"success": False, "message": "Invalid invitation link"}), 400

    sig = (request.args.get("sig") or "").strip()
    exp_raw = (request.args.get("exp") or "").strip()
    try:
        exp_ts = int(exp_raw)
    except Exception:
        exp_ts = 0

    data = request.get_json() or {}
    username = (data.get("username") or data.get("name") or "").strip()
    email = (data.get("email") or "").strip().lower()
    password = data.get("password") or ""
    confirm_password = data.get("confirm_password") or data.get("confirmPassword") or ""
    first_name = (data.get("first_name") or "").strip()
    last_name = (data.get("last_name") or "").strip()

    if not username:
        username = (email.split("@")[0] if email and "@" in email else "").strip()
    if not username:
        return jsonify({"success": False, "message": "Username is required"}), 400
    if not email:
        return jsonify({"success": False, "message": "Email is required"}), 400
    if not password or len(password) < 8:
        return (
            jsonify(
                {"success": False, "message": "Password must be at least 8 characters"}
            ),
            400,
        )
    if password != confirm_password:
        return jsonify({"success": False, "message": "Passwords do not match"}), 400

    is_strong, password_errors = PasswordSecurity.validate_password_strength(
        password, username, email
    )
    if not is_strong:
        return (
            jsonify(
                {
                    "success": False,
                    "message": "Password does not meet security requirements",
                    "errors": password_errors,
                }
            ),
            400,
        )
    if PasswordSecurity.check_password_breach(password):
        return (
            jsonify(
                {
                    "success": False,
                    "message": "This password has been found in data breaches. Please choose a different password.",
                }
            ),
            400,
        )

    if User.query.filter_by(email=email).first():
        return jsonify({"success": False, "message": "Email already registered"}), 400
    if User.query.filter_by(username=username).first():
        return jsonify({"success": False, "message": "Username already taken"}), 400

    from app.services.invitation_service import _event

    try:
        inv = InvitationLink.query.filter_by(id=iid).with_for_update().first()
        if not inv:
            return jsonify({"success": False, "message": "Invitation not found"}), 404

        mark_expired_if_needed(inv)
        if inv.status != "active":
            _event(
                inv.id,
                "validation_failed",
                tenant_id=inv.tenant_id,
                actor_user_id=None,
                metadata={"reason": "not_active", "status": inv.status},
            )
            db.session.commit()
            return (
                jsonify(
                    {
                        "success": False,
                        "message": "This invitation is no longer valid.",
                        "status": inv.status,
                    }
                ),
                409,
            )

        expected_exp = int(inv.expires_at.timestamp()) if inv.expires_at else 0
        if exp_ts != expected_exp or not verify_invitation_signature(inv, exp_ts, sig):
            _event(
                inv.id,
                "validation_failed",
                tenant_id=inv.tenant_id,
                actor_user_id=None,
                metadata={"reason": "bad_signature"},
            )
            db.session.commit()
            return (
                jsonify(
                    {"success": False, "message": "Invalid or tampered invitation link"}
                ),
                400,
            )

        role = "user"
        member_role = "staff"
        if inv.invitee_type == "parent":
            role = "parent"
            member_role = "parent"
        elif inv.invitee_type == "teacher":
            role = "teacher"
            member_role = "teacher"

        if role == "teacher":
            if not first_name or not last_name:
                return (
                    jsonify(
                        {
                            "success": False,
                            "message": "First name and last name are required for teacher accounts",
                        }
                    ),
                    400,
                )

        from app import bcrypt

        user = User(username=username, email=email, role=role)
        user.password_hash = bcrypt.generate_password_hash(password).decode("utf-8")
        db.session.add(user)
        db.session.flush()

        if role == "parent":
            db.session.add(Parent(user_id=user.id, tenant_id=inv.tenant_id))
        if role == "teacher":
            db.session.add(
                Teacher(
                    user_id=user.id,
                    tenant_id=inv.tenant_id,
                    first_name=first_name,
                    last_name=last_name,
                )
            )
        if inv.invitee_type == "general":
            _fn, _ln = _derive_display_names(
                first_name, last_name, username, email
            )
            existing_staff = Staff.query.filter_by(
                user_id=user.id, tenant_id=inv.tenant_id
            ).first()
            if not existing_staff:
                employee_id = Staff.generate_employee_id(inv.tenant_id)
                db.session.add(
                    Staff(
                        user_id=user.id,
                        tenant_id=inv.tenant_id,
                        first_name=_fn,
                        last_name=_ln,
                        email=email,
                        job_title="General Staff",
                        status="active",
                        joining_date=date.today(),
                        employee_id=employee_id,
                    )
                )

        membership = TenantMembership(
            tenant_id=inv.tenant_id,
            user_id=user.id,
            role=member_role,
            status="active",
            invited_by_user_id=inv.created_by_user_id,
        )
        db.session.add(membership)

        inv.status = "consumed"
        inv.consumed_at = datetime.utcnow()
        inv.consumed_by_user_id = user.id

        _event(
            inv.id,
            "consumed",
            tenant_id=inv.tenant_id,
            actor_user_id=user.id,
            metadata={"member_role": member_role},
        )
        db.session.commit()

        access_token = create_access_token(identity=user.id)
        refresh_token = create_refresh_token(identity=user.id)
        return (
            jsonify(
                {
                    "success": True,
                    "message": "Account created successfully",
                    "user": {
                        "id": user.id,
                        "username": user.username,
                        "email": user.email,
                        "role": user.role,
                    },
                    "access_token": access_token,
                    "refresh_token": refresh_token,
                    "tenant": {"id": str(inv.tenant_id)},
                }
            ),
            201,
        )

    except Exception:
        db.session.rollback()
        return jsonify({"success": False, "message": "Registration failed"}), 500
