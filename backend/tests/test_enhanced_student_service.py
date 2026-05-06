import pytest
import tempfile
import os
from datetime import datetime, date
from unittest.mock import Mock, patch
from app.services.enhanced_student_service import EnhancedStudentService
from app.models.student import Student
from app.models.user import User
from app.models.parent import Parent
from app.models.attendance import Attendance

class TestEnhancedStudentService:
    """Test cases for EnhancedStudentService."""
    
    def test_create_student_with_user_success(self, app, db):
        """Test successful student creation with user account."""
        with app.app_context():
            student_data = {
                'admission_number': 'TEST001',
                'first_name': 'Test',
                'last_name': 'Student',
                'date_of_birth': date(2010, 1, 15),
                'gender': 'male',
                'address': '123 Test Street'
            }
            
            user_data = {
                'username': 'test_student',
                'email': 'test@example.com',
                'password': 'TestPass123!'
            }
            
            with patch('app.services.auth_service.AuthService.register_user') as mock_register:
                mock_user = Mock()
                mock_user.id = 1
                mock_register.return_value = mock_user
                
                with patch('app.services.student_service.StudentService.create_student') as mock_create:
                    mock_student = Mock()
                    mock_student.id = 1
                    mock_student.user_id = 1
                    mock_create.return_value = (mock_student, None)
                    
                    with patch.object(db.session, 'commit'), patch.object(db.session, 'rollback'):
                        student, error = EnhancedStudentService.create_student_with_user(student_data, user_data)
                        
                        assert student is not None
                        assert error is None
                        mock_register.assert_called_once()
                        mock_create.assert_called_once()
    
    def test_create_student_with_user_failure(self, app, db):
        """Test student creation failure with user account."""
        with app.app_context():
            student_data = {
                'admission_number': 'TEST001',
                'first_name': 'Test',
                'last_name': 'Student',
                'date_of_birth': date(2010, 1, 15),
                'gender': 'male'
            }
            
            user_data = {
                'username': 'test_student',
                'email': 'test@example.com',
                'password': 'TestPass123!'
            }
            
            with patch('app.services.auth_service.AuthService.register_user') as mock_register:
                mock_register.return_value = None
                
                with patch.object(db.session, 'rollback'):
                    student, error = EnhancedStudentService.create_student_with_user(student_data, user_data)
                    
                    assert student is None
                    assert error == "Failed to create user account"
    
    def test_allowed_file(self):
        """Test file extension validation."""
        assert EnhancedStudentService.allowed_file('test.jpg') == True
        assert EnhancedStudentService.allowed_file('test.png') == True
        assert EnhancedStudentService.allowed_file('test.gif') == True
        assert EnhancedStudentService.allowed_file('test.jpeg') == True
        assert EnhancedStudentService.allowed_file('test.txt') == False
        assert EnhancedStudentService.allowed_file('test.pdf') == False
        assert EnhancedStudentService.allowed_file('test') == False
    
    def test_upload_profile_picture_success(self, app, db):
        """Test successful profile picture upload."""
        with app.app_context():
            # Create a mock student
            with patch('app.models.student.Student.query') as mock_query:
                mock_student = Mock()
                mock_student.id = 1
                mock_student.profile_picture = None
                mock_query.get.return_value = mock_student
                
                # Create a mock file
                mock_file = Mock()
                mock_file.filename = 'test.jpg'
                mock_file.save = Mock()
                
                with patch('app.services.enhanced_student_service.EnhancedStudentService.allowed_file') as mock_allowed:
                    mock_allowed.return_value = True
                    
                    with patch('os.makedirs'), patch('app.extensions.db.session.commit'), \
                         patch('uuid.uuid4', return_value=Mock(hex='mock_uuid')), \
                         patch('os.path.join', return_value='mock_path'), \
                         patch.object(db.session, 'rollback'):
                        
                        # Mock current_app.root_path
                        with patch('flask.current_app') as mock_app:
                            mock_app.root_path = '/mock/root/path'
                            
                            file_path, error = EnhancedStudentService.upload_profile_picture(1, mock_file)
                            
                            assert error is None
                            assert file_path is not None
                            assert 'uploads/profile_pictures' in file_path
    
    def test_upload_profile_picture_invalid_file(self, app, db):
        """Test profile picture upload with invalid file."""
        with app.app_context():
            with patch('app.models.student.Student.query') as mock_query:
                mock_student = Mock()
                mock_query.get.return_value = mock_student
                
                mock_file = Mock()
                mock_file.filename = 'test.txt'
                
                with patch('app.services.enhanced_student_service.EnhancedStudentService.allowed_file') as mock_allowed:
                    mock_allowed.return_value = False
                    
                    with patch.object(db.session, 'rollback'):
                        file_path, error = EnhancedStudentService.upload_profile_picture(1, mock_file)
                        
                        assert file_path is None
                        assert "Invalid file type" in error
    
    def test_bulk_import_csv_success(self, app, db):
        """Test successful CSV bulk import."""
        with app.app_context():
            # Create a temporary CSV file
            csv_content = "admission_number,date_of_birth,gender,first_name,last_name\nTEST001,2010-01-15,male,John,Doe\nTEST002,2010-02-20,female,Jane,Smith"
            
            with tempfile.NamedTemporaryFile(mode='w', suffix='.csv', delete=False, encoding='utf-8') as f:
                f.write(csv_content)
                temp_path = f.name
            
            try:
                with patch('app.services.student_service.StudentService.create_student') as mock_create:
                    mock_student1 = Mock()
                    mock_student1.id = 1
                    mock_student1.admission_number = 'TEST001'
                    
                    mock_student2 = Mock()
                    mock_student2.id = 2
                    mock_student2.admission_number = 'TEST002'
                    
                    mock_create.side_effect = [(mock_student1, None), (mock_student2, None)]
                    
                    with patch('pandas.read_csv'), patch('pandas.read_excel'), \
                         patch('pandas.to_datetime', return_value=Mock(date=lambda: date(2010, 1, 15))), \
                         patch('pandas.notna', return_value=False), \
                         patch.object(db.session, 'rollback'):
                        
                        # Mock pandas DataFrame
                        mock_df = Mock()
                        mock_df.columns = ['admission_number', 'date_of_birth', 'gender', 'first_name', 'last_name']
                        mock_df.iterrows.return_value = [
                            (0, {'admission_number': 'TEST001', 'date_of_birth': '2010-01-15', 'gender': 'male', 'first_name': 'John', 'last_name': 'Doe'}),
                            (1, {'admission_number': 'TEST002', 'date_of_birth': '2010-02-20', 'gender': 'female', 'first_name': 'Jane', 'last_name': 'Smith'})
                        ]
                        
                        with patch('pandas.read_csv', return_value=mock_df):
                            result, error = EnhancedStudentService.bulk_import_students(temp_path, False)
                            
                            assert error is None
                            assert result['successful_count'] == 2
                            assert result['failed_count'] == 0
                            assert len(result['successful_imports']) == 2
            
            finally:
                os.unlink(temp_path)
    
    def test_bulk_import_invalid_file(self, app, db):
        """Test bulk import with invalid file format."""
        with app.app_context():
            with patch.object(db.session, 'rollback'):
                result, error = EnhancedStudentService.bulk_import_students('test.txt', False)
                
                assert result is None
                assert "Unsupported file format" in error
    
    def test_get_student_analytics_success(self, app, db):
        """Test successful student analytics retrieval."""
        with app.app_context():
            with patch('app.models.student.Student.query') as mock_student_query:
                mock_student = Mock()
                mock_student.id = 1
                mock_student.first_name = 'Test'
                mock_student.last_name = 'Student'
                mock_student.admission_number = 'TEST001'
                mock_student_query.get.return_value = mock_student
                
                # Mock attendance data
                with patch('app.models.attendance.Attendance.query') as mock_attendance_query:
                    # Mock attendance query chain
                    mock_filter = Mock()
                    mock_attendance_query.filter.return_value = mock_filter
                    mock_filter.count.return_value = 20
                    mock_filter.filter.return_value.count.side_effect = [18, 2, 0]  # present, absent, late
                    
                    with patch('app.extensions.db.session.query') as mock_db_query:
                        mock_db_query.return_value.filter.return_value.group_by.return_value.all.return_value = []
                        
                        with patch.object(db.session, 'rollback'):
                            analytics, error = EnhancedStudentService.get_student_analytics(1)
                            
                            assert error is None
                            assert analytics is not None
                            assert 'attendance' in analytics
                            assert 'performance' in analytics
                            assert 'trends' in analytics
    
    def test_get_student_analytics_not_found(self, app, db):
        """Test analytics retrieval for non-existent student."""
        with app.app_context():
            with patch('app.models.student.Student.query') as mock_query:
                mock_query.get.return_value = None
                
                with patch.object(db.session, 'rollback'):
                    analytics, error = EnhancedStudentService.get_student_analytics(999)
                    
                    assert analytics is None
                    assert error == "Student not found"
    
    def test_link_student_to_parent_success(self, app, db):
        """Test successful student-parent linking."""
        with app.app_context():
            with patch('app.models.student.Student.query') as mock_student_query:
                mock_student = Mock()
                mock_student.id = 1
                mock_student_query.get.return_value = mock_student
                
                with patch('app.models.parent.Parent.query') as mock_parent_query:
                    mock_parent = Mock()
                    mock_parent.id = 1
                    mock_parent_query.get.return_value = mock_parent
                    
                    with patch('app.extensions.db.session.commit'), patch.object(db.session, 'rollback'):
                        student, error = EnhancedStudentService.link_student_to_parent(1, 1)
                        
                        assert error is None
                        assert student is not None
                        assert student.parent_id == 1
    
    def test_link_student_to_parent_student_not_found(self, app, db):
        """Test student-parent linking with non-existent student."""
        with app.app_context():
            with patch('app.models.student.Student.query') as mock_query:
                mock_query.get.return_value = None
                
                with patch.object(db.session, 'rollback'):
                    student, error = EnhancedStudentService.link_student_to_parent(999, 1)
                    
                    assert student is None
                    assert error == "Student not found"
    
    def test_link_student_to_parent_parent_not_found(self, app, db):
        """Test student-parent linking with non-existent parent."""
        with app.app_context():
            with patch('app.models.student.Student.query') as mock_student_query:
                mock_student = Mock()
                mock_student_query.get.return_value = mock_student
                
                with patch('app.models.parent.Parent.query') as mock_parent_query:
                    mock_parent_query.get.return_value = None
                    
                    with patch.object(db.session, 'rollback'):
                        student, error = EnhancedStudentService.link_student_to_parent(1, 999)
                        
                        assert student is None
                        assert error == "Parent not found"
    
    def test_get_students_by_parent_success(self, app, db):
        """Test successful retrieval of students by parent."""
        with app.app_context():
            with patch('app.models.student.Student.query') as mock_query:
                mock_students = [Mock(), Mock()]
                mock_query.filter_by.return_value.all.return_value = mock_students
                
                with patch.object(db.session, 'rollback'):
                    students, error = EnhancedStudentService.get_students_by_parent(1)
                    
                    assert error is None
                    assert students == mock_students
                    assert len(students) == 2
    
    def test_generate_student_report_success(self, app, db):
        """Test successful student report generation."""
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
                    
                    # Add patch for any file operations that might be happening
                    with patch('builtins.open', new_callable=lambda: lambda *args, **kwargs: open(*args, **kwargs, encoding='utf-8') if 'encoding' not in kwargs else open(*args, **kwargs)):
                        with patch.object(db.session, 'rollback'):
                            report, error = EnhancedStudentService.generate_student_report(1)
                            
                            assert error is None
                            assert report is not None
                            assert 'student_info' in report
                            assert 'analytics' in report
                            assert 'generated_at' in report
    
    def test_generate_student_report_not_found(self, app, db):
        """Test report generation for non-existent student."""
        with app.app_context():
            with patch('app.models.student.Student.query') as mock_query:
                mock_query.get.return_value = None
                
                # Add patch for any file operations that might be happening
                with patch('builtins.open', new_callable=lambda: lambda *args, **kwargs: open(*args, **kwargs, encoding='utf-8') if 'encoding' not in kwargs else open(*args, **kwargs)):
                    with patch.object(db.session, 'rollback'):
                        report, error = EnhancedStudentService.generate_student_report(999)
                        
                        assert report is None
                        assert error == "Student not found"

# Fixtures for testing
@pytest.fixture
def app():
    """Create application for testing."""
    from app import create_app
    app = create_app('testing')
    return app

@pytest.fixture
def db(app):
    """Create database for testing."""
    from app.extensions import db as _db
    with app.app_context():
        _db.create_all()
        yield _db
        _db.drop_all()