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
    """Test creating a new teacher.
    
    Supply 'employee_id' in teacher_data to bypass the while-True uniqueness
    loop in the service.  Patch at the service module's import namespace so
    the mocks are actually seen by the running service code.
    """
    teacher_data = {
        'email': 'john@example.com',
        'employee_id': 'T12345',   # skip the auto-generate while-True loop
        'first_name': 'John',
        'last_name': 'Doe',
        'phone': '+1234567890'
    }

    mock_user = MagicMock()
    mock_user.id = 42
    mock_teacher = MagicMock(spec=Teacher)
    mock_teacher.id = 99
    mock_teacher.user_id = 42

    with app.app_context():
        with patch('app.services.teacher_service.User') as mock_user_class, \
             patch('app.services.teacher_service.Teacher') as mock_teacher_class, \
             patch('app.services.teacher_service.db') as mock_db, \
             patch('app.services.teacher_service.broadcast_teacher_update'), \
             patch('app.services.teacher_service.cache_service'):

            # No existing user with that email → create one
            mock_user_class.query.filter_by.return_value.first.return_value = None
            mock_user_class.return_value = mock_user

            # No existing teacher with that employee_id → uniqueness check passes
            # Also no existing teacher profile for the user
            mock_teacher_class.query.filter_by.return_value.first.return_value = None

            # Teacher() constructor returns our mock instance
            mock_teacher_class.return_value = mock_teacher

            result, error = teacher_service.create_teacher(teacher_data)

            assert error is None
            assert result == mock_teacher
            mock_db.session.commit.assert_called_once()

def test_update_teacher(app, teacher_service):
    """Test updating an existing teacher."""
    teacher_id = 1
    update_data = {'name': 'Jane Doe', 'email': 'jane@example.com'}
    
    mock_teacher = MagicMock(spec=Teacher)

    with app.app_context():
        with patch('app.services.teacher_service.Teacher') as mock_teacher_class, \
             patch('app.services.teacher_service.db') as mock_db, \
             patch('app.services.teacher_service.broadcast_teacher_update'), \
             patch('app.services.teacher_service.cache_service'):

            mock_teacher_class.query.get.return_value = mock_teacher

            result, error = teacher_service.update_teacher(teacher_id, update_data)

            assert error is None
            assert result == mock_teacher
            mock_db.session.commit.assert_called_once()

def test_delete_teacher(app, teacher_service):
    """Test deleting a teacher."""
    teacher_id = 1
    mock_teacher = MagicMock(spec=Teacher)

    with app.app_context():
        with patch('app.services.teacher_service.Teacher') as mock_teacher_class, \
             patch('app.services.teacher_service.db') as mock_db, \
             patch('app.services.teacher_service.broadcast_teacher_update'), \
             patch('app.services.teacher_service.cache_service'):

            mock_teacher_class.query.get.return_value = mock_teacher

            result, error = teacher_service.delete_teacher(teacher_id)

            assert error is None
            assert result is True
            mock_db.session.delete.assert_called_once_with(mock_teacher)
            mock_db.session.commit.assert_called_once()

def test_get_teacher_subjects(app, teacher_service):
    """Test retrieving subjects taught by a teacher."""
    teacher_id = 1
    mock_subjects = [MagicMock(spec=Subject) for _ in range(2)]
    mock_teacher = MagicMock(spec=Teacher)
    mock_teacher.subjects = mock_subjects
    
    with app.app_context():
        with patch('app.services.teacher_service.Teacher') as mock_teacher_class:
            mock_teacher_class.query.get.return_value = mock_teacher
            
            result = teacher_service.get_teacher_subjects(teacher_id)
            
            mock_teacher_class.query.get.assert_called_once_with(teacher_id)
            assert result == mock_subjects