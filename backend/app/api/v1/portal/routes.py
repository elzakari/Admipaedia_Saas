from flask import Blueprint, jsonify
from app.services.portal.service import ParentPortalService
from flask_jwt_extended import jwt_required, get_jwt_identity
from app.utils.rbac_decorators import require_role

portal_bp = Blueprint('portal', __name__)

@portal_bp.route('/children', methods=['GET'])
@jwt_required()
@require_role('parent')
def get_children():
    user_id = get_jwt_identity()
    children, error = ParentPortalService.get_parent_children(user_id)
    
    if error:
        return jsonify({'success': False, 'message': error}), 404
        
    return jsonify({
        'success': True,
        'children': [{
            'id': c.id,
            'name': f"{c.first_name} {c.last_name}",
            'admission_number': c.admission_number,
            'class': c.class_.name if c.class_ else None
        } for c in children]
    }), 200

@portal_bp.route('/child/<int:student_id>/dashboard', methods=['GET'])
@jwt_required()
@require_role('parent')
def get_child_dashboard(student_id):
    # TODO: Verify parent owns this student
    data, error = ParentPortalService.get_child_dashboard(student_id)
    
    if error:
        return jsonify({'success': False, 'message': error}), 404
        
    return jsonify({'success': True, 'data': data}), 200
