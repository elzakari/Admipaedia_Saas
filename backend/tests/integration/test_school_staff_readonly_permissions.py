from flask import g

from app.models.tenant import TenantMembership
from app.utils.rbac_decorators import (
    get_request_effective_permissions,
    get_request_effective_roles,
)


def test_school_staff_readonly_has_immutable_read_only_authority(
    app,
    db_session,
    sample_tenant,
    user_factory,
):
    user = user_factory('staff')
    db_session.add(
        TenantMembership(
            tenant_id=sample_tenant.id,
            user_id=user.id,
            role='school_staff_readonly',
            status='active',
        )
    )
    db_session.commit()

    with app.test_request_context('/api/v1/access-context'):
        g.tenant_id = sample_tenant.id
        roles = get_request_effective_roles(user)
        permissions = get_request_effective_permissions(user)

    assert 'school_staff_readonly' in roles
    assert 'staff' in roles
    assert permissions == {
        'student.read',
        'teacher.read',
        'class.read',
        'subject.read',
        'attendance.read',
    }
    assert not any(
        permission.endswith(('.create', '.update', '.delete', '.manage'))
        for permission in permissions
    )
    assert '*' not in permissions
