import pytest
from unittest.mock import Mock, patch
from datetime import date
from app.services.enhanced_student_service import EnhancedStudentService
from app.models.student import Student

def test_generate_report_simple(app, db):
    """A simplified test for generate_student_report."""
    with app.app_context():
        with patch('app.models.student.Student.query') as mock_query:
            mock_student = Mock()
            mock_student.id = 1
            mock_student.admission_number = 'TEST001'
            mock_student.date_of_birth = date(2010, 1, 15)
            mock_student.gender = 'male'
            mock_student.address = '123 Test St'
            mock_student.class_id = 1
            mock_student.parent_id = 1
            mock_student.first_name = 'Test'
            mock_student.last_name = 'Student'
            mock_student.user = Mock()
            mock_student.user.username = 'test_user'
            mock_student.user.email = 'test@example.com'
            mock_query.get.return_value = mock_student
            
            with patch('app.services.enhanced_student_service.EnhancedStudentService.get_student_analytics') as mock_analytics:
                mock_analytics.return_value = ({'test': 'data'}, None)
                
                # Use Latin-1 encoding for any file operations
                with patch('builtins.open', new_callable=lambda: lambda *args, **kwargs: open(*args, **kwargs, encoding='latin-1') if 'encoding' not in kwargs else open(*args, **kwargs)):
                    report, error = EnhancedStudentService.generate_student_report(1)
                    
                    assert error is None
                    assert report is not None