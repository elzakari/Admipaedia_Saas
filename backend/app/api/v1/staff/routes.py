from datetime import date
from flask import request, jsonify, g
from flask_jwt_extended import jwt_required
from marshmallow import ValidationError

from app.api.v1.staff import staff_bp
from app.services.staff_service import StaffService
from app.schemas.staff import StaffSchema, StaffListSchema
from app.utils.auth_utils import admin_required
from app.utils.tenant_context import tenant_required
from app.extensions import db


def _serialize_staff(staff):
    department_info = (
        StaffService._get_department_lookup(
            [getattr(staff, 'user_id', None)],
            tenant_id=getattr(g, 'tenant_id', None)
        )
        if getattr(staff, 'user_id', None)
        else {}
    )
    department = department_info.get(getattr(staff, 'user_id', None), {})
    return {
        'id': staff.id,
        'user_id': staff.user_id,
        'employee_id': staff.employee_id,
        'first_name': staff.first_name,
        'last_name': staff.last_name,
        'full_name': staff.full_name,
        'job_title': staff.job_title,
        'date_of_birth': staff.date_of_birth.isoformat() if getattr(staff, 'date_of_birth', None) else None,
        'gender': staff.gender,
        'address': staff.address,
        'phone_number': staff.phone_number,
        'joining_date': staff.joining_date.isoformat() if getattr(staff, 'joining_date', None) else None,
        'status': staff.status,
        'email': getattr(getattr(staff, 'user', None), 'email', None),
        'department_id': department.get('department_id'),
        'department_name': department.get('department_name'),
        'created_at': staff.created_at.isoformat() if getattr(staff, 'created_at', None) else None,
        'updated_at': staff.updated_at.isoformat() if getattr(staff, 'updated_at', None) else None,
    }

staff_schema = StaffSchema()
staff_list_schema = StaffListSchema(many=True)

@staff_bp.route('', methods=['POST'])
@jwt_required()
@tenant_required
@admin_required
def create_staff():
    """Create non-teaching/admin staff profile."""
    try:
        payload = dict(request.get_json(force=True) or {})
        from app.models.user import User
        email = payload.get('email')
        if email and not payload.get('user_id'):
            existing_user = User.query.filter_by(email=email).first()
            if existing_user:
                payload['user_id'] = existing_user.id
            else:
                username = payload.get('username') or email.split('@')[0]
                user = User(username=username, email=email, role='staff')
                user.set_password('Password123!')
                db.session.add(user)
                db.session.flush()
                payload['user_id'] = user.id

        data = staff_schema.load(payload)
        staff, error = StaffService.create_staff(data, tenant_id=g.tenant_id)
        if error:
            return jsonify({'success': False, 'message': error}), 400

        return jsonify({
            'success': True,
            'staff': _serialize_staff(staff),
            'message': 'Staff profile created successfully'
        }), 201
    except ValidationError as err:
        return jsonify({'success': False, 'errors': err.messages}), 400

@staff_bp.route('/<int:staff_id>/assign-department', methods=['POST'])
@jwt_required()
@tenant_required
@admin_required
def assign_department(staff_id: int):
    """Assign a staff profile to a department."""
    payload = request.get_json(force=True)
    department_id = payload.get('department_id')
    role = payload.get('role')

    if not department_id:
        return jsonify({'success': False, 'message': 'department_id is required'}), 400

    ok, error = StaffService.assign_department(staff_id=staff_id, department_id=department_id, role=role, tenant_id=g.tenant_id)
    if not ok:
        return jsonify({'success': False, 'message': error or 'Assignment failed'}), 400

    return jsonify({'success': True, 'message': 'Staff assigned to department successfully'}), 200

@staff_bp.route('', methods=['GET'])
@jwt_required()
@tenant_required
@admin_required
def list_staff():
    """List staff profiles (basic list)."""
    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 20, type=int)
    search = request.args.get('search')
    paginated = StaffService.list_staff(page=page, per_page=per_page, search=search, tenant_id=g.tenant_id)

    return jsonify({
        'success': True,
        'staff': staff_list_schema.dump(paginated.items),
        'pagination': {
            'total': paginated.total,
            'pages': paginated.pages,
            'page': paginated.page,
            'per_page': paginated.per_page,
            'next': paginated.next_num,
            'prev': paginated.prev_num
        }
    }), 200


@staff_bp.route('/directory', methods=['GET'])
@jwt_required()
@tenant_required
@admin_required
def staff_directory():
    search = request.args.get('search')
    directory = StaffService.get_staff_directory(tenant_id=g.tenant_id, search=search)
    return jsonify({
        'success': True,
        'directory': directory,
        'summary': {
            'total': len(directory),
            'teachers': len([row for row in directory if row.get('entity_type') == 'teacher']),
            'staff': len([row for row in directory if row.get('entity_type') == 'staff']),
            'active': len([row for row in directory if str(row.get('status', '')).lower() == 'active']),
        }
    }), 200


@staff_bp.route('/attendance-summary', methods=['GET'])
@jwt_required()
@tenant_required
@admin_required
def staff_attendance_summary():
    month = request.args.get('month')
    if not month:
        return jsonify({'success': False, 'message': 'month is required'}), 400
    data = StaffService.get_attendance_summary(month=month, tenant_id=g.tenant_id)
    return jsonify({'success': True, 'data': data}), 200


@staff_bp.route('/<int:staff_id>', methods=['GET'])
@jwt_required()
@tenant_required
@admin_required
def get_staff(staff_id: int):
    staff = StaffService.get_staff_by_id(staff_id, tenant_id=g.tenant_id)
    if not staff:
        return jsonify({'success': False, 'message': 'Staff not found'}), 404
    return jsonify({'success': True, 'staff': _serialize_staff(staff)}), 200


@staff_bp.route('/<int:staff_id>', methods=['PUT'])
@jwt_required()
@tenant_required
@admin_required
def update_staff(staff_id: int):
    try:
        data = staff_schema.load(request.get_json(force=True) or {}, partial=True)
        staff, error = StaffService.update_staff(staff_id, data, tenant_id=g.tenant_id)
        if error:
            return jsonify({'success': False, 'message': error}), 400
        return jsonify({'success': True, 'staff': _serialize_staff(staff), 'message': 'Staff updated successfully'}), 200
    except ValidationError as err:
        return jsonify({'success': False, 'errors': err.messages}), 400


@staff_bp.route('/<int:staff_id>', methods=['DELETE'])
@jwt_required()
@tenant_required
@admin_required
def delete_staff(staff_id: int):
    ok, error = StaffService.delete_staff(staff_id, tenant_id=g.tenant_id)
    if not ok:
        return jsonify({'success': False, 'message': error}), 400
    return jsonify({'success': True, 'message': 'Staff deleted successfully'}), 200


@staff_bp.route('/<int:staff_id>/attendance', methods=['GET'])
@jwt_required()
@tenant_required
@admin_required
def get_staff_attendance(staff_id: int):
    start_value = request.args.get('start_date')
    end_value = request.args.get('end_date')
    start_date = date.fromisoformat(start_value) if start_value else date.today().replace(day=1)
    end_date = date.fromisoformat(end_value) if end_value else date.today()
    records, error = StaffService.get_staff_attendance(staff_id, start_date, end_date, tenant_id=g.tenant_id)
    if error:
        return jsonify({'success': False, 'message': error}), 404
    return jsonify({
        'success': True,
        'attendance': [
            {
                'id': record.id,
                'staff_id': record.staff_id,
                'date': record.date.isoformat(),
                'status': record.status,
                'check_in_time': record.check_in_time.isoformat() if record.check_in_time else None,
                'check_out_time': record.check_out_time.isoformat() if record.check_out_time else None,
            }
            for record in records
        ]
    }), 200


@staff_bp.route('/<int:staff_id>/attendance', methods=['POST'])
@jwt_required()
@tenant_required
@admin_required
def mark_staff_attendance(staff_id: int):
    payload = request.get_json(force=True) or {}
    attendance_date = payload.get('date')
    status = payload.get('status')
    if not attendance_date or not status:
        return jsonify({'success': False, 'message': 'date and status are required'}), 400
    record, error = StaffService.mark_staff_attendance(
        staff_id=staff_id,
        attendance_date=date.fromisoformat(attendance_date),
        status=status,
        note=payload.get('note'),
        tenant_id=g.tenant_id
    )
    if error:
        return jsonify({'success': False, 'message': error}), 400
    return jsonify({
        'success': True,
        'attendance': {
            'id': record.id,
            'staff_id': record.staff_id,
            'date': record.date.isoformat(),
            'status': record.status,
            'check_in_time': record.check_in_time.isoformat() if record.check_in_time else None,
            'check_out_time': record.check_out_time.isoformat() if record.check_out_time else None,
        }
    }), 200
