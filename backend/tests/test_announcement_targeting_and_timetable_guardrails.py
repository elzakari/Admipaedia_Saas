import pytest
from datetime import date, time

from app.models.announcement import Announcement
from app.models.student import Student
from app.models.subject import Subject
from app.models.timetable import Period
from app.models.user import User
from app.services.announcement_service import AnnouncementService
from app.services.timetable.service import TimetableService
from tests.test_production_integration import create_test_parent


def test_announcement_service_scopes_by_target_roles(db_session, sample_tenant, sample_class):
    sample_teacher = sample_class.teacher
    parent_user = User(username='parent_targeting', email='parent.targeting@example.com', role='parent')
    parent_user.set_password('Password123!')
    db_session.add(parent_user)
    db_session.flush()

    parent = create_test_parent(db_session, parent_user, sample_tenant.id)

    student_user = User(username='student_targeting', email='student.targeting@example.com', role='student')
    student_user.set_password('Password123!')
    db_session.add(student_user)
    db_session.flush()

    student = Student(
        tenant_id=sample_tenant.id,
        user_id=student_user.id,
        admission_number='ADM-TARGET-001',
        first_name='Target',
        last_name='Student',
        date_of_birth=date(2012, 1, 1),
        gender='male',
        email=student_user.email,
        class_id=sample_class.id,
        parent_id=parent.id,
        status='active',
    )
    db_session.add(student)
    db_session.flush()

    db_session.add_all([
        Announcement(
            title='Students only',
            content='Visible to students only',
            class_id=sample_class.id,
            teacher_id=sample_teacher.id,
            recipients='students',
            target_roles='students',
            is_published=True,
        ),
        Announcement(
            title='Parents only',
            content='Visible to parents only',
            class_id=sample_class.id,
            teacher_id=sample_teacher.id,
            recipients='parents',
            target_roles='parents',
            is_published=True,
        ),
        Announcement(
            title='Everyone',
            content='Visible to the whole class audience',
            class_id=sample_class.id,
            teacher_id=sample_teacher.id,
            recipients='all',
            target_roles='all',
            is_published=True,
        ),
    ])
    db_session.commit()

    student_announcements, _ = AnnouncementService.get_announcements_for_user(student_user.id, page=1, per_page=20)
    parent_announcements, _ = AnnouncementService.get_announcements_for_user(parent_user.id, page=1, per_page=20)

    student_titles = {item['title'] for item in student_announcements}
    parent_titles = {item['title'] for item in parent_announcements}

    assert student_titles == {'Students only', 'Everyone'}
    assert parent_titles == {'Parents only', 'Everyone'}


def test_timetable_service_requires_subject_class_and_teacher_assignment(db_session, sample_tenant, sample_class):
    sample_teacher = sample_class.teacher
    period = Period(name='Period 1', start_time=time(8, 0), end_time=time(8, 45), order_index=1)
    db_session.add(period)

    ready_subject = Subject(tenant_id=sample_tenant.id, name='Mathematics', code='MATH-GUARD')
    ready_subject.classes.append(sample_class)
    ready_subject.teachers.append(sample_teacher)

    class_unassigned_subject = Subject(tenant_id=sample_tenant.id, name='Physics', code='PHY-GUARD')

    teacher_unassigned_subject = Subject(tenant_id=sample_tenant.id, name='Chemistry', code='CHEM-GUARD')
    teacher_unassigned_subject.classes.append(sample_class)

    db_session.add_all([ready_subject, class_unassigned_subject, teacher_unassigned_subject])
    db_session.commit()

    valid_slot, valid_error = TimetableService.create_slot({
        'class_id': sample_class.id,
        'subject_id': ready_subject.id,
        'teacher_id': sample_teacher.id,
        'period_id': period.id,
        'day_of_week': 'Monday',
        'term': 'Term 1',
        'academic_year': '2026',
    })
    assert valid_error is None
    assert valid_slot is not None

    invalid_class_slot, invalid_class_error = TimetableService.create_slot({
        'class_id': sample_class.id,
        'subject_id': class_unassigned_subject.id,
        'teacher_id': sample_teacher.id,
        'period_id': period.id,
        'day_of_week': 'Tuesday',
        'term': 'Term 1',
        'academic_year': '2026',
    })
    assert invalid_class_slot is None
    assert 'not assigned to this class' in invalid_class_error

    invalid_teacher_slot, invalid_teacher_error = TimetableService.create_slot({
        'class_id': sample_class.id,
        'subject_id': teacher_unassigned_subject.id,
        'teacher_id': sample_teacher.id,
        'period_id': period.id,
        'day_of_week': 'Wednesday',
        'term': 'Term 1',
        'academic_year': '2026',
    })
    assert invalid_teacher_slot is None
    assert 'not assigned to this subject' in invalid_teacher_error
