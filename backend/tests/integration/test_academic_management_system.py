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
from app.models.stem_curriculum import (
    LearningApproach,
    STEMDomain,
    STEMLearningModule,
    STEMProject,
    STEMSubject,
)
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
            'exam_date': (
                datetime.utcnow() + timedelta(days=7)
            ).replace(
                hour=9,
                minute=0,
                second=0,
                microsecond=0,
            ).isoformat(),
            'duration': 120,
            'total_marks': 100,
            'passing_marks': 40,
        }
        
        response = client.post('/api/v1/exams/', 
                             json=exam_data, 
                             headers=admin_headers)
        
        assert response.status_code == 201, response.get_json()
        data = response.get_json()
        assert data['success'] is True
        assert data['exam']['title'] == exam_data['title']
        assert data['exam']['subject_id'] == test_subject.id
        assert data['exam']['class_id'] == test_class.id
    
    def test_get_exams_with_pagination(self, client, teacher_headers, test_exam):
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
        assert 'statistics' in stats
        assert 'mean' in stats['statistics']
        assert 'pass_rate' in stats['statistics']
        assert 'grade_distribution' in stats
    
    def test_update_exam_success(self, client, admin_headers, test_exam):
        """Test successful exam update"""
        update_data = {
            'title': 'Updated Mathematics Exam',
            'duration': 150,
            'total_marks': 120,
        }
        
        response = client.put(f'/api/v1/exams/{test_exam.id}', 
                            json=update_data, 
                            headers=admin_headers)
        
        assert response.status_code == 200
        data = response.get_json()
        assert data['success'] is True
        assert data['exam']['title'] == update_data['title']
        assert data['exam']['duration'] == update_data['duration']
    
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
    
    def test_create_enhanced_grade(
        self,
        client,
        teacher_headers,
        test_students,
        test_subject,
        test_class,
        test_grading_scheme,
    ):
        """Test enhanced-grade creation using the current API."""
        student = test_students[0]

        response = client.post(
            '/api/v1/enhanced-grading/create-grade',
            json={
                'student_id': student.id,
                'subject_id': test_subject.id,
                'class_id': test_class.id,
                'assessment_type_id': 1,
                'grading_scheme_id': test_grading_scheme.id,
                'assessment_name': 'Class Test 1',
                'assessment_date': date.today().isoformat(),
                'term': 'Term 2',
                'academic_year': '2023-2024',
                'raw_score': 85,
                'total_marks': 100,
            },
            headers=teacher_headers,
        )

        assert response.status_code == 201, response.get_json()
        data = response.get_json()
        assert data['success'] is True
        assert data['data']['percentage'] == pytest.approx(85.0)

    def test_calculate_final_grade(
        self,
        client,
        teacher_headers,
        admin_headers,
        test_students,
        test_subject,
        test_class,
        test_grading_scheme,
    ):
        """Test the current 40/60 enhanced final-grade workflow."""
        student = test_students[0]

        create_response = client.post(
            '/api/v1/enhanced-grading/create-grade',
            json={
                'student_id': student.id,
                'subject_id': test_subject.id,
                'class_id': test_class.id,
                'assessment_type_id': 1,
                'grading_scheme_id': test_grading_scheme.id,
                'assessment_name': 'Continuous Assessment',
                'assessment_date': date.today().isoformat(),
                'term': 'Term 2',
                'academic_year': '2023-2024',
                'raw_score': 85,
                'total_marks': 100,
            },
            headers=teacher_headers,
        )
        assert create_response.status_code == 201, create_response.get_json()

        # Teachers enter working assessment grades; final-grade
        # calculation/approval requires the tenant approver role.
        response = client.post(
            '/api/v1/enhanced-grading/calculate-final-grade',
            json={
                'student_id': student.id,
                'subject_id': test_subject.id,
                'class_id': test_class.id,
                'grading_scheme_id': test_grading_scheme.id,
                'term': 'Term 2',
                'academic_year': '2023-2024',
                'external_exam_score': 78.5,
            },
            headers=admin_headers,
        )

        assert response.status_code == 200, response.get_json()
        data = response.get_json()
        assert data['success'] is True
        assert data['data']['class_score_average'] == pytest.approx(85.0)
        assert data['data']['external_exam_score'] == pytest.approx(78.5)
        assert data['data']['final_percentage'] == pytest.approx(81.1)

    def test_get_student_performance_analytics(
        self,
        client,
        teacher_headers,
        test_students,
        test_subject,
        test_class,
        test_grading_scheme,
    ):
        """Test current student performance analytics."""
        student = test_students[0]

        create_response = client.post(
            '/api/v1/enhanced-grading/create-grade',
            json={
                'student_id': student.id,
                'subject_id': test_subject.id,
                'class_id': test_class.id,
                'assessment_type_id': 1,
                'grading_scheme_id': test_grading_scheme.id,
                'assessment_name': 'Analytics Assessment',
                'assessment_date': date.today().isoformat(),
                'term': 'Term 2',
                'academic_year': '2023-2024',
                'raw_score': 88,
                'total_marks': 100,
            },
            headers=teacher_headers,
        )
        assert create_response.status_code == 201, create_response.get_json()

        response = client.get(
            f'/api/v1/enhanced-grading/student-analytics/{student.id}'
            '?term=Term%202&academic_year=2023-2024',
            headers=teacher_headers,
        )

        assert response.status_code == 200, response.get_json()
        data = response.get_json()
        assert data['success'] is True

        analytics = data['data']
        assert analytics['student_id'] == student.id
        assert analytics['total_assessments'] == 1
        assert analytics['average_percentage'] == pytest.approx(88.0)
        assert test_subject.name in analytics['subject_performance']

    def test_bulk_grade_entry(
        self,
        client,
        teacher_headers,
        test_exam,
        test_students,
    ):
        """Test current exam-backed bulk grade entry."""
        response = client.post(
            '/api/v1/grades/bulk',
            json={
                'exam_id': test_exam.id,
                'grades': [
                    {
                        'student_id': student.id,
                        'marks_obtained': 80 + (index * 2),
                        'remarks': 'Bulk grade test',
                    }
                    for index, student in enumerate(test_students)
                ],
            },
            headers=teacher_headers,
        )

        assert response.status_code == 200, response.get_json()
        data = response.get_json()
        assert data['success'] is True
        assert len(data['grades']) == len(test_students)

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


@pytest.fixture
def test_stem_module(
    db_session,
    test_subject,
    test_educational_level,
    tenant_teacher,
):
    """Create a valid tenant-owned STEM curriculum module."""
    domain = STEMDomain(
        name='Technology',
        code='TECH',
        description='Technology STEM domain',
        is_active=True,
    )
    approach = LearningApproach(
        name='Project Based Learning',
        code='PBL',
        description='Hands-on project learning',
        is_active=True,
    )

    db_session.add_all([domain, approach])
    db_session.flush()

    stem_subject = STEMSubject(
        subject_id=test_subject.id,
        stem_domain_id=domain.id,
        educational_level_id=test_educational_level.id,
        integration_level='Intermediate',
        practical_hours_per_week=3,
        theory_hours_per_week=2,
        is_active=True,
    )
    db_session.add(stem_subject)
    db_session.flush()

    module = STEMLearningModule(
        stem_subject_id=stem_subject.id,
        educational_level_id=test_educational_level.id,
        title='Robotics Foundations',
        description='Introduction to robotics and engineering design',
        learning_objectives=[
            'Apply engineering design principles',
            'Build and test a simple robot',
        ],
        primary_approach_id=approach.id,
        duration_weeks=4,
        sequence_order=1,
        term='Term 2',
        formative_assessment_percentage=40.0,
        summative_assessment_percentage=60.0,
        is_active=True,
        created_by=tenant_teacher.id,
    )
    db_session.add(module)
    db_session.commit()
    return module


class TestSTEMCurriculum:
    """Test the currently supported STEM curriculum API."""

    def test_get_stem_subjects(
        self,
        client,
        teacher_headers,
        test_stem_module,
        test_educational_level,
        test_subject,
    ):
        """STEM subject lookup should return tenant-owned subject metadata."""
        response = client.get(
            f'/api/v1/stem/subjects/{test_educational_level.id}',
            headers=teacher_headers,
        )

        assert response.status_code == 200, response.get_json()
        data = response.get_json()
        assert data['success'] is True
        assert len(data['data']) == 1
        assert data['data'][0]['subject_name'] == test_subject.name
        assert data['data'][0]['stem_domain'] == 'Technology'

    def test_create_stem_project(
        self,
        client,
        teacher_headers,
        test_stem_module,
        tenant_teacher,
    ):
        """Create a STEM project using the current model-backed API contract."""
        project_data = {
            'learning_module_id': test_stem_module.id,
            'title': 'Robotics Design Challenge',
            'description': 'Design and build a working classroom robot.',
            'problem_statement': (
                'Create a robot that can navigate a simple classroom course.'
            ),
            'duration_days': 14,
            'difficulty_level': 'Intermediate',
            'is_individual': False,
            'is_group': True,
            'max_group_size': 4,
            'required_resources': [
                'Microcontroller',
                'Motors',
                'Sensors',
            ],
            'expected_deliverables': [
                'Working prototype',
                'Technical report',
            ],
            'evaluation_criteria': [
                'Functionality',
                'Engineering process',
                'Presentation',
            ],
            'sustainability_focus': True,
        }

        response = client.post(
            '/api/v1/stem/projects',
            json=project_data,
            headers=teacher_headers,
        )

        assert response.status_code == 201, response.get_json()
        data = response.get_json()
        assert data['success'] is True

        project = STEMProject.query.get(data['data']['id'])
        assert project is not None
        assert project.learning_module_id == test_stem_module.id
        assert project.title == project_data['title']
        assert project.problem_statement == project_data['problem_statement']
        assert project.duration_days == 14
        assert project.created_by == tenant_teacher.id


class TestAcademicIntegrationWorkflow:
    """Test end-to-end academic management workflows"""
    
    def test_complete_assessment_workflow(
        self,
        client,
        admin_headers,
        teacher_headers,
        student_headers,
        test_class_with_students,
        test_subject,
    ):
        """Test current exam creation, bulk grading, and statistics workflow."""
        exam_data = {
            'title': 'Integration Test Exam',
            'subject_id': test_subject.id,
            'class_id': test_class_with_students.id,
            'exam_date': f"{(date.today() + timedelta(days=14)).isoformat()}T09:00:00",
            'duration': 60,
            'total_marks': 100,
            'passing_marks': 40,
        }

        exam_response = client.post(
            '/api/v1/exams/',
            json=exam_data,
            headers=admin_headers,
        )
        assert exam_response.status_code == 201, exam_response.get_json()
        exam_id = exam_response.get_json()['exam']['id']

        students = test_class_with_students.students[:3]
        grade_response = client.post(
            '/api/v1/grades/bulk',
            json={
                'exam_id': exam_id,
                'grades': [
                    {
                        'student_id': student.id,
                        'marks_obtained': 70 + (index * 5),
                    }
                    for index, student in enumerate(students)
                ],
            },
            headers=teacher_headers,
        )

        assert grade_response.status_code == 200, grade_response.get_json()
        grade_payload = grade_response.get_json()
        assert grade_payload['success'] is True
        assert len(grade_payload['grades']) == 3

        stats_response = client.get(
            f'/api/v1/exams/{exam_id}/statistics',
            headers=teacher_headers,
        )
        assert stats_response.status_code == 200, stats_response.get_json()

        stats = stats_response.get_json()['statistics']
        assert stats['total_students'] == 3
        assert stats['statistics']['mean'] > 0

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
        """Invalid exam payloads should return structured schema errors."""
        invalid_data = {
            'title': '',
            'exam_date': 'invalid-date',
            'total_marks': -10,
        }

        response = client.post(
            '/api/v1/exams/',
            json=invalid_data,
            headers=admin_headers,
        )

        assert response.status_code == 400
        data = response.get_json()
        assert data['success'] is False
        assert data['message'] == 'Validation failed'
        assert data['errors']

    def test_grade_nonexistent_student(
        self,
        client,
        teacher_headers,
        test_class,
        test_subject,
    ):
        """Grade entry must reject a nonexistent student explicitly."""
        response = client.post(
            '/api/v1/grades/entry',
            json={
                'student_id': 99999,
                'subject_id': test_subject.id,
                'class_id': test_class.id,
                'assessment_type_id': 1,
                'assessment_name': 'Invalid Student Test',
                'assessment_date': date.today().isoformat(),
                'term': 'Term 2',
                'academic_year': '2023-2024',
                'raw_score': 85,
                'total_marks': 100,
                'percentage': 85,
            },
            headers=teacher_headers,
        )

        assert response.status_code == 404, response.get_json()
        data = response.get_json()
        assert data['success'] is False
        assert data['message'] == 'Student not found'

    def test_unauthorized_access_to_grades(
        self,
        client,
        student_headers,
        test_class,
    ):
        """Students must not be permitted to manage grades."""
        response = client.post(
            '/api/v1/grades/entry',
            json={
                'student_id': 1,
                'class_id': test_class.id,
            },
            headers=student_headers,
        )

        assert response.status_code == 403, response.get_json()

class TestAcademicPerformance:
    """Test performance aspects of academic management."""

    def test_bulk_grade_processing_performance(
        self,
        client,
        admin_headers,
        test_large_class,
        test_subject,
    ):
        """Test current exam-backed bulk grading for a large class."""
        import time

        students = list(test_large_class.students)
        assert len(students) == 100

        exam_response = client.post(
            '/api/v1/exams/',
            json={
                'title': 'Large Class Performance Exam',
                'subject_id': test_subject.id,
                'class_id': test_large_class.id,
                'exam_date': (
                    datetime.utcnow() + timedelta(days=7)
                ).replace(
                    hour=9,
                    minute=0,
                    second=0,
                    microsecond=0,
                ).isoformat(),
                'duration': 90,
                'total_marks': 100,
                'passing_marks': 40,
            },
            headers=admin_headers,
        )

        assert exam_response.status_code == 201, exam_response.get_json()
        exam_id = exam_response.get_json()['exam']['id']

        grade_payload = {
            'exam_id': exam_id,
            'grades': [
                {
                    'student_id': student.id,
                    'marks_obtained': 75 + (index % 25),
                    'remarks': 'Performance test',
                }
                for index, student in enumerate(students)
            ],
        }

        start_time = time.perf_counter()

        response = client.post(
            '/api/v1/grades/bulk',
            json=grade_payload,
            headers=admin_headers,
        )

        elapsed = time.perf_counter() - start_time

        assert response.status_code == 200, response.get_json()
        data = response.get_json()
        assert data['success'] is True
        assert len(data['grades']) == len(students)
        assert elapsed < 5.0

    def test_analytics_query_performance(
        self,
        client,
        admin_headers,
    ):
        """Test performance of the current academic analytics summary."""
        import time

        start_time = time.perf_counter()

        response = client.get(
            '/api/v1/analytics/performance-summary'
            '?academic_year=2023-2024',
            headers=admin_headers,
        )

        elapsed = time.perf_counter() - start_time

        assert response.status_code == 200, response.get_json()
        assert elapsed < 3.0


@pytest.fixture
def test_educational_level(db_session):
    """Reuse or create the JHS educational level for legacy academic tests."""
    existing = EducationalLevel.query.filter_by(code='JHS').first()
    if existing:
        return existing

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
def test_grading_scheme(
    db_session,
    sample_tenant,
    test_educational_level,
):
    """Create a valid tenant-owned grading scheme for enhanced grading tests."""
    from app.models.grading_system import GradeBoundary, GradingStandard

    scheme = GradingScheme(
        tenant_id=sample_tenant.id,
        name='Test Continuous Assessment Scheme',
        standard=GradingStandard.CONTINUOUS_ASSESSMENT,
        educational_level_id=test_educational_level.id,
        is_active=True,
        is_default=True,
        class_score_weight=40.0,
        external_exam_weight=60.0,
    )
    db_session.add(scheme)
    db_session.flush()

    db_session.add_all([
        GradeBoundary(
            grading_scheme_id=scheme.id,
            grade_symbol='A1',
            grade_name='Excellent',
            min_score=80.0,
            max_score=100.0,
            is_passing=True,
            grade_points=1.0,
            sequence_order=1,
        ),
        GradeBoundary(
            grading_scheme_id=scheme.id,
            grade_symbol='F9',
            grade_name='Needs Improvement',
            min_score=0.0,
            max_score=79.99,
            is_passing=False,
            grade_points=9.0,
            sequence_order=2,
        ),
    ])

    db_session.commit()
    return scheme


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
    from app.models.assessment_methods import AssessmentMode, AssessmentType

    task = AssessmentTask(
        title='Fixture Assessment Task',
        framework_id=test_assessment_framework.id,
        assessment_type=AssessmentType.FORMATIVE,
        assessment_mode=AssessmentMode.WRITTEN,
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
def test_class_with_students(test_class, test_students):
    """Return the class after its legacy student fixtures are attached."""
    assert all(student.class_id == test_class.id for student in test_students)
    return test_class


@pytest.fixture
def test_student_with_grades(test_students, test_class_with_grades):
    """Return a student after grade fixtures have been populated."""
    return test_students[0]


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
def test_large_class(db_session, sample_tenant, student_factory):
    """Create a tenant-owned class with many valid students for performance testing."""
    class_obj = Class(
        tenant_id=sample_tenant.id,
        name='Large Test Class',
        grade_level='Grade 7',
        academic_year='2023-2024',
    )
    db_session.add(class_obj)
    db_session.flush()

    for _ in range(100):
        student_factory(
            tenant_id=sample_tenant.id,
            class_id=class_obj.id,
        )

    db_session.commit()
    return class_obj
