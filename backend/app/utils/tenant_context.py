import uuid
from functools import wraps
from typing import Optional, Tuple

from flask import g, jsonify, request
from flask_jwt_extended import get_jwt_identity, verify_jwt_in_request
from sqlalchemy.orm import load_only, noload

from app.models.tenant import Branch, Tenant, TenantMembership
from app.models.user import User


def _parse_uuid(value: str) -> Optional[uuid.UUID]:
    try:
        return uuid.UUID(str(value))
    except Exception:
        return None


def _get_requested_tenant_id() -> Optional[uuid.UUID]:
    # 1. Primary check: Extract from custom proxy headers
    header_value = request.headers.get("X-Tenant-ID") or request.headers.get(
        "X-Tenant-Id"
    )
    if header_value:
        return _parse_uuid(header_value.strip())

    # 2. Secondary check: Extract from raw URL query parameters
    qp_value = request.args.get("tenant_id") or request.args.get("tenantId")
    if qp_value:
        return _parse_uuid(str(qp_value).strip())

    # 3. Root Level Fallback: Contextual lookup via token identity data tables
    try:
        verify_jwt_in_request(optional=True)
        user_id = get_jwt_identity()
        if user_id is not None:
            user = User.query.get(user_id)
            if user:
                # Direct lookup if user is a teacher
                if user.role == "teacher":
                    from app.models import Teacher

                    profile = Teacher.query.filter_by(user_id=user.id).first()
                    if profile and profile.tenant_id:
                        return _parse_uuid(profile.tenant_id)

                # Direct lookup if user is a student
                elif user.role == "student":
                    from app.models import Student

                    profile = Student.query.filter_by(user_id=user.id).first()
                    if profile and profile.tenant_id:
                        return _parse_uuid(profile.tenant_id)
    except Exception:
        pass

    return None


def _load_request_user(user_id, *, load_full_user: bool = True) -> Optional[User]:
    if user_id is None:
        return None
    if isinstance(user_id, dict):
        user_id = user_id.get("sub") or user_id.get("id") or user_id.get("user_id")
    try:
        user_id = int(user_id) if user_id is not None else None
    except (ValueError, TypeError):
        pass
    if user_id is None:
        return None
    if load_full_user:
        return User.query.get(user_id)
    return (
        User.query.options(
            load_only(User.id, User.role),
            noload(User.roles),
            noload(User.profile),
        )
        .filter(User.id == user_id)
        .first()
    )


def resolve_tenant_for_request(
    require_explicit: bool = True, *, load_full_user: bool = True
) -> Tuple[Optional[uuid.UUID], Optional[User], Optional[str]]:
    verify_jwt_in_request()
    user_id = get_jwt_identity()
    user = _load_request_user(user_id, load_full_user=load_full_user)
    if not user:
        return None, None, "Authentication required"

    requested = _get_requested_tenant_id()
    if requested is None:
        if not require_explicit:
            return None, user, None
        memberships = TenantMembership.query.filter_by(
            user_id=user.id, status="active"
        ).all()
        if len(memberships) == 1:
            return memberships[0].tenant_id, user, None
        return None, user, "Tenant context required"

    if user.role in ("admin", "school_admin", "super_admin", "super_manager"):
        exists = Tenant.query.get(requested)
        if not exists:
            return None, user, "Tenant not found"
        return requested, user, None

    membership = TenantMembership.query.filter_by(
        user_id=user.id, tenant_id=requested, status="active"
    ).first()
    if not membership:
        return None, user, "Tenant access denied"
    return requested, user, None


def resolve_branch_for_request(
    tenant_id: uuid.UUID, user: Optional[User]
) -> Optional[uuid.UUID]:
    branch_id_val = request.headers.get("X-Branch-ID") or request.headers.get(
        "X-Branch-Id"
    )
    requested_branch_id = _parse_uuid(branch_id_val.strip()) if branch_id_val else None

    if requested_branch_id is not None:
        branch = Branch.query.filter_by(
            id=requested_branch_id, tenant_id=tenant_id
        ).first()
        if branch:
            return branch.id

    if user:
        if user.role == "teacher":
            from app.models.teacher import Teacher

            profile = Teacher.query.filter_by(
                user_id=user.id, tenant_id=tenant_id
            ).first()
            if profile and profile.branch_id:
                return profile.branch_id
        elif user.role == "student":
            from app.models.student import Student

            profile = Student.query.filter_by(
                user_id=user.id, tenant_id=tenant_id
            ).first()
            if profile and profile.branch_id:
                return profile.branch_id

    default_branch = (
        Branch.query.filter_by(tenant_id=tenant_id, is_active=True)
        .order_by(Branch.created_at.asc(), Branch.name.asc(), Branch.id.asc())
        .first()
    )
    if default_branch:
        return default_branch.id

    fallback_branch = (
        Branch.query.filter_by(tenant_id=tenant_id)
        .order_by(Branch.created_at.asc(), Branch.name.asc(), Branch.id.asc())
        .first()
    )
    return fallback_branch.id if fallback_branch else None


def tenant_required(
    fn=None, *, resolve_branch: bool = True, load_full_user: bool = True
):
    def decorator(inner_fn):
        @wraps(inner_fn)
        def wrapper(*args, **kwargs):
            tenant_id, user, err = resolve_tenant_for_request(
                require_explicit=True, load_full_user=load_full_user
            )
            if err:
                # ------------------------------------------------------------------
                # FAIL-CLOSED — no more silent pass-through to inner_fn with null
                # tenant context. With the ORM-level auto-filter returning ZERO
                # rows for null g.tenant_id we could still pass through, but:
                #   1. join-style queries (e.g. admissions' _base_admission_query
                #      which joins Parent to infer tenant) still need an explicit
                #      tenant_id to filter on — without one they can leak.
                #   2. routes may have other side effects that don't go through
                #      the ORM (raw SQL, external service calls, etc).
                # So we strictly return 400/403 for EVERY err case EXCEPT when
                # the caller explicitly opts in via the legacy `allow_bootstrap`
                # kwarg (only the initial bootstrap/super_admin routes should
                # ever set this).
                # ------------------------------------------------------------------
                allow_bootstrap = bool(getattr(inner_fn, "_tenant_required_allow_bootstrap", False))
                if allow_bootstrap and err == "Tenant context required":
                    tenant_exists = (
                        Tenant.query.with_entities(Tenant.id)
                        .execution_options(include_deleted=True)
                        .first() is not None
                    )
                    if not tenant_exists:
                        import structlog as _sl
                        _sl.get_logger().warning(
                            "tenant.bootstrap_null_context",
                            handler=getattr(inner_fn, "__name__", repr(inner_fn)),
                        )
                        g.tenant_id = None
                        g.current_user = None
                        g.branch_id = None
                        return inner_fn(*args, **kwargs)
                # Default: return explicit error to client.
                return jsonify({"success": False, "message": err}), (
                    400 if err == "Tenant context required" else 403
                )

            g.tenant_id = tenant_id
            g.current_user = user
            g.branch_id = (
                resolve_branch_for_request(tenant_id, user)
                if resolve_branch and tenant_id
                else None
            )

            return inner_fn(*args, **kwargs)

        return wrapper

    if fn is None:
        return decorator
    return decorator(fn)
