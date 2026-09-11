"""
P0 multi-tenant security regression tests.

These tests define the post-containment security contract:
- tenant authority comes from the active TenantMembership for the
  selected tenant;
- global User.role / PermissionGrant state cannot elevate a normal
  tenant request;
- explicitly selecting a foreign tenant fails closed;
- platform super roles retain their platform behavior;
- ownerless legacy subsystems stay unavailable until their schemas
  have authoritative tenant ownership.

Do not weaken these assertions merely to preserve historical behavior.
"""

import uuid

from flask_jwt_extended import create_access_token

from app.models.tenant import Tenant, TenantMembership
from app.models.user import User


def _make_tenant(db_session, prefix):
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


def _make_user(db_session, role="user", prefix="security"):
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


def _headers(user_id, tenant_id=None):
    token = create_access_token(identity=user_id)
    headers = {
        "Authorization": f"Bearer {token}",
    }
    if tenant_id is not None:
        headers["X-Tenant-ID"] = str(tenant_id)
    return headers


def _setup_two_tenants(db_session):
    tenant_a = _make_tenant(db_session, "TenantA")
    tenant_b = _make_tenant(db_session, "TenantB")
    return tenant_a, tenant_b


def test_explicit_foreign_tenant_is_denied_by_global_request_boundary(
    client,
    db_session,
):
    """
    Even a legacy route that forgot @tenant_required must not accept an
    explicitly selected tenant for which the caller has no membership.
    """
    tenant_a, tenant_b = _setup_two_tenants(db_session)

    user = _make_user(
        db_session,
        role="admin",
        prefix="ordinary_global_admin",
    )
    _membership(
        db_session,
        tenant_a,
        user,
        "school_admin",
    )
    db_session.flush()

    response = client.get(
        "/api/v1/dashboard/statistics",
        headers=_headers(user.id, tenant_b.id),
    )

    assert response.status_code == 403
    payload = response.get_json() or {}
    assert payload.get("success") is False
    assert payload.get("message") == "Tenant access denied"


def test_global_admin_role_does_not_authorize_foreign_tenant(
    client,
    db_session,
):
    """
    Historical User.role='admin' must not act as platform authority.
    """
    tenant_a, tenant_b = _setup_two_tenants(db_session)

    user = _make_user(
        db_session,
        role="admin",
        prefix="global_admin",
    )

    _membership(
        db_session,
        tenant_a,
        user,
        "school_admin",
    )
    db_session.flush()

    response = client.get(
        "/api/v1/messages",
        headers=_headers(user.id, tenant_b.id),
    )

    # The unauthorized tenant selection must be rejected before the
    # messaging quarantine can return its own 503.
    assert response.status_code == 403


def test_role_is_derived_from_selected_tenant_membership(
    app,
    db_session,
):
    """
    A user may be school_admin in A and teacher in B. Selecting B must
    never carry A's school_admin authority across the boundary.
    """
    from flask import g

    from app.utils.rbac_decorators import (
        get_request_effective_roles,
    )

    tenant_a, tenant_b = _setup_two_tenants(db_session)

    user = _make_user(
        db_session,
        role="admin",
        prefix="multi_membership",
    )

    _membership(
        db_session,
        tenant_a,
        user,
        "school_admin",
    )
    _membership(
        db_session,
        tenant_b,
        user,
        "teacher",
    )
    db_session.flush()

    with app.test_request_context("/"):
        g.tenant_id = tenant_b.id

        roles = get_request_effective_roles(user)

        assert "teacher" in roles
        assert "school_admin" not in roles
        assert "admin" not in roles


def test_school_finance_membership_does_not_inherit_global_admin(
    app,
    db_session,
):
    from flask import g

    from app.utils.rbac_decorators import (
        get_request_effective_permissions,
        get_request_effective_roles,
    )

    tenant_a = _make_tenant(
        db_session,
        "FinanceTenant",
    )

    user = _make_user(
        db_session,
        role="admin",
        prefix="finance_global_admin",
    )

    _membership(
        db_session,
        tenant_a,
        user,
        "school_finance",
    )
    db_session.flush()

    with app.test_request_context("/"):
        g.tenant_id = tenant_a.id

        roles = get_request_effective_roles(user)
        permissions = get_request_effective_permissions(user)

        assert roles == {"school_finance"}

        assert "finance.read" in permissions
        assert "finance.manage" in permissions

        assert "user.update" not in permissions
        assert "user.manage_roles" not in permissions
        assert "system.admin" not in permissions
        assert "*" not in permissions


def test_global_permission_grant_does_not_elevate_tenant_request(
    app,
    db_session,
):
    """
    PermissionGrant is a global legacy object. It must not become tenant
    authority for an ordinary user.
    """
    from flask import g

    from app.extensions import db
    from app.models.rbac import (
        PermissionGrant,
        RBACPermission,
    )
    from app.utils.rbac_decorators import (
        get_request_effective_permissions,
    )

    tenant_a = _make_tenant(
        db_session,
        "GrantTenant",
    )

    user = _make_user(
        db_session,
        role="teacher",
        prefix="global_grant",
    )

    _membership(
        db_session,
        tenant_a,
        user,
        "teacher",
    )

    permission = RBACPermission.query.filter_by(
        name="system.admin"
    ).first()

    if permission is None:
        permission = RBACPermission(
            name="system.admin",
            display_name="System Admin",
            description="Regression-test permission",
            resource_type="system",
            permission_type="admin",
        )
        db.session.add(permission)
        db.session.flush()

    db.session.add(
        PermissionGrant(
            user_id=user.id,
            permission_id=permission.id,
            is_active=True,
            is_denied=False,
        )
    )
    db.session.flush()

    with app.test_request_context("/"):
        g.tenant_id = tenant_a.id

        effective = get_request_effective_permissions(user)

        assert "system.admin" not in effective
        assert "*" not in effective


def test_unique_membership_can_be_inferred(
    app,
    db_session,
):
    from app.utils.tenant_context import (
        resolve_tenant_for_request,
    )

    tenant_a = _make_tenant(
        db_session,
        "InferTenant",
    )

    user = _make_user(
        db_session,
        role="teacher",
        prefix="infer",
    )

    _membership(
        db_session,
        tenant_a,
        user,
        "teacher",
    )
    db_session.flush()

    token = create_access_token(identity=user.id)

    with app.test_request_context(
        "/",
        headers={
            "Authorization": f"Bearer {token}",
        },
    ):
        tenant_id, resolved_user, err = (
            resolve_tenant_for_request(
                require_explicit=False,
                load_full_user=False,
            )
        )

        assert err is None
        assert tenant_id == tenant_a.id
        assert resolved_user.id == user.id


def test_multiple_memberships_without_selected_tenant_are_ambiguous(
    app,
    db_session,
):
    from app.utils.tenant_context import (
        resolve_tenant_for_request,
    )

    tenant_a, tenant_b = _setup_two_tenants(
        db_session
    )

    user = _make_user(
        db_session,
        role="teacher",
        prefix="ambiguous",
    )

    _membership(
        db_session,
        tenant_a,
        user,
        "teacher",
    )
    _membership(
        db_session,
        tenant_b,
        user,
        "teacher",
    )
    db_session.flush()

    token = create_access_token(identity=user.id)

    with app.test_request_context(
        "/",
        headers={
            "Authorization": f"Bearer {token}",
        },
    ):
        tenant_id, _resolved_user, err = (
            resolve_tenant_for_request(
                require_explicit=True,
                load_full_user=False,
            )
        )

        assert tenant_id is None
        assert err == "Tenant context required"


def test_platform_super_admin_can_select_active_tenant(
    app,
    db_session,
):
    from app.utils.tenant_context import (
        resolve_tenant_for_request,
    )

    tenant = _make_tenant(
        db_session,
        "PlatformTarget",
    )

    user = _make_user(
        db_session,
        role="super_admin",
        prefix="platform",
    )
    db_session.flush()

    token = create_access_token(identity=user.id)

    with app.test_request_context(
        "/",
        headers={
            "Authorization": f"Bearer {token}",
            "X-Tenant-ID": str(tenant.id),
        },
    ):
        tenant_id, resolved_user, err = (
            resolve_tenant_for_request(
                require_explicit=True,
                load_full_user=False,
            )
        )

        assert err is None
        assert tenant_id == tenant.id
        assert resolved_user.id == user.id


def test_legacy_superadmin_alias_is_not_platform_authority(
    app,
    db_session,
):
    from app.utils.tenant_context import (
        resolve_tenant_for_request,
    )

    tenant = _make_tenant(
        db_session,
        "LegacyAliasTarget",
    )

    user = _make_user(
        db_session,
        role="superadmin",
        prefix="legacy_superadmin",
    )
    db_session.flush()

    token = create_access_token(identity=user.id)

    with app.test_request_context(
        "/",
        headers={
            "Authorization": f"Bearer {token}",
            "X-Tenant-ID": str(tenant.id),
        },
    ):
        tenant_id, _resolved_user, err = (
            resolve_tenant_for_request(
                require_explicit=True,
                load_full_user=False,
            )
        )

        assert tenant_id is None
        assert err == "Tenant access denied"


def test_message_api_is_fail_closed_until_messages_have_tenant_owner(
    client,
    db_session,
):
    tenant = _make_tenant(
        db_session,
        "MessageTenant",
    )

    user = _make_user(
        db_session,
        role="teacher",
        prefix="message_user",
    )

    _membership(
        db_session,
        tenant,
        user,
        "teacher",
    )
    db_session.flush()

    response = client.get(
        "/api/v1/messages",
        headers=_headers(user.id, tenant.id),
    )

    assert response.status_code == 503
    payload = response.get_json() or {}
    assert (
        payload.get("code")
        == "MESSAGE_TENANT_OWNERSHIP_REQUIRED"
    )


def test_calendar_event_api_is_fail_closed(
    client,
    db_session,
):
    tenant = _make_tenant(
        db_session,
        "CalendarTenant",
    )

    user = _make_user(
        db_session,
        role="teacher",
        prefix="calendar_user",
    )

    _membership(
        db_session,
        tenant,
        user,
        "teacher",
    )
    db_session.flush()

    response = client.get(
        "/api/v1/calendar/events",
        headers=_headers(user.id, tenant.id),
    )

    assert response.status_code == 503
    payload = response.get_json() or {}
    assert (
        payload.get("code")
        == "CALENDAR_TENANT_OWNERSHIP_REQUIRED"
    )



def test_access_context_endpoint_uses_selected_tenant_membership(
    app,
    client,
    db_session,
):
    tenant_a, tenant_b = _setup_two_tenants(db_session)

    user = _make_user(
        db_session,
        role="admin",
        prefix="access_context_membership",
    )

    _membership(db_session, tenant_a, user, "school_admin")
    _membership(db_session, tenant_b, user, "teacher")
    db_session.commit()

    response = client.get(
        "/api/v1/access-context",
        headers=_headers(user.id, tenant_b.id),
    )

    assert response.status_code == 200

    payload = response.get_json()
    assert payload["success"] is True

    data = payload["data"]
    assert data["tenant_id"] == str(tenant_b.id)
    assert "teacher" in data["roles"]
    assert "school_admin" not in data["roles"]
    assert "admin" not in data["roles"]
    assert "*" not in data["permissions"]


def test_access_context_endpoint_rejects_foreign_tenant(
    app,
    client,
    db_session,
):
    tenant_a, tenant_b = _setup_two_tenants(db_session)

    user = _make_user(
        db_session,
        role="teacher",
        prefix="access_context_spoof",
    )

    _membership(db_session, tenant_a, user, "teacher")
    db_session.commit()

    response = client.get(
        "/api/v1/access-context",
        headers=_headers(user.id, tenant_b.id),
    )

    assert response.status_code == 403
    assert response.get_json()["message"] == "Tenant access denied"


def test_access_context_endpoint_preserves_platform_authority_without_tenant(
    app,
    client,
    db_session,
):
    from flask_jwt_extended import create_access_token

    user = _make_user(
        db_session,
        role="super_admin",
        prefix="access_context_platform",
    )
    db_session.commit()

    with app.app_context():
        token = create_access_token(identity=user.id)

    response = client.get(
        "/api/v1/access-context",
        headers={"Authorization": f"Bearer {token}"},
    )

    assert response.status_code == 200

    data = response.get_json()["data"]
    assert data["tenant_id"] is None
    assert data["roles"] == ["super_admin"]
    assert data["permissions"] == ["*"]
