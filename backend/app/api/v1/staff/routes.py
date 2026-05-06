from flask import request, jsonify, g
from flask_jwt_extended import jwt_required
from marshmallow import ValidationError

from app.api.v1.staff import staff_bp
from app.services.staff_service import StaffService
from app.schemas.staff import StaffSchema, StaffListSchema
from app.utils.auth_utils import admin_required
from app.utils.tenant_context import tenant_required
from app.extensions import db

staff_schema = StaffSchema()
staff_list_schema = StaffListSchema(many=True)

@staff_bp.route('', methods=['POST'])
@jwt_required()
@tenant_required
@admin_required
def create_staff():
    """Create non-teaching/admin staff profile."""
    try:
        data = staff_schema.load(request.get_json(force=True))
        staff, error = StaffService.create_staff(data, tenant_id=g.tenant_id)
        if error:
            return jsonify({'success': False, 'message': error}), 400

        return jsonify({
            'success': True,
            'staff': staff_schema.dump(staff),
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

    from app.models.staff import Staff
    paginated = Staff.query.filter(Staff.tenant_id == g.tenant_id).order_by(Staff.created_at.desc()).paginate(page=page, per_page=per_page)

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
