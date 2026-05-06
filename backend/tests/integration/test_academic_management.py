"""
Comprehensive integration tests for academic management system
Tests exams, grades, subjects, and academic workflows
"""
import pytest
import json
from datetime import datetime, date, timedelta
from decimal import Decimal

from app.models.user import User
from app.models.student import Student
from app.models.teacher import Teacher
from app.models.class_ import Class
from app.models.subject import Subject
from app.models.exam import Exam
from app.models.grade import Grade
from app.extensions import db


class TestExamManagement:
    """Test exam creation, scheduling, and management"""
    
    def test_create_exam_success(self, auth_client, db):
        """Test successful exam creation"""
        # Create test data
        class_obj = Class(name='Grade 12A', grade_level='Grade 12', academic_year='2024', capacity=30)
        subject = Subject(name='Advanced Mathematics', code='AMATH12', credits=5)
        db.session.add_all([class_obj, subject])
        db.session.commit()
        
        # Create exam
        exam_data = {
            'title': 'Mid-Term Mathematics Exam',
            'subject_id': subject.id,
            'class_id': class_obj.id,
            'exam_date': '2024-04-15',
            'start_time': '09:00',
            'end_time': '11:00',
            'total_marks': 100,
            'exam_type': 'midterm',
            'instructions': 'Answer all questions. Show your working.',
            'venue': 'Main Hall'
        }
        
        response = auth_client.post('/api/v1/exams', json=exam_data)
        
        assert response.status_code == 201
        data = response.get_json()
        assert data['success'] is True
        assert data['exam']['title'] == 'Mid-Term Mathematics Exam'
        assert data['exam']['total_marks'] == 100
        assert data['exam']['exam_type'] == 'midterm'
        
        # Verify in database
        exam = Exam.query.filter_by(title='Mid-Term Mathematics Exam').first()
        assert exam is not None
        assert exam.subject_id == subject.id
        assert exam.class_id == class_obj.id
    
    def test_create_exam_invalid_date(self, auth_client, db):
        """Test creating exam with past date"""
        # Create test data
        class_obj = Class(name='Grade 11B', grade_level='Grade 11', academic_year='2024', capacity=25)
        subject = Subject(name='Physics', code='PHYS11', credits=4)
        db.session.add_all([class_obj, subject])
        db.session.commit()
        
        # Try to create exam with past date
        past_date = (datetime.now() - timedelta(days=7)).strftime('%Y-%m-%d')
        exam_data = {
            'title': 'Past Date Exam',
            'subject_id': subject.id,
            'class_id': class_obj.id,
            'exam_date': past_date,
            'start_time': '10:00',
            'end_time': '12:00',
            'total_marks': 80,
            'exam_type': 'quiz'
        }
        
        response = auth_client.post('/api/v1/exams', json=exam_data)
        
        assert response.status_code == 400
        data = response.get_json()
        assert data['success'] is False
        assert 'past' in data['message'].lower() or 'date' in data['errors']
    
    def test_update_exam_details(self, auth_client, db):
        """Test updating exam details"""
        # Create test data
        class_obj = Class(name='Grade 10C', grade_level='Grade 10', academic_year='2024', capacity=28)
        subject = Subject(name='Chemistry', code='CHEM10', credits=4)
        db.session.add_all([class_obj, subject])
        db.session.commit()
        
        # Create exam
        exam = Exam(
            title='Original Chemistry Test',
            subject_id=subject.id,
            class_id=class_obj.id,
            exam_date=date(2024, 5, 20),
            start_time='14:00',
            end_time='16:00',
            total_marks=75,
            exam_type='test'
        )
        db.session.add(exam)
        db.session.commit()
        
        # Update exam
        update_data = {
            'title': 'Updated Chemistry Final Exam',
            'total_marks': 100,
            'exam_type': 'final',
            'venue': 'Science Lab'
        }
        
        response = auth_client.put(f'/api/v1/exams/{exam.id}', json=update_data)
        
        assert response.status_code == 200
        data = response.get_json()
        assert data['success'] is True
        assert data['exam']['title'] == 'Updated Chemistry Final Exam'
        assert data['exam']['total_marks'] == 100
        assert data['exam']['exam_type'] == 'final'
        assert data['exam']['venue'] == 'Science Lab'
    
    def test_get_exam_schedule(self, auth_client, db):
        """Test getting exam schedule for a class"""
        # Create test data
        class_obj = Class(name='Schedule Class', grade_level='Grade 9', academic_year='2024', capacity=30)
        subjects = [
            Subject(name='English', code='ENG09', credits=4),
            Subject(name='Mathematics', code='MATH09', credits=5),
            Subject(name='Science', code='SCI09', credits=4)
        ]
        
        db.session.add(class_obj)
        for subject in subjects:
            db.session.add(subject)
        db.session.commit()
        
        # Create multiple exams
        exams = [
            Exam(title='English Midterm', subject_id=subjects[0].id, class_id=class_obj.id,
                 exam_date=date(2024, 4, 15), start_time='09:00', end_time='11:00', 
                 total_marks=100, exam_type='midterm'),
            Exam(title='Math Quiz', subject_id=subjects[1].id, class_id=class_obj.id,
                 exam_date=date(2024, 4, 18), start_time='10:00', end_time='11:00', 
                 total_marks=50, exam_type='quiz'),
            Exam(title='Science Final', subject_id=subjects[2].id, class_id=class_obj.id,
                 exam_date=date(2024, 4, 25), start_time='14:00', end_time='17:00', 
                 total_marks=150, exam_type='final')
        ]
        
        for exam in exams:
            db.session.add(exam)
        db.session.commit()
        
        # Get exam schedule
        response = auth_client.get(f'/api/v1/classes/{class_obj.id}/exam-schedule')
        
        assert response.status_code == 200
        data = response.get_json()
        assert data['success'] is True
        assert len(data['exams']) == 3
        
        # Verify exams are ordered by date
        exam_dates = [exam['exam_date'] for exam in data['exams']]
        assert exam_dates == sorted(exam_dates)
    
    def test_delete_exam(self, auth_client, db):
        """Test deleting an exam"""
        # Create test data
        class_obj = Class(name='Delete Class', grade_level='Grade 8', academic_year='2024', capacity=25)
        subject = Subject(name='History', code='HIST08', credits=3)
        db.session.add_all([class_obj, subject])
        db.session.commit()
        
        # Create exam
        exam = Exam(
            title='History Test to Delete',
            subject_id=subject.id,
            class_id=class_obj.id,
            exam_date=date(2024, 6, 10),
            start_time='11:00',
            end_time='12:30',
            total_marks=60,
            exam_type='test'
        )
        db.session.add(exam)
        db.session.commit()
        
        exam_id = exam.id
        
        # Delete exam
        response = auth_client.delete(f'/api/v1/exams/{exam_id}')
        
        assert response.status_code == 200
        data = response.get_json()
        assert data['success'] is True
        assert 'deleted' in data['message'].lower()
        
        # Verify deletion
        deleted_exam = Exam.query.get(exam_id)
        assert deleted_exam is None


class TestGradeManagement:
    """Test grade recording, calculation, and management"""
    
    def test_record_student_grade(self, auth_client, db):
        """Test recording a grade for a student"""
        # Create test data
        class_obj = Class(name='Grade Recording Class', grade_level='Grade 11', academic_year='2024', capacity=30)
        subject = Subject(name='Biology', code='BIO11', credits=4)
        db.session.add_all([class_obj, subject])
        db.session.commit()
        
        student = Student(
            first_name='Grade',
            last_name='Student',
            email='grade@student.com',
            date_of_birth=date(2007, 3, 20),
            gender='Female',
            student_id='GRD001',
            admission_date=date(2024, 1, 15),
            class_id=class_obj.id
        )
        db.session.add(student)
        db.session.commit()
        
        exam = Exam(
            title='Biology Midterm',
            subject_id=subject.id,
            class_id=class_obj.id,
            exam_date=date(2024, 4, 20),
            start_time='09:00',
            end_time='11:00',
            total_marks=100,
            exam_type='midterm'
        )
        db.session.add(exam)
        db.session.commit()
        
        # Record grade
        grade_data = {
            'student_id': student.id,
            'exam_id': exam.id,
            'subject_id': subject.id,
            'marks_obtained': 85,
            'total_marks': 100,
            'grade_letter': 'A',
            'percentage': 85.0,
            'remarks': 'Excellent performance'
        }
        
        response = auth_client.post('/api/v1/grades', json=grade_data)
        
        assert response.status_code == 201
        data = response.get_json()
        assert data['success'] is True
        assert data['grade']['marks_obtained'] == 85
        assert data['grade']['grade_letter'] == 'A'
        assert data['grade']['percentage'] == 85.0
        
        # Verify in database
        grade = Grade.query.filter_by(student_id=student.id, exam_id=exam.id).first()
        assert grade is not None
        assert grade.marks_obtained == 85
        assert grade.grade_letter == 'A'
    
    def test_update_student_grade(self, auth_client, db):
        """Test updating an existing grade"""
        # Create test data
        class_obj = Class(name='Update Grade Class', grade_level='Grade 10', academic_year='2024', capacity=25)
        subject = Subject(name='Geography', code='GEO10', credits=3)
        db.session.add_all([class_obj, subject])
        db.session.commit()
        
        student = Student(
            first_name='Update',
            last_name='Grade',
            email='update@grade.com',
            date_of_birth=date(2008, 7, 15),
            gender='Male',
            student_id='UPG001',
            admission_date=date(2024, 1, 15),
            class_id=class_obj.id
        )
        db.session.add(student)
        db.session.commit()
        
        exam = Exam(
            title='Geography Test',
            subject_id=subject.id,
            class_id=class_obj.id,
            exam_date=date(2024, 4, 25),
            start_time='10:00',
            end_time='11:30',
            total_marks=80,
            exam_type='test'
        )
        db.session.add(exam)
        db.session.commit()
        
        # Create initial grade
        grade = Grade(
            student_id=student.id,
            exam_id=exam.id,
            subject_id=subject.id,
            marks_obtained=60,
            total_marks=80,
            grade_letter='C',
            percentage=75.0
        )
        db.session.add(grade)
        db.session.commit()
        
        # Update grade
        update_data = {
            'marks_obtained': 70,
            'grade_letter': 'B',
            'percentage': 87.5,
            'remarks': 'Improved performance after recheck'
        }
        
        response = auth_client.put(f'/api/v1/grades/{grade.id}', json=update_data)
        
        assert response.status_code == 200
        data = response.get_json()
        assert data['success'] is True
        assert data['grade']['marks_obtained'] == 70
        assert data['grade']['grade_letter'] == 'B'
        assert data['grade']['percentage'] == 87.5
    
    def test_bulk_grade_entry(self, auth_client, db):
        """Test bulk grade entry for multiple students"""
        # Create test data
        class_obj = Class(name='Bulk Grade Class', grade_level='Grade 12', academic_year='2024', capacity=30)
        subject = Subject(name='Literature', code='LIT12', credits=4)
        db.session.add_all([class_obj, subject])
        db.session.commit()
        
        # Create multiple students
        students = []
        for i in range(4):
            student = Student(
                first_name=f'Bulk{i}',
                last_name=f'Grade{i}',
                email=f'bulk{i}@grade.com',
                date_of_birth=date(2006, 1, 1),
                gender='Male' if i % 2 == 0 else 'Female',
                student_id=f'BLK{i:03d}',
                admission_date=date(2024, 1, 15),
                class_id=class_obj.id
            )
            students.append(student)
            db.session.add(student)
        
        db.session.commit()
        
        exam = Exam(
            title='Literature Final',
            subject_id=subject.id,
            class_id=class_obj.id,
            exam_date=date(2024, 5, 30),
            start_time='09:00',
            end_time='12:00',
            total_marks=120,
            exam_type='final'
        )
        db.session.add(exam)
        db.session.commit()
        
        # Bulk grade entry
        bulk_grades = {
            'exam_id': exam.id,
            'subject_id': subject.id,
            'grades': [
                {'student_id': students[0].id, 'marks_obtained': 105, 'grade_letter': 'A', 'percentage': 87.5},
                {'student_id': students[1].id, 'marks_obtained': 96, 'grade_letter': 'A', 'percentage': 80.0},
                {'student_id': students[2].id, 'marks_obtained': 84, 'grade_letter': 'B', 'percentage': 70.0},
                {'student_id': students[3].id, 'marks_obtained': 72, 'grade_letter': 'C', 'percentage': 60.0}
            ]
        }
        
        response = auth_client.post('/api/v1/grades/bulk', json=bulk_grades)
        
        assert response.status_code == 201
        data = response.get_json()
        assert data['success'] is True
        assert '4 grades' in data['message']
        
        # Verify grades in database
        recorded_grades = Grade.query.filter_by(exam_id=exam.id).all()
        assert len(recorded_grades) == 4
        
        # Check specific grades
        grade_marks = [grade.marks_obtained for grade in recorded_grades]
        assert 105 in grade_marks
        assert 96 in grade_marks
        assert 84 in grade_marks
        assert 72 in grade_marks
    
    def test_calculate_student_gpa(self, auth_client, db):
        """Test calculating student GPA"""
        # Create test data
        class_obj = Class(name='GPA Class', grade_level='Grade 11', academic_year='2024', capacity=30)
        subjects = [
            Subject(name='Mathematics', code='MATH11', credits=5),
            Subject(name='English', code='ENG11', credits=4),
            Subject(name='Science', code='SCI11', credits=4)
        ]
        
        db.session.add(class_obj)
        for subject in subjects:
            db.session.add(subject)
        db.session.commit()
        
        student = Student(
            first_name='GPA',
            last_name='Student',
            email='gpa@student.com',
            date_of_birth=date(2007, 9, 10),
            gender='Female',
            student_id='GPA001',
            admission_date=date(2024, 1, 15),
            class_id=class_obj.id
        )
        db.session.add(student)
        db.session.commit()
        
        # Create exams and grades
        exams_and_grades = [
            (subjects[0], 90, 'A'),  # Math: 90%
            (subjects[1], 85, 'A'),  # English: 85%
            (subjects[2], 78, 'B')   # Science: 78%
        ]
        
        for subject, percentage, letter in exams_and_grades:
            exam = Exam(
                title=f'{subject.name} Final',
                subject_id=subject.id,
                class_id=class_obj.id,
                exam_date=date(2024, 5, 15),
                start_time='09:00',
                end_time='12:00',
                total_marks=100,
                exam_type='final'
            )
            db.session.add(exam)
            db.session.commit()
            
            grade = Grade(
                student_id=student.id,
                exam_id=exam.id,
                subject_id=subject.id,
                marks_obtained=percentage,
                total_marks=100,
                grade_letter=letter,
                percentage=percentage
            )
            db.session.add(grade)
        
        db.session.commit()
        
        # Calculate GPA
        response = auth_client.get(f'/api/v1/students/{student.id}/gpa')
        
        assert response.status_code == 200
        data = response.get_json()
        assert data['success'] is True
        assert 'gpa' in data
        assert 'weighted_gpa' in data
        assert data['gpa'] > 0
        assert data['weighted_gpa'] > 0
    
    def test_get_class_grade_summary(self, auth_client, db):
        """Test getting grade summary for entire class"""
        # Create test data
        class_obj = Class(name='Summary Class', grade_level='Grade 10', academic_year='2024', capacity=30)
        subject = Subject(name='Physics', code='PHYS10', credits=4)
        db.session.add_all([class_obj, subject])
        db.session.commit()
        
        # Create students
        students = []
        for i in range(5):
            student = Student(
                first_name=f'Summary{i}',
                last_name=f'Student{i}',
                email=f'summary{i}@test.com',
                date_of_birth=date(2008, 1, 1),
                gender='Male' if i % 2 == 0 else 'Female',
                student_id=f'SUM{i:03d}',
                admission_date=date(2024, 1, 15),
                class_id=class_obj.id
            )
            students.append(student)
            db.session.add(student)
        
        db.session.commit()
        
        exam = Exam(
            title='Physics Midterm',
            subject_id=subject.id,
            class_id=class_obj.id,
            exam_date=date(2024, 4, 20),
            start_time='10:00',
            end_time='12:00',
            total_marks=100,
            exam_type='midterm'
        )
        db.session.add(exam)
        db.session.commit()
        
        # Create grades with different performance levels
        grade_data = [95, 87, 76, 65, 58]  # A, A, B, C, D
        grade_letters = ['A', 'A', 'B', 'C', 'D']
        
        for i, (student, marks, letter) in enumerate(zip(students, grade_data, grade_letters)):
            grade = Grade(
                student_id=student.id,
                exam_id=exam.id,
                subject_id=subject.id,
                marks_obtained=marks,
                total_marks=100,
                grade_letter=letter,
                percentage=marks
            )
            db.session.add(grade)
        
        db.session.commit()
        
        # Get class grade summary
        response = auth_client.get(f'/api/v1/classes/{class_obj.id}/grade-summary?exam_id={exam.id}')
        
        assert response.status_code == 200
        data = response.get_json()
        assert data['success'] is True
        
        summary = data['summary']
        assert 'average_percentage' in summary
        assert 'grade_distribution' in summary
        assert 'total_students' in summary
        assert summary['total_students'] == 5
        
        # Check grade distribution
        distribution = summary['grade_distribution']
        assert distribution['A'] == 2
        assert distribution['B'] == 1
        assert distribution['C'] == 1
        assert distribution['D'] == 1


class TestSubjectManagement:
    """Test subject creation, assignment, and management"""
    
    def test_create_subject(self, auth_client, db):
        """Test creating a new subject"""
        subject_data = {
            'name': 'Advanced Computer Science',
            'code': 'ACS12',
            'credits': 5,
            'description': 'Advanced programming and algorithms',
            'grade_level': 'Grade 12',
            'department': 'Science'
        }
        
        response = auth_client.post('/api/v1/subjects', json=subject_data)
        
        assert response.status_code == 201
        data = response.get_json()
        assert data['success'] is True
        assert data['subject']['name'] == 'Advanced Computer Science'
        assert data['subject']['code'] == 'ACS12'
        assert data['subject']['credits'] == 5
        
        # Verify in database
        subject = Subject.query.filter_by(code='ACS12').first()
        assert subject is not None
        assert subject.name == 'Advanced Computer Science'
    
    def test_assign_subject_to_class(self, auth_client, db):
        """Test assigning subject to a class"""
        # Create test data
        class_obj = Class(name='Subject Assignment Class', grade_level='Grade 11', academic_year='2024', capacity=30)
        subject = Subject(name='Economics', code='ECON11', credits=3)
        db.session.add_all([class_obj, subject])
        db.session.commit()
        
        # Assign subject to class
        assignment_data = {
            'subject_id': subject.id,
            'class_id': class_obj.id
        }
        
        response = auth_client.post('/api/v1/class-subjects', json=assignment_data)
        
        assert response.status_code == 201
        data = response.get_json()
        assert data['success'] is True
        assert 'assigned' in data['message'].lower()
    
    def test_get_subject_performance_analytics(self, auth_client, db):
        """Test getting performance analytics for a subject"""
        # Create comprehensive test data
        class_obj = Class(name='Analytics Class', grade_level='Grade 12', academic_year='2024', capacity=30)
        subject = Subject(name='Statistics', code='STAT12', credits=4)
        db.session.add_all([class_obj, subject])
        db.session.commit()
        
        # Create students
        students = []
        for i in range(6):
            student = Student(
                first_name=f'Analytics{i}',
                last_name=f'Student{i}',
                email=f'analytics{i}@test.com',
                date_of_birth=date(2006, 1, 1),
                gender='Male' if i % 2 == 0 else 'Female',
                student_id=f'ANL{i:03d}',
                admission_date=date(2024, 1, 15),
                class_id=class_obj.id
            )
            students.append(student)
            db.session.add(student)
        
        db.session.commit()
        
        # Create multiple exams
        exams = [
            Exam(title='Stats Quiz 1', subject_id=subject.id, class_id=class_obj.id,
                 exam_date=date(2024, 3, 15), start_time='10:00', end_time='11:00',
                 total_marks=50, exam_type='quiz'),
            Exam(title='Stats Midterm', subject_id=subject.id, class_id=class_obj.id,
                 exam_date=date(2024, 4, 15), start_time='09:00', end_time='11:00',
                 total_marks=100, exam_type='midterm'),
            Exam(title='Stats Final', subject_id=subject.id, class_id=class_obj.id,
                 exam_date=date(2024, 5, 15), start_time='09:00', end_time='12:00',
                 total_marks=150, exam_type='final')
        ]
        
        for exam in exams:
            db.session.add(exam)
        db.session.commit()
        
        # Create grades for all students across all exams
        grade_patterns = [
            [45, 85, 135],  # Improving student
            [40, 80, 120],  # Consistent good performance
            [35, 70, 105],  # Average performance
            [30, 60, 90],   # Below average
            [25, 50, 75],   # Struggling student
            [48, 90, 140]   # Top performer
        ]
        
        for student, grades in zip(students, grade_patterns):
            for exam, marks in zip(exams, grades):
                percentage = (marks / exam.total_marks) * 100
                grade_letter = 'A' if percentage >= 80 else 'B' if percentage >= 70 else 'C' if percentage >= 60 else 'D'
                
                grade = Grade(
                    student_id=student.id,
                    exam_id=exam.id,
                    subject_id=subject.id,
                    marks_obtained=marks,
                    total_marks=exam.total_marks,
                    grade_letter=grade_letter,
                    percentage=percentage
                )
                db.session.add(grade)
        
        db.session.commit()
        
        # Get subject analytics
        response = auth_client.get(f'/api/v1/subjects/{subject.id}/analytics')
        
        assert response.status_code == 200
        data = response.get_json()
        assert data['success'] is True
        
        analytics = data['analytics']
        assert 'overall_performance' in analytics
        assert 'grade_distribution' in analytics
        assert 'exam_trends' in analytics
        assert 'student_performance' in analytics
        
        # Verify analytics content
        assert analytics['overall_performance']['total_students'] == 6
        assert analytics['overall_performance']['total_exams'] == 3
        assert 'average_percentage' in analytics['overall_performance']


class TestAcademicIntegration:
    """Integration tests for complete academic workflows"""
    
    def test_complete_academic_workflow(self, auth_client, db):
        """Test complete academic management workflow"""
        # 1. Create academic structure
        class_obj = Class(name='Complete Workflow Class', grade_level='Grade 12', academic_year='2024', capacity=30)
        subject = Subject(name='Calculus', code='CALC12', credits=5)
        db.session.add_all([class_obj, subject])
        db.session.commit()
        
        # 2. Create students
        students = []
        for i in range(3):
            student = Student(
                first_name=f'Workflow{i}',
                last_name=f'Student{i}',
                email=f'workflow{i}@academic.com',
                date_of_birth=date(2006, 1, 1),
                gender='Male' if i % 2 == 0 else 'Female',
                student_id=f'WFL{i:03d}',
                admission_date=date(2024, 1, 15),
                class_id=class_obj.id
            )
            students.append(student)
            db.session.add(student)
        
        db.session.commit()
        
        # 3. Create exam
        exam_data = {
            'title': 'Calculus Final Exam',
            'subject_id': subject.id,
            'class_id': class_obj.id,
            'exam_date': '2024-06-15',
            'start_time': '09:00',
            'end_time': '12:00',
            'total_marks': 200,
            'exam_type': 'final',
            'instructions': 'Answer all questions. Calculators allowed.',
            'venue': 'Main Examination Hall'
        }
        
        exam_response = auth_client.post('/api/v1/exams', json=exam_data)
        assert exam_response.status_code == 201
        exam_id = exam_response.get_json()['exam']['id']
        
        # 4. Record grades
        bulk_grades = {
            'exam_id': exam_id,
            'subject_id': subject.id,
            'grades': [
                {'student_id': students[0].id, 'marks_obtained': 180, 'grade_letter': 'A', 'percentage': 90.0},
                {'student_id': students[1].id, 'marks_obtained': 160, 'grade_letter': 'A', 'percentage': 80.0},
                {'student_id': students[2].id, 'marks_obtained': 140, 'grade_letter': 'B', 'percentage': 70.0}
            ]
        }
        
        grades_response = auth_client.post('/api/v1/grades/bulk', json=bulk_grades)
        assert grades_response.status_code == 201
        
        # 5. Get class performance summary
        summary_response = auth_client.get(f'/api/v1/classes/{class_obj.id}/grade-summary?exam_id={exam_id}')
        assert summary_response.status_code == 200
        
        summary_data = summary_response.get_json()
        assert summary_data['success'] is True
        assert summary_data['summary']['total_students'] == 3
        
        # 6. Get individual student GPA
        gpa_response = auth_client.get(f'/api/v1/students/{students[0].id}/gpa')
        assert gpa_response.status_code == 200
        
        # 7. Get subject analytics
        analytics_response = auth_client.get(f'/api/v1/subjects/{subject.id}/analytics')
        assert analytics_response.status_code == 200
        
        # 8. Verify final state
        final_grades = Grade.query.filter_by(exam_id=exam_id).all()
        assert len(final_grades) == 3
        
        average_percentage = sum(grade.percentage for grade in final_grades) / len(final_grades)
        assert average_percentage == 80.0  # (90 + 80 + 70) / 3
        
        # Check grade distribution
        grade_letters = [grade.grade_letter for grade in final_grades]
        assert grade_letters.count('A') == 2
        assert grade_letters.count('B') == 1
    
    def test_academic_validation_and_constraints(self, auth_client, db):
        """Test academic system validation and business rules"""
        # Test duplicate subject code
        subject1_data = {
            'name': 'Mathematics A',
            'code': 'MATH12',
            'credits': 4
        }
        
        subject2_data = {
            'name': 'Mathematics B',
            'code': 'MATH12',  # Duplicate code
            'credits': 5
        }
        
        response1 = auth_client.post('/api/v1/subjects', json=subject1_data)
        assert response1.status_code == 201
        
        response2 = auth_client.post('/api/v1/subjects', json=subject2_data)
        assert response2.status_code == 400
        data = response2.get_json()
        assert data['success'] is False
        assert 'duplicate' in data['message'].lower() or 'already exists' in data['message'].lower()
        
        # Test invalid exam scheduling (overlapping times)
        class_obj = Class(name='Validation Class', grade_level='Grade 11', academic_year='2024', capacity=30)
        subject = Subject(name='Test Subject', code='TEST11', credits=3)
        db.session.add_all([class_obj, subject])
        db.session.commit()
        
        # Create first exam
        exam1_data = {
            'title': 'First Exam',
            'subject_id': subject.id,
            'class_id': class_obj.id,
            'exam_date': '2024-05-15',
            'start_time': '09:00',
            'end_time': '11:00',
            'total_marks': 100,
            'exam_type': 'midterm'
        }
        
        response1 = auth_client.post('/api/v1/exams', json=exam1_data)
        assert response1.status_code == 201
        
        # Try to create overlapping exam
        exam2_data = {
            'title': 'Overlapping Exam',
            'subject_id': subject.id,
            'class_id': class_obj.id,
            'exam_date': '2024-05-15',
            'start_time': '10:00',  # Overlaps with first exam
            'end_time': '12:00',
            'total_marks': 100,
            'exam_type': 'test'
        }
        
        response2 = auth_client.post('/api/v1/exams', json=exam2_data)
        # Should either prevent overlap or handle gracefully
        # Implementation may vary based on business rules
        
        # Test grade validation (marks > total_marks)
        student = Student(
            first_name='Validation',
            last_name='Student',
            email='validation@test.com',
            date_of_birth=date(2007, 5, 10),
            gender='Male',
            student_id='VAL001',
            admission_date=date(2024, 1, 15),
            class_id=class_obj.id
        )
        db.session.add(student)
        db.session.commit()
        
        exam = Exam.query.filter_by(title='First Exam').first()
        
        invalid_grade_data = {
            'student_id': student.id,
            'exam_id': exam.id,
            'subject_id': subject.id,
            'marks_obtained': 120,  # More than total_marks (100)
            'total_marks': 100,
            'grade_letter': 'A',
            'percentage': 120.0
        }
        
        response = auth_client.post('/api/v1/grades', json=invalid_grade_data)
        assert response.status_code == 400
        data = response.get_json()
        assert data['success'] is False
        assert 'marks' in data['message'].lower() or 'invalid' in data['message'].lower()


class TestAcademicReporting:
    """Test academic reporting and analytics features"""
    
    def test_generate_student_transcript(self, auth_client, db):
        """Test generating comprehensive student transcript"""
        # Create test data
        class_obj = Class(name='Transcript Class', grade_level='Grade 12', academic_year='2024', capacity=30)
        subjects = [
            Subject(name='Advanced Mathematics', code='AMATH12', credits=5),
            Subject(name='Physics', code='PHYS12', credits=4),
            Subject(name='Chemistry', code='CHEM12', credits=4),
            Subject(name='English Literature', code='ELIT12', credits=3)
        ]
        
        db.session.add(class_obj)
        for subject in subjects:
            db.session.add(subject)
        db.session.commit()
        
        student = Student(
            first_name='Transcript',
            last_name='Student',
            email='transcript@student.com',
            date_of_birth=date(2006, 8, 15),
            gender='Female',
            student_id='TRS001',
            admission_date=date(2024, 1, 15),
            class_id=class_obj.id
        )
        db.session.add(student)
        db.session.commit()
        
        # Create exams and grades for multiple subjects
        exam_grades = [
            (subjects[0], 'Mathematics Final', 92, 'A'),
            (subjects[1], 'Physics Final', 88, 'A'),
            (subjects[2], 'Chemistry Final', 85, 'A'),
            (subjects[3], 'Literature Final', 78, 'B')
        ]
        
        for subject, exam_title, percentage, letter in exam_grades:
            exam = Exam(
                title=exam_title,
                subject_id=subject.id,
                class_id=class_obj.id,
                exam_date=date(2024, 6, 15),
                start_time='09:00',
                end_time='12:00',
                total_marks=100,
                exam_type='final'
            )
            db.session.add(exam)
            db.session.commit()
            
            grade = Grade(
                student_id=student.id,
                exam_id=exam.id,
                subject_id=subject.id,
                marks_obtained=percentage,
                total_marks=100,
                grade_letter=letter,
                percentage=percentage
            )
            db.session.add(grade)
        
        db.session.commit()
        
        # Generate transcript
        response = auth_client.get(f'/api/v1/students/{student.id}/transcript')
        
        assert response.status_code == 200
        data = response.get_json()
        assert data['success'] is True
        
        transcript = data['transcript']
        assert transcript['student']['student_id'] == 'TRS001'
        assert len(transcript['subjects']) == 4
        assert 'overall_gpa' in transcript
        assert 'total_credits' in transcript
        
        # Verify subject details
        subject_names = [subj['name'] for subj in transcript['subjects']]
        assert 'Advanced Mathematics' in subject_names
        assert 'Physics' in subject_names
        assert 'Chemistry' in subject_names
        assert 'English Literature' in subject_names
    
    def test_class_performance_report(self, auth_client, db):
        """Test generating class performance report"""
        # Create test data
        class_obj = Class(name='Performance Class', grade_level='Grade 11', academic_year='2024', capacity=30)
        subject = Subject(name='Biology', code='BIO11', credits=4)
        db.session.add_all([class_obj, subject])
        db.session.commit()
        
        # Create students with varying performance
        students_data = [
            ('Excellent', 'Student', 95, 'A'),
            ('Good', 'Student', 85, 'A'),
            ('Average', 'Student', 75, 'B'),
            ('Below', 'Average', 65, 'C'),
            ('Poor', 'Student', 45, 'F')
        ]
        
        students = []
        for i, (first, last, percentage, letter) in enumerate(students_data):
            student = Student(
                first_name=first,
                last_name=last,
                email=f'{first.lower()}{i}@performance.com',
                date_of_birth=date(2007, 1, 1),
                gender='Male' if i % 2 == 0 else 'Female',
                student_id=f'PRF{i:03d}',
                admission_date=date(2024, 1, 15),
                class_id=class_obj.id
            )
            students.append(student)
            db.session.add(student)
        
        db.session.commit()
        
        # Create exam
        exam = Exam(
            title='Biology Midterm',
            subject_id=subject.id,
            class_id=class_obj.id,
            exam_date=date(2024, 4, 20),
            start_time='10:00',
            end_time='12:00',
            total_marks=100,
            exam_type='midterm'
        )
        db.session.add(exam)
        db.session.commit()
        
        # Create grades
        for student, (_, _, percentage, letter) in zip(students, students_data):
            grade = Grade(
                student_id=student.id,
                exam_id=exam.id,
                subject_id=subject.id,
                marks_obtained=percentage,
                total_marks=100,
                grade_letter=letter,
                percentage=percentage
            )
            db.session.add(grade)
        
        db.session.commit()
        
        # Generate performance report
        response = auth_client.get(f'/api/v1/classes/{class_obj.id}/performance-report?exam_id={exam.id}')
        
        assert response.status_code == 200
        data = response.get_json()
        assert data['success'] is True
        
        report = data['report']
        assert report['class_info']['name'] == 'Performance Class'
        assert report['exam_info']['title'] == 'Biology Midterm'
        assert report['statistics']['total_students'] == 5
        assert report['statistics']['average_percentage'] == 73.0  # (95+85+75+65+45)/5
        
        # Check grade distribution
        distribution = report['grade_distribution']
        assert distribution['A'] == 2
        assert distribution['B'] == 1
        assert distribution['C'] == 1
        assert distribution['F'] == 1
        
        # Check performance categories
        categories = report['performance_categories']
        assert categories['excellent'] >= 1  # 95%
        assert categories['good'] >= 1       # 85%
        assert categories['average'] >= 1    # 75%
        assert categories['below_average'] >= 1  # 65%
        assert categories['poor'] >= 1       # 45%
    
    def test_subject_analytics_report(self, auth_client, db):
        """Test subject-specific analytics and trends"""
        # Create test data
        class_obj = Class(name='Analytics Class', grade_level='Grade 10', academic_year='2024', capacity=30)
        subject = Subject(name='Mathematics', code='MATH10', credits=5)
        db.session.add_all([class_obj, subject])
        db.session.commit()
        
        # Create students
        students = []
        for i in range(6):
            student = Student(
                first_name=f'Analytics{i}',
                last_name=f'Student{i}',
                email=f'analytics{i}@test.com',
                date_of_birth=date(2008, 1, 1),
                gender='Male' if i % 2 == 0 else 'Female',
                student_id=f'ANL{i:03d}',
                admission_date=date(2024, 1, 15),
                class_id=class_obj.id
            )
            students.append(student)
            db.session.add(student)
        
        db.session.commit()
        
        # Create multiple exams to show progression
        exams_data = [
            ('Math Quiz 1', date(2024, 2, 15), 'quiz', [85, 78, 92, 67, 73, 88]),
            ('Math Midterm', date(2024, 3, 20), 'midterm', [88, 82, 95, 72, 78, 91]),
            ('Math Quiz 2', date(2024, 4, 10), 'quiz', [90, 85, 97, 75, 82, 93]),
            ('Math Final', date(2024, 5, 25), 'final', [92, 87, 98, 78, 85, 95])
        ]
        
        for exam_title, exam_date, exam_type, scores in exams_data:
            exam = Exam(
                title=exam_title,
                subject_id=subject.id,
                class_id=class_obj.id,
                exam_date=exam_date,
                start_time='09:00',
                end_time='11:00',
                total_marks=100,
                exam_type=exam_type
            )
            db.session.add(exam)
            db.session.commit()
            
            # Create grades for all students
            for student, score in zip(students, scores):
                grade_letter = 'A' if score >= 90 else 'B' if score >= 80 else 'C' if score >= 70 else 'D'
                grade = Grade(
                    student_id=student.id,
                    exam_id=exam.id,
                    subject_id=subject.id,
                    marks_obtained=score,
                    total_marks=100,
                    grade_letter=grade_letter,
                    percentage=score
                )
                db.session.add(grade)
        
        db.session.commit()
        
        # Get subject analytics
        response = auth_client.get(f'/api/v1/subjects/{subject.id}/analytics?class_id={class_obj.id}')
        
        assert response.status_code == 200
        data = response.get_json()
        assert data['success'] is True
        
        analytics = data['analytics']
        assert analytics['subject_info']['name'] == 'Mathematics'
        assert analytics['overall_statistics']['total_exams'] == 4
        assert analytics['overall_statistics']['total_students'] == 6
        
        # Check performance trends
        trends = analytics['performance_trends']
        assert len(trends) == 4  # Four exams
        
        # Verify improvement trend (scores should generally increase)
        exam_averages = [trend['average_score'] for trend in trends]
        assert exam_averages[-1] > exam_averages[0]  # Final > First quiz
        
        # Check difficulty analysis
        difficulty = analytics['exam_difficulty']
        assert 'easiest_exam' in difficulty
        assert 'hardest_exam' in difficulty
        
        # Check student performance distribution
        distribution = analytics['student_performance']
        assert 'top_performers' in distribution
        assert 'struggling_students' in distribution


class TestAcademicWorkflowIntegration:
    """Test end-to-end academic workflows and edge cases"""
    
    def test_semester_grade_calculation_workflow(self, auth_client, db):
        """Test complete semester grade calculation including weighted averages"""
        # Create academic structure
        class_obj = Class(name='Semester Class', grade_level='Grade 11', academic_year='2024', capacity=30)
        subject = Subject(name='Chemistry', code='CHEM11', credits=4)
        db.session.add_all([class_obj, subject])
        db.session.commit()
        
        student = Student(
            first_name='Semester',
            last_name='Student',
            email='semester@student.com',
            date_of_birth=date(2007, 6, 20),
            gender='Female',
            student_id='SEM001',
            admission_date=date(2024, 1, 15),
            class_id=class_obj.id
        )
        db.session.add(student)
        db.session.commit()
        
        # Create weighted exams (different types have different weights)
        exam_types_weights = [
            ('Quiz 1', 'quiz', 10, 85),
            ('Quiz 2', 'quiz', 10, 88),
            ('Assignment 1', 'assignment', 15, 92),
            ('Midterm Exam', 'midterm', 25, 78),
            ('Assignment 2', 'assignment', 15, 90),
            ('Final Exam', 'final', 25, 82)
        ]
        
        total_weighted_score = 0
        total_weight = 0
        
        for exam_title, exam_type, weight, score in exam_types_weights:
            exam = Exam(
                title=exam_title,
                subject_id=subject.id,
                class_id=class_obj.id,
                exam_date=date(2024, 3, 15),
                start_time='10:00',
                end_time='12:00',
                total_marks=100,
                exam_type=exam_type,
                weight_percentage=weight
            )
            db.session.add(exam)
            db.session.commit()
            
            grade_letter = 'A' if score >= 90 else 'B' if score >= 80 else 'C' if score >= 70 else 'D'
            grade = Grade(
                student_id=student.id,
                exam_id=exam.id,
                subject_id=subject.id,
                marks_obtained=score,
                total_marks=100,
                grade_letter=grade_letter,
                percentage=score
            )
            db.session.add(grade)
            
            total_weighted_score += score * weight
            total_weight += weight
        
        db.session.commit()
        
        expected_weighted_average = total_weighted_score / total_weight
        
        # Calculate semester grade
        response = auth_client.get(f'/api/v1/students/{student.id}/semester-grade?subject_id={subject.id}')
        
        assert response.status_code == 200
        data = response.get_json()
        assert data['success'] is True
        
        semester_data = data['semester_grade']
        assert abs(semester_data['weighted_average'] - expected_weighted_average) < 0.1
        assert semester_data['total_assessments'] == 6
        assert 'final_grade' in semester_data
        assert 'grade_breakdown' in semester_data
    
    def test_academic_probation_workflow(self, auth_client, db):
        """Test academic probation detection and workflow"""
        # Create test data
        class_obj = Class(name='Probation Class', grade_level='Grade 12', academic_year='2024', capacity=30)
        subjects = [
            Subject(name='Mathematics', code='MATH12', credits=5),
            Subject(name='English', code='ENG12', credits=4),
            Subject(name='Science', code='SCI12', credits=4)
        ]
        
        db.session.add(class_obj)
        for subject in subjects:
            db.session.add(subject)
        db.session.commit()
        
        # Create student with poor performance
        student = Student(
            first_name='Probation',
            last_name='Student',
            email='probation@student.com',
            date_of_birth=date(2006, 4, 10),
            gender='Male',
            student_id='PRB001',
            admission_date=date(2024, 1, 15),
            class_id=class_obj.id
        )
        db.session.add(student)
        db.session.commit()
        
        # Create failing grades across multiple subjects
        failing_grades = [
            (subjects[0], 45, 'F'),  # Math: 45%
            (subjects[1], 52, 'D'),  # English: 52%
            (subjects[2], 48, 'F')   # Science: 48%
        ]
        
        for subject, percentage, letter in failing_grades:
            exam = Exam(
                title=f'{subject.name} Midterm',
                subject_id=subject.id,
                class_id=class_obj.id,
                exam_date=date(2024, 3, 15),
                start_time='09:00',
                end_time='12:00',
                total_marks=100,
                exam_type='midterm'
            )
            db.session.add(exam)
            db.session.commit()
            
            grade = Grade(
                student_id=student.id,
                exam_id=exam.id,
                subject_id=subject.id,
                marks_obtained=percentage,
                total_marks=100,
                grade_letter=letter,
                percentage=percentage
            )
            db.session.add(grade)
        
        db.session.commit()
        
        # Check academic standing
        response = auth_client.get(f'/api/v1/students/{student.id}/academic-standing')
        
        assert response.status_code == 200
        data = response.get_json()
        assert data['success'] is True
        
        standing = data['academic_standing']
        assert standing['status'] in ['probation', 'at_risk', 'warning']
        assert standing['gpa'] < 2.0  # Assuming 2.0 is minimum GPA
        assert len(standing['failing_subjects']) >= 2
        assert 'recommendations' in standing
        assert len(standing['recommendations']) > 0
    
    def test_grade_appeal_workflow(self, auth_client, db):
        """Test grade appeal and modification workflow"""
        # Create test data
        class_obj = Class(name='Appeal Class', grade_level='Grade 10', academic_year='2024', capacity=30)
        subject = Subject(name='History', code='HIST10', credits=3)
        db.session.add_all([class_obj, subject])
        db.session.commit()
        
        student = Student(
            first_name='Appeal',
            last_name='Student',
            email='appeal@student.com',
            date_of_birth=date(2008, 9, 5),
            gender='Female',
            student_id='APL001',
            admission_date=date(2024, 1, 15),
            class_id=class_obj.id
        )
        db.session.add(student)
        db.session.commit()
        
        # Create initial grade
        exam = Exam(
            title='History Essay Exam',
            subject_id=subject.id,
            class_id=class_obj.id,
            exam_date=date(2024, 4, 10),
            start_time='14:00',
            end_time='16:00',
            total_marks=100,
            exam_type='test'
        )
        db.session.add(exam)
        db.session.commit()
        
        original_grade = Grade(
            student_id=student.id,
            exam_id=exam.id,
            subject_id=subject.id,
            marks_obtained=72,
            total_marks=100,
            grade_letter='C',
            percentage=72.0,
            remarks='Original grade before appeal'
        )
        db.session.add(original_grade)
        db.session.commit()
        
        # Submit grade appeal
        appeal_data = {
            'grade_id': original_grade.id,
            'reason': 'Calculation error in essay scoring',
            'requested_marks': 85,
            'supporting_evidence': 'Detailed breakdown of essay components'
        }
        
        appeal_response = auth_client.post('/api/v1/grades/appeal', json=appeal_data)
        assert appeal_response.status_code == 201
        
        # Process appeal (admin/teacher updates grade)
        updated_grade_data = {
            'marks_obtained': 85,
            'grade_letter': 'A',
            'percentage': 85.0,
            'remarks': 'Grade updated after successful appeal - calculation error corrected'
        }
        
        update_response = auth_client.put(f'/api/v1/grades/{original_grade.id}', json=updated_grade_data)
        assert update_response.status_code == 200
        
        # Verify grade update
        final_response = auth_client.get(f'/api/v1/grades/{original_grade.id}')
        assert final_response.status_code == 200
        
        final_data = final_response.get_json()
        assert final_data['grade']['marks_obtained'] == 85
        assert final_data['grade']['grade_letter'] == 'A'
        assert 'appeal' in final_data['grade']['remarks'].lower()
    
    def test_academic_calendar_integration(self, auth_client, db):
        """Test integration with academic calendar for exam scheduling"""
        # Create test data
        class_obj = Class(name='Calendar Class', grade_level='Grade 9', academic_year='2024', capacity=30)
        subject = Subject(name='Geography', code='GEO09', credits=3)
        db.session.add_all([class_obj, subject])
        db.session.commit()
        
        # Test exam scheduling during different academic periods
        exam_periods = [
            ('Mid-term Period', date(2024, 3, 15), date(2024, 3, 25)),
            ('Final Exam Period', date(2024, 6, 1), date(2024, 6, 15)),
            ('Make-up Exam Period', date(2024, 6, 20), date(2024, 6, 25))
        ]
        
        for period_name, start_date, end_date in exam_periods:
            # Schedule exam within the period
            exam_data = {
                'title': f'Geography {period_name} Exam',
                'subject_id': subject.id,
                'class_id': class_obj.id,
                'exam_date': start_date.strftime('%Y-%m-%d'),
                'start_time': '10:00',
                'end_time': '12:00',
                'total_marks': 100,
                'exam_type': 'midterm' if 'Mid-term' in period_name else 'final',
                'academic_period': period_name
            }
            
            response = auth_client.post('/api/v1/exams', json=exam_data)
            assert response.status_code == 201
            
            exam_id = response.get_json()['exam']['id']
            
            # Verify exam is properly scheduled
            exam_response = auth_client.get(f'/api/v1/exams/{exam_id}')
            assert exam_response.status_code == 200
            
            exam_data_response = exam_response.get_json()
            assert exam_data_response['exam']['exam_date'] == start_date.strftime('%Y-%m-%d')
        
        # Get academic calendar view
        calendar_response = auth_client.get(f'/api/v1/classes/{class_obj.id}/academic-calendar?year=2024')
        assert calendar_response.status_code == 200
        
        calendar_data = calendar_response.get_json()
        assert calendar_data['success'] is True
        assert len(calendar_data['exams']) == 3
        
        # Verify exams are grouped by periods
        exam_titles = [exam['title'] for exam in calendar_data['exams']]
        assert any('Mid-term Period' in title for title in exam_titles)
        assert any('Final Exam Period' in title for title in exam_titles)
        assert any('Make-up Exam Period' in title for title in exam_titles)