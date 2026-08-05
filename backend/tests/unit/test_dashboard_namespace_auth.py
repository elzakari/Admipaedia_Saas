import threading
import time
import uuid
from types import SimpleNamespace

import pytest

from app.extensions import socketio
from app.models.tenant import Branch, Tenant, TenantMembership
from app.models.user import User
from app.websockets.dashboard_handler import DashboardNamespace


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _make_user(db_session, role, email=None, status="active",
               account_locked_until=None):
    suffix = uuid.uuid4().hex[:8]
    user = User(
        username=f"user_{suffix}",
        email=email or f"user_{suffix}@example.com",
        role=role,
        status=status,
    )
    user.set_password("Password123!")
    if account_locked_until is not None:
        user.account_locked_until = account_locked_until
    db_session.add(user)
    db_session.flush()
    return user


def _make_tenant(db_session, status="active"):
    tenant = Tenant(
        name=f"Tenant {uuid.uuid4().hex[:6]}",
        slug=f"tenant-{uuid.uuid4().hex[:6]}",
        country_code="GH",
        currency="GHS",
        schema_name=f"tenant_{uuid.uuid4().hex[:8]}",
        status=status,
    )
    db_session.add(tenant)
    db_session.flush()
    return tenant


def _make_branch(db_session, tenant_id, is_active=True):
    branch = Branch(
        name=f"Branch {uuid.uuid4().hex[:6]}",
        tenant_id=tenant_id,
        code=f"B-{uuid.uuid4().hex[:4].upper()}",
        is_active=is_active,
    )
    db_session.add(branch)
    db_session.flush()
    return branch


def _link_membership(db_session, tenant_id, user_id, role="school_admin"):
    m = TenantMembership(
        tenant_id=tenant_id, user_id=user_id, role=role, status="active"
    )
    db_session.add(m)
    db_session.flush()
    return m


def _call_with_sid(app, sid, callable_fn):
    """Run callable_fn inside a test request context with request.sid bound.

    Uses the existing test_request_context context-manager so the context is
    always popped on exit, matching the pattern used by the message websocket
    tests.
    """
    with app.test_request_context("/socket.io/"):
        from flask import request
        request.sid = sid
        return callable_fn()


def _make_token(identity):
    from flask_jwt_extended import create_access_token
    return create_access_token(identity=identity)


# ---------------------------------------------------------------------------
# Tests
# ---------------------------------------------------------------------------


class TestDashboardAuthRejectsUnauthenticated:
    def test_rejects_missing_auth(self, app):
        ns = DashboardNamespace("/dashboard")
        result = _call_with_sid(app, "s-reject-noauth", lambda: ns.on_connect(None))
        assert result is False
        with ns._connections_lock:
            assert "s-reject-noauth" not in ns._connected
        assert ns.active_connections == 0

    def test_rejects_non_dict_auth(self, app):
        ns = DashboardNamespace("/dashboard")
        result = _call_with_sid(app, "s-reject-list", lambda: ns.on_connect(["not", "a", "dict"]))
        assert result is False

    def test_rejects_missing_token(self, app):
        ns = DashboardNamespace("/dashboard")
        result = _call_with_sid(app, "s-reject-notok", lambda: ns.on_connect({}))
        assert result is False

    def test_rejects_whitespace_token(self, app):
        ns = DashboardNamespace("/dashboard")
        result = _call_with_sid(app, "s-reject-whitespace", lambda: ns.on_connect({"token": "   "}))
        assert result is False

    def test_rejects_invalid_token(self, app):
        ns = DashboardNamespace("/dashboard")
        result = _call_with_sid(app, "s-reject-badtok", lambda: ns.on_connect({"token": "not-a-real-jwt"}))
        assert result is False

    def test_rejects_expired_token(self, app, monkeypatch):
        ns = DashboardNamespace("/dashboard")

        def fake_decode(_token):
            from flask_jwt_extended.exceptions import JWTDecodeError
            raise JWTDecodeError("expired")

        monkeypatch.setattr(
            "app.websockets.dashboard_handler.decode_token", fake_decode
        )
        result = _call_with_sid(
            app, "s-reject-expired",
            lambda: ns.on_connect({"token": "header.payload.signature"}),
        )
        assert result is False

    def test_rejects_missing_subject(self, app, monkeypatch):
        ns = DashboardNamespace("/dashboard")
        monkeypatch.setattr(
            "app.websockets.dashboard_handler.decode_token",
            lambda _tok: {"foo": "bar"},
        )
        result = _call_with_sid(
            app, "s-reject-nosub",
            lambda: ns.on_connect({"token": "x.y.z"}),
        )
        assert result is False

    def test_rejects_malformed_subject(self, app, monkeypatch):
        ns = DashboardNamespace("/dashboard")
        monkeypatch.setattr(
            "app.websockets.dashboard_handler.decode_token",
            lambda _tok: {"sub": "not-an-int"},
        )
        result = _call_with_sid(
            app, "s-reject-badsub",
            lambda: ns.on_connect({"token": "x.y.z"}),
        )
        assert result is False

    def test_rejects_nonexistent_user(self, app, monkeypatch):
        ns = DashboardNamespace("/dashboard")
        monkeypatch.setattr(
            "app.websockets.dashboard_handler.decode_token",
            lambda _tok: {"sub": "999999999"},
        )
        result = _call_with_sid(
            app, "s-reject-nouser",
            lambda: ns.on_connect({"token": "x.y.z"}),
        )
        assert result is False


class TestDashboardUserStateRejections:
    def test_rejects_inactive_user(self, app, db_session):
        user = _make_user(db_session, "school_admin", status="inactive")
        token = _make_token(user.id)
        ns = DashboardNamespace("/dashboard")
        result = _call_with_sid(
            app, "s-reject-inactive",
            lambda: ns.on_connect({"token": token}),
        )
        assert result is False
        with ns._connections_lock:
            assert "s-reject-inactive" not in ns._connected

    def test_rejects_locked_user(self, app, db_session):
        from datetime import datetime, timedelta
        locked = datetime.utcnow() + timedelta(hours=1)
        user = _make_user(db_session, "admin", account_locked_until=locked)
        token = _make_token(user.id)
        ns = DashboardNamespace("/dashboard")
        result = _call_with_sid(
            app, "s-reject-locked",
            lambda: ns.on_connect({"token": token}),
        )
        assert result is False

    def test_rejects_teacher_role(self, app, db_session):
        user = _make_user(db_session, "teacher")
        token = _make_token(user.id)
        ns = DashboardNamespace("/dashboard")
        result = _call_with_sid(
            app, "s-reject-teacher",
            lambda: ns.on_connect({"token": token}),
        )
        assert result is False

    def test_rejects_student_role(self, app, db_session):
        user = _make_user(db_session, "student")
        token = _make_token(user.id)
        ns = DashboardNamespace("/dashboard")
        result = _call_with_sid(
            app, "s-reject-student",
            lambda: ns.on_connect({"token": token}),
        )
        assert result is False

    def test_rejects_parent_role(self, app, db_session):
        user = _make_user(db_session, "parent")
        token = _make_token(user.id)
        ns = DashboardNamespace("/dashboard")
        result = _call_with_sid(
            app, "s-reject-parent",
            lambda: ns.on_connect({"token": token}),
        )
        assert result is False


class TestDashboardTenantIsolation:
    def test_school_admin_rejected_without_membership(self, app, db_session):
        user = _make_user(db_session, "school_admin")
        token = _make_token(user.id)
        ns = DashboardNamespace("/dashboard")
        result = _call_with_sid(
            app, "s-reject-nomember",
            lambda: ns.on_connect({"token": token}),
        )
        assert result is False

    def test_school_admin_rejects_cross_tenant(self, app, db_session):
        user = _make_user(db_session, "school_admin")
        t1 = _make_tenant(db_session)
        t2 = _make_tenant(db_session)
        _link_membership(db_session, t1.id, user.id)
        token = _make_token(user.id)
        ns = DashboardNamespace("/dashboard")
        result = _call_with_sid(
            app, "s-reject-xtenant",
            lambda: ns.on_connect({"token": token, "tenant_id": str(t2.id)}),
        )
        assert result is False

    def test_school_admin_accepts_matching_tenant(self, app, db_session):
        user = _make_user(db_session, "school_admin")
        t1 = _make_tenant(db_session)
        _link_membership(db_session, t1.id, user.id)
        token = _make_token(user.id)
        ns = DashboardNamespace("/dashboard")
        ns._ensure_background_task = lambda: None
        result = _call_with_sid(
            app, "s-ok-member",
            lambda: ns.on_connect({"token": token, "tenant_id": str(t1.id)}),
        )
        assert result is True
        with ns._connections_lock:
            entry = ns._connected.get("s-ok-member")
        assert entry is not None
        assert entry["tenant_id"] == t1.id
        assert entry["user_id"] == user.id
        assert entry["role"] == "school_admin"

    def test_school_admin_derives_tenant_when_browser_omits(self, app, db_session):
        user = _make_user(db_session, "school_admin")
        t1 = _make_tenant(db_session)
        _link_membership(db_session, t1.id, user.id)
        token = _make_token(user.id)
        ns = DashboardNamespace("/dashboard")
        ns._ensure_background_task = lambda: None
        result = _call_with_sid(
            app, "s-ok-derive",
            lambda: ns.on_connect({"token": token}),
        )
        assert result is True
        with ns._connections_lock:
            assert ns._connected["s-ok-derive"]["tenant_id"] == t1.id

    def test_platform_admin_impersonates_active_tenant(self, app, db_session):
        user = _make_user(db_session, "super_admin")
        t1 = _make_tenant(db_session, status="active")
        token = _make_token(user.id)
        ns = DashboardNamespace("/dashboard")
        ns._ensure_background_task = lambda: None
        result = _call_with_sid(
            app, "s-ok-super",
            lambda: ns.on_connect({"token": token, "tenant_id": str(t1.id)}),
        )
        assert result is True
        with ns._connections_lock:
            assert ns._connected["s-ok-super"]["tenant_id"] == t1.id

    def test_platform_admin_rejects_inactive_tenant(self, app, db_session):
        user = _make_user(db_session, "super_manager")
        t1 = _make_tenant(db_session, status="inactive")
        token = _make_token(user.id)
        ns = DashboardNamespace("/dashboard")
        result = _call_with_sid(
            app, "s-reject-badtenant",
            lambda: ns.on_connect({"token": token, "tenant_id": str(t1.id)}),
        )
        assert result is False

    def test_platform_admin_rejects_nonexistent_tenant_id(self, app, db_session):
        user = _make_user(db_session, "superadmin")
        token = _make_token(user.id)
        fake_tenant = str(uuid.uuid4())
        ns = DashboardNamespace("/dashboard")
        result = _call_with_sid(
            app, "s-reject-notenant",
            lambda: ns.on_connect({"token": token, "tenant_id": fake_tenant}),
        )
        assert result is False


class TestDashboardBranchIsolation:
    def test_school_admin_rejects_branch_outside_tenant(self, app, db_session):
        user = _make_user(db_session, "school_admin")
        t1 = _make_tenant(db_session)
        t2 = _make_tenant(db_session)
        _link_membership(db_session, t1.id, user.id)
        b2 = _make_branch(db_session, t2.id)
        token = _make_token(user.id)
        ns = DashboardNamespace("/dashboard")
        result = _call_with_sid(
            app, "s-reject-branchxtnt",
            lambda: ns.on_connect({
                "token": token,
                "tenant_id": str(t1.id),
                "branch_id": str(b2.id),
            }),
        )
        assert result is False

    def test_school_admin_rejects_inactive_branch(self, app, db_session):
        user = _make_user(db_session, "admin")
        t1 = _make_tenant(db_session)
        _link_membership(db_session, t1.id, user.id)
        b1 = _make_branch(db_session, t1.id, is_active=False)
        token = _make_token(user.id)
        ns = DashboardNamespace("/dashboard")
        result = _call_with_sid(
            app, "s-reject-inactbranch",
            lambda: ns.on_connect({
                "token": token,
                "tenant_id": str(t1.id),
                "branch_id": str(b1.id),
            }),
        )
        assert result is False

    def test_school_admin_rejects_nonexistent_branch(self, app, db_session):
        user = _make_user(db_session, "school_admin")
        t1 = _make_tenant(db_session)
        _link_membership(db_session, t1.id, user.id)
        token = _make_token(user.id)
        ns = DashboardNamespace("/dashboard")
        result = _call_with_sid(
            app, "s-reject-nobr",
            lambda: ns.on_connect({
                "token": token,
                "tenant_id": str(t1.id),
                "branch_id": str(uuid.uuid4()),
            }),
        )
        assert result is False

    def test_school_admin_accepts_valid_branch(self, app, db_session):
        user = _make_user(db_session, "school_admin")
        t1 = _make_tenant(db_session)
        _link_membership(db_session, t1.id, user.id)
        b1 = _make_branch(db_session, t1.id)
        token = _make_token(user.id)
        ns = DashboardNamespace("/dashboard")
        ns._ensure_background_task = lambda: None
        result = _call_with_sid(
            app, "s-ok-branch",
            lambda: ns.on_connect({
                "token": token,
                "tenant_id": str(t1.id),
                "branch_id": str(b1.id),
            }),
        )
        assert result is True
        with ns._connections_lock:
            assert ns._connected["s-ok-branch"]["branch_id"] == b1.id

    def test_platform_rejects_branch_without_tenant(self, app, db_session):
        user = _make_user(db_session, "super_admin")
        t1 = _make_tenant(db_session)
        b1 = _make_branch(db_session, t1.id)
        token = _make_token(user.id)
        ns = DashboardNamespace("/dashboard")
        result = _call_with_sid(
            app, "s-reject-bnowt",
            lambda: ns.on_connect({"token": token, "branch_id": str(b1.id)}),
        )
        assert result is False


class TestDashboardConnectionRegistry:
    def test_disconnect_removes_safely(self, app, db_session):
        user = _make_user(db_session, "school_admin")
        t1 = _make_tenant(db_session)
        _link_membership(db_session, t1.id, user.id)
        token = _make_token(user.id)
        ns = DashboardNamespace("/dashboard")
        ns._ensure_background_task = lambda: None
        connect_ok = _call_with_sid(
            app, "s-disc-1",
            lambda: ns.on_connect({"token": token, "tenant_id": str(t1.id)}),
        )
        assert connect_ok is True
        assert ns.active_connections == 1
        _call_with_sid(app, "s-disc-1", lambda: (ns.on_disconnect(), None)[1])
        assert ns.active_connections == 0
        with ns._connections_lock:
            assert "s-disc-1" not in ns._connected

    def test_disconnect_unknown_sid_is_safe(self, app):
        ns = DashboardNamespace("/dashboard")
        _call_with_sid(app, "s-unknown", lambda: (ns.on_disconnect(), None)[1])
        assert ns.active_connections == 0

    def test_connection_count_never_negative(self, app, db_session):
        user = _make_user(db_session, "school_admin")
        t1 = _make_tenant(db_session)
        _link_membership(db_session, t1.id, user.id)
        token = _make_token(user.id)
        ns = DashboardNamespace("/dashboard")
        ns._ensure_background_task = lambda: None
        connect_ok = _call_with_sid(
            app, "s-count",
            lambda: ns.on_connect({"token": token, "tenant_id": str(t1.id)}),
        )
        assert connect_ok is True
        # Double disconnect
        _call_with_sid(app, "s-count", lambda: (ns.on_disconnect(), ns.on_disconnect(), None)[2])
        assert ns.active_connections >= 0

    def test_request_refresh_requires_authorized_sid(self, app, db_session, monkeypatch):
        emitted = []
        monkeypatch.setattr(
            "app.websockets.dashboard_handler.emit",
            lambda evt, data, broadcast=False: emitted.append((evt, data, broadcast)),
        )
        ns = DashboardNamespace("/dashboard")
        # Unknown sid: no broadcast
        _call_with_sid(
            app, "s-noauth-refresh",
            lambda: (ns.on_request_refresh({"type": "all"}), None)[1],
        )
        assert emitted == []

        # Authorized sid: emits data_invalidated
        user = _make_user(db_session, "school_admin")
        t1 = _make_tenant(db_session)
        _link_membership(db_session, t1.id, user.id)
        token = _make_token(user.id)
        ns._ensure_background_task = lambda: None

        def _both():
            connected = ns.on_connect({"token": token, "tenant_id": str(t1.id)})
            ns.on_request_refresh({"type": "academic"})
            return connected

        connect_ok = _call_with_sid(app, "s-auth-refresh", _both)
        assert connect_ok is True
        events = [e for e in emitted if e[0] == "data_invalidated"]
        assert len(events) == 1
        assert events[0][1] == {"type": "academic"}


class TestDashboardBackgroundTask:
    def test_background_task_starts_only_once_then_restarts_safely(self, app, db_session, monkeypatch):
        started = []
        threads_created = []

        # Do NOT run the real dashboard_handler.background_updates in a real
        # thread: the real implementation opens its own app.app_context and
        # touches the shared db session, which rolls back the outer test
        # savepoint (db_isolation fixture) and erases fixtures like the
        # TenantMembership row. Instead we instrument a lightweight loop that
        # respects stop_event and exposes exactly the lifecycle we need:
        # is_alive() transitions + cleared self.update_thread by the handler.
        def fake_start(target):
            # We deliberately ignore `target` (the real background_updates)
            # to avoid DB side effects from a parallel thread.
            started.append(True)

            def dummy_loop():
                stop_event = ns.stop_event
                # short sleep each tick; match socketio.sleep monkeypatch below
                try:
                    while not stop_event.is_set():
                        time.sleep(0.05)
                finally:
                    with ns._bg_task_lock:
                        ns.update_thread = None

            t = threading.Thread(target=dummy_loop, daemon=True)
            t.start()
            threads_created.append(t)
            return SimpleNamespace(is_alive=lambda: t.is_alive())

        monkeypatch.setattr(
            "app.websockets.dashboard_handler.socketio.start_background_task",
            fake_start,
        )
        monkeypatch.setattr(
            "app.websockets.dashboard_handler.socketio.sleep",
            lambda _: time.sleep(0.01),
        )

        user = _make_user(db_session, "school_admin")
        t1 = _make_tenant(db_session)
        _link_membership(db_session, t1.id, user.id)
        token = _make_token(user.id)
        ns = DashboardNamespace("/dashboard")

        def _run_all():
            from flask import request
            request.sid = "sbg-1"
            r1 = ns.on_connect({"token": token, "tenant_id": str(t1.id)})
            request.sid = "sbg-2"
            r2 = ns.on_connect({"token": token, "tenant_id": str(t1.id)})
            return r1, r2

        def _run_disconnects():
            from flask import request
            request.sid = "sbg-1"
            ns.on_disconnect()
            request.sid = "sbg-2"
            ns.on_disconnect()

        def _run_reconnect():
            from flask import request
            request.sid = "sbg-3"
            return ns.on_connect({"token": token, "tenant_id": str(t1.id)})

        r1_ok, r2_ok = _call_with_sid(app, "sbg-1", _run_all)
        assert r1_ok is True
        assert r2_ok is True
        assert len(started) == 1, "two authorized connects => single bg task start"
        time.sleep(0.1)
        _call_with_sid(app, "sbg-1", lambda: (_run_disconnects(), None)[1])
        # Give dummy_loop time to see stop_event and clear ns.update_thread
        time.sleep(0.2)
        r3_ok = _call_with_sid(app, "sbg-3", _run_reconnect)
        assert r3_ok is True, (
            "sbg-3 reconnection should still see its TenantMembership row "
            "because the dummy background loop never touched the DB"
        )
        assert len(started) == 2, (
            f"expected restart after drain; started count={len(started)}"
        )
