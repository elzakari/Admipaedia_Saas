from flask import request, jsonify, g
from flask_jwt_extended import jwt_required, get_jwt_identity
from app.models import (
    AssessmentFramework, AssessmentTask, AssessmentRubric,
    SchoolBasedAssessment, DifferentiatedAssessment, ContinuousAssessmentRecord
)
from app.models.class_ import Class
from app.models.student import Student
from app.models.subject import Subject
from app.models.teacher import Teacher
from app.models.user import User
from app.extensions import db
from app.services.identity_resolver import IdentityResolver
from app.utils.rbac_decorators import require_role
from app.utils.tenant_context import tenant_required
from . import assessment_bp
from datetime import datetime
from app.models.assessment_methods import AssessmentSubmission, AssessmentScore, AssessmentType, AssessmentMode


def _tenant_scoped_first(model, entity_id):
    query = model.query.filter_by(id=entity_id)
    tenant_id = getattr(g, 'tenant_id', None)
    if tenant_id is not None and hasattr(model, 'tenant_id'):
        query = query.filter(model.tenant_id == tenant_id)
    return query.first()


def _parse_date(value, field_name):
    if not value:
        raise ValueError(f"{field_name} is required")
    if isinstance(value, datetime):
        return value.date()
    if hasattr(value, 'isoformat') and not isinstance(value, str):
        return value

    raw_value = str(value).strip()
    try:
        if 'T' in raw_value:
            return datetime.fromisoformat(raw_value.replace('Z', '+00:00')).date()
        return datetime.strptime(raw_value, '%Y-%m-%d').date()
    except ValueError as exc:
        raise ValueError(f"{field_name} must be a valid date") from exc


def _parse_datetime(value, field_name, default=None):
    if value in (None, ''):
        return default
    if isinstance(value, datetime):
        return value

    raw_value = str(value).strip()
    try:
        return datetime.fromisoformat(raw_value.replace('Z', '+00:00'))
    except ValueError as exc:
        raise ValueError(f"{field_name} must be a valid datetime") from exc


def _parse_int(value, field_name):
    try:
        return int(value)
    except (TypeError, ValueError) as exc:
        raise ValueError(f"{field_name} must be an integer") from exc


def _parse_float(value, field_name, default=None):
    if value in (None, ''):
        return default
    try:
        return float(value)
    except (TypeError, ValueError) as exc:
        raise ValueError(f"{field_name} must be a number") from exc


def _parse_score_list(value):
    if value in (None, ''):
        return []
    if isinstance(value, (int, float, str)):
        return [_parse_float(value, 'class_test_scores')]
    if not isinstance(value, (list, tuple)):
        raise ValueError("class_test_scores must be a list of numbers")
    return [_parse_float(entry, 'class_test_scores') for entry in value]


def _current_teacher_profile():
    current_user_id = get_jwt_identity()
    tenant_id = getattr(g, 'tenant_id', None)

    query = Teacher.query.filter_by(user_id=current_user_id)
    if tenant_id is not None:
        query = query.filter(Teacher.tenant_id == tenant_id)

    teacher = query.first()
    if not teacher:
        raise PermissionError("An active teacher profile is required for assessment entry")
    return teacher


def _current_user():
    user = User.query.get(get_jwt_identity())
    if not user:
        raise PermissionError("Authenticated user not found")
    return user


def _current_student_profile():
    current_user_id = get_jwt_identity()
    tenant_id = getattr(g, 'tenant_id', None)

    query = Student.query.filter_by(user_id=current_user_id)
    if tenant_id is not None:
        query = query.filter(Student.tenant_id == tenant_id)

    student = query.first()
    if not student:
        raise PermissionError("An active student profile is required for assessment submission")
    return student


def _parse_enum(value, enum_cls, field_name):
    if not value:
        raise ValueError(f"{field_name} is required")

    raw_value = str(value).strip()
    try:
        return enum_cls(raw_value)
    except ValueError:
        normalized = raw_value.upper().replace(' ', '_')
        try:
            return enum_cls[normalized]
        except KeyError as exc:
            allowed_values = ', '.join(item.value for item in enum_cls)
            raise ValueError(f"{field_name} must be one of: {allowed_values}") from exc


def _serialize_framework(framework):
    return {
        'id': framework.id,
        'name': framework.name,
        'description': framework.description,
        'educational_level_id': framework.educational_level_id,
        'subject_id': framework.subject_id,
        'formative_weight': framework.formative_weight,
        'summative_weight': framework.summative_weight,
        'school_based_weight': framework.school_based_weight,
        'project_weight': framework.project_weight,
        'formative_frequency': framework.formative_frequency,
        'summative_frequency': framework.summative_frequency,
    }


def _serialize_task(task):
    return {
        'id': task.id,
        'title': task.title,
        'description': task.description,
        'framework_id': task.framework_id,
        'assessment_type': task.assessment_type.value if task.assessment_type else None,
        'assessment_mode': task.assessment_mode.value if task.assessment_mode else None,
        'scheduled_date': task.scheduled_date.isoformat() if task.scheduled_date else None,
        'duration_minutes': task.duration_minutes,
        'total_marks': task.total_marks,
        'pass_mark': task.pass_mark,
        'instructions': task.instructions,
    }


def _serialize_submission(submission):
    return {
        'id': submission.id,
        'task_id': submission.task_id,
        'student_id': submission.student_id,
        'submission_content': submission.submission_content,
        'submission_files': submission.file_attachments or [],
        'submitted_at': submission.submitted_at.isoformat() if submission.submitted_at else None,
        'is_submitted': submission.is_submitted,
        'is_late': submission.is_late,
    }


def _serialize_score(score):
    return {
        'id': score.id,
        'submission_id': score.submission_id,
        'teacher_id': score.teacher_id,
        'raw_score': score.raw_score,
        'percentage_score': score.percentage_score,
        'grade_level': score.grade_level,
        'written_feedback': score.written_feedback,
        'criterion_scores': score.criterion_scores or {},
        'is_final': score.is_final,
        'scored_at': score.scored_at.isoformat() if score.scored_at else None,
    }


def _validate_assessment_context(class_id, subject_id, student_id=None):
    current_user_id = get_jwt_identity()

    class_obj = _tenant_scoped_first(Class, class_id)
    if not class_obj:
        raise ValueError("Class not found")

    subject = _tenant_scoped_first(Subject, subject_id)
    if not subject:
        raise ValueError("Subject not found")

    student = None
    if student_id is not None:
        student = _tenant_scoped_first(Student, student_id)
        if not student:
            raise ValueError("Student not found")
        if student.class_id != class_id:
            raise ValueError("Student does not belong to the specified class")

    if not IdentityResolver.can_user_access_class(current_user_id, class_id):
        raise PermissionError("Insufficient permissions for this class context")

    return class_obj, subject, student

@assessment_bp.route('/frameworks/<int:educational_level_id>', methods=['GET'])
@jwt_required()
def get_assessment_frameworks(educational_level_id):
    """Get assessment frameworks for educational level"""
    try:
        frameworks = AssessmentFramework.query.filter_by(
            educational_level_id=educational_level_id,
            is_active=True
        ).all()
        
        return jsonify({
            'success': True,
            'data': [{
                'id': fw.id,
                'name': fw.name,
                'subject_id': fw.subject_id,
                'framework_type': 'weighted',
                'description': fw.description,
                'assessment_criteria': {
                    'formative_weight': fw.formative_weight,
                    'summative_weight': fw.summative_weight,
                    'school_based_weight': fw.school_based_weight,
                    'project_weight': fw.project_weight,
                    'formative_frequency': fw.formative_frequency,
                    'summative_frequency': fw.summative_frequency,
                },
                'scoring_rubric': {
                    'curriculum_standards': fw.curriculum_standards or [],
                    'competency_indicators': fw.competency_indicators or [],
                }
            } for fw in frameworks]
        }), 200
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500


@assessment_bp.route('/frameworks', methods=['POST'])
@jwt_required()
def create_assessment_framework():
    """Create an assessment framework"""
    try:
        data = request.get_json(silent=True) or {}

        name = str(data.get('name') or '').strip()
        educational_level_id = _parse_int(data.get('educational_level_id'), 'educational_level_id')
        subject_id = _parse_int(data.get('subject_id'), 'subject_id')
        if not name:
            raise ValueError("name is required")

        subject = Subject.query.get(subject_id)
        if not subject:
            raise ValueError("Subject not found")

        framework = AssessmentFramework(
            name=name,
            description=data.get('description'),
            educational_level_id=educational_level_id,
            subject_id=subject_id,
            formative_weight=_parse_float(data.get('formative_weight'), 'formative_weight', default=30.0),
            summative_weight=_parse_float(data.get('summative_weight'), 'summative_weight', default=40.0),
            school_based_weight=_parse_float(data.get('school_based_weight'), 'school_based_weight', default=20.0),
            project_weight=_parse_float(data.get('project_weight'), 'project_weight', default=10.0),
            formative_frequency=data.get('formative_frequency') or 'weekly',
            summative_frequency=data.get('summative_frequency') or 'termly',
            curriculum_standards=data.get('curriculum_standards'),
            competency_indicators=data.get('competency_indicators'),
        )
        db.session.add(framework)
        db.session.commit()

        return jsonify({
            'success': True,
            'framework': _serialize_framework(framework),
        }), 201
    except ValueError as e:
        db.session.rollback()
        return jsonify({'success': False, 'message': str(e)}), 400
    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'message': str(e)}), 500


@assessment_bp.route('/tasks', methods=['POST'])
@jwt_required()
def create_assessment_task():
    """Create an assessment task"""
    try:
        data = request.get_json(silent=True) or {}

        title = str(data.get('title') or '').strip()
        framework_id = _parse_int(data.get('framework_id'), 'framework_id')
        if not title:
            raise ValueError("title is required")

        framework = AssessmentFramework.query.get(framework_id)
        if not framework:
            raise ValueError("Assessment framework not found")

        task = AssessmentTask(
            title=title,
            description=data.get('description'),
            framework_id=framework_id,
            assessment_type=_parse_enum(data.get('assessment_type'), AssessmentType, 'assessment_type'),
            assessment_mode=_parse_enum(data.get('assessment_mode'), AssessmentMode, 'assessment_mode'),
            scheduled_date=_parse_date(data.get('scheduled_date'), 'scheduled_date') if data.get('scheduled_date') not in (None, '') else None,
            duration_minutes=_parse_int(data.get('duration_minutes'), 'duration_minutes') if data.get('duration_minutes') not in (None, '') else None,
            is_differentiated=bool(data.get('is_differentiated', False)),
            differentiation_strategies=data.get('differentiation_strategies'),
            total_marks=_parse_int(data.get('total_marks'), 'total_marks'),
            pass_mark=_parse_int(data.get('pass_mark'), 'pass_mark') if data.get('pass_mark') not in (None, '') else None,
            learning_objectives=data.get('learning_objectives'),
            competency_indicators=data.get('competency_indicators'),
            instructions=data.get('instructions'),
            materials_needed=data.get('materials_needed'),
            accessibility_features=data.get('accessibility_features'),
        )
        db.session.add(task)
        db.session.commit()

        return jsonify({
            'success': True,
            'task': _serialize_task(task),
        }), 201
    except ValueError as e:
        db.session.rollback()
        return jsonify({'success': False, 'message': str(e)}), 400
    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'message': str(e)}), 500


@assessment_bp.route('/submissions', methods=['POST'])
@jwt_required()
def submit_assessment():
    """Submit an assessment task"""
    try:
        data = request.get_json(silent=True) or {}
        student = _current_student_profile()

        task_id = _parse_int(data.get('task_id'), 'task_id')
        task = AssessmentTask.query.get(task_id)
        if not task:
            raise ValueError("Assessment task not found")

        content = data.get('submission_content')
        attachments = data.get('submission_files')
        if attachments is not None and not isinstance(attachments, list):
            raise ValueError("submission_files must be a list")

        submission = AssessmentSubmission.query.filter_by(task_id=task_id, student_id=student.id).first()
        if not submission:
            submission = AssessmentSubmission(task_id=task_id, student_id=student.id)
            db.session.add(submission)

        submission.submission_content = content
        submission.file_attachments = attachments or []
        submission.submitted_at = _parse_datetime(data.get('submitted_at'), 'submitted_at', default=datetime.utcnow())
        submission.differentiation_applied = data.get('differentiation_applied')
        submission.is_submitted = True

        if task.scheduled_date and submission.submitted_at:
            submission.is_late = submission.submitted_at.date() > task.scheduled_date

        db.session.commit()

        return jsonify({
            'success': True,
            'submission': _serialize_submission(submission),
        }), 201
    except ValueError as e:
        db.session.rollback()
        return jsonify({'success': False, 'message': str(e)}), 400
    except PermissionError as e:
        db.session.rollback()
        return jsonify({'success': False, 'message': str(e)}), 403
    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'message': str(e)}), 500


@assessment_bp.route('/scores', methods=['POST'])
@jwt_required()
def score_assessment():
    """Score an assessment submission"""
    try:
        data = request.get_json(silent=True) or {}
        teacher = _current_teacher_profile()

        submission_id = _parse_int(data.get('submission_id'), 'submission_id')
        submission = AssessmentSubmission.query.get(submission_id)
        if not submission:
            raise ValueError("Assessment submission not found")

        raw_score = _parse_float(data.get('raw_score'), 'raw_score')
        if raw_score is None:
            raise ValueError("raw_score is required")

        max_marks = float(submission.task.total_marks or 0)
        percentage_score = round((raw_score / max_marks) * 100, 2) if max_marks > 0 else None

        grade_level = data.get('grade_level')
        if grade_level in (None, '') and percentage_score is not None:
            if percentage_score >= 80:
                grade_level = 4
            elif percentage_score >= 65:
                grade_level = 3
            elif percentage_score >= 45:
                grade_level = 2
            else:
                grade_level = 1
        elif grade_level not in (None, ''):
            grade_level = _parse_int(grade_level, 'grade_level')

        score = AssessmentScore(
            submission_id=submission_id,
            rubric_id=_parse_int(data.get('rubric_id'), 'rubric_id') if data.get('rubric_id') not in (None, '') else None,
            teacher_id=teacher.id,
            raw_score=raw_score,
            percentage_score=percentage_score,
            grade_level=grade_level,
            written_feedback=data.get('written_feedback'),
            audio_feedback_url=data.get('audio_feedback_url'),
            criterion_scores=data.get('criterion_scores') if isinstance(data.get('criterion_scores'), dict) else None,
            is_final=bool(data.get('is_final', True)),
        )
        db.session.add(score)
        db.session.commit()

        return jsonify({
            'success': True,
            'score': _serialize_score(score),
        }), 201
    except ValueError as e:
        db.session.rollback()
        return jsonify({'success': False, 'message': str(e)}), 400
    except PermissionError as e:
        db.session.rollback()
        return jsonify({'success': False, 'message': str(e)}), 403
    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'message': str(e)}), 500

@assessment_bp.route('/sba', methods=['POST'])
@jwt_required()
@require_role(['teacher', 'admin', 'school_admin', 'super_admin'])
@tenant_required
def create_school_based_assessment():
    """Create School-Based Assessment"""
    try:
        data = request.get_json(silent=True) or {}
        teacher = _current_teacher_profile()

        student_id = _parse_int(data.get('student_id'), 'student_id')
        subject_id = _parse_int(data.get('subject_id'), 'subject_id')
        class_id = _parse_int(data.get('class_id'), 'class_id')
        assessment_date = _parse_date(data.get('assessment_date'), 'assessment_date')
        academic_year = str(data.get('academic_year') or '').strip()
        term = str(data.get('term') or '').strip()

        if not academic_year:
            raise ValueError("academic_year is required")
        if not term:
            raise ValueError("term is required")

        _validate_assessment_context(class_id, subject_id, student_id)

        marking_scheme = data.get('marking_scheme') if isinstance(data.get('marking_scheme'), dict) else {}
        class_test_scores = _parse_score_list(data.get('class_test_scores', marking_scheme.get('class_test_scores')))
        class_exercises_score = _parse_float(
            data.get('class_exercises_score', marking_scheme.get('class_exercises_score')),
            'class_exercises_score',
            default=0.0,
        )
        homework_score = _parse_float(
            data.get('homework_score', marking_scheme.get('homework_score')),
            'homework_score',
            default=0.0,
        )
        project_score = _parse_float(
            data.get('project_score', marking_scheme.get('project_score')),
            'project_score',
            default=0.0,
        )
        assignment_score = _parse_float(
            data.get('assignment_score', marking_scheme.get('assignment_score')),
            'assignment_score',
            default=0.0,
        )
        class_test_average = _parse_float(
            data.get('class_test_average'),
            'class_test_average',
            default=(sum(class_test_scores) / len(class_test_scores) if class_test_scores else 0.0),
        )

        total_sba_score = _parse_float(
            data.get('total_sba_score'),
            'total_sba_score',
            default=class_exercises_score + homework_score + project_score + assignment_score + class_test_average,
        )
        if total_sba_score in (None, 0.0) and data.get('total_marks') not in (None, ''):
            total_sba_score = _parse_float(data.get('total_marks'), 'total_marks', default=0.0)

        explicit_percentage = data.get('sba_percentage')
        total_marks = _parse_float(data.get('total_marks'), 'total_marks', default=None)
        if explicit_percentage not in (None, ''):
            sba_percentage = _parse_float(explicit_percentage, 'sba_percentage', default=0.0)
        elif total_marks and total_marks > 0:
            sba_percentage = round((total_sba_score / total_marks) * 100, 2)
        else:
            sba_percentage = total_sba_score

        sba = SchoolBasedAssessment(
            student_id=student_id,
            subject_id=subject_id,
            class_id=class_id,
            academic_year=academic_year,
            term=term,
            class_exercises_score=class_exercises_score,
            homework_score=homework_score,
            project_score=project_score,
            assignment_score=assignment_score,
            class_test_scores=class_test_scores,
            class_test_average=class_test_average,
            total_sba_score=total_sba_score,
            sba_percentage=sba_percentage,
            core_competencies_score=data.get('core_competencies_score', marking_scheme.get('core_competencies_score')),
            subject_competencies_score=data.get('subject_competencies_score', marking_scheme.get('subject_competencies_score')),
            teacher_id=teacher.id,
            assessment_date=assessment_date,
        )
        
        db.session.add(sba)
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': 'School-Based Assessment created successfully',
            'data': {
                'id': sba.id,
                'student_id': sba.student_id,
                'class_id': sba.class_id,
                'subject_id': sba.subject_id,
                'total_sba_score': sba.total_sba_score,
                'sba_percentage': sba.sba_percentage,
            }
        }), 201
    except ValueError as e:
        db.session.rollback()
        return jsonify({'success': False, 'message': str(e)}), 400
    except PermissionError as e:
        db.session.rollback()
        return jsonify({'success': False, 'message': str(e)}), 403
    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'message': str(e)}), 500

@assessment_bp.route('/continuous/<int:student_id>', methods=['POST'])
@jwt_required()
@require_role(['teacher', 'admin', 'school_admin', 'super_admin'])
@tenant_required
def record_continuous_assessment(student_id):
    """Record continuous assessment"""
    try:
        data = request.get_json(silent=True) or {}
        teacher = _current_teacher_profile()

        subject_id = _parse_int(data.get('subject_id'), 'subject_id')
        student = _tenant_scoped_first(Student, student_id)
        if not student:
            raise ValueError("Student not found")

        class_id = _parse_int(data.get('class_id') if data.get('class_id') is not None else student.class_id, 'class_id')
        if student.class_id != class_id:
            raise ValueError("Student does not belong to the specified class")

        _validate_assessment_context(class_id, subject_id, student_id)

        assessment_date = _parse_date(data.get('assessment_date'), 'assessment_date')
        academic_year = str(data.get('academic_year') or '').strip()
        term = str(data.get('term') or '').strip()
        if not academic_year:
            raise ValueError("academic_year is required")
        if not term:
            raise ValueError("term is required")

        assessment_type = str(data.get('assessment_type') or '').strip().lower()
        raw_score = _parse_float(data.get('score'), 'score', default=None)
        max_score = _parse_float(data.get('max_score'), 'max_score', default=None)

        derived_class_score = _parse_float(data.get('class_score'), 'class_score', default=None)
        if derived_class_score is None and raw_score is not None:
            if max_score and max_score > 0:
                derived_class_score = round((raw_score / max_score) * 40, 2)
            else:
                derived_class_score = raw_score

        homework_score = _parse_float(data.get('homework_score'), 'homework_score', default=None)
        participation_score = _parse_float(data.get('participation_score'), 'participation_score', default=None)
        quiz_score = _parse_float(data.get('quiz_score'), 'quiz_score', default=None)

        if raw_score is not None:
            if homework_score is None and assessment_type == 'homework':
                homework_score = raw_score
            if participation_score is None and assessment_type in {'participation', 'classwork', 'oral'}:
                participation_score = raw_score
            if quiz_score is None and assessment_type in {'quiz', 'test', 'class_test', 'continuous'}:
                quiz_score = raw_score

        record = ContinuousAssessmentRecord(
            student_id=student_id,
            subject_id=subject_id,
            class_id=class_id,
            teacher_id=teacher.id,
            academic_year=academic_year,
            term=term,
            week_number=_parse_int(data.get('week_number'), 'week_number') if data.get('week_number') not in (None, '') else None,
            assessment_date=assessment_date,
            assessment_focus=(str(data.get('assessment_focus') or '').strip() or assessment_type or None),
            class_score=derived_class_score,
            homework_score=homework_score,
            participation_score=participation_score,
            quiz_score=quiz_score,
            competencies_demonstrated=data.get('competencies_demonstrated'),
            competency_levels=data.get('competency_levels'),
            teacher_observations=data.get('teacher_observations') or data.get('feedback'),
            learning_difficulties=data.get('learning_difficulties'),
            strengths_noted=data.get('strengths_noted'),
            next_steps=data.get('next_steps'),
            support_needed=data.get('support_needed'),
        )
        
        db.session.add(record)
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': 'Continuous assessment recorded successfully',
            'data': {
                'id': record.id,
                'student_id': record.student_id,
                'class_id': record.class_id,
                'subject_id': record.subject_id,
                'class_score': record.class_score,
                'homework_score': record.homework_score,
                'participation_score': record.participation_score,
                'quiz_score': record.quiz_score,
            }
        }), 201
    except ValueError as e:
        db.session.rollback()
        return jsonify({'success': False, 'message': str(e)}), 400
    except PermissionError as e:
        db.session.rollback()
        return jsonify({'success': False, 'message': str(e)}), 403
    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'message': str(e)}), 500
