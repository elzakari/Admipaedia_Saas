from datetime import date

from app.extensions import db
from app.models.attendance import Attendance
from app.models.student import Student
from app.models.subject import Subject
from app.services.attendance_service import AttendanceService


def _build_student(sample_tenant, sample_class, suffix):
    return Student(
        tenant_id=sample_tenant.id,
        admission_number=f'ATT-{suffix}',
        first_name='Attendance',
        last_name=f'Student {suffix}',
        date_of_birth=date(2012, 1, 1),
        gender='male',
        email=f'attendance.student.{suffix}@example.com',
        class_id=sample_class.id,
        status='active',
    )


def test_bulk_attendance_upserts_same_daily_register_across_portals(db_session, sample_tenant, sample_class):
    student = _build_student(sample_tenant, sample_class, '001')
    subject_one = Subject(tenant_id=sample_tenant.id, name='Mathematics', code='MATH-ATT')
    subject_two = Subject(tenant_id=sample_tenant.id, name='Science', code='SCI-ATT')
    db.session.add_all([student, subject_one, subject_two])
    db.session.commit()

    created, error = AttendanceService.bulk_create_attendance({
        'class_id': sample_class.id,
        'subject_id': subject_one.id,
        'date': date(2026, 7, 3),
        'attendances': [
            {'student_id': student.id, 'status': 'present', 'remarks': 'Teacher marked'}
        ],
    })

    assert error is None
    assert len(created) == 1

    updated, error = AttendanceService.bulk_create_attendance({
        'class_id': sample_class.id,
        'subject_id': subject_two.id,
        'date': date(2026, 7, 3),
        'attendances': [
            {'student_id': student.id, 'status': 'late', 'remarks': 'Admin corrected'}
        ],
    })

    assert error is None
    assert len(updated) == 1

    daily_records = Attendance.query.filter_by(
        student_id=student.id,
        class_id=sample_class.id,
        date=date(2026, 7, 3),
    ).all()

    assert len(daily_records) == 1
    assert daily_records[0].status == 'late'
    assert daily_records[0].remarks == 'Admin corrected'


def test_bulk_attendance_creates_daily_register_without_subject_context(db_session, sample_tenant, sample_class):
    student = _build_student(sample_tenant, sample_class, '002')
    db.session.add(student)
    db.session.commit()

    created, error = AttendanceService.bulk_create_attendance({
        'class_id': sample_class.id,
        'date': date(2026, 7, 4),
        'attendances': [
            {'student_id': student.id, 'status': 'present'}
        ],
    })

    assert error is None
    assert len(created) == 1
    assert created[0].subject_id is None
    assert created[0].status == 'present'


def test_get_all_attendances_filters_by_subject(db_session, sample_tenant, sample_class):
    student_one = _build_student(sample_tenant, sample_class, '003')
    student_two = _build_student(sample_tenant, sample_class, '004')
    subject_one = Subject(tenant_id=sample_tenant.id, name='Mathematics', code='MATH-ATT')
    subject_two = Subject(tenant_id=sample_tenant.id, name='Science', code='SCI-ATT')
    db.session.add_all([student_one, student_two, subject_one, subject_two])
    db.session.commit()

    db.session.add_all([
        Attendance(
            student_id=student_one.id,
            class_id=sample_class.id,
            subject_id=subject_one.id,
            date=date(2026, 7, 3),
            status='present',
        ),
        Attendance(
            student_id=student_two.id,
            class_id=sample_class.id,
            subject_id=subject_two.id,
            date=date(2026, 7, 3),
            status='absent',
        ),
    ])
    db.session.commit()

    filtered = AttendanceService.get_all_attendances(
        page=1,
        per_page=20,
        class_id=sample_class.id,
        subject_id=subject_one.id,
        date_from=date(2026, 7, 3),
        date_to=date(2026, 7, 3),
    )

    assert filtered.total == 1
    assert filtered.items[0].subject_id == subject_one.id
    assert filtered.items[0].status == 'present'
