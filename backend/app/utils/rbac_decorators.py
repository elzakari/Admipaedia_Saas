"""
Enhanced RBAC Decorators and Access Control Utilities
Provides comprehensive role and permission-based access control
"""

from functools import wraps
from typing import List, Union, Optional, Dict, Any, Callable
from flask import request, jsonify, g, current_app
from flask_jwt_extended import get_jwt_identity, verify_jwt_in_request, get_jwt
import structlog
from datetime import datetime

from app.models.user import User
from app.models.rbac import (
    RBACRole, RBACPermission, UserRoleAssignment, 
    PermissionGrant, AccessControlList, ResourceType, PermissionType
)

logger = structlog.get_logger()

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

def get_user_permissions(user: User, include_role_permissions: bool = True, 
                        include_direct_grants: bool = True) -> set:
    """Get all permissions for a user"""
    permissions = set()
    
    if include_role_permissions:
        # Get permissions from active role assignments
        active_assignments = UserRoleAssignment.query.filter_by(
            user_id=user.id, is_active=True
        ).all()
        
        for assignment in active_assignments:
            if assignment.is_valid():
                role_permissions = assignment.role.get_all_permissions(include_inherited=True)
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

def check_resource_access(user: User, resource_type: ResourceType, 
                         resource_id: str, permission_name: str) -> bool:
    """Check if user has access to a specific resource"""
    # Check ACL entries for this specific resource
    acl_entries = AccessControlList.query.filter_by(
        resource_type=resource_type,
        resource_id=resource_id
    ).order_by(AccessControlList.priority.desc()).all()
    
    user_roles = [assignment.role.id for assignment in 
                  UserRoleAssignment.query.filter_by(user_id=user.id, is_active=True).all()
                  if assignment.is_valid()]
    
    for acl in acl_entries:
        if not acl.is_effective():
            continue
        
        # Check if ACL applies to this user
        applies = False
        if acl.subject_type == 'user' and acl.subject_id == user.id:
            applies = True
        elif acl.subject_type == 'role' and acl.subject_id in user_roles:
            applies = True
        
        if applies and acl.permission.name == permission_name:
            return acl.access_type == 'allow'
    
    # Fall back to general permission check
    return permission_name in get_user_permissions(user)

# Decorator functions
def require_permission(permission_name: str, resource_type: Optional[ResourceType] = None,
                      resource_id_param: Optional[str] = None):
    """
    Decorator to require a specific permission
    
    Args:
        permission_name: Name of the required permission
        resource_type: Type of resource being accessed (optional)
        resource_id_param: Parameter name containing resource ID (optional)
    """
    def decorator(f: Callable) -> Callable:
        @wraps(f)
        def wrapper(*args, **kwargs):
            user = get_current_user()
            if not user:
                logger.warning("permission_check_no_user", permission=permission_name)
                return jsonify({"error": "Authentication required"}), 401
            
            # Check resource-specific access if specified
            if resource_type and resource_id_param:
                resource_id = kwargs.get(resource_id_param) or request.view_args.get(resource_id_param)
                if resource_id and not check_resource_access(user, resource_type, str(resource_id), permission_name):
                    logger.warning("permission_denied_resource", 
                                 user_id=user.id, permission=permission_name,
                                 resource_type=resource_type.value, resource_id=resource_id)
                    return jsonify({"error": "Insufficient permissions for this resource"}), 403
            
            # Check general permission
            # Superuser bypass for legacy admin role
            if getattr(user, 'role', '').lower() == 'admin':
                g.current_user = user
                g.user_permissions = get_user_permissions(user)
                return f(*args, **kwargs)
            user_permissions = get_user_permissions(user)
            if permission_name not in user_permissions:
                logger.warning("permission_denied", 
                             user_id=user.id, permission=permission_name,
                             user_permissions=list(user_permissions))
                return jsonify({"error": "Insufficient permissions"}), 403
            
            # Store user in g for use in the endpoint
            g.current_user = user
            g.user_permissions = user_permissions
            
            return f(*args, **kwargs)
        return wrapper
    return decorator

def require_role(role_names: Union[str, List[str]], require_all: bool = False):
    """
    Decorator to require specific roles
    
    Args:
        role_names: Required role name(s)
        require_all: If True, user must have ALL specified roles
    """
    if isinstance(role_names, str):
        role_names = [role_names]
    
    def decorator(f: Callable) -> Callable:
        @wraps(f)
        def wrapper(*args, **kwargs):
            user = get_current_user()
            if not user:
                logger.warning("role_check_no_user", roles=role_names)
                return jsonify({"error": "Authentication required"}), 401
            
            # Superuser and legacy role bypass
            user_legacy_role = getattr(user, 'role', '').lower()
            if user_legacy_role == 'admin' or user_legacy_role in role_names:
                g.current_user = user
                g.user_roles = {user_legacy_role}
                return f(*args, **kwargs)
            
            # Get user's active roles
            active_assignments = UserRoleAssignment.query.filter_by(
                user_id=user.id, is_active=True
            ).all()
            
            user_roles = {assignment.role.name for assignment in active_assignments 
                         if assignment.is_valid()}
            
            # Check role requirements
            if require_all:
                missing_roles = set(role_names) - user_roles
                if missing_roles:
                    logger.warning("role_denied_missing_all", 
                                 user_id=user.id, required_roles=role_names,
                                 user_roles=list(user_roles), missing_roles=list(missing_roles))
                    return jsonify({"error": f"Missing required roles: {', '.join(missing_roles)}"}), 403
            else:
                if not any(role in user_roles for role in role_names):
                    logger.warning("role_denied_missing_any", 
                                 user_id=user.id, required_roles=role_names,
                                 user_roles=list(user_roles))
                    return jsonify({"error": "Insufficient role permissions"}), 403
            
            # Store user in g for use in the endpoint
            g.current_user = user
            g.user_roles = user_roles
            
            return f(*args, **kwargs)
        return wrapper
    return decorator

def require_any_permission(permission_names: List[str]):
    """
    Decorator to require any one of the specified permissions
    
    Args:
        permission_names: List of permission names (user needs at least one)
    """
    def decorator(f: Callable) -> Callable:
        @wraps(f)
        def wrapper(*args, **kwargs):
            user = get_current_user()
            if not user:
                logger.warning("any_permission_check_no_user", permissions=permission_names)
                return jsonify({"error": "Authentication required"}), 401
            
            user_permissions = get_user_permissions(user)
            
            if not any(perm in user_permissions for perm in permission_names):
                logger.warning("any_permission_denied", 
                             user_id=user.id, required_permissions=permission_names,
                             user_permissions=list(user_permissions))
                return jsonify({"error": "Insufficient permissions"}), 403
            
            # Store user in g for use in the endpoint
            g.current_user = user
            g.user_permissions = user_permissions
            
            return f(*args, **kwargs)
        return wrapper
    return decorator

def require_all_permissions(permission_names: List[str]):
    """
    Decorator to require all specified permissions
    
    Args:
        permission_names: List of permission names (user needs all of them)
    """
    def decorator(f: Callable) -> Callable:
        @wraps(f)
        def wrapper(*args, **kwargs):
            user = get_current_user()
            if not user:
                logger.warning("all_permissions_check_no_user", permissions=permission_names)
                return jsonify({"error": "Authentication required"}), 401
            
            user_permissions = get_user_permissions(user)
            missing_permissions = set(permission_names) - user_permissions
            
            if missing_permissions:
                logger.warning("all_permissions_denied", 
                             user_id=user.id, required_permissions=permission_names,
                             user_permissions=list(user_permissions),
                             missing_permissions=list(missing_permissions))
                return jsonify({"error": f"Missing permissions: {', '.join(missing_permissions)}"}), 403
            
            # Store user in g for use in the endpoint
            g.current_user = user
            g.user_permissions = user_permissions
            
            return f(*args, **kwargs)
        return wrapper
    return decorator

def require_ownership_or_permission(permission_name: str, owner_field: str = 'user_id'):
    """
    Decorator to require either ownership of a resource or a specific permission
    
    Args:
        permission_name: Permission name that can override ownership requirement
        owner_field: Field name that contains the owner user ID
    """
    def decorator(f: Callable) -> Callable:
        @wraps(f)
        def wrapper(*args, **kwargs):
            user = get_current_user()
            if not user:
                logger.warning("ownership_check_no_user", permission=permission_name)
                return jsonify({"error": "Authentication required"}), 401
            
            # Check if user has the override permission
            user_permissions = get_user_permissions(user)
            if permission_name in user_permissions:
                g.current_user = user
                g.user_permissions = user_permissions
                return f(*args, **kwargs)
            
            # Check ownership - this requires the endpoint to provide the resource
            # The actual ownership check would need to be implemented in the endpoint
            # or we need additional context about the resource being accessed
            
            g.current_user = user
            g.user_permissions = user_permissions
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
                logger.info("access_granted", 
                          user_id=user.id if user else None,
                          action=action,
                          resource_type=resource_type.value if resource_type else None,
                          endpoint=request.endpoint,
                          method=request.method,
                          ip_address=request.remote_addr,
                          user_agent=request.headers.get('User-Agent'),
                          duration_ms=(datetime.utcnow() - start_time).total_seconds() * 1000)
                
                return result
                
            except Exception as e:
                # Log failed access
                logger.error("access_failed", 
                           user_id=user.id if user else None,
                           action=action,
                           resource_type=resource_type.value if resource_type else None,
                           endpoint=request.endpoint,
                           method=request.method,
                           ip_address=request.remote_addr,
                           error=str(e),
                           duration_ms=(datetime.utcnow() - start_time).total_seconds() * 1000)
                raise
                
        return wrapper
    return decorator

# Utility functions for use within endpoints
def has_permission(user: User, permission_name: str) -> bool:
    """Check if a user has a specific permission"""
    return permission_name in get_user_permissions(user)

def has_role(user: User, role_name: str) -> bool:
    """Check if a user has a specific role"""
    active_assignments = UserRoleAssignment.query.filter_by(
        user_id=user.id, is_active=True
    ).all()
    
    user_roles = {assignment.role.name for assignment in active_assignments 
                 if assignment.is_valid()}
    
    return role_name in user_roles

def get_user_roles(user: User) -> List[str]:
    """Get all active roles for a user"""
    active_assignments = UserRoleAssignment.query.filter_by(
        user_id=user.id, is_active=True
    ).all()
    
    return [assignment.role.name for assignment in active_assignments 
            if assignment.is_valid()]

def can_access_resource(user: User, resource_type: ResourceType, 
                       resource_id: str, permission_name: str) -> bool:
    """Check if user can access a specific resource"""
    return check_resource_access(user, resource_type, resource_id, permission_name)
