"""
Enhanced Role-Based Access Control (RBAC) Models
Provides comprehensive permission management, role hierarchies, and access control
"""

from datetime import datetime, timedelta, timezone
from typing import List, Dict, Any, Optional, Set
from app.extensions import db
import json
from enum import Enum


def _as_utc_aware(dt: datetime) -> datetime:
    if dt.tzinfo is None:
        return dt.replace(tzinfo=timezone.utc)
    return dt.astimezone(timezone.utc)


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)

# Association tables for many-to-many relationships
role_permissions = db.Table('role_permissions',
    db.Column('role_id', db.Integer, db.ForeignKey('rbac_roles.id'), primary_key=True),
    db.Column('permission_id', db.Integer, db.ForeignKey('rbac_permissions.id'), primary_key=True),
    db.Column('granted_at', db.DateTime, default=datetime.utcnow),
    db.Column('granted_by', db.Integer, db.ForeignKey('users.id'), nullable=True)
)

user_role_assignments = db.Table('user_role_assignments',
    db.Column('user_id', db.Integer, db.ForeignKey('users.id'), primary_key=True),
    db.Column('role_id', db.Integer, db.ForeignKey('rbac_roles.id'), primary_key=True),
    db.Column('assigned_at', db.DateTime, default=datetime.utcnow),
    db.Column('assigned_by', db.Integer, db.ForeignKey('users.id'), nullable=True),
    db.Column('expires_at', db.DateTime, nullable=True),
    db.Column('is_active', db.Boolean, default=True)
)

role_hierarchy = db.Table('role_hierarchy',
    db.Column('parent_role_id', db.Integer, db.ForeignKey('rbac_roles.id'), primary_key=True),
    db.Column('child_role_id', db.Integer, db.ForeignKey('rbac_roles.id'), primary_key=True),
    db.Column('created_at', db.DateTime, default=datetime.utcnow)
)

class PermissionType(Enum):
    """Types of permissions in the system"""
    CREATE = "create"
    READ = "read"
    UPDATE = "update"
    DELETE = "delete"
    EXECUTE = "execute"
    APPROVE = "approve"
    MANAGE = "manage"
    ADMIN = "admin"

class ResourceType(Enum):
    """Types of resources that can be protected"""
    USER = "USER"
    STUDENT = "STUDENT"
    TEACHER = "TEACHER"
    PARENT = "PARENT"
    CLASS = "CLASS"
    SUBJECT = "SUBJECT"
    GRADE = "GRADE"
    ATTENDANCE = "ATTENDANCE"
    EXAM = "EXAM"
    ASSIGNMENT = "ASSIGNMENT"
    REPORT = "REPORT"
    FINANCE = "FINANCE"
    SYSTEM = "SYSTEM"
    DASHBOARD = "DASHBOARD"
    TEACHER_ANALYTICS = "TEACHER_ANALYTICS"
    ANNOUNCEMENT = "ANNOUNCEMENT"

class SubjectType(Enum):
    """Types of subjects in access control lists"""
    USER = "user"
    ROLE = "role"
    GROUP = "group"

class RBACPermission(db.Model):
    """Enhanced permission model with granular control"""
    __tablename__ = 'rbac_permissions'
    
    id = db.Column(db.Integer, primary_key=True)
    
    # Permission identification
    name = db.Column(db.String(100), unique=True, nullable=False, index=True)
    display_name = db.Column(db.String(150), nullable=False)
    description = db.Column(db.Text, nullable=True)
    
    # Permission categorization
    resource_type = db.Column(db.Enum(ResourceType), nullable=False, index=True)
    permission_type = db.Column(db.Enum(PermissionType), nullable=False, index=True)
    
    # Permission scope and constraints
    scope = db.Column(db.String(50), default='global')  # global, department, class, self
    conditions = db.Column(db.JSON, nullable=True)  # Additional conditions for permission
    
    # System permissions
    is_system = db.Column(db.Boolean, default=False, nullable=False)
    is_active = db.Column(db.Boolean, default=True, nullable=False)
    
    # Metadata
    category = db.Column(db.String(50), nullable=True, index=True)
    priority = db.Column(db.Integer, default=0)  # For ordering permissions
    
    # Timestamps
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    def __repr__(self):
        return f'<RBACPermission {self.name}>'
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            'id': self.id,
            'name': self.name,
            'display_name': self.display_name,
            'description': self.description,
            'resource_type': self.resource_type.value if self.resource_type else None,
            'permission_type': self.permission_type.value if self.permission_type else None,
            'scope': self.scope,
            'conditions': self.conditions,
            'is_system': self.is_system,
            'is_active': self.is_active,
            'category': self.category,
            'priority': self.priority
        }

class RBACRole(db.Model):
    """Enhanced role model with hierarchy support"""
    __tablename__ = 'rbac_roles'
    
    id = db.Column(db.Integer, primary_key=True)
    
    # Role identification
    name = db.Column(db.String(50), unique=True, nullable=False, index=True)
    display_name = db.Column(db.String(100), nullable=False)
    description = db.Column(db.Text, nullable=True)
    
    # Role properties
    is_system = db.Column(db.Boolean, default=False, nullable=False)
    is_active = db.Column(db.Boolean, default=True, nullable=False)
    is_default = db.Column(db.Boolean, default=False, nullable=False)
    
    # Role hierarchy and organization
    level = db.Column(db.Integer, default=0)  # Hierarchy level (0 = highest)
    department_id = db.Column(db.Integer, db.ForeignKey('departments.id'), nullable=True)
    
    # Role constraints
    max_users = db.Column(db.Integer, nullable=True)  # Maximum users that can have this role
    auto_assign_conditions = db.Column(db.JSON, nullable=True)  # Conditions for auto-assignment
    
    # Metadata
    color = db.Column(db.String(7), default='#6B7280')  # Hex color for UI
    icon = db.Column(db.String(50), nullable=True)
    priority = db.Column(db.Integer, default=0)
    
    # Timestamps
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    permissions = db.relationship('RBACPermission', secondary=role_permissions, 
                                 backref=db.backref('roles', lazy='dynamic'))
    
    # Self-referential relationship for hierarchy
    parent_roles = db.relationship('RBACRole', 
                                  secondary=role_hierarchy,
                                  primaryjoin=id == role_hierarchy.c.child_role_id,
                                  secondaryjoin=id == role_hierarchy.c.parent_role_id,
                                  backref='child_roles')
    
    def __repr__(self):
        return f'<RBACRole {self.name}>'
    
    def has_permission(self, permission_name: str) -> bool:
        """Check if role has a specific permission"""
        return any(p.name == permission_name and p.is_active for p in self.permissions)
    
    def get_all_permissions(self, include_inherited: bool = True) -> Set[str]:
        """Get all permissions for this role, optionally including inherited ones"""
        permissions = {p.name for p in self.permissions if p.is_active}
        
        if include_inherited:
            for parent_role in self.parent_roles:
                permissions.update(parent_role.get_all_permissions(include_inherited=True))
        
        return permissions
    
    def can_assign_role(self, target_role: 'RBACRole') -> bool:
        """Check if this role can assign another role"""
        return self.level <= target_role.level
    
    def to_dict(self, include_permissions: bool = False) -> Dict[str, Any]:
        result = {
            'id': self.id,
            'name': self.name,
            'display_name': self.display_name,
            'description': self.description,
            'is_system': self.is_system,
            'is_active': self.is_active,
            'is_default': self.is_default,
            'level': self.level,
            'color': self.color,
            'icon': self.icon,
            'priority': self.priority,
            'user_count': len(self.users) if hasattr(self, 'users') else 0
        }
        
        if include_permissions:
            result['permissions'] = [p.to_dict() for p in self.permissions if p.is_active]
            result['all_permissions'] = list(self.get_all_permissions())
        
        return result

class UserRoleAssignment(db.Model):
    """Track user role assignments with metadata"""
    __tablename__ = 'user_role_assignments_detailed'
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False, index=True)
    role_id = db.Column(db.Integer, db.ForeignKey('rbac_roles.id'), nullable=False, index=True)
    
    # Assignment metadata
    assigned_by = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=True)
    assigned_reason = db.Column(db.String(255), nullable=True)
    
    # Temporal constraints
    assigned_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    expires_at = db.Column(db.DateTime, nullable=True)
    
    # Status
    is_active = db.Column(db.Boolean, default=True, nullable=False)
    is_temporary = db.Column(db.Boolean, default=False, nullable=False)
    
    # Context constraints
    context_data = db.Column(db.JSON, nullable=True)  # Additional context for role assignment
    
    # Relationships
    user = db.relationship('User', foreign_keys=[user_id], backref='detailed_role_assignments')
    role = db.relationship('RBACRole', backref='detailed_assignments')
    assigner = db.relationship('User', foreign_keys=[assigned_by])
    
    def __repr__(self):
        return f'<UserRoleAssignment user:{self.user_id} role:{self.role_id}>'
    
    def is_valid(self) -> bool:
        """Check if the role assignment is currently valid"""
        if not self.is_active:
            return False
        
        if self.expires_at and _as_utc_aware(self.expires_at) < _utcnow():
            return False
        
        return True

class PermissionGrant(db.Model):
    """Direct permission grants to users (bypassing roles)"""
    __tablename__ = 'permission_grants'
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False, index=True)
    permission_id = db.Column(db.Integer, db.ForeignKey('rbac_permissions.id'), nullable=False, index=True)
    
    # Grant metadata
    granted_by = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=True)
    granted_reason = db.Column(db.String(255), nullable=True)
    
    # Temporal constraints
    granted_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    expires_at = db.Column(db.DateTime, nullable=True)
    
    # Status
    is_active = db.Column(db.Boolean, default=True, nullable=False)
    is_denied = db.Column(db.Boolean, default=False, nullable=False)  # Explicit denial
    
    # Context constraints
    resource_id = db.Column(db.String(100), nullable=True)  # Specific resource ID
    conditions = db.Column(db.JSON, nullable=True)  # Additional conditions
    
    # Relationships
    user = db.relationship('User', foreign_keys=[user_id], backref='permission_grants')
    permission = db.relationship('RBACPermission', backref='grants')
    granter = db.relationship('User', foreign_keys=[granted_by])
    
    def __repr__(self):
        return f'<PermissionGrant user:{self.user_id} permission:{self.permission_id}>'
    
    def is_valid(self) -> bool:
        """Check if the permission grant is currently valid"""
        if not self.is_active:
            return False
        
        if self.expires_at and _as_utc_aware(self.expires_at) < _utcnow():
            return False
        
        return True

class AccessControlList(db.Model):
    """Resource-specific access control lists"""
    __tablename__ = 'access_control_lists'
    
    id = db.Column(db.Integer, primary_key=True)
    
    # Resource identification
    resource_type = db.Column(db.Enum(ResourceType), nullable=False, index=True)
    resource_id = db.Column(db.String(100), nullable=False, index=True)
    
    # Subject (who gets access)
    subject_type = db.Column(db.String(20), nullable=False)  # 'user', 'role', 'group'
    subject_id = db.Column(db.Integer, nullable=False)
    
    # Permission
    permission_id = db.Column(db.Integer, db.ForeignKey('rbac_permissions.id'), nullable=False)
    
    # Access control
    access_type = db.Column(db.String(10), default='allow', nullable=False)  # 'allow', 'deny'
    priority = db.Column(db.Integer, default=0)  # Higher priority rules override lower ones
    
    # Conditions
    conditions = db.Column(db.JSON, nullable=True)
    
    # Temporal constraints
    effective_from = db.Column(db.DateTime, default=datetime.utcnow)
    effective_until = db.Column(db.DateTime, nullable=True)
    
    # Metadata
    created_by = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    
    # Relationships
    permission = db.relationship('RBACPermission')
    creator = db.relationship('User')
    
    def __repr__(self):
        return f'<ACL {self.resource_type.value}:{self.resource_id} {self.subject_type}:{self.subject_id}>'
    
    def is_effective(self) -> bool:
        """Check if the ACL entry is currently effective"""
        now = datetime.utcnow()
        
        if self.effective_from and self.effective_from > now:
            return False
        
        if self.effective_until and self.effective_until < now:
            return False
        
        return True

class RoleTemplate(db.Model):
    """Templates for creating roles with predefined permissions"""
    __tablename__ = 'role_templates'
    
    id = db.Column(db.Integer, primary_key=True)
    
    # Template identification
    name = db.Column(db.String(100), unique=True, nullable=False)
    display_name = db.Column(db.String(150), nullable=False)
    description = db.Column(db.Text, nullable=True)
    
    # Template configuration
    permission_set = db.Column(db.JSON, nullable=False)  # List of permission names
    default_properties = db.Column(db.JSON, nullable=True)  # Default role properties
    
    # Template metadata
    category = db.Column(db.String(50), nullable=True)
    is_system = db.Column(db.Boolean, default=False, nullable=False)
    is_active = db.Column(db.Boolean, default=True, nullable=False)
    
    # Usage tracking
    usage_count = db.Column(db.Integer, default=0)
    
    # Timestamps
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    def __repr__(self):
        return f'<RoleTemplate {self.name}>'
    
    def create_role(self, role_name: str, **kwargs) -> RBACRole:
        """Create a new role based on this template"""
        # Merge template defaults with provided kwargs
        properties = self.default_properties or {}
        properties.update(kwargs)
        
        # Create the role
        role = RBACRole(
            name=role_name,
            display_name=properties.get('display_name', role_name),
            description=properties.get('description', self.description),
            **{k: v for k, v in properties.items() if k in ['level', 'color', 'icon', 'priority']}
        )
        
        # Add permissions
        permissions = RBACPermission.query.filter(
            RBACPermission.name.in_(self.permission_set)
        ).all()
        role.permissions.extend(permissions)
        
        # Increment usage count
        self.usage_count += 1
        
        return role
