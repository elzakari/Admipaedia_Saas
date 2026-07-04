import pytest
import io
import json
from datetime import datetime, date

from app.models.class_ import Class
from app.models.educational_level import EducationalLevel
from app.models.grading_system import FinalGrade, GradingScheme, GradingStandard
from app.models.progression_tracking import PromotionStatus, StudentProgression
from app.models.student import Student
from app.models.subject import Subject
from app.models.user import User

@pytest.mark.usefixtures('app_context', 'db_isolation')
class TestReportsAPI:
    
    def test_generate_custom_report_academic(self, auth_client, student_factory):
        """Test generating report data via API."""
        # Setup data
        student = student_factory()
        
        config = {
            'type': 'academic',
            'dateRange': {'from': '2026-01-01', 'to': '2026-12-31'},
            'filters': {'students': [student.id]},
            'visualizations': {'metrics': ['average_grade'], 'tables': ['student_grades']}
        }
        
        response = auth_client.post('/api/v1/reports/custom', json=config)
        
        assert response.status_code == 200
        data = response.json
        assert data['success'] is True
        assert 'data' in data
        assert 'generated_at' in data['data']
        assert 'sections' in data['data']

    def test_export_report_pdf(self, auth_client):
        """Test exporting report data to PDF."""
        report_data = {
            'generated_at': datetime.now().isoformat(),
            'config': {'name': 'Test Report', 'type': 'academic'},
            'sections': [
                {'type': 'metric', 'title': 'Avg', 'value': 75}
            ]
        }
        
        response = auth_client.post('/api/v1/reports/export', json={
            'report_data': report_data,
            'format': 'pdf'
        })
        
        assert response.status_code == 200
        assert response.mimetype == 'application/pdf'
        assert response.data.startswith(b'%PDF')

    def test_export_report_csv(self, auth_client):
        """Test exporting report data to CSV."""
        report_data = {
            'generated_at': datetime.now().isoformat(),
            'config': {'name': 'Test Report', 'type': 'academic'},
            'sections': [
                {'type': 'metric', 'title': 'Avg', 'value': 75}
            ]
        }
        
        response = auth_client.post('/api/v1/reports/export', json={
            'report_data': report_data,
            'format': 'csv'
        })
        
        assert response.status_code == 200
        assert response.mimetype == 'text/csv'
        content = response.data.decode('utf-8')
        assert 'ADMIPAEDIA Custom Report' in content
        assert 'Test Report' in content

    def test_generate_student_report_card_no_data(self, client, student_factory, teacher_headers, sample_tenant):
        """Test report card endpoint error handling when no progression exists."""
        student = student_factory(tenant_id=sample_tenant.id)
        
        response = client.get(f'/api/v1/reports/student/{student.id}/report-card', headers=teacher_headers)
        
        # Based on routes.py, it should return 404 if no progression found
        assert response.status_code == 404
        assert response.json['success'] is False
        assert 'No progression record found' in response.json['message']

    def test_generate_student_report_card_uses_final_grades(self, client, db_session, sample_tenant, teacher_headers, teacher_factory):
        """Report cards should prefer FinalGrade rows for final subject outcomes."""
        teacher = teacher_factory(sample_tenant.id)
        db_session.flush()

        level = EducationalLevel(
            level_code='B6',
            level_name='Basic 6',
            key_phase='key_phase_3',
        )
        db_session.add(level)
        db_session.flush()

        class_obj = Class(
            tenant_id=sample_tenant.id,
            name='Reports Class',
            grade_level='Primary 6',
            academic_year='2024/2025',
            status='active',
        )
        subject = Subject(
            tenant_id=sample_tenant.id,
            name='Mathematics',
            code='MATH-RPT',
        )
        scheme = GradingScheme(
            tenant_id=sample_tenant.id,
            name='Tenant Default',
            standard=GradingStandard.INTERNAL_EXAM,
            is_active=True,
            is_default=True,
            class_score_weight=40,
            external_exam_weight=60,
        )
        db_session.add_all([class_obj, subject, scheme])
        db_session.flush()

        student = Student(
            tenant_id=sample_tenant.id,
            admission_number='RPT001',
            first_name='Report',
            last_name='Student',
            date_of_birth=date(2012, 1, 1),
            gender='Female',
            email='report.student@example.com',
            class_id=class_obj.id,
            status='active',
        )
        db_session.add(student)
        db_session.flush()

        db_session.add(
            StudentProgression(
                student_id=student.id,
                academic_year='2024/2025',
                current_level_id=level.id,
                next_level_id=level.id,
                overall_academic_average=88.0,
                attendance_percentage=95.0,
                core_competencies_average=3.0,
                character_development_score=3.0,
                meets_academic_threshold=True,
                meets_attendance_threshold=True,
                meets_competency_threshold=True,
                promotion_status=PromotionStatus.PROMOTED,
                promotion_decision_date=date(2025, 7, 1),
                recommended_by=teacher.user_id,
                approved_by=teacher.user_id,
            )
        )
        db_session.add(
            FinalGrade(
                student_id=student.id,
                subject_id=subject.id,
                class_id=class_obj.id,
                grading_scheme_id=scheme.id,
                term='First Term',
                academic_year='2024/2025',
                class_score_average=88.0,
                external_exam_score=90.0,
                final_percentage=88.0,
                final_grade_symbol='A1',
                final_grade_points=4.0,
                is_passing=True,
                teacher_remarks='Excellent work',
                computed_by=teacher.user_id,
            )
        )
        db_session.commit()

        response = client.get(
            f'/api/v1/reports/student/{student.id}/report-card?term=First%20Term&academic_year=2024/2025',
            headers=teacher_headers,
        )

        assert response.status_code == 200
        payload = response.get_json()
        assert payload['success'] is True
        subject_row = payload['data']['academic_performance']['subjects'][0]
        assert subject_row['name'] == 'Mathematics'
        assert subject_row['score'] == 88.0
        assert subject_row['grade'] == 'A1'
        assert subject_row['grade_point'] == 4.0
        assert subject_row['remarks'] == 'Excellent work'
