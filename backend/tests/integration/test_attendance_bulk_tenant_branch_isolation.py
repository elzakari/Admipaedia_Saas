
"""V28-R11A.2I

Adversarial certification for canonical attendance bulk upsert.

These tests exercise the service security boundary directly because the
unscoped Attendance identity lookup is intentionally a service-internal
privileged operation.

Security contract:
    tenant -> branch -> class -> student -> attendance identity
"""

import uuid
from datetime import date

import pytest

from app.extensions import db
from app.models.attendance import Attendance
from app.models.class_ import Class
from app.models.student import Student
from app.models.subject import Subject
from app.models.tenant import Branch, Tenant
from app.models.user import User
from app.services.attendance_service import AttendanceService


def _uid(prefix):
    return f"{prefix}-{uuid.uuid4().hex[:10]}"


def _make_tenant(name):
    """Create a minimal tenant using the canonical required fields."""
    token = uuid.uuid4().hex[:10]

    tenant = Tenant(
        name=f"{name} {token}",
        slug=f"{name.lower().replace(' ', '-')}-{token}",
        country_code="GH",
        schema_name=f"t_{token}",
    )

    db.session.add(tenant)
    db.session.flush()
    return tenant


def _make_branch(tenant_id, label):
    """Create a real tenant-owned branch for FK and isolation integrity."""
    token = uuid.uuid4().hex[:8]

    branch = Branch(
        tenant_id=tenant_id,
        name=f"{label} {token}",
        code=f"B-{token[:6]}",
        is_active=True,
    )

    db.session.add(branch)
    db.session.flush()

    return branch


def _make_class(tenant_id, branch_id, name):
    """Create Class while tolerating unrelated model defaults."""
    class_ = Class(
        name=_uid(name),
        grade_level="Grade 1",
        academic_year="2026/2027",
        tenant_id=tenant_id,
        branch_id=branch_id,
    )

    db.session.add(class_)
    db.session.flush()
    return class_


def _make_student_user(label):
    """Create a real User row for Student.user_id FK integrity."""
    token = uuid.uuid4().hex[:10]

    # Build only from columns actually present on the canonical User
    # model so this fixture remains resilient to optional profile fields.
    columns = {column.name for column in User.__table__.columns}

    values = {}

    if "email" in columns:
        values["email"] = f"attendance-{token}@example.com"

    if "username" in columns:
        values["username"] = f"attendance_{token}"

    if "first_name" in columns:
        values["first_name"] = f"Attendance{token[:5]}"

    if "last_name" in columns:
        values["last_name"] = label

    if "role" in columns:
        values["role"] = "student"

    if "status" in columns:
        values["status"] = "active"

    if "is_active" in columns:
        values["is_active"] = True

    # Password fields differ across generations of the User model.
    # Supply a non-sensitive test value only when the mapped column
    # requires direct construction.
    if "password_hash" in columns:
        values["password_hash"] = "test-only-not-a-real-password"

    if "password" in columns:
        values["password"] = "test-only-not-a-real-password"

    # Prove every required non-PK User column has either a supplied
    # value or a model/database default before attempting INSERT.
    missing = []

    for column in User.__table__.columns:
        required = (
            not column.nullable
            and not column.primary_key
            and column.default is None
            and column.server_default is None
        )

        if required and column.name not in values:
            missing.append(column.name)

    if missing:
        raise AssertionError(
            "R11A.2I fixture cannot construct canonical User; "
            f"required fields need explicit fixture values: {missing}"
        )

    user = User(**values)

    db.session.add(user)
    db.session.flush()

    return user


def _make_student(tenant_id, branch_id, class_id, label):
    token = uuid.uuid4().hex[:8]
    user = _make_student_user(label)

    student = Student(
        user_id=user.id,
        first_name=f"Student{token}",
        last_name=label,
        admission_number=f"ADM-{token}",
        date_of_birth=date(2012, 1, 15),
        gender="male",
        tenant_id=tenant_id,
        branch_id=branch_id,
        class_id=class_id,
    )

    db.session.add(student)
    db.session.flush()
    return student


def _make_subject(tenant_id, label):
    token = uuid.uuid4().hex[:8]

    subject = Subject(
        name=f"{label}-{token}",
        code=f"S{token[:6]}",
        tenant_id=tenant_id,
    )

    db.session.add(subject)
    db.session.flush()
    return subject


def _payload(class_id, student_id, subject_id=None, status="present"):
    return {
        "class_id": class_id,
        "subject_id": subject_id,
        "date": date(2024, 3, 15),
        "recorded_by": None,
        "attendances": [
            {
                "student_id": student_id,
                "status": status,
                "remarks": "R11A.2I",
            }
        ],
    }


@pytest.fixture
def isolation_graph(app):
    """Two tenants, two branches and authoritative parent resources."""
    with app.app_context():
        tenant_a = _make_tenant("Attendance Tenant A")
        tenant_b = _make_tenant("Attendance Tenant B")

        branch_a = _make_branch(
            tenant_a.id,
            "Campus A",
        )
        branch_b = _make_branch(
            tenant_b.id,
            "Campus B",
        )

        class_a = _make_class(
            tenant_a.id,
            branch_a.id,
            "Class-A",
        )
        class_b = _make_class(
            tenant_b.id,
            branch_b.id,
            "Class-B",
        )

        student_a = _make_student(
            tenant_a.id,
            branch_a.id,
            class_a.id,
            "A",
        )

        student_b = _make_student(
            tenant_b.id,
            branch_b.id,
            class_b.id,
            "B",
        )

        subject_a = _make_subject(tenant_a.id, "Subject-A")
        subject_b = _make_subject(tenant_b.id, "Subject-B")

        db.session.commit()

        yield {
            "tenant_a": tenant_a.id,
            "tenant_b": tenant_b.id,
            "branch_a": branch_a.id,
            "branch_b": branch_b.id,
            "class_a": class_a.id,
            "class_b": class_b.id,
            "student_a": student_a.id,
            "student_b": student_b.id,
            "subject_a": subject_a.id,
            "subject_b": subject_b.id,
        }

        db.session.rollback()


def test_foreign_tenant_class_cannot_reach_attendance_identity(
    app,
    isolation_graph,
):
    g = isolation_graph

    with app.app_context():
        before = (
            Attendance.query.without_tenant_filter().count()
        )

        result, error = AttendanceService.bulk_create_attendance(
            _payload(
                g["class_b"],
                g["student_b"],
                g["subject_b"],
            ),
            tenant_id=g["tenant_a"],
            branch_id=g["branch_a"],
        )

        assert result is None
        assert error == "Class not found in current tenant/branch scope"

        after = (
            Attendance.query.without_tenant_filter().count()
        )

        assert after == before


def test_foreign_tenant_subject_is_rejected_without_write(
    app,
    isolation_graph,
):
    g = isolation_graph

    with app.app_context():
        before = (
            Attendance.query.without_tenant_filter().count()
        )

        result, error = AttendanceService.bulk_create_attendance(
            _payload(
                g["class_a"],
                g["student_a"],
                g["subject_b"],
            ),
            tenant_id=g["tenant_a"],
            branch_id=g["branch_a"],
        )

        assert result is None
        assert error == "Subject not found in current tenant"

        after = (
            Attendance.query.without_tenant_filter().count()
        )

        assert after == before


def test_foreign_or_cross_class_student_is_skipped_without_write(
    app,
    isolation_graph,
):
    g = isolation_graph

    with app.app_context():
        before = (
            Attendance.query.without_tenant_filter().count()
        )

        result, error = AttendanceService.bulk_create_attendance(
            _payload(
                g["class_a"],
                g["student_b"],
                g["subject_a"],
            ),
            tenant_id=g["tenant_a"],
            branch_id=g["branch_a"],
        )

        assert error is None
        assert result == []

        after = (
            Attendance.query.without_tenant_filter().count()
        )

        assert after == before


def test_historical_null_branch_is_normalized_from_class(
    app,
    isolation_graph,
):
    g = isolation_graph

    with app.app_context():
        historical = Attendance(
            student_id=g["student_a"],
            class_id=g["class_a"],
            subject_id=g["subject_a"],
            date=date(2024, 3, 15),
            status="absent",
            branch_id=None,
        )

        db.session.add(historical)
        db.session.commit()

        historical_id = historical.id

        result, error = AttendanceService.bulk_create_attendance(
            _payload(
                g["class_a"],
                g["student_a"],
                g["subject_a"],
                status="present",
            ),
            tenant_id=g["tenant_a"],
            branch_id=g["branch_a"],
        )

        assert error is None
        assert result is not None

        repaired = (
            Attendance.query
            .without_tenant_filter()
            .filter(Attendance.id == historical_id)
            .first()
        )

        assert repaired is not None
        assert repaired.status == "present"
        assert repaired.branch_id == g["branch_a"]

        identity_count = (
            Attendance.query
            .without_tenant_filter()
            .filter(
                Attendance.student_id == g["student_a"],
                Attendance.class_id == g["class_a"],
                Attendance.date == date(2024, 3, 15),
            )
            .count()
        )

        assert identity_count == 1


def test_conflicting_non_null_attendance_branch_fails_closed(
    app,
    isolation_graph,
):
    g = isolation_graph

    with app.app_context():
        # Use a real FK-backed branch owned by the same tenant.
        # It is intentionally different from class_a.branch_id so the
        # service must detect the integrity conflict and fail closed.
        conflicting_branch_row = _make_branch(
            g["tenant_a"],
            "Conflicting Campus",
        )
        db.session.commit()
        conflicting_branch = conflicting_branch_row.id

        existing = Attendance(
            student_id=g["student_a"],
            class_id=g["class_a"],
            subject_id=g["subject_a"],
            date=date(2024, 3, 15),
            status="absent",
            remarks="must remain unchanged",
            branch_id=conflicting_branch,
        )

        db.session.add(existing)
        db.session.commit()

        existing_id = existing.id

        result, error = AttendanceService.bulk_create_attendance(
            _payload(
                g["class_a"],
                g["student_a"],
                g["subject_a"],
                status="present",
            ),
            tenant_id=g["tenant_a"],
            branch_id=g["branch_a"],
        )

        assert result is None
        assert error == (
            "Attendance branch conflicts with authoritative class branch"
        )

        unchanged = (
            Attendance.query
            .without_tenant_filter()
            .filter(Attendance.id == existing_id)
            .first()
        )

        assert unchanged is not None
        assert unchanged.status == "absent"
        assert unchanged.remarks == "must remain unchanged"
        assert unchanged.branch_id == conflicting_branch


def test_new_attendance_derives_branch_from_authoritative_class(
    app,
    isolation_graph,
):
    g = isolation_graph

    with app.app_context():
        result, error = AttendanceService.bulk_create_attendance(
            _payload(
                g["class_a"],
                g["student_a"],
                g["subject_a"],
            ),
            tenant_id=g["tenant_a"],
            branch_id=g["branch_a"],
        )

        assert error is None
        assert result is not None

        row = (
            Attendance.query
            .without_tenant_filter()
            .filter(
                Attendance.student_id == g["student_a"],
                Attendance.class_id == g["class_a"],
                Attendance.date == date(2024, 3, 15),
            )
            .first()
        )

        assert row is not None
        assert row.branch_id == g["branch_a"]
