"""
Comprehensive integration tests for attendance system
Tests attendance marking, bulk operations, analytics, and validation
"""
import pytest
import json
from datetime import datetime, date, timedelta
from unittest.mock import patch

from app.models.user import User
from app.models.student import Student
from app.models.teacher import Teacher
from app.models.class_ import Class
from app.models.subject import Subject
from app.models.attendance import Attendance
from app.extensions import db


class TestAttendanceMarking:
    """Test individual attendance marking functionality"""
    
    def test_mark_single_attendance_success(self, auth_client, db):
        """Test successful single attendance marking"""
        # Create test data
        class_obj = Class(name='Grade 9A', grade_level='Grade 9', academic_year='2024', capacity=30)
        subject = Subject(name='Mathematics', code='MATH09', credits=4)
        db.session.add_all([class_obj, subject])
        db.session.commit()
        
        student = Student(
            first_name='Alice',
            last_name='Johnson',
            email='alice.johnson@student.com',
            date_of_birth=date(2009, 3, 15),
            gender='Female',
            student_id='STU2024010',
            admission_date=date(2024, 1, 15),
            class_id=class_obj.id
        )
        db.session.add(student)
        db.session.commit()
        
        # Mark attendance
        attendance_data = {
            'student_id': student.id,
            'class_id': class_obj.id,
            'subject_id': subject.id,
            'date': '2024-03-15',
            'status': 'present',
            'remarks': 'On time'
        }
        
        response = auth_client.post('/api/v1/attendances', json=attendance_data)
        
        assert response.status_code == 201
        data = response.get_json()
        assert data['success'] is True
        assert data['attendance']['status'] == 'present'
        assert data['attendance']['student_id'] == student.id
        
        # Verify in database
        attendance = Attendance.query.filter_by(student_id=student.id).first()
        assert attendance is not None
        assert attendance.status == 'present'
    
    def test_mark_attendance_invalid_student(self, auth_client, db):
        """Test marking attendance for non-existent student"""
        attendance_data = {
            'student_id': 99999,
            'class_id': 1,
            'subject_id': 1,
            'date': '2024-03-15',
            'status': 'present'
        }
        
        response = auth_client.post('/api/v1/attendances', json=attendance_data)
        
        assert response.status_code == 400
        data = response.get_json()
        assert data['success'] is False
        assert 'not found' in data['message'].lower()
    
    def test_mark_attendance_duplicate_record(self, auth_client, db):
        """Test marking attendance when record already exists"""
        # Create test data
        class_obj = Class(name='Grade 8B', grade_level='Grade 8', academic_year='2024', capacity=25)
        subject = Subject(name='Science', code='SCI08', credits=3)
        db.session.add_all([class_obj, subject])
        db.session.commit()
        
        student = Student(
            first_name='Bob',
            last_name='Smith',
            email='bob.smith@student.com',
            date_of_birth=date(2010, 6, 20),
            gender='Male',
            student_id='STU2024011',
            admission_date=date(2024, 1, 15),
            class_id=class_obj.id
        )
        db.session.add(student)
        db.session.commit()
        
        # Mark attendance first time
        attendance_data = {
            'student_id': student.id,
            'class_id': class_obj.id,
            'subject_id': subject.id,
            'date': '2024-03-15',
            'status': 'present'
        }
        
        response1 = auth_client.post('/api/v1/attendances', json=attendance_data)
        assert response1.status_code == 201
        
        # Try to mark again for same date
        response2 = auth_client.post('/api/v1/attendances', json=attendance_data)
        assert response2.status_code == 400
        data = response2.get_json()
        assert 'already exists' in data['message'].lower()
    
    def test_update_attendance_record(self, auth_client, db):
        """Test updating an existing attendance record"""
        # Create test data and initial attendance
        class_obj = Class(name='Grade 7C', grade_level='Grade 7', academic_year='2024', capacity=28)
        subject = Subject(name='English', code='ENG07', credits=4)
        db.session.add_all([class_obj, subject])
        db.session.commit()
        
        student = Student(
            first_name='Carol',
            last_name='Davis',
            email='carol.davis@student.com',
            date_of_birth=date(2011, 9, 10),
            gender='Female',
            student_id='STU2024012',
            admission_date=date(2024, 1, 15),
            class_id=class_obj.id
        )
        db.session.add(student)
        db.session.commit()
        
        # Create initial attendance
        attendance = Attendance(
            student_id=student.id,
            class_id=class_obj.id,
            subject_id=subject.id,
            date=date(2024, 3, 15),
            status='absent'
        )
        db.session.add(attendance)
        db.session.commit()
        
        # Update attendance
        update_data = {
            'status': 'late',
            'remarks': 'Arrived 15 minutes late'
        }
        
        response = auth_client.put(f'/api/v1/attendances/{attendance.id}', json=update_data)
        
        assert response.status_code == 200
        data = response.get_json()
        assert data['success'] is True
        assert data['attendance']['status'] == 'late'
        assert data['attendance']['remarks'] == 'Arrived 15 minutes late'


class TestBulkAttendanceOperations:
    """Test bulk attendance marking and operations"""
    
    def test_bulk_mark_attendance_success(self, auth_client, db):
        """Test successful bulk attendance marking"""
        # Create test data
        class_obj = Class(name='Grade 10B', grade_level='Grade 10', academic_year='2024', capacity=30)
        subject = Subject(name='History', code='HIST10', credits=3)
        db.session.add_all([class_obj, subject])
        db.session.commit()
        
        # Create multiple students
        students = []
        for i in range(5):
            student = Student(
                first_name=f'Student{i}',
                last_name=f'Bulk{i}',
                email=f'student{i}@bulk.com',
                date_of_birth=date(2008, 1, 1),
                gender='Male' if i % 2 == 0 else 'Female',
                student_id=f'BULK{i:03d}',
                admission_date=date(2024, 1, 15),
                class_id=class_obj.id
            )
            students.append(student)
            db.session.add(student)
        
        db.session.commit()
        
        # Bulk mark attendance
        bulk_data = {
            'class_id': class_obj.id,
            'subject_id': subject.id,
            'date': '2024-03-15',
            'attendances': [
                {'student_id': students[0].id, 'status': 'present'},
                {'student_id': students[1].id, 'status': 'absent'},
                {'student_id': students[2].id, 'status': 'late', 'remarks': 'Traffic jam'},
                {'student_id': students[3].id, 'status': 'present'},
                {'student_id': students[4].id, 'status': 'excused', 'remarks': 'Medical appointment'}
            ]
        }
        
        response = auth_client.post('/api/v1/attendances/bulk', json=bulk_data)
        
        assert response.status_code == 201
        data = response.get_json()
        assert data['success'] is True
        assert '5 attendance records' in data['message']
        
        # Verify records in database
        attendance_records = Attendance.query.filter_by(
            class_id=class_obj.id,
            date=date(2024, 3, 15)
        ).all()
        assert len(attendance_records) == 5
        
        # Check specific statuses
        statuses = [record.status for record in attendance_records]
        assert 'present' in statuses
        assert 'absent' in statuses
        assert 'late' in statuses
        assert 'excused' in statuses
    
    def test_bulk_update_existing_attendance(self, auth_client, db):
        """Test bulk update of existing attendance records"""
        # Create test data
        class_obj = Class(name='Grade 11A', grade_level='Grade 11', academic_year='2024', capacity=25)
        subject = Subject(name='Chemistry', code='CHEM11', credits=4)
        db.session.add_all([class_obj, subject])
        db.session.commit()
        
        student = Student(
            first_name='Update',
            last_name='Test',
            email='update@test.com',
            date_of_birth=date(2007, 5, 15),
            gender='Male',
            student_id='UPD001',
            admission_date=date(2024, 1, 15),
            class_id=class_obj.id
        )
        db.session.add(student)
        db.session.commit()
        
        # Create existing attendance record
        existing_attendance = Attendance(
            student_id=student.id,
            class_id=class_obj.id,
            subject_id=subject.id,
            date=date(2024, 3, 15),
            status='absent'
        )
        db.session.add(existing_attendance)
        db.session.commit()
        
        # Bulk update (should update existing record)
        bulk_data = {
            'class_id': class_obj.id,
            'subject_id': subject.id,
            'date': '2024-03-15',
            'attendances': [
                {'student_id': student.id, 'status': 'present', 'remarks': 'Corrected status'}
            ]
        }
        
        response = auth_client.post('/api/v1/attendances/bulk', json=bulk_data)
        
        assert response.status_code == 201
        data = response.get_json()
        assert data['success'] is True
        
        # Verify update
        updated_attendance = Attendance.query.get(existing_attendance.id)
        assert updated_attendance.status == 'present'
        assert updated_attendance.remarks == 'Corrected status'
    
    def test_bulk_mark_invalid_class(self, auth_client, db):
        """Test bulk marking with invalid class ID"""
        bulk_data = {
            'class_id': 99999,
            'subject_id': 1,
            'date': '2024-03-15',
            'attendances': [
                {'student_id': 1, 'status': 'present'}
            ]
        }
        
        response = auth_client.post('/api/v1/attendances/bulk', json=bulk_data)
        
        assert response.status_code == 400
        data = response.get_json()
        assert data['success'] is False
        assert 'class not found' in data['message'].lower()


class TestAttendanceAnalytics:
    """Test attendance analytics and reporting"""
    
    def test_get_attendance_statistics(self, auth_client, db):
        """Test getting attendance statistics"""
        # Create test data
        class_obj = Class(name='Analytics Class', grade_level='Grade 12', academic_year='2024', capacity=20)
        subject = Subject(name='Physics', code='PHYS12', credits=4)
        db.session.add_all([class_obj, subject])
        db.session.commit()
        
        students = []
        for i in range(3):
            student = Student(
                first_name=f'Analytics{i}',
                last_name=f'Student{i}',
                email=f'analytics{i}@test.com',
                date_of_birth=date(2006, 1, 1),
                gender='Male',
                student_id=f'ANA{i:03d}',
                admission_date=date(2024, 1, 15),
                class_id=class_obj.id
            )
            students.append(student)
            db.session.add(student)
        
        db.session.commit()
        
        # Create attendance records with different statuses
        attendance_records = [
            Attendance(student_id=students[0].id, class_id=class_obj.id, subject_id=subject.id, 
                      date=date(2024, 3, 15), status='present'),
            Attendance(student_id=students[1].id, class_id=class_obj.id, subject_id=subject.id, 
                      date=date(2024, 3, 15), status='absent'),
            Attendance(student_id=students[2].id, class_id=class_obj.id, subject_id=subject.id, 
                      date=date(2024, 3, 15), status='late'),
            Attendance(student_id=students[0].id, class_id=class_obj.id, subject_id=subject.id, 
                      date=date(2024, 3, 16), status='present'),
            Attendance(student_id=students[1].id, class_id=class_obj.id, subject_id=subject.id, 
                      date=date(2024, 3, 16), status='present'),
        ]
        
        for record in attendance_records:
            db.session.add(record)
        db.session.commit()
        
        # Get analytics
        response = auth_client.get(f'/api/v1/attendance/analytics?class_id={class_obj.id}')
        
        assert response.status_code == 200
        data = response.get_json()
        assert data['success'] is True
        
        analytics = data['data']
        assert 'rate' in analytics
        assert 'by_status' in analytics
        assert 'total_records' in analytics
        assert analytics['total_records'] == 5
    
    def test_get_student_attendance_report(self, auth_client, db):
        """Test getting detailed student attendance report"""
        # Create test data
        class_obj = Class(name='Report Class', grade_level='Grade 9', academic_year='2024', capacity=30)
        subject = Subject(name='Geography', code='GEO09', credits=3)
        db.session.add_all([class_obj, subject])
        db.session.commit()
        
        student = Student(
            first_name='Report',
            last_name='Student',
            email='report@student.com',
            date_of_birth=date(2009, 8, 25),
            gender='Female',
            student_id='REP001',
            admission_date=date(2024, 1, 15),
            class_id=class_obj.id
        )
        db.session.add(student)
        db.session.commit()
        
        # Create attendance records over multiple days
        dates = [date(2024, 3, 15), date(2024, 3, 16), date(2024, 3, 17), date(2024, 3, 18)]
        statuses = ['present', 'present', 'absent', 'late']
        
        for i, (date_val, status) in enumerate(zip(dates, statuses)):
            attendance = Attendance(
                student_id=student.id,
                class_id=class_obj.id,
                subject_id=subject.id,
                date=date_val,
                status=status
            )
            db.session.add(attendance)
        
        db.session.commit()
        
        # Get student report
        response = auth_client.get(
            f'/api/v1/students/{student.id}/attendance-report'
            f'?date_from=2024-03-15&date_to=2024-03-18'
        )
        
        assert response.status_code == 200
        data = response.get_json()
        assert data['success'] is True
        
        report = data['report']
        assert report['total_days'] == 4
        assert report['present_days'] == 2
        assert report['absent_days'] == 1
        assert report['late_days'] == 1
        assert 'attendance_rate' in report
    
    def test_get_class_attendance_summary(self, auth_client, db):
        """Test getting class-wide attendance summary"""
        # Create test data
        class_obj = Class(name='Summary Class', grade_level='Grade 8', academic_year='2024', capacity=25)
        subject = Subject(name='Art', code='ART08', credits=2)
        db.session.add_all([class_obj, subject])
        db.session.commit()
        
        # Create multiple students
        students = []
        for i in range(4):
            student = Student(
                first_name=f'Summary{i}',
                last_name=f'Test{i}',
                email=f'summary{i}@test.com',
                date_of_birth=date(2010, 1, 1),
                gender='Male' if i % 2 == 0 else 'Female',
                student_id=f'SUM{i:03d}',
                admission_date=date(2024, 1, 15),
                class_id=class_obj.id
            )
            students.append(student)
            db.session.add(student)
        
        db.session.commit()
        
        # Create attendance records for all students
        for student in students:
            for i, status in enumerate(['present', 'present', 'absent', 'late']):
                attendance = Attendance(
                    student_id=student.id,
                    class_id=class_obj.id,
                    subject_id=subject.id,
                    date=date(2024, 3, 15 + i),
                    status=status
                )
                db.session.add(attendance)
        
        db.session.commit()
        
        # Get class summary
        response = auth_client.get(f'/api/v1/classes/{class_obj.id}/attendance-summary')
        
        assert response.status_code == 200
        data = response.get_json()
        assert data['success'] is True
        
        summary = data['summary']
        assert 'total_students' in summary
        assert 'attendance_rate' in summary
        assert 'by_status' in summary


class TestAttendanceValidation:
    """Test attendance validation and error handling"""
    
    def test_invalid_attendance_status(self, auth_client, db):
        """Test marking attendance with invalid status"""
        # Create minimal test data
        class_obj = Class(name='Validation Class', grade_level='Grade 10', academic_year='2024', capacity=30)
        subject = Subject(name='Music', code='MUS10', credits=2)
        db.session.add_all([class_obj, subject])
        db.session.commit()
        
        student = Student(
            first_name='Validation',
            last_name='Test',
            email='validation@test.com',
            date_of_birth=date(2008, 12, 5),
            gender='Male',
            student_id='VAL001',
            admission_date=date(2024, 1, 15),
            class_id=class_obj.id
        )
        db.session.add(student)
        db.session.commit()
        
        # Try to mark attendance with invalid status
        attendance_data = {
            'student_id': student.id,
            'class_id': class_obj.id,
            'subject_id': subject.id,
            'date': '2024-03-15',
            'status': 'invalid_status'
        }
        
        response = auth_client.post('/api/v1/attendances', json=attendance_data)
        
        assert response.status_code == 400
        data = response.get_json()
        assert data['success'] is False
        assert 'errors' in data
    
    def test_future_date_attendance(self, auth_client, db):
        """Test marking attendance for future date"""
        # Create minimal test data
        class_obj = Class(name='Future Class', grade_level='Grade 11', academic_year='2024', capacity=30)
        subject = Subject(name='Drama', code='DRA11', credits=2)
        db.session.add_all([class_obj, subject])
        db.session.commit()
        
        student = Student(
            first_name='Future',
            last_name='Test',
            email='future@test.com',
            date_of_birth=date(2007, 4, 10),
            gender='Female',
            student_id='FUT001',
            admission_date=date(2024, 1, 15),
            class_id=class_obj.id
        )
        db.session.add(student)
        db.session.commit()
        
        # Try to mark attendance for future date
        future_date = (datetime.now() + timedelta(days=7)).strftime('%Y-%m-%d')
        attendance_data = {
            'student_id': student.id,
            'class_id': class_obj.id,
            'subject_id': subject.id,
            'date': future_date,
            'status': 'present'
        }
        
        response = auth_client.post('/api/v1/attendances', json=attendance_data)
        
        assert response.status_code == 400
        data = response.get_json()
        assert data['success'] is False
        assert 'future' in data['errors']['date'][0].lower()
    
    def test_missing_required_fields(self, auth_client, db):
        """Test marking attendance with missing required fields"""
        attendance_data = {
            'student_id': 1,
            # Missing class_id, subject_id, date, status
        }
        
        response = auth_client.post('/api/v1/attendances', json=attendance_data)
        
        assert response.status_code == 400
        data = response.get_json()
        assert data['success'] is False
        assert 'errors' in data
    
    def test_unauthorized_attendance_marking(self, client, db):
        """Test marking attendance without authentication"""
        attendance_data = {
            'student_id': 1,
            'class_id': 1,
            'subject_id': 1,
            'date': '2024-03-15',
            'status': 'present'
        }
        
        response = client.post('/api/v1/attendances', json=attendance_data)
        
        assert response.status_code == 401
        data = response.get_json()
        assert 'token' in data['msg'].lower() or 'authorization' in data['msg'].lower()


class TestAttendanceIntegration:
    """Integration tests for complete attendance workflows"""
    
    def test_complete_attendance_workflow(self, auth_client, db):
        """Test complete attendance management workflow"""
        # 1. Create class and students
        class_obj = Class(name='Workflow Class', grade_level='Grade 12', academic_year='2024', capacity=30)
        subject = Subject(name='Literature', code='LIT12', credits=4)
        db.session.add_all([class_obj, subject])
        db.session.commit()
        
        students = []
        for i in range(3):
            student = Student(
                first_name=f'Workflow{i}',
                last_name=f'Student{i}',
                email=f'workflow{i}@test.com',
                date_of_birth=date(2006, 1, 1),
                gender='Male' if i % 2 == 0 else 'Female',
                student_id=f'WF{i:03d}',
                admission_date=date(2024, 1, 15),
                class_id=class_obj.id
            )
            students.append(student)
            db.session.add(student)
        
        db.session.commit()
        
        # 2. Bulk mark attendance
        bulk_data = {
            'class_id': class_obj.id,
            'subject_id': subject.id,
            'date': '2024-03-15',
            'attendances': [
                {'student_id': students[0].id, 'status': 'present'},
                {'student_id': students[1].id, 'status': 'absent'},
                {'student_id': students[2].id, 'status': 'late'}
            ]
        }
        
        bulk_response = auth_client.post('/api/v1/attendances/bulk', json=bulk_data)
        assert bulk_response.status_code == 201
        
        # 3. Update individual attendance
        attendance = Attendance.query.filter_by(student_id=students[1].id).first()
        update_response = auth_client.put(f'/api/v1/attendances/{attendance.id}', 
                                        json={'status': 'excused', 'remarks': 'Medical appointment'})
        assert update_response.status_code == 200
        
        # 4. Get attendance statistics
        stats_response = auth_client.get(f'/api/v1/attendance/analytics?class_id={class_obj.id}')
        assert stats_response.status_code == 200
        
        # 5. Get student report
        report_response = auth_client.get(f'/api/v1/students/{students[0].id}/attendance-report')
        assert report_response.status_code == 200
        
        # 6. Verify final state
        final_attendances = Attendance.query.filter_by(class_id=class_obj.id).all()
        assert len(final_attendances) == 3
        
        statuses = [att.status for att in final_attendances]
        assert 'present' in statuses
        assert 'excused' in statuses  # Updated from 'absent'
        assert 'late' in statuses
    
    @patch('app.services.attendance_service.logger')
    def test_attendance_error_handling_and_logging(self, mock_logger, auth_client, db):
        """Test error handling and logging in attendance operations"""
        # Test with invalid data that should trigger error logging
        invalid_data = {
            'student_id': 'invalid',  # Should be integer
            'class_id': 1,
            'subject_id': 1,
            'date': '2024-03-15',
            'status': 'present'
        }
        
        response = auth_client.post('/api/v1/attendances', json=invalid_data)
        
        # Should handle the error gracefully
        assert response.status_code == 400
        data = response.get_json()
        assert data['success'] is False