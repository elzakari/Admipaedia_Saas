import pytest
from app.models.timetable import Period, TimetableSlot
from app.models.class_ import Class
from app.models.subject import Subject
from app.models.teacher import Teacher
from app.models.user import User
from datetime import time

class TestTimetableSystem:
    def test_create_period(self, auth_client, db):
        data = {
            'name': 'Period 1',
            'start_time': '08:00:00',
            'end_time': '08:45:00',
            'order_index': 1
        }
        response = auth_client.post('/api/v1/timetable/periods', json=data)
        assert response.status_code == 201
        
    def test_create_slot_conflict(self, auth_client, db):
        # Setup
        class_obj = Class(name='Class T', grade_level='1', academic_year='2024')
        subject = Subject(name='Math', code='M1')
        user = User(username='teach', email='t@t.com')
        user.set_password('pass')
        db.session.add(user)
        db.session.commit()
        
        teacher = Teacher(user_id=user.id, employee_id='T001', first_name='T', last_name='T')
        period = Period(name='P1', start_time=time(8,0), end_time=time(8,45), order_index=1)
        
        db.session.add_all([class_obj, subject, teacher, period])
        db.session.commit()
        
        # Create first slot
        slot1 = TimetableSlot(
            class_id=class_obj.id, subject_id=subject.id, teacher_id=teacher.id,
            period_id=period.id, day_of_week='Monday', term='1', academic_year='2024'
        )
        db.session.add(slot1)
        db.session.commit()
        
        # Try create conflicting slot (Same class, same time)
        data = {
            'class_id': class_obj.id,
            'subject_id': subject.id,
            'teacher_id': teacher.id,
            'period_id': period.id,
            'day_of_week': 'Monday',
            'term': '1',
            'academic_year': '2024'
        }
        
        response = auth_client.post('/api/v1/timetable/slots', json=data)
        assert response.status_code == 400
        assert 'already has a lesson' in response.json['message']
