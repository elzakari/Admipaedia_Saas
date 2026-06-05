"""
RBAC System Initialization Script
Initializes default roles, permissions, and system configuration
"""

import sys
import os
from pathlib import Path

# Add the backend directory to the Python path
backend_dir = Path(__file__).parent.parent.parent
sys.path.insert(0, str(backend_dir))

from app import create_app
from app.extensions import db
from app.services.rbac_service import RBACService
from app.models.user import User
from app.models.rbac import RBACRole, RBACPermission
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def initialize_rbac_system():
    """Initialize the complete RBAC system with default data"""
    
    app = create_app()
    
    with app.app_context():
        try:
            logger.info("Starting RBAC system initialization...")
            
            # Check if RBAC tables exist and have data
            existing_permissions = RBACPermission.query.count()
            existing_roles = RBACRole.query.count()
            
            if existing_permissions > 0 or existing_roles > 0:
                logger.warning(f"RBAC system already initialized. Found {existing_permissions} permissions and {existing_roles} roles.")
                response = input("Do you want to reinitialize? This will clear existing RBAC data. (y/N): ")
                if response.lower() != 'y':
                    logger.info("Initialization cancelled.")
                    return
                
                # Clear existing RBAC data
                logger.info("Clearing existing RBAC data...")
                db.session.execute(db.text("DELETE FROM role_permissions"))
                db.session.execute(db.text("DELETE FROM user_role_assignments"))
                db.session.execute(db.text("DELETE FROM permission_grants"))
                db.session.execute(db.text("DELETE FROM role_hierarchy"))
                db.session.execute(db.text("DELETE FROM access_control_lists"))
                db.session.execute(db.text("DELETE FROM rbac_roles"))
                db.session.execute(db.text("DELETE FROM rbac_permissions"))
                db.session.commit()
                logger.info("Existing RBAC data cleared.")
            
            # Initialize default permissions
            logger.info("Creating default permissions...")
            RBACService.initialize_default_permissions()
            logger.info("Default permissions created successfully.")
            
            # Initialize default roles
            logger.info("Creating default roles...")
            RBACService.initialize_default_roles()
            logger.info("Default roles created successfully.")
            
            # Assign super admin role to the first admin user
            admin_user = User.query.filter_by(role='admin').first()
            if admin_user:
                logger.info(f"Assigning super_admin role to user: {admin_user.username}")
                RBACService.assign_role_to_user(admin_user.id, 'super_admin')
                logger.info("Super admin role assigned successfully.")
            else:
                logger.warning("No admin user found. Please create an admin user and assign the super_admin role manually.")
            
            # Create sample department-specific roles (optional)
            create_sample_department_roles()
            
            logger.info("RBAC system initialization completed successfully!")
            
            # Print summary
            print_rbac_summary()
            
        except Exception as e:
            logger.error(f"Error during RBAC initialization: {str(e)}")
            db.session.rollback()
            raise

def create_sample_department_roles():
    """Create sample department-specific roles"""
    
    try:
        logger.info("Creating sample department-specific roles...")
        
        # Mathematics Department Head
        math_head_role = RBACService.create_role({
            'name': 'math_department_head',
            'display_name': 'Mathematics Department Head',
            'description': 'Head of Mathematics Department with administrative privileges',
            'hierarchy_level': 3,
            'department_id': 1,  # Assuming Mathematics department ID is 1
            'max_users': 1
        })
        
        # Assign relevant permissions to math department head
        math_permissions = [
            'teacher_read', 'teacher_write', 'teacher_delete',
            'student_read', 'student_write',
            'class_read', 'class_write', 'class_delete',
            'grade_read', 'grade_write',
            'attendance_read', 'attendance_write',
            'exam_read', 'exam_write', 'exam_delete',
            'assignment_read', 'assignment_write', 'assignment_delete',
            'report_read', 'report_write'
        ]
        
        for perm_name in math_permissions:
            permission = RBACPermission.query.filter_by(name=perm_name).first()
            if permission:
                math_head_role.permissions.append(permission)
        
        # Science Department Head
        science_head_role = RBACService.create_role({
            'name': 'science_department_head',
            'display_name': 'Science Department Head',
            'description': 'Head of Science Department with administrative privileges',
            'hierarchy_level': 3,
            'department_id': 2,  # Assuming Science department ID is 2
            'max_users': 1
        })
        
        # Assign same permissions to science department head
        for perm_name in math_permissions:
            permission = RBACPermission.query.filter_by(name=perm_name).first()
            if permission:
                science_head_role.permissions.append(permission)
        
        # Class Teacher Role
        class_teacher_role = RBACService.create_role({
            'name': 'class_teacher',
            'display_name': 'Class Teacher',
            'description': 'Teacher responsible for a specific class with enhanced privileges',
            'hierarchy_level': 2,
            'max_users': None
        })
        
        # Assign class teacher permissions
        class_teacher_permissions = [
            'student_read', 'student_write',
            'class_read', 'class_write',
            'grade_read', 'grade_write',
            'attendance_read', 'attendance_write',
            'exam_read', 'exam_write',
            'assignment_read', 'assignment_write',
            'report_read',
            'announcement.read', 'announcement.create', 'announcement.update', 'announcement.delete',
            'announcement_read', 'announcement_create', 'announcement_update', 'announcement_delete'
        ]
        
        for perm_name in class_teacher_permissions:
            permission = RBACPermission.query.filter_by(name=perm_name).first()
            if permission:
                class_teacher_role.permissions.append(permission)
        
        db.session.commit()
        logger.info("Sample department-specific roles created successfully.")
        
    except Exception as e:
        logger.error(f"Error creating sample department roles: {str(e)}")
        db.session.rollback()

def print_rbac_summary():
    """Print a summary of the initialized RBAC system"""
    
    permissions_count = RBACPermission.query.count()
    roles_count = RBACRole.query.count()
    
    print("\n" + "="*60)
    print("RBAC SYSTEM INITIALIZATION SUMMARY")
    print("="*60)
    print(f"Total Permissions Created: {permissions_count}")
    print(f"Total Roles Created: {roles_count}")
    print("\nDefault Roles:")
    
    roles = RBACRole.query.order_by(RBACRole.hierarchy_level.desc()).all()
    for role in roles:
        perm_count = len(role.permissions)
        print(f"  • {role.display_name} ({role.name}) - Level {role.hierarchy_level} - {perm_count} permissions")
    
    print("\nPermission Categories:")
    from collections import defaultdict
    perm_categories = defaultdict(int)
    
    permissions = RBACPermission.query.all()
    for perm in permissions:
        category = perm.resource_type.value
        perm_categories[category] += 1
    
    for category, count in sorted(perm_categories.items()):
        print(f"  • {category.title()}: {count} permissions")
    
    print("\nNext Steps:")
    print("1. Assign roles to users using the admin interface")
    print("2. Configure department-specific permissions as needed")
    print("3. Set up resource-specific access control lists")
    print("4. Test the RBAC system with different user roles")
    print("="*60)

if __name__ == "__main__":
    initialize_rbac_system()