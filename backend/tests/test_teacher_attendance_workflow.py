from datetime import date

from app.extensions import db
from app.models.attendance import Attendance
from app.models.student import Student
from app.models.subject import Subject
from app.services.attendance_service import AttendanceService


def test_get_all_attendances_filters_by_subject(db_session, sample_tenant, sample_class):
    student = Student(
        tenant_id=sample_tenant.id,
        admission_number='ATT-001',
        first_name='Attendance',
        last_name='Student',
        date_of_birth=date(2012, 1, 1),
        gender='male',
        email='attendance.student@example.com',
        class_id=sample_class.id,
        status='active',
    )
    subject_one = Subject(tenant_id=sample_tenant.id, name='Mathematics', code='MATH-ATT')
    subject_two = Subject(tenant_id=sample_tenant.id, name='Science', code='SCI-ATT')
    db.session.add_all([student, subject_one, subject_two])
    db.session.commit()

    db.session.add_all([
        Attendance(
            student_id=student.id,
            class_id=sample_class.id,
            subject_id=subject_one.id,
            date=date(2026, 7, 3),
            status='present',
        ),
        Attendance(
            student_id=student.id,
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
