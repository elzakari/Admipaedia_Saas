import pytest
from datetime import date
from app.models.user import User
from app.models.student import Student
from app.models.class_ import Class
from app.models.subject import Subject
from app.models.grading_system import EnhancedGrade, FinalGrade
from app.extensions import db

class TestGradingSystem:
    def test_enter_grades(self, auth_client, db):
        """Test entering grades for a student."""
        # Setup Data
        class_obj = Class(name='Grade 10A', grade_level='Grade 10', academic_year='2024')
        subject = Subject(name='Mathematics', code='MATH10')
        db.session.add_all([class_obj, subject])
        db.session.commit()
        
        student = Student(
            first_name='John', last_name='Doe', email='john@school.com',
            date_of_birth=date(2008, 1, 1), gender='Male', student_id='STU001',
            class_id=class_obj.id
        )
        db.session.add(student)
        db.session.commit()
        
        # Test Data
        grade_data = {
            'student_id': student.id,
            'class_id': class_obj.id,
            'subject_id': subject.id,
            'assessment_type_id': 1, # Mock ID
            'assessment_name': 'Mid-Term Exam',
            'raw_score': 85,
            'total_marks': 100,
            'weight': 0.3,
            'term': 'Term 1',
            'academic_year': '2024'
        }
        
        response = auth_client.post('/api/v1/grades/entry', json=grade_data)
        assert response.status_code == 200
        assert response.json['success'] is True
        
        # Verify DB
        grade = EnhancedGrade.query.filter_by(student_id=student.id).first()
        assert grade is not None
        assert grade.raw_score == 85
        
    def test_bulk_enter_grades(self, auth_client, db):
        """Test bulk grade entry."""
        class_obj = Class(name='Grade 10B', grade_level='Grade 10', academic_year='2024')
        subject = Subject(name='Science', code='SCI10')
        db.session.add_all([class_obj, subject])
        db.session.commit()
        
        s1 = Student(first_name='A', last_name='B', student_id='S1', class_id=class_obj.id)
        s2 = Student(first_name='C', last_name='D', student_id='S2', class_id=class_obj.id)
        db.session.add_all([s1, s2])
        db.session.commit()
        
        grades_data = [
            {
                'student_id': s1.id, 'class_id': class_obj.id, 'subject_id': subject.id,
                'assessment_type_id': 1, 'assessment_name': 'Quiz 1', 'raw_score': 10, 'total_marks': 10,
                'term': 'Term 1', 'academic_year': '2024'
            },
            {
                'student_id': s2.id, 'class_id': class_obj.id, 'subject_id': subject.id,
                'assessment_type_id': 1, 'assessment_name': 'Quiz 1', 'raw_score': 8, 'total_marks': 10,
                'term': 'Term 1', 'academic_year': '2024'
            }
        ]
        
        response = auth_client.post('/api/v1/grades/entry', json=grades_data)
        assert response.status_code == 200
        
        grades = EnhancedGrade.query.all()
        assert len(grades) >= 2

    def test_get_gradebook(self, auth_client, db):
        """Test fetching gradebook."""
        # Re-use setup from previous tests or create new
        # Assuming previous tests ran or DB is clean per test (default pytest-flask-sqlalchemy behavior)
        pass # Implement logic similar to above
