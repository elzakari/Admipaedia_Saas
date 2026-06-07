from app import create_app
from app.models.rbac import RBACPermission, PermissionGrant, ResourceType, PermissionType
from app.models.user import User

app = create_app()
with app.app_context():
    print("Permissions:")
    for p in RBACPermission.query.all():
        print(f"ID: {p.id}, Name: {p.name}, Resource: {p.resource_type}, Type: {p.permission_type}")
    
    print("\nUser:")
    user = User.query.get(3011)
    if user:
        print(f"User 3011: {user.username}, Role: {user.role}")
    else:
        print("User 3011 not found!")
