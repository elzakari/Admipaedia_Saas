from app import create_app
from app.extensions import db
from app.models.user import User
from app.models.rbac import RBACRole, RBACPermission
from app.services.rbac_service import RBACService
from app.utils.rbac_decorators import get_user_permissions, has_permission

def check_user_permissions():
    app = create_app()
    with app.app_context():
        # Check user ID 1912 (from JWT token)
        user = User.query.get(1912)
        if not user:
            print("User 1912 not found!")
            return
            
        print(f"User: {user.email} (ID: {user.id})")
        print(f"Basic Role: {user.role}")
        
        # Check RBAC roles
        rbac_service = RBACService()
        try:
            user_roles = rbac_service.get_user_roles(user.id)
            if isinstance(user_roles, list) and user_roles:
                print(f"RBAC Roles: {[role.get('role', {}).get('name', 'Unknown') for role in user_roles]}")
            else:
                print(f"RBAC Roles: {user_roles}")
        except Exception as e:
            print(f"Error getting user roles: {e}")
        
        # Check specific permissions using the correct functions
        try:
            has_subject_read = has_permission(user, 'subject.read')
            has_class_read = has_permission(user, 'class.read')
            
            print(f"Has subject.read permission: {has_subject_read}")
            print(f"Has class.read permission: {has_class_read}")
        except Exception as e:
            print(f"Error checking permissions: {e}")
        
        # List all permissions for this user
        try:
            all_permissions = list(get_user_permissions(user))
            print(f"All permissions: {all_permissions}")
        except Exception as e:
            print(f"Error getting user permissions: {e}")
        
        # Check if subject permissions exist
        subject_perms = RBACPermission.query.filter(RBACPermission.name.like('subject.%')).all()
        print(f"Subject permissions in DB: {[perm.name for perm in subject_perms]}")
        
        # Check if class permissions exist
        class_perms = RBACPermission.query.filter(RBACPermission.name.like('class.%')).all()
        print(f"Class permissions in DB: {[perm.name for perm in class_perms]}")

if __name__ == '__main__':
    check_user_permissions()