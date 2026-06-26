from functools import wraps
from flask import request, jsonify
from flask_jwt_extended import get_jwt_identity, verify_jwt_in_request
from marshmallow import ValidationError
import structlog

logger = structlog.get_logger()

ADMIN_EQUIVALENT_ROLES = {'school_admin', 'super_admin', 'superadmin', 'super_manager'}

def validate_schema(schema_class):
    """
    Decorator to validate request data against a schema.
    
    Args:
        schema_class: Marshmallow schema class to validate against
    """
    def decorator(f):
        @wraps(f)
        def wrapper(*args, **kwargs):
            schema = schema_class()
            try:
                data = request.get_json()
                if not data:
                    return jsonify({"error": "No JSON data provided"}), 400
                
                # Validate data against schema
                schema.load(data)
                
                return f(*args, **kwargs)
            except ValidationError as err:
                logger.warning("validation_error", errors=err.messages)
                return jsonify({"error": "Validation error", "details": err.messages}), 400
        return wrapper
    return decorator

def role_required(roles):
    """
    Decorator to check if user has required role.
    
    Args:
        roles: List of role names required to access the endpoint
    """
    def decorator(f):
        @wraps(f)
        def wrapper(*args, **kwargs):
            verify_jwt_in_request()
            
            # Get user identity from JWT (this is a user ID string)
            user_id = get_jwt_identity()
            
            # Fetch the user from database to get their role
            from app.models.user import User
            user = User.query.get(int(user_id))
            
            if not user:
                logger.warning("user_not_found", user_id=user_id)
                return jsonify({"error": "User not found"}), 404
                
            normalized_roles = set(roles)
            if 'admin' in normalized_roles:
                normalized_roles.update(ADMIN_EQUIVALENT_ROLES)
            if 'super_admin' in normalized_roles:
                normalized_roles.add('super_manager')

            if user.role not in normalized_roles:
                if not (user.role == 'super_manager' and 'super_admin' in normalized_roles):
                    logger.warning("unauthorized_access", 
                                  required_roles=list(normalized_roles), 
                                  user_role=user.role)
                    return jsonify({"error": "Unauthorized access"}), 403
            
            return f(*args, **kwargs)
        return wrapper
    return decorator
