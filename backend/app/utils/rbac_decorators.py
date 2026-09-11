"""
Enhanced RBAC Decorators and Access Control Utilities
Provides comprehensive role and permission-based access control
"""

from datetime import datetime
from functools import wraps
from typing import Any, Callable, Dict, List, Optional, Union

import structlog
from flask import current_app, g, jsonify, request
from flask_jwt_extended import get_jwt, get_jwt_identity, verify_jwt_in_request

from app.models.rbac import (AccessControlList, PermissionGrant,
                             PermissionType, RBACPermission, RBACRole,
                             ResourceType, UserRoleAssignment)
from app.models.tenant import TenantMembership
from app.models.user import User

logger = structlog.get_logger()


_PLATFORM_ROLES = {
    "super_admin",
    "super_manager",
}

_TENANT_ROLE_TEMPLATE_MAP = {
    "teacher": "teacher",
    "student": "student",
    "parent": "parent",
    "staff": "staff",
    "school_staff_readonly": "staff",
}

_SCHOOL_FINANCE_PERMISSIONS = {
    "finance.read",
    "finance.manage",
    "finance.collect",
    "student.read",
    "report.view",
    "report.generate",
    "report.export",
}


def _normalized_user_role(user: User) -> str:
    return str(getattr(user, "role", "") or "").strip().lower()


def _is_platform_user(user: User) -> bool:
    return _normalized_user_role(user) in _PLATFORM_ROLES


def _current_tenant_membership(user: User):
    tenant_id = getattr(g, "tenant_id", None)
    if not tenant_id:
        return None

    return TenantMembership.query.filter_by(
        user_id=user.id,
        tenant_id=tenant_id,
        status="active",
    ).first()


def _legacy_profile_role_for_current_tenant(user: User) -> Optional[str]:
    """
    Compatibility only for parent/teacher/student accounts that may not
    yet have TenantMembership rows.

    Tenant ownership must already have been resolved into g.tenant_id.
    """
    tenant_id = getattr(g, "tenant_id", None)
    if not tenant_id:
        return None

    role = _normalized_user_role(user)

    try:
        if role == "parent":
            from app.models import Parent

            profile = Parent.query.filter_by(
                user_id=user.id,
                tenant_id=tenant_id,
            ).first()

        elif role == "teacher":
            from app.models import Teacher

            profile = Teacher.query.filter_by(
                user_id=user.id,
                tenant_id=tenant_id,
            ).first()

        elif role == "student":
            from app.models import Student

            profile = Student.query.filter_by(
                user_id=user.id,
                tenant_id=tenant_id,
            ).first()

        else:
            return None

        return role if profile else None

    except Exception:
        return None


def get_request_effective_roles(user: User) -> set:
    """
    Return roles valid in the CURRENT request context.

    Global User.role does not grant tenant authority except for explicit
    platform roles.
    """
    if not user:
        return set()

    role = _normalized_user_role(user)

    if role in _PLATFORM_ROLES:
        return {role}

    if not getattr(g, "tenant_id", None):
        return set()

    membership = _current_tenant_membership(user)

    if membership:
        membership_role = str(membership.role or "").strip().lower()

        # Compatibility alias: tenant school_admin satisfies legacy
        # routes that still ask for "admin".
        if membership_role == "school_admin":
            return {"school_admin", "admin"}

        if membership_role == "school_staff_readonly":
            return {"school_staff_readonly", "staff"}

        return {membership_role}

    legacy_role = _legacy_profile_role_for_current_tenant(user)

    return {legacy_role} if legacy_role else set()


def get_request_effective_permissions(user: User) -> set:
    """
    Resolve permissions valid for the CURRENT tenant request.

    RBACRole remains a global permission TEMPLATE. Global user-role
    assignments and direct permission grants are intentionally ignored
    for tenant requests because those rows have no tenant_id.
    """
    if not user:
        return set()

    if _is_platform_user(user):
        return {"*"}

    effective_roles = get_request_effective_roles(user)

    if not effective_roles:
        return set()

    # School administration derives permissions from the immutable
    # system "admin" role TEMPLATE. It must never receive the platform
    # wildcard because tenant administrators are not system administrators.
    if "school_admin" in effective_roles:
        admin_template = RBACRole.query.filter_by(
            name="admin",
            is_active=True,
        ).first()

        if not admin_template:
            logger.error(
                "tenant_school_admin_template_missing",
                user_id=getattr(user, "id", None),
                tenant_id=str(getattr(g, "tenant_id", None)),
            )
            return set()

        return set(
            admin_template.get_all_permissions(
                include_inherited=True
            )
        )

    if "school_finance" in effective_roles:
        return set(_SCHOOL_FINANCE_PERMISSIONS)

    membership_role = next(iter(effective_roles))

    template_name = _TENANT_ROLE_TEMPLATE_MAP.get(
        membership_role,
        membership_role,
    )

    role_template = RBACRole.query.filter_by(
        name=template_name,
        is_active=True,
    ).first()

    if not role_template:
        logger.warning(
            "tenant_rbac_template_missing",
            user_id=getattr(user, "id", None),
            tenant_id=str(getattr(g, "tenant_id", None)),
            membership_role=membership_role,
            template_name=template_name,
        )
        return set()

    return set(
        role_template.get_all_permissions(
            include_inherited=True
        )
    )


class RBACError(Exception):
    """Base exception for RBAC-related errors"""

    pass


class InsufficientPermissionsError(RBACError):
    """Raised when user lacks required permissions"""

    pass


class RoleNotFoundError(RBACError):
    """Raised when a required role is not found"""

    pass


def get_current_user() -> Optional[User]:
    """Get the current authenticated user"""
    try:
        verify_jwt_in_request()
        user_id = get_jwt_identity()
        if user_id:
            return User.query.get(int(user_id))
    except Exception as e:
        logger.warning("failed_to_get_current_user", error=str(e))
    return None


def get_user_permissions(
    user: User,
    include_role_permissions: bool = True,
    include_direct_grants: bool = True,
) -> set:
    """Get all permissions for a user"""
    permissions = set()

    if include_role_permissions:
        # Get permissions from active role assignments
        active_assignments = UserRoleAssignment.query.filter_by(
            user_id=user.id, is_active=True
        ).all()

        for assignment in active_assignments:
            if assignment.is_valid():
                role_permissions = assignment.role.get_all_permissions(
                    include_inherited=True
                )
                permissions.update(role_permissions)

    if include_direct_grants:
        # Get direct permission grants
        active_grants = PermissionGrant.query.filter_by(
            user_id=user.id, is_active=True, is_denied=False
        ).all()

        for grant in active_grants:
            if grant.is_valid():
                permissions.add(grant.permission.name)

        # Remove explicitly denied permissions
        denied_grants = PermissionGrant.query.filter_by(
            user_id=user.id, is_active=True, is_denied=True
        ).all()

        for grant in denied_grants:
            if grant.is_valid():
                permissions.discard(grant.permission.name)

    return permissions


def check_resource_access(
    user: User,
    resource_type: ResourceType,
    resource_id: str,
    permission_name: str,
) -> bool:
    """
    Check access without allowing global ACL rows to grant authority
    inside a tenant.

    AccessControlList currently has no tenant_id, so it cannot safely
    override the current tenant's role/permission decision.
    """
    if not user:
        return False

    permissions = get_request_effective_permissions(user)

    if "*" in permissions:
        return True

    if getattr(g, "tenant_id", None):
        return permission_name in permissions

    # Ordinary users without a tenant context fail closed.
    if not _is_platform_user(user):
        return False

    return permission_name in permissions


def require_permission(
    permission_name: str,
    resource_type: Optional[ResourceType] = None,
    resource_id_param: Optional[str] = None,
):
    """
    Require a permission in the current tenant security context.

    Platform administrators retain platform authority. Ordinary users
    derive tenant authority from TenantMembership, never from global
    UserRoleAssignment or PermissionGrant rows.
    """

    def decorator(f: Callable) -> Callable:
        @wraps(f)
        def wrapper(*args, **kwargs):
            user = get_current_user()

            if not user:
                logger.warning(
                    "permission_check_no_user",
                    permission=permission_name,
                )
                return jsonify(
                    {"error": "Authentication required"}
                ), 401

            permissions = get_request_effective_permissions(user)

            if "*" not in permissions and permission_name not in permissions:
                logger.warning(
                    "tenant_permission_denied",
                    user_id=user.id,
                    tenant_id=str(getattr(g, "tenant_id", None)),
                    permission=permission_name,
                    effective_roles=list(
                        get_request_effective_roles(user)
                    ),
                    effective_permissions=list(permissions),
                )
                return jsonify(
                    {"error": "Insufficient permissions"}
                ), 403

            # Global ACL rows have no tenant_id. For tenant requests they
            # must not override tenant-scoped permission decisions.
            if (
                resource_type
                and resource_id_param
                and "*" not in permissions
                and getattr(g, "tenant_id", None) is None
            ):
                resource_id = (
                    kwargs.get(resource_id_param)
                    or (
                        request.view_args.get(resource_id_param)
                        if request.view_args
                        else None
                    )
                )

                if (
                    resource_id
                    and not check_resource_access(
                        user,
                        resource_type,
                        str(resource_id),
                        permission_name,
                    )
                ):
                    return jsonify(
                        {
                            "error": (
                                "Insufficient permissions "
                                "for this resource"
                            )
                        }
                    ), 403

            g.current_user = user
            g.user_permissions = (
                permissions
                if "*" not in permissions
                else {"*"}
            )

            return f(*args, **kwargs)

        return wrapper

    return decorator


def require_role(
    role_names: Union[str, List[str]],
    require_all: bool = False,
):
    """
    Require role membership in the current tenant context.
    """
    if isinstance(role_names, str):
        role_names = [role_names]

    normalized_required = {
        str(role or "").strip().lower()
        for role in role_names
    }

    def decorator(f: Callable) -> Callable:
        @wraps(f)
        def wrapper(*args, **kwargs):
            user = get_current_user()

            if not user:
                logger.warning(
                    "role_check_no_user",
                    roles=role_names,
                )
                return jsonify(
                    {"error": "Authentication required"}
                ), 401

            if _is_platform_user(user):
                g.current_user = user
                g.user_roles = {
                    _normalized_user_role(user)
                }
                return f(*args, **kwargs)

            effective_roles = get_request_effective_roles(user)

            if require_all:
                authorized = normalized_required.issubset(
                    effective_roles
                )
            else:
                authorized = bool(
                    normalized_required.intersection(
                        effective_roles
                    )
                )

            if not authorized:
                logger.warning(
                    "tenant_role_denied",
                    user_id=user.id,
                    tenant_id=str(getattr(g, "tenant_id", None)),
                    required_roles=list(normalized_required),
                    effective_roles=list(effective_roles),
                )
                return jsonify(
                    {"error": "Insufficient role permissions"}
                ), 403

            g.current_user = user
            g.user_roles = effective_roles

            return f(*args, **kwargs)

        return wrapper

    return decorator


def require_any_permission(
    permission_names: List[str],
):
    """Require any tenant-effective permission."""

    def decorator(f: Callable) -> Callable:
        @wraps(f)
        def wrapper(*args, **kwargs):
            user = get_current_user()

            if not user:
                return jsonify(
                    {"error": "Authentication required"}
                ), 401

            permissions = get_request_effective_permissions(user)

            if (
                "*" not in permissions
                and not any(
                    permission in permissions
                    for permission in permission_names
                )
            ):
                return jsonify(
                    {"error": "Insufficient permissions"}
                ), 403

            g.current_user = user
            g.user_permissions = permissions
            return f(*args, **kwargs)

        return wrapper

    return decorator


def require_all_permissions(
    permission_names: List[str],
):
    """Require all tenant-effective permissions."""

    def decorator(f: Callable) -> Callable:
        @wraps(f)
        def wrapper(*args, **kwargs):
            user = get_current_user()

            if not user:
                return jsonify(
                    {"error": "Authentication required"}
                ), 401

            permissions = get_request_effective_permissions(user)

            missing = (
                set()
                if "*" in permissions
                else set(permission_names) - permissions
            )

            if missing:
                return jsonify(
                    {
                        "error": (
                            "Missing permissions: "
                            + ", ".join(sorted(missing))
                        )
                    }
                ), 403

            g.current_user = user
            g.user_permissions = permissions
            return f(*args, **kwargs)

        return wrapper

    return decorator


def require_ownership_or_permission(
    permission_name: str,
    owner_field: str = "user_id",
):
    """
    Require either a tenant-effective override permission or defer the
    resource ownership test to the endpoint.

    Global PermissionGrant/UserRoleAssignment rows are deliberately not
    consulted because they have no tenant ownership.
    """

    def decorator(f: Callable) -> Callable:
        @wraps(f)
        def wrapper(*args, **kwargs):
            user = get_current_user()

            if not user:
                logger.warning(
                    "ownership_check_no_user",
                    permission=permission_name,
                )
                return jsonify(
                    {"error": "Authentication required"}
                ), 401

            permissions = get_request_effective_permissions(user)

            if (
                "*" in permissions
                or permission_name in permissions
            ):
                g.current_user = user
                g.user_permissions = permissions
                return f(*args, **kwargs)

            # Preserve the existing endpoint-level ownership contract.
            g.current_user = user
            g.user_permissions = permissions
            g.requires_ownership_check = True
            g.owner_field = owner_field

            return f(*args, **kwargs)

        return wrapper

    return decorator


def audit_access(action: str, resource_type: Optional[ResourceType] = None):
    """
    Decorator to audit access to endpoints

    Args:
        action: Description of the action being performed
        resource_type: Type of resource being accessed
    """

    def decorator(f: Callable) -> Callable:
        @wraps(f)
        def wrapper(*args, **kwargs):
            user = get_current_user()
            start_time = datetime.utcnow()

            # Execute the function
            try:
                result = f(*args, **kwargs)

                # Log successful access
                logger.info(
                    "access_granted",
                    user_id=user.id if user else None,
                    action=action,
                    resource_type=resource_type.value if resource_type else None,
                    endpoint=request.endpoint,
                    method=request.method,
                    ip_address=request.remote_addr,
                    user_agent=request.headers.get("User-Agent"),
                    duration_ms=(datetime.utcnow() - start_time).total_seconds() * 1000,
                )

                return result

            except Exception as e:
                # Log failed access
                logger.error(
                    "access_failed",
                    user_id=user.id if user else None,
                    action=action,
                    resource_type=resource_type.value if resource_type else None,
                    endpoint=request.endpoint,
                    method=request.method,
                    ip_address=request.remote_addr,
                    error=str(e),
                    duration_ms=(datetime.utcnow() - start_time).total_seconds() * 1000,
                )
                raise

        return wrapper

    return decorator


# Utility functions for use within endpoints
def has_permission(
    user: User,
    permission_name: str,
) -> bool:
    """Check permission in the current tenant security context."""
    permissions = get_request_effective_permissions(user)

    return (
        "*" in permissions
        or permission_name in permissions
    )


def has_role(user: User, role_name: str) -> bool:
    """Check if a user has a specific role"""
    active_assignments = UserRoleAssignment.query.filter_by(
        user_id=user.id, is_active=True
    ).all()

    user_roles = {
        assignment.role.name
        for assignment in active_assignments
        if assignment.is_valid()
    }

    return role_name in user_roles


def get_user_roles(user: User) -> List[str]:
    """Get all active roles for a user"""
    active_assignments = UserRoleAssignment.query.filter_by(
        user_id=user.id, is_active=True
    ).all()

    return [
        assignment.role.name
        for assignment in active_assignments
        if assignment.is_valid()
    ]


def can_access_resource(
    user: User, resource_type: ResourceType, resource_id: str, permission_name: str
) -> bool:
    """Check if user can access a specific resource"""
    return check_resource_access(user, resource_type, resource_id, permission_name)
