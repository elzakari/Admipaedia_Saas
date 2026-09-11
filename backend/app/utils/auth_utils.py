from functools import wraps

from flask import current_app, jsonify
from flask_jwt_extended import get_jwt_identity, verify_jwt_in_request

from app.models.user import User

ADMIN_COMPATIBLE_ROLES = {
    "admin",
    "school_admin",
    "super_admin",
    "superadmin",
    "super_manager",
}


def _get_user_from_jwt():
    raw_id = get_jwt_identity()
    if isinstance(raw_id, dict):
        raw_id = raw_id.get("sub") or raw_id.get("id") or raw_id.get("user_id")
    try:
        user_id = int(raw_id) if raw_id is not None else None
    except (ValueError, TypeError):
        user_id = raw_id
    if user_id is None:
        return None
    return User.query.get(user_id)


def admin_required(fn):
    """Require school-admin authority in the current tenant."""

    @wraps(fn)
    def wrapper(*args, **kwargs):
        verify_jwt_in_request()
        user = _get_user_from_jwt()

        if not user:
            return (
                jsonify(
                    {
                        "success": False,
                        "message": "Admin privileges required",
                    }
                ),
                403,
            )

        from app.utils.rbac_decorators import (
            _is_platform_user,
            get_request_effective_roles,
        )

        authorized = (
            _is_platform_user(user)
            or "admin" in get_request_effective_roles(user)
        )

        if not authorized:
            return (
                jsonify(
                    {
                        "success": False,
                        "message": "Admin privileges required",
                    }
                ),
                403,
            )

        return fn(*args, **kwargs)

    return wrapper


def teacher_required(fn):
    """Require teacher or school-admin authority in the current tenant."""

    @wraps(fn)
    def wrapper(*args, **kwargs):
        verify_jwt_in_request()
        user = _get_user_from_jwt()

        if not user:
            return (
                jsonify(
                    {
                        "success": False,
                        "message": "Teacher privileges required",
                    }
                ),
                403,
            )

        from app.utils.rbac_decorators import (
            _is_platform_user,
            get_request_effective_roles,
        )

        roles = get_request_effective_roles(user)

        authorized = (
            _is_platform_user(user)
            or bool({"teacher", "admin"}.intersection(roles))
        )

        if not authorized:
            return (
                jsonify(
                    {
                        "success": False,
                        "message": "Teacher privileges required",
                    }
                ),
                403,
            )

        return fn(*args, **kwargs)

    return wrapper


def student_required(fn):
    """Require student authority in the current tenant."""

    @wraps(fn)
    def wrapper(*args, **kwargs):
        verify_jwt_in_request()
        user = _get_user_from_jwt()

        if not user:
            return (
                jsonify(
                    {
                        "success": False,
                        "message": "Student privileges required",
                    }
                ),
                403,
            )

        from app.utils.rbac_decorators import (
            get_request_effective_roles,
        )

        if "student" not in get_request_effective_roles(user):
            return (
                jsonify(
                    {
                        "success": False,
                        "message": "Student privileges required",
                    }
                ),
                403,
            )

        return fn(*args, **kwargs)

    return wrapper


def parent_required(fn):
    """Require parent authority in the current tenant."""

    @wraps(fn)
    def wrapper(*args, **kwargs):
        verify_jwt_in_request()
        user = _get_user_from_jwt()

        if not user:
            return (
                jsonify(
                    {
                        "success": False,
                        "message": "Parent privileges required",
                    }
                ),
                403,
            )

        from app.utils.rbac_decorators import (
            get_request_effective_roles,
        )

        if "parent" not in get_request_effective_roles(user):
            return (
                jsonify(
                    {
                        "success": False,
                        "message": "Parent privileges required",
                    }
                ),
                403,
            )

        # Authorization must never create Parent records.
        # Parent profile provisioning belongs to the tenant onboarding
        # workflow, where tenant_id can be established explicitly.
        return fn(*args, **kwargs)

    return wrapper
