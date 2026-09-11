import uuid

from flask import g, has_app_context
from sqlalchemy import false, or_

from app.models.class_ import Class
from app.models.finance import FeeCategory, FeeDiscount, FeeStructure, Payment, StudentFee
from app.models.student import Student


def _uuid_value(value):
    if value is None or isinstance(value, uuid.UUID):
        return value
    try:
        return uuid.UUID(str(value))
    except (ValueError, TypeError, AttributeError):
        return value


def _resolve_scope(tenant_id=None, branch_id=None):
    if has_app_context():
        if tenant_id is None:
            tenant_id = getattr(g, "tenant_id", None)
        if branch_id is None:
            branch_id = getattr(g, "branch_id", None)

    return _uuid_value(tenant_id), _uuid_value(branch_id)


def scoped_students(
    query=None,
    *,
    tenant_id=None,
    branch_id=None,
    include_branch=True,
):
    """
    Strict tenant boundary for Student.

    Student is excluded from the application's global automatic tenant
    query filter, so finance code must scope it explicitly.
    """
    query = query if query is not None else Student.query
    tenant_id, branch_id = _resolve_scope(tenant_id, branch_id)

    if tenant_id is None:
        return query.filter(false())

    query = query.filter(Student.tenant_id == tenant_id)

    if include_branch and branch_id is not None:
        query = query.filter(Student.branch_id == branch_id)

    return query


def scoped_student_fees(
    query=None,
    *,
    tenant_id=None,
    branch_id=None,
    include_branch=True,
):
    """
    StudentFee tenant ownership is proven through Student.

    StudentFee.branch_id alone is not considered a tenant-security
    boundary.
    """
    query = query if query is not None else StudentFee.query
    tenant_id, branch_id = _resolve_scope(tenant_id, branch_id)

    query = query.join(
        Student,
        Student.id == StudentFee.student_id,
    )

    if tenant_id is None:
        return query.filter(false())

    query = query.filter(Student.tenant_id == tenant_id)

    if include_branch and branch_id is not None:
        query = query.filter(Student.branch_id == branch_id)

    return query


def scoped_payments(
    query=None,
    *,
    tenant_id=None,
    branch_id=None,
    include_branch=True,
):
    """
    Payment ownership is proven through Payment.student_id -> Student.
    """
    query = query if query is not None else Payment.query
    tenant_id, branch_id = _resolve_scope(tenant_id, branch_id)

    query = query.join(
        Student,
        Student.id == Payment.student_id,
    )

    if tenant_id is None:
        return query.filter(false())

    query = query.filter(Student.tenant_id == tenant_id)

    if include_branch and branch_id is not None:
        query = query.filter(Student.branch_id == branch_id)

    return query


def scoped_classes(
    query=None,
    *,
    tenant_id=None,
    branch_id=None,
    include_branch=True,
):
    query = query if query is not None else Class.query
    tenant_id, branch_id = _resolve_scope(tenant_id, branch_id)

    if tenant_id is None:
        return query.filter(false())

    query = query.filter(Class.tenant_id == tenant_id)

    if include_branch and branch_id is not None:
        query = query.filter(Class.branch_id == branch_id)

    return query



def scoped_fee_categories(
    query=None,
    *,
    tenant_id=None,
):
    """
    Strict tenant boundary for FeeCategory.

    Fee categories are tenant-owned definitions. Category ownership must
    never be inferred from name, branch, user role, or request payload.
    """
    query = query if query is not None else FeeCategory.query
    tenant_id, _ = _resolve_scope(tenant_id, None)

    if tenant_id is None:
        return query.filter(false())

    return query.filter(FeeCategory.tenant_id == tenant_id)



def scoped_fee_discounts(
    query=None,
    *,
    tenant_id=None,
):
    """
    Strict tenant boundary for FeeDiscount.
    """
    query = query if query is not None else FeeDiscount.query
    tenant_id, _ = _resolve_scope(tenant_id, None)

    if tenant_id is None:
        return query.filter(false())

    return query.filter(
        FeeDiscount.tenant_id == tenant_id
    )


def scoped_fee_structures(
    query=None,
    *,
    tenant_id=None,
    branch_id=None,
    include_branch=True,
):
    """
    Strict tenant boundary for FeeStructure.

    FeeStructure.tenant_id is the authoritative school owner.

    Class-bound templates additionally require their Class to belong to
    the same tenant. When a branch context exists, class-bound templates
    must belong to that branch.

    class_id=NULL represents a tenant-wide "All Classes" template and is
    valid because the template itself has explicit tenant ownership.
    """
    query = query if query is not None else FeeStructure.query
    tenant_id, branch_id = _resolve_scope(tenant_id, branch_id)

    query = query.join(
        FeeCategory,
        FeeCategory.id == FeeStructure.fee_category_id,
    ).outerjoin(
        Class,
        Class.id == FeeStructure.class_id,
    )

    if tenant_id is None:
        return query.filter(false())

    query = query.filter(
        FeeStructure.tenant_id == tenant_id,
        FeeCategory.tenant_id == tenant_id,
        or_(
            FeeStructure.class_id.is_(None),
            Class.tenant_id == tenant_id,
        ),
    )

    if include_branch and branch_id is not None:
        query = query.filter(
            or_(
                FeeStructure.class_id.is_(None),
                Class.branch_id == branch_id,
            )
        )

    return query
