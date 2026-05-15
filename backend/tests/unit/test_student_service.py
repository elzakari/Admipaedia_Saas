import pytest
from unittest.mock import patch, MagicMock
from app.services.student_service import StudentService
from app.models.student import Student

@pytest.fixture
def student_service(app):
    # Create a mock db session
    mock_db_session = MagicMock()
    with app.app_context():
        return StudentService(db_session=mock_db_session)

def test_get_all_students(app, student_service):
    # Mock the query result
    mock_students = [MagicMock(spec=Student) for _ in range(3)]
    mock_pagination = MagicMock()
    mock_pagination.items = mock_students
    
    with app.app_context():
        with patch('app.models.student.Student.query') as mock_query:
            mock_query.options.return_value = mock_query
            mock_query.order_by.return_value = mock_query
            mock_query.paginate.return_value = mock_pagination
            
            result = student_service.get_all_students()
            
            assert result == mock_pagination
            mock_query.options.assert_called_once()
            mock_query.order_by.assert_called_once()
            mock_query.paginate.assert_called_once()

def test_get_student_by_id(app, student_service):
    # Mock the query result
    mock_student = MagicMock(spec=Student)
    mock_student.id = 1
    
    with app.app_context():
        with patch('app.models.student.Student.query') as mock_query:
            with patch('app.services.student_service.cache_service') as mock_cache:
                with patch('app.services.student_service.student_schema.dump') as mock_dump:
                    mock_query.options.return_value = mock_query
                    mock_query.get.return_value = mock_student
                    mock_dump.return_value = {'id': 1}
                    result = student_service.get_student_by_id(1)
                
                assert result == mock_student
                mock_query.options.assert_called_once()
                mock_query.get.assert_called_once_with(1)