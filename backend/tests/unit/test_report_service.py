import pytest
import io
import csv
from unittest.mock import MagicMock, patch
from datetime import datetime
from app.services.report_service import ReportService
from app.models.grade import Grade
from app.models.attendance import Attendance

def test_generate_csv_basic():
    """Test CSV generation with basic report data."""
    report_data = {
        'generated_at': '2026-02-03T00:00:00',
        'config': {'name': 'Test Report', 'type': 'academic'},
        'sections': [
            {
                'type': 'metric',
                'title': 'Average Grade',
                'value': 85.5
            },
            {
                'type': 'table',
                'title': 'Student Grades',
                'data': [
                    {'student': 'John Doe', 'subject': 'Math', 'score': 90, 'grade': 'A'},
                    {'student': 'Jane Smith', 'subject': 'Math', 'score': 81, 'grade': 'B'}
                ]
            }
        ]
    }
    
    csv_string = ReportService.generate_csv(report_data)
    
    assert isinstance(csv_string, str)
    assert 'ADMIPAEDIA Custom Report' in csv_string
    assert 'Test Report' in csv_string
    assert 'Average Grade' in csv_string
    assert '85.5' in csv_string
    assert 'John Doe' in csv_string
    assert 'Jane Smith' in csv_string

def test_generate_pdf_basic():
    """Test PDF generation returning a BytesIO buffer."""
    report_data = {
        'generated_at': '2026-02-03T00:00:00',
        'config': {'name': 'Test Report', 'type': 'academic'},
        'sections': [
            {
                'type': 'metric',
                'title': 'Average Grade',
                'value': 85.5
            },
            {
                'type': 'table',
                'title': 'Student Grades',
                'data': [
                    {'student': 'John Doe', 'subject': 'Math', 'score': 90, 'grade': 'A'}
                ]
            }
        ]
    }
    
    pdf_buffer = ReportService.generate_pdf(report_data)
    
    assert isinstance(pdf_buffer, io.BytesIO)
    content = pdf_buffer.getvalue()
    assert len(content) > 0
    # PDF files start with %PDF
    assert content.startswith(b'%PDF')

@patch('app.services.report_service.db.session')
def test_generate_custom_report_data_academic(mock_session):
    """Test data aggregation for academic reports."""
    # Mock query results
    mock_grade = MagicMock(spec=Grade)
    mock_grade.id = 1
    mock_grade.marks_obtained = 90
    mock_grade.grade_letter = 'A'
    mock_grade.student.first_name = 'John'
    mock_grade.student.last_name = 'Doe'
    mock_grade.subject.name = 'Math'
    
    # Configure mock query
    mock_session.query.return_value.join.return_value.filter.return_value.filter.return_value.filter.return_value.all.return_value = [mock_grade]
    mock_session.query.return_value.filter.return_value.scalar.return_value = 90.0
    
    config = {
        'type': 'academic',
        'dateRange': {'from': '2026-01-01T00:00:00', 'to': '2026-12-31T00:00:00'},
        'filters': {'classes': [1]},
        'visualizations': {'metrics': ['average_grade'], 'tables': ['student_grades']}
    }
    
    report_data = ReportService.generate_custom_report_data(config)
    
    assert report_data['config'] == config
    assert len(report_data['sections']) == 2
    
    metric_section = next(s for s in report_data['sections'] if s['type'] == 'metric')
    assert metric_section['value'] == 90.0
    
    table_section = next(s for s in report_data['sections'] if s['type'] == 'table')
    assert table_section['data'][0]['student'] == 'John Doe'
    assert table_section['data'][0]['score'] == 90

@patch('app.services.report_service.db.session')
def test_generate_custom_report_data_attendance(mock_session):
    """Test data aggregation for attendance reports."""
    mock_record = MagicMock(spec=Attendance)
    mock_record.status = 'present'
    
    # Simple mock chain
    mock_session.query.return_value.join.return_value.filter.return_value.filter.return_value.filter.return_value.all.return_value = [mock_record]
    
    config = {
        'type': 'attendance',
        'dateRange': {'from': '2026-01-01', 'to': '2026-12-31'},
        'filters': {'classes': [1]},
        'visualizations': {'metrics': ['attendance_rate']}
    }
    
    report_data = ReportService.generate_custom_report_data(config)
    
    assert len(report_data['sections']) == 1
    assert report_data['sections'][0]['title'] == 'Attendance Rate'
    assert report_data['sections'][0]['value'] == '100.0%'
