"""
AI Analytics API Routes
Provides endpoints for AI-powered analytics and predictions
"""

from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from app.services.ai_analytics_service import AIAnalyticsService
from app.decorators.permissions import require_permission
import logging

logger = logging.getLogger(__name__)

ai_analytics_bp = Blueprint('ai_analytics', __name__)

@ai_analytics_bp.route('/predict/student-performance/<int:student_id>', methods=['GET'])
@jwt_required()
@require_permission('view_analytics')
def predict_student_performance(student_id):
    """
    Predict student performance using AI algorithms.
    
    Query Parameters:
    - prediction_period: Days ahead to predict (default: 30)
    """
    try:
        prediction_period = request.args.get('prediction_period', 30, type=int)
        
        result = AIAnalyticsService.predict_student_performance(
            student_id=student_id,
            prediction_period=prediction_period
        )
        
        if 'error' in result:
            return jsonify({
                'success': False,
                'message': result['error']
            }), 400
        
        return jsonify({
            'success': True,
            'data': result
        }), 200
        
    except Exception as e:
        logger.error(f"Error in predict_student_performance: {str(e)}")
        return jsonify({
            'success': False,
            'message': 'Internal server error'
        }), 500

@ai_analytics_bp.route('/assess/dropout-risk/<int:student_id>', methods=['GET'])
@jwt_required()
@require_permission('view_analytics')
def assess_dropout_risk(student_id):
    """
    Assess student dropout risk using multiple factors.
    """
    try:
        result = AIAnalyticsService.assess_dropout_risk(student_id)
        
        if 'error' in result:
            return jsonify({
                'success': False,
                'message': result['error']
            }), 400
        
        return jsonify({
            'success': True,
            'data': result
        }), 200
        
    except Exception as e:
        logger.error(f"Error in assess_dropout_risk: {str(e)}")
        return jsonify({
            'success': False,
            'message': 'Internal server error'
        }), 500

@ai_analytics_bp.route('/recommendations/<string:user_role>/<int:user_id>', methods=['GET'])
@jwt_required()
@require_permission('view_analytics')
def get_personalized_recommendations(user_role, user_id):
    """
    Get personalized recommendations for students or teachers.
    
    Path Parameters:
    - user_role: 'student' or 'teacher'
    - user_id: ID of the user
    """
    try:
        if user_role not in ['student', 'teacher']:
            return jsonify({
                'success': False,
                'message': 'Invalid user role. Must be "student" or "teacher"'
            }), 400
        
        result = AIAnalyticsService.generate_personalized_recommendations(
            user_id=user_id,
            user_role=user_role
        )
        
        if 'error' in result:
            return jsonify({
                'success': False,
                'message': result['error']
            }), 400
        
        return jsonify({
            'success': True,
            'data': result
        }), 200
        
    except Exception as e:
        logger.error(f"Error in get_personalized_recommendations: {str(e)}")
        return jsonify({
            'success': False,
            'message': 'Internal server error'
        }), 500

@ai_analytics_bp.route('/analyze/class-performance/<int:class_id>', methods=['GET'])
@jwt_required()
@require_permission('view_analytics')
def analyze_class_performance(class_id):
    """
    Analyze class performance patterns and identify trends.
    """
    try:
        result = AIAnalyticsService.analyze_class_performance_patterns(class_id)
        
        if 'error' in result:
            return jsonify({
                'success': False,
                'message': result['error']
            }), 400
        
        return jsonify({
            'success': True,
            'data': result
        }), 200
        
    except Exception as e:
        logger.error(f"Error in analyze_class_performance: {str(e)}")
        return jsonify({
            'success': False,
            'message': 'Internal server error'
        }), 500

@ai_analytics_bp.route('/predict/exam-outcomes/<int:exam_id>', methods=['GET'])
@jwt_required()
@require_permission('view_analytics')
def predict_exam_outcomes(exam_id):
    """
    Predict exam outcomes based on historical performance.
    """
    try:
        result = AIAnalyticsService.predict_exam_outcomes(exam_id)
        
        if 'error' in result:
            return jsonify({
                'success': False,
                'message': result['error']
            }), 400
        
        return jsonify({
            'success': True,
            'data': result
        }), 200
        
    except Exception as e:
        logger.error(f"Error in predict_exam_outcomes: {str(e)}")
        return jsonify({
            'success': False,
            'message': 'Internal server error'
        }), 500

@ai_analytics_bp.route('/batch/risk-assessment', methods=['POST'])
@jwt_required()
@require_permission('manage_analytics')
def batch_risk_assessment():
    """
    Perform batch risk assessment for multiple students.
    
    Request Body:
    {
        "student_ids": [1, 2, 3, ...],
        "assessment_type": "dropout_risk" | "performance_risk"
    }
    """
    try:
        data = request.get_json()
        
        if not data or 'student_ids' not in data:
            return jsonify({
                'success': False,
                'message': 'student_ids is required'
            }), 400
        
        student_ids = data['student_ids']
        assessment_type = data.get('assessment_type', 'dropout_risk')
        
        if not isinstance(student_ids, list) or len(student_ids) == 0:
            return jsonify({
                'success': False,
                'message': 'student_ids must be a non-empty list'
            }), 400
        
        results = []
        
        for student_id in student_ids:
            if assessment_type == 'dropout_risk':
                result = AIAnalyticsService.assess_dropout_risk(student_id)
            else:
                result = AIAnalyticsService.predict_student_performance(student_id)
            
            results.append(result)
        
        return jsonify({
            'success': True,
            'data': {
                'assessment_type': assessment_type,
                'results': results,
                'total_assessed': len(results)
            }
        }), 200
        
    except Exception as e:
        logger.error(f"Error in batch_risk_assessment: {str(e)}")
        return jsonify({
            'success': False,
            'message': 'Internal server error'
        }), 500

@ai_analytics_bp.route('/insights/school-wide', methods=['GET'])
@jwt_required()
@require_permission('view_school_analytics')
def get_school_wide_insights():
    """
    Get AI-powered insights for the entire school.
    
    Query Parameters:
    - period: 'week', 'month', 'term', 'year' (default: 'month')
    - include_predictions: boolean (default: true)
    """
    try:
        period = request.args.get('period', 'month')
        include_predictions = request.args.get('include_predictions', 'true').lower() == 'true'
        
        # This would be implemented to provide school-wide AI insights
        # For now, return a placeholder structure
        
        insights = {
            'period': period,
            'overall_performance_trend': 'improving',
            'risk_summary': {
                'high_risk_students': 12,
                'medium_risk_students': 28,
                'low_risk_students': 145
            },
            'predicted_outcomes': {
                'pass_rate_prediction': 87.5,
                'attendance_trend': 'stable',
                'performance_trend': 'improving'
            } if include_predictions else None,
            'recommendations': [
                {
                    'category': 'Academic Support',
                    'priority': 'high',
                    'title': 'Increase Support for At-Risk Students',
                    'description': '12 students identified as high-risk for dropout',
                    'actions': [
                        'Implement targeted intervention programs',
                        'Increase counseling support',
                        'Engage parents/guardians more actively'
                    ]
                }
            ],
            'generated_at': AIAnalyticsService._get_current_timestamp()
        }
        
        return jsonify({
            'success': True,
            'data': insights
        }), 200
        
    except Exception as e:
        logger.error(f"Error in get_school_wide_insights: {str(e)}")
        return jsonify({
            'success': False,
            'message': 'Internal server error'
        }), 500

# Error handlers
@ai_analytics_bp.errorhandler(404)
def not_found(error):
    return jsonify({
        'success': False,
        'message': 'Endpoint not found'
    }), 404

@ai_analytics_bp.errorhandler(405)
def method_not_allowed(error):
    return jsonify({
        'success': False,
        'message': 'Method not allowed'
    }), 405