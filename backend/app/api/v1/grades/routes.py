from flask import Blueprint, request, jsonify
from app.services.grading.service import GradingService
from flask_jwt_extended import jwt_required, get_jwt_identity
from app.utils.rbac_decorators import require_permission, require_role
from app.extensions import db
from app.models.exam import Exam
from app.models.grade import Grade
from app.models.grading_system import EnhancedGrade, FinalGrade
from app.models.student import Student
from app.models.subject import Subject
from app.models.user import User
from app.schemas.grade import GradeSchema
from app.services.identity_resolver import IdentityResolver

grades_bp = Blueprint('grades', __name__)

grade_schema = GradeSchema()
grades_schema = GradeSchema(many=True)


@grades_bp.route('/bulk', methods=['POST'])
@jwt_required()
@require_role(['admin', 'school_admin', 'super_admin', 'teacher'])
def bulk_enter_exam_grades():
    user_id = get_jwt_identity()
    payload = request.get_json() or {}
    exam_id = payload.get('exam_id')
    grades = payload.get('grades')

    if not exam_id or not isinstance(grades, list):
        return jsonify({'success': False, 'message': 'exam_id and grades[] are required'}), 400

    exam = Exam.query.get(exam_id)
    if not exam:
        return jsonify({'success': False, 'message': 'Exam not found'}), 404

    current_user = User.query.get(user_id)
    if not current_user:
        return jsonify({'success': False, 'message': 'User not found'}), 404

    if current_user.role == 'teacher' and not IdentityResolver.can_user_access_class(current_user.id, exam.class_id):
        return jsonify({'success': False, 'message': 'Insufficient permissions for this class context'}), 403

    saved = []
    for item in grades:
        try:
            student_id = int(item.get('student_id'))
            marks_obtained = float(item.get('marks_obtained'))
            remarks = item.get('remarks')
        except Exception:
            continue

        if marks_obtained < 0 or marks_obtained > float(exam.total_marks or 0):
            continue

        student = Student.query.get(student_id)
        if not student:
            continue

        percentage = round((marks_obtained / float(exam.total_marks)) * 100, 2) if float(exam.total_marks or 0) > 0 else 0

        if percentage >= 90:
            grade_letter = 'A+'
        elif percentage >= 80:
            grade_letter = 'A'
        elif percentage >= 75:
            grade_letter = 'B+'
        elif percentage >= 70:
            grade_letter = 'B'
        elif percentage >= 65:
            grade_letter = 'C+'
        elif percentage >= 60:
            grade_letter = 'C'
        elif percentage >= 55:
            grade_letter = 'D+'
        elif percentage >= 50:
            grade_letter = 'D'
        elif percentage >= 45:
            grade_letter = 'E'
        else:
            grade_letter = 'F'

        grade = Grade.query.filter_by(exam_id=exam.id, student_id=student_id).first()
        if not grade:
            grade = Grade(
                student_id=student_id,
                exam_id=exam.id,
                marks_obtained=marks_obtained,
                percentage=percentage,
                grade_letter=grade_letter,
                remarks=remarks,
                graded_by=user_id,
                subject_id=exam.subject_id,
                class_id=exam.class_id,
                assessment_type='exam'
            )
            db.session.add(grade)
        else:
            grade.marks_obtained = marks_obtained
            grade.percentage = percentage
            grade.grade_letter = grade_letter
            grade.remarks = remarks
            grade.graded_by = user_id
            if grade.subject_id is None:
                grade.subject_id = exam.subject_id
            if grade.class_id is None:
                grade.class_id = exam.class_id
            if grade.assessment_type is None:
                grade.assessment_type = 'exam'

        saved.append(grade)

    db.session.commit()
    return jsonify({'success': True, 'grades': grades_schema.dump(saved), 'message': 'Grades saved successfully'}), 200

@grades_bp.route('/gradebook', methods=['GET'])
@jwt_required()
@require_role(['admin', 'school_admin', 'super_admin', 'teacher'])
def get_gradebook():
    """Get the gradebook for a class/subject."""
    user_id = get_jwt_identity()
    class_id = request.args.get('class_id', type=int)
    subject_id = request.args.get('subject_id', type=int)
    term = request.args.get('term')
    academic_year = request.args.get('academic_year')
    
    if not all([class_id, subject_id, term, academic_year]):
        return jsonify({'success': False, 'message': 'Missing required parameters'}), 400

    current_user = User.query.get(user_id)
    if not current_user:
        return jsonify({'success': False, 'message': 'User not found'}), 404
    if current_user.role == 'teacher' and not IdentityResolver.can_user_access_class(current_user.id, class_id):
        return jsonify({'success': False, 'message': 'Insufficient permissions for this class context'}), 403
        
    gradebook, error = GradingService.get_gradebook(class_id, subject_id, term, academic_year)
    
    if error:
        return jsonify({'success': False, 'message': error}), 400
        
    return jsonify({'success': True, 'data': gradebook}), 200

@grades_bp.route('/entry', methods=['POST'])
@jwt_required()
@require_role(['admin', 'school_admin', 'super_admin', 'teacher'])
def enter_grades():
    """Enter grades (single or bulk)."""
    user_id = get_jwt_identity()
    data = request.json

    current_user = User.query.get(user_id)
    if not current_user:
        return jsonify({'success': False, 'message': 'User not found'}), 404

    payload_items = data if isinstance(data, list) else [data]
    class_ids = {item.get('class_id') for item in payload_items if isinstance(item, dict) and item.get('class_id')}
    if not class_ids:
        return jsonify({'success': False, 'message': 'class_id is required for grade entry'}), 400
    if len(class_ids) > 1:
        return jsonify({'success': False, 'message': 'All grades in a single request must belong to one class'}), 400

    class_id = next(iter(class_ids))
    if current_user.role == 'teacher' and not IdentityResolver.can_user_access_class(current_user.id, class_id):
        return jsonify({'success': False, 'message': 'Insufficient permissions for this class context'}), 403
    
    if isinstance(data, list):
        grades, error = GradingService.bulk_enter_grades(data)
    else:
        grade, error = GradingService.enter_grade(data)
        grades = [grade] if grade else []
        
    if error:
        return jsonify({'success': False, 'message': error}), 400
        
    return jsonify({'success': True, 'message': 'Grades saved successfully'}), 200

@grades_bp.route('/calculate-final', methods=['POST'])
@jwt_required()
@require_role(['admin', 'school_admin', 'super_admin', 'teacher'])
def calculate_final_grades():
    """Trigger calculation of final grades."""
    user_id = get_jwt_identity()
    data = request.json
    class_id = data.get('class_id')
    subject_id = data.get('subject_id')
    term = data.get('term')
    academic_year = data.get('academic_year')

    current_user = User.query.get(user_id)
    if not current_user:
        return jsonify({'success': False, 'message': 'User not found'}), 404
    if current_user.role == 'teacher' and not IdentityResolver.can_user_access_class(current_user.id, class_id):
        return jsonify({'success': False, 'message': 'Insufficient permissions for this class context'}), 403
    
    success, error = GradingService.calculate_final_grades(class_id, subject_id, term, academic_year)
    
    if error:
        return jsonify({'success': False, 'message': error}), 400
        
    return jsonify({'success': True, 'message': 'Final grades calculated successfully'}), 200

@grades_bp.route('/broadsheet', methods=['GET'])
@jwt_required()
@require_permission('grade.reports')
def get_broadsheet():
    """Get class broadsheet."""
    class_id = request.args.get('class_id', type=int)
    term = request.args.get('term')
    academic_year = request.args.get('academic_year')
    
    data, error = GradingService.generate_broadsheet(class_id, term, academic_year)
    
    if error:
        return jsonify({'success': False, 'message': error}), 400
        
    return jsonify({'success': True, 'data': data}), 200


@grades_bp.route('/analytics/class/<int:class_id>', methods=['GET'])
@jwt_required()
@require_role(['admin', 'school_admin', 'super_admin', 'teacher'])
def get_class_grade_analytics(class_id):
    """Legacy compatibility endpoint for class grade analytics."""
    subject_id = request.args.get('subject_id', type=int)
    term = request.args.get('term')
    academic_year = request.args.get('academic_year')

    current_user = User.query.get(get_jwt_identity())
    if not current_user:
        return jsonify({'success': False, 'message': 'User not found'}), 404
    if current_user.role == 'teacher' and not IdentityResolver.can_user_access_class(current_user.id, class_id):
        return jsonify({'success': False, 'message': 'Insufficient permissions for this class context'}), 403

    def _empty():
        analytics = {
            'class_id': class_id,
            'subject_id': subject_id,
            'term': term,
            'academic_year': academic_year,
            'class_average': 0.0,
            'grade_distribution': {},
            'performance_trends': [],
            'total_grades': 0,
        }
        return jsonify({'success': True, 'analytics': analytics}), 200

    final_query = FinalGrade.query.filter(FinalGrade.class_id == class_id)
    if subject_id:
        final_query = final_query.filter(FinalGrade.subject_id == subject_id)
    if term:
        final_query = final_query.filter(FinalGrade.term == term)
    if academic_year:
        final_query = final_query.filter(FinalGrade.academic_year == academic_year)

    final_grades = final_query.order_by(FinalGrade.computed_at.asc(), FinalGrade.id.asc()).all()
    if final_grades:
        distribution = {}
        for grade in final_grades:
            symbol = grade.final_grade_symbol or 'N/A'
            distribution[symbol] = distribution.get(symbol, 0) + 1

        running_total = 0.0
        trends = []
        for index, grade in enumerate(final_grades, start=1):
            running_total += float(grade.final_percentage or 0)
            trends.append({
                'assessment_index': index,
                'average_score': round(running_total / index, 2),
                'grade_id': grade.id,
            })

        analytics = {
            'class_id': class_id,
            'subject_id': subject_id,
            'term': term,
            'academic_year': academic_year,
            'class_average': round(sum(float(grade.final_percentage or 0) for grade in final_grades) / len(final_grades), 2),
            'grade_distribution': distribution,
            'performance_trends': trends,
            'total_grades': len(final_grades),
        }
        return jsonify({'success': True, 'analytics': analytics}), 200

    enhanced_query = EnhancedGrade.query.filter(EnhancedGrade.class_id == class_id)
    if subject_id:
        enhanced_query = enhanced_query.filter(EnhancedGrade.subject_id == subject_id)
    if term:
        enhanced_query = enhanced_query.filter(EnhancedGrade.term == term)
    if academic_year:
        enhanced_query = enhanced_query.filter(EnhancedGrade.academic_year == academic_year)

    enhanced_grades = enhanced_query.order_by(EnhancedGrade.assessment_date.asc(), EnhancedGrade.id.asc()).all()
    if enhanced_grades:
        distribution = {}
        for grade in enhanced_grades:
            symbol = grade.grade_symbol or 'N/A'
            distribution[symbol] = distribution.get(symbol, 0) + 1

        running_total = 0.0
        trends = []
        for index, grade in enumerate(enhanced_grades, start=1):
            running_total += float(grade.raw_score or 0)
            trends.append({
                'assessment_index': index,
                'average_score': round(running_total / index, 2),
                'grade_id': grade.id,
            })

        analytics = {
            'class_id': class_id,
            'subject_id': subject_id,
            'term': term,
            'academic_year': academic_year,
            'class_average': round(sum(float(grade.raw_score or 0) for grade in enhanced_grades) / len(enhanced_grades), 2),
            'grade_distribution': distribution,
            'performance_trends': trends,
            'total_grades': len(enhanced_grades),
        }
        return jsonify({'success': True, 'analytics': analytics}), 200

    query = Grade.query.filter(Grade.class_id == class_id)
    if subject_id:
        query = query.filter(Grade.subject_id == subject_id)
    if term:
        query = query.filter(Grade.term == term)
    if academic_year:
        query = query.filter(Grade.academic_year == academic_year)

    grades = query.order_by(Grade.created_at.asc(), Grade.id.asc()).all()

    if not grades:
        return _empty()

    def _grade_symbol(percentage):
        if percentage >= 90:
            return 'A+'
        if percentage >= 80:
            return 'A'
        if percentage >= 75:
            return 'B+'
        if percentage >= 70:
            return 'B'
        if percentage >= 65:
            return 'C+'
        if percentage >= 60:
            return 'C'
        return 'F'

    distribution = {}
    for grade in grades:
        symbol = grade.grade_letter or _grade_symbol(float(grade.percentage or 0))
        distribution[symbol] = distribution.get(symbol, 0) + 1

    running_total = 0.0
    trends = []
    for index, grade in enumerate(grades, start=1):
        running_total += float(grade.percentage or 0)
        trends.append({
            'assessment_index': index,
            'average_score': round(running_total / index, 2),
            'grade_id': grade.id,
        })

    analytics = {
        'class_id': class_id,
        'subject_id': subject_id,
        'term': term,
        'academic_year': academic_year,
        'class_average': round(sum(float(grade.percentage or 0) for grade in grades) / len(grades), 2),
        'grade_distribution': distribution,
        'performance_trends': trends,
        'total_grades': len(grades),
    }
    return jsonify({'success': True, 'analytics': analytics}), 200
