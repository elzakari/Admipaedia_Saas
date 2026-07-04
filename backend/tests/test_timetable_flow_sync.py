from datetime import time

from app.models.subject import Subject
from app.models.timetable import Period
from app.services.timetable.service import TimetableService


def test_timetable_service_normalizes_term_aliases_for_conflicts_and_queries(db_session, sample_tenant, sample_class):
    sample_teacher = sample_class.teacher
    period = Period(name='Period 2', start_time=time(9, 0), end_time=time(9, 45), order_index=2)
    db_session.add(period)

    subject = Subject(tenant_id=sample_tenant.id, name='Biology', code='BIO-TERM')
    subject.classes.append(sample_class)
    subject.teachers.append(sample_teacher)
    db_session.add(subject)
    db_session.commit()

    legacy_slot, legacy_error = TimetableService.create_slot({
        'class_id': sample_class.id,
        'subject_id': subject.id,
        'teacher_id': sample_teacher.id,
        'period_id': period.id,
        'day_of_week': 'Thursday',
        'term': 'term1',
        'academic_year': '2026',
        'room_id': 202,
    })

    assert legacy_error is None
    assert legacy_slot is not None
    assert legacy_slot.term == 'Term 1'

    duplicate_slot, duplicate_error = TimetableService.create_slot({
        'class_id': sample_class.id,
        'subject_id': subject.id,
        'teacher_id': sample_teacher.id,
        'period_id': period.id,
        'day_of_week': 'Thursday',
        'term': 'Term 1',
        'academic_year': '2026',
        'room_id': 202,
    })

    assert duplicate_slot is None
    assert 'already has a lesson' in duplicate_error

    class_timetable, _ = TimetableService.get_class_timetable(sample_class.id, 'term1', '2026')
    assert class_timetable['Thursday'][period.id]['subject'] == 'Biology'

    all_slots = TimetableService.get_all_slots({
        'term': 'term1',
        'academic_year': '2026',
        'class_id': sample_class.id,
    })
    assert len(all_slots) == 1
    assert all_slots[0]['term'] == 'Term 1'
