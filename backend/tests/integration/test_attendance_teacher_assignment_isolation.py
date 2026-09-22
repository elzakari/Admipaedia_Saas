import uuid

from flask import g
from flask_jwt_extended import verify_jwt_in_request

from app.extensions import db
from app.api.v1.attendances import routes as attendance_routes
from app.models.associations import (
    class_subjects,
    teacher_subjects,
)
from app.models.class_ import (
    Class,
    ClassTeacherMapping,
)
from app.models.subject import Subject
from app.models.teacher import Teacher
from app.models.tenant import (
    Branch,
    Tenant,
    TenantMembership,
)
from app.models.user import User
from tests.conftest import _create_tracked_test_access_token


def _user(prefix="r11a4b"):
    suffix = uuid.uuid4().hex[:8]

    user = User(
        username=f"{prefix}_{suffix}",
        email=f"{prefix}_{suffix}@example.com",
        role="teacher",
        status="active",
    )
    user.set_password("Password123!")

    db.session.add(user)
    db.session.flush()

    return user


def _tenant(prefix="r11a4b"):
    suffix = uuid.uuid4().hex[:8]

    tenant = Tenant(
        slug=f"{prefix}-{suffix}",
        name=f"{prefix} {suffix}",
        country_code="GH",
        schema_name=f"{prefix}_{suffix}".replace("-", "_"),
        status="active",
    )

    db.session.add(tenant)
    db.session.flush()

    return tenant


def _branch(tenant, prefix="branch"):
    suffix = uuid.uuid4().hex[:6]

    branch = Branch(
        tenant_id=tenant.id,
        name=f"{prefix}-{suffix}",
        code=f"{prefix[:4].upper()}{suffix[:4]}",
        is_active=True,
    )

    db.session.add(branch)
    db.session.flush()

    return branch


def _teacher(user, tenant, branch, prefix="EMP"):
    suffix = uuid.uuid4().hex[:7].upper()

    teacher = Teacher(
        user_id=user.id,
        tenant_id=tenant.id,
        branch_id=branch.id,
        employee_id=f"{prefix}-{suffix}",
        first_name="R11A4B",
        last_name="Teacher",
        status="active",
    )

    db.session.add(teacher)
    db.session.flush()

    return teacher


def _class(tenant, branch, teacher_id=None, prefix="Class"):
    suffix = uuid.uuid4().hex[:6]

    cls = Class(
        tenant_id=tenant.id,
        branch_id=branch.id,
        name=f"{prefix} {suffix}",
        code=f"C-{suffix}",
        grade_level="Primary 1",
        academic_year="2026/2027",
        teacher_id=teacher_id,
        status="active",
    )

    db.session.add(cls)
    db.session.flush()

    return cls


def _subject(tenant, prefix="SUB"):
    suffix = uuid.uuid4().hex[:6].upper()

    subject = Subject(
        tenant_id=tenant.id,
        name=f"{prefix} {suffix}",
        code=f"{prefix[:5]}-{suffix}",
        credit_hours=1,
        is_active=True,
    )

    db.session.add(subject)
    db.session.flush()

    return subject


def _membership(user, tenant, role="teacher"):
    membership = TenantMembership(
        tenant_id=tenant.id,
        user_id=user.id,
        role=role,
        status="active",
    )

    db.session.add(membership)
    db.session.flush()

    return membership


def _request_context(app, user, tenant, branch):
    """
    Real JWT request context with the same g.tenant_id/g.branch_id
    consumed by the production assignment helpers.
    """
    # Use the canonical integration-test token contract.
    # This persists the JWT JTI as a real SessionToken so the
    # production fail-closed blocklist is exercised, not bypassed.
    token = _create_tracked_test_access_token(
        user.id
    )

    return app.test_request_context(
        "/api/v1/attendances/bulk",
        method="POST",
        headers={
            "Authorization": f"Bearer {token}",
            "X-Tenant-ID": str(tenant.id),
            "X-Branch-ID": str(branch.id),
        },
    )


def _evaluate(app, user, tenant, branch, class_id):
    with _request_context(
        app,
        user,
        tenant,
        branch,
    ):
        # This certificate is intentionally about the assignment
        # graph. Tenant middleware itself is already certified in
        # R11A.3, so establish its authoritative resolved context
        # explicitly here.
        g.tenant_id = tenant.id
        g.branch_id = branch.id

        # test_request_context() only supplies the Authorization
        # header. Flask-JWT-Extended does not populate request JWT
        # state until verification occurs, exactly as @jwt_required()
        # would do on the real endpoint.
        verify_jwt_in_request()

        teacher_ids = (
            attendance_routes._current_user_teacher_ids()
        )

        result = (
            attendance_routes._teacher_is_assigned_to_class(
                teacher_ids,
                class_id,
            )
        )

        return teacher_ids, result


def test_same_tenant_branch_homeroom_assignment_allows(
    app,
    db_session,
    sample_tenant,
    sample_branch,
):
    user = _user("r11a4b_home")
    _membership(user, sample_tenant)

    teacher = _teacher(
        user,
        sample_tenant,
        sample_branch,
        "HOME",
    )

    cls = _class(
        sample_tenant,
        sample_branch,
        teacher_id=teacher.id,
        prefix="Homeroom",
    )

    db.session.commit()

    teacher_ids, allowed = _evaluate(
        app,
        user,
        sample_tenant,
        sample_branch,
        cls.id,
    )

    assert teacher.id in teacher_ids
    assert allowed is True


def test_same_tenant_branch_user_mapping_allows(
    app,
    db_session,
    sample_tenant,
    sample_branch,
):
    user = _user("r11a4b_map")
    _membership(user, sample_tenant)

    teacher = _teacher(
        user,
        sample_tenant,
        sample_branch,
        "MAP",
    )

    cls = _class(
        sample_tenant,
        sample_branch,
        prefix="Mapped",
    )

    mapping = ClassTeacherMapping(
        class_id=cls.id,

        # Critical identity contract:
        # mapping points to User.id, not Teacher.id.
        teacher_id=user.id,
    )

    db.session.add(mapping)
    db.session.commit()

    teacher_ids, allowed = _evaluate(
        app,
        user,
        sample_tenant,
        sample_branch,
        cls.id,
    )

    assert teacher.id in teacher_ids
    assert allowed is True


def test_same_tenant_branch_subject_assignment_allows(
    app,
    db_session,
    sample_tenant,
    sample_branch,
):
    user = _user("r11a4b_subject")
    _membership(user, sample_tenant)

    teacher = _teacher(
        user,
        sample_tenant,
        sample_branch,
        "SUB",
    )

    cls = _class(
        sample_tenant,
        sample_branch,
        prefix="SubjectClass",
    )

    subject = _subject(
        sample_tenant,
        "LOCAL",
    )

    db.session.execute(
        class_subjects.insert().values(
            class_id=cls.id,
            subject_id=subject.id,
            teacher_id=user.id,
        )
    )

    db.session.execute(
        teacher_subjects.insert().values(
            teacher_id=teacher.id,
            subject_id=subject.id,
            is_primary=True,
        )
    )

    db.session.commit()

    teacher_ids, allowed = _evaluate(
        app,
        user,
        sample_tenant,
        sample_branch,
        cls.id,
    )

    assert teacher.id in teacher_ids
    assert allowed is True


def test_foreign_tenant_teacher_profile_cannot_authorize_local_class(
    app,
    db_session,
    sample_tenant,
    sample_branch,
):
    user = _user("r11a4b_foreign_teacher")
    _membership(user, sample_tenant)

    foreign = _tenant("r11a4b-ft")
    foreign_branch = _branch(
        foreign,
        "foreign",
    )

    foreign_teacher = _teacher(
        user,
        foreign,
        foreign_branch,
        "FOREIGN",
    )

    local_class = _class(
        sample_tenant,
        sample_branch,
        teacher_id=foreign_teacher.id,
        prefix="Local",
    )

    db.session.commit()

    teacher_ids, allowed = _evaluate(
        app,
        user,
        sample_tenant,
        sample_branch,
        local_class.id,
    )

    assert foreign_teacher.id not in teacher_ids
    assert teacher_ids == []
    assert allowed is False


def test_foreign_branch_teacher_profile_cannot_authorize_local_branch_class(
    app,
    db_session,
    sample_tenant,
    sample_branch,
):
    user = _user("r11a4b_foreign_branch")
    _membership(user, sample_tenant)

    other_branch = _branch(
        sample_tenant,
        "other",
    )

    other_teacher = _teacher(
        user,
        sample_tenant,
        other_branch,
        "OTHER",
    )

    local_class = _class(
        sample_tenant,
        sample_branch,
        teacher_id=other_teacher.id,
        prefix="LocalBranch",
    )

    db.session.commit()

    teacher_ids, allowed = _evaluate(
        app,
        user,
        sample_tenant,
        sample_branch,
        local_class.id,
    )

    assert other_teacher.id not in teacher_ids
    assert teacher_ids == []
    assert allowed is False


def test_foreign_tenant_class_is_not_visible_to_assignment_helper(
    app,
    db_session,
    sample_tenant,
    sample_branch,
):
    user = _user("r11a4b_foreign_class")
    _membership(user, sample_tenant)

    local_teacher = _teacher(
        user,
        sample_tenant,
        sample_branch,
        "LOCAL",
    )

    foreign = _tenant("r11a4b-fc")
    foreign_branch = _branch(
        foreign,
        "foreign",
    )

    foreign_class = _class(
        foreign,
        foreign_branch,
        teacher_id=local_teacher.id,
        prefix="ForeignTenant",
    )

    db.session.commit()

    teacher_ids, allowed = _evaluate(
        app,
        user,
        sample_tenant,
        sample_branch,
        foreign_class.id,
    )

    assert local_teacher.id in teacher_ids
    assert allowed is False


def test_foreign_branch_class_is_not_visible_to_assignment_helper(
    app,
    db_session,
    sample_tenant,
    sample_branch,
):
    user = _user("r11a4b_foreign_branch_class")
    _membership(user, sample_tenant)

    local_teacher = _teacher(
        user,
        sample_tenant,
        sample_branch,
        "LOCAL",
    )

    other_branch = _branch(
        sample_tenant,
        "otherclass",
    )

    foreign_branch_class = _class(
        sample_tenant,
        other_branch,
        teacher_id=local_teacher.id,
        prefix="ForeignBranch",
    )

    db.session.commit()

    teacher_ids, allowed = _evaluate(
        app,
        user,
        sample_tenant,
        sample_branch,
        foreign_branch_class.id,
    )

    assert local_teacher.id in teacher_ids
    assert allowed is False


def test_foreign_tenant_subject_bridge_cannot_authorize(
    app,
    db_session,
    sample_tenant,
    sample_branch,
):
    user = _user("r11a4b_foreign_subject")
    _membership(user, sample_tenant)

    teacher = _teacher(
        user,
        sample_tenant,
        sample_branch,
        "LOCAL",
    )

    local_class = _class(
        sample_tenant,
        sample_branch,
        prefix="LocalSubjectClass",
    )

    foreign = _tenant("r11a4b-fs")

    foreign_subject = _subject(
        foreign,
        "FOREIGN",
    )

    # Deliberately create raw cross-tenant association rows.
    # The helper must refuse to treat these tables as ownership
    # authorities.
    db.session.execute(
        class_subjects.insert().values(
            class_id=local_class.id,
            subject_id=foreign_subject.id,
            teacher_id=user.id,
        )
    )

    db.session.execute(
        teacher_subjects.insert().values(
            teacher_id=teacher.id,
            subject_id=foreign_subject.id,
            is_primary=True,
        )
    )

    db.session.commit()

    teacher_ids, allowed = _evaluate(
        app,
        user,
        sample_tenant,
        sample_branch,
        local_class.id,
    )

    assert teacher.id in teacher_ids
    assert allowed is False


def test_class_mapping_uses_user_id_not_teacher_id(
    app,
    db_session,
    sample_tenant,
    sample_branch,
):
    """
    Regression for the exact identity-domain defect fixed in R11A.4A.

    A mapping whose numeric teacher_id equals Teacher.id but does
    NOT equal the authenticated User.id must not authorize.
    """
    # Force the independent User and Teacher integer
    # sequences into different identity domains. This
    # also creates a legitimate unrelated User whose
    # User.id will numerically equal Teacher.id.
    _identity_padding_user = _user(
        "r11a4b_padding"
    )

    user = _user("r11a4b_identity")
    _membership(user, sample_tenant)

    teacher = _teacher(
        user,
        sample_tenant,
        sample_branch,
        "IDENTITY",
    )

    cls = _class(
        sample_tenant,
        sample_branch,
        prefix="Identity",
    )

    assert teacher.id != user.id, (
        "Fixture unexpectedly produced equal User.id and Teacher.id; "
        "cannot prove identity-domain separation."
    )

    # ClassTeacherMapping.teacher_id is a User FK. To create the
    # adversarial numeric collision without violating the FK, make
    # sure a real unrelated User owns the numeric id == Teacher.id.
    collision_user = db.session.get(
        User,
        teacher.id,
    )

    assert collision_user is not None
    assert collision_user.id == teacher.id
    assert collision_user.id != user.id
    assert collision_user.id == _identity_padding_user.id

    db.session.add(
        ClassTeacherMapping(
            class_id=cls.id,
            teacher_id=collision_user.id,
        )
    )

    db.session.commit()

    teacher_ids, allowed = _evaluate(
        app,
        user,
        sample_tenant,
        sample_branch,
        cls.id,
    )

    assert teacher.id in teacher_ids
    assert allowed is False


def test_mapping_for_authenticated_user_allows_even_when_user_and_teacher_ids_differ(
    app,
    db_session,
    sample_tenant,
    sample_branch,
):
    """
    Positive counterpart to the collision regression.
    """
    # Force the independent User and Teacher integer
    # sequences into different identity domains. This
    # also creates a legitimate unrelated User whose
    # User.id will numerically equal Teacher.id.
    _identity_padding_user = _user(
        "r11a4b_padding"
    )

    user = _user("r11a4b_identity_positive")
    _membership(user, sample_tenant)

    teacher = _teacher(
        user,
        sample_tenant,
        sample_branch,
        "IDENTITYPOS",
    )

    cls = _class(
        sample_tenant,
        sample_branch,
        prefix="IdentityPositive",
    )

    assert teacher.id != user.id, (
        "Fixture unexpectedly produced equal User.id and Teacher.id; "
        "cannot prove User-id mapping behavior."
    )

    db.session.add(
        ClassTeacherMapping(
            class_id=cls.id,
            teacher_id=user.id,
        )
    )

    db.session.commit()

    teacher_ids, allowed = _evaluate(
        app,
        user,
        sample_tenant,
        sample_branch,
        cls.id,
    )

    assert teacher.id in teacher_ids
    assert allowed is True
