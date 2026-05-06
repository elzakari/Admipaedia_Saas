def require_subject_permission(action: str):
    """Decorator to check subject-specific permissions"""
    def decorator(f):
        @wraps(f)
        def decorated_function(*args, **kwargs):
            subject_id = kwargs.get('subject_id') or request.json.get('subject_id')
            
            # Check if user has permission for this specific subject
            if not current_user.has_subject_permission(subject_id, action):
                return jsonify({'error': 'Insufficient permissions'}), 403
                
            return f(*args, **kwargs)
        return decorated_function
    return decorator