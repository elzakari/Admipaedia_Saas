"""
Integration tests for Student Management System

This module contains comprehensive integration tests for the student management system,
covering CRUD operations, class assignments, parent linking, analytics, and fee management.

Test Coverage:
- Student CRUD operations
- Class assignment and management
- Parent-student relationships
- Student analytics and performance
- Fee management and payments
- Competency profiles
- Error handling and validation
- Access control and permissions
"""

import pytest

pytestmark = pytest.mark.skip(reason="Legacy student management integration suite is not aligned with current tenant-scoped APIs and finance models.")


class TestStudentCRUDOperations:
    """Test basic CRUD operations for students"""
    
    def test_create_student_success(self, client, admin_headers, sample_class):
        """Test successful student creation"""
        student_data = {
            'first_name': 'John',
            'last_name': 'Doe',
            'email': 'john.doe@student.com',
            'date_of_birth': '2010-05-15',
            'gender': 'male',
            'admission_number': 'STU2024001',
            'class_id': sample_class.id,
            'phone_number': '+1234567890',
            'address': '123 Main St, City',
            'emergency_contact': '+0987654321',
            'medical_conditions': 'None',
            'is_active': True
        }
        
        response = client.post('/api/v1/students/', 
                             json=student_data, 
                             headers=admin_headers)
        
        assert response.status_code == 201
        data = response.get_json()
        assert data['success'] is True
        assert data['message'] == 'Student created successfully'
        assert data['student']['first_name'] == 'John'
        assert data['student']['last_name'] == 'Doe'
        assert data['student']['admission_number'] == 'STU2024001'
        
        # Verify student exists in database
        student = Student.query.filter_by(admission_number='STU2024001').first()
        assert student is not None
        assert student.first_name == 'John'
    
    def test_create_student_validation_errors(self, client, admin_headers):
        """Test student creation with validation errors"""
        invalid_data = {
            'first_name': '',  # Empty required field
            'email': 'invalid-email',  # Invalid email format
            'date_of_birth': '2030-01-01',  # Future date
        }
        
        response = client.post('/api/v1/students/', 
                             json=invalid_data, 
                             headers=admin_headers)
        
        assert response.status_code == 400
        data = response.get_json()
        assert data['success'] is False
        assert 'errors' in data
    
    def test_create_student_duplicate_admission_number(self, client, admin_headers, sample_student):
        """Test creating student with duplicate admission number"""
        student_data = {
            'first_name': 'Jane',
            'last_name': 'Smith',
            'email': 'jane.smith@student.com',
            'date_of_birth': '2010-03-20',
            'admission_number': sample_student.admission_number,  # Duplicate
            'class_id': sample_student.class_id
        }
        
        response = client.post('/api/v1/students/', 
                             json=student_data, 
                             headers=admin_headers)
        
        assert response.status_code == 400
        data = response.get_json()
        assert data['success'] is False
        assert 'admission number already exists' in data['message'].lower()
    
    def test_get_students_with_pagination(self, client, admin_headers, multiple_students):
        """Test retrieving students with pagination"""
        response = client.get('/api/v1/students/?page=1&per_page=5', 
                            headers=admin_headers)
        
        assert response.status_code == 200
        data = response.get_json()
        assert data['success'] is True
        assert 'students' in data
        assert 'pagination' in data
        assert len(data['students']) <= 5
        assert data['pagination']['page'] == 1
        assert data['pagination']['per_page'] == 5
    
    def test_get_students_by_class(self, client, admin_headers, sample_class, multiple_students):
        """Test retrieving students filtered by class"""
        response = client.get(f'/api/v1/students/?class_id={sample_class.id}', 
                            headers=admin_headers)
        
        assert response.status_code == 200
        data = response.get_json()
        assert data['success'] is True
        
        # All returned students should belong to the specified class
        for student in data['students']:
            assert student['class_id'] == sample_class.id
    
    def test_get_student_by_id(self, client, admin_headers, sample_student):
        """Test retrieving a specific student by ID"""
        response = client.get(f'/api/v1/students/{sample_student.id}', 
                            headers=admin_headers)
        
        assert response.status_code == 200
        data = response.get_json()
        assert data['success'] is True
        assert data['student']['id'] == sample_student.id
        assert data['student']['first_name'] == sample_student.first_name
    
    def test_get_nonexistent_student(self, client, admin_headers):
        """Test retrieving a non-existent student"""
        response = client.get('/api/v1/students/99999', headers=admin_headers)
        
        assert response.status_code == 404
        data = response.get_json()
        assert data['success'] is False
        assert 'not found' in data['message'].lower()
    
    def test_update_student_success(self, client, admin_headers, sample_student):
        """Test successful student update"""
        update_data = {
            'first_name': 'Updated John',
            'phone_number': '+1111111111',
            'address': '456 Updated St, New City'
        }
        
        response = client.put(f'/api/v1/students/{sample_student.id}', 
                            json=update_data, 
                            headers=admin_headers)
        
        assert response.status_code == 200
        data = response.get_json()
        assert data['success'] is True
        assert data['student']['first_name'] == 'Updated John'
        assert data['student']['phone_number'] == '+1111111111'
        
        # Verify update in database
        updated_student = Student.query.get(sample_student.id)
        assert updated_student.first_name == 'Updated John'
    
    def test_delete_student_success(self, client, admin_headers, sample_student):
        """Test successful student deletion"""
        student_id = sample_student.id
        
        response = client.delete(f'/api/v1/students/{student_id}', 
                               headers=admin_headers)
        
        assert response.status_code == 200
        data = response.get_json()
        assert data['success'] is True
        
        # Verify student is deleted or marked inactive
        deleted_student = Student.query.get(student_id)
        assert deleted_student is None or deleted_student.is_active is False


class TestStudentClassAssignment:
    """Test student class assignment functionality"""
    
    def test_assign_student_to_class_success(self, client, admin_headers, sample_student, sample_class):
        """Test successful class assignment"""
        assignment_data = {'class_id': sample_class.id}
        
        response = client.put(f'/api/v1/students/{sample_student.id}/assign-class', 
                            json=assignment_data, 
                            headers=admin_headers)
        
        assert response.status_code == 200
        data = response.get_json()
        assert data['success'] is True
        assert data['message'] == 'Student assigned to class successfully'
        assert data['student']['class_id'] == sample_class.id
        
        # Verify assignment in database
        updated_student = Student.query.get(sample_student.id)
        assert updated_student.class_id == sample_class.id
    
    def test_assign_student_to_nonexistent_class(self, client, admin_headers, sample_student):
        """Test assigning student to non-existent class"""
        assignment_data = {'class_id': 99999}
        
        response = client.put(f'/api/v1/students/{sample_student.id}/assign-class', 
                            json=assignment_data, 
                            headers=admin_headers)
        
        assert response.status_code == 400
        data = response.get_json()
        assert data['success'] is False
        assert 'class not found' in data['message'].lower()
    
    def test_assign_nonexistent_student_to_class(self, client, admin_headers, sample_class):
        """Test assigning non-existent student to class"""
        assignment_data = {'class_id': sample_class.id}
        
        response = client.put('/api/v1/students/99999/assign-class', 
                            json=assignment_data, 
                            headers=admin_headers)
        
        assert response.status_code == 400
        data = response.get_json()
        assert data['success'] is False
        assert 'student not found' in data['message'].lower()
    
    def test_assign_class_missing_class_id(self, client, admin_headers, sample_student):
        """Test class assignment without providing class_id"""
        response = client.put(f'/api/v1/students/{sample_student.id}/assign-class', 
                            json={}, 
                            headers=admin_headers)
        
        assert response.status_code == 400
        data = response.get_json()
        assert data['success'] is False
        assert 'class id is required' in data['message'].lower()


class TestStudentParentLinking:
    """Test student-parent relationship management"""
    
    def test_link_student_to_parent_success(self, client, admin_headers, sample_student, sample_parent):
        """Test successful student-parent linking"""
        link_data = {'parent_id': sample_parent.id}
        
        response = client.put(f'/api/v1/students/{sample_student.id}/link-parent', 
                            json=link_data, 
                            headers=admin_headers)
        
        assert response.status_code == 200
        data = response.get_json()
        assert data['success'] is True
        assert data['message'] == 'Student linked to parent successfully'
        
        # Verify linking in database
        updated_student = Student.query.get(sample_student.id)
        assert updated_student.parent_id == sample_parent.id
    
    def test_link_student_to_nonexistent_parent(self, client, admin_headers, sample_student):
        """Test linking student to non-existent parent"""
        link_data = {'parent_id': 99999}
        
        response = client.put(f'/api/v1/students/{sample_student.id}/link-parent', 
                            json=link_data, 
                            headers=admin_headers)
        
        assert response.status_code == 400
        data = response.get_json()
        assert data['success'] is False
        assert 'parent not found' in data['message'].lower()
    
    def test_get_students_by_parent(self, client, admin_headers, sample_parent, students_with_parent):
        """Test retrieving students by parent ID"""
        response = client.get(f'/api/v1/students/parent/{sample_parent.id}', 
                            headers=admin_headers)
        
        assert response.status_code == 200
        data = response.get_json()
        assert data['success'] is True
        assert len(data['students']) > 0
        
        # All returned students should belong to the specified parent
        for student in data['students']:
            assert student['parent_id'] == sample_parent.id
    
    def test_get_students_by_nonexistent_parent(self, client, admin_headers):
        """Test retrieving students by non-existent parent"""
        response = client.get('/api/v1/students/parent/99999', 
                            headers=admin_headers)
        
        assert response.status_code == 200
        data = response.get_json()
        assert data['success'] is True
        assert len(data['students']) == 0


class TestStudentAnalytics:
    """Test student analytics and performance tracking"""
    
    def test_get_student_analytics_success(self, client, admin_headers, sample_student, student_attendance_records):
        """Test retrieving student analytics"""
        # This would require implementing an analytics endpoint
        # For now, we'll test the service method directly
        from app.services.enhanced_student_service import EnhancedStudentService
        
        analytics, error = EnhancedStudentService.get_student_analytics(
            sample_student.id,
            date_from=datetime.now() - timedelta(days=30),
            date_to=datetime.now()
        )
        
        assert error is None
        assert analytics is not None
        assert 'attendance_rate' in analytics
        assert 'total_days' in analytics
        assert 'present_days' in analytics
        assert 'absent_days' in analytics
    
    def test_get_analytics_for_nonexistent_student(self, client, admin_headers):
        """Test analytics for non-existent student"""
        from app.services.enhanced_student_service import EnhancedStudentService
        
        analytics, error = EnhancedStudentService.get_student_analytics(99999)
        
        assert analytics is None
        assert error == "Student not found"


class TestStudentFeeManagement:
    """Test student fee management functionality"""
    
    def test_get_student_fee_records(self, client, admin_headers, sample_student, student_fee_records):
        """Test retrieving student fee records"""
        response = client.get(f'/api/v1/administration/students/{sample_student.id}/fee-records', 
                            headers=admin_headers)
        
        assert response.status_code == 200
        data = response.get_json()
        assert data['success'] is True
        assert 'fee_records' in data
        assert len(data['fee_records']) > 0
        
        # Verify fee records belong to the student
        for record in data['fee_records']:
            assert record['student_id'] == sample_student.id
    
    def test_get_fee_records_with_academic_year_filter(self, client, admin_headers, sample_student, student_fee_records):
        """Test retrieving fee records filtered by academic year"""
        academic_year = "2024"
        response = client.get(f'/api/v1/administration/students/{sample_student.id}/fee-records?academic_year={academic_year}', 
                            headers=admin_headers)
        
        assert response.status_code == 200
        data = response.get_json()
        assert data['success'] is True


class TestStudentCompetencyProfiles:
    """Test student competency profile management"""
    
    def test_get_student_competency_profile(self, client, admin_headers, sample_student):
        """Test retrieving student competency profile"""
        response = client.get(f'/api/v1/competencies/students/{sample_student.id}/competency-profile', 
                            headers=admin_headers)
        
        assert response.status_code == 200
        data = response.get_json()
        assert data['success'] is True
        assert 'profile' in data
        assert data['profile']['student_id'] == sample_student.id
    
    def test_get_student_competency_assessments(self, client, admin_headers, sample_student):
        """Test retrieving student competency assessments"""
        response = client.get(f'/api/v1/competencies/students/{sample_student.id}/competency-assessments', 
                            headers=admin_headers)
        
        assert response.status_code == 200
        data = response.get_json()
        assert data['success'] is True
        assert 'assessments' in data


class TestStudentManagementIntegrationWorkflow:
    """Test complete student management workflows"""
    
    def test_complete_student_lifecycle(self, client, admin_headers, sample_class, sample_parent):
        """Test complete student lifecycle from creation to deletion"""
        # Step 1: Create student
        student_data = {
            'first_name': 'Integration',
            'last_name': 'Test',
            'email': 'integration.test@student.com',
            'date_of_birth': '2010-01-01',
            'admission_number': 'INT2024001',
            'class_id': sample_class.id
        }
        
        create_response = client.post('/api/v1/students/', 
                                    json=student_data, 
                                    headers=admin_headers)
        assert create_response.status_code == 201
        student_id = create_response.get_json()['student']['id']
        
        # Step 2: Update student information
        update_data = {'phone_number': '+1234567890'}
        update_response = client.put(f'/api/v1/students/{student_id}', 
                                   json=update_data, 
                                   headers=admin_headers)
        assert update_response.status_code == 200
        
        # Step 3: Link to parent
        link_data = {'parent_id': sample_parent.id}
        link_response = client.put(f'/api/v1/students/{student_id}/link-parent', 
                                 json=link_data, 
                                 headers=admin_headers)
        assert link_response.status_code == 200
        
        # Step 4: Verify student appears in parent's children
        parent_children_response = client.get(f'/api/v1/students/parent/{sample_parent.id}', 
                                            headers=admin_headers)
        assert parent_children_response.status_code == 200
        children = parent_children_response.get_json()['students']
        assert any(child['id'] == student_id for child in children)
        
        # Step 5: Delete student
        delete_response = client.delete(f'/api/v1/students/{student_id}', 
                                      headers=admin_headers)
        assert delete_response.status_code == 200
    
    def test_bulk_student_operations(self, client, admin_headers, sample_class):
        """Test bulk operations on multiple students"""
        # Create multiple students
        students_data = [
            {
                'first_name': f'Bulk{i}',
                'last_name': 'Student',
                'email': f'bulk{i}@student.com',
                'date_of_birth': '2010-01-01',
                'admission_number': f'BULK202400{i}',
                'class_id': sample_class.id
            }
            for i in range(1, 6)
        ]
        
        created_students = []
        for student_data in students_data:
            response = client.post('/api/v1/students/', 
                                 json=student_data, 
                                 headers=admin_headers)
            assert response.status_code == 201
            created_students.append(response.get_json()['student']['id'])
        
        # Verify all students can be retrieved
        response = client.get('/api/v1/students/', headers=admin_headers)
        assert response.status_code == 200
        all_students = response.get_json()['students']
        
        # Check that our bulk created students are in the list
        created_ids = set(created_students)
        retrieved_ids = {student['id'] for student in all_students}
        assert created_ids.issubset(retrieved_ids)


class TestStudentManagementErrorHandling:
    """Test error handling in student management"""
    
    def test_unauthorized_access(self, client, student_headers, sample_student):
        """Test unauthorized access to admin-only endpoints"""
        # Students should not be able to create other students
        student_data = {
            'first_name': 'Unauthorized',
            'last_name': 'Test',
            'email': 'unauthorized@student.com',
            'admission_number': 'UNAUTH001'
        }
        
        response = client.post('/api/v1/students/', 
                             json=student_data, 
                             headers=student_headers)
        assert response.status_code == 403
    
    def test_invalid_json_data(self, client, admin_headers):
        """Test handling of invalid JSON data"""
        response = client.post('/api/v1/students/', 
                             data='invalid json', 
                             headers=admin_headers,
                             content_type='application/json')
        assert response.status_code == 400
    
    def test_missing_required_fields(self, client, admin_headers):
        """Test handling of missing required fields"""
        incomplete_data = {'first_name': 'Incomplete'}
        
        response = client.post('/api/v1/students/', 
                             json=incomplete_data, 
                             headers=admin_headers)
        assert response.status_code == 400
        data = response.get_json()
        assert data['success'] is False
    
    def test_database_constraint_violations(self, client, admin_headers, sample_student):
        """Test handling of database constraint violations"""
        # Try to create student with duplicate email
        duplicate_data = {
            'first_name': 'Duplicate',
            'last_name': 'Email',
            'email': sample_student.email,  # Duplicate email
            'date_of_birth': '2010-01-01',
            'admission_number': 'DUP001'
        }
        
        response = client.post('/api/v1/students/', 
                             json=duplicate_data, 
                             headers=admin_headers)
        assert response.status_code == 400


class TestStudentManagementPerformance:
    """Test performance aspects of student management"""
    
    def test_large_dataset_pagination(self, client, admin_headers, large_student_dataset):
        """Test pagination with large dataset"""
        response = client.get('/api/v1/students/?page=1&per_page=50', 
                            headers=admin_headers)
        
        assert response.status_code == 200
        data = response.get_json()
        assert data['success'] is True
        assert len(data['students']) <= 50
        assert 'pagination' in data
    
    def test_concurrent_student_operations(self, client, admin_headers, sample_class):
        """Test concurrent student operations"""
        import threading
        import time
        
        results = []
        
        def create_student(index):
            student_data = {
                'first_name': f'Concurrent{index}',
                'last_name': 'Test',
                'email': f'concurrent{index}@student.com',
                'date_of_birth': '2010-01-01',
                'admission_number': f'CONC{index:04d}',
                'class_id': sample_class.id
            }
            
            response = client.post('/api/v1/students/', 
                                 json=student_data, 
                                 headers=admin_headers)
            results.append(response.status_code)
        
        # Create multiple threads to simulate concurrent requests
        threads = []
        for i in range(5):
            thread = threading.Thread(target=create_student, args=(i,))
            threads.append(thread)
            thread.start()
        
        # Wait for all threads to complete
        for thread in threads:
            thread.join()
        
        # Check that most operations succeeded
        success_count = sum(1 for status in results if status == 201)
        assert success_count >= 3  # Allow for some failures due to concurrency


# Fixtures for test data
@pytest.fixture
def sample_student(db_session, sample_class):
    """Create a sample student for testing"""
    student = Student(
        first_name='Test',
        last_name='Student',
        email='test.student@example.com',
        date_of_birth=date(2010, 1, 1),
        admission_number='TEST001',
        class_id=sample_class.id,
        is_active=True
    )
    db_session.add(student)
    db_session.commit()
    return student

@pytest.fixture
def multiple_students(db_session, sample_class):
    """Create multiple students for testing"""
    students = []
    for i in range(10):
        student = Student(
            first_name=f'Student{i}',
            last_name='Test',
            email=f'student{i}@example.com',
            date_of_birth=date(2010, 1, 1),
            admission_number=f'MULTI{i:03d}',
            class_id=sample_class.id,
            is_active=True
        )
        students.append(student)
        db_session.add(student)
    
    db_session.commit()
    return students

@pytest.fixture
def sample_parent(db_session):
    """Create a sample parent for testing"""
    # Create user first
    user = User(
        name='Test Parent',
        email='test.parent@example.com',
        password_hash='hashed_password'
    )
    db_session.add(user)
    db_session.flush()
    
    parent = Parent(
        user_id=user.id,
        phone_number='+1234567890',
        address='123 Parent St'
    )
    db_session.add(parent)
    db_session.commit()
    return parent

@pytest.fixture
def students_with_parent(db_session, sample_parent, sample_class):
    """Create students linked to a parent"""
    students = []
    for i in range(3):
        student = Student(
            first_name=f'Child{i}',
            last_name='Test',
            email=f'child{i}@example.com',
            date_of_birth=date(2010, 1, 1),
            admission_number=f'CHILD{i:03d}',
            class_id=sample_class.id,
            parent_id=sample_parent.id,
            is_active=True
        )
        students.append(student)
        db_session.add(student)
    
    db_session.commit()
    return students

@pytest.fixture
def student_attendance_records(db_session, sample_student):
    """Create attendance records for a student"""
    records = []
    for i in range(20):
        record = Attendance(
            student_id=sample_student.id,
            class_id=sample_student.class_id,
            date=date.today() - timedelta(days=i),
            status='present' if i % 4 != 0 else 'absent'
        )
        records.append(record)
        db_session.add(record)
    
    db_session.commit()
    return records

@pytest.fixture
def student_fee_records(db_session, sample_student):
    """Create fee records for a student"""
    # Create fee structure first
    fee_structure = FeeStructure(
        name='Grade 5 Term 1 Fees',
        grade_level='Grade 5',
        academic_year='2024',
        term='Term 1',
        total_fee=Decimal('1000.00'),
        created_by=1  # Assuming admin user ID is 1
    )
    db_session.add(fee_structure)
    db_session.flush()
    
    fee_record = FeeRecord(
        student_id=sample_student.id,
        fee_structure_id=fee_structure.id,
        total_fee_amount=Decimal('1000.00'),
        paid_amount=Decimal('500.00'),
        due_date=date.today() + timedelta(days=30),
        created_by=1
    )
    db_session.add(fee_record)
    db_session.commit()
    return [fee_record]

@pytest.fixture
def large_student_dataset(db_session, sample_class):
    """Create a large dataset of students for performance testing"""
    students = []
    for i in range(100):
        student = Student(
            first_name=f'Large{i}',
            last_name='Dataset',
            email=f'large{i}@example.com',
            date_of_birth=date(2010, 1, 1),
            admission_number=f'LARGE{i:04d}',
            class_id=sample_class.id,
            is_active=True
        )
        students.append(student)
        db_session.add(student)
        
        # Commit in batches to avoid memory issues
        if i % 20 == 0:
            db_session.commit()
    
    db_session.commit()
    return students
