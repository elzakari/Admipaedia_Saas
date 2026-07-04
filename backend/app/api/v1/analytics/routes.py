from flask import jsonify, request
from flask_jwt_extended import jwt_required
from sqlalchemy import func

from app.extensions import db
from app.models.attendance import Attendance
from app.models.class_ import Class
from app.models.grade import Grade
from app.models.grading_system import EnhancedGrade, FinalGrade
from app.models.student import Student
from app.models.subject import Subject
from app.services.enhanced_student_service import EnhancedStudentService

from . import analytics_bp


def _subject_performance_rows(academic_year=None, term=None):
    final_query = db.session.query(
        Subject.id.label('subject_id'),
        Subject.name.label('subject'),
        func.avg(FinalGrade.final_percentage).label('average_score'),
        func.count(FinalGrade.id).label('grades_count')
    ).join(FinalGrade, FinalGrade.subject_id == Subject.id)

    if academic_year:
        final_query = final_query.filter(FinalGrade.academic_year == academic_year)
    if term:
        final_query = final_query.filter(FinalGrade.term == term)

    final_rows = final_query.group_by(Subject.id, Subject.name).order_by(Subject.name).all()
    if final_rows:
        return final_rows

    enhanced_query = db.session.query(
        Subject.id.label('subject_id'),
        Subject.name.label('subject'),
        func.avg(EnhancedGrade.raw_score).label('average_score'),
        func.count(EnhancedGrade.id).label('grades_count')
    ).join(EnhancedGrade, EnhancedGrade.subject_id == Subject.id)

    if academic_year:
        enhanced_query = enhanced_query.filter(EnhancedGrade.academic_year == academic_year)
    if term:
        enhanced_query = enhanced_query.filter(EnhancedGrade.term == term)

    enhanced_rows = enhanced_query.group_by(Subject.id, Subject.name).order_by(Subject.name).all()
    if enhanced_rows:
        return enhanced_rows

    legacy_query = db.session.query(
        Subject.id.label('subject_id'),
        Subject.name.label('subject'),
        func.avg(Grade.percentage).label('average_score'),
        func.count(Grade.id).label('grades_count')
    ).join(Grade, Grade.subject_id == Subject.id)

    if academic_year:
        legacy_query = legacy_query.filter(Grade.academic_year == academic_year)
    if term:
        legacy_query = legacy_query.filter(Grade.term == term)

    return legacy_query.group_by(Subject.id, Subject.name).order_by(Subject.name).all()


def _class_trend_rows(class_id):
    final_query = db.session.query(
        FinalGrade.academic_year.label('academic_year'),
        FinalGrade.term.label('term'),
        func.avg(FinalGrade.final_percentage).label('average_score'),
        func.count(FinalGrade.id).label('grades_count')
    ).filter(FinalGrade.class_id == class_id)

    final_rows = final_query.group_by(FinalGrade.academic_year, FinalGrade.term).order_by(
        FinalGrade.academic_year, FinalGrade.term
    ).all()
    if final_rows:
        return final_rows

    enhanced_query = db.session.query(
        EnhancedGrade.academic_year.label('academic_year'),
        EnhancedGrade.term.label('term'),
        func.avg(EnhancedGrade.raw_score).label('average_score'),
        func.count(EnhancedGrade.id).label('grades_count')
    ).filter(EnhancedGrade.class_id == class_id)

    enhanced_rows = enhanced_query.group_by(EnhancedGrade.academic_year, EnhancedGrade.term).order_by(
        EnhancedGrade.academic_year, EnhancedGrade.term
    ).all()
    if enhanced_rows:
        return enhanced_rows

    return db.session.query(
        Grade.academic_year.label('academic_year'),
        Grade.term.label('term'),
        func.avg(Grade.percentage).label('average_score'),
        func.count(Grade.id).label('grades_count')
    ).join(Student, Student.id == Grade.student_id).filter(Student.class_id == class_id).group_by(
        Grade.academic_year, Grade.term
    ).order_by(Grade.academic_year, Grade.term).all()


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

        rows = _subject_performance_rows(academic_year=academic_year, term=term)
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
        trends = _class_trend_rows(class_id)
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
