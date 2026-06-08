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
import logging

from flask import Blueprint, request, jsonify, g
from flask_jwt_extended import jwt_required, get_jwt_identity
from app.utils.auth_utils import admin_required
from app.utils.tenant_context import tenant_required
from app.services.department_service import AcademicStructureService
from app.schemas.department_schema import AcademicStructureSchema, AcademicStructureListSchema
from app.models.department import AcademicStructureType

logger = logging.getLogger(__name__)

departments_bp = Blueprint("departments", __name__)

_schema      = AcademicStructureSchema()
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
    return jsonify({
        "success": True,
        "types": [
            {"value": t.value, "label": t.value.capitalize()}
            for t in AcademicStructureType
        ],
    }), 200


@departments_bp.route("", methods=["GET"])
@jwt_required()
@tenant_required
def get_structures():
    tid       = _tenant_id()
    is_active = _parse_bool(request.args.get("is_active"))
    stype     = _coerce_type(request.args.get("structure_type") or request.args.get("type"))

    items = AcademicStructureService.get_all(
        is_active=is_active,
        structure_type=stype,
        tenant_id=tid,
    )
    return jsonify({
        "success": True,
        "data": _schema_many.dump(items),
    }), 200


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
    item = AcademicStructureService.create(data, tenant_id=_tenant_id())
    if not item:
        return jsonify({
            "success": False,
            "message": "Could not create. Code may already exist or tenant context missing.",
        }), 400
    return jsonify({
        "success": True,
        "data": _schema.dump(item),
        "message": "Created successfully",
    }), 201


@departments_bp.route("/<int:structure_id>", methods=["PUT"])
@jwt_required()
@admin_required
@tenant_required
def update_structure(structure_id):
    data = request.get_json() or {}
    item = AcademicStructureService.update(structure_id, data, tenant_id=_tenant_id())
    if not item:
        return jsonify({
            "success": False,
            "message": f"Not found or code conflict: {structure_id}",
        }), 404
    return jsonify({
        "success": True,
        "data": _schema.dump(item),
        "message": "Updated successfully",
    }), 200


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
    data    = request.get_json() or {}
    user_id = data.get("user_id")
    role    = data.get("role")
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
    from app.models.department import department_staff
    from app.extensions import db
    db.session.execute(
        department_staff.delete().where(
            (department_staff.c.department_id == structure_id)
            & (department_staff.c.user_id == user_id)
        )
    )
    db.session.commit()
    return jsonify({"success": True, "message": "Staff member removed"}), 200