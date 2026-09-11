from functools import wraps

import structlog
from flask import jsonify, request
from flask_jwt_extended import get_jwt_identity, verify_jwt_in_request
from marshmallow import ValidationError

logger = structlog.get_logger()

ADMIN_EQUIVALENT_ROLES = {"school_admin", "super_admin", "superadmin", "super_manager"}


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
                return (
                    jsonify({"error": "Validation error", "details": err.messages}),
                    400,
                )

        return wrapper

    return decorator


def role_required(roles):
    """
    Legacy compatibility decorator using tenant-effective roles rather
    than global User.role.
    """

    def decorator(f):
        @wraps(f)
        def wrapper(*args, **kwargs):
            from flask_jwt_extended import verify_jwt_in_request

            from app.utils.rbac_decorators import (
                get_current_user,
                get_request_effective_roles,
                _is_platform_user,
            )

            verify_jwt_in_request()

            user = get_current_user()

            if not user:
                logger.warning("user_not_found")
                res = jsonify({"error": "User not found"})
                res.status_code = 404
                return res

            if _is_platform_user(user):
                return f(*args, **kwargs)

            normalized_roles = {
                str(role or "").strip().lower()
                for role in roles
            }

            # Legacy routes asking for "admin" are satisfied by a proven
            # school_admin membership through the compatibility alias.
            effective_roles = get_request_effective_roles(user)

            if not normalized_roles.intersection(effective_roles):
                logger.warning(
                    "tenant_legacy_role_denied",
                    required_roles=list(normalized_roles),
                    effective_roles=list(effective_roles),
                )
                res = jsonify({"error": "Unauthorized access"})
                res.status_code = 403
                return res

            return f(*args, **kwargs)

        return wrapper

    return decorator
