"""
Integration tests for student management workflow
Tests CRUD operations, class assignment, and related functionality
"""
import pytest
import json
from datetime import datetime, date

from app.models.user import User
from app.models.student import Student
from app.models.class_ import Class
from app.models.subject import Subject
from app.extensions import db


class TestStudentCRUDOperations:
    """Test Create, Read, Update, Delete operations for students"""
    
    def test_create_student_complete_workflow(self, auth_client, db):
        """Test complete student creation workflow"""
        # Create a class first
        class_data = {
            'name': 'Grade 10A',
            'grade_level': 'Grade 10',
            'academic_year': '2024',
            'capacity': 30
        }
        class_response = auth_client.post('/api/v1/classes', json=class_data)
        assert class_response.status_code == 201
        class_id = class_response.get_json()['class']['id']
        
        # Create student
        student_data = {
            'first_name': 'John',
            'last_name': 'Doe',
            'email': 'john.doe@student.com',
            'date_of_birth': '2008-05-15',
            'gender': 'Male',
            'phone_number': '+233123456789',
            'address': '123 Main St, Accra',
            'class_id': class_id,
            'student_id': 'STU2024001',
            'admission_date': '2024-01-15',
            'guardian_name': 'Jane Doe',
            'guardian_phone': '+233987654321',
            'guardian_email': 'jane.doe@parent.com'
        }
        
        response = auth_client.post('/api/v1/students', json=student_data)
        
        assert response.status_code == 201
        data = response.get_json()
        assert data['success'] is True
        assert data['student']['first_name'] == 'John'
        assert data['student']['last_name'] == 'Doe'
        assert data['student']['student_id'] == 'STU2024001'
        assert data['student']['class_id'] == class_id
        
        # Verify student was created in database
        student = Student.query.filter_by(student_id='STU2024001').first()
        assert student is not None
        assert student.first_name == 'John'
        assert student.class_id == class_id
    
    def test_read_student_details(self, auth_client, db):
        """Test reading student details"""
        # Create student first
        student = Student(
            first_name='Alice',
            last_name='Smith',
            email='alice.smith@student.com',
            date_of_birth=date(2008, 3, 20),
            gender='Female',
            student_id='STU2024002',
            admission_date=date(2024, 1, 15)
        )
        db.session.add(student)
        db.session.commit()
        
        # Read student
        response = auth_client.get(f'/api/v1/students/{student.id}')
        
        assert response.status_code == 200
        data = response.get_json()
        assert data['success'] is True
        assert data['student']['first_name'] == 'Alice'
        assert data['student']['last_name'] == 'Smith'
        assert data['student']['student_id'] == 'STU2024002'
    
    def test_update_student_information(self, auth_client, db):
        """Test updating student information"""
        # Create student first
        student = Student(
            first_name='Bob',
            last_name='Johnson',
            email='bob.johnson@student.com',
            date_of_birth=date(2008, 7, 10),
            gender='Male',
            student_id='STU2024003',
            admission_date=date(2024, 1, 15)
        )
        db.session.add(student)
        db.session.commit()
        
        # Update student
        update_data = {
            'first_name': 'Robert',
            'phone_number': '+233111222333',
            'address': '456 Oak Ave, Kumasi'
        }
        
        response = auth_client.put(f'/api/v1/students/{student.id}', json=update_data)
        
        assert response.status_code == 200
        data = response.get_json()
        assert data['success'] is True
        assert data['student']['first_name'] == 'Robert'
        assert data['student']['phone_number'] == '+233111222333'
        
        # Verify update in database
        updated_student = Student.query.get(student.id)
        assert updated_student.first_name == 'Robert'
        assert updated_student.phone_number == '+233111222333'
    
    def test_delete_student(self, auth_client, db):
        """Test deleting a student"""
        # Create student first
        student = Student(
            first_name='Charlie',
            last_name='Brown',
            email='charlie.brown@student.com',
            date_of_birth=date(2008, 12, 25),
            gender='Male',
            student_id='STU2024004',
            admission_date=date(2024, 1, 15)
        )
        db.session.add(student)
        db.session.commit()
        student_id = student.id
        
        # Delete student
        response = auth_client.delete(f'/api/v1/students/{student_id}')
        
        assert response.status_code == 200
        data = response.get_json()
        assert data['success'] is True
        
        # Verify deletion in database
        deleted_student = Student.query.get(student_id)
        assert deleted_student is None
    
    def test_list_students_with_pagination(self, auth_client, db):
        """Test listing students with pagination"""
        # Create multiple students
        students = []
        for i in range(15):
            student = Student(
                first_name=f'Student{i}',
                last_name=f'Test{i}',
                email=f'student{i}@test.com',
                date_of_birth=date(2008, 1, 1),
                gender='Male' if i % 2 == 0 else 'Female',
                student_id=f'STU202400{i:02d}',
                admission_date=date(2024, 1, 15)
            )
            students.append(student)
            db.session.add(student)
        
        db.session.commit()
        
        # Test pagination
        response = auth_client.get('/api/v1/students?page=1&per_page=10')
        
        assert response.status_code == 200
        data = response.get_json()
        assert data['success'] is True
        assert len(data['students']) == 10
        assert data['pagination']['page'] == 1
        assert data['pagination']['total'] >= 15


class TestStudentClassAssignment:
    """Test student class assignment functionality"""
    
    def test_assign_student_to_class(self, auth_client, db):
        """Test assigning a student to a class"""
        # Create class
        class_obj = Class(
            name='Grade 11B',
            grade_level='Grade 11',
            academic_year='2024',
            capacity=25
        )
        db.session.add(class_obj)
        db.session.commit()
        
        # Create student without class
        student = Student(
            first_name='David',
            last_name='Wilson',
            email='david.wilson@student.com',
            date_of_birth=date(2007, 4, 18),
            gender='Male',
            student_id='STU2024005',
            admission_date=date(2024, 1, 15)
        )
        db.session.add(student)
        db.session.commit()
        
        # Assign student to class
        response = auth_client.put(f'/api/v1/students/{student.id}/assign-class', 
                                 json={'class_id': class_obj.id})
        
        assert response.status_code == 200
        data = response.get_json()
        assert data['success'] is True
        assert data['student']['class_id'] == class_obj.id
        
        # Verify assignment in database
        updated_student = Student.query.get(student.id)
        assert updated_student.class_id == class_obj.id
    
    def test_transfer_student_between_classes(self, auth_client, db):
        """Test transferring student from one class to another"""
        # Create two classes
        class1 = Class(name='Grade 9A', grade_level='Grade 9', academic_year='2024', capacity=30)
        class2 = Class(name='Grade 9B', grade_level='Grade 9', academic_year='2024', capacity=30)
        db.session.add_all([class1, class2])
        db.session.commit()
        
        # Create student in first class
        student = Student(
            first_name='Emma',
            last_name='Davis',
            email='emma.davis@student.com',
            date_of_birth=date(2009, 8, 12),
            gender='Female',
            student_id='STU2024006',
            admission_date=date(2024, 1, 15),
            class_id=class1.id
        )
        db.session.add(student)
        db.session.commit()
        
        # Transfer to second class
        response = auth_client.put(f'/api/v1/students/{student.id}/assign-class',
                                 json={'class_id': class2.id})
        
        assert response.status_code == 200
        data = response.get_json()
        assert data['success'] is True
        assert data['student']['class_id'] == class2.id
        
        # Verify transfer in database
        updated_student = Student.query.get(student.id)
        assert updated_student.class_id == class2.id
    
    def test_assign_to_full_class_fails(self, auth_client, db):
        """Test that assignment to full class fails"""
        # Create class with capacity 1
        class_obj = Class(
            name='Small Class',
            grade_level='Grade 10',
            academic_year='2024',
            capacity=1
        )
        db.session.add(class_obj)
        db.session.commit()
        
        # Create and assign first student
        student1 = Student(
            first_name='First',
            last_name='Student',
            email='first@student.com',
            date_of_birth=date(2008, 1, 1),
            gender='Male',
            student_id='STU2024007',
            admission_date=date(2024, 1, 15),
            class_id=class_obj.id
        )
        db.session.add(student1)
        db.session.commit()
        
        # Create second student
        student2 = Student(
            first_name='Second',
            last_name='Student',
            email='second@student.com',
            date_of_birth=date(2008, 1, 1),
            gender='Female',
            student_id='STU2024008',
            admission_date=date(2024, 1, 15)
        )
        db.session.add(student2)
        db.session.commit()
        
        # Try to assign second student to full class
        response = auth_client.put(f'/api/v1/students/{student2.id}/assign-class',
                                 json={'class_id': class_obj.id})
        
        assert response.status_code == 400
        data = response.get_json()
        assert data['success'] is False
        assert 'capacity' in data['message'].lower()


class TestStudentSubjectEnrollment:
    """Test student subject enrollment functionality"""
    
    def test_enroll_student_in_subjects(self, auth_client, db):
        """Test enrolling student in subjects"""
        # Create class and subjects
        class_obj = Class(name='Grade 12A', grade_level='Grade 12', academic_year='2024', capacity=30)
        subject1 = Subject(name='Mathematics', code='MATH12', credits=4)
        subject2 = Subject(name='Physics', code='PHYS12', credits=4)
        
        db.session.add_all([class_obj, subject1, subject2])
        db.session.commit()
        
        # Create student
        student = Student(
            first_name='Grace',
            last_name='Miller',
            email='grace.miller@student.com',
            date_of_birth=date(2006, 11, 30),
            gender='Female',
            student_id='STU2024009',
            admission_date=date(2024, 1, 15),
            class_id=class_obj.id
        )
        db.session.add(student)
        db.session.commit()
        
        # Enroll in subjects
        response = auth_client.post(f'/api/v1/students/{student.id}/enroll-subjects',
                                  json={'subject_ids': [subject1.id, subject2.id]})
        
        assert response.status_code == 200
        data = response.get_json()
        assert data['success'] is True
        assert len(data['enrolled_subjects']) == 2
    
    def test_get_student_subjects(self, auth_client, db):
        """Test getting student's enrolled subjects"""
        # Create student with subjects (setup similar to above)
        class_obj = Class(name='Grade 11C', grade_level='Grade 11', academic_year='2024', capacity=30)
        subject = Subject(name='Chemistry', code='CHEM11', credits=4)
        
        db.session.add_all([class_obj, subject])
        db.session.commit()
        
        student = Student(
            first_name='Henry',
            last_name='Taylor',
            email='henry.taylor@student.com',
            date_of_birth=date(2007, 2, 14),
            gender='Male',
            student_id='STU2024010',
            admission_date=date(2024, 1, 15),
            class_id=class_obj.id
        )
        db.session.add(student)
        db.session.commit()
        
        # Manually add subject enrollment (assuming relationship exists)
        student.subjects.append(subject)
        db.session.commit()
        
        # Get student subjects
        response = auth_client.get(f'/api/v1/students/{student.id}/subjects')
        
        assert response.status_code == 200
        data = response.get_json()
        assert data['success'] is True
        assert len(data['subjects']) == 1
        assert data['subjects'][0]['name'] == 'Chemistry'


class TestStudentValidation:
    """Test student data validation"""
    
    def test_create_student_invalid_email(self, auth_client, db):
        """Test creating student with invalid email"""
        student_data = {
            'first_name': 'Invalid',
            'last_name': 'Email',
            'email': 'invalid-email-format',
            'date_of_birth': '2008-01-01',
            'gender': 'Male',
            'student_id': 'STU2024011',
            'admission_date': '2024-01-15'
        }
        
        response = auth_client.post('/api/v1/students', json=student_data)
        
        assert response.status_code == 400
        data = response.get_json()
        assert data['success'] is False
        assert 'email' in data['message'].lower()
    
    def test_create_student_duplicate_student_id(self, auth_client, db):
        """Test creating student with duplicate student ID"""
        # Create first student
        student1 = Student(
            first_name='First',
            last_name='Duplicate',
            email='first@duplicate.com',
            date_of_birth=date(2008, 1, 1),
            gender='Male',
            student_id='DUPLICATE001',
            admission_date=date(2024, 1, 15)
        )
        db.session.add(student1)
        db.session.commit()
        
        # Try to create second student with same ID
        student_data = {
            'first_name': 'Second',
            'last_name': 'Duplicate',
            'email': 'second@duplicate.com',
            'date_of_birth': '2008-01-01',
            'gender': 'Female',
            'student_id': 'DUPLICATE001',
            'admission_date': '2024-01-15'
        }
        
        response = auth_client.post('/api/v1/students', json=student_data)
        
        assert response.status_code == 400
        data = response.get_json()
        assert data['success'] is False
        assert 'student_id' in data['message'].lower()
    
    def test_create_student_future_birth_date(self, auth_client, db):
        """Test creating student with future birth date"""
        from datetime import datetime, timedelta
        future_date = (datetime.now() + timedelta(days=365)).strftime('%Y-%m-%d')
        
        student_data = {
            'first_name': 'Future',
            'last_name': 'Born',
            'email': 'future@born.com',
            'date_of_birth': future_date,
            'gender': 'Male',
            'student_id': 'STU2024012',
            'admission_date': '2024-01-15'
        }
        
        response = auth_client.post('/api/v1/students', json=student_data)
        
        assert response.status_code == 400
        data = response.get_json()
        assert data['success'] is False
        assert 'birth' in data['message'].lower()


class TestStudentSearch:
    """Test student search functionality"""
    
    def test_search_students_by_name(self, auth_client, db):
        """Test searching students by name"""
        # Create test students
        students = [
            Student(first_name='John', last_name='Smith', email='john.smith@test.com',
                   date_of_birth=date(2008, 1, 1), gender='Male', student_id='SEARCH001',
                   admission_date=date(2024, 1, 15)),
            Student(first_name='Jane', last_name='Smith', email='jane.smith@test.com',
                   date_of_birth=date(2008, 1, 1), gender='Female', student_id='SEARCH002',
                   admission_date=date(2024, 1, 15)),
            Student(first_name='Bob', last_name='Johnson', email='bob.johnson@test.com',
                   date_of_birth=date(2008, 1, 1), gender='Male', student_id='SEARCH003',
                   admission_date=date(2024, 1, 15))
        ]
        
        for student in students:
            db.session.add(student)
        db.session.commit()
        
        # Search by first name
        response = auth_client.get('/api/v1/students/search?q=John')
        
        assert response.status_code == 200
        data = response.get_json()
        assert data['success'] is True
        assert len(data['students']) >= 1
        assert any(student['first_name'] == 'John' for student in data['students'])
    
    def test_search_students_by_student_id(self, auth_client, db):
        """Test searching students by student ID"""
        # Create test student
        student = Student(
            first_name='Search',
            last_name='ByID',
            email='search.byid@test.com',
            date_of_birth=date(2008, 1, 1),
            gender='Male',
            student_id='UNIQUE123',
            admission_date=date(2024, 1, 15)
        )
        db.session.add(student)
        db.session.commit()
        
        # Search by student ID
        response = auth_client.get('/api/v1/students/search?q=UNIQUE123')
        
        assert response.status_code == 200
        data = response.get_json()
        assert data['success'] is True
        assert len(data['students']) == 1
        assert data['students'][0]['student_id'] == 'UNIQUE123'


class TestStudentBulkOperations:
    """Test bulk operations on students"""
    
    def test_bulk_import_students(self, auth_client, db):
        """Test bulk importing students"""
        # Create class for students
        class_obj = Class(name='Import Class', grade_level='Grade 10', academic_year='2024', capacity=50)
        db.session.add(class_obj)
        db.session.commit()
        
        # Bulk import data
        import_data = {
            'students': [
                {
                    'first_name': 'Bulk1',
                    'last_name': 'Import1',
                    'email': 'bulk1@import.com',
                    'date_of_birth': '2008-01-01',
                    'gender': 'Male',
                    'student_id': 'BULK001',
                    'admission_date': '2024-01-15',
                    'class_id': class_obj.id
                },
                {
                    'first_name': 'Bulk2',
                    'last_name': 'Import2',
                    'email': 'bulk2@import.com',
                    'date_of_birth': '2008-01-02',
                    'gender': 'Female',
                    'student_id': 'BULK002',
                    'admission_date': '2024-01-15',
                    'class_id': class_obj.id
                }
            ]
        }
        
        response = auth_client.post('/api/v1/students/bulk-import', json=import_data)
        
        assert response.status_code == 201
        data = response.get_json()
        assert data['success'] is True
        assert data['imported_count'] == 2
        
        # Verify students were created
        imported_students = Student.query.filter(Student.student_id.in_(['BULK001', 'BULK002'])).all()
        assert len(imported_students) == 2
    
    def test_bulk_update_students(self, auth_client, db):
        """Test bulk updating students"""
        # Create test students
        students = []
        for i in range(3):
            student = Student(
                first_name=f'BulkUpdate{i}',
                last_name=f'Test{i}',
                email=f'bulkupdate{i}@test.com',
                date_of_birth=date(2008, 1, 1),
                gender='Male',
                student_id=f'BULKUP00{i}',
                admission_date=date(2024, 1, 15)
            )
            students.append(student)
            db.session.add(student)
        
        db.session.commit()
        
        # Bulk update
        update_data = {
            'student_ids': [s.id for s in students],
            'updates': {
                'address': '123 Bulk Update Street'
            }
        }
        
        response = auth_client.put('/api/v1/students/bulk-update', json=update_data)
        
        assert response.status_code == 200
        data = response.get_json()
        assert data['success'] is True
        assert data['updated_count'] == 3
        
        # Verify updates
        for student in students:
            updated_student = Student.query.get(student.id)
            assert updated_student.address == '123 Bulk Update Street'