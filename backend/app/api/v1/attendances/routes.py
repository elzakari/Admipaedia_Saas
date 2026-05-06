from flask import request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from app.api.v1.attendances import attendances_bp
from app.services.attendance_service import AttendanceService
from app.schemas.attendance import AttendanceSchema, AttendanceCreateSchema, AttendanceUpdateSchema, AttendanceBulkCreateSchema
from app.utils.auth_utils import admin_required, teacher_required
from app.utils.rbac_decorators import require_permission, require_role
from marshmallow import ValidationError
from datetime import datetime

# Initialize schemas
attendance_schema = AttendanceSchema()
attendances_schema = AttendanceSchema(many=True)
attendance_create_schema = AttendanceCreateSchema()
attendance_update_schema = AttendanceUpdateSchema()
attendance_bulk_create_schema = AttendanceBulkCreateSchema()

@attendances_bp.route('/', methods=['GET'])
@jwt_required()
@require_permission('attendance.read')
def get_attendances():
    """Get all attendances with pagination and filtering."""
    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 20, type=int)
    class_id = request.args.get('class_id', type=int)
    student_id = request.args.get('student_id', type=int)
    status = request.args.get('status', type=str)
    
    # Parse date parameters
    date_from = request.args.get('date_from', type=str)
    date_to = request.args.get('date_to', type=str)
    
    if date_from:
        try:
            date_from = datetime.strptime(date_from, '%Y-%m-%d').date()
        except ValueError:
            return jsonify({'success': False, 'message': 'Invalid date_from format. Use YYYY-MM-DD'}), 400
    
    if date_to:
        try:
            date_to = datetime.strptime(date_to, '%Y-%m-%d').date()
        except ValueError:
            return jsonify({'success': False, 'message': 'Invalid date_to format. Use YYYY-MM-DD'}), 400
    
    paginated_attendances = AttendanceService.get_all_attendances(
        page, per_page, class_id, student_id, date_from, date_to, status
    )
    
    return jsonify({
        'success': True,
        'attendances': attendances_schema.dump(paginated_attendances.items),
        'pagination': {
            'total': paginated_attendances.total,
            'pages': paginated_attendances.pages,
            'page': paginated_attendances.page,
            'per_page': paginated_attendances.per_page,
            'next': paginated_attendances.next_num,
            'prev': paginated_attendances.prev_num
        }
    }), 200

@attendances_bp.route('/<int:attendance_id>', methods=['GET'])
@jwt_required()
@require_permission('attendance.read')
def get_attendance(attendance_id):
    """Get a specific attendance record by ID."""
    attendance = AttendanceService.get_attendance_by_id(attendance_id)
    
    if not attendance:
        return jsonify({'success': False, 'message': 'Attendance record not found'}), 404
    
    return jsonify({
        'success': True,
        'attendance': attendance_schema.dump(attendance)
    }), 200

@attendances_bp.route('/', methods=['POST'])
@jwt_required()
@teacher_required
@require_permission('attendance.create')
def create_attendance():
    """Create a new attendance record."""
    try:
        data = attendance_create_schema.load(request.json)
        
        # Set recorded_by to current user if not provided
        if 'recorded_by' not in data:
            data['recorded_by'] = get_jwt_identity()
        
        attendance, error = AttendanceService.create_attendance(data)
        
        if error:
            return jsonify({'success': False, 'message': error}), 400
        
        return jsonify({
            'success': True,
            'message': 'Attendance record created successfully',
            'attendance': attendance_schema.dump(attendance)
        }), 201
    except ValidationError as err:
        return jsonify({'success': False, 'errors': err.messages}), 400

@attendances_bp.route('/<int:attendance_id>', methods=['PUT'])
@jwt_required()
@teacher_required
@require_permission('attendance.update')
def update_attendance(attendance_id):
    """Update an existing attendance record."""
    try:
        data = attendance_update_schema.load(request.json)
        
        # Set recorded_by to current user if not provided
        if 'recorded_by' not in data:
            data['recorded_by'] = get_jwt_identity()
        
        attendance, error = AttendanceService.update_attendance(attendance_id, data)
        
        if error:
            return jsonify({'success': False, 'message': error}), 400
        
        return jsonify({
            'success': True,
            'message': 'Attendance record updated successfully',
            'attendance': attendance_schema.dump(attendance)
        }), 200
    except ValidationError as err:
        return jsonify({'success': False, 'errors': err.messages}), 400

@attendances_bp.route('/<int:attendance_id>', methods=['DELETE'])
@jwt_required()
@admin_required
@require_permission('attendance.delete')
def delete_attendance(attendance_id):
    """Delete an attendance record."""
    success, error = AttendanceService.delete_attendance(attendance_id)
    
    if error:
        return jsonify({'success': False, 'message': error}), 400
    
    return jsonify({
        'success': True,
        'message': 'Attendance record deleted successfully'
    }), 200

@attendances_bp.route('/bulk', methods=['POST'])
@jwt_required()
@teacher_required
@require_permission('attendance.create')
def bulk_create_attendance():
    """Create multiple attendance records at once."""
    try:
        data = attendance_bulk_create_schema.load(request.json)
        
        # Set recorded_by to current user if not provided
        if 'recorded_by' not in data:
            data['recorded_by'] = get_jwt_identity()
        
        attendances, error = AttendanceService.bulk_create_attendance(data)
        
        if error:
            return jsonify({'success': False, 'message': error}), 400
        
        return jsonify({
            'success': True,
            'message': f'{len(attendances)} attendance records created/updated successfully',
            'attendances': attendances_schema.dump(attendances)
        }), 201
    except ValidationError as err:
        return jsonify({'success': False, 'errors': err.messages}), 400

@attendances_bp.route('/stats', methods=['GET'])
@jwt_required()
@require_permission('attendance.reports')
def get_attendance_stats():
    """Get attendance statistics."""
    class_id = request.args.get('class_id', type=int)
    student_id = request.args.get('student_id', type=int)
    
    # Parse date parameters
    date_from = request.args.get('date_from', type=str)
    date_to = request.args.get('date_to', type=str)
    
    if date_from:
        try:
            date_from = datetime.strptime(date_from, '%Y-%m-%d').date()
        except ValueError:
            return jsonify({'success': False, 'message': 'Invalid date_from format. Use YYYY-MM-DD'}), 400
    
    if date_to:
        try:
            date_to = datetime.strptime(date_to, '%Y-%m-%d').date()
        except ValueError:
            return jsonify({'success': False, 'message': 'Invalid date_to format. Use YYYY-MM-DD'}), 400
    
    stats, error = AttendanceService.get_attendance_stats(class_id, student_id, date_from, date_to)
    
    if error:
        return jsonify({'success': False, 'message': error}), 400
    
    return jsonify({
        'success': True,
        'stats': stats
    }), 200

@attendances_bp.route('/analytics/trends', methods=['GET'])
@jwt_required()
@require_permission('attendance.reports')
def get_attendance_trends():
    """Get attendance trends over time."""
    class_id = request.args.get('class_id', type=int)
    student_id = request.args.get('student_id', type=int)
    date_from = request.args.get('date_from')
    date_to = request.args.get('date_to')
    
    if date_from:
        date_from = datetime.strptime(date_from, '%Y-%m-%d').date()
    if date_to:
        date_to = datetime.strptime(date_to, '%Y-%m-%d').date()
        
    trends, error = AttendanceService.get_attendance_trends(class_id, student_id, date_from, date_to)
    
    if error:
        return jsonify({'success': False, 'message': error}), 400
        
    return jsonify({'success': True, 'trends': trends}), 200

@attendances_bp.route('/analytics/at-risk', methods=['GET'])
@jwt_required()
@require_permission('attendance.reports')
def get_at_risk_students():
    """Get students with low attendance."""
    class_id = request.args.get('class_id', type=int)
    threshold = request.args.get('threshold', 80, type=int)
    
    students, error = AttendanceService.get_at_risk_students(class_id, threshold)
    
    if error:
        return jsonify({'success': False, 'message': error}), 400
        
    return jsonify({'success': True, 'students': students}), 200

@attendances_bp.route('/sync', methods=['POST'])
@jwt_required()
@teacher_required
def sync_offline_attendance():
    """Sync attendance data collected offline."""
    data = request.json
    if not isinstance(data, list):
        return jsonify({'success': False, 'message': 'Expected a list of attendance records'}), 400
        
    result, error = AttendanceService.sync_offline_attendance(data, get_jwt_identity())
    
    if error:
        return jsonify({'success': False, 'message': error}), 400
        
    return jsonify({'success': True, 'result': result}), 200
