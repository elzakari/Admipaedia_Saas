"""
AI Analytics API Routes for ADMIPAEDIA
Provides endpoints for AI-powered predictions, risk assessment, and insights
"""

from flask import Blueprint, request, jsonify, current_app
from flask_jwt_extended import jwt_required, get_jwt_identity
from datetime import datetime, timedelta
from typing import Dict, List, Any
import logging

from app.services.ai_analytics_service import AIAnalyticsService
from app.utils.rbac_decorators import require_permission
from app.utils.response import success_response, error_response

logger = logging.getLogger(__name__)

ai_analytics_bp = Blueprint('ai_analytics', __name__)

@ai_analytics_bp.route('/predictions/student/<int:student_id>', methods=['GET'])
@jwt_required()
@require_permission('view_analytics')
def get_student_performance_prediction(student_id: int):
    """Get AI-powered performance predictions for a specific student."""
    try:
        prediction_period = request.args.get('period', 30, type=int)
        subject_id = request.args.get('subject_id', type=int)
        
        prediction_data = AIAnalyticsService.predict_student_performance(
            student_id=student_id,
            prediction_period=prediction_period,
            subject_id=subject_id
        )
        
        return success_response(
            data=prediction_data,
            message="Student performance prediction generated successfully"
        )
        
    except Exception as e:
        logger.error(f"Error generating student prediction: {str(e)}")
        return error_response(
            message="Failed to generate performance prediction",
            details=str(e)
        )

@ai_analytics_bp.route('/risk-assessment/student/<int:student_id>', methods=['GET'])
@jwt_required()
@require_permission('view_analytics')
def get_student_risk_assessment(student_id: int):
    """Get comprehensive risk assessment for a student."""
    try:
        assessment_data = AIAnalyticsService.assess_student_risk(student_id)
        
        return success_response(
            data=assessment_data,
            message="Risk assessment completed successfully"
        )
        
    except Exception as e:
        logger.error(f"Error generating risk assessment: {str(e)}")
        return error_response(
            message="Failed to generate risk assessment",
            details=str(e)
        )

@ai_analytics_bp.route('/predictions/class/<int:class_id>', methods=['GET'])
@jwt_required()
@require_permission('view_analytics')
def get_class_performance_predictions(class_id: int):
    """Get AI predictions for entire class performance."""
    try:
        prediction_period = request.args.get('period', 30, type=int)
        subject_id = request.args.get('subject_id', type=int)
        
        predictions = AIAnalyticsService.predict_class_performance(
            class_id=class_id,
            prediction_period=prediction_period,
            subject_id=subject_id
        )
        
        return success_response(
            data=predictions,
            message="Class performance predictions generated successfully"
        )
        
    except Exception as e:
        logger.error(f"Error generating class predictions: {str(e)}")
        return error_response(
            message="Failed to generate class predictions",
            details=str(e)
        )

@ai_analytics_bp.route('/insights/school-wide', methods=['GET'])
@jwt_required()
@require_permission('view_school_analytics')
def get_school_wide_insights():
    """Get comprehensive school-wide AI insights."""
    try:
        date_from = request.args.get('date_from')
        date_to = request.args.get('date_to')
        
        if date_from:
            date_from = datetime.fromisoformat(date_from)
        if date_to:
            date_to = datetime.fromisoformat(date_to)
            
        insights = AIAnalyticsService.generate_school_insights(
            date_from=date_from,
            date_to=date_to
        )
        
        return success_response(
            data=insights,
            message="School-wide insights generated successfully"
        )
        
    except Exception as e:
        logger.error(f"Error generating school insights: {str(e)}")
        return error_response(
            message="Failed to generate school insights",
            details=str(e)
        )

@ai_analytics_bp.route('/recommendations/student/<int:student_id>', methods=['GET'])
@jwt_required()
@require_permission('view_analytics')
def get_ai_recommendations(student_id: int):
    """Get AI-generated recommendations for student improvement."""
    try:
        recommendation_type = request.args.get('type', 'all')  # academic, behavioral, attendance, all
        
        recommendations = AIAnalyticsService.generate_student_recommendations(
            student_id=student_id,
            recommendation_type=recommendation_type
        )
        
        return success_response(
            data=recommendations,
            message="AI recommendations generated successfully"
        )
        
    except Exception as e:
        logger.error(f"Error generating recommendations: {str(e)}")
        return error_response(
            message="Failed to generate recommendations",
            details=str(e)
        )

@ai_analytics_bp.route('/patterns/attendance', methods=['GET'])
@jwt_required()
@require_permission('view_analytics')
def analyze_attendance_patterns():
    """Analyze attendance patterns using AI."""
    try:
        class_id = request.args.get('class_id', type=int)
        student_id = request.args.get('student_id', type=int)
        period_days = request.args.get('period', 90, type=int)
        
        patterns = AIAnalyticsService.analyze_attendance_patterns(
            class_id=class_id,
            student_id=student_id,
            period_days=period_days
        )
        
        return success_response(
            data=patterns,
            message="Attendance patterns analyzed successfully"
        )
        
    except Exception as e:
        logger.error(f"Error analyzing attendance patterns: {str(e)}")
        return error_response(
            message="Failed to analyze attendance patterns",
            details=str(e)
        )

@ai_analytics_bp.route('/anomalies/detection', methods=['GET'])
@jwt_required()
@require_permission('view_analytics')
def detect_performance_anomalies():
    """Detect performance anomalies using machine learning."""
    try:
        class_id = request.args.get('class_id', type=int)
        subject_id = request.args.get('subject_id', type=int)
        sensitivity = request.args.get('sensitivity', 0.1, type=float)
        
        anomalies = AIAnalyticsService.detect_performance_anomalies(
            class_id=class_id,
            subject_id=subject_id,
            sensitivity=sensitivity
        )
        
        return success_response(
            data=anomalies,
            message="Performance anomalies detected successfully"
        )
        
    except Exception as e:
        logger.error(f"Error detecting anomalies: {str(e)}")
        return error_response(
            message="Failed to detect anomalies",
            details=str(e)
        )

@ai_analytics_bp.route('/forecasting/enrollment', methods=['GET'])
@jwt_required()
@require_permission('view_school_analytics')
def forecast_enrollment():
    """Forecast future enrollment trends."""
    try:
        forecast_months = request.args.get('months', 12, type=int)
        
        forecast_data = AIAnalyticsService.forecast_enrollment_trends(
            forecast_months=forecast_months
        )
        
        return success_response(
            data=forecast_data,
            message="Enrollment forecast generated successfully"
        )
        
    except Exception as e:
        logger.error(f"Error forecasting enrollment: {str(e)}")
        return error_response(
            message="Failed to forecast enrollment",
            details=str(e)
        )

@ai_analytics_bp.route('/optimization/resource-allocation', methods=['GET'])
@jwt_required()
@require_permission('manage_resources')
def optimize_resource_allocation():
    """Get AI-powered resource allocation recommendations."""
    try:
        resource_type = request.args.get('type', 'all')  # teachers, classrooms, materials, all
        
        optimization = AIAnalyticsService.optimize_resource_allocation(
            resource_type=resource_type
        )
        
        return success_response(
            data=optimization,
            message="Resource allocation optimization completed"
        )
        
    except Exception as e:
        logger.error(f"Error optimizing resources: {str(e)}")
        return error_response(
            message="Failed to optimize resource allocation",
            details=str(e)
        )

@ai_analytics_bp.route('/insights/teacher-performance', methods=['GET'])
@jwt_required()
@require_permission('view_teacher_analytics')
def analyze_teacher_performance():
    """Analyze teacher performance using AI insights."""
    try:
        teacher_id = request.args.get('teacher_id', type=int)
        analysis_period = request.args.get('period', 90, type=int)
        
        analysis = AIAnalyticsService.analyze_teacher_performance(
            teacher_id=teacher_id,
            analysis_period=analysis_period
        )
        
        return success_response(
            data=analysis,
            message="Teacher performance analysis completed"
        )
        
    except Exception as e:
        logger.error(f"Error analyzing teacher performance: {str(e)}")
        return error_response(
            message="Failed to analyze teacher performance",
            details=str(e)
        )

@ai_analytics_bp.route('/predictions/batch', methods=['POST'])
@jwt_required()
@require_permission('view_analytics')
def batch_predictions():
    """Generate batch predictions for multiple students or classes."""
    try:
        data = request.get_json()
        
        if not data:
            return error_response(message="Request data is required")
        
        prediction_type = data.get('type')  # student, class, school
        entity_ids = data.get('entity_ids', [])
        prediction_period = data.get('period', 30)
        
        if not entity_ids:
            return error_response(message="Entity IDs are required")
        
        batch_results = AIAnalyticsService.generate_batch_predictions(
            prediction_type=prediction_type,
            entity_ids=entity_ids,
            prediction_period=prediction_period
        )
        
        return success_response(
            data=batch_results,
            message="Batch predictions generated successfully"
        )
        
    except Exception as e:
        logger.error(f"Error generating batch predictions: {str(e)}")
        return error_response(
            message="Failed to generate batch predictions",
            details=str(e)
        )

@ai_analytics_bp.route('/model/retrain', methods=['POST'])
@jwt_required()
@require_permission('manage_ai_models')
def retrain_ai_models():
    """Retrain AI models with latest data."""
    try:
        data = request.get_json()
        model_type = data.get('model_type', 'all') if data else 'all'
        
        retrain_results = AIAnalyticsService.retrain_models(model_type=model_type)
        
        return success_response(
            data=retrain_results,
            message="AI models retrained successfully"
        )
        
    except Exception as e:
        logger.error(f"Error retraining models: {str(e)}")
        return error_response(
            message="Failed to retrain AI models",
            details=str(e)
        )

@ai_analytics_bp.route('/dashboard/ai-summary', methods=['GET'])
@jwt_required()
@require_permission('view_analytics')
def get_ai_dashboard_summary():
    """Get comprehensive AI analytics summary for dashboard."""
    try:
        user_role = request.args.get('role', 'admin')
        class_id = request.args.get('class_id', type=int)
        
        summary = AIAnalyticsService.generate_dashboard_summary(
            user_role=user_role,
            class_id=class_id
        )
        
        return success_response(
            data=summary,
            message="AI dashboard summary generated successfully"
        )
        
    except Exception as e:
        logger.error(f"Error generating AI summary: {str(e)}")
        return error_response(
            message="Failed to generate AI dashboard summary",
            details=str(e)
        )

# Error handlers
@ai_analytics_bp.errorhandler(404)
def not_found(error):
    return error_response(message="AI Analytics endpoint not found", status_code=404)

@ai_analytics_bp.errorhandler(500)
def internal_error(error):
    return error_response(message="Internal server error in AI Analytics", status_code=500)