from flask_socketio import Namespace, emit
from flask import current_app, request
import time
import threading
from datetime import datetime, timedelta
import uuid

try:
    import psutil  # type: ignore
except Exception:
    psutil = None
from sqlalchemy import func

from app.extensions import socketio, db
from app.models.user import User
from app.services.performance_monitoring_service import PerformanceMonitoringService
from flask_jwt_extended import decode_token

class DashboardNamespace(Namespace):
    """Namespace for dashboard real-time updates."""
    
    def __init__(self, namespace=None):
        super().__init__(namespace)
        self.active_connections = 0
        self.update_thread = None
        self.stop_event = threading.Event()
        self._app = None
        self._perf = PerformanceMonitoringService()
        self._last_disk_total_bytes = None
        self._last_disk_ts = None
        self._connected = {}

    def on_connect(self, auth=None):
        self.active_connections += 1
        if not self._app:
            self._app = current_app._get_current_object()

        try:
            sid = request.sid
        except Exception:
            sid = None

        user_id = None
        role = None
        tenant_id = None
        branch_id = None

        token = None
        if isinstance(auth, dict):
            token = auth.get('token')
            tenant_id = auth.get('tenant_id')
            branch_id = auth.get('branch_id')

        if token and sid:
            try:
                payload = decode_token(token)
                user_id = payload.get('sub')
                if user_id is not None:
                    user = User.query.get(int(user_id))
                    role = getattr(user, 'role', None) if user else None
            except Exception:
                user_id = None
                role = None

        if sid:
            self._connected[sid] = {
                'user_id': int(user_id) if user_id is not None else None,
                'role': role,
                'tenant_id': self._parse_uuid(tenant_id),
                'branch_id': self._parse_uuid(branch_id),
                'connected_at': time.time()
            }

        print(f"Dashboard client connected. Active: {self.active_connections}")
        
        # Start background thread if not already running
        if not self.update_thread or not self.update_thread.is_alive():
            self.stop_event.clear()
            self.update_thread = threading.Thread(target=self.background_updates)
            self.update_thread.daemon = True
            self.update_thread.start()

    def on_disconnect(self, *args):
        self.active_connections -= 1
        try:
            sid = request.sid
            if sid in self._connected:
                del self._connected[sid]
        except Exception:
            pass
        print(f"Dashboard client disconnected. Active: {self.active_connections}")
        
        if self.active_connections <= 0:
            self.stop_event.set()

    def background_updates(self):
        """Periodically emit system updates while clients are connected."""
        app = self._app or current_app._get_current_object()
        while not self.stop_event.is_set():
            try:
                with app.app_context():
                    from app.services.dashboard_telemetry import DashboardTelemetryService

                    disk_io = self._get_disk_io_mb_s()
                    contexts = {}
                    for sid, connection in self._connected.items():
                        key = (
                            str(connection.get('tenant_id') or ''),
                            str(connection.get('branch_id') or ''),
                        )
                        contexts.setdefault(key, []).append((sid, connection))

                    for (_, _), entries in contexts.items():
                        sample = entries[0][1]
                        tenant_id = sample.get('tenant_id')
                        branch_id = sample.get('branch_id')

                        if tenant_id is not None:
                            telemetry = DashboardTelemetryService.get_live_telemetry(tenant_id, branch_id)
                            system_monitor = telemetry.get('system_monitor', {})
                            academic_metrics = telemetry.get('academic_metrics', {})
                            update_data = {
                                'activeUsers': int(system_monitor.get('active_users', 0) or 0),
                                'onlineTeachers': int(system_monitor.get('online_teachers', 0) or 0),
                                'currentClasses': int(academic_metrics.get('classes_count', 0) or 0),
                                'systemLoad': round(float(system_monitor.get('cpu_usage', 0) or 0)),
                                'memoryUsage': round(float(system_monitor.get('memory_usage', 0) or 0)),
                                'diskUsage': round(float(system_monitor.get('disk_usage', 0) or 0)),
                                'diskIO': disk_io,
                                'networkLatency': round(float(system_monitor.get('network_latency', 0) or 0)),
                                'databaseConnections': int(system_monitor.get('database_connections', 0) or 0),
                                'timestamp': time.time(),
                            }
                        else:
                            system = self._perf.get_system_metrics() or {}
                            dbm = self._perf.get_database_metrics() or {}
                            appm = self._perf.get_application_metrics() or {}
                            update_data = {
                                'activeUsers': max(0, self.active_connections),
                                'onlineTeachers': 0,
                                'currentClasses': int((appm.get('table_counts') or {}).get('classes', 0) or 0),
                                'systemLoad': round(float(system.get('cpu', {}).get('usage_percent', 0) or 0)),
                                'memoryUsage': round(float(system.get('memory', {}).get('usage_percent', 0) or 0)),
                                'diskUsage': round(float(system.get('disk', {}).get('usage_percent', 0) or 0)),
                                'diskIO': disk_io,
                                'networkLatency': round(float(dbm.get('connection_time_ms', 0) or 0)),
                                'databaseConnections': int(dbm.get('active_connections', 0) or 0),
                                'timestamp': time.time(),
                            }

                        for sid, _connection in entries:
                            socketio.emit('system_update', update_data, namespace='/dashboard', to=sid)
            except Exception as e:
                try:
                    print(f"Dashboard realtime metrics error: {e}")
                except Exception:
                    pass

            time.sleep(5)

    def _get_disk_io_mb_s(self) -> float:
        try:
            if psutil is None:
                return 0.0
            counters = psutil.disk_io_counters()
            if not counters:
                return 0.0

            total_bytes = float((counters.read_bytes or 0) + (counters.write_bytes or 0))
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
        """Handle manual refresh requests from clients."""
        # Broadcast to all clients in the namespace that they should refresh their data
        emit('data_invalidated', {'type': data.get('type', 'all')}, broadcast=True)

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
