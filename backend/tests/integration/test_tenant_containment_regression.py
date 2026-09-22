"""
Regression tests for temporary tenant-security containment.

Ownerless legacy resources must remain fail-closed until their schemas
carry authoritative tenant ownership.
"""

import uuid

from flask_jwt_extended import create_access_token

from app.models.tenant import Tenant, TenantMembership
from app.models.user import User


def _tenant(db_session, prefix="Containment"):
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


def _user(db_session, role="user", prefix="containment"):
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


def _headers(user_id, tenant_id):
    return {
        "Authorization": (
            f"Bearer {create_access_token(identity=user_id)}"
        ),
        "X-Tenant-ID": str(tenant_id),
    }


def test_notification_center_is_degraded_fail_closed(
    client,
    db_session,
):
    tenant = _tenant(db_session, "Notification")
    user = _user(
        db_session,
        role="teacher",
        prefix="notification",
    )
    _membership(db_session, tenant, user, "teacher")

    response = client.get(
        "/api/v1/notifications",
        headers=_headers(user.id, tenant.id),
    )

    assert response.status_code == 200

    payload = response.get_json() or {}

    assert payload.get("degraded") is True
    assert (
        payload.get("code")
        == "notification_tenant_ownership_pending"
    )
    assert payload.get("data") == []


def test_legacy_user_list_is_quarantined(
    client,
    db_session,
):
    """
    Use platform authority here so the request passes permission
    enforcement and proves the legacy User handler itself is quarantined.

    School-admin positive permissions depend on the seeded RBAC admin
    template and are tested separately.
    """
    tenant = _tenant(db_session, "Users")

    user = _user(
        db_session,
        role="super_admin",
        prefix="platform_user_admin",
    )

    response = client.get(
        "/api/v1/users",
        headers=_headers(user.id, tenant.id),
    )

    assert response.status_code == 503

    payload = response.get_json() or {}

    assert (
        payload.get("code")
        == "TENANT_USER_SCOPE_UPGRADE_REQUIRED"
    )


def test_student_conversation_history_is_fail_closed(
    client,
    db_session,
):
    tenant = _tenant(db_session, "StudentMessage")
    user = _user(
        db_session,
        role="student",
        prefix="student_message",
    )
    _membership(
        db_session,
        tenant,
        user,
        "student",
    )

    response = client.get(
        "/api/v1/student/messages/conversations",
        headers=_headers(user.id, tenant.id),
    )

    assert response.status_code == 200

    payload = response.get_json() or {}

    assert payload.get("threads") == []
    assert payload.get("degraded") is True
    assert (
        payload.get("code")
        == "MESSAGE_TENANT_OWNERSHIP_REQUIRED"
    )


def test_school_admin_gets_safe_template_permissions_without_platform_authority(
    client,
    app,
    db_session,
):
    """
    A school_admin receives the safe permissions defined by the immutable
    admin permission template, but never platform/system authority.

    Global RBACRole/RBACPermission rows are permission definitions only;
    the active TenantMembership is what authorizes their use in this tenant.
    """
    from flask import g

    from app.models.rbac import (
        PermissionType,
        RBACPermission,
        RBACRole,
        ResourceType,
    )
    from app.utils.rbac_decorators import (
        get_request_effective_permissions,
        get_request_effective_roles,
    )

    tenant = _tenant(
        db_session,
        "AdminPermission",
    )

    user = _user(
        db_session,
        role="admin",
        prefix="tenant_admin",
    )

    _membership(
        db_session,
        tenant,
        user,
        "school_admin",
    )

    # Seed only the permission-definition template needed for this test.
    # There is deliberately NO user-role assignment to this RBACRole.
    admin_template = RBACRole.query.filter_by(
        name="admin"
    ).first()

    if admin_template is None:
        admin_template = RBACRole(
            name="admin",
            display_name="School Administrator Template",
            description=(
                "Test permission-definition template for tenant school admins"
            ),
            is_system=True,
            is_active=True,
        )
        db_session.add(admin_template)
        db_session.flush()

    safe_specs = (
        (
            "user.read",
            "User Read",
            ResourceType.USER,
            PermissionType.READ,
        ),
        (
            "student.read",
            "Student Read",
            ResourceType.STUDENT,
            PermissionType.READ,
        ),
        (
            "finance.read",
            "Finance Read",
            ResourceType.FINANCE,
            PermissionType.READ,
        ),
    )

    safe_permissions = []

    for (
        name,
        display_name,
        resource_type,
        permission_type,
    ) in safe_specs:
        permission = RBACPermission.query.filter_by(
            name=name
        ).first()

        if permission is None:
            permission = RBACPermission(
                name=name,
                display_name=display_name,
                description=f"Regression permission: {name}",
                resource_type=resource_type,
                permission_type=permission_type,
                scope="global",
                is_system=True,
                is_active=True,
            )
            db_session.add(permission)
            db_session.flush()

        safe_permissions.append(permission)

    # Make the template deterministic for this isolated test.
    admin_template.permissions = safe_permissions
    db_session.flush()

    with app.test_request_context("/"):
        g.tenant_id = tenant.id

        roles = get_request_effective_roles(user)
        permissions = get_request_effective_permissions(user)

        # Tenant-level admin aliases.
        assert "school_admin" in roles
        assert "admin" in roles

        # Legitimate tenant-school capabilities.
        assert "user.read" in permissions
        assert "student.read" in permissions
        assert "finance.read" in permissions

        # Platform/system authority must never bleed in.
        assert "*" not in permissions
        assert "system.admin" not in permissions
        assert "audit.read" not in permissions
        assert "manage_system" not in permissions
        assert "manage_ai_models" not in permissions

    # Positive HTTP proof:
    # user.read should get the school admin through permission enforcement.
    # The legacy User handler itself must then stop the request with the
    # temporary tenant-ownership quarantine.
    response = client.get(
        "/api/v1/users",
        headers=_headers(user.id, tenant.id),
    )

    assert response.status_code == 503

    payload = response.get_json() or {}

    assert (
        payload.get("code")
        == "TENANT_USER_SCOPE_UPGRADE_REQUIRED"
    )


def test_legacy_communications_room_join_is_disabled(
    app,
    monkeypatch,
):
    import app.services.communication_service as communication

    joined = []
    emitted = []

    monkeypatch.setattr(
        communication,
        "join_room",
        lambda *args, **kwargs: joined.append(
            (args, kwargs)
        ),
    )

    monkeypatch.setattr(
        communication,
        "emit",
        lambda event, data, *args, **kwargs: emitted.append(
            (event, data)
        ),
    )

    with app.test_request_context("/socket.io/"):
        result = communication.handle_join_communication_room(
            {
                "user_id": 999,
                "room_type": "user",
                "room_id": 123,
            }
        )

    assert result is False
    assert joined == []

    assert emitted
    assert emitted[0][0] == "error"
    assert (
        emitted[0][1]["code"]
        == "COMMUNICATION_ROOM_TENANT_CONTEXT_REQUIRED"
    )


def test_legacy_chat_room_join_is_disabled(
    app,
    monkeypatch,
):
    import app.services.communication_service as communication

    joined = []
    emitted = []

    monkeypatch.setattr(
        communication,
        "join_room",
        lambda *args, **kwargs: joined.append(
            (args, kwargs)
        ),
    )

    monkeypatch.setattr(
        communication,
        "emit",
        lambda event, data, *args, **kwargs: emitted.append(
            (event, data)
        ),
    )

    with app.test_request_context("/socket.io/"):
        result = communication.handle_join_chat(
            {
                "user_id": 999,
                "chat_id": "foreign-room",
            }
        )

    assert result is False
    assert joined == []

    assert emitted
    assert emitted[0][0] == "error"
    assert (
        emitted[0][1]["code"]
        == "CHAT_TENANT_CONTEXT_REQUIRED"
    )
