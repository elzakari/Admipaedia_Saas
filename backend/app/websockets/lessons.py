import threading
import time
from typing import Any, Dict, Optional, Set

from flask import request
from flask_socketio import Namespace, emit, join_room, leave_room

from app.extensions import logger, socketio

HEARTBEAT_INTERVAL_SECONDS = 15
HEARTBEAT_GRACE_PERIOD_SECONDS = 15
HEARTBEAT_TOTAL_TTL = HEARTBEAT_INTERVAL_SECONDS + HEARTBEAT_GRACE_PERIOD_SECONDS

REDIS_VIEWER_KEY_PREFIX = "lesson_viewers:"
REDIS_PEAK_KEY_PREFIX = "lesson_peak_viewers:"

_redis_client: Optional[Any] = None
_redis_client_lock = threading.Lock()


def _get_redis_client() -> Optional[Any]:
    global _redis_client
    if _redis_client is not None:
        return _redis_client
    with _redis_client_lock:
        if _redis_client is not None:
            return _redis_client
        try:
            import os

            redis_url = (
                os.environ.get("REDIS_URL") or ""
            ).strip()
            if not redis_url:
                try:
                    from flask import current_app

                    if current_app:
                        redis_url = (
                            current_app.config.get("REDIS_URL") or ""
                        ).strip()
                except Exception:
                    pass
            if not redis_url:
                return None
            import redis as _redis_pkg

            client = _redis_pkg.from_url(redis_url, socket_connect_timeout=2)
            client.ping()
            _redis_client = client
            logger.info("lessons_redis_viewer_store_available")
        except Exception as exc:
            logger.debug(
                "lessons_redis_viewer_store_unavailable",
                error_type=type(exc).__name__,
            )
            _redis_client = None
    return _redis_client


class _InProcessViewerStore:
    def __init__(self) -> None:
        self._lock = threading.Lock()
        self._last_seen: Dict[str, Dict[str, float]] = {}
        self._peak: Dict[str, int] = {}

    def touch(self, lesson_room: str, viewer_key: str, now: float) -> bool:
        with self._lock:
            room_viewers = self._last_seen.setdefault(lesson_room, {})
            was_present = viewer_key in room_viewers
            room_viewers[viewer_key] = now
            self._maybe_update_peak_locked(lesson_room)
            return was_present

    def evict_expired(self, lesson_room: str, now: float) -> int:
        evicted = 0
        with self._lock:
            room_viewers = self._last_seen.get(lesson_room)
            if not room_viewers:
                return 0
            cutoff = now - HEARTBEAT_TOTAL_TTL
            stale = [k for k, ts in room_viewers.items() if ts < cutoff]
            for k in stale:
                del room_viewers[k]
                evicted += 1
            if not room_viewers:
                self._last_seen.pop(lesson_room, None)
        return evicted

    def count(self, lesson_room: str) -> int:
        with self._lock:
            room_viewers = self._last_seen.get(lesson_room)
            return len(room_viewers) if room_viewers else 0

    def remove(self, lesson_room: str, viewer_key: str) -> bool:
        with self._lock:
            room_viewers = self._last_seen.get(lesson_room)
            if not room_viewers:
                return False
            existed = viewer_key in room_viewers
            if existed:
                del room_viewers[viewer_key]
                if not room_viewers:
                    self._last_seen.pop(lesson_room, None)
            return existed

    def peak(self, lesson_room: str) -> int:
        with self._lock:
            return self._peak.get(lesson_room, 0)

    def reset_peak(self, lesson_room: str) -> None:
        with self._lock:
            self._peak[lesson_room] = 0

    def _maybe_update_peak_locked(self, lesson_room: str) -> None:
        room_viewers = self._last_seen.get(lesson_room)
        current = len(room_viewers) if room_viewers else 0
        if current > self._peak.get(lesson_room, 0):
            self._peak[lesson_room] = current


class _RedisViewerStore:
    def __init__(self, client: Any) -> None:
        self._client = client

    def _viewers_key(self, lesson_room: str) -> str:
        return f"{REDIS_VIEWER_KEY_PREFIX}{lesson_room}"

    def _peak_key(self, lesson_room: str) -> str:
        return f"{REDIS_PEAK_KEY_PREFIX}{lesson_room}"

    def touch(self, lesson_room: str, viewer_key: str, now: float) -> bool:
        key = self._viewers_key(lesson_room)
        score = now
        was_present = False
        try:
            pipe = self._client.pipeline()
            pipe.zscore(key, viewer_key)
            pipe.zadd(key, {viewer_key: score})
            pipe.expire(key, HEARTBEAT_TOTAL_TTL + 60)
            results = pipe.execute()
            was_present = results[0] is not None
            self._maybe_update_peak(lesson_room)
        except Exception as exc:
            logger.warning(
                "lessons_redis_touch_failed",
                error_type=type(exc).__name__,
            )
        return was_present

    def evict_expired(self, lesson_room: str, now: float) -> int:
        key = self._viewers_key(lesson_room)
        cutoff = now - HEARTBEAT_TOTAL_TTL
        removed = 0
        try:
            removed = self._client.zremrangebyscore(key, "-inf", cutoff) or 0
        except Exception as exc:
            logger.warning(
                "lessons_redis_evict_failed",
                error_type=type(exc).__name__,
            )
        return int(removed)

    def count(self, lesson_room: str) -> int:
        key = self._viewers_key(lesson_room)
        try:
            return int(self._client.zcard(key) or 0)
        except Exception:
            return 0

    def remove(self, lesson_room: str, viewer_key: str) -> bool:
        key = self._viewers_key(lesson_room)
        try:
            removed = self._client.zrem(key, viewer_key) or 0
            return int(removed) > 0
        except Exception:
            return False

    def peak(self, lesson_room: str) -> int:
        key = self._peak_key(lesson_room)
        try:
            value = self._client.get(key)
            return int(value) if value is not None else 0
        except Exception:
            return 0

    def reset_peak(self, lesson_room: str) -> None:
        key = self._peak_key(lesson_room)
        try:
            self._client.set(key, 0)
        except Exception:
            pass

    def _maybe_update_peak(self, lesson_room: str) -> None:
        viewers_key = self._viewers_key(lesson_room)
        peak_key = self._peak_key(lesson_room)
        try:
            current = int(self._client.zcard(viewers_key) or 0)
            existing_raw = self._client.get(peak_key)
            existing = int(existing_raw) if existing_raw is not None else 0
            if current > existing:
                self._client.set(peak_key, current)
        except Exception:
            pass


_in_process_store = _InProcessViewerStore()


def _get_viewer_store():
    redis_client = _get_redis_client()
    if redis_client is not None:
        return _RedisViewerStore(redis_client)
    return _in_process_store


def _viewer_key(user_id, sid) -> str:
    base = f"{sid}"
    if user_id is not None:
        base = f"{user_id}:{base}"
    return base


class LessonsNamespace(Namespace):
    def __init__(self, namespace=None):
        super().__init__(namespace)
        self._sid_to_user: Dict[str, Any] = {}
        self._sid_to_rooms: Dict[str, Set[str]] = {}
        self._last_emitted_counts: Dict[str, int] = {}
        self._emit_lock = threading.Lock()

    def _lesson_room_from_any(self, data: Optional[Dict[str, Any]]) -> Optional[str]:
        if not isinstance(data, dict):
            return None
        lesson_id = data.get("lesson_id")
        if lesson_id is not None:
            return f"lesson_{lesson_id}"
        room = data.get("room")
        if isinstance(room, str) and room.startswith("lesson_"):
            return room
        return None

    def _emit_viewer_update(self, lesson_room: str, force: bool = False) -> None:
        store = _get_viewer_store()
        store.evict_expired(lesson_room, time.time())
        current = store.count(lesson_room)
        peak = store.peak(lesson_room)
        should_emit = force
        with self._emit_lock:
            previous = self._last_emitted_counts.get(lesson_room)
            if previous != current:
                should_emit = True
                self._last_emitted_counts[lesson_room] = current
        if should_emit:
            payload = {
                "lesson_room": lesson_room,
                "active_viewers": current,
                "peak_viewers": peak,
                "timestamp": time.time(),
            }
            try:
                socketio.emit(
                    "lesson_viewers_updated",
                    payload,
                    namespace=self.namespace,
                    room=lesson_room,
                )
                logger.debug(
                    "lessons_viewers_updated_emitted",
                    lesson_room=lesson_room,
                    active_viewers=current,
                    peak_viewers=peak,
                )
            except Exception as exc:
                logger.warning(
                    "lessons_viewers_updated_emit_failed",
                    error_type=type(exc).__name__,
                )

    def _join_all_context_rooms(
        self,
        sid: str,
        lesson_id=None,
        class_id=None,
        subject_id=None,
        teacher_id=None,
    ) -> None:
        rooms_to_join: Set[str] = set()
        if lesson_id is not None:
            rooms_to_join.add(f"lesson_{lesson_id}")
        if class_id is not None:
            rooms_to_join.add(f"class_{class_id}")
        if subject_id is not None:
            rooms_to_join.add(f"subject_{subject_id}")
        if teacher_id is not None:
            rooms_to_join.add(f"teacher_{teacher_id}")
        for room in rooms_to_join:
            join_room(room)
        if sid not in self._sid_to_rooms:
            self._sid_to_rooms[sid] = set()
        self._sid_to_rooms[sid].update(rooms_to_join)

    def _leave_all_sid_rooms(self, sid: str) -> None:
        rooms = self._sid_to_rooms.pop(sid, None)
        if not rooms:
            return
        for room in rooms:
            try:
                leave_room(room)
            except Exception:
                pass
            if room.startswith("lesson_"):
                user_id = self._sid_to_user.get(sid)
                vkey = _viewer_key(user_id, sid)
                store = _get_viewer_store()
                store.remove(room, vkey)
                self._emit_viewer_update(room)

    def on_connect(self, auth=None):
        try:
            sid = getattr(request, "sid", None)
            remote = getattr(request, "remote_addr", None)
            logger.info(
                "lessons_client_connect",
                remote_addr=remote,
                sid=sid,
            )
            user_id = None
            try:
                from app.websockets.notifications import (
                    _extract_socket_token,
                    _resolve_socket_user_id,
                )

                token = _extract_socket_token(auth)
                if token:
                    try:
                        user_id = _resolve_socket_user_id(token)
                    except Exception:
                        user_id = None
            except Exception:
                user_id = None
            if sid:
                self._sid_to_user[sid] = user_id
                self._sid_to_rooms[sid] = set()
            emit(
                "connection_success",
                {
                    "status": "connected",
                    "heartbeat_interval_seconds": HEARTBEAT_INTERVAL_SECONDS,
                    "heartbeat_grace_seconds": HEARTBEAT_GRACE_PERIOD_SECONDS,
                    "namespace": self.namespace,
                },
            )
        except Exception as e:
            logger.error(
                "lessons_connect_error",
                error=str(e),
                exc_info=True,
            )
            emit("connection_error", {"error": str(e)})
            raise

    def on_disconnect(self):
        try:
            sid = getattr(request, "sid", None)
            logger.info(
                "lessons_client_disconnect",
                sid=sid,
            )
            if sid:
                self._leave_all_sid_rooms(sid)
                self._sid_to_user.pop(sid, None)
        except Exception as e:
            logger.error(
                "lessons_disconnect_error",
                error=str(e),
                exc_info=True,
            )

    def on_join_room(self, data):
        try:
            sid = getattr(request, "sid", None)
            if not isinstance(data, dict):
                emit("join_room_error", {"error": "Invalid payload"})
                return
            lesson_id = data.get("lesson_id")
            class_id = data.get("class_id")
            subject_id = data.get("subject_id")
            teacher_id = data.get("teacher_id")
            if not any([lesson_id, class_id, subject_id, teacher_id]):
                emit(
                    "join_room_error",
                    {"error": "At least one of lesson_id/class_id/subject_id/teacher_id required"},
                )
                return
            self._join_all_context_rooms(
                sid or "",
                lesson_id=lesson_id,
                class_id=class_id,
                subject_id=subject_id,
                teacher_id=teacher_id,
            )
            user_id = self._sid_to_user.get(sid) if sid else None
            store = _get_viewer_store()
            now = time.time()
            if lesson_id is not None:
                lesson_room = f"lesson_{lesson_id}"
                vkey = _viewer_key(user_id, sid)
                store.touch(lesson_room, vkey, now)
                self._emit_viewer_update(lesson_room, force=True)
            emit(
                "join_room_success",
                {
                    "lesson_id": lesson_id,
                    "class_id": class_id,
                    "subject_id": subject_id,
                    "teacher_id": teacher_id,
                },
            )
        except Exception as e:
            logger.error(
                "lessons_join_room_error",
                error=str(e),
                exc_info=True,
            )
            emit("join_room_error", {"error": str(e)})

    def on_leave_room(self, data):
        try:
            sid = getattr(request, "sid", None)
            if not isinstance(data, dict):
                emit("leave_room_error", {"error": "Invalid payload"})
                return
            lesson_id = data.get("lesson_id")
            class_id = data.get("class_id")
            subject_id = data.get("subject_id")
            teacher_id = data.get("teacher_id")
            rooms_to_leave: Set[str] = set()
            if lesson_id is not None:
                rooms_to_leave.add(f"lesson_{lesson_id}")
            if class_id is not None:
                rooms_to_leave.add(f"class_{class_id}")
            if subject_id is not None:
                rooms_to_leave.add(f"subject_{subject_id}")
            if teacher_id is not None:
                rooms_to_leave.add(f"teacher_{teacher_id}")
            if not rooms_to_leave:
                emit(
                    "leave_room_error",
                    {"error": "At least one of lesson_id/class_id/subject_id/teacher_id required"},
                )
                return
            store = _get_viewer_store()
            user_id = self._sid_to_user.get(sid) if sid else None
            for room in rooms_to_leave:
                leave_room(room)
                if sid and sid in self._sid_to_rooms:
                    self._sid_to_rooms[sid].discard(room)
                if room.startswith("lesson_"):
                    vkey = _viewer_key(user_id, sid)
                    store.remove(room, vkey)
                    self._emit_viewer_update(room)
            emit(
                "leave_room_success",
                {
                    "lesson_id": lesson_id,
                    "class_id": class_id,
                    "subject_id": subject_id,
                    "teacher_id": teacher_id,
                },
            )
        except Exception as e:
            logger.error(
                "lessons_leave_room_error",
                error=str(e),
                exc_info=True,
            )
            emit("leave_room_error", {"error": str(e)})

    def on_viewer_heartbeat(self, data):
        try:
            sid = getattr(request, "sid", None)
            lesson_room = self._lesson_room_from_any(data)
            if lesson_room is None:
                emit(
                    "viewer_heartbeat_error",
                    {"error": "lesson_id or lesson room required"},
                )
                return
            user_id = self._sid_to_user.get(sid) if sid else None
            vkey = _viewer_key(user_id, sid)
            store = _get_viewer_store()
            now = time.time()
            store.touch(lesson_room, vkey, now)
            self._emit_viewer_update(lesson_room)
            emit(
                "viewer_heartbeat_ack",
                {
                    "lesson_room": lesson_room,
                    "server_timestamp": now,
                    "next_heartbeat_by": now + HEARTBEAT_INTERVAL_SECONDS,
                },
            )
        except Exception as e:
            logger.error(
                "lessons_viewer_heartbeat_error",
                error=str(e),
                exc_info=True,
            )
            emit("viewer_heartbeat_error", {"error": str(e)})

    def on_lesson_live_started(self, data):
        try:
            sid = getattr(request, "sid", None)
            lesson_id = data.get("lesson_id") if isinstance(data, dict) else None
            if lesson_id is not None:
                lesson_room = f"lesson_{lesson_id}"
                store = _get_viewer_store()
                store.reset_peak(lesson_room)
                with self._emit_lock:
                    self._last_emitted_counts.pop(lesson_room, None)
                self._emit_viewer_update(lesson_room, force=True)
            logger.info(
                "lessons_live_started_stub",
                sid=sid,
                lesson_id=lesson_id,
                payload=data,
            )
            emit(
                "lesson_live_started_ack",
                {"status": "received", "lesson_id": lesson_id},
            )
        except Exception as e:
            logger.error(
                "lessons_live_started_error",
                error=str(e),
                exc_info=True,
            )

    def on_lesson_slide_posted(self, data):
        try:
            sid = getattr(request, "sid", None)
            lesson_id = data.get("lesson_id") if isinstance(data, dict) else None
            logger.info(
                "lessons_slide_posted_stub",
                sid=sid,
                lesson_id=lesson_id,
                payload=data,
            )
            emit(
                "lesson_slide_posted_ack",
                {"status": "received", "lesson_id": lesson_id},
            )
        except Exception as e:
            logger.error(
                "lessons_slide_posted_error",
                error=str(e),
                exc_info=True,
            )

    def on_lesson_attachment_added(self, data):
        try:
            sid = getattr(request, "sid", None)
            lesson_id = data.get("lesson_id") if isinstance(data, dict) else None
            logger.info(
                "lessons_attachment_added_stub",
                sid=sid,
                lesson_id=lesson_id,
                payload=data,
            )
            emit(
                "lesson_attachment_added_ack",
                {"status": "received", "lesson_id": lesson_id},
            )
        except Exception as e:
            logger.error(
                "lessons_attachment_added_error",
                error=str(e),
                exc_info=True,
            )

    def on_lesson_poll_posted(self, data):
        try:
            sid = getattr(request, "sid", None)
            lesson_id = data.get("lesson_id") if isinstance(data, dict) else None
            logger.info(
                "lessons_poll_posted_stub",
                sid=sid,
                lesson_id=lesson_id,
                payload=data,
            )
            emit(
                "lesson_poll_posted_ack",
                {"status": "received", "lesson_id": lesson_id},
            )
        except Exception as e:
            logger.error(
                "lessons_poll_posted_error",
                error=str(e),
                exc_info=True,
            )

    def on_lesson_comment_posted(self, data):
        try:
            sid = getattr(request, "sid", None)
            lesson_id = data.get("lesson_id") if isinstance(data, dict) else None
            logger.info(
                "lessons_comment_posted_stub",
                sid=sid,
                lesson_id=lesson_id,
                payload=data,
            )
            emit(
                "lesson_comment_posted_ack",
                {"status": "received", "lesson_id": lesson_id},
            )
        except Exception as e:
            logger.error(
                "lessons_comment_posted_error",
                error=str(e),
                exc_info=True,
            )

    def on_lesson_acknowledged(self, data):
        try:
            sid = getattr(request, "sid", None)
            lesson_id = data.get("lesson_id") if isinstance(data, dict) else None
            logger.info(
                "lessons_acknowledged_stub",
                sid=sid,
                lesson_id=lesson_id,
                payload=data,
            )
            emit(
                "lesson_acknowledged_ack",
                {"status": "received", "lesson_id": lesson_id},
            )
        except Exception as e:
            logger.error(
                "lessons_acknowledged_error",
                error=str(e),
                exc_info=True,
            )


lessons_namespace = LessonsNamespace("/ws/lessons")


def broadcast_lesson_event(
    event_name: str,
    payload: Dict[str, Any],
    lesson_id=None,
    class_id=None,
    subject_id=None,
    teacher_id=None,
) -> None:
    rooms: Set[str] = set()
    if lesson_id is not None:
        rooms.add(f"lesson_{lesson_id}")
    if class_id is not None:
        rooms.add(f"class_{class_id}")
    if subject_id is not None:
        rooms.add(f"subject_{subject_id}")
    if teacher_id is not None:
        rooms.add(f"teacher_{teacher_id}")
    if not rooms:
        logger.warning(
            "lessons_broadcast_no_rooms",
            event=event_name,
        )
        return
    for room in rooms:
        try:
            socketio.emit(
                event_name,
                payload,
                namespace="/ws/lessons",
                room=room,
            )
            logger.debug(
                "lessons_broadcast_sent",
                event=event_name,
                room=room,
            )
        except Exception as exc:
            logger.warning(
                "lessons_broadcast_failed",
                event=event_name,
                room=room,
                error_type=type(exc).__name__,
            )
