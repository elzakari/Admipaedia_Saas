from flask import Blueprint, request, jsonify
from app.services.grading.service import GradingService
from flask_jwt_extended import jwt_required, get_jwt_identity
from app.utils.rbac_decorators import require_permission, require_role
from app.extensions import db
from app.models.exam import Exam
from app.models.grade import Grade
from app.models.student import Student
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
@require_permission('grade.read')
def get_gradebook():
    """Get the gradebook for a class/subject."""
    class_id = request.args.get('class_id', type=int)
    subject_id = request.args.get('subject_id', type=int)
    term = request.args.get('term')
    academic_year = request.args.get('academic_year')
    
    if not all([class_id, subject_id, term, academic_year]):
        return jsonify({'success': False, 'message': 'Missing required parameters'}), 400
        
    gradebook, error = GradingService.get_gradebook(class_id, subject_id, term, academic_year)
    
    if error:
        return jsonify({'success': False, 'message': error}), 400
        
    return jsonify({'success': True, 'data': gradebook}), 200

@grades_bp.route('/entry', methods=['POST'])
@jwt_required()
@require_permission('grade.create')
def enter_grades():
    """Enter grades (single or bulk)."""
    data = request.json
    
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
@require_permission('grade.update')
def calculate_final_grades():
    """Trigger calculation of final grades."""
    data = request.json
    class_id = data.get('class_id')
    subject_id = data.get('subject_id')
    term = data.get('term')
    academic_year = data.get('academic_year')
    
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
