from flask import Blueprint, jsonify, request, g
from app.services.educational_system.service import EducationalSystemService
from flask_jwt_extended import jwt_required
from app.utils.tenant_context import tenant_required
from marshmallow import ValidationError
from app.schemas.educational_system import EducationalSystemApplySchema
# from app.decorators import role_required # Assuming we have RBAC

educational_system_bp = Blueprint('educational_system', __name__)
apply_schema = EducationalSystemApplySchema()

@educational_system_bp.route('/platform/educational-systems', methods=['GET'])
@jwt_required()
def list_templates():
    """List all available educational system templates."""
    country = request.args.get('country_code')
    templates = EducationalSystemService.get_all_templates(country)
    
    return jsonify({
        "success": True,
        "data": [{
            "system_key": t.system_key,
            "name": t.name,
            "country_code": t.country_code,
            "description": t.description
        } for t in templates]
    }), 200

@educational_system_bp.route('/tenant/educational-system', methods=['GET'])
@jwt_required()
@tenant_required
def get_tenant_config():
    """Get the current tenant's educational system configuration."""
    config = EducationalSystemService.get_tenant_config(getattr(g, 'tenant_id', None))
    if not config:
        return jsonify({
            "success": False,
            "message": "No educational system configured for this tenant."
        }), 404
        
    return jsonify({
        "success": True,
        "data": {
            "id": config.id,
            "name": config.name,
            "template_key": config.template_key,
            "config": config.config
        }
    }), 200

@educational_system_bp.route('/tenant/educational-system/apply', methods=['POST'])
@jwt_required()
# @role_required('admin')
@tenant_required
def apply_template():
    """Apply a template to the current tenant."""
    data = request.get_json() or {}
    try:
        payload = apply_schema.load(data)
    except ValidationError as e:
        return jsonify({"success": False, "message": "Validation error", "errors": e.messages}), 400
    template_key = payload.get('template_key')
        
    try:
        config = EducationalSystemService.apply_template_to_tenant(template_key, getattr(g, 'tenant_id', None))
        return jsonify({
            "success": True,
            "message": f"Successfully applied {config.name}",
            "data": {
                "id": config.id,
                "name": config.name
            }
        }), 200
    except ValueError as e:
        return jsonify({"success": False, "message": str(e)}), 404
    except Exception as e:
        return jsonify({"success": False, "message": "An unexpected error occurred"}), 500
