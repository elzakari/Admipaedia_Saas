"""
Integration tests for the Competencies System

This module contains comprehensive integration tests for the competencies management system,
including core competencies, indicators, student profiles, assessments, and class dashboards.

Test Coverage:
- Core competency management and retrieval
- Competency indicators and domain management
- Student competency profile creation and updates
- Competency assessments and evaluations
- Class competency dashboard analytics
- Role-based access control
- Error handling and edge cases
- Performance and concurrency testing
"""

import pytest
import json
from datetime import datetime, date, timedelta
from unittest.mock import patch, MagicMock
from app.models.educational_level import CoreCompetency, StudentCompetencyAssessment
from app.models.competency_framework import (
    CompetencyIndicator, StudentCompetencyProfile, 
    CompetencyDomain, ProficiencyLevel
)
from app.models.student import Student
from app.models.class_ import Class
from app.models.user import User
from app.extensions import db


class TestCoreCompetencyManagement:
    """Test core competency management functionality"""
    
    def test_get_core_competencies_success(self, client, auth_headers, sample_competencies):
        """Test successful retrieval of core competencies"""
        response = client.get('/api/v1/competencies/core-competencies', headers=auth_headers)
        
        assert response.status_code == 200
        data = json.loads(response.data)
        assert data['success'] is True
        assert 'competencies' in data
        assert len(data['competencies']) > 0
        
        # Verify competency structure
        competency = data['competencies'][0]
        required_fields = ['id', 'name', 'code', 'description', 'category', 
                          'applicable_key_phases', 'assessment_indicators', 'is_active']
        for field in required_fields:
            assert field in competency
    
    def test_get_core_competencies_empty_result(self, client, auth_headers):
        """Test competencies retrieval with no active competencies"""
        # Deactivate all competencies
        CoreCompetency.query.update({'is_active': False})
        db.session.commit()
        
        response = client.get('/api/v1/competencies/core-competencies', headers=auth_headers)
        
        assert response.status_code == 200
        data = json.loads(response.data)
        assert data['success'] is True
        assert data['competencies'] == []
    
    def test_get_competency_indicators_success(self, client, auth_headers, sample_competency_indicators):
        """Test successful retrieval of competency indicators"""
        competency_id = sample_competency_indicators[0].competency_id
        
        response = client.get(
            f'/api/v1/competencies/core-competencies/{competency_id}/indicators',
            headers=auth_headers
        )
        
        assert response.status_code == 200
        data = json.loads(response.data)
        assert data['success'] is True
        assert 'indicators' in data
        assert len(data['indicators']) > 0
        
        # Verify indicator structure
        indicator = data['indicators'][0]
        required_fields = ['id', 'competency_id', 'indicator_code', 'indicator_text',
                          'domain', 'min_educational_level', 'max_educational_level']
        for field in required_fields:
            assert field in indicator
    
    def test_get_competency_indicators_invalid_competency(self, client, auth_headers):
        """Test indicators retrieval for non-existent competency"""
        response = client.get(
            '/api/v1/competencies/core-competencies/99999/indicators',
            headers=auth_headers
        )
        
        assert response.status_code == 200
        data = json.loads(response.data)
        assert data['success'] is True
        assert data['indicators'] == []


class TestStudentCompetencyProfiles:
    """Test student competency profile management"""
    
    def test_get_student_competency_profile_existing(self, client, auth_headers, sample_student_profile):
        """Test retrieval of existing student competency profile"""
        student_id = sample_student_profile.student_id
        academic_year = sample_student_profile.academic_year
        
        response = client.get(
            f'/api/v1/competencies/students/{student_id}/competency-profile',
            headers=auth_headers,
            query_string={'academic_year': academic_year}
        )
        
        assert response.status_code == 200
        data = json.loads(response.data)
        assert data['success'] is True
        assert 'profile' in data
        assert data['profile']['student_id'] == student_id
        assert data['profile']['academic_year'] == academic_year
    
    def test_get_student_competency_profile_create_default(self, client, auth_headers, sample_student):
        """Test creation of default competency profile for student without one"""
        student_id = sample_student.id
        current_year = str(datetime.now().year)
        
        response = client.get(
            f'/api/v1/competencies/students/{student_id}/competency-profile',
            headers=auth_headers,
            query_string={'academic_year': current_year}
        )
        
        assert response.status_code == 200
        data = json.loads(response.data)
        assert data['success'] is True
        assert 'profile' in data
        
        # Verify default profile was created
        profile = StudentCompetencyProfile.query.filter_by(
            student_id=student_id,
            academic_year=current_year
        ).first()
        assert profile is not None
    
    def test_get_student_competency_assessments_success(self, client, auth_headers, sample_competency_assessments):
        """Test retrieval of student competency assessments"""
        student_id = sample_competency_assessments[0].student_id
        
        response = client.get(
            f'/api/v1/competencies/students/{student_id}/competency-assessments',
            headers=auth_headers
        )
        
        assert response.status_code == 200
        data = json.loads(response.data)
        assert data['success'] is True
        assert 'assessments' in data
        assert len(data['assessments']) > 0
        
        # Verify assessment structure
        assessment = data['assessments'][0]
        required_fields = ['id', 'student_id', 'competency_id', 'indicator_id',
                          'proficiency_level', 'assessment_date', 'teacher_id']
        for field in required_fields:
            assert field in assessment
    
    def test_get_student_competency_assessments_with_filters(self, client, auth_headers, sample_competency_assessments):
        """Test retrieval of assessments with date and competency filters"""
        student_id = sample_competency_assessments[0].student_id
        competency_id = sample_competency_assessments[0].competency_id
        
        response = client.get(
            f'/api/v1/competencies/students/{student_id}/competency-assessments',
            headers=auth_headers,
            query_string={
                'competency_id': competency_id,
                'start_date': '2024-01-01',
                'end_date': '2024-12-31'
            }
        )
        
        assert response.status_code == 200
        data = json.loads(response.data)
        assert data['success'] is True
        assert 'assessments' in data


class TestCompetencyAssessments:
    """Test competency assessment creation and management"""
    
    def test_create_competency_assessment_success(self, client, auth_headers, sample_student, sample_competency_indicators):
        """Test successful creation of competency assessment"""
        assessment_data = {
            'student_id': sample_student.id,
            'competency_id': sample_competency_indicators[0].competency_id,
            'indicator_id': sample_competency_indicators[0].id,
            'proficiency_level': 3,
            'assessment_notes': 'Student demonstrates good understanding',
            'assessment_method': 'observation'
        }
        
        response = client.post(
            '/api/v1/competencies/competency-assessments',
            headers=auth_headers,
            json=assessment_data
        )
        
        assert response.status_code == 201
        data = json.loads(response.data)
        assert data['success'] is True
        assert 'assessment' in data
        
        # Verify assessment was created in database
        assessment = StudentCompetencyAssessment.query.filter_by(
            student_id=sample_student.id,
            competency_id=sample_competency_indicators[0].competency_id
        ).first()
        assert assessment is not None
        assert assessment.proficiency_level == 3
    
    def test_create_competency_assessment_invalid_data(self, client, auth_headers):
        """Test assessment creation with invalid data"""
        invalid_data = {
            'student_id': 99999,  # Non-existent student
            'competency_id': 99999,  # Non-existent competency
            'proficiency_level': 5  # Invalid level (should be 1-4)
        }
        
        response = client.post(
            '/api/v1/competencies/competency-assessments',
            headers=auth_headers,
            json=invalid_data
        )
        
        assert response.status_code == 400
        data = json.loads(response.data)
        assert data['success'] is False
        assert 'message' in data
    
    def test_create_competency_assessment_missing_fields(self, client, auth_headers):
        """Test assessment creation with missing required fields"""
        incomplete_data = {
            'student_id': 1
            # Missing competency_id and proficiency_level
        }
        
        response = client.post(
            '/api/v1/competencies/competency-assessments',
            headers=auth_headers,
            json=incomplete_data
        )
        
        assert response.status_code == 400
        data = json.loads(response.data)
        assert data['success'] is False


class TestClassCompetencyDashboard:
    """Test class competency dashboard functionality"""
    
    def test_get_class_competency_dashboard_success(self, client, auth_headers, sample_class_with_students):
        """Test successful retrieval of class competency dashboard"""
        class_id = sample_class_with_students.id
        
        response = client.get(
            f'/api/v1/competencies/classes/{class_id}/competency-dashboard',
            headers=auth_headers
        )
        
        assert response.status_code == 200
        data = json.loads(response.data)
        assert data['success'] is True
        assert 'dashboard' in data
        
        dashboard = data['dashboard']
        required_fields = ['class_info', 'competency_overview', 'student_progress', 'recent_assessments']
        for field in required_fields:
            assert field in dashboard
    
    def test_get_class_competency_dashboard_with_filters(self, client, auth_headers, sample_class_with_students):
        """Test dashboard retrieval with competency and date filters"""
        class_id = sample_class_with_students.id
        
        response = client.get(
            f'/api/v1/competencies/classes/{class_id}/competency-dashboard',
            headers=auth_headers,
            query_string={
                'competency_id': 1,
                'academic_year': '2024'
            }
        )
        
        assert response.status_code == 200
        data = json.loads(response.data)
        assert data['success'] is True
        assert 'dashboard' in data
    
    def test_get_class_competency_dashboard_invalid_class(self, client, auth_headers):
        """Test dashboard retrieval for non-existent class"""
        response = client.get(
            '/api/v1/competencies/classes/99999/competency-dashboard',
            headers=auth_headers
        )
        
        assert response.status_code == 404
        data = json.loads(response.data)
        assert data['success'] is False


class TestCompetenciesIntegrationWorkflow:
    """Test end-to-end competencies system workflows"""
    
    def test_complete_competency_assessment_workflow(self, client, auth_headers, sample_student, sample_competencies):
        """Test complete workflow from competency retrieval to assessment creation"""
        # Step 1: Get available competencies
        response = client.get('/api/v1/competencies/core-competencies', headers=auth_headers)
        assert response.status_code == 200
        competencies = json.loads(response.data)['competencies']
        
        # Step 2: Get indicators for first competency
        competency_id = competencies[0]['id']
        response = client.get(
            f'/api/v1/competencies/core-competencies/{competency_id}/indicators',
            headers=auth_headers
        )
        assert response.status_code == 200
        indicators = json.loads(response.data)['indicators']
        
        # Step 3: Create assessment
        assessment_data = {
            'student_id': sample_student.id,
            'competency_id': competency_id,
            'indicator_id': indicators[0]['id'],
            'proficiency_level': 3,
            'assessment_notes': 'End-to-end test assessment'
        }
        
        response = client.post(
            '/api/v1/competencies/competency-assessments',
            headers=auth_headers,
            json=assessment_data
        )
        assert response.status_code == 201
        
        # Step 4: Verify assessment appears in student profile
        response = client.get(
            f'/api/v1/competencies/students/{sample_student.id}/competency-assessments',
            headers=auth_headers
        )
        assert response.status_code == 200
        assessments = json.loads(response.data)['assessments']
        assert len(assessments) > 0
        assert any(a['competency_id'] == competency_id for a in assessments)
    
    def test_class_competency_tracking_workflow(self, client, auth_headers, sample_class_with_students, sample_competencies):
        """Test workflow for tracking class competency progress"""
        class_id = sample_class_with_students.id
        
        # Step 1: Create assessments for multiple students
        students = sample_class_with_students.students
        competency_id = sample_competencies[0].id
        
        for i, student in enumerate(students[:3]):  # Test with first 3 students
            assessment_data = {
                'student_id': student.id,
                'competency_id': competency_id,
                'proficiency_level': (i % 4) + 1,  # Vary proficiency levels
                'assessment_notes': f'Class tracking test for student {student.id}'
            }
            
            response = client.post(
                '/api/v1/competencies/competency-assessments',
                headers=auth_headers,
                json=assessment_data
            )
            assert response.status_code == 201
        
        # Step 2: Check class dashboard reflects the assessments
        response = client.get(
            f'/api/v1/competencies/classes/{class_id}/competency-dashboard',
            headers=auth_headers
        )
        assert response.status_code == 200
        dashboard = json.loads(response.data)['dashboard']
        
        # Verify dashboard contains assessment data
        assert 'recent_assessments' in dashboard
        assert len(dashboard['recent_assessments']) > 0


class TestCompetenciesErrorHandling:
    """Test error handling in competencies system"""
    
    def test_unauthorized_access(self, client):
        """Test access without authentication"""
        response = client.get('/api/v1/competencies/core-competencies')
        assert response.status_code == 401
    
    def test_invalid_student_id_in_profile(self, client, auth_headers):
        """Test profile retrieval with invalid student ID"""
        response = client.get(
            '/api/v1/competencies/students/99999/competency-profile',
            headers=auth_headers
        )
        assert response.status_code == 404
    
    def test_database_error_handling(self, client, auth_headers):
        """Test handling of database errors"""
        with patch('app.models.educational_level.CoreCompetency.query') as mock_query:
            mock_query.filter_by.side_effect = Exception("Database connection error")
            
            response = client.get('/api/v1/competencies/core-competencies', headers=auth_headers)
            assert response.status_code == 500
            data = json.loads(response.data)
            assert data['success'] is False
            assert 'Error fetching competencies' in data['message']
    
    def test_invalid_json_in_assessment_creation(self, client, auth_headers):
        """Test assessment creation with malformed JSON"""
        response = client.post(
            '/api/v1/competencies/competency-assessments',
            headers=auth_headers,
            data='invalid json'
        )
        assert response.status_code == 400


class TestCompetenciesPerformance:
    """Test performance aspects of competencies system"""
    
    def test_large_competency_list_performance(self, client, auth_headers, large_competency_dataset):
        """Test performance with large number of competencies"""
        import time
        
        start_time = time.time()
        response = client.get('/api/v1/competencies/core-competencies', headers=auth_headers)
        end_time = time.time()
        
        assert response.status_code == 200
        assert (end_time - start_time) < 2.0  # Should complete within 2 seconds
        
        data = json.loads(response.data)
        assert len(data['competencies']) >= 100  # Verify large dataset
    
    def test_concurrent_assessment_creation(self, client, auth_headers, sample_student, sample_competencies):
        """Test concurrent assessment creation"""
        import threading
        import time
        
        results = []
        
        def create_assessment(competency_id, level):
            assessment_data = {
                'student_id': sample_student.id,
                'competency_id': competency_id,
                'proficiency_level': level,
                'assessment_notes': f'Concurrent test {threading.current_thread().name}'
            }
            
            response = client.post(
                '/api/v1/competencies/competency-assessments',
                headers=auth_headers,
                json=assessment_data
            )
            results.append(response.status_code)
        
        # Create multiple threads for concurrent requests
        threads = []
        for i in range(5):
            competency_id = sample_competencies[i % len(sample_competencies)].id
            thread = threading.Thread(target=create_assessment, args=(competency_id, (i % 4) + 1))
            threads.append(thread)
            thread.start()
        
        # Wait for all threads to complete
        for thread in threads:
            thread.join()
        
        # Verify all requests succeeded
        assert all(status in [201, 409] for status in results)  # 201 success, 409 if duplicate
    
    def test_class_dashboard_with_many_students(self, client, auth_headers, large_class_dataset):
        """Test class dashboard performance with many students"""
        import time
        
        class_id = large_class_dataset.id
        
        start_time = time.time()
        response = client.get(
            f'/api/v1/competencies/classes/{class_id}/competency-dashboard',
            headers=auth_headers
        )
        end_time = time.time()
        
        assert response.status_code == 200
        assert (end_time - start_time) < 3.0  # Should complete within 3 seconds
        
        data = json.loads(response.data)
        assert 'dashboard' in data
        assert len(data['dashboard']['student_progress']) >= 50  # Verify large class


# Fixtures for test data
@pytest.fixture
def sample_competencies(db_session):
    """Create sample core competencies for testing"""
    competencies = []
    import uuid
    suffix = uuid.uuid4().hex[:6]
    for i in range(3):
        comp = CoreCompetency(
            name=f'Test Competency {i+1} {suffix}',
            description=f'Description for test competency {i+1}',
            category='academic',
            is_active=True
        )
        db_session.add(comp)
        competencies.append(comp)
    
    db_session.commit()
    return competencies

@pytest.fixture
def sample_competency_indicators(db_session, sample_competencies):
    """Create sample competency indicators for testing"""
    indicators = []
    for comp in sample_competencies:
        for i in range(2):
            indicator = CompetencyIndicator(
                competency_id=comp.id,
                indicator_code=f'{comp.name.replace(" ", "_")}.{i+1}',
                indicator_text=f'Test indicator {i+1} for {comp.name}',
                domain=CompetencyDomain.COMMUNICATION_COLLABORATION,
                min_educational_level=1,
                max_educational_level=6,
                level_1_descriptor='Beginning level',
                level_2_descriptor='Developing level',
                level_3_descriptor='Proficient level',
                level_4_descriptor='Advanced level',
                is_active=True
            )
            db_session.add(indicator)
            indicators.append(indicator)
    
    db_session.commit()
    return indicators

@pytest.fixture
def sample_student_profile(db_session, sample_student):
    """Create sample student competency profile for testing"""
    from app.models.user import User
    updater = User.query.filter_by(email='profile_updater@example.com').first()
    if not updater:
        updater = User(username='profile_updater', email='profile_updater@example.com', role='teacher')
        updater.set_password_hash('Password123!')
        db_session.add(updater)
        db_session.flush()
    profile = StudentCompetencyProfile(
        student_id=sample_student.id,
        academic_year='2024',
        communication_collaboration_score=2.5,
        critical_thinking_score=2.0,
        creativity_innovation_score=3.0,
        cultural_identity_score=2.0,
        personal_development_score=2.5,
        digital_literacy_score=3.0,
        overall_score=2.5,
        updated_by=updater.id
    )
    db_session.add(profile)
    db_session.commit()
    return profile

@pytest.fixture
def sample_competency_assessments(db_session, sample_student, sample_competency_indicators):
    """Create sample competency assessments for testing"""
    assessments = []
    for indicator in sample_competency_indicators[:3]:
        from app.models.user import User
        assessor = User.query.filter_by(email='assessor@example.com').first()
        if not assessor:
            assessor = User(username='assessor', email='assessor@example.com', role='teacher')
            assessor.set_password_hash('Password123!')
            db_session.add(assessor)
            db_session.flush()
        assessment = StudentCompetencyAssessment(
            student_id=sample_student.id,
            competency_id=indicator.competency_id,
            assessment_date=date.today(),
            term='Term 1',
            academic_year='2024',
            level_achieved=(len(assessments) % 4) + 1,
            assessed_by=assessor.id
        )
        db_session.add(assessment)
        assessments.append(assessment)
    
    db_session.commit()
    return assessments
