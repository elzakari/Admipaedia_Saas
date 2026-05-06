from flask import Blueprint, request, jsonify
from app.services.department_service import DepartmentService
from app.schemas.department_schema import DepartmentSchema
from app.utils.auth import jwt_required, admin_required

departments_bp = Blueprint('departments', __name__)
department_schema = DepartmentSchema()
departments_schema = DepartmentSchema(many=True)

@departments_bp.route('', methods=['GET'])
@jwt_required
def get_departments():
    is_active = request.args.get('is_active')
    if is_active is not None:
        is_active = is_active.lower() == 'true'
    
    departments = DepartmentService.get_all_departments(is_active=is_active)
    return jsonify({
        'success': True,
        'data': departments_schema.dump(departments)
    }), 200

@departments_bp.route('/<int:department_id>', methods=['GET'])
@jwt_required
def get_department(department_id):
    department = DepartmentService.get_department_by_id(department_id)
    if not department:
        return jsonify({
            'success': False,
            'message': f'Department with ID {department_id} not found'
        }), 404
    
    return jsonify({
        'success': True,
        'data': department_schema.dump(department)
    }), 200

@departments_bp.route('', methods=['POST'])
@jwt_required
@admin_required
def create_department():
    data = request.get_json()
    department = DepartmentService.create_department(data)
    if not department:
        return jsonify({
            'success': False,
            'message': 'Department could not be created. Code may already exist.'
        }), 400
    
    return jsonify({
        'success': True,
        'data': department_schema.dump(department),
        'message': 'Department created successfully'
    }), 201

@departments_bp.route('/<int:department_id>', methods=['PUT'])
@jwt_required
@admin_required
def update_department(department_id):
    data = request.get_json()
    department = DepartmentService.update_department(department_id, data)
    if not department:
        return jsonify({
            'success': False,
            'message': f'Department with ID {department_id} not found or code already exists'
        }), 404
    
    return jsonify({
        'success': True,
        'data': department_schema.dump(department),
        'message': 'Department updated successfully'
    }), 200

@departments_bp.route('/<int:department_id>', methods=['DELETE'])
@jwt_required
@admin_required
def delete_department(department_id):
    success = DepartmentService.delete_department(department_id)
    if not success:
        return jsonify({
            'success': False,
            'message': f'Department with ID {department_id} not found'
        }), 404
    
    return jsonify({
        'success': True,
        'message': 'Department deleted successfully'
    }), 200