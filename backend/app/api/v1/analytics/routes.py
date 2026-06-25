from flask import jsonify, request
from flask_jwt_extended import jwt_required
from sqlalchemy import func

from app.extensions import db
from app.models.attendance import Attendance
from app.models.class_ import Class
from app.models.grade import Grade
from app.models.student import Student
from app.models.subject import Subject
from app.services.enhanced_student_service import EnhancedStudentService

from . import analytics_bp


@analytics_bp.route('/performance-summary', methods=['GET'])
@jwt_required()
def get_performance_summary():
    """Compatibility analytics summary endpoint."""
    try:
        class_id = request.args.get('class_id', type=int)
        summary, error = EnhancedStudentService.get_overall_analytics_summary(class_id=class_id)
        if error:
            return jsonify({'success': False, 'message': error}), 400

        return jsonify({
            'success': True,
            'data': summary,
            'performance_summary': summary,
        }), 200
    except Exception as e:
        return jsonify({'success': False, 'message': f'Error retrieving performance summary: {str(e)}'}), 500


@analytics_bp.route('/subjects/performance', methods=['GET'])
@jwt_required()
def get_subject_performance_analytics():
    """Subject-wise performance analytics compatibility endpoint."""
    try:
        academic_year = request.args.get('academic_year')
        term = request.args.get('term')

        query = db.session.query(
            Subject.id.label('subject_id'),
            Subject.name.label('subject'),
            func.avg(Grade.percentage).label('average_score'),
            func.count(Grade.id).label('grades_count')
        ).join(Grade, Grade.subject_id == Subject.id)

        if academic_year:
            query = query.filter(Grade.academic_year == academic_year)
        if term:
            query = query.filter(Grade.term == term)

        rows = query.group_by(Subject.id, Subject.name).order_by(Subject.name).all()
        subject_analytics = [{
            'subject_id': row.subject_id,
            'subject': row.subject,
            'average_score': float(row.average_score or 0),
            'grades_count': int(row.grades_count or 0),
        } for row in rows]

        return jsonify({
            'success': True,
            'data': subject_analytics,
            'subject_analytics': subject_analytics,
        }), 200
    except Exception as e:
        return jsonify({'success': False, 'message': f'Error retrieving subject analytics: {str(e)}'}), 500


@analytics_bp.route('/classes/<int:class_id>/trends', methods=['GET'])
@jwt_required()
def get_class_performance_trends(class_id):
    """Compatibility class trend endpoint."""
    try:
        trends_query = db.session.query(
            Grade.academic_year.label('academic_year'),
            Grade.term.label('term'),
            func.avg(Grade.percentage).label('average_score'),
            func.count(Grade.id).label('grades_count')
        ).join(Student, Student.id == Grade.student_id).filter(Student.class_id == class_id)

        trends = trends_query.group_by(Grade.academic_year, Grade.term).order_by(Grade.academic_year, Grade.term).all()
        serialized = [{
            'academic_year': row.academic_year,
            'term': row.term,
            'average_score': float(row.average_score or 0),
            'grades_count': int(row.grades_count or 0),
        } for row in trends]

        return jsonify({
            'success': True,
            'data': serialized,
            'trends': serialized,
        }), 200
    except Exception as e:
        return jsonify({'success': False, 'message': f'Error retrieving class trends: {str(e)}'}), 500
