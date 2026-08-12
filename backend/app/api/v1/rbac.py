"""
RBAC API endpoints for role and permission management
"""

from typing import Any, Dict, List, Optional

import structlog
from flask import Blueprint, g, jsonify, request
from flask_jwt_extended import get_jwt_identity, jwt_required
from marshmallow import EXCLUDE, Schema, ValidationError, fields, validate

from app.extensions import db
from app.models.rbac import (AccessControlList, PermissionGrant,
                             PermissionType, RBACPermission, RBACRole,
                             ResourceType, UserRoleAssignment)
from app.models.user import User
from app.services.rbac_service import RBACService
from app.utils.rbac_decorators import (audit_access, require_permission,
                                       require_role)
from app.utils.response import (error_response, paginated_response,
                                success_response)

logger = structlog.get_logger()
rbac_bp = Blueprint("rbac", __name__, url_prefix="/api/v1/rbac")


# Schemas for request validation
class CreateRoleSchema(Schema):
    class Meta:
        # Accept forward-compatible payload extras (e.g. UI drafts that start
        # sending new fields) without raising "Unknown field" ValidationError.
        # The service layer already whitelists the actual RBACRole constructor
        # kwargs, so unknown keys are safely dropped at commit time.
        unknown = EXCLUDE

    name = fields.Str(required=True, validate=validate.Length(min=1, max=50))
    display_name = fields.Str(load_default=None)
    description = fields.Str(load_default="")
    color = fields.Str(load_default="#6B7280")
    icon = fields.Str(load_default="shield")
    level = fields.Int(load_default=5)
    department_id = fields.Int(allow_none=True)
    max_users = fields.Int(allow_none=True)
    permission_names = fields.List(fields.Str(), load_default=[])
    auto_assignment_conditions = fields.Dict(keys=fields.Str(), load_default={})
    auto_assign_conditions = fields.Dict(keys=fields.Str(), load_default=None)
    auto_assigned_conditions = fields.Dict(keys=fields.Str(), load_default=None)
    default_properties = fields.Dict(keys=fields.Str(), load_default={})
    is_active = fields.Bool(load_default=True)
    is_default = fields.Bool(load_default=False)
    priority = fields.Int(allow_none=True)


class UpdateRoleSchema(Schema):
    class Meta:
        unknown = EXCLUDE

    name = fields.Str(validate=validate.Length(min=1, max=50))
    display_name = fields.Str()
    description = fields.Str()
    color = fields.Str()
    icon = fields.Str()
    level = fields.Int()
    department_id = fields.Int(allow_none=True)
    max_users = fields.Int(allow_none=True)
    permission_names = fields.List(fields.Str())
    auto_assignment_conditions = fields.Dict(keys=fields.Str())
    auto_assign_conditions = fields.Dict(keys=fields.Str())
    auto_assigned_conditions = fields.Dict(keys=fields.Str())
    default_properties = fields.Dict(keys=fields.Str())
    is_active = fields.Bool()
    is_default = fields.Bool()
    priority = fields.Int(allow_none=True)


class UpdatePermissionSchema(Schema):
    display_name = fields.Str(required=False, validate=validate.Length(min=1, max=150))
    description = fields.Str(allow_none=True)
    category = fields.Str(required=False, validate=validate.Length(min=1, max=50))
    is_active = fields.Bool()


class RoleCreateSchema(Schema):
    class Meta:
        unknown = EXCLUDE

    name = fields.Str(required=True, validate=validate.Length(min=1, max=50))
    display_name = fields.Str(load_default=None)
    description = fields.Str(load_default="")
    color = fields.Str(load_default="#6B7280")
    icon = fields.Str(load_default="shield")
    level = fields.Int(load_default=5)
    is_system_role = fields.Bool(dump_only=True)
    is_active = fields.Bool(load_default=True)
    permission_names = fields.List(fields.Str(), load_default=[])
    auto_assignment_conditions = fields.Dict(keys=fields.Str(), load_default={})
    auto_assign_conditions = fields.Dict(keys=fields.Str(), load_default=None)
    auto_assigned_conditions = fields.Dict(keys=fields.Str(), load_default=None)
    default_properties = fields.Dict(keys=fields.Str(), load_default={})
    department_id = fields.Int(allow_none=True)
    max_users = fields.Int(allow_none=True)
    is_default = fields.Bool(load_default=False)
    priority = fields.Int(allow_none=True)


class CreatePermissionSchema(Schema):
    name = fields.Str(required=True)
    display_name = fields.Str(required=True)
    description = fields.Str(load_default="")
    resource_type = fields.Enum(ResourceType, required=True)
    permission_type = fields.Enum(PermissionType, required=True)
    scope = fields.Str(allow_none=True)
    category = fields.Str(required=True)
    conditions = fields.Dict(load_default={})
    metadata = fields.Dict(load_default={})


class AssignRoleSchema(Schema):
    role_name = fields.Str(required=True)
    reason = fields.Str(load_default="")
    expires_at = fields.DateTime(allow_none=True)
    context = fields.Dict(load_default={})
    conditions = fields.Dict(load_default={})


class GrantPermissionSchema(Schema):
    permission_name = fields.Str(required=True)
    reason = fields.Str(load_default="")
    expires_at = fields.DateTime(allow_none=True)
    context = fields.Dict(load_default={})
    conditions = fields.Dict(load_default={})
    is_denied = fields.Bool(load_default=False)


# Role Management Endpoints
@rbac_bp.route("/roles", methods=["GET"])
@jwt_required()
@require_permission("user.read")
@audit_access("list_roles")
def get_roles():
    """Get all roles"""
    try:
        roles = RBACService.get_all_roles()
        return success_response(data=roles)
    except Exception as e:
        logger.error("failed_to_get_roles", error=str(e))
        return error_response("Failed to retrieve roles", 500)


@rbac_bp.route("/roles/<int:role_id>", methods=["GET"])
@jwt_required()
@require_permission("user.read")
@audit_access("get_role")
def get_role(role_id: int):
    """Get a specific role"""
    try:
        role = RBACRole.query.get_or_404(role_id)
        role_data = {
            "id": role.id,
            "name": role.name,
            "display_name": role.display_name,
            "description": role.description,
            "color": role.color,
            "icon": role.icon,
            "level": role.level,
            "department_id": role.department_id,
            "max_users": role.max_users,
            "auto_assignment_conditions": role.auto_assignment_conditions,
            "default_properties": role.default_properties,
            "is_system": role.is_system,
            "is_active": role.is_active,
            "is_default": role.is_default,
            "created_at": role.created_at.isoformat(),
            "updated_at": role.updated_at.isoformat(),
            "permissions": [
                {
                    "id": p.id,
                    "name": p.name,
                    "display_name": p.display_name,
                    "resource_type": p.resource_type.value,
                    "permission_type": p.permission_type.value,
                    "category": p.category,
                }
                for p in role.permissions
            ],
            "user_count": UserRoleAssignment.query.filter_by(
                role_id=role.id, is_active=True
            ).count(),
        }
        return success_response(data=role_data)
    except Exception as e:
        logger.error("failed_to_get_role", role_id=role_id, error=str(e))
        return error_response("Failed to retrieve role", 500)


@rbac_bp.route("/roles", methods=["POST"])
@jwt_required()
@require_permission("user.manage_roles")
@audit_access("create_role")
def create_role():
    """Create a new role"""
    try:
        schema = CreateRoleSchema()
        raw_data = schema.load(request.json)

        # Backfill display_name from name if caller omitted it (frontend
        # Settings dialog uses role name as the display label too).
        if not raw_data.get("display_name"):
            raw_data["display_name"] = raw_data.get("name", "").strip() or None

        role, message = RBACService.create_role(
            name=raw_data["name"],
            display_name=raw_data["display_name"],
            permission_names=raw_data.get("permission_names", []),
            **{
                k: v
                for k, v in raw_data.items()
                if k not in ["name", "display_name", "permission_names"]
            },
        )

        if role:
            role_data = {
                "id": role.id,
                "name": role.name,
                "display_name": role.display_name,
                "description": role.description,
                "color": role.color,
                "icon": role.icon,
                "level": role.level,
                "is_active": role.is_active,
                "created_at": role.created_at.isoformat(),
            }
            return success_response(data=role_data, message=message)
        else:
            return error_response(message, 400)

    except ValidationError as e:
        return error_response("Validation error", 400, errors=e.messages)
    except Exception as e:
        logger.error("failed_to_create_role", error=str(e))
        return error_response("Failed to create role", 500)


@rbac_bp.route("/roles/<int:role_id>", methods=["PUT"])
@jwt_required()
@require_permission("user.manage_roles")
@audit_access("update_role")
def update_role(role_id: int):
    """Update a role"""
    try:
        role = RBACRole.query.get_or_404(role_id)

        if role.is_system:
            return error_response("Cannot modify system roles", 403)

        schema = UpdateRoleSchema()
        data = schema.load(request.json)

        # Normalize REST alias spelling → DB column names so the update
        # loop below never calls setattr(role, "auto_assignment_conditions", …)
        # on an object that only exposes that as a property alias (which would
        # otherwise still work, but keeps the loop logic honest).
        if "auto_assignment_conditions" in data:
            if "auto_assign_conditions" not in data:
                data["auto_assign_conditions"] = data.pop("auto_assignment_conditions")
            else:
                data.pop("auto_assignment_conditions")
        if "auto_assigned_conditions" in data and "auto_assign_conditions" not in data:
            data["auto_assign_conditions"] = data.pop("auto_assigned_conditions")

        # Update role fields
        for field, value in data.items():
            if field == "permission_names":
                # Update permissions
                permissions = RBACPermission.query.filter(
                    RBACPermission.name.in_(value)
                ).all()
                role.permissions = permissions
            elif field == "auto_assign_conditions":
                role.auto_assign_conditions = value
            elif field == "default_properties":
                role.default_properties = value
            elif hasattr(RBACRole, field):
                setattr(role, field, value)
            else:
                # Ignore unknown scalar fields instead of raising attribute error
                # inside the transaction; logs help track payload drift.
                logger.debug(
                    "update_role_ignored_field",
                    role_id=role_id,
                    field=field,
                )

        db.session.commit()

        role_data = {
            "id": role.id,
            "name": role.name,
            "display_name": role.display_name,
            "description": role.description,
            "color": role.color,
            "icon": role.icon,
            "level": role.level,
            "is_active": role.is_active,
            "updated_at": role.updated_at.isoformat(),
        }

        return success_response(data=role_data, message="Role updated successfully")

    except ValidationError as e:
        return error_response("Validation error", 400, errors=e.messages)
    except Exception as e:
        logger.error("failed_to_update_role", role_id=role_id, error=str(e))
        db.session.rollback()
        return error_response("Failed to update role", 500)


@rbac_bp.route("/roles/<int:role_id>", methods=["DELETE"])
@jwt_required()
@require_permission("user.manage_roles")
@audit_access("delete_role")
def delete_role(role_id: int):
    """Delete a role"""
    try:
        role = RBACRole.query.get_or_404(role_id)

        if role.is_system:
            return error_response("Cannot delete system roles", 403)

        # Check if role has active assignments
        active_assignments = UserRoleAssignment.query.filter_by(
            role_id=role.id, is_active=True
        ).count()

        if active_assignments > 0:
            return error_response(
                f"Cannot delete role with {active_assignments} active assignments", 400
            )

        db.session.delete(role)
        db.session.commit()

        return success_response(message="Role deleted successfully")

    except Exception as e:
        logger.error("failed_to_delete_role", role_id=role_id, error=str(e))
        db.session.rollback()
        return error_response("Failed to delete role", 500)


# Permission Management Endpoints
@rbac_bp.route("/permissions", methods=["GET"])
@jwt_required()
@require_permission("user.read")
@audit_access("list_permissions")
def get_permissions():
    """Get all permissions"""
    try:
        category = request.args.get("category")
        permissions = RBACService.get_all_permissions(category=category)
        return success_response(data=permissions)
    except Exception as e:
        logger.error("failed_to_get_permissions", error=str(e))
        return error_response("Failed to retrieve permissions", 500)


@rbac_bp.route("/permissions", methods=["POST"])
@jwt_required()
@require_permission("system.admin")
@audit_access("create_permission")
def create_permission():
    """Create a new permission

    This entrypoint requires system.admin by default.  The dedicated and
    more-delegatable permission ``permissions.create_custom`` also permits
    the same action so administrators can delegate "permission steward"
    capability without handing over full system admin control.
    """
    try:
        current_user_id = get_jwt_identity()
        current_user = User.query.get(current_user_id)
        from app.utils.rbac_decorators import has_permission

        is_admin = bool(has_permission(current_user, "system.admin")) if current_user else False
        is_custom_creator = bool(has_permission(current_user, "permissions.create_custom")) if current_user else False
        if not is_admin and not is_custom_creator:
            return error_response(
                "You are not allowed to create custom permissions. Ask an administrator for 'Create Custom Permissions' authority.",
                403,
            )

        schema = CreatePermissionSchema()
        data = schema.load(request.json)

        permission, message = RBACService.create_permission(
            is_system=False,
            **{
                k: v
                for k, v in data.items()
                if k not in ("metadata",)
            },
        )

        if permission:
            permission_data = {
                "id": permission.id,
                "name": permission.name,
                "display_name": permission.display_name,
                "description": permission.description,
                "resource_type": permission.resource_type.value,
                "permission_type": permission.permission_type.value,
                "category": permission.category,
                "is_system": permission.is_system,
                "is_active": permission.is_active,
                "created_at": permission.created_at.isoformat(),
            }
            return success_response(data=permission_data, message=message)
        else:
            return error_response(message, 400)

    except ValidationError as e:
        return error_response("Validation error", 400, errors=e.messages)
    except Exception as e:
        logger.error("failed_to_create_permission", error=str(e))
        return error_response("Failed to create permission", 500)


@rbac_bp.route("/permissions/<int:permission_id>", methods=["PUT"])
@jwt_required()
@require_permission("user.manage_roles")
@audit_access("update_permission")
def update_permission(permission_id: int):
    """Update a (non-system) permission row.

    Custom permissions can be edited freely.  System-shipped permissions
    only allow cosmetic display/description/category adjustments so the
    internal code contract used by decorators and route guards is never
    changed under running code.
    """
    try:
        permission = RBACPermission.query.get_or_404(permission_id)
        schema = UpdatePermissionSchema()
        data = schema.load(request.json or {})

        editable = {"display_name", "description", "category", "is_active"}
        if permission.is_system:
            # System rows keep their name/resource_type/permission_type frozen.
            allowed = {k: v for k, v in data.items() if k in {"display_name", "description", "category", "is_active"}}
        else:
            allowed = {k: v for k, v in data.items() if k in editable}

        for field, value in allowed.items():
            setattr(permission, field, value)

        db.session.commit()

        return success_response(
            data={
                "id": permission.id,
                "name": permission.name,
                "display_name": permission.display_name,
                "description": permission.description,
                "resource_type": permission.resource_type.value,
                "permission_type": permission.permission_type.value,
                "category": permission.category,
                "is_system": permission.is_system,
                "is_active": permission.is_active,
            },
            message="Permission updated successfully",
        )
    except ValidationError as e:
        return error_response("Validation error", 400, errors=e.messages)
    except Exception as e:
        logger.error("failed_to_update_permission", permission_id=permission_id, error=str(e))
        db.session.rollback()
        return error_response("Failed to update permission", 500)


@rbac_bp.route("/permissions/<int:permission_id>", methods=["DELETE"])
@jwt_required()
@require_permission("system.admin")
@audit_access("delete_permission")
def delete_permission(permission_id: int):
    """Delete a custom permission.

    System permissions cannot be deleted; they ship with the application
    and are expected by route guards and domain services.  Any custom
    permission can be deleted, but the operation is rejected if any role
    still has the permission attached so role assignments don't silently
    drop capability.
    """
    try:
        permission = RBACPermission.query.get_or_404(permission_id)
        if permission.is_system:
            return error_response("Cannot delete a system permission. Deactivate it instead, or create a custom permission to replace it.", 400)

        used_roles = (
            db.session.query(RBACRole.id, RBACRole.display_name)
            .join(RBACRole.permissions)
            .filter(RBACPermission.id == permission.id)
            .all()
        ) or []
        if used_roles:
            names = ", ".join([row[1] for row in used_roles[:6]])
            extra = f" (+{len(used_roles) - 6} more)" if len(used_roles) > 6 else ""
            return error_response(
                f"Cannot delete permission '{permission.display_name}' because it is still used by roles: {names}{extra}. Remove it from those roles first, then retry.",
                409,
            )

        db.session.delete(permission)
        db.session.commit()
        return success_response(message="Permission deleted successfully")
    except Exception as e:
        logger.error("failed_to_delete_permission", permission_id=permission_id, error=str(e))
        db.session.rollback()
        return error_response("Failed to delete permission", 500)


# User Role Assignment Endpoints
@rbac_bp.route("/users/<int:user_id>/roles", methods=["GET"])
@jwt_required()
@require_permission("user.read")
@audit_access("get_user_roles")
def get_user_roles(user_id: int):
    """Get roles for a specific user"""
    try:
        roles = RBACService.get_user_roles(user_id)
        return success_response(data=roles)
    except Exception as e:
        logger.error("failed_to_get_user_roles", user_id=user_id, error=str(e))
        return error_response("Failed to retrieve user roles", 500)


@rbac_bp.route("/users/<int:user_id>/roles", methods=["POST"])
@jwt_required()
@require_permission("user.manage_roles")
@audit_access("assign_role")
def assign_role(user_id: int):
    """Assign a role to a user"""
    try:
        schema = AssignRoleSchema()
        data = schema.load(request.json)

        current_user_id = get_jwt_identity()
        current_user = User.query.get(current_user_id)
        current_role = getattr(current_user, "role", None)
        if (
            data["role_name"] in ("super_admin", "super_manager")
            and current_role != "super_admin"
        ):
            return error_response("Unauthorized", 403)
        success, message = RBACService.assign_role_to_user(
            user_id=user_id,
            role_name=data["role_name"],
            assigned_by=current_user_id,
            expires_at=data.get("expires_at"),
            reason=data.get("reason"),
        )

        if success:
            return success_response(message=message)
        else:
            return error_response(message, 400)

    except ValidationError as e:
        return error_response("Validation error", 400, errors=e.messages)
    except Exception as e:
        logger.error("failed_to_assign_role", user_id=user_id, error=str(e))
        return error_response("Failed to assign role", 500)


@rbac_bp.route("/users/<int:user_id>/roles/<role_name>", methods=["DELETE"])
@jwt_required()
@require_permission("user.manage_roles")
@audit_access("revoke_role")
def revoke_role(user_id: int, role_name: str):
    """Revoke a role from a user"""
    try:
        current_user_id = get_jwt_identity()
        current_user = User.query.get(current_user_id)
        current_role = getattr(current_user, "role", None)
        if (
            role_name in ("super_admin", "super_manager")
            and current_role != "super_admin"
        ):
            return error_response("Unauthorized", 403)
        success, message = RBACService.revoke_role_from_user(user_id, role_name)

        if success:
            return success_response(message=message)
        else:
            return error_response(message, 400)

    except Exception as e:
        logger.error(
            "failed_to_revoke_role", user_id=user_id, role_name=role_name, error=str(e)
        )
        return error_response("Failed to revoke role", 500)


# User Permission Endpoints
@rbac_bp.route("/users/<int:user_id>/permissions", methods=["GET"])
@jwt_required()
@require_permission("user.read")
@audit_access("get_user_permissions")
def get_user_permissions(user_id: int):
    """Get effective permissions for a user"""
    try:
        user = User.query.get_or_404(user_id)
        from app.utils.rbac_decorators import get_user_permissions

        permissions = list(get_user_permissions(user))
        return success_response(data=permissions)
    except Exception as e:
        logger.error("failed_to_get_user_permissions", user_id=user_id, error=str(e))
        return error_response("Failed to retrieve user permissions", 500)


# Permission Checking Endpoints
@rbac_bp.route("/check/permission", methods=["POST"])
@jwt_required()
@audit_access("check_permission")
def check_permission():
    """Check if a user has a specific permission"""
    try:
        data = request.json
        user_id = data.get("user_id")
        permission = data.get("permission")

        if not user_id or not permission:
            return error_response("user_id and permission are required", 400)

        user = User.query.get_or_404(user_id)
        from app.utils.rbac_decorators import has_permission

        has_perm = has_permission(user, permission)

        return success_response(data=has_perm)
    except Exception as e:
        logger.error("failed_to_check_permission", error=str(e))
        return error_response("Failed to check permission", 500)


@rbac_bp.route("/check/role", methods=["POST"])
@jwt_required()
@audit_access("check_role")
def check_role():
    """Check if a user has a specific role"""
    try:
        data = request.json
        user_id = data.get("user_id")
        role = data.get("role")

        if not user_id or not role:
            return error_response("user_id and role are required", 400)

        user = User.query.get_or_404(user_id)
        from app.utils.rbac_decorators import has_role

        has_role_result = has_role(user, role)

        return success_response(data=has_role_result)
    except Exception as e:
        logger.error("failed_to_check_role", error=str(e))
        return error_response("Failed to check role", 500)


# System Initialization Endpoints
@rbac_bp.route("/initialize/permissions", methods=["POST"])
@jwt_required()
@require_permission("system.admin")
@audit_access("initialize_permissions")
def initialize_permissions():
    """Initialize default system permissions"""
    try:
        success = RBACService.initialize_default_permissions()
        if success:
            return success_response(
                message="Default permissions initialized successfully"
            )
        else:
            return error_response("Failed to initialize permissions", 500)
    except Exception as e:
        logger.error("failed_to_initialize_permissions", error=str(e))
        return error_response("Failed to initialize permissions", 500)


@rbac_bp.route("/initialize/roles", methods=["POST"])
@jwt_required()
@require_permission("system.admin")
@audit_access("initialize_roles")
def initialize_roles():
    """Initialize default system roles"""
    try:
        success = RBACService.initialize_default_roles()
        if success:
            return success_response(message="Default roles initialized successfully")
        else:
            return error_response("Failed to initialize roles", 500)
    except Exception as e:
        logger.error("failed_to_initialize_roles", error=str(e))
        return error_response("Failed to initialize roles", 500)


# Dashboard Endpoint
@rbac_bp.route("/dashboard", methods=["GET"])
@jwt_required()
@require_permission("dashboard.admin")
@audit_access("rbac_dashboard")
def get_dashboard_data():
    """Get RBAC dashboard statistics"""
    try:
        # Role statistics
        total_roles = RBACRole.query.count()
        active_roles = RBACRole.query.filter_by(is_active=True).count()
        system_roles = RBACRole.query.filter_by(is_system=True).count()

        # Permission statistics
        total_permissions = RBACPermission.query.count()
        permissions_by_category = {}
        for permission in RBACPermission.query.all():
            category = permission.category
            permissions_by_category[category] = (
                permissions_by_category.get(category, 0) + 1
            )

        # User role assignment statistics
        total_assignments = UserRoleAssignment.query.count()
        active_assignments = UserRoleAssignment.query.filter_by(is_active=True).count()

        dashboard_data = {
            "role_stats": {
                "total_roles": total_roles,
                "active_roles": active_roles,
                "system_roles": system_roles,
                "custom_roles": total_roles - system_roles,
            },
            "permission_stats": {
                "total_permissions": total_permissions,
                "permissions_by_category": permissions_by_category,
            },
            "user_role_stats": {
                "total_assignments": total_assignments,
                "active_assignments": active_assignments,
                "expired_assignments": total_assignments - active_assignments,
            },
        }

        return success_response(data=dashboard_data)
    except Exception as e:
        logger.error("failed_to_get_dashboard_data", error=str(e))
        return error_response("Failed to retrieve dashboard data", 500)


# Error handlers
@rbac_bp.errorhandler(ValidationError)
def handle_validation_error(e):
    return error_response("Validation error", 400, e.messages)


@rbac_bp.errorhandler(404)
def handle_not_found(e):
    return error_response("Resource not found", 404)


@rbac_bp.errorhandler(500)
def handle_internal_error(e):
    return error_response("Internal server error", 500)


class PermissionCreateSchema(Schema):
    name = fields.Str(required=True, validate=validate.Length(min=1, max=100))
    description = fields.Str(load_default="")
    resource = fields.Str(required=True, validate=validate.Length(min=1, max=50))
    action = fields.Str(required=True, validate=validate.Length(min=1, max=50))
    conditions = fields.Dict(load_default={})
    metadata = fields.Dict(load_default={})


class UserRoleAssignmentSchema(Schema):
    user_id = fields.Int(required=True)
    reason = fields.Str(load_default="")
    expires_at = fields.DateTime(allow_none=True)
    context = fields.Dict(load_default={})
    conditions = fields.Dict(load_default={})


class UserPermissionGrantSchema(Schema):
    user_id = fields.Int(required=True)
    permission_name = fields.Str(required=True)
    reason = fields.Str(load_default="")
    expires_at = fields.DateTime(allow_none=True)
    context = fields.Dict(load_default={})
    conditions = fields.Dict(load_default={})
    is_denied = fields.Bool(load_default=False)
