"""
Integration tests for Academic Management System

This module contains comprehensive integration tests for the academic management system,
including exams, grading, assessments, curriculum, and analytics functionality.

Test Coverage:
- Exam Management (CRUD, grading, statistics)
- Grading System (continuous assessment, final grades)
- Assessment Framework (tasks, submissions, scoring)
- Curriculum Management (CRUD, units, standards)
- Academic Analytics and Reporting
- STEM Assessment Workflows
- Role-based Access Control
- Error Handling and Validation
- Performance Testing
"""

import pytest
import json
from datetime import datetime, date, timedelta
from decimal import Decimal
from flask import url_for
from app.extensions import db
from app.models.user import User
from app.models.student import Student
from app.models.teacher import Teacher
from app.models.class_ import Class
from app.models.subject import Subject
from app.models.exam import Exam
from app.models.grade import Grade
from app.models.grading_system import GradingScheme, EnhancedGrade, FinalGrade
from app.models.assessment_methods import AssessmentFramework, AssessmentTask, AssessmentSubmission
from app.models.curriculum import Curriculum, CurriculumStandard
from app.models.stem_curriculum import STEMAssessment, STEMAssessmentResult
from app.models.educational_level import EducationalLevel


class TestExamManagement:
    """Test exam management functionality"""
    
    def test_create_exam_success(self, client, admin_headers, test_subject, test_class):
        """Test successful exam creation"""
        exam_data = {
            'title': 'Mathematics Mid-Term Exam',
            'description': 'Mid-term examination for mathematics',
            'subject_id': test_subject.id,
            'class_id': test_class.id,
            'exam_date': '2024-03-15',
            'start_time': '09:00',
            'duration_minutes': 120,
            'total_marks': 100,
            'pass_marks': 40,
            'exam_type': 'mid_term',
            'term': 'Term 2',
            'academic_year': '2023-2024'
        }
        
        response = client.post('/api/v1/exams/', 
                             json=exam_data, 
                             headers=admin_headers)
        
        assert response.status_code == 201
        data = response.get_json()
        assert data['success'] is True
        assert data['exam']['title'] == exam_data['title']
        assert data['exam']['subject_id'] == test_subject.id
        assert data['exam']['class_id'] == test_class.id
    
    def test_get_exams_with_pagination(self, client, teacher_headers, test_exams):
        """Test retrieving exams with pagination"""
        response = client.get('/api/v1/exams/?page=1&per_page=5', 
                            headers=teacher_headers)
        
        assert response.status_code == 200
        data = response.get_json()
        assert data['success'] is True
        assert 'exams' in data
        assert 'pagination' in data
        assert len(data['exams']) <= 5
    
    def test_get_exam_grades(self, client, teacher_headers, test_exam_with_grades):
        """Test retrieving grades for a specific exam"""
        response = client.get(f'/api/v1/exams/{test_exam_with_grades.id}/grades', 
                            headers=teacher_headers)
        
        assert response.status_code == 200
        data = response.get_json()
        assert data['success'] is True
        assert 'grades' in data
        assert len(data['grades']) > 0
    
    def test_get_exam_statistics(self, client, teacher_headers, test_exam_with_grades):
        """Test retrieving exam statistics"""
        response = client.get(f'/api/v1/exams/{test_exam_with_grades.id}/statistics', 
                            headers=teacher_headers)
        
        assert response.status_code == 200
        data = response.get_json()
        assert data['success'] is True
        assert 'statistics' in data
        stats = data['statistics']
        assert 'total_students' in stats
        assert 'average_score' in stats
        assert 'pass_rate' in stats
    
    def test_update_exam_success(self, client, admin_headers, test_exam):
        """Test successful exam update"""
        update_data = {
            'title': 'Updated Mathematics Exam',
            'duration_minutes': 150,
            'total_marks': 120
        }
        
        response = client.put(f'/api/v1/exams/{test_exam.id}', 
                            json=update_data, 
                            headers=admin_headers)
        
        assert response.status_code == 200
        data = response.get_json()
        assert data['success'] is True
        assert data['exam']['title'] == update_data['title']
        assert data['exam']['duration_minutes'] == update_data['duration_minutes']
    
    def test_delete_exam_success(self, client, admin_headers, test_exam):
        """Test successful exam deletion"""
        response = client.delete(f'/api/v1/exams/{test_exam.id}', 
                               headers=admin_headers)
        
        assert response.status_code == 200
        data = response.get_json()
        assert data['success'] is True
        
        # Verify exam is deleted
        get_response = client.get(f'/api/v1/exams/{test_exam.id}', 
                                headers=admin_headers)
        assert get_response.status_code == 404


class TestGradingSystem:
    """Test grading system functionality"""
    
    def test_create_enhanced_grade(self, client, teacher_headers, test_student, test_subject, test_class):
        """Test creating enhanced grade with continuous assessment"""
        grade_data = {
            'student_id': test_student.id,
            'subject_id': test_subject.id,
            'class_id': test_class.id,
            'assessment_name': 'Class Test 1',
            'assessment_date': '2024-02-15',
            'term': 'Term 2',
            'academic_year': '2023-2024',
            'raw_score': 85,
            'total_marks': 100,
            'assessment_type_id': 1
        }
        
        response = client.post('/api/v1/grades/enhanced', 
                             json=grade_data, 
                             headers=teacher_headers)
        
        assert response.status_code == 201
        data = response.get_json()
        assert data['success'] is True
        assert data['grade']['percentage'] == 85.0
    
    def test_calculate_final_grade(self, client, teacher_headers, test_student_with_grades):
        """Test final grade calculation with weighted components"""
        calculation_data = {
            'student_id': test_student_with_grades.id,
            'subject_id': 1,
            'term': 'Term 2',
            'academic_year': '2023-2024',
            'external_exam_score': 78.5
        }
        
        response = client.post('/api/v1/grades/calculate-final', 
                             json=calculation_data, 
                             headers=teacher_headers)
        
        assert response.status_code == 200
        data = response.get_json()
        assert data['success'] is True
        assert 'final_grade' in data
        assert data['final_grade']['final_percentage'] > 0
    
    def test_get_student_grade_report(self, client, teacher_headers, test_student_with_grades):
        """Test retrieving comprehensive grade report for student"""
        response = client.get(f'/api/v1/grades/student/{test_student_with_grades.id}/report?term=Term 2&academic_year=2023-2024', 
                            headers=teacher_headers)
        
        assert response.status_code == 200
        data = response.get_json()
        assert data['success'] is True
        assert 'grade_report' in data
        assert 'continuous_assessments' in data['grade_report']
        assert 'final_grades' in data['grade_report']
    
    def test_bulk_grade_entry(self, client, teacher_headers, test_class_with_students):
        """Test bulk grade entry for multiple students"""
        bulk_grades = [
            {
                'student_id': student.id,
                'raw_score': 80 + (i * 2),
                'total_marks': 100
            }
            for i, student in enumerate(test_class_with_students.students[:5])
        ]
        
        grade_data = {
            'subject_id': 1,
            'class_id': test_class_with_students.id,
            'assessment_name': 'Bulk Test',
            'assessment_date': '2024-02-20',
            'term': 'Term 2',
            'academic_year': '2023-2024',
            'grades': bulk_grades
        }
        
        response = client.post('/api/v1/grades/bulk-entry', 
                             json=grade_data, 
                             headers=teacher_headers)
        
        assert response.status_code == 201
        data = response.get_json()
        assert data['success'] is True
        assert len(data['grades']) == 5
    
    def test_grade_analytics(self, client, teacher_headers, test_class_with_grades, test_subject):
        """Test grade analytics and statistics"""
        response = client.get(f'/api/v1/grades/analytics/class/{test_class_with_grades.id}?subject_id={test_subject.id}&term=Term 2', 
                            headers=teacher_headers)
        
        assert response.status_code == 200
        data = response.get_json()
        assert data['success'] is True
        assert 'analytics' in data
        analytics = data['analytics']
        assert 'class_average' in analytics
        assert 'grade_distribution' in analytics
        assert 'performance_trends' in analytics


class TestAssessmentFramework:
    """Test assessment framework functionality"""
    
    def test_create_assessment_framework(self, client, admin_headers, test_educational_level, test_subject):
        """Test creating assessment framework"""
        framework_data = {
            'name': 'Mathematics Assessment Framework',
            'description': 'Comprehensive assessment framework for mathematics',
            'educational_level_id': test_educational_level.id,
            'subject_id': test_subject.id,
            'formative_weight': 30.0,
            'summative_weight': 40.0,
            'school_based_weight': 20.0,
            'project_weight': 10.0
        }
        
        response = client.post('/api/v1/assessment/frameworks', 
                             json=framework_data, 
                             headers=admin_headers)
        
        assert response.status_code == 201
        data = response.get_json()
        assert data['success'] is True
        assert data['framework']['name'] == framework_data['name']
    
    def test_create_assessment_task(self, client, teacher_headers, test_assessment_framework):
        """Test creating assessment task"""
        task_data = {
            'title': 'Algebra Problem Solving',
            'description': 'Assessment task for algebra problem solving skills',
            'framework_id': test_assessment_framework.id,
            'assessment_type': 'formative',
            'assessment_mode': 'written',
            'scheduled_date': '2024-03-01',
            'duration_minutes': 60,
            'total_marks': 50,
            'pass_mark': 25
        }
        
        response = client.post('/api/v1/assessment/tasks', 
                             json=task_data, 
                             headers=teacher_headers)
        
        assert response.status_code == 201
        data = response.get_json()
        assert data['success'] is True
        assert data['task']['title'] == task_data['title']
    
    def test_submit_assessment(self, client, student_headers, test_assessment_task):
        """Test student assessment submission"""
        submission_data = {
            'task_id': test_assessment_task.id,
            'submission_content': 'Student solution to the assessment task',
            'submission_files': ['solution.pdf'],
            'submitted_at': datetime.utcnow().isoformat()
        }
        
        response = client.post('/api/v1/assessment/submissions', 
                             json=submission_data, 
                             headers=student_headers)
        
        assert response.status_code == 201
        data = response.get_json()
        assert data['success'] is True
        assert data['submission']['task_id'] == test_assessment_task.id
    
    def test_score_assessment(self, client, teacher_headers, test_assessment_submission):
        """Test scoring assessment submission"""
        scoring_data = {
            'submission_id': test_assessment_submission.id,
            'raw_score': 42,
            'written_feedback': 'Good work on problem solving approach',
            'criterion_scores': {
                'understanding': 8,
                'method': 9,
                'accuracy': 7,
                'communication': 8
            }
        }
        
        response = client.post('/api/v1/assessment/scores', 
                             json=scoring_data, 
                             headers=teacher_headers)
        
        assert response.status_code == 201
        data = response.get_json()
        assert data['success'] is True
        assert data['score']['raw_score'] == 42


class TestCurriculumManagement:
    """Test curriculum management functionality"""
    
    def test_create_curriculum(self, client, admin_headers, test_educational_level, test_subject):
        """Test creating curriculum"""
        curriculum_data = {
            'title': 'Mathematics Curriculum - Grade 7',
            'description': 'Comprehensive mathematics curriculum for grade 7',
            'educational_level_id': test_educational_level.id,
            'subject_id': test_subject.id,
            'academic_year': '2023-2024',
            'term': 'Term 2',
            'duration_weeks': 12,
            'curriculum_standard': 'GHANA_SBC',
            'critical_thinking_weight': 25.0,
            'creativity_weight': 20.0,
            'communication_weight': 25.0,
            'collaboration_weight': 30.0
        }
        
        response = client.post('/api/v1/curriculum/', 
                             json=curriculum_data, 
                             headers=admin_headers)
        
        assert response.status_code == 201
        data = response.get_json()
        assert data['success'] is True
        assert data['curriculum']['title'] == curriculum_data['title']
    
    def test_get_curricula_with_filters(self, client, teacher_headers):
        """Test retrieving curricula with filters"""
        response = client.get('/api/v1/curriculum/?educational_level_id=1&subject_id=1&academic_year=2023-2024', 
                            headers=teacher_headers)
        
        assert response.status_code == 200
        data = response.get_json()
        assert data['success'] is True
        assert 'curricula' in data
    
    def test_get_curriculum_details(self, client, teacher_headers, test_curriculum):
        """Test retrieving detailed curriculum information"""
        response = client.get(f'/api/v1/curriculum/{test_curriculum.id}', 
                            headers=teacher_headers)
        
        assert response.status_code == 200
        data = response.get_json()
        assert data['success'] is True
        assert 'curriculum' in data
        assert 'units' in data['curriculum']
    
    def test_create_curriculum_unit(self, client, teacher_headers, test_curriculum):
        """Test creating curriculum unit"""
        unit_data = {
            'curriculum_id': test_curriculum.id,
            'title': 'Algebraic Expressions',
            'description': 'Introduction to algebraic expressions and operations',
            'week_number': 3,
            'start_week': 3,
            'end_week': 4,
            'key_concepts': ['Variables', 'Coefficients', 'Terms'],
            'learning_activities': ['Problem solving', 'Group work'],
            'resources_required': ['Textbook', 'Calculator']
        }
        
        response = client.post('/api/v1/curriculum/units', 
                             json=unit_data, 
                             headers=teacher_headers)
        
        assert response.status_code == 201
        data = response.get_json()
        assert data['success'] is True
        assert data['unit']['title'] == unit_data['title']


class TestAcademicAnalytics:
    """Test academic analytics and reporting"""
    
    def test_performance_comparison(self, client, admin_headers):
        """Test internal vs external exam performance comparison"""
        response = client.get('/api/v1/external-exams/analytics/performance-comparison?exam_year=2023&class_id=1', 
                            headers=admin_headers)
        
        assert response.status_code == 200
        data = response.get_json()
        assert data['success'] is True
        assert 'comparison_data' in data
    
    def test_subject_performance_analytics(self, client, teacher_headers):
        """Test subject-wise performance analytics"""
        response = client.get('/api/v1/analytics/subjects/performance?academic_year=2023-2024&term=Term 2', 
                            headers=teacher_headers)
        
        assert response.status_code == 200
        data = response.get_json()
        assert data['success'] is True
        assert 'subject_analytics' in data
    
    def test_class_performance_trends(self, client, teacher_headers, test_class):
        """Test class performance trend analysis"""
        response = client.get(f'/api/v1/analytics/classes/{test_class.id}/trends?period=6months', 
                            headers=teacher_headers)
        
        assert response.status_code == 200
        data = response.get_json()
        assert data['success'] is True
        assert 'trends' in data
    
    def test_competency_analysis(self, client, teacher_headers, test_student):
        """Test student competency analysis"""
        response = client.get(f'/api/v1/competencies/students/{test_student.id}/competency-profile?academic_year=2023', 
                            headers=teacher_headers)
        
        assert response.status_code == 200
        data = response.get_json()
        assert data['success'] is True
        assert 'competency_profile' in data


class TestSTEMAssessments:
    """Test STEM-specific assessment workflows"""
    
    def test_create_stem_assessment(self, client, teacher_headers, test_stem_module):
        """Test creating STEM assessment"""
        assessment_data = {
            'learning_module_id': test_stem_module.id,
            'title': 'Robotics Project Assessment',
            'description': 'Assessment for robotics project implementation',
            'assessment_type': 'Project',
            'scientific_method_weight': 25.0,
            'technical_skills_weight': 30.0,
            'innovation_creativity_weight': 25.0,
            'communication_weight': 20.0,
            'total_marks': 100.0,
            'requires_presentation': True,
            'requires_demonstration': True
        }
        
        response = client.post('/api/v1/stem/assessments', 
                             json=assessment_data, 
                             headers=teacher_headers)
        
        assert response.status_code == 201
        data = response.get_json()
        assert data['success'] is True
        assert data['assessment']['title'] == assessment_data['title']
    
    def test_submit_stem_assessment_result(self, client, teacher_headers, test_stem_assessment, test_student):
        """Test submitting STEM assessment results"""
        result_data = {
            'assessment_id': test_stem_assessment.id,
            'student_id': test_student.id,
            'scientific_method_score': 22.0,
            'technical_skills_score': 27.0,
            'innovation_creativity_score': 23.0,
            'communication_score': 18.0,
            'strengths': 'Strong technical implementation',
            'areas_for_improvement': 'Communication could be clearer',
            'competencies_demonstrated': [1, 2, 3]
        }
        
        response = client.post('/api/v1/stem/assessment-results', 
                             json=result_data, 
                             headers=teacher_headers)
        
        assert response.status_code == 201
        data = response.get_json()
        assert data['success'] is True
        assert data['result']['total_score'] == 90.0


class TestAcademicIntegrationWorkflow:
    """Test end-to-end academic management workflows"""
    
    def test_complete_assessment_workflow(self, client, admin_headers, teacher_headers, student_headers, test_class_with_students):
        """Test complete assessment workflow from creation to grading"""
        # Step 1: Create exam
        exam_data = {
            'title': 'Integration Test Exam',
            'subject_id': 1,
            'class_id': test_class_with_students.id,
            'exam_date': '2024-03-20',
            'total_marks': 100,
            'pass_marks': 40
        }
        
        exam_response = client.post('/api/v1/exams/', 
                                  json=exam_data, 
                                  headers=admin_headers)
        assert exam_response.status_code == 201
        exam_id = exam_response.get_json()['exam']['id']
        
        # Step 2: Submit grades for students
        for i, student in enumerate(test_class_with_students.students[:3]):
            grade_data = {
                'student_id': student.id,
                'exam_id': exam_id,
                'marks_obtained': 70 + (i * 5),
                'percentage': 70 + (i * 5)
            }
            
            grade_response = client.post('/api/v1/grades/', 
                                       json=grade_data, 
                                       headers=teacher_headers)
            assert grade_response.status_code == 201
        
        # Step 3: Get exam statistics
        stats_response = client.get(f'/api/v1/exams/{exam_id}/statistics', 
                                  headers=teacher_headers)
        assert stats_response.status_code == 200
        stats = stats_response.get_json()['statistics']
        assert stats['total_students'] == 3
        assert stats['average_score'] > 0
    
    def test_curriculum_to_assessment_workflow(self, client, admin_headers, teacher_headers, test_educational_level, test_subject):
        """Test workflow from curriculum creation to assessment implementation"""
        # Step 1: Create curriculum
        curriculum_data = {
            'title': 'Test Curriculum',
            'educational_level_id': test_educational_level.id,
            'subject_id': test_subject.id,
            'academic_year': '2023-2024',
            'term': 'Term 2',
            'curriculum_standard': 'standards_based',
        }
        
        curriculum_response = client.post('/api/v1/curriculum/', 
                                        json=curriculum_data, 
                                        headers=admin_headers)
        assert curriculum_response.status_code == 201
        curriculum_id = curriculum_response.get_json()['curriculum']['id']
        
        # Step 2: Create assessment framework
        framework_data = {
            'name': 'Test Framework',
            'educational_level_id': test_educational_level.id,
            'subject_id': test_subject.id
        }
        
        framework_response = client.post('/api/v1/assessment/frameworks', 
                                       json=framework_data, 
                                       headers=admin_headers)
        assert framework_response.status_code == 201
        framework_id = framework_response.get_json()['framework']['id']
        
        # Step 3: Create assessment task
        task_data = {
            'title': 'Test Task',
            'framework_id': framework_id,
            'assessment_type': 'formative',
            'assessment_mode': 'written',
            'total_marks': 50
        }
        
        task_response = client.post('/api/v1/assessment/tasks', 
                                  json=task_data, 
                                  headers=teacher_headers)
        assert task_response.status_code == 201


class TestAcademicErrorHandling:
    """Test error handling in academic management"""
    
    def test_create_exam_invalid_data(self, client, admin_headers):
        """Test exam creation with invalid data"""
        invalid_data = {
            'title': '',  # Empty title
            'exam_date': 'invalid-date',  # Invalid date format
            'total_marks': -10  # Negative marks
        }
        
        response = client.post('/api/v1/exams/', 
                             json=invalid_data, 
                             headers=admin_headers)
        
        assert response.status_code == 400
        data = response.get_json()
        assert data['success'] is False
        assert 'validation errors' in data['message'].lower()
    
    def test_grade_nonexistent_student(self, client, teacher_headers):
        """Test grading non-existent student"""
        grade_data = {
            'student_id': 99999,  # Non-existent student
            'exam_id': 1,
            'marks_obtained': 85,
            'percentage': 85
        }
        
        response = client.post('/api/v1/grades/', 
                             json=grade_data, 
                             headers=teacher_headers)
        
        assert response.status_code == 404
        data = response.get_json()
        assert data['success'] is False
        assert 'not found' in data['message'].lower()
    
    def test_unauthorized_access_to_grades(self, client, student_headers):
        """Test unauthorized access to grade management"""
        grade_data = {
            'student_id': 1,
            'exam_id': 1,
            'marks_obtained': 85,
            'percentage': 85
        }
        
        response = client.post('/api/v1/grades/', 
                             json=grade_data, 
                             headers=student_headers)
        
        assert response.status_code == 403
        data = response.get_json()
        assert data['success'] is False
        assert 'permission' in data['message'].lower()


class TestAcademicPerformance:
    """Test performance aspects of academic management"""
    
    def test_bulk_grade_processing_performance(self, client, teacher_headers, test_large_class):
        """Test performance of bulk grade processing"""
        import time
        
        # Create bulk grades for large class
        bulk_grades = [
            {
                'student_id': student.id,
                'raw_score': 75 + (i % 25),
                'total_marks': 100
            }
            for i, student in enumerate(test_large_class.students)
        ]
        
        grade_data = {
            'subject_id': 1,
            'class_id': test_large_class.id,
            'assessment_name': 'Performance Test',
            'grades': bulk_grades
        }
        
        start_time = time.time()
        response = client.post('/api/v1/grades/bulk-entry', 
                             json=grade_data, 
                             headers=teacher_headers)
        end_time = time.time()
        
        assert response.status_code == 201
        assert (end_time - start_time) < 5.0  # Should complete within 5 seconds
    
    def test_analytics_query_performance(self, client, admin_headers):
        """Test performance of analytics queries"""
        import time
        
        start_time = time.time()
        response = client.get('/api/v1/analytics/performance-summary?academic_year=2023-2024', 
                            headers=admin_headers)
        end_time = time.time()
        
        assert response.status_code == 200
        assert (end_time - start_time) < 3.0  # Should complete within 3 seconds


# Test Fixtures
@pytest.fixture
def test_educational_level(db_session):
    """Create test educational level"""
    level = EducationalLevel(
        level_name='Junior High School',
        level_code='JHS',
        key_phase='key_phase_4',
        min_age=12,
        max_age=15,
    )
    db_session.add(level)
    db_session.commit()
    return level

@pytest.fixture
def test_subject(db_session, sample_tenant):
    """Create test subject"""
    subject = Subject(
        name='Mathematics',
        code='MATH',
        description='Mathematics subject',
        tenant_id=sample_tenant.id,
    )
    db_session.add(subject)
    db_session.commit()
    return subject

@pytest.fixture
def test_exam(db_session, test_subject, test_class, user_factory):
    """Create test exam"""
    creator = user_factory('teacher')
    exam = Exam(
        title='Test Exam',
        subject_id=test_subject.id,
        class_id=test_class.id,
        exam_date=date.today() + timedelta(days=7),
        duration=60,
        total_marks=100,
        passing_marks=40,
        created_by=creator.id,
    )
    db_session.add(exam)
    db_session.commit()
    return exam

@pytest.fixture
def test_exam_with_grades(db_session, test_exam, test_students):
    """Create test exam with grades"""
    for i, student in enumerate(test_students[:3]):
        grade = Grade(
            student_id=student.id,
            exam_id=test_exam.id,
            marks_obtained=70 + (i * 5),
            percentage=70 + (i * 5),
            graded_by=1
        )
        db_session.add(grade)
    
    db_session.commit()
    return test_exam

@pytest.fixture
def test_assessment_framework(db_session, test_educational_level, test_subject):
    """Create test assessment framework"""
    framework = AssessmentFramework(
        name='Test Framework',
        educational_level_id=test_educational_level.id,
        subject_id=test_subject.id
    )
    db_session.add(framework)
    db_session.commit()
    return framework

@pytest.fixture
def test_assessment_task(db_session, test_assessment_framework):
    """Create test assessment task"""
    task = AssessmentTask(
        title='Fixture Assessment Task',
        framework_id=test_assessment_framework.id,
        assessment_type='formative',
        assessment_mode='written',
        scheduled_date=date.today() + timedelta(days=3),
        total_marks=50,
        pass_mark=25,
    )
    db_session.add(task)
    db_session.commit()
    return task

@pytest.fixture
def test_assessment_submission(db_session, test_assessment_task, student_factory, sample_tenant):
    """Create test assessment submission"""
    student = student_factory(tenant_id=sample_tenant.id)
    submission = AssessmentSubmission(
        task_id=test_assessment_task.id,
        student_id=student.id,
        submission_content='Fixture submission content',
        file_attachments=['fixture.pdf'],
        submitted_at=datetime.utcnow(),
        is_submitted=True,
        is_late=False,
    )
    db_session.add(submission)
    db_session.commit()
    return submission

@pytest.fixture
def test_class(sample_class):
    """Alias the shared sample class for legacy academic tests."""
    return sample_class


@pytest.fixture
def test_student(db_session, student_factory, sample_tenant, test_class):
    """Create a dedicated student for legacy academic tests."""
    student = student_factory(class_id=test_class.id, tenant_id=sample_tenant.id)
    db_session.commit()
    return student


@pytest.fixture
def test_students(db_session, student_factory, sample_tenant, test_class):
    """Create a small set of students attached to the test class."""
    students = []
    for _ in range(3):
        student = student_factory(class_id=test_class.id, tenant_id=sample_tenant.id)
        students.append(student)
    db_session.commit()
    return students


@pytest.fixture
def test_class_with_grades(db_session, test_class, test_subject, test_students, test_exam):
    """Create grades attached to the legacy test class for analytics coverage."""
    for index, student in enumerate(test_students):
        grade = Grade(
            student_id=student.id,
            exam_id=test_exam.id,
            subject_id=test_subject.id,
            percentage=72 + (index * 4),
            marks_obtained=72 + (index * 4),
            graded_by=test_exam.created_by,
            class_id=test_class.id,
            academic_year='2023-2024',
            term='Term 2',
        )
        db_session.add(grade)
    db_session.commit()
    return test_class


@pytest.fixture
def test_curriculum(db_session, test_educational_level, test_subject, user_factory):
    """Create test curriculum"""
    creator = user_factory('admin')
    curriculum = Curriculum(
        title='Test Curriculum',
        educational_level_id=test_educational_level.id,
        subject_id=test_subject.id,
        curriculum_standard=CurriculumStandard.STANDARDS_BASED,
        academic_year='2023-2024',
        term='Term 2',
        created_by=creator.id,
    )
    db_session.add(curriculum)
    db_session.commit()
    return curriculum

@pytest.fixture
def test_large_class(db_session):
    """Create test class with many students for performance testing"""
    class_obj = Class(
        name='Large Test Class',
        grade_level='Grade 7',
        academic_year='2023-2024'
    )
    db_session.add(class_obj)
    db_session.flush()
    
    # Add 100 students to the class
    students = []
    for i in range(100):
        student = Student(
            admission_number=f'LTC{i:03d}',
            first_name=f'Student{i}',
            last_name='Test',
            date_of_birth=date(2010, 1, 1),
            current_class_id=class_obj.id
        )
        students.append(student)
        db_session.add(student)
    
    db_session.commit()
    class_obj.students = students
    return class_obj
