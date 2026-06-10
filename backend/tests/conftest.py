import pytest
from app import create_app
from app.extensions import db as _db
from datetime import datetime
import os
import tempfile

@pytest.fixture(scope='session')
def app():
    """Create and configure a Flask app for testing."""
    app = create_app('testing')
    # Configure test database from environment or fallback to SQLite
    test_db_url = os.environ.get('TEST_DB_URL')
    if not test_db_url:
        test_db_url = 'sqlite:///:memory:'
    app.config['SQLALCHEMY_DATABASE_URI'] = test_db_url
    app.config['TESTING'] = True

    if test_db_url.startswith('sqlite'):
        app.config['SQLALCHEMY_ENGINE_OPTIONS'] = {
            'execution_options': {
                'schema_translate_map': {
                    'public': None
                }
            }
        }
    
    # Create the database and the database tables
    with app.app_context():
        _db.drop_all()
        _db.create_all()
        
        yield app
        
        _db.session.remove()  # Clean up session
        _db.engine.dispose()  # PHYSICALLY close all Postgres connections

@pytest.fixture(scope='function')
def db(app):
    """Create a database for the tests."""
    with app.app_context():
        _db.create_all()
        yield _db
        # _db.drop_all() removed to prevent destroying tables for subsequent tests in session

@pytest.fixture(scope='function')
def client(app):
    """A test client for the app."""
    return app.test_client()

@pytest.fixture(scope='function')
def auth_client(app, client):
    """A test client with authentication."""
    from app.models.user import User
    from app.extensions import bcrypt
    
    with app.app_context():
        # Use _db.session so this is visible inside db_isolation's transaction
        user = _db.session.query(User).filter_by(email='test@example.com').first()
        if not user:
            user = User(
                username='testuser',
                email='test@example.com',
                password_hash=bcrypt.generate_password_hash('password').decode('utf-8'),
                role='admin'
            )
            _db.session.add(user)
            _db.session.flush()  # flush so the user gets an id, but don't commit
        
        # Login and get token
        response = client.post('/api/v1/auth/login', json={
            'email': 'test@example.com',
            'password': 'password'
        })
        if response.json and response.json.get('access_token'):
            token = response.json['access_token']
            client.environ_base['HTTP_AUTHORIZATION'] = f'Bearer {token}'
        
    return client

@pytest.fixture(scope='function')
def auth_headers(app, client):
    """Authorization headers for authenticated requests."""
    # Ensure test user exists and obtain JWT
    from app.models.user import User
    from app.extensions import bcrypt
    with app.app_context():
        user = User.query.filter_by(email='test@example.com').first()
        if not user:
            user = User(
                username='testuser',
                email='test@example.com',
                password_hash=bcrypt.generate_password_hash('password').decode('utf-8'),
                role='admin'
            )
            _db.session.add(user)
            _db.session.commit()
    resp = client.post('/api/v1/auth/login', json={'email': 'test@example.com', 'password': 'password'})
    token = resp.json.get('access_token')
    return {'Authorization': f'Bearer {token}'}

@pytest.fixture(scope='function')
def sample_student(app):
    from app.models.student import Student
    from app.models.user import User
    import uuid
    with app.app_context():
        suffix = uuid.uuid4().hex[:6]
        user = User(username=f'studentuser_{suffix}', email=f'student_user_{suffix}@example.com', role='student')
        user.set_password_hash('Password123!')
        _db.session.add(user)
        _db.session.flush()
        student = Student(
            admission_number=f'STU_TEST_{suffix}',
            first_name='Test',
            last_name='Student',
            gender='male',
            email=f'student_test_{suffix}@example.com',
            date_of_birth=datetime(2010, 1, 1).date(),
            user_id=user.id,
            status='active'
        )
        _db.session.add(student)
        _db.session.commit()
        class _S: pass
        st = _S()
        st.id = student.id
        return st

@pytest.fixture(scope='function')
def large_competency_dataset(app):
    from app.models.educational_level import CoreCompetency
    with app.app_context():
        items = []
        for i in range(100):
            comp = CoreCompetency(name=f'Competency {i}', category='general', is_active=True)
            _db.session.add(comp)
            items.append(comp)
        _db.session.commit()
        return items

@pytest.fixture(scope='function')
def large_class_dataset(app):
    from app.models.class_ import Class
    from app.models.student import Student
    from app.models.user import User
    import uuid
    with app.app_context():
        suffix = uuid.uuid4().hex[:6]
        cls = Class(name=f'Test Class {suffix}', grade_level='Primary 1', academic_year='2024/2025')
        _db.session.add(cls)
        _db.session.flush()
        base_user = User(username=f'bulkstudentuser_{suffix}', email=f'bulk_student_user_{suffix}@example.com', role='student')
        base_user.set_password_hash('Password123!')
        _db.session.add(base_user)
        _db.session.flush()
        for i in range(50):
            st = Student(
                admission_number=f'STU_{suffix}_{i}',
                first_name='Test',
                last_name=f'Student{i}',
                class_id=cls.id,
                gender='male',
                email=f'student{i}_{suffix}@example.com',
                date_of_birth=datetime(2010, 1, 1).date(),
                user_id=base_user.id,
                status='active'
            )
            _db.session.add(st)
        _db.session.flush()
        # Create default competency profiles for first 10 students
        from app.models.competency_framework import StudentCompetencyProfile
        for s in Student.query.filter_by(class_id=cls.id).limit(10).all():
            profile = StudentCompetencyProfile(
                student_id=s.id,
                academic_year='2024/2025',
                communication_collaboration_score=0.0,
                critical_thinking_score=0.0,
                creativity_innovation_score=0.0,
                cultural_identity_score=0.0,
                personal_development_score=0.0,
                digital_literacy_score=0.0,
                overall_score=0.0,
                strengths=[],
                areas_for_improvement=[],
                recommended_activities=[],
                updated_by=base_user.id
            )
            _db.session.add(profile)
        _db.session.commit()
        class _C: pass
        c = _C()
        c.id = cls.id
        return c
@pytest.fixture(scope='function')
def db_session(app):
    with app.app_context():
        yield _db.session
import uuid

@pytest.fixture(autouse=True)
def app_context(app):
    ctx = app.app_context()
    ctx.push()
    try:
        yield
    finally:
        ctx.pop()

@pytest.fixture(autouse=True)
def db_isolation(app):
    from app.extensions import db
    
    session = db.session
    nested = session.begin_nested()
    
    # Save original commit and wrap it
    orig_commit = session.commit
    def commit_savepoint():
        nonlocal nested
        if nested.is_active:
            nested.commit()
        nested = session.begin_nested()
        
    session.commit = commit_savepoint

    try:
        yield
    finally:
        session.commit = orig_commit
        try:
            session.rollback()
        except Exception:
            pass

@pytest.fixture
def sample_tenant(db_session):
    from app.models.tenant import Tenant
    import uuid
    tenant = Tenant(
        name="Test School",
        slug=f"test-school-{uuid.uuid4().hex[:6]}",
        country_code="GH",
        currency="GHS",
        schema_name=f"tenant_{uuid.uuid4().hex[:8]}"
    )
    db_session.add(tenant)
    db_session.flush()
    return tenant

@pytest.fixture
def admin_auth_headers(auth_headers):
    return auth_headers

@pytest.fixture
def admin_headers(auth_headers):
    return auth_headers

@pytest.fixture
def sample_class(db_session, teacher_factory, sample_tenant):
    from app.models.class_ import Class
    from app.services.class_service import ClassService
    teacher = teacher_factory()
    c = Class(
        name=f"Class {uuid.uuid4().hex[:6]}",
        grade_level='Primary 1',
        academic_year='2024/2025',
        capacity=30,
        teacher_id=teacher.id,
        tenant_id=sample_tenant.id,
        status='active'
    )
    db_session.add(c)
    db_session.flush()
    ClassService.assign_teacher(c.id, teacher.id)
    return c

def unique_email(prefix: str = 'user'):
    return f"{prefix}_{uuid.uuid4().hex[:8]}@example.com"

def unique_username(prefix: str = 'user'):
    return f"{prefix}_{uuid.uuid4().hex[:8]}"

@pytest.fixture
def user_factory(db_session):
    from app.models.user import User
    def _create_user(role: str = 'user'):
        u = User(username=unique_username('testuser'), email=unique_email('testuser'), role=role)
        u.set_password('Password123!')
        db_session.add(u)
        db_session.flush()
        return u
    return _create_user

@pytest.fixture
def student_factory(db_session, user_factory, sample_tenant):
    from app.models.student import Student
    def _create_student(class_id: int = None, tenant_id=None):
        user = user_factory('student')
        s = Student(
            user_id=user.id,
            tenant_id=tenant_id or sample_tenant.id,
            admission_number=f"ADM-{datetime.now().year}-{uuid.uuid4().hex[:5].upper()}",
            first_name='Test',
            last_name=unique_username('Student'),
            date_of_birth=datetime(2010, 1, 1).date(),
            gender='male',
            email=user.email,
            class_id=class_id,
            status='active'
        )
        db_session.add(s)
        db_session.flush()
        return s
    return _create_student

@pytest.fixture
def teacher_factory(db_session, user_factory, sample_tenant):
    from app.models.teacher import Teacher
    def _create_teacher(tenant_id=None):
        user = user_factory('teacher')
        t = Teacher(
            user_id=user.id,
            tenant_id=tenant_id or sample_tenant.id,
            employee_id=f"EMP-{datetime.now().year}-{uuid.uuid4().hex[:5].upper()}",
            first_name='Teacher',
            last_name=unique_username('Name'),
            status='active'
        )
        db_session.add(t)
        db_session.flush()
        return t
    return _create_teacher

