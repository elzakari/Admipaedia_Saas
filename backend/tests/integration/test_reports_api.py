import pytest
import io
import json
from datetime import datetime

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

    def test_generate_student_report_card_no_data(self, auth_client, student_factory):
        """Test report card endpoint error handling when no progression exists."""
        student = student_factory()
        
        response = auth_client.get(f'/api/v1/reports/student/{student.id}/report-card')
        
        # Based on routes.py, it should return 404 if no progression found
        assert response.status_code == 404
        assert response.json['success'] is False
        assert 'No progression record found' in response.json['message']
