import pytest
from unittest.mock import patch, MagicMock
from app.services.teacher_service import TeacherService
from app.models.teacher import Teacher
from app.models.subject import Subject

@pytest.fixture
def teacher_service(app):
    with app.app_context():
        return TeacherService()

def test_get_all_teachers(app, teacher_service):
    """Test retrieving all teachers with pagination."""
    mock_teachers = [MagicMock(spec=Teacher) for _ in range(3)]
    mock_pagination = MagicMock()
    mock_pagination.items = mock_teachers
    mock_pagination.total = 3
    
    with app.app_context():
        with patch('app.models.teacher.Teacher.query') as mock_query:
            mock_query.options.return_value = mock_query
            mock_query.order_by.return_value = mock_query
            mock_query.paginate.return_value = mock_pagination
            
            result = teacher_service.get_all_teachers(page=1, per_page=10)
            
            assert result == mock_pagination
            mock_query.paginate.assert_called_once_with(
                page=1, per_page=10, error_out=False
            )

def test_create_teacher(app, teacher_service):
    """Test creating a new teacher."""
    teacher_data = {
        'name': 'John Doe',
        'email': 'john@example.com',
        'subject_id': 1,
        'phone': '+1234567890'
    }
    
    with app.app_context():
        with patch('app.extensions.db.session') as mock_session:
            with patch('app.models.teacher.Teacher') as mock_teacher_class:
                mock_teacher = MagicMock(spec=Teacher)
                mock_teacher_class.return_value = mock_teacher
                
                result = teacher_service.create_teacher(teacher_data)
                
                mock_teacher_class.assert_called_once_with(**teacher_data)
                mock_session.add.assert_called_once_with(mock_teacher)
                mock_session.commit.assert_called_once()
                assert result == mock_teacher

def test_update_teacher(app, teacher_service):
    """Test updating an existing teacher."""
    teacher_id = 1
    update_data = {'name': 'Jane Doe', 'email': 'jane@example.com'}
    
    mock_teacher = MagicMock(spec=Teacher)
    
    with app.app_context():
        with patch('app.models.teacher.Teacher.query') as mock_query:
            with patch('app.extensions.db.session') as mock_session:
                mock_query.get.return_value = mock_teacher
                
                result = teacher_service.update_teacher(teacher_id, update_data)
                
                mock_query.get.assert_called_once_with(teacher_id)
                mock_session.commit.assert_called_once()
                assert result == mock_teacher
                assert mock_teacher.name == update_data['name']
                assert mock_teacher.email == update_data['email']

def test_delete_teacher(app, teacher_service):
    """Test deleting a teacher."""
    teacher_id = 1
    mock_teacher = MagicMock(spec=Teacher)
    
    with app.app_context():
        with patch('app.models.teacher.Teacher.query') as mock_query:
            with patch('app.extensions.db.session') as mock_session:
                mock_query.get.return_value = mock_teacher
                
                result = teacher_service.delete_teacher(teacher_id)
                
                mock_query.get.assert_called_once_with(teacher_id)
                mock_session.delete.assert_called_once_with(mock_teacher)
                mock_session.commit.assert_called_once()
                assert result is True

def test_get_teacher_subjects(app, teacher_service):
    """Test retrieving subjects taught by a teacher."""
    teacher_id = 1
    mock_subjects = [MagicMock(spec=Subject) for _ in range(2)]
    mock_teacher = MagicMock(spec=Teacher)
    mock_teacher.subjects = mock_subjects
    
    with app.app_context():
        with patch('app.models.teacher.Teacher.query') as mock_query:
            mock_query.get.return_value = mock_teacher
            
            result = teacher_service.get_teacher_subjects(teacher_id)
            
            mock_query.get.assert_called_once_with(teacher_id)
            assert result == mock_subjects