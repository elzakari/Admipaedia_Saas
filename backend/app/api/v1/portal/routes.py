from flask import Blueprint, jsonify, request
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

@portal_bp.route('/setup-tasks', methods=['GET'])
@jwt_required()
@require_role('parent')
def get_setup_tasks():
    user_id = get_jwt_identity()
    tasks, error = ParentPortalService.get_parent_setup_tasks(user_id)
    
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
@require_role('parent')
def complete_child_setup():
    user_id = get_jwt_identity()
    data = request.get_json() or {}
    task_id = data.get('task_id')
    
    if not task_id:
        return jsonify({'success': False, 'message': 'task_id parameter is required'}), 400
        
    task, error = ParentPortalService.complete_child_setup_task(user_id, task_id)
    
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
