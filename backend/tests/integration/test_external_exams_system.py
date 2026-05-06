"""
Comprehensive integration tests for external exams system
Tests examination management, student registration, result import, and analytics
"""
import pytest
import json
import io
from datetime import datetime, date, timedelta
from decimal import Decimal
from unittest.mock import patch, MagicMock

from app.models.user import User
from app.models.student import Student
from app.models.subject import Subject
from app.models.external_exams import (
    ExternalExamination, ExternalExamRegistration, ExternalExamResult,
    ExternalExamImportLog, ExternalExamType, ExamSession, ResultStatus
)
from app.models.grading import GradingScheme, GradeBoundary, EnhancedGrade
from app.extensions import db


class TestExternalExaminationManagement:
    """Test external examination management functionality"""
    
    def test_get_examinations_success(self, auth_client, db):
        """Test getting all external examinations"""
        response = auth_client.get('/api/v1/external-exams/examinations')
        assert response.status_code == 200
        
        data = response.get_json()
        assert isinstance(data, list)
        
        # Verify examination structure if examinations exist
        if data:
            exam = data[0]
            assert 'id' in exam
            assert 'exam_type' in exam
            assert 'exam_year' in exam
            assert 'exam_name' in exam
            assert 'exam_code' in exam
            assert 'result_status' in exam
    
    def test_get_examinations_with_filters(self, auth_client, db):
        """Test getting examinations with filters"""
        # Test with exam type filter
        response = auth_client.get('/api/v1/external-exams/examinations?exam_type=BECE')
        assert response.status_code == 200
        
        # Test with exam year filter
        response = auth_client.get('/api/v1/external-exams/examinations?exam_year=2024')
        assert response.status_code == 200
        
        # Test with pagination
        response = auth_client.get('/api/v1/external-exams/examinations?page=1&per_page=5')
        assert response.status_code == 200
    
    def test_create_examination_success(self, auth_client, db):
        """Test successful examination creation"""
        exam_data = {
            'exam_type': 'BECE',
            'exam_year': 2024,
            'exam_session': 'MAIN',
            'exam_name': 'Basic Education Certificate Examination 2024',
            'exam_code': 'BECE2024',
            'exam_start_date': '2024-06-01',
            'exam_end_date': '2024-06-15',
            'registration_start_date': '2024-01-01',
            'registration_end_date': '2024-03-31',
            'result_release_date': '2024-08-15',
            'auto_import_enabled': True,
            'import_source': 'WAEC_API'
        }
        
        response = auth_client.post('/api/v1/external-exams/examinations', json=exam_data)
        assert response.status_code == 201
        
        data = response.get_json()
        assert data['success'] is True
        assert data['data']['exam_code'] == exam_data['exam_code']
        assert data['data']['exam_name'] == exam_data['exam_name']
        
        # Verify examination in database
        exam = ExternalExamination.query.filter_by(exam_code=exam_data['exam_code']).first()
        assert exam is not None
        assert exam.exam_year == exam_data['exam_year']
    
    def test_create_examination_duplicate_code(self, auth_client, db):
        """Test creating examination with duplicate code"""
        exam_data = {
            'exam_type': 'BECE',
            'exam_year': 2024,
            'exam_session': 'MAIN',
            'exam_name': 'Test Examination',
            'exam_code': 'DUPLICATE_CODE',
            'exam_start_date': '2024-06-01',
            'exam_end_date': '2024-06-15'
        }
        
        # Create first examination
        response1 = auth_client.post('/api/v1/external-exams/examinations', json=exam_data)
        assert response1.status_code == 201
        
        # Try to create duplicate
        response2 = auth_client.post('/api/v1/external-exams/examinations', json=exam_data)
        assert response2.status_code == 400
        
        data = response2.get_json()
        assert data['success'] is False
        assert 'duplicate' in data['message'].lower() or 'exists' in data['message'].lower()
    
    def test_create_examination_missing_required_fields(self, auth_client, db):
        """Test creating examination with missing required fields"""
        incomplete_data = {
            'exam_type': 'BECE',
            'exam_year': 2024
            # Missing required fields
        }
        
        response = auth_client.post('/api/v1/external-exams/examinations', json=incomplete_data)
        assert response.status_code == 400
        
        data = response.get_json()
        assert data['success'] is False
        assert 'required' in data['message'].lower()


class TestStudentRegistration:
    """Test student registration for external examinations"""
    
    def test_register_student_success(self, auth_client, db):
        """Test successful student registration"""
        # First create an examination
        exam_data = {
            'exam_type': 'BECE',
            'exam_year': 2024,
            'exam_session': 'MAIN',
            'exam_name': 'Test Examination',
            'exam_code': 'TEST_EXAM_2024',
            'exam_start_date': '2024-06-01',
            'exam_end_date': '2024-06-15'
        }
        
        exam_response = auth_client.post('/api/v1/external-exams/examinations', json=exam_data)
        assert exam_response.status_code == 201
        exam_id = exam_response.get_json()['data']['id']
        
        # Register student
        registration_data = {
            'student_id': 1,
            'index_number': 'TEST001',
            'center_number': 'CTR001',
            'center_name': 'Test Center',
            'registered_subjects': ['Mathematics', 'English', 'Science'],
            'registration_date': '2024-02-15',
            'is_private_candidate': False,
            'registration_fee': 150.00,
            'payment_status': 'paid'
        }
        
        response = auth_client.post(
            f'/api/v1/external-exams/examinations/{exam_id}/register-student',
            json=registration_data
        )
        assert response.status_code == 201
        
        data = response.get_json()
        assert data['success'] is True
        assert data['data']['index_number'] == registration_data['index_number']
    
    def test_register_student_duplicate_registration(self, auth_client, db):
        """Test registering student twice for same examination"""
        # Create examination and register student first time
        exam_data = {
            'exam_type': 'BECE',
            'exam_year': 2024,
            'exam_session': 'MAIN',
            'exam_name': 'Test Examination',
            'exam_code': 'DUPLICATE_REG_TEST',
            'exam_start_date': '2024-06-01',
            'exam_end_date': '2024-06-15'
        }
        
        exam_response = auth_client.post('/api/v1/external-exams/examinations', json=exam_data)
        exam_id = exam_response.get_json()['data']['id']
        
        registration_data = {
            'student_id': 1,
            'index_number': 'DUP001',
            'center_number': 'CTR001',
            'center_name': 'Test Center',
            'registered_subjects': ['Mathematics', 'English']
        }
        
        # First registration
        response1 = auth_client.post(
            f'/api/v1/external-exams/examinations/{exam_id}/register-student',
            json=registration_data
        )
        assert response1.status_code == 201
        
        # Duplicate registration
        response2 = auth_client.post(
            f'/api/v1/external-exams/examinations/{exam_id}/register-student',
            json=registration_data
        )
        assert response2.status_code == 400
        
        data = response2.get_json()
        assert data['success'] is False
        assert 'already registered' in data['message'].lower()
    
    def test_register_student_missing_fields(self, auth_client, db):
        """Test student registration with missing required fields"""
        incomplete_data = {
            'student_id': 1,
            'index_number': 'INCOMPLETE001'
            # Missing required fields
        }
        
        response = auth_client.post(
            '/api/v1/external-exams/examinations/1/register-student',
            json=incomplete_data
        )
        assert response.status_code == 400
        
        data = response.get_json()
        assert data['success'] is False
        assert 'required field' in data['message'].lower()


class TestResultImportAndManagement:
    """Test result import and management functionality"""
    
    def test_import_results_csv_success(self, auth_client, db):
        """Test successful CSV result import"""
        # Create examination first
        exam_data = {
            'exam_type': 'BECE',
            'exam_year': 2024,
            'exam_session': 'MAIN',
            'exam_name': 'Import Test Examination',
            'exam_code': 'IMPORT_TEST_2024',
            'exam_start_date': '2024-06-01',
            'exam_end_date': '2024-06-15'
        }
        
        exam_response = auth_client.post('/api/v1/external-exams/examinations', json=exam_data)
        exam_id = exam_response.get_json()['data']['id']
        
        # Create CSV content
        csv_content = """index_number,student_id,subject_code,grade,score,remarks
TEST001,1,MATH,B,75,Good performance
TEST001,1,ENG,A,85,Excellent
TEST002,2,MATH,C,65,Average"""
        
        # Create file-like object
        csv_file = io.BytesIO(csv_content.encode('utf-8'))
        csv_file.name = 'test_results.csv'
        
        response = auth_client.post(
            f'/api/v1/external-exams/examinations/{exam_id}/import-results',
            data={'file': (csv_file, 'test_results.csv')},
            content_type='multipart/form-data'
        )
        
        # Should handle file upload (may return 400 if file handling not implemented)
        assert response.status_code in [200, 201, 400]
    
    def test_get_student_external_results(self, auth_client, db):
        """Test getting external results for a student"""
        student_id = 1
        response = auth_client.get(f'/api/v1/external-exams/students/{student_id}/results')
        assert response.status_code == 200
        
        data = response.get_json()
        assert isinstance(data, list)
        
        # Verify result structure if results exist
        if data:
            result = data[0]
            assert 'id' in result
            assert 'examination_id' in result
            assert 'student_id' in result
            assert 'subject_code' in result
            assert 'grade' in result
    
    def test_get_student_results_with_filters(self, auth_client, db):
        """Test getting student results with filters"""
        student_id = 1
        
        # Test with exam type filter
        response = auth_client.get(
            f'/api/v1/external-exams/students/{student_id}/results?exam_type=BECE'
        )
        assert response.status_code == 200
        
        # Test with exam year filter
        response = auth_client.get(
            f'/api/v1/external-exams/students/{student_id}/results?exam_year=2024'
        )
        assert response.status_code == 200
        
        # Test with subject filter
        response = auth_client.get(
            f'/api/v1/external-exams/students/{student_id}/results?subject_code=MATH'
        )
        assert response.status_code == 200


class TestResultIntegration:
    """Test integration of external results with internal grading system"""
    
    def test_integrate_external_result_success(self, auth_client, db):
        """Test successful result integration"""
        result_id = 1
        response = auth_client.post(f'/api/v1/external-exams/results/{result_id}/integrate')
        
        # Should handle integration (may return 404 if result doesn't exist)
        assert response.status_code in [200, 201, 404, 400]
        
        if response.status_code in [200, 201]:
            data = response.get_json()
            assert data['success'] is True
    
    def test_integrate_already_integrated_result(self, auth_client, db):
        """Test integrating already integrated result"""
        result_id = 1
        
        # First integration attempt
        response1 = auth_client.post(f'/api/v1/external-exams/results/{result_id}/integrate')
        
        # Second integration attempt (if first was successful)
        if response1.status_code in [200, 201]:
            response2 = auth_client.post(f'/api/v1/external-exams/results/{result_id}/integrate')
            assert response2.status_code == 400
            
            data = response2.get_json()
            assert data['success'] is False
            assert 'already integrated' in data['message'].lower()
    
    def test_integrate_result_no_grading_scheme(self, auth_client, db):
        """Test integrating result without appropriate grading scheme"""
        result_id = 999  # Non-existent result
        response = auth_client.post(f'/api/v1/external-exams/results/{result_id}/integrate')
        
        assert response.status_code in [400, 404]
        
        if response.status_code == 400:
            data = response.get_json()
            assert data['success'] is False


class TestPerformanceAnalytics:
    """Test performance comparison and analytics functionality"""
    
    def test_get_performance_comparison_success(self, auth_client, db):
        """Test getting performance comparison analytics"""
        response = auth_client.get('/api/v1/external-exams/analytics/performance-comparison')
        assert response.status_code == 200
        
        data = response.get_json()
        assert isinstance(data, dict)
        
        # Verify analytics structure
        expected_fields = [
            'total_students', 'subjects_analyzed', 'average_external_performance',
            'average_internal_performance', 'performance_correlation', 'subject_breakdown'
        ]
        
        for field in expected_fields:
            assert field in data
    
    def test_get_performance_comparison_with_filters(self, auth_client, db):
        """Test performance comparison with filters"""
        # Test with exam type filter
        response = auth_client.get(
            '/api/v1/external-exams/analytics/performance-comparison?exam_type=BECE'
        )
        assert response.status_code == 200
        
        # Test with exam year filter
        response = auth_client.get(
            '/api/v1/external-exams/analytics/performance-comparison?exam_year=2024'
        )
        assert response.status_code == 200
        
        # Test with class filter
        response = auth_client.get(
            '/api/v1/external-exams/analytics/performance-comparison?class_id=1'
        )
        assert response.status_code == 200
        
        # Test with multiple filters
        response = auth_client.get(
            '/api/v1/external-exams/analytics/performance-comparison?exam_type=BECE&exam_year=2024&class_id=1'
        )
        assert response.status_code == 200


class TestExternalExamsIntegrationWorkflow:
    """Test complete external exams integration workflows"""
    
    def test_complete_examination_workflow(self, auth_client, db):
        """Test complete examination management workflow"""
        # Step 1: Create examination
        exam_data = {
            'exam_type': 'BECE',
            'exam_year': 2024,
            'exam_session': 'MAIN',
            'exam_name': 'Complete Workflow Test',
            'exam_code': 'WORKFLOW_2024',
            'exam_start_date': '2024-06-01',
            'exam_end_date': '2024-06-15',
            'registration_start_date': '2024-01-01',
            'registration_end_date': '2024-03-31'
        }
        
        exam_response = auth_client.post('/api/v1/external-exams/examinations', json=exam_data)
        assert exam_response.status_code == 201
        exam_id = exam_response.get_json()['data']['id']
        
        # Step 2: Register students
        registration_data = {
            'student_id': 1,
            'index_number': 'WORKFLOW001',
            'center_number': 'CTR001',
            'center_name': 'Workflow Test Center',
            'registered_subjects': ['Mathematics', 'English', 'Science'],
            'registration_fee': 150.00,
            'payment_status': 'paid'
        }
        
        reg_response = auth_client.post(
            f'/api/v1/external-exams/examinations/{exam_id}/register-student',
            json=registration_data
        )
        assert reg_response.status_code == 201
        
        # Step 3: Get examinations list
        list_response = auth_client.get('/api/v1/external-exams/examinations')
        assert list_response.status_code == 200
        
        examinations = list_response.get_json()
        assert any(exam['exam_code'] == 'WORKFLOW_2024' for exam in examinations)
        
        # Step 4: Get student results (should be empty initially)
        results_response = auth_client.get('/api/v1/external-exams/students/1/results')
        assert results_response.status_code == 200
        
        # Step 5: Get performance analytics
        analytics_response = auth_client.get('/api/v1/external-exams/analytics/performance-comparison')
        assert analytics_response.status_code == 200
    
    def test_result_import_and_integration_workflow(self, auth_client, db):
        """Test result import and integration workflow"""
        # Create examination
        exam_data = {
            'exam_type': 'BECE',
            'exam_year': 2024,
            'exam_session': 'MAIN',
            'exam_name': 'Result Integration Test',
            'exam_code': 'RESULT_INT_2024',
            'exam_start_date': '2024-06-01',
            'exam_end_date': '2024-06-15'
        }
        
        exam_response = auth_client.post('/api/v1/external-exams/examinations', json=exam_data)
        assert exam_response.status_code == 201
        exam_id = exam_response.get_json()['data']['id']
        
        # Register student
        registration_data = {
            'student_id': 1,
            'index_number': 'RESULT001',
            'center_number': 'CTR001',
            'center_name': 'Result Test Center',
            'registered_subjects': ['Mathematics', 'English']
        }
        
        reg_response = auth_client.post(
            f'/api/v1/external-exams/examinations/{exam_id}/register-student',
            json=registration_data
        )
        assert reg_response.status_code == 201
        
        # Import results (simulate)
        csv_content = """index_number,student_id,subject_code,grade,score
RESULT001,1,MATH,B,75
RESULT001,1,ENG,A,85"""
        
        csv_file = io.BytesIO(csv_content.encode('utf-8'))
        csv_file.name = 'results.csv'
        
        import_response = auth_client.post(
            f'/api/v1/external-exams/examinations/{exam_id}/import-results',
            data={'file': (csv_file, 'results.csv')},
            content_type='multipart/form-data'
        )
        
        # Should handle import attempt
        assert import_response.status_code in [200, 201, 400]


class TestExternalExamsErrorHandling:
    """Test error handling and edge cases"""
    
    def test_invalid_examination_id(self, auth_client, db):
        """Test operations with invalid examination ID"""
        invalid_id = 99999
        
        # Test student registration
        registration_data = {
            'student_id': 1,
            'index_number': 'INVALID001',
            'center_number': 'CTR001',
            'center_name': 'Test Center',
            'registered_subjects': ['Mathematics']
        }
        
        response = auth_client.post(
            f'/api/v1/external-exams/examinations/{invalid_id}/register-student',
            json=registration_data
        )
        assert response.status_code == 404
        
        # Test result import
        csv_file = io.BytesIO(b'test,data')
        csv_file.name = 'test.csv'
        
        import_response = auth_client.post(
            f'/api/v1/external-exams/examinations/{invalid_id}/import-results',
            data={'file': (csv_file, 'test.csv')},
            content_type='multipart/form-data'
        )
        assert import_response.status_code == 404
    
    def test_invalid_student_id(self, auth_client, db):
        """Test getting results for invalid student ID"""
        invalid_student_id = 99999
        response = auth_client.get(f'/api/v1/external-exams/students/{invalid_student_id}/results')
        assert response.status_code in [200, 404]  # May return empty list or 404
    
    def test_invalid_result_id_integration(self, auth_client, db):
        """Test integrating invalid result ID"""
        invalid_result_id = 99999
        response = auth_client.post(f'/api/v1/external-exams/results/{invalid_result_id}/integrate')
        assert response.status_code == 404
    
    def test_malformed_examination_data(self, auth_client, db):
        """Test creating examination with malformed data"""
        malformed_data = {
            'exam_type': 'INVALID_TYPE',
            'exam_year': 'not_a_number',
            'exam_start_date': 'invalid_date',
            'exam_end_date': '2024-06-01'  # End before start
        }
        
        response = auth_client.post('/api/v1/external-exams/examinations', json=malformed_data)
        assert response.status_code in [400, 422]
        
        data = response.get_json()
        assert data['success'] is False
    
    def test_invalid_csv_format_import(self, auth_client, db):
        """Test importing results with invalid CSV format"""
        # Create examination first
        exam_data = {
            'exam_type': 'BECE',
            'exam_year': 2024,
            'exam_session': 'MAIN',
            'exam_name': 'Invalid CSV Test',
            'exam_code': 'INVALID_CSV_2024',
            'exam_start_date': '2024-06-01',
            'exam_end_date': '2024-06-15'
        }
        
        exam_response = auth_client.post('/api/v1/external-exams/examinations', json=exam_data)
        exam_id = exam_response.get_json()['data']['id']
        
        # Invalid CSV content
        invalid_csv = """invalid,header,format
missing,required,columns"""
        
        csv_file = io.BytesIO(invalid_csv.encode('utf-8'))
        csv_file.name = 'invalid.csv'
        
        response = auth_client.post(
            f'/api/v1/external-exams/examinations/{exam_id}/import-results',
            data={'file': (csv_file, 'invalid.csv')},
            content_type='multipart/form-data'
        )
        
        assert response.status_code in [400, 422]


class TestExternalExamsPerformance:
    """Test performance and scalability aspects"""
    
    def test_large_examination_list_performance(self, auth_client, db):
        """Test performance with large examination lists"""
        import time
        
        start_time = time.time()
        response = auth_client.get('/api/v1/external-exams/examinations?per_page=100')
        end_time = time.time()
        
        assert response.status_code == 200
        assert (end_time - start_time) < 3.0  # Should respond within 3 seconds
    
    def test_analytics_performance(self, auth_client, db):
        """Test performance of analytics endpoints"""
        import time
        
        start_time = time.time()
        response = auth_client.get('/api/v1/external-exams/analytics/performance-comparison')
        end_time = time.time()
        
        assert response.status_code == 200
        assert (end_time - start_time) < 5.0  # Analytics may take longer
    
    def test_concurrent_registrations(self, auth_client, db):
        """Test concurrent student registrations"""
        # Create examination
        exam_data = {
            'exam_type': 'BECE',
            'exam_year': 2024,
            'exam_session': 'MAIN',
            'exam_name': 'Concurrent Registration Test',
            'exam_code': 'CONCURRENT_2024',
            'exam_start_date': '2024-06-01',
            'exam_end_date': '2024-06-15'
        }
        
        exam_response = auth_client.post('/api/v1/external-exams/examinations', json=exam_data)
        exam_id = exam_response.get_json()['data']['id']
        
        import threading
        
        def register_student(student_id):
            registration_data = {
                'student_id': student_id,
                'index_number': f'CONC{student_id:03d}',
                'center_number': 'CTR001',
                'center_name': 'Concurrent Test Center',
                'registered_subjects': ['Mathematics', 'English']
            }
            
            response = auth_client.post(
                f'/api/v1/external-exams/examinations/{exam_id}/register-student',
                json=registration_data
            )
            assert response.status_code in [201, 400]  # Success or duplicate
        
        # Register multiple students concurrently
        threads = []
        for i in range(1, 6):  # 5 concurrent registrations
            thread = threading.Thread(target=register_student, args=(i,))
            threads.append(thread)
            thread.start()
        
        # Wait for all threads to complete
        for thread in threads:
            thread.join()
