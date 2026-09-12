import os

from flask import Blueprint, abort, current_app, g, send_file
from flask_jwt_extended import get_jwt_identity, jwt_required

from app.models.resource import Resource
from app.models.user import User
from app.services.identity_resolver import IdentityResolver
from app.utils.path_security import resolve_upload_path
from app.utils.rbac_decorators import get_request_effective_roles
from app.utils.tenant_context import tenant_required


download_bp = Blueprint("download", __name__)


def _normalized_path(value):
    return os.path.normpath(str(value or "")).replace("\\", "/")


def _find_resource_owner(file_path):
    normalized = _normalized_path(file_path)

    # Avoid an unbounded Resource table scan while still supporting
    # legacy paths written with Windows separators.
    candidates = {
        str(file_path),
        normalized,
        normalized.replace("/", "\\"),
    }

    return Resource.query.filter(
        Resource.file_path.in_(candidates)
    ).first()


@download_bp.route("/<path:file_path>", methods=["GET"])
@jwt_required()
@tenant_required
def download_file(file_path):
    """Download only a class Resource owned by the active tenant."""
    current_user_id = int(get_jwt_identity())

    safe_path = resolve_upload_path(current_app.root_path, file_path)
    if not safe_path or not os.path.isfile(safe_path):
        abort(404)

    resource = _find_resource_owner(file_path)
    if not resource or not resource.class_:
        current_app.logger.warning(
            "ownerless_generic_download_denied path=%s user_id=%s tenant_id=%s",
            file_path,
            current_user_id,
            getattr(g, "tenant_id", None),
        )
        abort(403)

    resource_tenant_id = getattr(resource.class_, "tenant_id", None)
    active_tenant_id = getattr(g, "tenant_id", None)
    if (
        not resource_tenant_id
        or not active_tenant_id
        or str(resource_tenant_id) != str(active_tenant_id)
    ):
        abort(403)

    user = User.query.get(current_user_id)
    if not user:
        abort(401)

    effective_roles = get_request_effective_roles(user)
    admin_roles = {"admin", "school_admin", "super_admin", "super_manager"}
    if not admin_roles.intersection(effective_roles):
        if not IdentityResolver.can_user_access_class(current_user_id, resource.class_id):
            abort(403)

    return send_file(
        safe_path,
        as_attachment=True,
        download_name=os.path.basename(safe_path),
    )
