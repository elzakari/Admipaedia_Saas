from app import create_app
from app.extensions import db
from app.services.cache_service import CacheService
from app.models.user import User

def clear_permission_cache():
    app = create_app()
    with app.app_context():
        try:
            # Clear user permissions cache
            cache_service = CacheService()
            cache_service.invalidate_user_cache(1912)  # Clear cache for admin user
            print("Cleared permission cache for user 1912")
            
            # Also clear any permission-related cache patterns
            cache_service.delete_pattern("permission:*")
            cache_service.delete_pattern("user:1912:*")
            print("Cleared all permission-related cache patterns")
            
            # Force refresh permissions
            from app.utils.rbac_decorators import get_user_permissions
            user = User.query.get(1912)
            if user:
                permissions = get_user_permissions(user)
                print(f"Refreshed permissions: {len(permissions)} permissions loaded")
                print(f"User permissions: {list(permissions)}")
            else:
                print("User 1912 not found")
            
        except Exception as e:
            print(f"Error clearing cache: {e}")
            import traceback
            traceback.print_exc()

if __name__ == '__main__':
    clear_permission_cache()