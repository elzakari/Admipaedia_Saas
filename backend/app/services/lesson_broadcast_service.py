from datetime import datetime

import structlog
from sqlalchemy.exc import SQLAlchemyError

from app.extensions import db
from app.models.lesson import Lesson
from app.models.lesson_broadcast import LessonBroadcast
from app.websockets.lessons import _get_viewer_store, broadcast_lesson_event

logger = structlog.get_logger()


class LessonBroadcastService:
    """Service for managing lesson broadcasts (live, pause, resume, rebroadcast)."""

    @staticmethod
    def _get_tenant_id_for_lesson(lesson):
        class_ = getattr(lesson, "class_", None)
        if class_:
            return getattr(class_, "tenant_id", None)
        return getattr(lesson, "tenant_id", None)

    @staticmethod
    def _sync_peak_from_store(lesson_id, broadcast):
        lesson_room = f"lesson_{lesson_id}"
        store = _get_viewer_store()
        peak = store.peak(lesson_room)
        current = store.count(lesson_room)
        if peak > broadcast.peak_viewers:
            broadcast.peak_viewers = peak
        broadcast.viewer_count = current

    @staticmethod
    def get_active_broadcast(lesson_id):
        return (
            LessonBroadcast.query.filter_by(lesson_id=lesson_id)
            .filter(LessonBroadcast.status.in_(["live", "paused", "rebroadcasting"]))
            .order_by(LessonBroadcast.created_at.desc())
            .first()
        )

    @staticmethod
    def start_broadcast(lesson_id, initiated_by_user_id=None, stream_url=None):
        try:
            lesson = Lesson.query.get(lesson_id)
            if not lesson:
                return None, "Lesson not found"

            tenant_id = LessonBroadcastService._get_tenant_id_for_lesson(lesson)
            if not tenant_id:
                return None, "Lesson tenant context missing"

            existing = LessonBroadcastService.get_active_broadcast(lesson_id)
            if existing:
                return None, "Broadcast already active"

            lesson_room = f"lesson_{lesson_id}"
            store = _get_viewer_store()
            store.reset_peak(lesson_room)

            broadcast = LessonBroadcast(
                lesson_id=lesson_id,
                tenant_id=tenant_id,
                status="live",
                started_at=datetime.utcnow(),
                stream_url=stream_url,
                peak_viewers=0,
                viewer_count=0,
                broadcast_metadata={
                    "initiated_by_user_id": initiated_by_user_id,
                },
            )
            db.session.add(broadcast)
            db.session.flush()

            payload = {
                "broadcast_id": broadcast.id,
                "lesson_id": lesson_id,
                "status": "live",
                "started_at": broadcast.started_at.isoformat(),
                "stream_url": stream_url,
                "tenant_id": str(tenant_id) if tenant_id else None,
            }
            broadcast_lesson_event(
                "lesson_live_started",
                payload,
                lesson_id=lesson_id,
                class_id=lesson.class_id,
                subject_id=lesson.subject_id,
                teacher_id=lesson.teacher_id,
            )

            try:
                from app.services.notification.service import NotificationService

                class_ = getattr(lesson, "class_", None)
                class_name = getattr(class_, "name", "class")
                teacher = getattr(lesson, "teacher", None)
                teacher_name = "Teacher"
                if teacher:
                    teacher_name = (
                        getattr(teacher, "full_name", None)
                        or f"{getattr(teacher, 'first_name', '')} {getattr(teacher, 'last_name', '')}".strip()
                        or "Teacher"
                    )
                notification_title = f"Live Lesson Started: {lesson.title}"
                notification_msg = (
                    f"{teacher_name} has started live lesson '{lesson.title}' for {class_name}."
                )
                try:
                    from app.models.dashboard import Notification
                    from app.models.user import User

                    db_notif = Notification(
                        title=notification_title,
                        message=notification_msg,
                        type="lesson_live",
                        time=datetime.utcnow(),
                        read=False,
                    )
                    db.session.add(db_notif)
                except Exception:
                    pass
            except Exception as exc:
                logger.debug(
                    "lesson_broadcast_notification_push_failed",
                    lesson_id=lesson_id,
                    error=str(exc),
                )

            db.session.commit()
            logger.info(
                "lesson_broadcast_started",
                broadcast_id=broadcast.id,
                lesson_id=lesson_id,
            )
            return broadcast, None
        except SQLAlchemyError as e:
            db.session.rollback()
            logger.error("lesson_broadcast_start_error", error=str(e), lesson_id=lesson_id)
            return None, str(e)

    @staticmethod
    def end_broadcast(broadcast_id, ended_by_user_id=None, recording_url=None):
        try:
            broadcast = LessonBroadcast.query.get(broadcast_id)
            if not broadcast:
                return None, "Broadcast not found"

            if broadcast.status == "ended":
                return broadcast, None

            lesson_id = broadcast.lesson_id
            LessonBroadcastService._sync_peak_from_store(lesson_id, broadcast)
            broadcast.status = "ended"
            broadcast.ended_at = datetime.utcnow()
            if recording_url:
                broadcast.recording_url = recording_url
            meta = dict(broadcast.broadcast_metadata or {})
            meta["ended_by_user_id"] = ended_by_user_id
            meta["ended_at"] = broadcast.ended_at.isoformat()
            broadcast.broadcast_metadata = meta

            lesson = Lesson.query.get(lesson_id)
            payload = {
                "broadcast_id": broadcast.id,
                "lesson_id": lesson_id,
                "status": "ended",
                "ended_at": broadcast.ended_at.isoformat(),
                "peak_viewers": broadcast.peak_viewers,
                "recording_url": recording_url,
            }
            broadcast_lesson_event(
                "lesson_live_ended",
                payload,
                lesson_id=lesson_id,
                class_id=getattr(lesson, "class_id", None),
                subject_id=getattr(lesson, "subject_id", None),
                teacher_id=getattr(lesson, "teacher_id", None),
            )

            db.session.commit()
            logger.info(
                "lesson_broadcast_ended",
                broadcast_id=broadcast.id,
                lesson_id=lesson_id,
                peak_viewers=broadcast.peak_viewers,
            )
            return broadcast, None
        except SQLAlchemyError as e:
            db.session.rollback()
            logger.error("lesson_broadcast_end_error", error=str(e), broadcast_id=broadcast_id)
            return None, str(e)

    @staticmethod
    def pause(broadcast_id, paused_by_user_id=None):
        try:
            broadcast = LessonBroadcast.query.get(broadcast_id)
            if not broadcast:
                return None, "Broadcast not found"

            if broadcast.status not in ("live", "rebroadcasting"):
                return None, f"Cannot pause broadcast in status '{broadcast.status}'"

            lesson_id = broadcast.lesson_id
            LessonBroadcastService._sync_peak_from_store(lesson_id, broadcast)
            broadcast.status = "paused"
            meta = dict(broadcast.broadcast_metadata or {})
            meta["paused_by_user_id"] = paused_by_user_id
            meta["last_paused_at"] = datetime.utcnow().isoformat()
            broadcast.broadcast_metadata = meta

            lesson = Lesson.query.get(lesson_id)
            payload = {
                "broadcast_id": broadcast.id,
                "lesson_id": lesson_id,
                "status": "paused",
                "viewer_count": broadcast.viewer_count,
            }
            broadcast_lesson_event(
                "lesson_live_paused",
                payload,
                lesson_id=lesson_id,
                class_id=getattr(lesson, "class_id", None),
                subject_id=getattr(lesson, "subject_id", None),
                teacher_id=getattr(lesson, "teacher_id", None),
            )

            db.session.commit()
            logger.info(
                "lesson_broadcast_paused",
                broadcast_id=broadcast.id,
                lesson_id=lesson_id,
            )
            return broadcast, None
        except SQLAlchemyError as e:
            db.session.rollback()
            logger.error("lesson_broadcast_pause_error", error=str(e), broadcast_id=broadcast_id)
            return None, str(e)

    @staticmethod
    def resume(broadcast_id, resumed_by_user_id=None):
        try:
            broadcast = LessonBroadcast.query.get(broadcast_id)
            if not broadcast:
                return None, "Broadcast not found"

            if broadcast.status != "paused":
                return None, f"Cannot resume broadcast in status '{broadcast.status}'"

            lesson_id = broadcast.lesson_id
            previous_live_status = "rebroadcasting" if broadcast.is_rebroadcast else "live"
            broadcast.status = previous_live_status

            meta = dict(broadcast.broadcast_metadata or {})
            meta["resumed_by_user_id"] = resumed_by_user_id
            meta["last_resumed_at"] = datetime.utcnow().isoformat()
            if "pause_count" in meta:
                meta["pause_count"] += 1
            else:
                meta["pause_count"] = 1
            broadcast.broadcast_metadata = meta

            lesson = Lesson.query.get(lesson_id)
            payload = {
                "broadcast_id": broadcast.id,
                "lesson_id": lesson_id,
                "status": broadcast.status,
                "resumed_at": datetime.utcnow().isoformat(),
            }
            broadcast_lesson_event(
                "lesson_live_resumed",
                payload,
                lesson_id=lesson_id,
                class_id=getattr(lesson, "class_id", None),
                subject_id=getattr(lesson, "subject_id", None),
                teacher_id=getattr(lesson, "teacher_id", None),
            )

            db.session.commit()
            logger.info(
                "lesson_broadcast_resumed",
                broadcast_id=broadcast.id,
                lesson_id=lesson_id,
            )
            return broadcast, None
        except SQLAlchemyError as e:
            db.session.rollback()
            logger.error("lesson_broadcast_resume_error", error=str(e), broadcast_id=broadcast_id)
            return None, str(e)

    @staticmethod
    def rebroadcast(lesson_id, parent_broadcast_id=None, initiated_by_user_id=None, scheduled_start=None):
        try:
            lesson = Lesson.query.get(lesson_id)
            if not lesson:
                return None, "Lesson not found"

            tenant_id = LessonBroadcastService._get_tenant_id_for_lesson(lesson)
            if not tenant_id:
                return None, "Lesson tenant context missing"

            active = LessonBroadcastService.get_active_broadcast(lesson_id)
            if active:
                return None, "Active broadcast already exists for lesson"

            parent = None
            if parent_broadcast_id:
                parent = LessonBroadcast.query.get(parent_broadcast_id)
                if not parent:
                    return None, "Parent broadcast not found"
                if parent.lesson_id != lesson_id:
                    return None, "Parent broadcast does not belong to lesson"

            lesson_room = f"lesson_{lesson_id}"
            store = _get_viewer_store()
            store.reset_peak(lesson_room)

            rebroadcast = LessonBroadcast(
                lesson_id=lesson_id,
                tenant_id=tenant_id,
                parent_broadcast_id=parent_broadcast_id,
                status="rebroadcasting",
                started_at=datetime.utcnow(),
                scheduled_start=scheduled_start,
                is_rebroadcast=True,
                rebroadcast_count=0,
                peak_viewers=0,
                viewer_count=0,
                broadcast_metadata={
                    "initiated_by_user_id": initiated_by_user_id,
                    "parent_broadcast_id": parent_broadcast_id,
                },
            )
            if parent:
                parent.rebroadcast_count = (parent.rebroadcast_count or 0) + 1

            db.session.add(rebroadcast)
            db.session.flush()

            payload = {
                "broadcast_id": rebroadcast.id,
                "lesson_id": lesson_id,
                "status": "rebroadcasting",
                "started_at": rebroadcast.started_at.isoformat(),
                "parent_broadcast_id": parent_broadcast_id,
                "recording_url": getattr(parent, "recording_url", None),
            }
            broadcast_lesson_event(
                "lesson_live_started",
                payload,
                lesson_id=lesson_id,
                class_id=lesson.class_id,
                subject_id=lesson.subject_id,
                teacher_id=lesson.teacher_id,
            )

            db.session.commit()
            logger.info(
                "lesson_broadcast_rebroadcast_started",
                broadcast_id=rebroadcast.id,
                lesson_id=lesson_id,
                parent_broadcast_id=parent_broadcast_id,
            )
            return rebroadcast, None
        except SQLAlchemyError as e:
            db.session.rollback()
            logger.error(
                "lesson_broadcast_rebroadcast_error",
                error=str(e),
                lesson_id=lesson_id,
                parent_broadcast_id=parent_broadcast_id,
            )
            return None, str(e)
