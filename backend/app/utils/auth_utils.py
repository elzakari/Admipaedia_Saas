from functools import wraps
from flask import jsonify, current_app
from flask_jwt_extended import get_jwt_identity, verify_jwt_in_request
from app.models.user import User

ADMIN_COMPATIBLE_ROLES = {
    'admin',
    'school_admin',
    'super_admin',
    'superadmin',
    'super_manager',
}


def _get_user_from_jwt():
    raw_id = get_jwt_identity()
    if isinstance(raw_id, dict):
        raw_id = raw_id.get('sub') or raw_id.get('id') or raw_id.get('user_id')
    try:
        user_id = int(raw_id) if raw_id is not None else None
    except (ValueError, TypeError):
        user_id = raw_id
    if user_id is None:
        return None
    return User.query.get(user_id)


def admin_required(fn):
    """Decorator to check if the current user has an admin-capable role."""
    @wraps(fn)
    def wrapper(*args, **kwargs):
        verify_jwt_in_request()
        user = _get_user_from_jwt()
        
        if not user or user.role not in ADMIN_COMPATIBLE_ROLES:
            return jsonify({
                'success': False,
                'message': 'Admin privileges required'
            }), 403
        
        return fn(*args, **kwargs)
    return wrapper

def teacher_required(fn):
    """Decorator to check if the current user has teacher role or admin role."""
    @wraps(fn)
    def wrapper(*args, **kwargs):
        verify_jwt_in_request()
        user = _get_user_from_jwt()
        
        if not user or user.role not in ('teacher', 'admin', 'school_admin', 'super_admin', 'superadmin', 'super_manager'):
            return jsonify({
                'success': False,
                'message': 'Teacher privileges required'
            }), 403
        
        return fn(*args, **kwargs)
    return wrapper

def student_required(fn):
    """Decorator to check if the current user has student role."""
    @wraps(fn)
    def wrapper(*args, **kwargs):
        verify_jwt_in_request()
        user = _get_user_from_jwt()
        
        if not user or user.role != 'student':
            return jsonify({
                'success': False,
                'message': 'Student privileges required'
            }), 403
        
        return fn(*args, **kwargs)
    return wrapper

def parent_required(fn):
    """Decorator to check if the current user has parent role."""
    @wraps(fn)
    def wrapper(*args, **kwargs):
        verify_jwt_in_request()
        user = _get_user_from_jwt()
        
        if not user or user.role != 'parent':
            return jsonify({
                'success': False,
                'message': 'Parent privileges required'
            }), 403

        try:
            from app.models.parent import Parent
            from app.extensions import db

            if not Parent.query.filter_by(user_id=user.id).first():
                db.session.add(Parent(user_id=user.id))
                db.session.commit()
        except Exception:
            pass
        
        return fn(*args, **kwargs)
    return wrapper
