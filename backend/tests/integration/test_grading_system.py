import pytest
from datetime import date
from flask_jwt_extended import create_access_token
from app.models.user import User
from app.models.student import Student
from app.models.class_ import Class
from app.models.subject import Subject
from app.models.grading_system import EnhancedGrade, FinalGrade, GradeBoundary, GradingScheme, GradingStandard
from app.extensions import db
from app.services.grading.service import GradingService
from app.services.enhanced_grading_service import EnhancedGradingService
from tests.test_production_integration import create_test_membership, create_test_user

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

    def test_get_gradebook(self, auth_client, db, sample_tenant):
        """Test fetching enhanced gradebook with stable assessment metadata."""
        class_obj = Class(name='Grade 10C', grade_level='Grade 10', academic_year='2024/2025', tenant_id=sample_tenant.id)
        subject = Subject(name='English', code='ENG10', tenant_id=sample_tenant.id)
        scheme = GradingScheme(
            tenant_id=sample_tenant.id,
            name='Default Scheme',
            standard=GradingStandard.INTERNAL_EXAM,
            is_active=True,
            is_default=True,
            class_score_weight=40,
            external_exam_weight=60,
        )
        db.session.add_all([class_obj, subject, scheme])
        db.session.commit()

        student = Student(
            tenant_id=sample_tenant.id,
            first_name='Jane',
            last_name='Doe',
            email='jane@school.com',
            date_of_birth=date(2008, 2, 2),
            gender='Female',
            admission_number='STU002',
            class_id=class_obj.id,
        )
        db.session.add(student)
        db.session.commit()

        db.session.add(
            EnhancedGrade(
                student_id=student.id,
                subject_id=subject.id,
                class_id=class_obj.id,
                grading_scheme_id=scheme.id,
                assessment_type_id=3,
                assessment_name='Quiz 1',
                assessment_date=date(2026, 7, 4),
                term='First Term',
                academic_year='2024/2025',
                raw_score=18,
                total_marks=20,
                percentage=90,
                grade_symbol='A',
                teacher_comments='Strong work',
            )
        )
        db.session.commit()

        gradebook, error = GradingService.get_gradebook(
            class_obj.id,
            subject.id,
            'First Term',
            '2024/2025',
        )

        assert error is None
        assert len(gradebook['assessments']) == 1
        assert gradebook['assessments'][0]['assessment_key'] == '3:Quiz 1'
        assert gradebook['assessments'][0]['assessment_name'] == 'Quiz 1'

        student_row = gradebook['students'][student.id]
        assert student_row['grades']['3:Quiz 1']['score'] == 18
        assert student_row['grades']['3:Quiz 1']['remark'] == 'Strong work'

    def test_class_grade_analytics_prefers_final_grades(self, client, db_session, sample_tenant):
        """Class grade analytics should read FinalGrade before legacy grade rows."""
        admin_user = create_test_user(db_session, 'grade-analytics-admin@example.com', 'admin', sample_tenant.id)
        create_test_membership(db_session, sample_tenant.id, admin_user.id, 'admin')
        db_session.commit()
        headers = {
            'Authorization': f'Bearer {create_access_token(identity=admin_user.id)}',
            'X-Tenant-ID': str(sample_tenant.id),
        }
        class_obj = Class(name='Grade 11A', grade_level='Grade 11', academic_year='2024/2025', tenant_id=sample_tenant.id)
        subject = Subject(name='Integrated Science', code='SCI11', tenant_id=sample_tenant.id)
        scheme = GradingScheme(
            tenant_id=sample_tenant.id,
            name='Default Scheme',
            standard=GradingStandard.INTERNAL_EXAM,
            is_active=True,
            is_default=True,
            class_score_weight=40,
            external_exam_weight=60,
        )
        db.session.add_all([class_obj, subject, scheme])
        db.session.commit()

        student = Student(
            tenant_id=sample_tenant.id,
            first_name='Ama',
            last_name='Mensah',
            email='ama.mensah@example.com',
            date_of_birth=date(2008, 3, 2),
            gender='Female',
            admission_number='STU100',
            class_id=class_obj.id,
        )
        db.session.add(student)
        db.session.commit()

        db.session.add_all([
            EnhancedGrade(
                student_id=student.id,
                subject_id=subject.id,
                class_id=class_obj.id,
                grading_scheme_id=scheme.id,
                assessment_type_id=1,
                assessment_name='Quiz 1',
                assessment_date=date(2026, 7, 4),
                term='First Term',
                academic_year='2024/2025',
                raw_score=42,
                total_marks=100,
                percentage=42,
                grade_symbol='F',
            ),
            FinalGrade(
                student_id=student.id,
                subject_id=subject.id,
                class_id=class_obj.id,
                grading_scheme_id=scheme.id,
                term='First Term',
                academic_year='2024/2025',
                class_score_average=88,
                external_exam_score=86,
                final_percentage=88,
                final_grade_symbol='A1',
                final_grade_points=4.0,
                is_passing=True,
                computed_by=1,
            ),
        ])
        db.session.commit()

        response = client.get(
            f'/api/v1/grades/analytics/class/{class_obj.id}?subject_id={subject.id}&term=First%20Term&academic_year=2024/2025',
            headers=headers,
        )

        assert response.status_code == 200
        payload = response.get_json()
        assert payload['success'] is True
        assert payload['analytics']['class_average'] == 88.0
        assert payload['analytics']['grade_distribution']['A1'] == 1
        assert payload['analytics']['total_grades'] == 1

    def test_subject_performance_analytics_prefers_final_grades(self, auth_client, db, sample_tenant):
        """Subject analytics should aggregate FinalGrade outcomes when they exist."""
        class_obj = Class(name='Grade 9A', grade_level='Grade 9', academic_year='2024/2025', tenant_id=sample_tenant.id)
        subject = Subject(name='Mathematics', code='MATH11', tenant_id=sample_tenant.id)
        scheme = GradingScheme(
            tenant_id=sample_tenant.id,
            name='Default Scheme',
            standard=GradingStandard.INTERNAL_EXAM,
            is_active=True,
            is_default=True,
            class_score_weight=40,
            external_exam_weight=60,
        )
        db.session.add_all([class_obj, subject, scheme])
        db.session.commit()

        student = Student(
            tenant_id=sample_tenant.id,
            first_name='Kojo',
            last_name='Arthur',
            email='kojo.arthur@example.com',
            date_of_birth=date(2009, 5, 12),
            gender='Male',
            admission_number='STU101',
            class_id=class_obj.id,
        )
        db.session.add(student)
        db.session.commit()

        db.session.add_all([
            EnhancedGrade(
                student_id=student.id,
                subject_id=subject.id,
                class_id=class_obj.id,
                grading_scheme_id=scheme.id,
                assessment_type_id=1,
                assessment_name='Quiz 1',
                assessment_date=date(2026, 7, 4),
                term='Second Term',
                academic_year='2024/2025',
                raw_score=51,
                total_marks=100,
                percentage=51,
                grade_symbol='D',
            ),
            FinalGrade(
                student_id=student.id,
                subject_id=subject.id,
                class_id=class_obj.id,
                grading_scheme_id=scheme.id,
                term='Second Term',
                academic_year='2024/2025',
                class_score_average=91,
                external_exam_score=89,
                final_percentage=91,
                final_grade_symbol='A1',
                final_grade_points=4.0,
                is_passing=True,
                computed_by=1,
            ),
        ])
        db.session.commit()

        response = auth_client.get('/api/v1/analytics/subjects/performance?academic_year=2024/2025&term=Second%20Term')

        assert response.status_code == 200
        payload = response.get_json()
        assert payload['success'] is True
        math_row = next(row for row in payload['subject_analytics'] if row['subject'] == 'Mathematics')
        assert math_row['average_score'] == 91.0
        assert math_row['grades_count'] == 1

    def test_enhanced_student_analytics_prefers_final_grades(self, db, sample_tenant):
        """Enhanced student analytics should prefer FinalGrade outcomes over raw assessment rows."""
        class_obj = Class(name='Grade 8A', grade_level='Grade 8', academic_year='2024/2025', tenant_id=sample_tenant.id)
        subject = Subject(name='Social Studies', code='SOC8', tenant_id=sample_tenant.id)
        scheme = GradingScheme(
            tenant_id=sample_tenant.id,
            name='Default Scheme',
            standard=GradingStandard.INTERNAL_EXAM,
            is_active=True,
            is_default=True,
            class_score_weight=40,
            external_exam_weight=60,
        )
        db.session.add_all([class_obj, subject, scheme])
        db.session.commit()

        student = Student(
            tenant_id=sample_tenant.id,
            first_name='Yaw',
            last_name='Boateng',
            email='yaw.boateng@example.com',
            date_of_birth=date(2010, 4, 4),
            gender='Male',
            admission_number='STU200',
            class_id=class_obj.id,
        )
        db.session.add(student)
        db.session.commit()

        db.session.add_all([
            EnhancedGrade(
                student_id=student.id,
                subject_id=subject.id,
                class_id=class_obj.id,
                grading_scheme_id=scheme.id,
                assessment_type_id=2,
                assessment_name='Homework 1',
                assessment_date=date(2026, 7, 4),
                term='Third Term',
                academic_year='2024/2025',
                raw_score=44,
                total_marks=100,
                percentage=44,
                grade_symbol='E8',
                grade_points=8,
                is_passing=True,
            ),
            FinalGrade(
                student_id=student.id,
                subject_id=subject.id,
                class_id=class_obj.id,
                grading_scheme_id=scheme.id,
                term='Third Term',
                academic_year='2024/2025',
                class_score_average=84,
                external_exam_score=86,
                final_percentage=84,
                final_grade_symbol='A1',
                final_grade_points=1,
                is_passing=True,
                teacher_remarks='Excellent recovery',
                computed_by=1,
            ),
        ])
        db.session.commit()

        analytics = EnhancedGradingService.get_student_performance_analytics(
            student.id,
            '2024/2025',
            'Third Term',
        )

        assert analytics['average_percentage'] == 84.0
        assert analytics['overall_grade'] == 'A1'
        assert analytics['subject_performance']['Social Studies']['latest_grade'] == 'A1'
        assert analytics['performance_trend'][0]['percentage'] == 84.0

    def test_enhanced_class_analytics_prefers_final_grades(self, db, sample_tenant):
        """Enhanced class analytics should use FinalGrade data when available."""
        class_obj = Class(name='Grade 7B', grade_level='Grade 7', academic_year='2024/2025', tenant_id=sample_tenant.id)
        subject = Subject(name='English Language', code='ENG7', tenant_id=sample_tenant.id)
        scheme = GradingScheme(
            tenant_id=sample_tenant.id,
            name='Default Scheme',
            standard=GradingStandard.INTERNAL_EXAM,
            is_active=True,
            is_default=True,
            class_score_weight=40,
            external_exam_weight=60,
        )
        db.session.add_all([class_obj, subject, scheme])
        db.session.commit()

        student = Student(
            tenant_id=sample_tenant.id,
            first_name='Akosua',
            last_name='Mensimah',
            email='akosua.mensimah@example.com',
            date_of_birth=date(2011, 1, 10),
            gender='Female',
            admission_number='STU201',
            class_id=class_obj.id,
        )
        db.session.add(student)
        db.session.commit()

        db.session.add_all([
            EnhancedGrade(
                student_id=student.id,
                subject_id=subject.id,
                class_id=class_obj.id,
                grading_scheme_id=scheme.id,
                assessment_type_id=2,
                assessment_name='Homework 1',
                assessment_date=date(2026, 7, 4),
                term='First Term',
                academic_year='2024/2025',
                raw_score=33,
                total_marks=100,
                percentage=33,
                grade_symbol='F9',
                grade_points=9,
                is_passing=False,
            ),
            FinalGrade(
                student_id=student.id,
                subject_id=subject.id,
                class_id=class_obj.id,
                grading_scheme_id=scheme.id,
                term='First Term',
                academic_year='2024/2025',
                class_score_average=78,
                external_exam_score=82,
                final_percentage=78,
                final_grade_symbol='B2',
                final_grade_points=2,
                is_passing=True,
                computed_by=1,
            ),
        ])
        db.session.commit()

        analytics = EnhancedGradingService.get_class_performance_analytics(
            class_obj.id,
            subject.id,
            'First Term',
            '2024/2025',
        )

        assert analytics['class_average'] == 78.0
        assert analytics['overall_grade'] == 'B2'
        assert analytics['total_assessments'] == 1
        assert analytics['top_performers'][0]['average_percentage'] == 78.0

    def test_legacy_grading_standards_route_returns_enum_data(self, client, db_session, sample_tenant):
        """The legacy /grading/standards route should serialize enum-backed standards."""
        admin_user = create_test_user(db_session, 'legacy-grading-admin@example.com', 'admin', sample_tenant.id)
        create_test_membership(db_session, sample_tenant.id, admin_user.id, 'admin')
        db_session.commit()
        headers = {
            'Authorization': f'Bearer {create_access_token(identity=admin_user.id)}',
            'X-Tenant-ID': str(sample_tenant.id),
        }

        response = client.get('/api/v1/grading/standards', headers=headers)

        assert response.status_code == 200
        payload = response.get_json()
        assert payload['success'] is True
        assert any(item['code'] == 'internal_exam' for item in payload['data'])

    def test_legacy_grading_routes_use_current_services(self, client, db_session, sample_tenant):
        """Legacy /grading routes should create enhanced grades and final grades via current services."""
        admin_user = create_test_user(db_session, 'legacy-grading-writer@example.com', 'admin', sample_tenant.id)
        create_test_membership(db_session, sample_tenant.id, admin_user.id, 'admin')
        db_session.commit()
        headers = {
            'Authorization': f'Bearer {create_access_token(identity=admin_user.id)}',
            'X-Tenant-ID': str(sample_tenant.id),
        }

        class_obj = Class(name='Grade 6A', grade_level='Grade 6', academic_year='2024/2025', tenant_id=sample_tenant.id)
        subject = Subject(name='Computing', code='COMP6', tenant_id=sample_tenant.id)
        scheme = GradingScheme(
            tenant_id=sample_tenant.id,
            name='Default Scheme',
            standard=GradingStandard.INTERNAL_EXAM,
            educational_level_id=None,
            is_active=True,
            is_default=True,
            class_score_weight=40,
            external_exam_weight=60,
        )
        db_session.add_all([class_obj, subject, scheme])
        db_session.flush()
        db_session.add_all([
            GradeBoundary(
                grading_scheme_id=scheme.id,
                grade_symbol='A1',
                grade_name='Excellent',
                min_score=80,
                max_score=100,
                is_passing=True,
                grade_points=1,
                sequence_order=1,
            ),
            GradeBoundary(
                grading_scheme_id=scheme.id,
                grade_symbol='F9',
                grade_name='Fail',
                min_score=0,
                max_score=79.99,
                is_passing=False,
                grade_points=9,
                sequence_order=2,
            ),
        ])
        student = Student(
            tenant_id=sample_tenant.id,
            first_name='Legacy',
            last_name='Route',
            email='legacy.route@example.com',
            date_of_birth=date(2012, 2, 2),
            gender='Male',
            admission_number='LEG001',
            class_id=class_obj.id,
            status='active',
        )
        db_session.add(student)
        db_session.commit()

        grade_response = client.post(
            f'/api/v1/grading/student/{student.id}/grade',
            json={
                'subject_id': subject.id,
                'class_id': class_obj.id,
                'assessment_type_id': 1,
                'grading_scheme_id': scheme.id,
                'raw_score': 85,
                'total_marks': 100,
                'assessment_name': 'Legacy Test',
                'assessment_date': '2026-07-04',
                'term': 'First Term',
                'academic_year': '2024/2025',
            },
            headers=headers,
        )

        assert grade_response.status_code == 201
        grade_payload = grade_response.get_json()
        assert grade_payload['success'] is True
        assert grade_payload['data']['grade_symbol'] == 'A1'

        final_response = client.post(
            f'/api/v1/grading/student/{student.id}/final-grade',
            json={
                'subject_id': subject.id,
                'class_id': class_obj.id,
                'grading_scheme_id': scheme.id,
                'term': 'First Term',
                'academic_year': '2024/2025',
                'external_score': 90,
            },
            headers=headers,
        )

        assert final_response.status_code == 201
        final_payload = final_response.get_json()
        assert final_payload['success'] is True
        assert final_payload['data']['final_grade_symbol'] == 'A1'
