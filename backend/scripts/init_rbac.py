#!/usr/bin/env python3
"""
RBAC System Initialization Script
Initializes default roles, permissions, and system configuration
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app import create_app
from app.extensions import db
from app.services.rbac_service import RBACService
from app.models.rbac import RBACRole, RBACPermission
from app.models.user import User
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def init_rbac_system():
    """Initialize the RBAC system with default roles and permissions"""
    app = create_app()
    
    with app.app_context():
        try:
            logger.info("Starting RBAC system initialization...")
            
            # Check if RBAC is already initialized
            if RBACPermission.query.first() is not None:
                logger.info("RBAC system already initialized. Skipping...")
                return
            
            # Initialize default permissions
            logger.info("Creating default permissions...")
            RBACService.initialize_default_permissions()
            
            # Initialize default roles
            logger.info("Creating default roles...")
            RBACService.initialize_default_roles()
            
            # Commit changes
            db.session.commit()
            
            logger.info("RBAC system initialization completed successfully!")
            
            # Print summary
            permission_count = RBACPermission.query.count()
            role_count = RBACRole.query.count()
            
            logger.info(f"Created {permission_count} permissions and {role_count} roles")
            
        except Exception as e:
            logger.error(f"Error initializing RBAC system: {str(e)}")
            db.session.rollback()
            raise

def assign_admin_role():
    """Assign super_admin role to the first user (typically the admin)"""
    app = create_app()
    
    with app.app_context():
        try:
            # Find the first user or admin user
            admin_user = User.query.filter_by(email='admin@admipaedia.com').first()
            if not admin_user:
                admin_user = User.query.first()
            
            if not admin_user:
                logger.warning("No users found. Please create an admin user first.")
                return
            
            # Find super_admin role
            super_admin_role = RBACRole.query.filter_by(name='super_admin').first()
            if not super_admin_role:
                logger.error("Super admin role not found. Please run RBAC initialization first.")
                return
            
            # Assign role
            RBACService.assign_role_to_user(admin_user.id, super_admin_role.name)
            
            logger.info(f"Assigned super_admin role to user: {admin_user.email}")
            
        except Exception as e:
            logger.error(f"Error assigning admin role: {str(e)}")
            db.session.rollback()
            raise

def ensure_analytics_permissions():
    app = create_app()
    with app.app_context():
        try:
            logger.info("Ensuring analytics permissions exist...")
            from app.models.rbac import RBACPermission, RBACRole, ResourceType, PermissionType

            wanted = [
                ('view_analytics', 'Analytics View', ResourceType.DASHBOARD, PermissionType.READ, 'analytics'),
                ('view_school_analytics', 'School Analytics View', ResourceType.DASHBOARD, PermissionType.READ, 'analytics'),
                ('view_teacher_analytics', 'Teacher Analytics View', ResourceType.TEACHER, PermissionType.READ, 'analytics'),
                ('manage_resources', 'Manage Resources', ResourceType.SYSTEM, PermissionType.MANAGE, 'system'),
                ('manage_ai_models', 'Manage AI Models', ResourceType.SYSTEM, PermissionType.MANAGE, 'system'),
                ('manage_system', 'Manage System', ResourceType.SYSTEM, PermissionType.MANAGE, 'system'),
            ]

            created = 0
            for name, display, res, ptype, category in wanted:
                existing = RBACPermission.query.filter_by(name=name).first()
                if not existing:
                    RBACService.create_permission(
                        name=name,
                        display_name=display,
                        resource_type=res,
                        permission_type=ptype,
                        category=category,
                        is_system=True
                    )
                    created += 1

            role = RBACRole.query.filter_by(name='super_admin', is_active=True).first()
            if not role:
                logger.error("Super admin role not found; cannot attach analytics permissions")
                return

            perm_names = [w[0] for w in wanted]
            perms = RBACPermission.query.filter(RBACPermission.name.in_(perm_names)).all()
            existing_names = {p.name for p in role.permissions}
            for p in perms:
                if p.name not in existing_names:
                    role.permissions.append(p)

            db.session.commit()
            logger.info(f"Analytics permissions ensured; created={created}, attached_to_super_admin={len(perms)}")
        except Exception as e:
            db.session.rollback()
            logger.error(f"Error ensuring analytics permissions: {str(e)}")
            raise

def ensure_announcement_permissions():
    app = create_app()
    with app.app_context():
        try:
            logger.info("Ensuring announcement permissions exist...")
            from app.models.rbac import RBACPermission, RBACRole, ResourceType, PermissionType

            wanted = [
                ('announcement.create', 'Create Announcements', ResourceType.ANNOUNCEMENT if hasattr(ResourceType, 'ANNOUNCEMENT') else 'ANNOUNCEMENT', PermissionType.CREATE, 'academic'),
                ('announcement.read', 'View Announcements', ResourceType.ANNOUNCEMENT if hasattr(ResourceType, 'ANNOUNCEMENT') else 'ANNOUNCEMENT', PermissionType.READ, 'academic'),
                ('announcement.update', 'Update Announcements', ResourceType.ANNOUNCEMENT if hasattr(ResourceType, 'ANNOUNCEMENT') else 'ANNOUNCEMENT', PermissionType.UPDATE, 'academic'),
                ('announcement.delete', 'Delete Announcements', ResourceType.ANNOUNCEMENT if hasattr(ResourceType, 'ANNOUNCEMENT') else 'ANNOUNCEMENT', PermissionType.DELETE, 'academic'),
            ]

            created = 0
            for name, display, res, ptype, category in wanted:
                existing = RBACPermission.query.filter_by(name=name).first()
                if not existing:
                    RBACService.create_permission(
                        name=name,
                        display_name=display,
                        resource_type=res,
                        permission_type=ptype,
                        category=category,
                        is_system=True
                    )
                    created += 1

            role = RBACRole.query.filter_by(name='teacher', is_active=True).first()
            if not role:
                logger.error("Teacher role not found; cannot attach announcement permissions")
                return

            perm_names = [w[0] for w in wanted]
            perms = RBACPermission.query.filter(RBACPermission.name.in_(perm_names)).all()
            existing_names = {p.name for p in role.permissions}
            for p in perms:
                if p.name not in existing_names:
                    role.permissions.append(p)

            db.session.commit()
            logger.info(f"Announcement permissions ensured; created={created}, attached_to_teacher={len(perms)}")
        except Exception as e:
            db.session.rollback()
            logger.error(f"Error ensuring announcement permissions: {str(e)}")
            raise

if __name__ == '__main__':
    if len(sys.argv) > 1 and sys.argv[1] == '--assign-admin':
        assign_admin_role()
    elif len(sys.argv) > 1 and sys.argv[1] == '--ensure-analytics-perms':
        ensure_analytics_permissions()
    elif len(sys.argv) > 1 and sys.argv[1] == '--ensure-announcement-perms':
        ensure_announcement_permissions()
    else:
        init_rbac_system()
        ensure_announcement_permissions()
        if '--with-admin' in sys.argv:
            assign_admin_role()