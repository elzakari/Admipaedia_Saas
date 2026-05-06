from flask import request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from datetime import datetime
import logging

from app.services.attendance_service import AttendanceService
from app.decorators.auth import role_required
from . import attendance_bp

logger = logging.getLogger(__name__)

@attendance_bp.route('/student/<int:student_id>/report', methods=['GET'])
@jwt_required()
@role_required(['admin', 'teacher', 'student', 'parent'])
def get_student_attendance_report(student_id):
    """Get detailed attendance report for a student."""
    try:
        date_from = request.args.get('date_from')
        date_to = request.args.get('date_to')
        class_id = request.args.get('class_id', type=int)
        subject_id = request.args.get('subject_id', type=int)
        
        # Convert date strings to date objects if provided
        if date_from:
            try:
                date_from = datetime.strptime(date_from, '%Y-%m-%d').date()
            except ValueError:
                return jsonify({'success': False, 'message': 'Invalid date_from format. Use YYYY-MM-DD'}), 400
        
        if date_to:
            try:
                date_to = datetime.strptime(date_to, '%Y-%m-%d').date()
            except ValueError:
                return jsonify({'success': False, 'message': 'Invalid date_to format. Use YYYY-MM-DD'}), 400
        
        report, error = AttendanceService.get_student_attendance_report(
            student_id, date_from, date_to, class_id, subject_id
        )
        
        if error:
            return jsonify({'success': False, 'message': error}), 400
        
        return jsonify({
            'success': True,
            'report': report
        }), 200
    
    except Exception as e:
        logger.error("Error getting student attendance report", error=str(e))
        return jsonify({
            'success': False,
            'message': 'An error occurred while retrieving the attendance report'
        }), 500

@attendance_bp.route('/bulk-mark', methods=['POST'])
@jwt_required()
@role_required(['admin', 'teacher'])
def bulk_mark_attendance():
    """Mark attendance for multiple students in a class at once."""
    try:
        data = request.json
        
        if not data:
            return jsonify({'success': False, 'message': 'No data provided'}), 400
        
        class_id = data.get('class_id')
        date = data.get('date')
        attendances = data.get('attendances', [])
        
        # Get current user ID for recording
        current_user_id = get_jwt_identity()
        
        result, error = AttendanceService.bulk_mark_attendance(
            class_id, date, attendances, recorded_by=current_user_id
        )
        
        if error:
            return jsonify({'success': False, 'message': error}), 400
        
        return jsonify({
            'success': True,
            'message': f"Attendance marked successfully. {result['created']} created, {result['updated']} updated.",
            'result': result
        }), 200
    
    except Exception as e:
        logger.error("Error in bulk mark attendance", error=str(e))
        return jsonify({
            'success': False,
            'message': 'An error occurred while marking attendance'
        }), 500

@attendance_bp.route('/analytics', methods=['GET'])
@jwt_required()
@role_required(['admin', 'teacher'])
def get_attendance_analytics():
    """Get advanced attendance analytics."""
    try:
        class_id = request.args.get('class_id', type=int)
        date_from = request.args.get('date_from')
        date_to = request.args.get('date_to')
        
        # Convert date strings to date objects if provided
        if date_from:
            try:
                date_from = datetime.strptime(date_from, '%Y-%m-%d').date()
            except ValueError:
                return jsonify({'success': False, 'message': 'Invalid date_from format. Use YYYY-MM-DD'}), 400
                
        if date_to:
            try:
                date_to = datetime.strptime(date_to, '%Y-%m-%d').date()
            except ValueError:
                return jsonify({'success': False, 'message': 'Invalid date_to format. Use YYYY-MM-DD'}), 400
                
        analytics, error = AttendanceService.get_advanced_attendance_analytics(
            class_id=class_id,
            date_from=date_from,
            date_to=date_to
        )
        
        if error:
            return jsonify({'success': False, 'message': error}), 400
            
        return jsonify({
            'success': True,
            'data': analytics,
            'message': 'Attendance analytics generated successfully'
        }), 200
        
    except Exception as e:
        logger.error("Error generating attendance analytics", error=str(e))
        return jsonify({
            'success': False,
            'message': 'An error occurred while generating attendance analytics'
        }), 500