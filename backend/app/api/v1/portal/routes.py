from flask import Blueprint, jsonify, request, g
from app.services.portal.service import ParentPortalService
from app.services.enhanced_student_service import EnhancedStudentService
from flask_jwt_extended import jwt_required, get_jwt_identity
from app.utils.rbac_decorators import require_role
from app.utils.tenant_context import tenant_required

portal_bp = Blueprint('portal', __name__)

@portal_bp.route('/children', methods=['GET'])
@jwt_required()
@tenant_required
@require_role('parent')
def get_children():
    user_id = get_jwt_identity()
    children, error = ParentPortalService.get_parent_children(user_id, g.tenant_id)
    
    if error:
        return jsonify({'success': False, 'message': error}), 404
        
    return jsonify({
        'success': True,
        'children': [{
            'id': c.id,
            'name': f"{c.first_name} {c.last_name}",
            'admission_number': c.admission_number,
            'class': getattr(c.class_, 'display_name', None) or (c.class_.name if c.class_ else None),
            'profile_picture': EnhancedStudentService.build_profile_picture_url(c.profile_picture),
        } for c in children]
    }), 200

@portal_bp.route('/child/<int:student_id>/dashboard', methods=['GET'])
@jwt_required()
@tenant_required
@require_role('parent')
def get_child_dashboard(student_id):
    user_id = get_jwt_identity()
    data, error, status_code = ParentPortalService.get_authorized_child_dashboard(user_id, student_id, g.tenant_id)
    
    if error:
        return jsonify({'success': False, 'message': error}), status_code
        
    return jsonify({'success': True, 'data': data}), 200

@portal_bp.route('/setup-tasks', methods=['GET'])
@jwt_required()
@tenant_required
@require_role('parent')
def get_setup_tasks():
    user_id = get_jwt_identity()
    tasks, error = ParentPortalService.get_parent_setup_tasks(user_id, g.tenant_id)
    
    if error:
        return jsonify({'success': False, 'message': error}), 404
        
    return jsonify({
        'success': True,
        'tasks': [{
            'id': t.id,
            'student_id': t.student_id,
            'status': t.status,
            'task_type': t.task_type,
            'title': t.title,
            'description': t.description,
            'created_at': t.created_at.isoformat() if t.created_at else None,
            'completed_at': t.completed_at.isoformat() if t.completed_at else None
        } for t in tasks]
    }), 200

@portal_bp.route('/complete-child-setup', methods=['POST'])
@jwt_required()
@tenant_required
@require_role('parent')
def complete_child_setup():
    user_id = get_jwt_identity()
    data = request.get_json() or {}
    task_id = data.get('task_id')
    
    if not task_id:
        return jsonify({'success': False, 'message': 'task_id parameter is required'}), 400
        
    task, error = ParentPortalService.complete_child_setup_task(user_id, task_id, g.tenant_id)
    
    if error:
        return jsonify({'success': False, 'message': error}), 400
        
    return jsonify({
        'success': True,
        'message': 'Setup task completed successfully',
        'task': {
            'id': task.id,
            'student_id': task.student_id,
            'status': task.status,
            'completed_at': task.completed_at.isoformat() if task.completed_at else None
        }
    }), 200
