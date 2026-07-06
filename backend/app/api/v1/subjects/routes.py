from flask import request, jsonify, g
from flask_jwt_extended import jwt_required, get_jwt_identity
from app.api.v1.subjects import subjects_bp
from app.services.subject_service import SubjectService
from app.services.bulk_subject_service import BulkSubjectService
from app.schemas.subject import SubjectSchema, SubjectListSchema, SubjectUpdateSchema
from app.utils.auth_utils import admin_required
from app.utils.rbac_decorators import require_permission
from app.utils.tenant_context import tenant_required
from marshmallow import ValidationError

# Initialize schemas
subject_schema = SubjectSchema()
subject_update_schema = SubjectUpdateSchema()
subjects_schema = SubjectListSchema(many=True)

@subjects_bp.route('', methods=['GET'])
@subjects_bp.route('/', methods=['GET'])
@jwt_required()
@tenant_required
@require_permission('subject.read')
def get_subjects():
    """Get all subjects with pagination and filtering."""
    class_id = request.args.get('class_id', type=int)
    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 20, type=int)
    department = request.args.get('department', type=str)
    search = request.args.get('search', type=str)
    is_active = request.args.get('is_active', type=lambda v: v.lower() == 'true' if v else None)
    
    if class_id:
        try:
            from app.models.associations import class_subjects
            from app.models.subject import Subject
            
            # Query class_subjects table to find subjects explicitly mapped to class_id
            query = Subject.query.join(class_subjects).filter(
                class_subjects.c.class_id == class_id
            )
            if g.tenant_id is not None:
                query = query.filter(Subject.tenant_id == g.tenant_id)
            
            subjects_list = query.order_by(Subject.name).all()
            
            if subjects_list:
                return jsonify({
                    'success': True,
                    'subjects': subjects_schema.dump(subjects_list),
                    'pagination': {
                        'total': len(subjects_list),
                        'pages': 1,
                        'page': 1,
                        'per_page': len(subjects_list),
                        'next': None,
                        'prev': None
                    }
                }), 200
        except Exception:
            pass
            
    # Fallback to returning all active subjects if class_id query came back empty (or not provided but class_id was queried)
    if class_id:
        from app.models.subject import Subject
        query = Subject.query.filter_by(is_active=True)
        if g.tenant_id is not None:
            query = query.filter(Subject.tenant_id == g.tenant_id)
        if search:
            search_term = f"%{search.strip()}%"
            query = query.filter(
                (Subject.name.ilike(search_term)) |
                (Subject.code.ilike(search_term)) |
                (Subject.description.ilike(search_term))
            )
        subjects_list = query.order_by(Subject.name).all()
        return jsonify({
            'success': True,
            'subjects': subjects_schema.dump(subjects_list),
            'pagination': {
                'total': len(subjects_list),
                'pages': 1,
                'page': 1,
                'per_page': len(subjects_list),
                'next': None,
                'prev': None
            }
        }), 200
        
    paginated_subjects = SubjectService.get_all_subjects(
        page,
        per_page,
        department,
        is_active,
        tenant_id=g.tenant_id,
        search=search,
    )
    
    return jsonify({
        'success': True,
        'subjects': subjects_schema.dump(paginated_subjects.items),
        'pagination': {
            'total': paginated_subjects.total,
            'pages': paginated_subjects.pages,
            'page': paginated_subjects.page,
            'per_page': paginated_subjects.per_page,
            'next': paginated_subjects.next_num,
            'prev': paginated_subjects.prev_num
        }
    }), 200

@subjects_bp.route('/<int:subject_id>', methods=['GET'])
@jwt_required()
@tenant_required
@require_permission('subject.read')
def get_subject(subject_id):
    """Get a specific subject by ID."""
    subject = SubjectService.get_subject_by_id(subject_id, tenant_id=g.tenant_id)
    
    if not subject:
        return jsonify({'success': False, 'message': 'Subject not found'}), 404
    
    return jsonify({
        'success': True,
        'subject': subject_schema.dump(subject)
    }), 200

@subjects_bp.route('', methods=['POST'])
@subjects_bp.route('/', methods=['POST'])
@jwt_required()
@tenant_required
def create_subject():
    """Create a new subject."""
    try:
        data = subject_schema.load(request.json)
        
        subject, error = SubjectService.create_subject(data, tenant_id=g.tenant_id)
        
        if error:
            return jsonify({'success': False, 'message': error}), 400
        
        return jsonify({
            'success': True,
            'message': 'Subject created successfully',
            'subject': subject_schema.dump(subject)
        }), 201
    except ValidationError as err:
        return jsonify({'success': False, 'errors': err.messages}), 400

@subjects_bp.route('/<int:subject_id>', methods=['PUT'])
@subjects_bp.route('/<int:subject_id>/', methods=['PUT'])
@jwt_required()
@tenant_required
def update_subject(subject_id):
    """Update an existing subject."""
    try:
        data = subject_update_schema.load(request.json or {}, partial=True)
        
        subject, error = SubjectService.update_subject(subject_id, data, tenant_id=g.tenant_id)
        
        if error:
            return jsonify({'success': False, 'message': error}), 400
        
        return jsonify({
            'success': True,
            'message': 'Subject updated successfully',
            'subject': subject_schema.dump(subject)
        }), 200
    except ValidationError as err:
        return jsonify({'success': False, 'errors': err.messages}), 400

@subjects_bp.route('/<int:subject_id>', methods=['DELETE'])
@jwt_required()
@tenant_required
@admin_required
def delete_subject(subject_id):
    """Delete a subject."""
    # Check for force parameter
    force = request.args.get('force', 'false').lower() == 'true'
    
    if force:
        success, error = SubjectService.force_delete_subject(subject_id, tenant_id=g.tenant_id)
    else:
        success, error = SubjectService.delete_subject(subject_id, tenant_id=g.tenant_id)
    
    if error:
        return jsonify({'success': False, 'message': error}), 400
    
    return jsonify({
        'success': True,
        'message': 'Subject deleted successfully'
    }), 200

@subjects_bp.route('/<int:subject_id>/assign-teacher', methods=['PUT'])
@jwt_required()
@tenant_required
@admin_required
def assign_teacher(subject_id):
    """Assign a teacher to a subject."""
    try:
        teacher_id = request.json.get('teacher_id')
        is_primary = request.json.get('is_primary', False)
        
        if teacher_id is None:
            return jsonify({'success': False, 'message': 'Teacher ID is required'}), 400
        
        subject, error = SubjectService.assign_teacher(subject_id, teacher_id, is_primary, tenant_id=g.tenant_id)
        
        if error:
            return jsonify({'success': False, 'message': error}), 400
        
        return jsonify({
            'success': True,
            'message': 'Teacher assigned to subject successfully',
            'subject': subject_schema.dump(subject)
        }), 200
    except ValidationError as err:
        return jsonify({'success': False, 'errors': err.messages}), 400

@subjects_bp.route('/<int:subject_id>/remove-teacher', methods=['PUT'])
@jwt_required()
@tenant_required
@admin_required
def remove_teacher(subject_id):
    """Remove a teacher from a subject."""
    try:
        teacher_id = request.json.get('teacher_id')
        
        if teacher_id is None:
            return jsonify({'success': False, 'message': 'Teacher ID is required'}), 400
        
        subject, error = SubjectService.remove_teacher(subject_id, teacher_id, tenant_id=g.tenant_id)
        
        if error:
            return jsonify({'success': False, 'message': error}), 400
        
        return jsonify({
            'success': True,
            'message': 'Teacher removed from subject successfully',
            'subject': subject_schema.dump(subject)
        }), 200
    except ValidationError as err:
        return jsonify({'success': False, 'errors': err.messages}), 400

@subjects_bp.route('/<int:subject_id>/assign-class', methods=['PUT'])
@jwt_required()
@tenant_required
@admin_required
def assign_class(subject_id):
    """Assign a class to a subject."""
    try:
        class_id = request.json.get('class_id')
        if class_id is None:
            return jsonify({'success': False, 'message': 'Class ID is required'}), 400
        
        subject, error = SubjectService.assign_class(subject_id, class_id, tenant_id=g.tenant_id)
        
        if error:
            return jsonify({'success': False, 'message': error}), 400
        
        return jsonify({
            'success': True,
            'message': 'Class assigned to subject successfully',
            'subject': subject_schema.dump(subject)
        }), 200
    except ValidationError as err:
        return jsonify({'success': False, 'errors': err.messages}), 400

@subjects_bp.route('/<int:subject_id>/remove-class', methods=['PUT'])
@jwt_required()
@tenant_required
@admin_required
def remove_class(subject_id):
    """Remove a class from a subject."""
    try:
        class_id = request.json.get('class_id')
        if class_id is None:
            return jsonify({'success': False, 'message': 'Class ID is required'}), 400
        
        subject, error = SubjectService.remove_class(subject_id, class_id, tenant_id=g.tenant_id)
        
        if error:
            return jsonify({'success': False, 'message': error}), 400
        
        return jsonify({
            'success': True,
            'message': 'Class removed from subject successfully',
            'subject': subject_schema.dump(subject)
        }), 200
    except ValidationError as err:
        return jsonify({'success': False, 'errors': err.messages}), 400

@subjects_bp.route('/teacher/<int:teacher_id>', methods=['GET'])
@jwt_required()
@tenant_required
@require_permission('subject.read')
def get_subjects_by_teacher(teacher_id):
    """Get subjects taught by a specific teacher."""
    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 20, type=int)
    
    paginated_subjects = SubjectService.get_subjects_by_teacher(teacher_id, page, per_page, tenant_id=g.tenant_id)
    
    if paginated_subjects is None:
        return jsonify({'success': False, 'message': 'Teacher not found'}), 404
    
    return jsonify({
        'success': True,
        'subjects': subjects_schema.dump(paginated_subjects.items),
        'pagination': {
            'total': paginated_subjects.total,
            'pages': paginated_subjects.pages,
            'page': paginated_subjects.page,
            'per_page': paginated_subjects.per_page,
            'next': paginated_subjects.next_num,
            'prev': paginated_subjects.prev_num
        }
    }), 200

@subjects_bp.route('/class/<int:class_id>', methods=['GET'])
@jwt_required()
@tenant_required
@require_permission('subject.read')
def get_subjects_by_class(class_id):
    """Get subjects taught in a specific class."""
    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 20, type=int)
    
    paginated_subjects = SubjectService.get_subjects_by_class(class_id, page, per_page, tenant_id=g.tenant_id)
    
    if paginated_subjects is None:
        return jsonify({'success': False, 'message': 'Class not found'}), 404
    
    return jsonify({
        'success': True,
        'subjects': subjects_schema.dump(paginated_subjects.items),
        'pagination': {
            'total': paginated_subjects.total,
            'pages': paginated_subjects.pages,
            'page': paginated_subjects.page,
            'per_page': paginated_subjects.per_page,
            'next': paginated_subjects.next_num,
            'prev': paginated_subjects.prev_num
        }
    }), 200

@subjects_bp.route('/bulk-delete', methods=['POST'])
@jwt_required()
@tenant_required
@admin_required
def bulk_delete_subjects():
    """Delete multiple subjects in bulk."""
    try:
        data = request.get_json()
        subject_ids = data.get('subject_ids', [])
        
        if not subject_ids:
            return jsonify({
                'success': False, 
                'message': 'No subject IDs provided'
            }), 400
        
        if not isinstance(subject_ids, list):
            return jsonify({
                'success': False, 
                'message': 'subject_ids must be a list'
            }), 400
        
        user_id = get_jwt_identity()
        success, results = BulkSubjectService.bulk_delete_subjects(subject_ids, user_id, tenant_id=g.tenant_id)
        
        if success:
            successful_deletes = [r for r in results if r['success']]
            failed_deletes = [r for r in results if not r['success']]
            
            return jsonify({
                'success': True,
                'message': f'Successfully deleted {len(successful_deletes)} subjects',
                'results': {
                    'successful': len(successful_deletes),
                    'failed': len(failed_deletes),
                    'details': results
                }
            }), 200
        else:
            return jsonify({
                'success': False,
                'message': f'Bulk deletion failed: {results}'
            }), 500
            
    except Exception as e:
        return jsonify({
            'success': False,
            'message': f'Error processing bulk delete: {str(e)}'
        }), 500

@subjects_bp.route('', methods=['OPTIONS'])
@subjects_bp.route('/', methods=['OPTIONS'])
def handle_options():
    """Handle preflight OPTIONS requests."""
    return '', 200
