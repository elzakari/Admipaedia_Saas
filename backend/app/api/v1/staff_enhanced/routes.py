from flask import Blueprint, request, jsonify
from app.services.staff.service import StaffService
from app.models.staff_enhanced import LeaveType, LeaveStatus, StaffLeave
from flask_jwt_extended import jwt_required, get_jwt_identity
from app.utils.rbac_decorators import require_permission

staff_enhanced_bp = Blueprint('staff_enhanced', __name__)

@staff_enhanced_bp.route('/leave/apply', methods=['POST'])
@jwt_required()
def apply_leave():
    user_id = get_jwt_identity()
    leave, error = StaffService.apply_leave(request.json, user_id)
    if error:
        return jsonify({'success': False, 'message': error}), 400
    return jsonify({'success': True, 'id': leave.id}), 201

@staff_enhanced_bp.route('/leave/<int:id>/process', methods=['POST'])
@jwt_required()
@require_permission('staff.manage_leave')
def process_leave(id):
    data = request.json
    approver_id = get_jwt_identity()
    leave, error = StaffService.process_leave(id, data.get('status'), approver_id, data.get('reason'))
    if error:
        return jsonify({'success': False, 'message': error}), 400
    return jsonify({'success': True, 'status': leave.status.value}), 200

@staff_enhanced_bp.route('/leave/types', methods=['GET'])
@jwt_required()
def get_leave_types():
    types = LeaveType.query.all()
    return jsonify({
        'success': True,
        'data': [{'id': t.id, 'name': t.name, 'days': t.days_allowed} for t in types]
    }), 200

@staff_enhanced_bp.route('/attendance/clock-in', methods=['POST'])
@jwt_required()
def clock_in():
    # Need to map User ID to Staff ID
    # For prototype, assuming staff_id is passed or derived
    staff_id = request.json.get('staff_id') # In real app, derive from user
    if not staff_id:
        return jsonify({'success': False, 'message': 'Staff ID required'}), 400
        
    att, error = StaffService.clock_in(staff_id)
    if error:
        return jsonify({'success': False, 'message': error}), 400
    return jsonify({'success': True, 'time': str(att.check_in_time)}), 200

@staff_enhanced_bp.route('/attendance/clock-out', methods=['POST'])
@jwt_required()
def clock_out():
    staff_id = request.json.get('staff_id')
    if not staff_id:
        return jsonify({'success': False, 'message': 'Staff ID required'}), 400
        
    att, error = StaffService.clock_out(staff_id)
    if error:
        return jsonify({'success': False, 'message': error}), 400
    return jsonify({'success': True, 'time': str(att.check_out_time)}), 200

@staff_enhanced_bp.route('/directory', methods=['GET'])
@jwt_required()
def get_directory():
    staff_list = StaffService.get_staff_directory()
    return jsonify({
        'success': True,
        'data': [{
            'id': s.id,
            'name': s.full_name,
            'title': s.job_title,
            'phone': s.phone_number
        } for s in staff_list]
    }), 200
