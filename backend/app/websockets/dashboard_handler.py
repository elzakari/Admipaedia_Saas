from flask_socketio import Namespace, emit
from flask import current_app, request
import time
import threading
from datetime import datetime, timedelta

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

        token = None
        if isinstance(auth, dict):
            token = auth.get('token')

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
                    now = datetime.utcnow()

                    system = self._perf.get_system_metrics() or {}
                    dbm = self._perf.get_database_metrics() or {}
                    appm = self._perf.get_application_metrics() or {}

                    cpu_percent = float(system.get('cpu', {}).get('usage_percent', 0) or 0)
                    memory_percent = float(system.get('memory', {}).get('usage_percent', 0) or 0)
                    disk_percent = float(system.get('disk', {}).get('usage_percent', 0) or 0)

                    conn_time_ms = float(dbm.get('connection_time_ms', 0) or 0)
                    active_db_connections = int(dbm.get('active_connections', 0) or 0)

                    connected = list(self._connected.values())
                    connected_user_ids = {c.get('user_id') for c in connected if c.get('user_id') is not None}
                    active_users = len(connected_user_ids) if len(connected_user_ids) > 0 else max(0, self.active_connections)
                    online_teachers = len({c.get('user_id') for c in connected if c.get('role') == 'teacher' and c.get('user_id') is not None})

                    total_classes = int((appm.get('table_counts') or {}).get('classes', 0) or 0)

                    disk_io = self._get_disk_io_mb_s()

                    update_data = {
                        'activeUsers': int(active_users),
                        'onlineTeachers': int(online_teachers),
                        'currentClasses': total_classes,
                        'systemLoad': round(cpu_percent),
                        'memoryUsage': round(memory_percent),
                        'diskUsage': round(disk_percent),
                        'diskIO': disk_io,
                        'networkLatency': round(conn_time_ms),
                        'databaseConnections': active_db_connections,
                        'timestamp': time.time(),
                    }

                    socketio.emit('system_update', update_data, namespace='/dashboard')
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
