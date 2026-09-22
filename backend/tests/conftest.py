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
        from sqlalchemy.pool import StaticPool
        app.config['SQLALCHEMY_ENGINE_OPTIONS'] = {
            'poolclass': StaticPool,
            'connect_args': {'check_same_thread': False},
            'execution_options': {
                'schema_translate_map': {
                    'public': None
                }
            }
        }
    
    # Create the database and the database tables
    with app.app_context():
        import sqlalchemy as sa
        if test_db_url.startswith('postgres'):
            # Wipe entire schema cleanly (CASCADE handles FK dependencies)
            with _db.engine.connect() as conn:
                conn.execute(sa.text('DROP SCHEMA public CASCADE; CREATE SCHEMA public;'))
                # Pre-create the Postgres ENUM types with authoritative values
                # BEFORE `db.create_all()` runs.
                #
                # Background: SQLAlchemy creates native Postgres enums using
                # the values from the Python Enum class at first use, but the
                # test service container sometimes has stale type definitions
                # created earlier by migrations or prior fixtures.  This
                # produces:
                #   DataError: invalid input value for enum
                #   academic_structure_type: "discipline"
                # when the departments table DEFAULT 'discipline'::... hits a
                # stale enum type that doesn't actually have "discipline" as
                # a member.
                #
                # Postgres 14 (used by CI) does NOT support `CREATE TYPE IF
                # NOT EXISTS`, so wrap the creation in a DO block that checks
                # pg_type first.
                conn.execute(sa.text(r"""
                    DO $$
                    BEGIN
                        IF NOT EXISTS (
                            SELECT 1 FROM pg_type t
                            JOIN pg_namespace n ON n.oid = t.typnamespace
                            WHERE n.nspname = 'public'
                              AND t.typname = 'academic_structure_type'
                        ) THEN
                            CREATE TYPE academic_structure_type
                            AS ENUM ('discipline', 'cycle', 'operational');
                        END IF;
                    END $$;
                """))
                conn.commit()

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
        _db.session.rollback()
        _db.session.remove()

@pytest.fixture(scope='function')
def client(app):
    """A test client for the app."""
    return app.test_client()

@pytest.fixture(scope='function')
def auth_client(app, client):
    """A test client with authentication."""
    from app.models.user import User
    from app.extensions import bcrypt
    from flask_jwt_extended import create_access_token
    
    # Operate in the current app context (pushed by app_context autouse fixture)
    # so the user is created within the same savepoint/transaction that
    # db_isolation manages, making it visible to test body queries.
    user = _db.session.query(User).filter_by(email='test@example.com').first()
    if not user:
        user = User(
            username='testuser',
            email='test@example.com',
            password_hash=bcrypt.generate_password_hash('password').decode('utf-8'),
            role='admin',
            status='active'
        )
        _db.session.add(user)
    else:
        user.password_hash = bcrypt.generate_password_hash('password').decode('utf-8')
        user.role = 'admin'
        user.status = 'active'
    _db.session.flush()
    
    token = _create_tracked_test_access_token(user.id)
    client.environ_base['HTTP_AUTHORIZATION'] = f'Bearer {token}'
    
    return client

@pytest.fixture(scope='function')
def auth_headers(app):
    """Authorization headers for authenticated requests."""
    from app.models.user import User
    from app.extensions import bcrypt
    from flask_jwt_extended import create_access_token

    # Use the autouse app_context/db_isolation fixtures directly.
    # Opening a nested app context here creates a different scoped
    # SQLAlchemy session which is removed on context exit, causing the
    # flushed test user to disappear before the test executes.
    user = _db.session.query(User).filter_by(
        email='test@example.com'
    ).first()

    if not user:
        user = User(
            username='testuser',
            email='test@example.com',
            password_hash=bcrypt.generate_password_hash(
                'password'
            ).decode('utf-8'),
            role='admin',
            status='active'
        )
        _db.session.add(user)
    else:
        user.password_hash = bcrypt.generate_password_hash(
            'password'
        ).decode('utf-8')
        user.role = 'admin'
        user.status = 'active'

    _db.session.flush()

    token = _create_tracked_test_access_token(user.id)

    return {
        'Authorization': f'Bearer {token}'
    }

@pytest.fixture(scope='function')
def sample_student(app, sample_tenant):
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
            tenant_id=sample_tenant.id,
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
def db_isolation(app, app_context, request):
    from app.extensions import db

    session = db.session
    dialect = db.engine.dialect.name

    def clear_sqlite_database():
        """Delete all test rows while preserving the SQLite schema."""
        session.rollback()
        session.remove()

        raw = db.engine.raw_connection()
        cursor = raw.cursor()

        try:
            cursor.execute("PRAGMA foreign_keys=OFF")

            # SQLAlchemy metadata can retain transient test Table objects
            # after their physical SQLite tables have been dropped.
            # Clean only tables that actually exist in this database.
            cursor.execute(
                """
                SELECT name
                FROM sqlite_master
                WHERE type='table'
                  AND name NOT LIKE 'sqlite_%'
                """
            )
            existing_sqlite_tables = {
                row[0]
                for row in cursor.fetchall()
            }

            seen = set()
            for table in reversed(db.metadata.sorted_tables):
                table_name = table.name
                if table_name in seen:
                    continue
                seen.add(table_name)

                if table_name not in existing_sqlite_tables:
                    continue

                quoted = table_name.replace('"', '""')
                cursor.execute(f'DELETE FROM "{quoted}"')

            # Reset AUTOINCREMENT counters when sqlite_sequence exists.
            cursor.execute(
                """
                SELECT 1
                FROM sqlite_master
                WHERE type='table' AND name='sqlite_sequence'
                """
            )
            if cursor.fetchone():
                cursor.execute("DELETE FROM sqlite_sequence")

            raw.commit()
        finally:
            try:
                cursor.execute("PRAGMA foreign_keys=ON")
                raw.commit()
            finally:
                cursor.close()
                raw.close()

    # SQLite request handlers may use another scoped SQLAlchemy Session.
    # An uncommitted outer transaction therefore hides fixture rows from
    # those request-side queries. Use real commits on SQLite, then wipe all
    # rows between tests for deterministic isolation.
    if dialect == "sqlite":
        clear_sqlite_database()

        try:
            yield
        finally:
            clear_sqlite_database()

        return

    # ----------------------------------------------------------
    # PostgreSQL concurrency integration mode.
    #
    # Tests explicitly requesting the postgresql_real_commit fixture
    # need committed setup rows to be visible to independent database
    # connections/HTTP request contexts.
    #
    # This deliberately bypasses the normal savepoint commit shim ONLY
    # for those opt-in tests.
    # ----------------------------------------------------------
    if "postgresql_real_commit" in request.fixturenames:
        if dialect != "postgresql":
            raise RuntimeError(
                "postgresql_real_commit requires PostgreSQL"
            )

        from sqlalchemy import text as sa_text

        def clear_postgresql_committed_test_data():
            session.rollback()
            session.remove()

            tables = list(
                db.metadata.sorted_tables
            )

            if not tables:
                return

            preparer = (
                db.engine.dialect.identifier_preparer
            )

            table_sql = ", ".join(
                preparer.format_table(table)
                for table in tables
            )

            with db.engine.begin() as connection:
                connection.execute(
                    sa_text(
                        "TRUNCATE TABLE "
                        + table_sql
                        + " RESTART IDENTITY CASCADE"
                    )
                )

        # Start from a deterministic empty committed state.
        clear_postgresql_committed_test_data()

        try:
            yield
        finally:
            # No worker transaction should survive test completion.
            session.rollback()
            session.remove()

            # Real commits were intentionally permitted, so explicit
            # cleanup replaces rollback-based test isolation.
            clear_postgresql_committed_test_data()

        return

    # Non-SQLite databases keep transactional test isolation.
    session.rollback()
    savepoint = session.begin_nested()
    orig_commit = session.commit

    def commit_savepoint():
        nonlocal savepoint

        # Surface the original flush error instead of poisoning the Session
        # and replacing it with a later PendingRollbackError.
        session.flush()

        if savepoint.is_active:
            savepoint.commit()

        savepoint = session.begin_nested()

    session.commit = commit_savepoint

    try:
        yield
    finally:
        session.commit = orig_commit
        session.rollback()

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
def admin_headers(auth_headers, db_session, sample_tenant, rbac_defaults):
    from app.models.user import User
    from tests.test_production_integration import create_test_membership

    user = db_session.query(User).filter_by(
        email='test@example.com'
    ).one()

    create_test_membership(
        db_session,
        sample_tenant.id,
        user.id,
        'school_admin',
    )
    db_session.commit()

    headers = dict(auth_headers)
    headers['X-Tenant-ID'] = str(sample_tenant.id)
    return headers

@pytest.fixture
def teacher_headers(db_session, client, teacher_factory, sample_tenant):
    from tests.test_production_integration import create_test_membership

    teacher = teacher_factory(sample_tenant.id)
    create_test_membership(
        db_session,
        sample_tenant.id,
        teacher.user_id,
        'teacher',
    )
    db_session.commit()

    token = _create_tracked_test_access_token(
        teacher.user_id,
    )

    return {
        'Authorization': f'Bearer {token}',
        'X-Tenant-ID': str(sample_tenant.id),
    }

@pytest.fixture
def student_headers(db_session, client, student_factory, sample_tenant):
    from flask_jwt_extended import create_access_token
    from tests.test_production_integration import create_test_membership

    student = student_factory(tenant_id=sample_tenant.id)
    create_test_membership(db_session, sample_tenant.id, student.user_id, 'student')
    db_session.commit()

    token = _create_tracked_test_access_token(student.user_id)
    return {
        'Authorization': f'Bearer {token}',
        'X-Tenant-ID': str(sample_tenant.id),
    }

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
    def _create_user(role: str = 'user', email: str = None, password: str = None, username: str = None):
        u = User(
            username=username or unique_username('testuser'),
            email=email or unique_email('testuser'),
            role=role
        )
        u.set_password(password or 'Password123!')
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

def _create_tracked_test_access_token(user_id):
    """
    Create an access JWT together with its canonical SessionToken.

    Tests using protected endpoints must exercise the same
    server-side token tracking contract as production.

    This helper deliberately flushes rather than commits so the
    surrounding pytest transaction/savepoint remains authoritative.
    """
    from datetime import datetime, timezone

    from flask_jwt_extended import (
        create_access_token,
        decode_token,
    )

    from app.models.session_token import SessionToken

    token = create_access_token(
        identity=str(user_id)
    )

    payload = decode_token(token)

    jti = payload.get("jti")

    if not jti:
        raise RuntimeError(
            "Generated access JWT does not contain a JTI."
        )

    token_type = (
        payload.get("type")
        or "access"
    )

    exp = payload.get("exp")
    iat = payload.get("iat")

    if exp is None:
        raise RuntimeError(
            "Generated access JWT does not contain exp."
        )

    def _from_timestamp(value):
        if value is None:
            return datetime.now(timezone.utc)

        return datetime.fromtimestamp(
            value,
            tz=timezone.utc,
        )

    # Defensive idempotency helps fixtures that may share the same
    # helper during setup without producing duplicate-JTI rows.
    existing = SessionToken.find_by_jti(
        str(jti)
    )

    if existing is None:
        session_token = SessionToken(
            jti=str(jti),
            user_id=user_id,
            token_type=str(token_type),
            expires_at=_from_timestamp(exp),
        )

        # SessionToken has a custom constructor that deliberately
        # exposes only its canonical creation fields. issued_at is
        # still a mapped column, so set it after construction using
        # the actual JWT claim to keep persisted state synchronized
        # with the encoded token.
        session_token.issued_at = _from_timestamp(iat)

        _db.session.add(session_token)

        # SQLite request handlers may execute through another scoped
        # SQLAlchemy session. A flush is not sufficient to make the
        # SessionToken visible to the JWT blocklist callback in that
        # request-side session.
        #
        # SQLite tests already use real commits plus deterministic
        # database cleanup between tests. PostgreSQL tests retain
        # transactional/savepoint isolation and therefore flush only.
        if _db.engine.dialect.name == "sqlite":
            _db.session.commit()
        else:
            _db.session.flush()

    return token

@pytest.fixture
def postgresql_real_commit():
    """
    Explicit opt-in signal for tests that require genuine committed
    PostgreSQL transactions visible across independent connections.

    Ordinary tests continue using db_isolation savepoints.
    """
    yield

@pytest.fixture
def rbac_defaults(db_session):
    """Seed the current immutable RBAC templates for tenant-aware tests."""
    from app.services.rbac_service import RBACService

    assert RBACService.initialize_default_permissions() is True
    assert RBACService.initialize_default_roles() is True


@pytest.fixture(autouse=True)
def reset_security_rate_limiter():
    """
    Reset the in-memory rate limiter before and after each test.

    This isolates tests without disabling rate limiting itself.
    """
    from app.middleware.security_middleware import rate_limiter

    rate_limiter.requests.clear()
    rate_limiter.blocked_ips.clear()

    yield

    rate_limiter.requests.clear()
    rate_limiter.blocked_ips.clear()


@pytest.fixture
def sample_branch(
    db_session,
    sample_tenant,
):
    """Active Main Campus branch for branch-scoped tests."""
    from app.models.tenant import Branch

    branch = Branch.query.filter_by(
        tenant_id=sample_tenant.id,
        name="Main Campus",
    ).first()

    if branch is None:
        branch = Branch(
            tenant_id=sample_tenant.id,
            name="Main Campus",
            code="MAIN",
            is_active=True,
        )
        db_session.add(branch)
    else:
        branch.is_active = True

    db_session.commit()
    return branch


@pytest.fixture
def tenant_teacher(teacher_factory, sample_tenant):
    """Single tenant teacher shared by auth and class fixtures."""
    return teacher_factory(sample_tenant.id)


@pytest.fixture
def tenant_auth_client(
    auth_client,
    admin_headers,
    sample_tenant,
):
    """
    Authenticated school-admin client bound to the same
    tenant used by tenant-owned test records.

    This is intentionally separate from auth_client so
    tenantless/security tests keep their existing behavior.
    """
    tenant_header = admin_headers.get(
        "X-Tenant-ID"
    )

    expected = str(sample_tenant.id)

    if tenant_header != expected:
        raise RuntimeError(
            "Tenant auth fixture mismatch: "
            f"header={tenant_header!r}, "
            f"sample_tenant={expected!r}"
        )

    previous = auth_client.environ_base.get(
        "HTTP_X_TENANT_ID"
    )

    auth_client.environ_base[
        "HTTP_X_TENANT_ID"
    ] = tenant_header

    # Give tenant-aware legacy fixtures the exact native
    # Tenant.id value rather than reparsing the HTTP string.
    auth_client.test_tenant_id = (
        sample_tenant.id
    )

    try:
        yield auth_client
    finally:
        if previous is None:
            auth_client.environ_base.pop(
                "HTTP_X_TENANT_ID",
                None,
            )
        else:
            auth_client.environ_base[
                "HTTP_X_TENANT_ID"
            ] = previous

        if hasattr(
            auth_client,
            "test_tenant_id",
        ):
            delattr(
                auth_client,
                "test_tenant_id",
            )

@pytest.fixture
def tracked_access_token_factory():
    """
    Canonical factory for access JWTs used by integration tests.

    Every returned JWT has a matching SessionToken record and
    therefore exercises the same revocation contract as production.
    """
    return _create_tracked_test_access_token
