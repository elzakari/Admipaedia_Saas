"""
V28-R13F RED security contracts for dormant EnhancedExamService surfaces.

These tests deliberately exercise the service layer without registering
enhanced_exams_bp.  Blueprint activation is a separate product/API decision.
"""

from datetime import datetime, timedelta, timezone
import uuid

import pytest
from flask import g

from app import create_app
from app.extensions import db
from app.models.tenant import Branch, Tenant
from app.models.class_ import Class
from app.models.exam import Exam
from app.models.subject import Subject
from app.models.user import User
from app.services.enhanced_exam_service import EnhancedExamService


@pytest.fixture()
def app():
    app = create_app("testing")

    with app.app_context():
        db.create_all()
        yield app
        db.session.remove()
        db.drop_all()


def _unique(prefix):
    stamp = datetime.now(timezone.utc).strftime(
        "%H%M%S%f"
    )
    return f"{prefix}-{stamp}"


def _columns(model):
    return {
        column.name: column
        for column in model.__table__.columns
    }


def _set_if_present(values, model, **candidates):
    columns = _columns(model)

    for key, value in candidates.items():
        if key in columns:
            values[key] = value

    return values


def _required_defaults(model, seed):
    """
    Supply conservative values only for required scalar columns
    that are not PKs, FKs, server-defaulted, or already supplied.

    This is test-fixture infrastructure only.
    """
    values = {}
    columns = _columns(model)

    for name, column in columns.items():
        if column.primary_key:
            continue

        if column.foreign_keys:
            continue

        if column.nullable:
            continue

        if column.default is not None:
            continue

        if column.server_default is not None:
            continue

        python_type = None

        try:
            python_type = column.type.python_type
        except Exception:
            pass

        if python_type is str:
            values[name] = f"{seed}-{name}"
        elif python_type is bool:
            values[name] = True
        elif python_type is int:
            values[name] = 1
        elif python_type is float:
            values[name] = 1.0

    return values


def _make(model, seed, **explicit):
    values = _required_defaults(
        model,
        seed,
    )
    values.update(explicit)

    obj = model(**values)

    db.session.add(obj)
    db.session.flush()

    return obj



def _make_tenant(name):
    seed = _unique(
        name.lower().replace(" ", "-")
    )

    values = {}

    _set_if_present(
        values,
        Tenant,
        name=name,
        slug=seed[:63],
        country_code="GH",
        schema_name=(
            "r13f_"
            + seed.replace("-", "_")
        )[:63],
        status="active",
        currency="GHS",
    )

    return _make(
        Tenant,
        seed,
        **values,
    )


def _make_branch(tenant, name):
    seed = _unique(
        name.lower().replace(" ", "-")
    )

    values = {}

    _set_if_present(
        values,
        Branch,
        tenant_id=tenant.id,
        name=name,
        code=("B-" + seed)[:63],
        status="active",
        is_active=True,
    )

    return _make(
        Branch,
        seed,
        **values,
    )


def _make_class(tenant, branch, name):
    seed = _unique(
        name.lower().replace(" ", "-")
    )

    values = {}

    _set_if_present(
        values,
        Class,
        tenant_id=tenant.id,
        branch_id=branch.id,
        name=name,
        status="active",
        is_active=True,
    )

    return _make(
        Class,
        seed,
        **values,
    )


def _make_subject(tenant, name, code):
    seed = _unique(
        name.lower().replace(" ", "-")
    )

    values = {}

    _set_if_present(
        values,
        Subject,
        tenant_id=tenant.id,
        name=name,
        code=(code + "-" + seed)[-63:],
        status="active",
        is_active=True,
    )

    return _make(
        Subject,
        seed,
        **values,
    )


def _make_user(email, role="student"):
    seed = _unique(
        email.split("@")[0]
    )

    values = {}

    _set_if_present(
        values,
        User,
        email=email,
        username=seed,
        first_name="R13C",
        last_name="Security",
        role=role,
        global_role=role,
        status="active",
        is_active=True,
        password_hash="test",
    )

    user = _make(
        User,
        f"user-{seed}",
        **values,
    )

    if (
        hasattr(user, "set_password")
        and not getattr(
            user,
            "password_hash",
            None,
        )
    ):
        user.set_password(
            "R13C-test-password"
        )
        db.session.flush()

    return user



def _make_exam(
    class_obj,
    subject,
    creator,
    title,
    when=None,
):
    exam = Exam(
        class_id=class_obj.id,
        subject_id=subject.id,
        created_by=creator.id,
        title=title,
        exam_date=when or (
            datetime.utcnow().replace(
                hour=10,
                minute=0,
                second=0,
                microsecond=0,
            )
            + timedelta(days=7)
        ),
        duration=60,
        total_marks=100,
        passing_marks=50,
        status="scheduled",
    )
    db.session.add(exam)
    db.session.flush()
    return exam


@pytest.fixture()
def graph(app):
    with app.app_context():
        creator = _make_user(
            "r13f-creator@example.test",
            role="admin",
        )

        tenant_a = _make_tenant("R13F Tenant A")
        tenant_b = _make_tenant("R13F Tenant B")

        branch_a1 = _make_branch(tenant_a, "A1")
        branch_a2 = _make_branch(tenant_a, "A2")
        branch_b1 = _make_branch(tenant_b, "B1")

        class_a1 = _make_class(
            tenant_a,
            branch_a1,
            "Class A1",
        )
        class_a2 = _make_class(
            tenant_a,
            branch_a2,
            "Class A2",
        )
        class_b1 = _make_class(
            tenant_b,
            branch_b1,
            "Class B1",
        )

        subject_a = _make_subject(
            tenant_a,
            "Mathematics",
            "MATHA",
        )
        subject_b = _make_subject(
            tenant_b,
            "English",
            "ENGB",
        )

        exam_a1 = _make_exam(
            class_a1,
            subject_a,
            creator,
            "Exam A1",
        )
        exam_a2 = _make_exam(
            class_a2,
            subject_a,
            creator,
            "Exam A2",
        )
        exam_b1 = _make_exam(
            class_b1,
            subject_b,
            creator,
            "Exam B1",
        )

        db.session.commit()

        return {
            "tenant_a_id": tenant_a.id,
            "tenant_b_id": tenant_b.id,
            "branch_a1_id": branch_a1.id,
            "branch_a2_id": branch_a2.id,
            "branch_b1_id": branch_b1.id,
            "class_a1_id": class_a1.id,
            "class_a2_id": class_a2.id,
            "class_b1_id": class_b1.id,
            "subject_a_id": subject_a.id,
            "subject_b_id": subject_b.id,
            "exam_a1_id": exam_a1.id,
            "exam_a2_id": exam_a2.id,
            "exam_b1_id": exam_b1.id,
        }


def _set_scope(tenant_id, branch_id):
    g.tenant_id = tenant_id
    g.branch_id = branch_id


# ------------------------------------------------------------------
# CLASS SCHEDULE
# ------------------------------------------------------------------

def test_schedule_allows_active_tenant_branch_class(app, graph):
    with app.app_context():
        _set_scope(
            graph["tenant_a_id"],
            graph["branch_a1_id"],
        )

        result = EnhancedExamService.get_class_exam_schedule(
            graph["class_a1_id"]
        )

        assert "error" not in result
        assert result["class_id"] == graph["class_a1_id"]

        exam_ids = {
            exam["id"]
            for exams in result["schedule"].values()
            for exam in exams
        }

        assert graph["exam_a1_id"] in exam_ids


def test_schedule_denies_other_branch_class(app, graph):
    with app.app_context():
        _set_scope(
            graph["tenant_a_id"],
            graph["branch_a1_id"],
        )

        result = EnhancedExamService.get_class_exam_schedule(
            graph["class_a2_id"]
        )

        assert (
            result is None
            or "error" in result
            or not result.get("schedule")
        )


def test_schedule_denies_foreign_tenant_class(app, graph):
    with app.app_context():
        _set_scope(
            graph["tenant_a_id"],
            graph["branch_a1_id"],
        )

        result = EnhancedExamService.get_class_exam_schedule(
            graph["class_b1_id"]
        )

        assert (
            result is None
            or "error" in result
            or not result.get("schedule")
        )


# ------------------------------------------------------------------
# SUBJECT / DURATION
# ------------------------------------------------------------------

def test_duration_uses_active_tenant_subject(app, graph):
    with app.app_context():
        _set_scope(
            graph["tenant_a_id"],
            graph["branch_a1_id"],
        )

        result = EnhancedExamService.calculate_optimal_exam_duration(
            graph["subject_a_id"],
            100,
            "regular",
        )

        assert "error" not in result
        assert result["factors_used"]["subject_factor"] == 1.5


def test_duration_does_not_resolve_foreign_tenant_subject(app, graph):
    with app.app_context():
        _set_scope(
            graph["tenant_a_id"],
            graph["branch_a1_id"],
        )

        result = EnhancedExamService.calculate_optimal_exam_duration(
            graph["subject_b_id"],
            100,
            "regular",
        )

        # Foreign subject identity must not influence the calculation.
        # The safe behavior may fail closed or use the default factor.
        if "error" not in result:
            assert (
                result["factors_used"]["subject_factor"]
                == 1.8
            )


# ------------------------------------------------------------------
# CONFLICT DETECTION RETENTION
# ------------------------------------------------------------------

def test_conflicts_allow_active_tenant_branch_class(app, graph):
    with app.app_context():
        _set_scope(
            graph["tenant_a_id"],
            graph["branch_a1_id"],
        )

        when = (
            datetime.utcnow().replace(
                hour=10,
                minute=0,
                second=0,
                microsecond=0,
            )
            + timedelta(days=7)
        )

        result = EnhancedExamService.detect_exam_conflicts(
            graph["class_a1_id"],
            when,
            60,
        )

        assert isinstance(result, dict)
        assert "has_conflicts" in result


def test_conflicts_contain_other_branch_class(app, graph):
    with app.app_context():
        _set_scope(
            graph["tenant_a_id"],
            graph["branch_a1_id"],
        )

        result = EnhancedExamService.detect_exam_conflicts(
            graph["class_a2_id"],
            datetime.utcnow() + timedelta(days=7),
            60,
        )

        assert result["has_conflicts"] is False
        assert result.get("conflicts", []) == []


def test_conflicts_contain_foreign_tenant_class(app, graph):
    with app.app_context():
        _set_scope(
            graph["tenant_a_id"],
            graph["branch_a1_id"],
        )

        result = EnhancedExamService.detect_exam_conflicts(
            graph["class_b1_id"],
            datetime.utcnow() + timedelta(days=7),
            60,
        )

        assert result["has_conflicts"] is False
        assert result.get("conflicts", []) == []


# ------------------------------------------------------------------
# ANALYTICS RETENTION
# ------------------------------------------------------------------

def test_analytics_allows_active_tenant_branch_exam(app, graph):
    with app.app_context():
        _set_scope(
            graph["tenant_a_id"],
            graph["branch_a1_id"],
        )

        result = EnhancedExamService.get_exam_analytics(
            graph["exam_a1_id"]
        )

        assert result is not None
        assert result["exam_id"] == graph["exam_a1_id"]


def test_analytics_denies_other_branch_exam(app, graph):
    with app.app_context():
        _set_scope(
            graph["tenant_a_id"],
            graph["branch_a1_id"],
        )

        result = EnhancedExamService.get_exam_analytics(
            graph["exam_a2_id"]
        )

        assert result is None or "error" in result


def test_analytics_denies_foreign_tenant_exam(app, graph):
    with app.app_context():
        _set_scope(
            graph["tenant_a_id"],
            graph["branch_a1_id"],
        )

        result = EnhancedExamService.get_exam_analytics(
            graph["exam_b1_id"]
        )

        assert result is None or "error" in result
