import threading
import time
import uuid
from datetime import datetime

import structlog
from flask import current_app, request
from flask_socketio import Namespace, emit

try:
    import psutil  # type: ignore
except Exception:
    psutil = None

from flask_jwt_extended import decode_token

from app.extensions import socketio
from app.models.tenant import Branch, TenantMembership
from app.models.user import User
from app.services.performance_monitoring_service import PerformanceMonitoringService
from app.utils.auth_utils import ADMIN_COMPATIBLE_ROLES

logger = structlog.get_logger()

_PLATFORM_ROLES = frozenset({"super_admin", "superadmin", "super_manager"})


def _utcnow() -> datetime:
    return datetime.utcnow()


class DashboardNamespace(Namespace):
    """Namespace for dashboard real-time updates.

    Authentication, authorization and tenant/branch scoping are enforced BEFORE
    a connection is registered and BEFORE the periodic telemetry loop is
    started or restarted.
    """

    def __init__(self, namespace=None):
        super().__init__(namespace)
        self._connections_lock = threading.Lock()
        self._bg_task_lock = threading.Lock()
        self.update_thread = None
        self.stop_event = threading.Event()
        self._app = None
        self._perf = PerformanceMonitoringService()
        self._last_disk_total_bytes = None
        self._last_disk_ts = None
        self._connected = {}

    @property
    def active_connections(self):
        with self._connections_lock:
            return len(self._connected)

    @active_connections.setter
    def active_connections(self, _value):
        return

    # ------------------------------------------------------------------
    # Connection entrypoint: reject unauthorized early.
    # ------------------------------------------------------------------
    def on_connect(self, auth=None):
        # Ensure request app is captured once per process
        if self._app is None:
            try:
                self._app = current_app._get_current_object()
            except Exception:
                self._app = None

        try:
            sid = request.sid
        except Exception:
            sid = None

        if not sid:
            logger.warning("dashboard_connect_rejected", reason="missing_sid")
            return False

        # 1) require auth payload as dict
        if not isinstance(auth, dict):
            logger.warning("dashboard_connect_rejected",
                           reason="missing_auth", sid=sid)
            return False

        # 2) require non-empty token
        raw_token = auth.get("token")
        if not raw_token or not isinstance(raw_token, str) or not raw_token.strip():
            logger.warning("dashboard_connect_rejected",
                           reason="missing_token", sid=sid)
            return False

        # 3) decode and validate JWT
        try:
            payload = decode_token(raw_token)
        except Exception as exc:
            logger.warning("dashboard_connect_rejected",
                           reason="invalid_or_expired_token", sid=sid,
                           error_type=type(exc).__name__)
            return False

        raw_sub = payload.get("sub")
        if raw_sub is None:
            logger.warning("dashboard_connect_rejected",
                           reason="missing_subject", sid=sid)
            return False

        try:
            user_id = int(raw_sub)
        except (TypeError, ValueError):
            logger.warning("dashboard_connect_rejected",
                           reason="malformed_subject", sid=sid)
            return False

        # 4) load user and validate existence / status
        #
        # NOTE: We explicitly bypass the ORM-level tenant auto-filter for
        # identity / membership / bootstrap queries in socket.io handlers:
        # Flask-SocketIO DOES NOT run the Flask app's global before_request
        # hooks, so g.tenant_id is never populated here. These queries ARE
        # the mechanism that derives tenant context in the first place —
        # filtering them by tenant would give zero rows and lock every user
        # out of realtime telemetry.
        user = User.query.without_tenant_filter().get(user_id)
        if user is None:
            logger.warning("dashboard_connect_rejected",
                           reason="nonexistent_user", sid=sid, user_id=user_id)
            return False

        if not getattr(user, "is_active", False):
            logger.warning("dashboard_connect_rejected",
                           reason="inactive_user", sid=sid, user_id=user_id)
            return False

        locked_until = getattr(user, "account_locked_until", None)
        if locked_until is not None and locked_until > _utcnow():
            logger.warning("dashboard_connect_rejected",
                           reason="disabled_user", sid=sid, user_id=user_id)
            return False

        role = (getattr(user, "role", None) or "").lower() or None
        if role not in ADMIN_COMPATIBLE_ROLES:
            logger.warning("dashboard_connect_rejected",
                           reason="unauthorized_role", sid=sid,
                           user_id=user_id, role=role)
            return False

        # 5) resolve tenant (server-side derivation, not trusting browser)
        raw_tenant_id = auth.get("tenant_id")
        raw_branch_id = auth.get("branch_id")
        is_platform = role in _PLATFORM_ROLES

        tenant_id, reject_tenant = self._resolve_tenant(
            user, role, raw_tenant_id, is_platform, sid
        )
        if reject_tenant:
            return False
        if tenant_id is None and not is_platform:
            return False

        branch_id, reject_branch = self._resolve_branch(
            tenant_id, raw_branch_id, is_platform, sid, user_id
        )
        if reject_branch:
            return False

        # 6) register connection (lock protected) ONLY after all checks pass
        with self._connections_lock:
            self._connected[sid] = {
                "user_id": int(user_id),
                "role": role,
                "tenant_id": tenant_id,
                "branch_id": branch_id,
                "connected_at": time.time(),
            }

        logger.info(
            "dashboard_client_connected",
            sid=sid,
            user_id=user_id,
            role=role,
            tenant_id=str(tenant_id) if tenant_id else None,
            branch_id=str(branch_id) if branch_id else None,
            active_count=self._snapshot_count(),
        )

        # 7) ensure exactly one background task per process
        self._ensure_background_task()
        return True

    # ------------------------------------------------------------------
    # Tenancy isolation helpers
    # ------------------------------------------------------------------
    def _resolve_tenant(self, user, role, raw_tenant_id, is_platform, sid):
        """Return a tuple (tenant_id, should_reject).

        For platform-level admins we permit explicit selection of any active
        tenant; when a selection is requested but that tenant is invalid or
        inactive we REJECT rather than silently falling back to global
        telemetry. When no tenant is selected, platform-level telemetry is
        permitted (tenant_id=None, should_reject=False).

        For school-level admins we require or derive an active tenant
        membership and reject cross-tenant requests.
        """
        # Membership lookup is a BOOTSTRAP query — it must NOT be auto-scoped
        # by the before_compile listener because g.tenant_id isn't populated
        # in socket.io handlers (Flask-SocketIO skips before_request).
        memberships = (
            TenantMembership.query.without_tenant_filter()
            .filter_by(user_id=user.id, status="active")
            .all()
        )

        if is_platform:
            if raw_tenant_id:
                requested = self._parse_uuid(raw_tenant_id)
                if requested is None:
                    logger.warning("dashboard_connect_rejected",
                                   reason="invalid_tenant", sid=sid,
                                   user_id=user.id, role=role)
                    return None, True
                # Platform impersonation bootstrap lookup: skip auto-scoping.
                from app.models.tenant import Tenant
                tenant = (
                    Tenant.query.without_tenant_filter()
                    .filter_by(id=requested)
                    .first()
                )
                if tenant is None or tenant.status != "active":
                    logger.warning("dashboard_connect_rejected",
                                   reason="nonexistent_tenant", sid=sid,
                                   user_id=user.id, role=role)
                    return None, True
                return requested, False
            # no tenant selected: platform-wide telemetry only
            return None, False

        # school-level: derive from memberships
        if not memberships:
            logger.warning("dashboard_connect_rejected",
                           reason="no_tenant_membership", sid=sid,
                           user_id=user.id, role=role)
            return None, True

        server_tenant_ids = {m.tenant_id for m in memberships}
        if raw_tenant_id:
            requested = self._parse_uuid(raw_tenant_id)
            if requested is None or requested not in server_tenant_ids:
                logger.warning("dashboard_connect_rejected",
                               reason="cross_tenant_access", sid=sid,
                               user_id=user.id, role=role)
                return None, True
            return requested, False

        # fall back to first active membership
        return memberships[0].tenant_id, False

    def _resolve_branch(self, tenant_id, raw_branch_id, is_platform, sid, user_id):
        """Return (branch_id, should_reject) where branch_id may be None."""
        if not raw_branch_id:
            return None, False
        if tenant_id is None:
            # Platform users without tenant selection cannot scope to a branch
            logger.warning("dashboard_connect_rejected",
                           reason="branch_without_tenant", sid=sid,
                           user_id=user_id)
            return None, True
        branch_uuid = self._parse_uuid(raw_branch_id)
        if branch_uuid is None:
            logger.warning("dashboard_connect_rejected",
                           reason="invalid_branch", sid=sid,
                           user_id=user_id)
            return None, True
        # Bootstrap lookup — skip auto-scoping since g.tenant_id comes from
        # this very derivation flow in socket.io handlers.
        branch = (
            Branch.query.without_tenant_filter()
            .filter_by(id=branch_uuid)
            .first()
        )
        if branch is None:
            logger.warning("dashboard_connect_rejected",
                           reason="nonexistent_branch", sid=sid,
                           user_id=user_id)
            return None, True
        if not getattr(branch, "is_active", True):
            logger.warning("dashboard_connect_rejected",
                           reason="inactive_branch", sid=sid,
                           user_id=user_id)
            return None, True
        if branch.tenant_id != tenant_id:
            logger.warning("dashboard_connect_rejected",
                           reason="branch_outside_tenant", sid=sid,
                           user_id=user_id)
            return None, True
        return branch_uuid, False

    # ------------------------------------------------------------------
    # Safe disconnect
    # ------------------------------------------------------------------
    def on_disconnect(self, *args):
        try:
            sid = request.sid
        except Exception:
            sid = None

        removed = False
        user_id = role = tenant_id = branch_id = None
        if sid:
            with self._connections_lock:
                existing = self._connected.pop(sid, None)
            if existing is not None:
                removed = True
                user_id = existing.get("user_id")
                role = existing.get("role")
                tenant_id = existing.get("tenant_id")
                branch_id = existing.get("branch_id")

        with self._connections_lock:
            count = len(self._connected)

        if removed:
            logger.info(
                "dashboard_client_disconnected",
                sid=sid,
                user_id=user_id,
                role=role,
                tenant_id=str(tenant_id) if tenant_id else None,
                branch_id=str(branch_id) if branch_id else None,
                active_count=count,
            )
        else:
            logger.info(
                "dashboard_client_disconnected_unknown_sid",
                sid=sid,
                active_count=count,
            )

        if count <= 0:
            self.stop_event.set()

    # ------------------------------------------------------------------
    # Background task lifecycle: exactly one per process
    # ------------------------------------------------------------------
    def _snapshot_count(self):
        with self._connections_lock:
            return len(self._connected)

    def _ensure_background_task(self):
        with self._bg_task_lock:
            existing = self.update_thread
            if existing is not None and existing.is_alive():
                return
            self.stop_event.clear()
            self.update_thread = socketio.start_background_task(
                target=self.background_updates
            )
            logger.info("dashboard_background_task_started",
                        active_count=self._snapshot_count())

    # ------------------------------------------------------------------
    # Telemetry loop (always scoped from server-validated context)
    # ------------------------------------------------------------------
    def background_updates(self):
        """Periodically emit scoped system updates while authorized clients remain."""
        try:
            app = self._app or current_app._get_current_object()
        except Exception:
            app = None

        while not self.stop_event.is_set():
            try:
                if app is None:
                    app = current_app._get_current_object()
                with app.app_context():
                    from app.services.dashboard_telemetry import DashboardTelemetryService

                    disk_io = self._get_disk_io_mb_s()

                    with self._connections_lock:
                        connections = list(self._connected.items())
                        active_count = len(self._connected)

                    if active_count <= 0:
                        logger.info(
                            "dashboard_background_task_stopping",
                            reason="no_authorized_clients",
                        )
                        self.stop_event.set()
                        break

                    contexts = {}
                    for sid, connection in connections:
                        role = connection.get("role")
                        is_platform = role in _PLATFORM_ROLES
                        key = (
                            str(connection.get("tenant_id") or ""),
                            str(connection.get("branch_id") or ""),
                            bool(is_platform),
                        )
                        contexts.setdefault(key, []).append((sid, connection))

                    for (_, _, _is_platform), entries in contexts.items():
                        sample = entries[0][1]
                        tenant_id = sample.get("tenant_id")
                        branch_id = sample.get("branch_id")

                        if _is_platform and tenant_id is None:
                            # Platform view: server metrics only for super admins
                            system = self._perf.get_system_metrics() or {}
                            dbm = self._perf.get_database_metrics() or {}
                            appm = self._perf.get_application_metrics() or {}
                            update_data = {
                                "activeUsers": max(0, active_count),
                                "onlineTeachers": 0,
                                "currentClasses": int(
                                    (appm.get("table_counts") or {}).get("classes", 0) or 0
                                ),
                                "systemLoad": round(
                                    float(system.get("cpu", {}).get("usage_percent", 0) or 0)
                                ),
                                "memoryUsage": round(
                                    float(system.get("memory", {}).get("usage_percent", 0) or 0)
                                ),
                                "diskUsage": round(
                                    float(system.get("disk", {}).get("usage_percent", 0) or 0)
                                ),
                                "diskIO": disk_io,
                                "networkLatency": round(
                                    float(dbm.get("connection_time_ms", 0) or 0)
                                ),
                                "databaseConnections": int(
                                    dbm.get("active_connections", 0) or 0
                                ),
                                "timestamp": time.time(),
                            }
                        else:
                            # Tenant-scoped view
                            telemetry = DashboardTelemetryService.get_live_telemetry(
                                tenant_id, branch_id
                            )
                            system_monitor = telemetry.get("system_monitor", {})
                            academic_metrics = telemetry.get("academic_metrics", {})
                            update_data = {
                                "activeUsers": int(
                                    system_monitor.get("active_users", 0) or 0
                                ),
                                "onlineTeachers": int(
                                    system_monitor.get("online_teachers", 0) or 0
                                ),
                                "currentClasses": int(
                                    academic_metrics.get("classes_count", 0) or 0
                                ),
                                "systemLoad": round(
                                    float(system_monitor.get("cpu_usage", 0) or 0)
                                ),
                                "memoryUsage": round(
                                    float(system_monitor.get("memory_usage", 0) or 0)
                                ),
                                "diskUsage": round(
                                    float(system_monitor.get("disk_usage", 0) or 0)
                                ),
                                "diskIO": disk_io,
                                "networkLatency": round(
                                    float(system_monitor.get("network_latency", 0) or 0)
                                ),
                                "databaseConnections": int(
                                    system_monitor.get("database_connections", 0) or 0
                                ),
                                "timestamp": time.time(),
                            }

                        for sid, _connection in entries:
                            socketio.emit(
                                "system_update",
                                update_data,
                                namespace="/dashboard",
                                to=sid,
                            )
            except Exception as exc:
                logger.warning(
                    "dashboard_telemetry_exception",
                    error=str(exc),
                    error_type=type(exc).__name__,
                    exc_info=True,
                )

            try:
                socketio.sleep(5)
            except Exception:
                if self.stop_event.is_set():
                    break

        with self._bg_task_lock:
            self.update_thread = None
        logger.info("dashboard_background_task_stopped")

    # ------------------------------------------------------------------
    # Utilities
    # ------------------------------------------------------------------
    def _get_disk_io_mb_s(self) -> float:
        try:
            if psutil is None:
                return 0.0
            counters = psutil.disk_io_counters()
            if not counters:
                return 0.0

            total_bytes = float(
                (counters.read_bytes or 0) + (counters.write_bytes or 0)
            )
            now_ts = time.time()

            if self._last_disk_total_bytes is None or self._last_disk_ts is None:
                self._last_disk_total_bytes = total_bytes
                self._last_disk_ts = now_ts
                return 0.0

            dt = max(0.001, now_ts - self._last_disk_ts)
            diff = max(0.0, total_bytes - self._last_disk_total_bytes)
            rate_mb_s = (diff / dt) / (1024 * 1024)

            self._last_disk_total_bytes = total_bytes
            self._last_disk_ts = now_ts

            return round(rate_mb_s, 1)
        except Exception:
            return 0.0

    def on_request_refresh(self, data):
        """Handle manual refresh requests from connected clients."""
        try:
            sid = request.sid
        except Exception:
            sid = None
        if not sid:
            return
        with self._connections_lock:
            authorized = sid in self._connected
        if not authorized:
            return
        emit(
            "data_invalidated",
            {"type": data.get("type", "all") if isinstance(data, dict) else "all"},
            broadcast=True,
        )

    @staticmethod
    def _parse_uuid(value):
        if not value:
            return None
        if isinstance(value, uuid.UUID):
            return value
        try:
            return uuid.UUID(str(value))
        except Exception:
            return None
