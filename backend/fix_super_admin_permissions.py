from app import create_app
from app.extensions import db
from app.models.rbac import RBACRole, RBACPermission

def fix_super_admin_permissions():
    app = create_app()
    with app.app_context():
        # Get the super_admin role
        super_admin_role = RBACRole.query.filter_by(name='super_admin').first()
        if not super_admin_role:
            print("Super admin role not found!")
            return
        
        print(f"Found super_admin role: {super_admin_role.name}")
        
        # Get all permissions that should be assigned to super_admin
        missing_permissions = [
            'subject.create', 'subject.read', 'subject.update', 'subject.delete', 'subject.manage',
            'class.create', 'class.read', 'class.update', 'class.delete', 'class.manage_students',
            'teacher.create', 'teacher.read', 'teacher.update', 'teacher.delete', 'teacher.manage',
            'student.create', 'student.read', 'student.update', 'student.delete', 'student.manage',
            'exam.create', 'exam.read', 'exam.update', 'exam.delete', 'exam.manage'
        ]
        
        permissions_added = []
        
        for perm_name in missing_permissions:
            permission = RBACPermission.query.filter_by(name=perm_name).first()
            if permission and permission not in super_admin_role.permissions:
                super_admin_role.permissions.append(permission)
                permissions_added.append(perm_name)
                print(f"Added permission: {perm_name}")
        
        if permissions_added:
            db.session.commit()
            print(f"Successfully added {len(permissions_added)} permissions to super_admin role")
        else:
            print("No new permissions to add")
        
        # Verify the permissions are now assigned
        current_permissions = [perm.name for perm in super_admin_role.permissions]
        print(f"Super admin now has {len(current_permissions)} permissions:")
        for perm in sorted(current_permissions):
            print(f"  - {perm}")

if __name__ == '__main__':
    fix_super_admin_permissions()