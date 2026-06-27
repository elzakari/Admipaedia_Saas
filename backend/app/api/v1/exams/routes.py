from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from app.services.exam_service import ExamService, normalize_exam_datetime
from app.services.enhanced_exam_service import EnhancedExamService
from app.services.grade_service import GradeService
from app.services.identity_resolver import IdentityResolver
from app.schemas.exam import ExamSchema, ExamCreateSchema, ExamUpdateSchema
from app.schemas.grade import GradeSchema
from app.models.user import User
from app.utils.rbac_decorators import require_permission, require_role
from datetime import datetime
import logging

logger = logging.getLogger(__name__)

# Use the shared blueprint instance defined in exams/__init__.py
from . import exams_bp

# Schema instances
exam_schema = ExamSchema()
exams_schema = ExamSchema(many=True)
exam_create_schema = ExamCreateSchema()
exam_update_schema = ExamUpdateSchema()
grade_schema = GradeSchema()
grades_schema = GradeSchema(many=True)

# Handle base preflight OPTIONS for /api/v1/exams
@exams_bp.route('', methods=['OPTIONS'])
def handle_exams_options_base():
    return '', 200

@exams_bp.route('/', methods=['OPTIONS'])
def handle_exams_options_slash():
    return '', 200

@exams_bp.route('', methods=['GET'])
@exams_bp.route('/', methods=['GET'])
@jwt_required()
@require_role(['admin', 'school_admin', 'super_admin', 'teacher'])
def get_exams():
    """Get all exams with optional filtering and enhanced conflict detection."""
    try:
        # Get query parameters
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 20, type=int)
        class_id = request.args.get('class_id', type=int)
        subject_id = request.args.get('subject_id', type=int)
        date_from = request.args.get('date_from')
        date_to = request.args.get('date_to')
        status = request.args.get('status')
        include_conflicts = request.args.get('include_conflicts', 'false').lower() == 'true'
        
        # Convert date strings to datetime objects
        if date_from:
            try:
                date_from = datetime.strptime(date_from, '%Y-%m-%d')
            except ValueError:
                return jsonify({'success': False, 'message': 'Invalid date_from format'}), 400
        
        if date_to:
            try:
                date_to = datetime.strptime(date_to, '%Y-%m-%d')
            except ValueError:
                return jsonify({'success': False, 'message': 'Invalid date_to format'}), 400
        
        current_user_id = get_jwt_identity()
        current_user = User.query.get(current_user_id)
        if not current_user:
            return jsonify({'success': False, 'message': 'User not found'}), 404

        if current_user.role == 'teacher' and class_id and not IdentityResolver.can_user_access_class(current_user.id, class_id):
            return jsonify({'success': False, 'message': 'Insufficient permissions for this class context'}), 403

        # Get paginated exams
        paginated_exams = ExamService.get_all_exams(
            page, per_page, class_id, subject_id, date_from, date_to, status
        )
        
        # Serialize exams
        exams_data = exams_schema.dump(paginated_exams.items)
        
        # Add conflict information if requested
        if include_conflicts:
            for exam_data in exams_data:
                if exam_data['status'] in ['scheduled', 'ongoing']:
                    conflicts = EnhancedExamService.detect_exam_conflicts(
                        exam_data['class_id'],
                        normalize_exam_datetime(exam_data['exam_date']),
                        exam_data['duration'],
                        exam_data['id']
                    )
                    exam_data['conflicts'] = conflicts
        
        return jsonify({
            'success': True,
            'exams': exams_data,
            'pagination': {
                'total': paginated_exams.total,
                'pages': paginated_exams.pages,
                'page': paginated_exams.page,
                'per_page': paginated_exams.per_page,
                'next': paginated_exams.next_num,
                'prev': paginated_exams.prev_num
            }
        }), 200
        
    except Exception as e:
        logger.error(f"Error getting exams: {str(e)}")
        return jsonify({
            'success': False,
            'message': 'Failed to retrieve exams',
            'error': str(e)
        }), 500

@exams_bp.route('/<int:exam_id>', methods=['GET'])
@jwt_required()
@require_permission('exam.read')
def get_exam(exam_id):
    """Get a specific exam by ID with enhanced analytics."""
    try:
        exam = ExamService.get_exam_by_id(exam_id)
        
        if not exam:
            return jsonify({'success': False, 'message': 'Exam not found'}), 404
        
        exam_data = exam_schema.dump(exam)
        
        # Add enhanced analytics if requested
        include_analytics = request.args.get('include_analytics', 'false').lower() == 'true'
        if include_analytics:
            analytics = EnhancedExamService.get_exam_analytics(exam_id)
            if 'error' not in analytics:
                exam_data['analytics'] = analytics
        
        return jsonify({
            'success': True,
            'exam': exam_data
        }), 200
        
    except Exception as e:
        logger.error(f"Error getting exam {exam_id}: {str(e)}")
        return jsonify({
            'success': False,
            'message': 'Failed to retrieve exam',
            'error': str(e)
        }), 500

@exams_bp.route('', methods=['POST'])
@exams_bp.route('/', methods=['POST'])
@jwt_required()
@require_role(['admin', 'school_admin', 'super_admin', 'teacher'])
def create_exam():
    """Create a new exam with conflict detection."""
    try:
        # Get current user
        current_user_id = get_jwt_identity()
        current_user = User.query.get(current_user_id)
        
        if not current_user:
            return jsonify({'success': False, 'message': 'User not found'}), 404
        
        # Validate request data
        data = request.get_json()
        errors = exam_create_schema.validate(data)
        if errors:
            return jsonify({'success': False, 'message': 'Validation failed', 'errors': errors}), 400
        
        if current_user.role == 'teacher' and not IdentityResolver.can_user_access_class(current_user.id, data['class_id']):
            return jsonify({'success': False, 'message': 'Insufficient permissions for this class context'}), 403

        # Add created_by field
        data['created_by'] = current_user_id
        
        # Check for conflicts before creating
        check_conflicts = request.args.get('check_conflicts', 'true').lower() == 'true'
        if check_conflicts:
            exam_date = normalize_exam_datetime(data['exam_date'])
            conflicts = EnhancedExamService.detect_exam_conflicts(
                data['class_id'],
                exam_date,
                data['duration']
            )
            
            # If critical conflicts exist, return warning
            if conflicts['has_conflicts'] and conflicts['severity'] == 'critical':
                return jsonify({
                    'success': False,
                    'message': 'Critical scheduling conflicts detected',
                    'conflicts': conflicts,
                    'action_required': 'resolve_conflicts'
                }), 409  # Conflict status code
        
        # Calculate optimal duration if not provided or requested
        if 'calculate_duration' in data and data['calculate_duration']:
            duration_info = EnhancedExamService.calculate_optimal_exam_duration(
                data['subject_id'],
                data['total_marks'],
                data.get('exam_type', 'regular')
            )
            data['duration'] = duration_info['optimal_duration']
            data['duration_calculation'] = duration_info
        
        # Create exam
        exam, error = ExamService.create_exam(data)
        
        if error:
            return jsonify({'success': False, 'message': error}), 400
        
        exam_data = exam_schema.dump(exam)
        
        # Add conflict information to response
        if check_conflicts:
            conflicts = EnhancedExamService.detect_exam_conflicts(
                exam.class_id,
                exam.exam_date,
                exam.duration,
                exam.id
            )
            exam_data['conflicts'] = conflicts
        
        return jsonify({
            'success': True,
            'exam': exam_data,
            'message': 'Exam created successfully'
        }), 201
        
    except Exception as e:
        try:
            from app.extensions import db
            db.session.rollback()
        except Exception:
            pass
        logger.error(f"Error creating exam: {str(e)}")
        return jsonify({
            'success': False,
            'message': 'Failed to create exam',
            'error': str(e)
        }), 500

@exams_bp.route('/<int:exam_id>', methods=['PUT'])
@jwt_required()
@require_permission('exam.manage')
def update_exam(exam_id):
    """Update an existing exam with conflict detection."""
    try:
        # Validate request data
        data = request.get_json()
        errors = exam_update_schema.validate(data)
        if errors:
            return jsonify({'success': False, 'message': 'Validation failed', 'errors': errors}), 400
        
        # Check for conflicts if date/time is being updated
        check_conflicts = request.args.get('check_conflicts', 'true').lower() == 'true'
        if check_conflicts and ('exam_date' in data or 'duration' in data):
            exam = ExamService.get_exam_by_id(exam_id)
            if exam:
                exam_date = normalize_exam_datetime(data.get('exam_date', exam.exam_date))
                duration = data.get('duration', exam.duration)
                
                conflicts = EnhancedExamService.detect_exam_conflicts(
                    exam.class_id,
                    exam_date,
                    duration,
                    exam_id
                )
                
                # If critical conflicts exist, return warning
                if conflicts['has_conflicts'] and conflicts['severity'] == 'critical':
                    return jsonify({
                        'success': False,
                        'message': 'Critical scheduling conflicts detected',
                        'conflicts': conflicts,
                        'action_required': 'resolve_conflicts'
                    }), 409
        
        # Update exam
        exam, error = ExamService.update_exam(exam_id, data)
        
        if error:
            return jsonify({'success': False, 'message': error}), 400
        
        exam_data = exam_schema.dump(exam)
        
        # Add conflict information to response
        if check_conflicts:
            conflicts = EnhancedExamService.detect_exam_conflicts(
                exam.class_id,
                exam.exam_date,
                exam.duration,
                exam.id
            )
            exam_data['conflicts'] = conflicts
        
        return jsonify({
            'success': True,
            'exam': exam_data,
            'message': 'Exam updated successfully'
        }), 200
        
    except Exception as e:
        logger.error(f"Error updating exam {exam_id}: {str(e)}")
        return jsonify({
            'success': False,
            'message': 'Failed to update exam',
            'error': str(e)
        }), 500

@exams_bp.route('/<int:exam_id>', methods=['DELETE'])
@jwt_required()
def delete_exam(exam_id):
    """Delete an exam."""
    try:
        # Check for force parameter
        force = request.args.get('force', 'false').lower() == 'true'
        
        success, error = ExamService.delete_exam(exam_id, force=force)
        
        if not success:
            return jsonify({'success': False, 'message': error}), 400
        
        return jsonify({
            'success': True,
            'message': 'Exam deleted successfully'
        }), 200
        
    except Exception as e:
        logger.error(f"Error deleting exam {exam_id}: {str(e)}")
        return jsonify({
            'success': False,
            'message': 'Failed to delete exam',
            'error': str(e)
        }), 500

@exams_bp.route('/upcoming', methods=['GET'])
@jwt_required()
def get_upcoming_exams():
    """Get upcoming exams within the specified number of days."""
    try:
        class_id = request.args.get('class_id', type=int)
        days = request.args.get('days', 7, type=int)
        
        upcoming_exams = ExamService.get_upcoming_exams(class_id, days)
        
        return jsonify({
            'success': True,
            'exams': exams_schema.dump(upcoming_exams)
        }), 200
        
    except Exception as e:
        logger.error(f"Error getting upcoming exams: {str(e)}")
        return jsonify({
            'success': False,
            'message': 'Failed to retrieve upcoming exams',
            'error': str(e)
        }), 500

@exams_bp.route('/<int:exam_id>/grades', methods=['GET'])
@jwt_required()
@require_role(['admin', 'school_admin', 'super_admin', 'teacher'])
def get_exam_grades(exam_id):
    """Get all grades for a specific exam."""
    # Verify exam exists
    exam = ExamService.get_exam_by_id(exam_id)
    if not exam:
        return jsonify({'success': False, 'message': 'Exam not found'}), 404

    current_user_id = get_jwt_identity()
    current_user = User.query.get(current_user_id)
    if not current_user:
        return jsonify({'success': False, 'message': 'User not found'}), 404

    if current_user.role == 'teacher' and not IdentityResolver.can_user_access_class(current_user.id, exam.class_id):
        return jsonify({'success': False, 'message': 'Insufficient permissions for this class context'}), 403
    
    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 50, type=int)
    
    paginated_grades = GradeService.get_exam_grades(exam_id, page, per_page)
    
    return jsonify({
        'success': True,
        'grades': grades_schema.dump(paginated_grades.items),
        'pagination': {
            'total': paginated_grades.total,
            'pages': paginated_grades.pages,
            'page': paginated_grades.page,
            'per_page': paginated_grades.per_page,
            'next': paginated_grades.next_num,
            'prev': paginated_grades.prev_num
        }
    }), 200

@exams_bp.route('/<int:exam_id>/grades', methods=['OPTIONS'])
def handle_exam_grades_options(exam_id):
    """Handle preflight OPTIONS requests for exam grades."""
    return '', 200

@exams_bp.route('/<int:exam_id>/statistics', methods=['GET'])
@jwt_required()
@require_permission('exam.read')
def get_exam_statistics(exam_id):
    """Get enhanced statistics for a specific exam."""
    try:
        # Verify exam exists
        exam = ExamService.get_exam_by_id(exam_id)
        if not exam:
            return jsonify({'success': False, 'message': 'Exam not found'}), 404
        
        # Get enhanced analytics
        analytics = EnhancedExamService.get_exam_analytics(exam_id)
        
        if 'error' in analytics:
            return jsonify({
                'success': False,
                'message': analytics['error']
            }), 500
        
        return jsonify({
            'success': True,
            'statistics': analytics
        }), 200
        
    except Exception as e:
        logger.error(f"Error getting exam statistics: {str(e)}")
        return jsonify({
            'success': False,
            'message': 'Failed to retrieve statistics',
            'error': str(e)
        }), 500

@exams_bp.route('/<int:exam_id>/statistics', methods=['OPTIONS'])
def handle_exam_statistics_options(exam_id):
    """Handle preflight OPTIONS requests for exam statistics."""
    return '', 200
