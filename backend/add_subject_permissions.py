from app import create_app
from app.extensions import db
from app.services.rbac_service import RBACService
from app.models.rbac import RBACPermission, RBACRole, ResourceType, PermissionType

def add_subject_permissions():
    app = create_app()
    with app.app_context():
        # Add missing subject permissions
        subject_permissions = [
            {'name': 'subject.create', 'display_name': 'Create Subjects', 'resource_type': ResourceType.SUBJECT, 'permission_type': PermissionType.CREATE, 'category': 'academic'},
            {'name': 'subject.read', 'display_name': 'View Subjects', 'resource_type': ResourceType.SUBJECT, 'permission_type': PermissionType.READ, 'category': 'academic'},
            {'name': 'subject.update', 'display_name': 'Update Subjects', 'resource_type': ResourceType.SUBJECT, 'permission_type': PermissionType.UPDATE, 'category': 'academic'},
            {'name': 'subject.delete', 'display_name': 'Delete Subjects', 'resource_type': ResourceType.SUBJECT, 'permission_type': PermissionType.DELETE, 'category': 'academic'},
            {'name': 'subject.manage', 'display_name': 'Manage Subjects', 'resource_type': ResourceType.SUBJECT, 'permission_type': PermissionType.MANAGE, 'category': 'academic'}
        ]
        
        for perm_data in subject_permissions:
            existing = RBACPermission.query.filter_by(name=perm_data['name']).first()
            if not existing:
                permission = RBACPermission(
                    name=perm_data['name'],
                    display_name=perm_data['display_name'],
                    resource_type=perm_data['resource_type'],
                    permission_type=perm_data['permission_type'],
                    category=perm_data['category'],
                    is_system=True
                )
                db.session.add(permission)
                print(f'Added permission: {perm_data["name"]}')
        
        # Add subject.read to teacher and staff roles
        subject_read = RBACPermission.query.filter_by(name='subject.read').first()
        if subject_read:
            teacher_role = RBACRole.query.filter_by(name='teacher').first()
            staff_role = RBACRole.query.filter_by(name='staff').first()
            
            if teacher_role and subject_read not in teacher_role.permissions:
                teacher_role.permissions.append(subject_read)
                print('Added subject.read to teacher role')
                
            if staff_role and subject_read not in staff_role.permissions:
                staff_role.permissions.append(subject_read)
                print('Added subject.read to staff role')
        
        db.session.commit()
        print('Subject permissions added successfully!')

if __name__ == '__main__':
    add_subject_permissions()