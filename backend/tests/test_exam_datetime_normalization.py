from datetime import datetime
from unittest.mock import patch

from app.schemas.exam import ExamCreateSchema
from app.models.class_ import Class
from app.models.subject import Subject
from app.services.enhanced_exam_service import EnhancedExamService
from app.services.exam_service import ExamService, normalize_exam_datetime


def test_normalize_exam_datetime_converts_aware_values_to_naive_utc():
    normalized = normalize_exam_datetime("2026-06-27T10:00:00+01:00")

    assert normalized == datetime(2026, 6, 27, 9, 0, 0)
    assert normalized.tzinfo is None


def test_exam_create_schema_accepts_timezone_aware_future_datetime():
    schema = ExamCreateSchema()
    errors = schema.validate({
        'title': 'Aware Future Exam',
        'exam_date': '2099-06-27T10:00:00+01:00',
        'duration': 60,
        'total_marks': 100,
        'passing_marks': 50,
        'class_id': 1,
        'subject_id': 1,
    })

    assert errors == {}


def test_exam_creation_and_conflict_detection_accept_timezone_aware_input(db_session, sample_tenant, user_factory):
    teacher_user = user_factory('teacher')

    cls = Class(
        tenant_id=sample_tenant.id,
        name='Primary 4 Gold',
        grade_level='Primary 4',
        academic_year='2025/2026',
        status='active',
    )
    subject = Subject(
        tenant_id=sample_tenant.id,
        name='Mathematics',
        code='MATH-P4',
        credit_hours=4,
        is_active=True,
    )
    db_session.add_all([cls, subject])
    db_session.commit()

    with patch.object(db_session, 'rollback', return_value=None):
        exam, error = ExamService.create_exam({
            'title': 'Class Test',
            'description': 'Teacher-created gradebook assessment',
            'exam_date': '2026-06-27T10:00:00+01:00',
            'duration': 60,
            'total_marks': 100,
            'passing_marks': 50,
            'class_id': cls.id,
            'subject_id': subject.id,
            'created_by': teacher_user.id,
            'status': 'scheduled',
        })

    assert error is None
    assert exam is not None
    assert exam.exam_date == datetime(2026, 6, 27, 9, 0, 0)
    assert exam.exam_date.tzinfo is None

    conflicts = EnhancedExamService.detect_exam_conflicts(
        cls.id,
        '2026-06-27T09:30:00+00:00',
        30,
    )

    assert conflicts['has_conflicts'] is True
    assert conflicts['severity'] == 'critical'
    assert conflicts['time_conflicts'][0]['exam_id'] == exam.id
