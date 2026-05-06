from flask import request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from datetime import datetime, date

from app.services.enhanced_grading_service import EnhancedGradingService
from app.decorators.auth import role_required
from . import enhanced_grading_bp
import logging

logger = logging.getLogger(__name__)

@enhanced_grading_bp.route('/create-grade', methods=['POST'])
@jwt_required()
@role_required(['admin', 'teacher'])
def create_enhanced_grade():
    """Create an enhanced grade with GES compliance"""
    try:
        data = request.get_json()
        
        # Validate required fields
        required_fields = [
            'student_id', 'subject_id', 'class_id', 'assessment_type_id',
            'grading_scheme_id', 'raw_score', 'total_marks', 'assessment_name',
            'assessment_date', 'term', 'academic_year'
        ]
        
        for field in required_fields:
            if field not in data:
                return jsonify({
                    'success': False,
                    'message': f'Missing required field: {field}'
                }), 400
        
        # Parse assessment date
        try:
            assessment_date = datetime.strptime(data['assessment_date'], '%Y-%m-%d').date()
        except ValueError:
            return jsonify({
                'success': False,
                'message': 'Invalid assessment_date format. Use YYYY-MM-DD'
            }), 400
        
        # Create enhanced grade
        grade, error = EnhancedGradingService.create_enhanced_grade(
            student_id=data['student_id'],
            subject_id=data['subject_id'],
            class_id=data['class_id'],
            assessment_type_id=data['assessment_type_id'],
            grading_scheme_id=data['grading_scheme_id'],
            raw_score=float(data['raw_score']),
            total_marks=float(data['total_marks']),
            assessment_name=data['assessment_name'],
            assessment_date=assessment_date,
            term=data['term'],
            academic_year=data['academic_year'],
            teacher_id=get_jwt_identity(),
            weight=float(data.get('weight', 1.0)),
            teacher_comments=data.get('teacher_comments')
        )
        
        if error:
            return jsonify({
                'success': False,
                'message': error
            }), 400
        
        return jsonify({
            'success': True,
            'message': 'Enhanced grade created successfully',
            'data': {
                'id': grade.id,
                'percentage': grade.percentage,
                'grade_symbol': grade.grade_symbol,
                'grade_points': grade.grade_points,
                'is_passing': grade.is_passing
            }
        }), 201
        
    except Exception as e:
        logger.error(f"Error creating enhanced grade: {str(e)}")
        return jsonify({
            'success': False,
            'message': 'An error occurred while creating the grade'
        }), 500

@enhanced_grading_bp.route('/calculate-final-grade', methods=['POST'])
@jwt_required()
@role_required(['admin', 'teacher'])
def calculate_final_grade():
    """Calculate final grade using GES weighting (40% class + 60% external)"""
    try:
        data = request.get_json()
        
        # Validate required fields
        required_fields = ['student_id', 'subject_id', 'class_id', 'term', 'academic_year']
        for field in required_fields:
            if field not in data:
                return jsonify({
                    'success': False,
                    'message': f'Missing required field: {field}'
                }), 400
        
        # Calculate final grade
        final_grade, error = EnhancedGradingService.calculate_final_grade(
            student_id=data['student_id'],
            subject_id=data['subject_id'],
            class_id=data['class_id'],
            term=data['term'],
            academic_year=data['academic_year'],
            external_exam_score=data.get('external_exam_score'),
            grading_scheme_id=data.get('grading_scheme_id', 1),
            computed_by=get_jwt_identity()
        )
        
        if error:
            return jsonify({
                'success': False,
                'message': error
            }), 400
        
        return jsonify({
            'success': True,
            'message': 'Final grade calculated successfully',
            'data': {
                'id': final_grade.id,
                'class_score_average': final_grade.class_score_average,
                'external_exam_score': final_grade.external_exam_score,
                'final_percentage': final_grade.final_percentage,
                'final_grade_symbol': final_grade.final_grade_symbol,
                'final_grade_points': final_grade.final_grade_points,
                'is_passing': final_grade.is_passing
            }
        }), 200
        
    except Exception as e:
        logger.error(f"Error calculating final grade: {str(e)}")
        return jsonify({
            'success': False,
            'message': 'An error occurred while calculating the final grade'
        }), 500

@enhanced_grading_bp.route('/student-analytics/<int:student_id>', methods=['GET'])
@jwt_required()
@role_required(['admin', 'teacher', 'parent'])
def get_student_analytics(student_id):
    """Get comprehensive performance analytics for a student"""
    try:
        academic_year = request.args.get('academic_year', required=True)
        term = request.args.get('term')
        
        analytics = EnhancedGradingService.get_student_performance_analytics(
            student_id=student_id,
            academic_year=academic_year,
            term=term
        )
        
        if 'error' in analytics:
            return jsonify({
                'success': False,
                'message': analytics['error']
            }), 400
        
        return jsonify({
            'success': True,
            'data': analytics
        }), 200
        
    except Exception as e:
        logger.error(f"Error getting student analytics: {str(e)}")
        return jsonify({
            'success': False,
            'message': 'An error occurred while retrieving analytics'
        }), 500

@enhanced_grading_bp.route('/class-analytics/<int:class_id>', methods=['GET'])
@jwt_required()
@role_required(['admin', 'teacher'])
def get_class_analytics(class_id):
    """Get comprehensive performance analytics for a class"""
    try:
        subject_id = request.args.get('subject_id', type=int)
        term = request.args.get('term')
        academic_year = request.args.get('academic_year')
        
        analytics = EnhancedGradingService.get_class_performance_analytics(
            class_id=class_id,
            subject_id=subject_id,
            term=term,
            academic_year=academic_year
        )
        
        if 'error' in analytics:
            return jsonify({
                'success': False,
                'message': analytics['error']
            }), 400
        
        return jsonify({
            'success': True,
            'data': analytics
        }), 200
        
    except Exception as e:
        logger.error(f"Error getting class analytics: {str(e)}")
        return jsonify({
            'success': False,
            'message': 'An error occurred while retrieving analytics'
        }), 500

@enhanced_grading_bp.route('/bulk-calculate-final/<int:class_id>', methods=['POST'])
@jwt_required()
@role_required(['admin', 'teacher'])
def bulk_calculate_final_grades(class_id):
    """Bulk calculate final grades for all students in a class"""
    try:
        data = request.get_json()
        
        # Validate required fields
        required_fields = ['term', 'academic_year']
        for field in required_fields:
            if field not in data:
                return jsonify({
                    'success': False,
                    'message': f'Missing required field: {field}'
                }), 400
        
        # Bulk calculate final grades
        final_grades, error = EnhancedGradingService.bulk_calculate_final_grades(
            class_id=class_id,
            term=data['term'],
            academic_year=data['academic_year'],
            computed_by=get_jwt_identity()
        )
        
        message = f"Successfully calculated {len(final_grades)} final grades"
        if error:
            message += f". Warning: {error}"
        
        return jsonify({
            'success': True,
            'message': message,
            'data': {
                'calculated_count': len(final_grades),
                'class_id': class_id
            }
        }), 200
        
    except Exception as e:
        logger.error(f"Error in bulk final grade calculation: {str(e)}")
        return jsonify({
            'success': False,
            'message': 'An error occurred during bulk calculation'
        }), 500

@enhanced_grading_bp.route('/ges-grade-boundaries', methods=['GET'])
@jwt_required()
def get_ges_grade_boundaries():
    """Get GES grade boundaries for reference"""
    try:
        return jsonify({
            'success': True,
            'data': {
                'grade_boundaries': EnhancedGradingService.GES_GRADE_BOUNDARIES,
                'weighting': {
                    'continuous_assessment': 40,
                    'external_exam': 60
                },
                'description': 'Ghana Education Service (GES) compliant grading system'
            }
        }), 200
        
    except Exception as e:
        logger.error(f"Error getting GES grade boundaries: {str(e)}")
        return jsonify({
            'success': False,
            'message': 'An error occurred while retrieving grade boundaries'
        }), 500