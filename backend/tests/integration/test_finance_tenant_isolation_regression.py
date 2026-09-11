"""
P0 finance tenant-isolation regression tests.

Finance models that do not yet carry tenant_id must prove ownership
through an authoritative tenant-owned parent model.

These tests intentionally preserve fail-closed containment until the
durable finance schema gains explicit tenant ownership.
"""

import uuid
from datetime import date

from flask import g, url_for
from flask_jwt_extended import create_access_token

from app.models.class_ import Class
from app.models.finance import (
    FeeCategory,
    FeeStructure,
    Payment,
    StudentFee,
)
from app.models.student import Student
from app.models.tenant import Branch, Tenant, TenantMembership
from app.models.user import User
from app.utils.finance_scope import (
    scoped_fee_structures,
    scoped_payments,
    scoped_student_fees,
    scoped_students,
)


def _tenant(db_session, prefix):
    tenant = Tenant(
        name=f"{prefix} School",
        slug=f"{prefix.lower()}-{uuid.uuid4().hex[:8]}",
        country_code="GH",
        currency="GHS",
        schema_name=f"tenant_{uuid.uuid4().hex[:10]}",
        status="active",
    )
    db_session.add(tenant)
    db_session.flush()
    return tenant



def _branch(db_session, tenant, prefix):
    branch = Branch(
        tenant_id=tenant.id,
        name=f"{prefix} Branch",
        code=f"{prefix[:6].upper()}-{uuid.uuid4().hex[:6].upper()}",
        is_active=True,
    )
    db_session.add(branch)
    db_session.flush()
    return branch



def _user(db_session, role="user", prefix="finance"):
    suffix = uuid.uuid4().hex[:8]

    user = User(
        username=f"{prefix}_{suffix}",
        email=f"{prefix}_{suffix}@example.com",
        role=role,
        status="active",
    )
    user.set_password("Password123!")

    db_session.add(user)
    db_session.flush()

    return user


def _membership(db_session, tenant, user, role):
    membership = TenantMembership(
        tenant_id=tenant.id,
        user_id=user.id,
        role=role,
        status="active",
    )
    db_session.add(membership)
    db_session.flush()
    return membership


def _class(db_session, tenant, prefix, branch_id=None):
    class_ = Class(
        tenant_id=tenant.id,
        branch_id=branch_id,
        name=f"{prefix} Class",
        grade_level="1",
        academic_year="2026-2027",
        status="active",
    )
    db_session.add(class_)
    db_session.flush()
    return class_


def _student(
    db_session,
    tenant,
    prefix,
    *,
    branch_id=None,
    class_id=None,
):
    user = _user(
        db_session,
        role="student",
        prefix=f"{prefix}_user",
    )

    student = Student(
        tenant_id=tenant.id,
        branch_id=branch_id,
        user_id=user.id,
        admission_number=(
            f"ADM-{uuid.uuid4().hex[:12].upper()}"
        ),
        first_name=prefix,
        last_name="Student",
        date_of_birth=date(2015, 1, 1),
        gender="male",
        class_id=class_id,
    )

    db_session.add(student)
    db_session.flush()

    return student


def _category(db_session, prefix):
    category = FeeCategory(
        name=f"{prefix}-{uuid.uuid4().hex[:8]}",
        description="Finance tenant isolation regression",
        is_optional=False,
    )
    db_session.add(category)
    db_session.flush()
    return category


def _structure(
    db_session,
    category,
    *,
    class_id,
    amount=100,
):
    structure = FeeStructure(
        fee_category_id=category.id,
        class_id=class_id,
        academic_year="2026-2027",
        term="Term 1",
        amount=amount,
        currency="GHS",
    )
    db_session.add(structure)
    db_session.flush()
    return structure


def _student_fee(
    db_session,
    student,
    structure,
    *,
    branch_id=None,
):
    fee = StudentFee(
        student_id=student.id,
        fee_structure_id=structure.id,
        branch_id=branch_id,
        original_amount=100,
        discount_amount=0,
        final_amount=100,
        paid_amount=0,
        balance=100,
        status="pending",
    )
    db_session.add(fee)
    db_session.flush()
    return fee


def _payment(db_session, student, prefix):
    payment = Payment(
        transaction_id=(
            f"{prefix}-{uuid.uuid4().hex[:12]}"
        ),
        student_id=student.id,
        amount=25,
        currency="GHS",
        payment_method="cash",
        status="completed",
    )
    db_session.add(payment)
    db_session.flush()
    return payment


def _headers(
    user_id,
    tenant_id,
    branch_id=None,
):
    headers = {
        "Authorization": (
            f"Bearer {create_access_token(identity=user_id)}"
        ),
        "X-Tenant-ID": str(tenant_id),
    }

    if branch_id is not None:
        headers["X-Branch-ID"] = str(branch_id)

    return headers


def _endpoint_path(app, suffix, **values):
    """
    Resolve blueprint URLs by function suffix so these security tests
    do not hard-code blueprint registration prefixes.
    """
    with app.test_request_context("/"):
        endpoints = {
            rule.endpoint
            for rule in app.url_map.iter_rules()
            if rule.endpoint.endswith(f".{suffix}")
        }

        assert endpoints, (
            f"No registered endpoint ending in .{suffix}"
        )

        assert len(endpoints) == 1, (
            f"Ambiguous endpoint suffix {suffix}: {endpoints}"
        )

        return url_for(
            next(iter(endpoints)),
            **values,
        )


def test_scoped_students_reject_foreign_tenant(
    app,
    db_session,
):
    tenant_a = _tenant(db_session, "FinanceA")
    tenant_b = _tenant(db_session, "FinanceB")

    student_a = _student(
        db_session,
        tenant_a,
        "Alice",
    )

    student_b = _student(
        db_session,
        tenant_b,
        "Bob",
    )

    with app.test_request_context("/"):
        g.tenant_id = tenant_a.id
        g.branch_id = None

        rows = scoped_students().all()

        ids = {row.id for row in rows}

        assert student_a.id in ids
        assert student_b.id not in ids


def test_scoped_fees_and_payments_reject_foreign_tenant(
    app,
    db_session,
):
    tenant_a = _tenant(db_session, "LedgerA")
    tenant_b = _tenant(db_session, "LedgerB")

    class_a = _class(
        db_session,
        tenant_a,
        "A",
    )

    class_b = _class(
        db_session,
        tenant_b,
        "B",
    )

    student_a = _student(
        db_session,
        tenant_a,
        "Alice",
        class_id=class_a.id,
    )

    student_b = _student(
        db_session,
        tenant_b,
        "Bob",
        class_id=class_b.id,
    )

    category_a = _category(
        db_session,
        "Tuition-A",
    )

    category_b = _category(
        db_session,
        "Tuition-B",
    )

    structure_a = _structure(
        db_session,
        category_a,
        class_id=class_a.id,
    )

    structure_b = _structure(
        db_session,
        category_b,
        class_id=class_b.id,
    )

    fee_a = _student_fee(
        db_session,
        student_a,
        structure_a,
    )

    fee_b = _student_fee(
        db_session,
        student_b,
        structure_b,
    )

    payment_a = _payment(
        db_session,
        student_a,
        "PAY-A",
    )

    payment_b = _payment(
        db_session,
        student_b,
        "PAY-B",
    )

    with app.test_request_context("/"):
        g.tenant_id = tenant_a.id
        g.branch_id = None

        fee_ids = {
            row.id
            for row in scoped_student_fees().all()
        }

        payment_ids = {
            row.id
            for row in scoped_payments().all()
        }

        assert fee_a.id in fee_ids
        assert fee_b.id not in fee_ids

        assert payment_a.id in payment_ids
        assert payment_b.id not in payment_ids


def test_branch_scope_is_exact_and_can_be_intentionally_disabled(
    app,
    db_session,
):
    tenant = _tenant(
        db_session,
        "BranchScope",
    )

    # This legacy/school-wide student has no branch.
    student = _student(
        db_session,
        tenant,
        "NoBranch",
        branch_id=None,
    )

    selected_branch = uuid.uuid4()

    with app.test_request_context("/"):
        g.tenant_id = tenant.id
        g.branch_id = selected_branch

        branch_scoped = scoped_students().all()

        tenant_only = scoped_students(
            include_branch=False,
        ).all()

        assert student.id not in {
            row.id for row in branch_scoped
        }

        assert student.id in {
            row.id for row in tenant_only
        }


def test_fee_structures_are_owned_through_class_and_classless_are_hidden(
    app,
    db_session,
):
    tenant_a = _tenant(
        db_session,
        "StructureA",
    )

    tenant_b = _tenant(
        db_session,
        "StructureB",
    )

    class_a = _class(
        db_session,
        tenant_a,
        "A",
    )

    class_b = _class(
        db_session,
        tenant_b,
        "B",
    )

    category_a = _category(
        db_session,
        "StructureCategoryA",
    )

    category_b = _category(
        db_session,
        "StructureCategoryB",
    )

    category_global = _category(
        db_session,
        "Classless",
    )

    structure_a = _structure(
        db_session,
        category_a,
        class_id=class_a.id,
    )

    structure_b = _structure(
        db_session,
        category_b,
        class_id=class_b.id,
    )

    classless = _structure(
        db_session,
        category_global,
        class_id=None,
    )

    with app.test_request_context("/"):
        g.tenant_id = tenant_a.id
        g.branch_id = None

        ids = {
            row.id
            for row in scoped_fee_structures().all()
        }

        assert structure_a.id in ids
        assert structure_b.id not in ids

        # No authoritative tenant owner yet.
        assert classless.id not in ids


def test_finance_scope_fails_closed_without_tenant_context(
    app,
    db_session,
):
    tenant = _tenant(
        db_session,
        "NoContext",
    )

    class_ = _class(
        db_session,
        tenant,
        "Context",
    )

    student = _student(
        db_session,
        tenant,
        "Context",
        class_id=class_.id,
    )

    category = _category(
        db_session,
        "ContextCategory",
    )

    structure = _structure(
        db_session,
        category,
        class_id=class_.id,
    )

    _student_fee(
        db_session,
        student,
        structure,
    )

    _payment(
        db_session,
        student,
        "PAY-CONTEXT",
    )

    with app.test_request_context("/"):
        g.tenant_id = None
        g.branch_id = None

        assert scoped_students().count() == 0
        assert scoped_student_fees().count() == 0
        assert scoped_payments().count() == 0
        assert scoped_fee_structures().count() == 0


def test_global_admin_role_cannot_bypass_tenant_finance_role(
    client,
    app,
    db_session,
):
    tenant = _tenant(
        db_session,
        "GlobalAdmin",
    )

    branch = _branch(
        db_session,
        tenant,
        "GlobalAdmin",
    )

    actor = _user(
        db_session,
        role="admin",
        prefix="global_admin_teacher",
    )

    # The selected-tenant authority is teacher, not admin.
    _membership(
        db_session,
        tenant,
        actor,
        "teacher",
    )

    student = _student(
        db_session,
        tenant,
        "Target",
        branch_id=branch.id,
    )

    path = _endpoint_path(
        app,
        "get_balance",
        student_id=student.id,
    )

    response = client.get(
        path,
        headers=_headers(
            actor.id,
            tenant.id,
            branch.id,
        ),
    )

    payload = response.get_json() or {}

    assert response.status_code == 403, payload
    assert payload.get("success") is False
    assert payload.get("message") == "Unauthorized"


def test_school_admin_membership_can_access_same_tenant_balance(
    client,
    app,
    db_session,
):
    tenant = _tenant(
        db_session,
        "SchoolAdmin",
    )

    branch = _branch(
        db_session,
        tenant,
        "SchoolAdmin",
    )

    # Global role is deliberately NOT admin.
    actor = _user(
        db_session,
        role="teacher",
        prefix="membership_admin",
    )

    _membership(
        db_session,
        tenant,
        actor,
        "school_admin",
    )

    student = _student(
        db_session,
        tenant,
        "Target",
        branch_id=branch.id,
    )

    path = _endpoint_path(
        app,
        "get_balance",
        student_id=student.id,
    )

    response = client.get(
        path,
        headers=_headers(
            actor.id,
            tenant.id,
            branch.id,
        ),
    )

    payload = response.get_json() or {}

    assert response.status_code == 200, payload
    assert payload.get("success") is True
    assert float(payload.get("balance", 0)) == 0.0


def test_ownerless_administration_surfaces_are_quarantined(
    client,
    app,
    db_session,
):
    tenant = _tenant(
        db_session,
        "OwnerlessAdmin",
    )

    actor = _user(
        db_session,
        role="super_admin",
        prefix="platform_finance",
    )

    endpoints = (
        "get_budgets",
        "get_transactions",
        "get_facilities",
        "get_maintenance_requests",
        "get_assets",
    )

    for suffix in endpoints:
        path = _endpoint_path(
            app,
            suffix,
        )

        response = client.get(
            path,
            headers=_headers(
                actor.id,
                tenant.id,
            ),
        )

        assert response.status_code == 503, (
            suffix,
            response.get_json(),
        )

        payload = response.get_json() or {}

        assert payload.get("success") is False

        assert (
            payload.get("code")
            == "TENANT_OWNERSHIP_UPGRADE_REQUIRED"
        )
