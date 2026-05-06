from functools import wraps
from flask import jsonify, g
from flask_jwt_extended import verify_jwt_in_request, get_jwt_identity

from app.models.user import User


def get_current_user():
    verify_jwt_in_request()
    user_id = get_jwt_identity()
    if not user_id:
        return None
    return User.query.get(int(user_id))


def require_platform_super_admin():
    def decorator(f):
        @wraps(f)
        def wrapper(*args, **kwargs):
            user = get_current_user()
            if not user:
                return jsonify({'success': False, 'message': 'Authentication required'}), 401
            if getattr(user, 'role', None) != 'super_admin':
                return jsonify({'success': False, 'message': 'Unauthorized'}), 403
            g.current_user = user
            return f(*args, **kwargs)
        return wrapper
    return decorator

