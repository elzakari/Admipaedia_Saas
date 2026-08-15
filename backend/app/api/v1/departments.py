"""
Academic Structures / Departments API
--------------------------------------
URL prefix: /api/v1/departments   (legacy; also registered at /api/v1/structures)

Endpoints:
  GET    /types                     return enum values for frontend dropdowns
  GET    /                          list all (filter by type, is_active)
  POST   /                          create
  GET    /<id>                      retrieve one
  PUT    /<id>                      update
  DELETE /<id>                      delete
  POST   /<id>/staff                add staff member
  DELETE /<id>/staff/<user_id>      remove staff member
"""

from typing import Any, Dict

import logging

from flask import Blueprint, current_app, g, jsonify, request
from flask_jwt_extended import get_jwt_identity, jwt_required

from app.models.department import AcademicStructureType
from app.schemas.department_schema import (AcademicStructureListSchema,
                                           AcademicStructureSchema)
from app.services.department_service import AcademicStructureService
from app.utils.auth_utils import admin_required
from app.utils.tenant_context import tenant_required

logger = logging.getLogger(__name__)

departments_bp = Blueprint("departments", __name__)

_schema = AcademicStructureSchema()
_schema_many = AcademicStructureListSchema(many=True)


# ── Helpers ───────────────────────────────────────────────────────────────────


def _tenant_id():
    """Return current tenant id from Flask g (set by @tenant_required)."""
    return getattr(g, "tenant_id", None)


def _parse_bool(raw):
    if raw is None:
        return None
    return str(raw).lower() in ("1", "true", "yes")


def _coerce_type(raw):
    if not raw:
        return None
    try:
        return AcademicStructureType(raw.lower())
    except ValueError:
        return None


# ── Routes ────────────────────────────────────────────────────────────────────


@departments_bp.route("/types", methods=["GET"])
@jwt_required()
def list_types():
    """Return all valid structure_type values so the frontend can build dropdowns."""
    return (
        jsonify(
            {
                "success": True,
                "types": [
                    {"value": t.value, "label": t.value.capitalize()}
                    for t in AcademicStructureType
                ],
            }
        ),
        200,
    )


@departments_bp.route("", methods=["GET"])
@jwt_required()
@tenant_required
def get_structures():
    tid = _tenant_id()
    is_active = _parse_bool(request.args.get("is_active"))
    stype = _coerce_type(request.args.get("structure_type") or request.args.get("type"))

    try:
        items = AcademicStructureService.get_all(
            is_active=is_active,
            structure_type=stype,
            tenant_id=tid,
        )
    except Exception as exc:
        logger.exception("get_structures service error: %s", exc)
        return (
            jsonify(
                {
                    "success": False,
                    "message": "Failed to list departments",
                    "data": [],
                    "error": str(exc),
                }
            ),
            500,
        )

    try:
        dumped = _schema_many.dump(items)
    except Exception as exc:
        logger.exception("get_structures schema dump error: %s", exc)
        raw_items = []
        for s in items or []:
            raw_items.append({
                "id": getattr(s, "id", None),
                "name": getattr(s, "name", ""),
                "code": getattr(s, "code", ""),
                "description": getattr(s, "description", None),
                "structure_type": getattr(getattr(s, "structure_type", None), "value", str(getattr(s, "structure_type", ""))),
                "is_active": bool(getattr(s, "is_active", True)),
                "display_order": getattr(s, "display_order", 0),
                "head_id": getattr(s, "head_id", None),
                "subjects_count": getattr(s, "subjects_count", 0),
                "staff_count": getattr(s, "staff_count", 0),
            })
        dumped = raw_items

    return (
        jsonify(
            {
                "success": True,
                "data": dumped,
            }
        ),
        200,
    )


@departments_bp.route("/<int:structure_id>", methods=["GET"])
@jwt_required()
@tenant_required
def get_structure(structure_id):
    item = AcademicStructureService.get_by_id(structure_id, tenant_id=_tenant_id())
    if not item:
        return jsonify({"success": False, "message": f"Not found: {structure_id}"}), 404
    return jsonify({"success": True, "data": _schema.dump(item)}), 200


@departments_bp.route("", methods=["POST"])
@jwt_required()
@admin_required
@tenant_required
def create_structure():
    data = request.get_json() or {}
    result = AcademicStructureService.create(data, tenant_id=_tenant_id())
    if isinstance(result, tuple) and len(result) == 2:
        item, error_detail = result
    else:
        item, error_detail = result, None

    if item is not None:
        return (
            jsonify(
                {
                    "success": True,
                    "data": _schema.dump(item),
                    "message": "Created successfully",
                }
            ),
            201,
        )

    error_detail = error_detail or {}
    # Log every non-success at WARN so we can triage 400s returned to admins
    # without having to ask users to paste raw JSON out of DevTools Network tab.
    # Include request body keys (not values) for correlation — never log secrets.
    logger.warning(
        "create_structure failed tenant=%s ip=%s user=%s error_type=%s field=%s pgcode=%s constraint=%s message=%r request_keys=%r detail=%r",
        _tenant_id(),
        getattr(request, "remote_addr", None),
        get_jwt_identity() if callable(get_jwt_identity) else None,
        error_detail.get("error"),
        error_detail.get("field"),
        error_detail.get("pgcode"),
        error_detail.get("constraint"),
        error_detail.get("message"),
        sorted(list(data.keys())) if isinstance(data, dict) else None,
        {k: v for k, v in error_detail.items() if k not in {"db_detail"}} if current_app.debug else None,
    )
    error_type = error_detail.get("error") or "unknown"
    field = error_detail.get("field")
    pgcode = error_detail.get("pgcode")
    constraint = error_detail.get("constraint")
    db_detail = error_detail.get("db_detail")
    detail_suggestion = error_detail.get("suggestion")

    route_suggestions = {
        "duplicate": (
            "Tips: you can edit the existing department instead of creating a new one, "
            "or leave the code field blank and let the server assign one."
        ),
        "integrity": (
            "Tips: refresh the page first (tenant context may have expired), "
            "pick a different head of department, or clear the name/code before retrying."
        ),
        "validation": (
            "Tips: correct the highlighted field and try again. "
            "If a select dropdown is stale, refresh the page to reload options."
        ),
        "tenant_missing": (
            "Tips: refresh the page to renew your session and tenant context, then try again."
        ),
    }
    suggestion = detail_suggestion or route_suggestions.get(error_type)

    route_messages = {
        "tenant_missing": "Tenant context missing. Please refresh and try again.",
        "duplicate": (
            "Code or name already exists for this school. "
            "Try a different value, or leave code blank to auto-generate."
        ),
        "validation": "One or more fields contain invalid values.",
        "integrity": (
            "Could not save — this record conflicts with an existing one. "
            "If the name already exists under a different code, rename it; "
            "otherwise leave code blank to auto-generate a unique code."
        ),
    }
    message = error_detail.get("message") or route_messages.get(
        error_type, "Could not create. Please try again."
    )

    status_code = 409 if error_type == "duplicate" else 400
    payload: Dict[str, Any] = {
        "success": False,
        "message": message,
        "error_type": error_type,
    }
    if field:
        payload["field"] = field
    if suggestion:
        payload["suggestion"] = suggestion
    # Always attach low-sensitivity diagnostic fields: they help admins / support
    # reproduce exact constraint behaviour without exposing secrets.
    if pgcode:
        payload["pgcode"] = pgcode
    if constraint:
        payload["constraint"] = constraint

    # Additional classifier-derived keys that should also flow to the client.
    # If the classifier starts attaching more keys, this whitelist automatically
    # surfaces them without further route edits.
    PASSTHROUGH_KEYS = (
        "enum_type_name",
        "offending_value",
        "context_name",
        "context_code",
        "context_type",
    )
    for extra_key in PASSTHROUGH_KEYS:
        extra_val = error_detail.get(extra_key)
        if extra_val not in (None, ""):
            payload[extra_key] = extra_val

    if db_detail and current_app.debug:
        payload["db_detail"] = db_detail
    if current_app.debug:
        payload["detail"] = error_detail
    return jsonify(payload), status_code


@departments_bp.route("/<int:structure_id>", methods=["PUT"])
@jwt_required()
@admin_required
@tenant_required
def update_structure(structure_id):
    data = request.get_json() or {}
    item = AcademicStructureService.update(structure_id, data, tenant_id=_tenant_id())
    if not item:
        return (
            jsonify(
                {
                    "success": False,
                    "message": f"Not found or code conflict: {structure_id}",
                }
            ),
            404,
        )
    return (
        jsonify(
            {
                "success": True,
                "data": _schema.dump(item),
                "message": "Updated successfully",
            }
        ),
        200,
    )


@departments_bp.route("/<int:structure_id>", methods=["DELETE"])
@jwt_required()
@admin_required
@tenant_required
def delete_structure(structure_id):
    ok = AcademicStructureService.delete(structure_id, tenant_id=_tenant_id())
    if not ok:
        return jsonify({"success": False, "message": f"Not found: {structure_id}"}), 404
    return jsonify({"success": True, "message": "Deleted successfully"}), 200


@departments_bp.route("/<int:structure_id>/staff", methods=["POST"])
@jwt_required()
@admin_required
@tenant_required
def add_staff(structure_id):
    data = request.get_json() or {}
    user_id = data.get("user_id")
    role = data.get("role")
    if not user_id:
        return jsonify({"success": False, "message": "user_id required"}), 400
    ok = AcademicStructureService.add_staff(
        structure_id, user_id, role=role, tenant_id=_tenant_id()
    )
    if not ok:
        return jsonify({"success": False, "message": "Could not add staff member"}), 400
    return jsonify({"success": True, "message": "Staff member added"}), 200


@departments_bp.route("/<int:structure_id>/staff/<int:user_id>", methods=["DELETE"])
@jwt_required()
@admin_required
@tenant_required
def remove_staff(structure_id, user_id):
    from app.extensions import db
    from app.models.department import department_staff

    db.session.execute(
        department_staff.delete().where(
            (department_staff.c.department_id == structure_id)
            & (department_staff.c.user_id == user_id)
        )
    )
    db.session.commit()
    return jsonify({"success": True, "message": "Staff member removed"}), 200
