"""
Enhanced Exam Routes for Advanced Exam Management
Provides endpoints for conflict detection, analytics, and scheduling optimization
"""

from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from app.services.enhanced_exam_service import EnhancedExamService
from app.services.exam_service import ExamService
from app.models.exam import Exam
from app.models.user import User
from app.utils.rbac_decorators import require_permission, require_role
from datetime import datetime, date
import logging

logger = logging.getLogger(__name__)

enhanced_exams_bp = Blueprint('enhanced_exams', __name__)

@enhanced_exams_bp.route('/conflicts/check', methods=['POST'])
@jwt_required()
@require_permission('exam.manage')
def check_exam_conflicts():
    """Check for exam scheduling conflicts"""
    try:
        data = request.get_json()
        
        # Validate required fields
        required_fields = ['class_id', 'exam_date', 'duration']
        for field in required_fields:
            if field not in data:
                return jsonify({
                    'success': False,
                    'message': f'Missing required field: {field}'
                }), 400
        
        # Parse exam date
        try:
            exam_date = datetime.fromisoformat(data['exam_date'].replace('Z', '+00:00'))
        except ValueError:
            return jsonify({
                'success': False,
                'message': 'Invalid exam_date format. Use ISO format.'
            }), 400
        
        # Check conflicts
        conflicts = EnhancedExamService.detect_exam_conflicts(
            class_id=data['class_id'],
            exam_date=exam_date,
            duration=data['duration'],
            exam_id=data.get('exam_id')
        )
        
        return jsonify({
            'success': True,
            'conflicts': conflicts
        }), 200
        
    except Exception as e:
        logger.error(f"Error checking exam conflicts: {str(e)}")
        return jsonify({
            'success': False,
            'message': 'Failed to check conflicts',
            'error': str(e)
        }), 500

@enhanced_exams_bp.route('/<int:exam_id>/analytics', methods=['GET'])
@jwt_required()
@require_permission('exam.reports')
def get_exam_analytics(exam_id):
    """Get comprehensive analytics for an exam"""
    try:
        analytics = EnhancedExamService.get_exam_analytics(exam_id)
        
        if 'error' in analytics:
            return jsonify({
                'success': False,
                'message': analytics['error']
            }), 404 if 'not found' in analytics['error'].lower() else 500
        
        return jsonify({
            'success': True,
            'analytics': analytics
        }), 200
        
    except Exception as e:
        logger.error(f"Error getting exam analytics: {str(e)}")
        return jsonify({
            'success': False,
            'message': 'Failed to get analytics',
            'error': str(e)
        }), 500

@enhanced_exams_bp.route('/classes/<int:class_id>/schedule', methods=['GET'])
@jwt_required()
@require_permission('exam.read')
def get_class_exam_schedule(class_id):
    """Get comprehensive exam schedule for a class"""
    try:
        # Parse date parameters
        date_from = request.args.get('date_from')
        date_to = request.args.get('date_to')
        
        if date_from:
            try:
                date_from = datetime.strptime(date_from, '%Y-%m-%d').date()
            except ValueError:
                return jsonify({
                    'success': False,
                    'message': 'Invalid date_from format. Use YYYY-MM-DD.'
                }), 400
        
        if date_to:
            try:
                date_to = datetime.strptime(date_to, '%Y-%m-%d').date()
            except ValueError:
                return jsonify({
                    'success': False,
                    'message': 'Invalid date_to format. Use YYYY-MM-DD.'
                }), 400
        
        schedule = EnhancedExamService.get_class_exam_schedule(
            class_id=class_id,
            date_from=date_from,
            date_to=date_to
        )
        
        if 'error' in schedule:
            return jsonify({
                'success': False,
                'message': schedule['error']
            }), 500
        
        return jsonify({
            'success': True,
            'schedule': schedule
        }), 200
        
    except Exception as e:
        logger.error(f"Error getting class exam schedule: {str(e)}")
        return jsonify({
            'success': False,
            'message': 'Failed to get schedule',
            'error': str(e)
        }), 500

@enhanced_exams_bp.route('/duration/calculate', methods=['POST'])
@jwt_required()
def calculate_optimal_duration():
    """Calculate optimal exam duration"""
    try:
        data = request.get_json()
        
        # Validate required fields
        required_fields = ['subject_id', 'total_marks']
        for field in required_fields:
            if field not in data:
                return jsonify({
                    'success': False,
                    'message': f'Missing required field: {field}'
                }), 400
        
        duration_info = EnhancedExamService.calculate_optimal_exam_duration(
            subject_id=data['subject_id'],
            total_marks=data['total_marks'],
            exam_type=data.get('exam_type', 'regular')
        )
        
        return jsonify({
            'success': True,
            'duration_info': duration_info
        }), 200
        
    except Exception as e:
        logger.error(f"Error calculating optimal duration: {str(e)}")
        return jsonify({
            'success': False,
            'message': 'Failed to calculate duration',
            'error': str(e)
        }), 500

@enhanced_exams_bp.route('/batch-analytics', methods=['POST'])
@jwt_required()
@require_permission('exam.reports')
def get_batch_exam_analytics():
    """Get analytics for multiple exams"""
    try:
        data = request.get_json()
        exam_ids = data.get('exam_ids', [])
        
        if not exam_ids:
            return jsonify({
                'success': False,
                'message': 'No exam IDs provided'
            }), 400
        
        analytics_results = []
        for exam_id in exam_ids:
            analytics = EnhancedExamService.get_exam_analytics(exam_id)
            if 'error' not in analytics:
                analytics_results.append(analytics)
        
        # Calculate aggregate statistics
        if analytics_results:
            total_students = sum(result['total_students'] for result in analytics_results)
            avg_pass_rate = sum(
                result['statistics'].get('pass_rate', 0) 
                for result in analytics_results if result['statistics']
            ) / len([r for r in analytics_results if r['statistics']])
            
            aggregate_stats = {
                'total_exams': len(analytics_results),
                'total_students': total_students,
                'average_pass_rate': round(avg_pass_rate, 2),
                'exams_analyzed': len(analytics_results)
            }
        else:
            aggregate_stats = {}
        
        return jsonify({
            'success': True,
            'analytics': analytics_results,
            'aggregate_statistics': aggregate_stats
        }), 200
        
    except Exception as e:
        logger.error(f"Error getting batch analytics: {str(e)}")
        return jsonify({
            'success': False,
            'message': 'Failed to get batch analytics',
            'error': str(e)
        }), 500

@enhanced_exams_bp.route('/performance-trends', methods=['GET'])
@jwt_required()
@require_permission('exam.reports')
def get_performance_trends():
    """Get performance trends across exams"""
    try:
        class_id = request.args.get('class_id', type=int)
        subject_id = request.args.get('subject_id', type=int)
        date_from = request.args.get('date_from')
        date_to = request.args.get('date_to')
        
        # Build query
        query = Exam.query
        
        if class_id:
            query = query.filter(Exam.class_id == class_id)
        if subject_id:
            query = query.filter(Exam.subject_id == subject_id)
        if date_from:
            query = query.filter(Exam.exam_date >= datetime.strptime(date_from, '%Y-%m-%d'))
        if date_to:
            query = query.filter(Exam.exam_date <= datetime.strptime(date_to, '%Y-%m-%d'))
        
        exams = query.order_by(Exam.exam_date).all()
        
        trends = []
        for exam in exams:
            analytics = EnhancedExamService.get_exam_analytics(exam.id)
            if 'error' not in analytics and analytics['statistics']:
                trends.append({
                    'exam_id': exam.id,
                    'title': exam.title,
                    'subject': exam.subject.name,
                    'exam_date': exam.exam_date.isoformat(),
                    'mean_score': analytics['statistics']['mean'],
                    'pass_rate': analytics['statistics']['pass_rate'],
                    'total_students': analytics['total_students']
                })
        
        return jsonify({
            'success': True,
            'trends': trends,
            'summary': {
                'total_exams': len(trends),
                'date_range': {
                    'from': trends[0]['exam_date'] if trends else None,
                    'to': trends[-1]['exam_date'] if trends else None
                }
            }
        }), 200
        
    except Exception as e:
        logger.error(f"Error getting performance trends: {str(e)}")
        return jsonify({
            'success': False,
            'message': 'Failed to get performance trends',
            'error': str(e)
        }), 500

# Error handlers
@enhanced_exams_bp.errorhandler(400)
def bad_request(error):
    return jsonify({
        'success': False,
        'message': 'Bad request',
        'error': str(error)
    }), 400

@enhanced_exams_bp.errorhandler(404)
def not_found(error):
    return jsonify({
        'success': False,
        'message': 'Resource not found',
        'error': str(error)
    }), 404

@enhanced_exams_bp.errorhandler(500)
def internal_error(error):
    return jsonify({
        'success': False,
        'message': 'Internal server error',
        'error': str(error)
    }), 500