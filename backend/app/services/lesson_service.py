from datetime import datetime

import structlog
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import joinedload

from app.extensions import db
from app.models.class_ import Class
from app.models.lesson import Lesson
from app.models.lesson_acknowledgement import LessonAcknowledgement
from app.models.lesson_attachment import LessonAttachment
from app.models.teacher import Teacher

logger = structlog.get_logger()


class LessonService:
    """Service for lesson-related operations."""

    @staticmethod
    def resolve_teacher_profile_id(user_id):
        """Resolve the Teacher profile id for the authenticated user id."""
        if user_id is None:
            return None
        teacher = Teacher.query.filter_by(user_id=int(user_id)).first()
        return teacher.id if teacher else None

    @staticmethod
    def get_material_entry(materials, entry_type):
        if not isinstance(materials, list):
            return None

        for item in materials:
            if isinstance(item, dict) and item.get("type") == entry_type:
                return item
        return None

    @staticmethod
    def get_material_value(materials, entry_type, default=""):
        item = LessonService.get_material_entry(materials, entry_type)
        if not item:
            return default
        return item.get("value", default)

    @staticmethod
    def get_lesson_subject(materials):
        item = LessonService.get_material_entry(materials, "subject")
        if not item:
            return {"subject_id": None, "subject_name": "General"}

        try:
            subject_id = (
                int(item.get("subject_id"))
                if item.get("subject_id") is not None
                else None
            )
        except (TypeError, ValueError):
            subject_id = None

        subject_name = item.get("subject_name") or item.get("value") or "General"
        return {"subject_id": subject_id, "subject_name": subject_name}

    @staticmethod
    def extract_material_json_to_columns(lesson):
        """Migrate legacy materials[] entries into dedicated JSON columns.

        Populates objectives, classwork, homework columns from the materials
        list. Keeps materials intact for backward compatibility.
        """
        if not isinstance(getattr(lesson, "materials", None), list):
            return

        materials = lesson.materials

        objectives_entry = LessonService.get_material_entry(materials, "objectives")
        if objectives_entry:
            raw_value = objectives_entry.get("value")
            if raw_value:
                if isinstance(raw_value, list):
                    lesson.objectives = raw_value
                elif isinstance(raw_value, str) and raw_value.strip():
                    lesson.objectives = [raw_value.strip()]
                elif isinstance(raw_value, dict):
                    lesson.objectives = [raw_value]

        classwork_entry = LessonService.get_material_entry(materials, "classwork")
        if classwork_entry:
            raw_value = classwork_entry.get("value")
            if raw_value not in (None, "", {}):
                if isinstance(raw_value, dict):
                    lesson.classwork = raw_value
                else:
                    lesson.classwork = {"content": raw_value}

        homework_entry = LessonService.get_material_entry(materials, "homework")
        if homework_entry:
            raw_value = homework_entry.get("value")
            if raw_value not in (None, "", {}):
                if isinstance(raw_value, dict):
                    lesson.homework = raw_value
                else:
                    lesson.homework = {"content": raw_value}

    @staticmethod
    def _serialize_attachments(lesson):
        attachments = []
        try:
            from app.services.adapters.storage.factory import StorageProviderFactory

            storage = StorageProviderFactory.default()
        except Exception:
            storage = None

        lesson_attachments = (
            getattr(lesson, "attachments", None)
            if hasattr(lesson, "attachments") and not isinstance(getattr(lesson, "attachments", None), list)
            else None
        )
        if lesson_attachments is None:
            if lesson.id:
                lesson_attachments = (
                    LessonAttachment.query.filter_by(lesson_id=lesson.id)
                    .order_by(LessonAttachment.display_order.asc(), LessonAttachment.created_at.asc())
                    .all()
                )
            else:
                lesson_attachments = []

        for att in lesson_attachments:
            entry = {
                "id": att.id,
                "lesson_id": att.lesson_id,
                "filename": att.filename,
                "mime_type": getattr(att, "mime_type", None),
                "size": getattr(att, "size", None),
                "attachment_type": getattr(att, "attachment_type", "file"),
                "display_order": getattr(att, "display_order", 0),
                "uploader_id": getattr(att, "uploader_id", None),
                "storage_key": getattr(att, "storage_key", None),
                "link_url": getattr(att, "link_url", None),
                "created_at": att.created_at.isoformat() if getattr(att, "created_at", None) else None,
            }
            storage_key = getattr(att, "storage_key", None)
            link_url = getattr(att, "link_url", None)
            signed_url = None
            if storage_key and storage:
                try:
                    signed_url = storage.get_signed_url(key=storage_key, expires_in=3600)
                except Exception as exc:
                    logger.debug(
                        "lesson_attachment_signed_url_failed",
                        attachment_id=att.id,
                        error=str(exc),
                    )
            entry["signed_url"] = signed_url or link_url
            attachments.append(entry)
        return attachments

    @staticmethod
    def _get_active_broadcast_summary(lesson_id):
        try:
            from app.services.lesson_broadcast_service import LessonBroadcastService
            from app.websockets.lessons import _get_viewer_store

            broadcast = LessonBroadcastService.get_active_broadcast(lesson_id)
            if not broadcast:
                return None
            lesson_room = f"lesson_{lesson_id}"
            store = _get_viewer_store()
            current_viewers = store.count(lesson_room)
            peak = store.peak(lesson_room)
            if broadcast.peak_viewers and broadcast.peak_viewers > peak:
                peak = broadcast.peak_viewers
            return {
                "broadcast_id": broadcast.id,
                "status": broadcast.status,
                "is_live": broadcast.status in ("live", "rebroadcasting"),
                "is_paused": broadcast.status == "paused",
                "is_rebroadcast": bool(broadcast.is_rebroadcast),
                "started_at": broadcast.started_at.isoformat() if broadcast.started_at else None,
                "viewer_count": current_viewers,
                "peak_viewers": peak,
                "stream_url": getattr(broadcast, "stream_url", None),
                "recording_url": getattr(broadcast, "recording_url", None),
            }
        except Exception as exc:
            logger.debug(
                "lesson_broadcast_summary_failed",
                lesson_id=lesson_id,
                error=str(exc),
            )
            return None

    @staticmethod
    def _get_user_ack_state(lesson_id, user_id):
        if user_id is None or lesson_id is None:
            return {
                "is_seen": False,
                "is_acknowledged": False,
                "seen_at": None,
                "acknowledged_at": None,
            }
        ack = (
            LessonAcknowledgement.query.filter_by(
                lesson_id=lesson_id, user_id=int(user_id)
            )
            .order_by(LessonAcknowledgement.created_at.desc())
            .first()
        )
        if not ack:
            return {
                "is_seen": False,
                "is_acknowledged": False,
                "seen_at": None,
                "acknowledged_at": None,
            }
        return {
            "is_seen": bool(ack.is_seen),
            "is_acknowledged": bool(ack.is_acknowledged),
            "seen_at": ack.seen_at.isoformat() if ack.seen_at else None,
            "acknowledged_at": ack.acknowledged_at.isoformat() if ack.acknowledged_at else None,
            "role": ack.role,
            "note": ack.acknowledgement_note,
        }

    @staticmethod
    def _get_engagement_counts(lesson_id):
        if not lesson_id:
            return {"seen_count": 0, "ack_count": 0}
        seen_count = (
            LessonAcknowledgement.query.filter_by(
                lesson_id=lesson_id, is_seen=True
            ).count()
        )
        ack_count = (
            LessonAcknowledgement.query.filter_by(
                lesson_id=lesson_id, is_acknowledged=True
            ).count()
        )
        return {"seen_count": seen_count, "ack_count": ack_count}

    @staticmethod
    def serialize_lesson(lesson, extra=None, requesting_user_id=None):
        extra = extra or {}

        real_subject_id = getattr(lesson, "subject_id", None)
        subject_name_from_relation = getattr(getattr(lesson, "subject", None), "name", None)

        fallback_used = False
        if real_subject_id is None:
            subject_meta = LessonService.get_lesson_subject(
                getattr(lesson, "materials", None)
            )
            subject_id = subject_meta["subject_id"]
            subject_name = subject_meta["subject_name"]
            fallback_used = True
        else:
            subject_id = real_subject_id
            subject_name = subject_name_from_relation or "Subject"

        teacher = getattr(lesson, "teacher", None)
        teacher_name = ""
        if teacher:
            teacher_name = (
                getattr(teacher, "full_name", None)
                or f"{getattr(teacher, 'first_name', '')} {getattr(teacher, 'last_name', '')}".strip()
            )

        objectives_json = getattr(lesson, "objectives", None)
        classwork_json = getattr(lesson, "classwork", None)
        homework_json = getattr(lesson, "homework", None)

        objectives = objectives_json or LessonService.get_material_value(
            lesson.materials, "objectives"
        )
        classwork = classwork_json or LessonService.get_material_value(
            lesson.materials, "classwork"
        )
        homework = homework_json or LessonService.get_material_value(lesson.materials, "homework")

        engagement = LessonService._get_engagement_counts(lesson.id)

        payload = {
            "id": lesson.id,
            "title": lesson.title,
            "description": lesson.description,
            "date": lesson.date.isoformat() if lesson.date else None,
            "status": lesson.status,
            "materials": lesson.materials or [],
            "class_id": lesson.class_id,
            "class_name": getattr(getattr(lesson, "class_", None), "name", None),
            "teacher_id": lesson.teacher_id,
            "teacher_name": teacher_name or "Teacher",
            "subject_id": subject_id,
            "subject_name": subject_name,
            "subject_id_fallback_used": fallback_used,
            "objectives": objectives,
            "classwork": classwork,
            "homework": homework,
            "notes": LessonService.get_material_value(lesson.materials, "notes"),
            "resources": LessonService.get_material_value(
                lesson.materials, "resources", []
            ),
            "created_at": lesson.created_at.isoformat() if lesson.created_at else None,
            "updated_at": lesson.updated_at.isoformat() if lesson.updated_at else None,
            "attachments": LessonService._serialize_attachments(lesson),
            "broadcast": LessonService._get_active_broadcast_summary(lesson.id),
            "user_ack": LessonService._get_user_ack_state(lesson.id, requesting_user_id),
            "engagement": {
                "seen_count": engagement["seen_count"],
                "ack_count": engagement["ack_count"],
                "engagement_seen_count": getattr(lesson, "engagement_seen_count", engagement["seen_count"]),
                "engagement_ack_count": getattr(lesson, "engagement_ack_count", engagement["ack_count"]),
            },
        }
        payload.update(extra)
        return payload

    @staticmethod
    def get_lessons_by_class(class_id, page=1, per_page=20):
        """Get lessons for a specific class with pagination and optimized query."""
        class_obj = Class.query.get(class_id)
        if not class_obj:
            return None

        return (
            Lesson.query.options(joinedload(Lesson.class_), joinedload(Lesson.teacher))
            .filter_by(class_id=class_id)
            .order_by(Lesson.date.desc())
            .paginate(page=page, per_page=per_page)
        )

    @staticmethod
    def get_lesson_monitoring(
        page=1,
        per_page=50,
        tenant_id=None,
        class_id=None,
        teacher_id=None,
        status=None,
        date_from=None,
        date_to=None,
    ):
        """Get tenant-scoped lesson monitoring data for admin users."""
        query = Lesson.query.options(
            joinedload(Lesson.class_), joinedload(Lesson.teacher)
        ).join(Class, Lesson.class_id == Class.id)

        if tenant_id is not None:
            query = query.filter(Class.tenant_id == tenant_id)
        if class_id is not None:
            query = query.filter(Lesson.class_id == class_id)
        if teacher_id is not None:
            query = query.filter(Lesson.teacher_id == teacher_id)
        if status:
            query = query.filter(Lesson.status == status)
        if date_from is not None:
            query = query.filter(Lesson.date >= date_from)
        if date_to is not None:
            query = query.filter(Lesson.date <= date_to)

        summary_query = query.order_by(None)
        today = datetime.utcnow().date()

        class_scope = Class.query
        if tenant_id is not None:
            class_scope = class_scope.filter(Class.tenant_id == tenant_id)
        if class_id is not None:
            class_scope = class_scope.filter(Class.id == class_id)

        total_classes = class_scope.count()
        classes_logged_today = (
            summary_query.filter(Lesson.date == today)
            .with_entities(Lesson.class_id)
            .distinct()
            .count()
        )

        summary = {
            "total_logs": summary_query.count(),
            "completed_logs": summary_query.filter(
                Lesson.status == "completed"
            ).count(),
            "in_progress_logs": summary_query.filter(
                Lesson.status == "in-progress"
            ).count(),
            "planned_logs": summary_query.filter(Lesson.status == "planned").count(),
            "today_logs": summary_query.filter(Lesson.date == today).count(),
            "classes_covered": summary_query.with_entities(Lesson.class_id)
            .distinct()
            .count(),
            "teachers_reporting": summary_query.filter(Lesson.teacher_id.isnot(None))
            .with_entities(Lesson.teacher_id)
            .distinct()
            .count(),
            "classes_without_logs_today": max(total_classes - classes_logged_today, 0),
        }

        paginated_lessons = summary_query.order_by(
            Lesson.date.desc(), Lesson.created_at.desc()
        ).paginate(page=page, per_page=per_page)
        return paginated_lessons, summary

    @staticmethod
    def get_lesson_by_id(lesson_id):
        """Get a lesson by ID."""
        return Lesson.query.get(lesson_id)

    @staticmethod
    def _increment_engagement_counters(lesson, delta_seen=0, delta_ack=0):
        if delta_seen:
            current_seen = getattr(lesson, "engagement_seen_count", 0) or 0
            lesson.engagement_seen_count = max(0, current_seen + int(delta_seen))
        if delta_ack:
            current_ack = getattr(lesson, "engagement_ack_count", 0) or 0
            lesson.engagement_ack_count = max(0, current_ack + int(delta_ack))

    @staticmethod
    def acknowledge_lesson(lesson_id, user_id, role="student", note=None, mark_seen=True, mark_ack=True):
        """Record lesson acknowledgement using the acknowledgement table as source of truth.

        Increments lesson-level engagement counters only after a successful DB insert
        of the acknowledgement row (so counters never drift from the row-level truth).
        """
        try:
            lesson = Lesson.query.get(lesson_id)
            if not lesson:
                return None, "Lesson not found"

            class_ = getattr(lesson, "class_", None)
            tenant_id = getattr(class_, "tenant_id", None) if class_ else getattr(lesson, "tenant_id", None)
            if not tenant_id:
                return None, "Lesson tenant context missing"

            from sqlalchemy.exc import IntegrityError

            now = datetime.utcnow()
            created_new = False
            prev_seen = False
            prev_ack = False

            try:
                ack = (
                    LessonAcknowledgement.query.filter_by(
                        lesson_id=lesson_id,
                        user_id=int(user_id),
                        role=role,
                        tenant_id=tenant_id,
                    ).first()
                )
                if ack is None:
                    ack = LessonAcknowledgement(
                        lesson_id=lesson_id,
                        user_id=int(user_id),
                        tenant_id=tenant_id,
                        role=role,
                        is_seen=False,
                        is_acknowledged=False,
                    )
                    db.session.add(ack)
                    db.session.flush()
                    created_new = True
                else:
                    prev_seen = bool(ack.is_seen)
                    prev_ack = bool(ack.is_acknowledged)

                delta_seen = 0
                delta_ack = 0
                if mark_seen and not prev_seen:
                    ack.is_seen = True
                    ack.seen_at = now
                    delta_seen = 1
                if mark_ack and not prev_ack:
                    ack.is_acknowledged = True
                    ack.acknowledged_at = now
                    delta_ack = 1
                if note:
                    ack.acknowledgement_note = note

                if delta_seen or delta_ack:
                    LessonService._increment_engagement_counters(
                        lesson, delta_seen=delta_seen, delta_ack=delta_ack
                    )

                db.session.commit()
                return ack, None
            except IntegrityError:
                db.session.rollback()
                ack = (
                    LessonAcknowledgement.query.filter_by(
                        lesson_id=lesson_id,
                        user_id=int(user_id),
                        role=role,
                        tenant_id=tenant_id,
                    ).first()
                )
                if ack is None:
                    raise
                prev_seen = bool(ack.is_seen)
                prev_ack = bool(ack.is_acknowledged)
                delta_seen = 0
                delta_ack = 0
                if mark_seen and not prev_seen:
                    ack.is_seen = True
                    ack.seen_at = now
                    delta_seen = 1
                if mark_ack and not prev_ack:
                    ack.is_acknowledged = True
                    ack.acknowledged_at = now
                    delta_ack = 1
                if note:
                    ack.acknowledgement_note = note
                if delta_seen or delta_ack:
                    LessonService._increment_engagement_counters(
                        lesson, delta_seen=delta_seen, delta_ack=delta_ack
                    )
                db.session.commit()
                return ack, None
        except SQLAlchemyError as e:
            db.session.rollback()
            logger.error(
                "lesson_acknowledge_error",
                error=str(e),
                lesson_id=lesson_id if 'lesson_id' in locals() else None,
                user_id=user_id if 'user_id' in locals() else None,
            )
            return None, str(e)

    @staticmethod
    def create_lesson(lesson_data):
        """Create a new lesson."""
        try:
            class_obj = Class.query.get(lesson_data["class_id"])
            if not class_obj:
                return None, "Class not found"

            new_lesson = Lesson(**lesson_data)
            LessonService.extract_material_json_to_columns(new_lesson)
            db.session.add(new_lesson)
            db.session.flush()
            db.session.commit()

            logger.info(
                "Lesson created", lesson_id=new_lesson.id, class_id=new_lesson.class_id
            )
            return new_lesson, None
        except SQLAlchemyError as e:
            db.session.rollback()
            logger.error("Error creating lesson", error=str(e))
            return None, str(e)

    @staticmethod
    def update_lesson(lesson_id, lesson_data, class_id, teacher_id):
        """Update an existing lesson."""
        try:
            lesson = Lesson.query.get(lesson_id)
            if not lesson:
                return None, "Lesson not found"

            if lesson.class_id != class_id:
                return None, "Lesson does not belong to the specified class"

            if lesson.teacher_id != teacher_id:
                return None, "You don't have permission to update this lesson"

            for key, value in lesson_data.items():
                setattr(lesson, key, value)

            LessonService.extract_material_json_to_columns(lesson)

            lesson.updated_at = datetime.utcnow()
            db.session.commit()

            logger.info("Lesson updated", lesson_id=lesson.id)
            return lesson, None
        except SQLAlchemyError as e:
            db.session.rollback()
            logger.error("Error updating lesson", error=str(e), lesson_id=lesson_id)
            return None, str(e)

    @staticmethod
    def delete_lesson(lesson_id, class_id, teacher_id):
        """Delete a lesson."""
        try:
            lesson = Lesson.query.get(lesson_id)
            if not lesson:
                return False, "Lesson not found"

            if lesson.class_id != class_id:
                return False, "Lesson does not belong to the specified class"

            if lesson.teacher_id != teacher_id:
                return False, "You don't have permission to delete this lesson"

            db.session.delete(lesson)
            db.session.commit()

            logger.info("Lesson deleted", lesson_id=lesson_id)
            return True, None
        except SQLAlchemyError as e:
            db.session.rollback()
            logger.error("Error deleting lesson", error=str(e), lesson_id=lesson_id)
            return False, str(e)
