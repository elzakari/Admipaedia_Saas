"""
Current-request access context.

This endpoint exposes only authority that is valid for the CURRENT
authenticated request. Legacy global role assignments, direct permission
grants, and ACL rows are not used as tenant authority.
"""

from flask import Blueprint, g
from flask_jwt_extended import get_jwt_identity, jwt_required

from app.models.user import User
from app.utils.rbac_decorators import (
    get_request_effective_permissions,
    get_request_effective_roles,
)
from app.utils.response import error_response, success_response


access_context_bp = Blueprint("access_context", __name__)


@access_context_bp.route("/access-context", methods=["GET"])
@jwt_required()
def get_access_context():
    user = getattr(g, "current_user", None)

    if user is None:
        user = User.query.get(get_jwt_identity())

    if user is None:
        return error_response("Authentication required", 401)

    roles = sorted(get_request_effective_roles(user))
    permissions = sorted(get_request_effective_permissions(user))
    tenant_id = getattr(g, "tenant_id", None)

    return success_response(
        data={
            "tenant_id": str(tenant_id) if tenant_id else None,
            "roles": roles,
            "permissions": permissions,
        }
    )
