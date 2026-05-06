from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required, get_jwt_identity
from app.services.enhanced_academic_analytics_service import EnhancedAcademicAnalyticsService
from app.services.auth_service import AuthService
from app.utils.decorators import role_required
from datetime import datetime, timedelta
import logging

logger = logging.getLogger(__name__)

enhanced_dashboard_bp = Blueprint('enhanced_dashboard', __name__)

@enhanced_dashboard_bp.route('/analytics', methods=['GET'])
@jwt_required()
def get_comprehensive_analytics():
    """Get comprehensive dashboard analytics based on user role."""
    try:
        user_id = get_jwt_identity()
        user = AuthService.get_user_by_id(user_id)
        
        if not user:
            return jsonify({'error': 'User not found'}), 404

        # Get user's primary role
        user_role = user.roles[0].name if user.roles else 'student'
        
        # Get query parameters
        date_from = request.args.get('date_from')
        date_to = request.args.get('date_to')
        class_id = request.args.get('class_id', type=int)
        subject_id = request.args.get('subject_id', type=int)
        
        # Default to current academic year if no dates provided
        if not date_from:
            date_from = (datetime.now() - timedelta(days=365)).strftime('%Y-%m-%d')
        if not date_to:
            date_to = datetime.now().strftime('%Y-%m-%d')

        analytics = EnhancedAcademicAnalyticsService.get_comprehensive_dashboard_analytics(
            user_id=user_id,
            user_role=user_role,
            date_from=date_from,
            date_to=date_to,
            class_id=class_id,
            subject_id=subject_id
        )

        return jsonify(analytics)

    except Exception as e:
        logger.error(f"Error getting comprehensive analytics: {str(e)}")
        return jsonify({'error': 'Failed to retrieve analytics'}), 500

@enhanced_dashboard_bp.route('/analytics/admin', methods=['GET'])
@jwt_required()
@role_required(['admin'])
def get_admin_analytics():
    """Get detailed admin analytics."""
    try:
        date_from = request.args.get('date_from')
        date_to = request.args.get('date_to')
        class_id = request.args.get('class_id', type=int)
        subject_id = request.args.get('subject_id', type=int)
        
        # Default to current academic year
        if not date_from:
            date_from = (datetime.now() - timedelta(days=365)).strftime('%Y-%m-%d')
        if not date_to:
            date_to = datetime.now().strftime('%Y-%m-%d')

        analytics = EnhancedAcademicAnalyticsService._get_admin_analytics(
            date_from=datetime.strptime(date_from, '%Y-%m-%d'),
            date_to=datetime.strptime(date_to, '%Y-%m-%d'),
            class_id=class_id,
            subject_id=subject_id
        )

        return jsonify(analytics)

    except Exception as e:
        logger.error(f"Error getting admin analytics: {str(e)}")
        return jsonify({'error': 'Failed to retrieve admin analytics'}), 500

@enhanced_dashboard_bp.route('/analytics/teacher', methods=['GET'])
@jwt_required()
@role_required(['teacher', 'admin'])
def get_teacher_analytics():
    """Get detailed teacher analytics."""
    try:
        user_id = get_jwt_identity()
        teacher_id = request.args.get('teacher_id', type=int)
        
        # If teacher_id is provided and user is admin, use that; otherwise use current user
        if teacher_id and request.args.get('role') == 'admin':
            target_user_id = teacher_id
        else:
            target_user_id = user_id

        date_from = request.args.get('date_from')
        date_to = request.args.get('date_to')
        class_id = request.args.get('class_id', type=int)
        subject_id = request.args.get('subject_id', type=int)
        
        # Default to current academic year
        if not date_from:
            date_from = (datetime.now() - timedelta(days=365)).strftime('%Y-%m-%d')
        if not date_to:
            date_to = datetime.now().strftime('%Y-%m-%d')

        analytics = EnhancedAcademicAnalyticsService._get_teacher_analytics(
            user_id=target_user_id,
            date_from=datetime.strptime(date_from, '%Y-%m-%d'),
            date_to=datetime.strptime(date_to, '%Y-%m-%d'),
            class_id=class_id,
            subject_id=subject_id
        )

        return jsonify(analytics)

    except Exception as e:
        logger.error(f"Error getting teacher analytics: {str(e)}")
        return jsonify({'error': 'Failed to retrieve teacher analytics'}), 500

@enhanced_dashboard_bp.route('/analytics/student', methods=['GET'])
@jwt_required()
def get_student_analytics():
    """Get detailed student analytics."""
    try:
        user_id = get_jwt_identity()
        student_id = request.args.get('student_id', type=int)
        
        # If student_id is provided and user has permission, use that; otherwise use current user
        target_user_id = student_id if student_id else user_id

        date_from = request.args.get('date_from')
        date_to = request.args.get('date_to')
        
        # Default to current academic year
        if not date_from:
            date_from = (datetime.now() - timedelta(days=365)).strftime('%Y-%m-%d')
        if not date_to:
            date_to = datetime.now().strftime('%Y-%m-%d')

        analytics = EnhancedAcademicAnalyticsService._get_student_analytics(
            user_id=target_user_id,
            date_from=datetime.strptime(date_from, '%Y-%m-%d'),
            date_to=datetime.strptime(date_to, '%Y-%m-%d')
        )

        return jsonify(analytics)

    except Exception as e:
        logger.error(f"Error getting student analytics: {str(e)}")
        return jsonify({'error': 'Failed to retrieve student analytics'}), 500

@enhanced_dashboard_bp.route('/analytics/parent', methods=['GET'])
@jwt_required()
@role_required(['parent'])
def get_parent_analytics():
    """Get detailed parent analytics."""
    try:
        user_id = get_jwt_identity()
        date_from = request.args.get('date_from')
        date_to = request.args.get('date_to')
        
        # Default to current academic year
        if not date_from:
            date_from = (datetime.now() - timedelta(days=365)).strftime('%Y-%m-%d')
        if not date_to:
            date_to = datetime.now().strftime('%Y-%m-%d')

        analytics = EnhancedAcademicAnalyticsService._get_parent_analytics(
            user_id=user_id,
            date_from=datetime.strptime(date_from, '%Y-%m-%d'),
            date_to=datetime.strptime(date_to, '%Y-%m-%d')
        )

        return jsonify(analytics)

    except Exception as e:
        logger.error(f"Error getting parent analytics: {str(e)}")
        return jsonify({'error': 'Failed to retrieve parent analytics'}), 500

@enhanced_dashboard_bp.route('/analytics/performance-trends', methods=['GET'])
@jwt_required()
def get_performance_trends():
    """Get performance trends for charts and visualizations."""
    try:
        user_id = get_jwt_identity()
        user = AuthService.get_user_by_id(user_id)
        user_role = user.roles[0].name if user.roles else 'student'
        
        date_from = request.args.get('date_from')
        date_to = request.args.get('date_to')
        class_id = request.args.get('class_id', type=int)
        subject_id = request.args.get('subject_id', type=int)
        
        # Default to last 6 months for trends
        if not date_from:
            date_from = (datetime.now() - timedelta(days=180)).strftime('%Y-%m-%d')
        if not date_to:
            date_to = datetime.now().strftime('%Y-%m-%d')

        # Get comprehensive analytics and extract trend data
        analytics = EnhancedAcademicAnalyticsService.get_comprehensive_dashboard_analytics(
            user_id=user_id,
            user_role=user_role,
            date_from=date_from,
            date_to=date_to,
            class_id=class_id,
            subject_id=subject_id
        )

        # Extract trend-specific data based on role
        trends = {}
        if user_role == 'admin':
            trends = {
                'performance_trends': analytics.get('performance_overview', {}).get('trends', []),
                'attendance_trends': analytics.get('attendance_analytics', {}).get('daily_trends', []),
                'grade_distribution_trends': analytics.get('grade_distribution', {}).get('monthly_trends', [])
            }
        elif user_role == 'teacher':
            trends = {
                'class_performance_trends': analytics.get('class_performance', {}).get('trends', []),
                'student_progress_trends': analytics.get('student_progress', [])
            }
        elif user_role == 'student':
            trends = {
                'performance_trend': analytics.get('performance_trend', []),
                'subject_trends': [
                    {
                        'subject': subject['subject_name'],
                        'trend': subject['trend'],
                        'scores': subject.get('scores', [])
                    }
                    for subject in analytics.get('subject_performance', [])
                ]
            }

        return jsonify(trends)

    except Exception as e:
        logger.error(f"Error getting performance trends: {str(e)}")
        return jsonify({'error': 'Failed to retrieve performance trends'}), 500

@enhanced_dashboard_bp.route('/analytics/export', methods=['GET'])
@jwt_required()
def export_analytics():
    """Export analytics data in various formats."""
    try:
        user_id = get_jwt_identity()
        user = AuthService.get_user_by_id(user_id)
        user_role = user.roles[0].name if user.roles else 'student'
        
        export_format = request.args.get('format', 'json')  # json, csv, pdf
        date_from = request.args.get('date_from')
        date_to = request.args.get('date_to')
        
        # Default to current academic year
        if not date_from:
            date_from = (datetime.now() - timedelta(days=365)).strftime('%Y-%m-%d')
        if not date_to:
            date_to = datetime.now().strftime('%Y-%m-%d')

        analytics = EnhancedAcademicAnalyticsService.get_comprehensive_dashboard_analytics(
            user_id=user_id,
            user_role=user_role,
            date_from=date_from,
            date_to=date_to
        )

        if export_format == 'json':
            return jsonify(analytics)
        elif export_format == 'csv':
            # Convert to CSV format (simplified)
            import csv
            import io
            output = io.StringIO()
            
            # This is a simplified CSV export - you might want to expand this
            writer = csv.writer(output)
            writer.writerow(['Metric', 'Value'])
            
            def flatten_dict(d, parent_key='', sep='_'):
                items = []
                for k, v in d.items():
                    new_key = f"{parent_key}{sep}{k}" if parent_key else k
                    if isinstance(v, dict):
                        items.extend(flatten_dict(v, new_key, sep=sep).items())
                    else:
                        items.append((new_key, v))
                return dict(items)
            
            flat_data = flatten_dict(analytics)
            for key, value in flat_data.items():
                writer.writerow([key, value])
            
            output.seek(0)
            return output.getvalue(), 200, {
                'Content-Type': 'text/csv',
                'Content-Disposition': f'attachment; filename=analytics_{date_from}_{date_to}.csv'
            }
        else:
            return jsonify({'error': 'Unsupported export format'}), 400

    except Exception as e:
        logger.error(f"Error exporting analytics: {str(e)}")
        return jsonify({'error': 'Failed to export analytics'}), 500