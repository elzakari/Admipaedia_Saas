from datetime import datetime
from typing import Any, Callable, Dict, Iterable, List, Optional

import structlog

from app.extensions import db
from app.models.class_ import Class
from app.models.dashboard import Notification
from app.models.lesson import Lesson
from app.models.teacher import Teacher
from app.models.user import User
from app.services.notification.adapters.base import (EmailAdapter,
                                                     NotificationAdapter,
                                                     PushAdapter, SMSAdapter)

logger = structlog.get_logger()


class LessonReminderService:

    ADMIN_ROLES = {"admin", "school_admin", "super_admin", "super_manager"}

    @staticmethod
    def _default_adapter_factory(channel: str) -> Optional[NotificationAdapter]:
        mapping = {
            "sms": SMSAdapter,
            "email": EmailAdapter,
            "push": PushAdapter,
        }
        cls = mapping.get(str(channel).lower())
        if cls is None:
            return None
        try:
            return cls()
        except Exception:
            return None

    @staticmethod
    def _resolve_teacher_contact(teacher: Teacher) -> Dict[str, str]:
        email = ""
        phone = ""
        user = getattr(teacher, "user", None)
        if user:
            email = getattr(user, "email", "") or ""
            phone = getattr(user, "phone_number", "") or ""
        if not phone:
            phone = getattr(teacher, "phone_number", "") or ""
        return {
            "email": str(email or "").strip(),
            "phone": str(phone or "").strip(),
            "user_id": getattr(user, "id", None) if user else None,
            "teacher_id": getattr(teacher, "id", None),
        }

    @staticmethod
    def send_teacher_reminder(
        lesson_id: int,
        channels: Iterable[str],
        message: str,
        adapter_factory: Optional[Callable[[str], Optional[NotificationAdapter]]] = None,
    ) -> Dict[str, Any]:
        if not lesson_id:
            return {"success": False, "error": "lesson_id is required", "results": {}}

        lesson = Lesson.query.get(int(lesson_id))
        if not lesson:
            return {"success": False, "error": "Lesson not found", "results": {}}

        teacher_id = getattr(lesson, "teacher_id", None)
        if not teacher_id:
            class_obj = Class.query.get(lesson.class_id)
            teacher_id = getattr(class_obj, "teacher_id", None) if class_obj else None
        if not teacher_id:
            return {"success": False, "error": "No assigned teacher for lesson", "results": {}}

        teacher = Teacher.query.options(db.joinedload(Teacher.user)).get(int(teacher_id))
        if not teacher:
            return {"success": False, "error": "Teacher profile not found", "results": {}}

        contact = LessonReminderService._resolve_teacher_contact(teacher)

        channel_list = [str(c).strip().lower() for c in channels or []]
        if not channel_list:
            channel_list = ["email"]

        factory = adapter_factory or LessonReminderService._default_adapter_factory

        subject = None
        for c in channel_list:
            if c == "email" and subject is None:
                lesson_title = getattr(lesson, "title", "") or f"Lesson #{lesson.id}"
                lesson_date = ""
                if getattr(lesson, "date", None):
                    lesson_date = lesson.date.isoformat()
                subject = f"Reminder: {lesson_title} on {lesson_date}"
                break

        results: Dict[str, str] = {}
        for channel in channel_list:
            adapter = factory(channel)
            if adapter is None:
                results[channel] = "skipped_unknown_adapter"
                continue

            recipient = None
            if channel == "sms":
                recipient = contact.get("phone")
            elif channel == "email":
                recipient = contact.get("email")
            elif channel == "push":
                recipient = f"user:{contact.get('user_id')}" if contact.get("user_id") else None
            else:
                recipient = contact.get("email") or contact.get("phone")

            if not recipient:
                results[channel] = "skipped_no_recipient"
                continue

            send_kwargs: Dict[str, Any] = {}
            if channel == "email" and subject:
                send_kwargs["subject"] = subject

            try:
                ok = adapter.send(recipient, message, **send_kwargs)
                results[channel] = "sent" if bool(ok) else "failed"
            except Exception as exc:
                logger.warning(
                    "teacher_reminder_send_failed",
                    lesson_id=lesson_id,
                    teacher_id=teacher.id,
                    channel=channel,
                    error=str(exc),
                )
                results[channel] = f"error:{str(exc)}"

            try:
                from app.models.notification_log import NotificationLog
                if channel in {"sms", "email"}:
                    class_ = Class.query.get(lesson.class_id)
                    tenant_id = getattr(class_, "tenant_id", None) if class_ else None
                    branch_id = getattr(class_, "branch_id", None) if class_ else None
                    log = NotificationLog(
                        tenant_id=tenant_id,
                        branch_id=branch_id,
                        channel=channel,
                        recipient=recipient,
                        subject=send_kwargs.get("subject") if channel == "email" else None,
                        content=message,
                        status="sent" if results.get(channel) == "sent" else "failed",
                        error_message=None if results.get(channel) == "sent" else results.get(channel),
                    )
                    db.session.add(log)
                    db.session.commit()
            except Exception as log_err:
                db.session.rollback()
                logger.debug("reminder_notification_log_write_failed", error=str(log_err))

        success = any(v == "sent" for v in results.values())
        return {
            "success": success,
            "lesson_id": lesson_id,
            "teacher": {
                "teacher_id": teacher.id,
                "user_id": contact.get("user_id"),
                "name": (
                    getattr(teacher, "full_name", None)
                    or f"{getattr(teacher, 'first_name', '')} {getattr(teacher, 'last_name', '')}".strip()
                ),
            },
            "results": results,
            "sent_at": datetime.utcnow().isoformat(),
        }

    @staticmethod
    def escalate_to_principal(
        lesson_id: int,
        escalation_note: str,
        approver_user_id: int,
        tenant_id: Optional[Any] = None,
    ) -> Dict[str, Any]:
        if not lesson_id:
            return {"success": False, "error": "lesson_id is required", "notified_users": 0}
        if not escalation_note or not str(escalation_note).strip():
            return {"success": False, "error": "escalation_note is required", "notified_users": 0}
        if approver_user_id is None:
            return {"success": False, "error": "approver_user_id is required", "notified_users": 0}

        lesson = Lesson.query.get(int(lesson_id))
        if not lesson:
            return {"success": False, "error": "Lesson not found", "notified_users": 0}

        class_obj = Class.query.get(lesson.class_id)
        if class_obj is None:
            return {"success": False, "error": "Class for lesson not found", "notified_users": 0}

        lesson_tenant_id = tenant_id or getattr(class_obj, "tenant_id", None)

        lesson_title = getattr(lesson, "title", "") or f"Lesson #{lesson.id}"
        lesson_date = getattr(lesson, "date", None)
        lesson_date_str = lesson_date.isoformat() if lesson_date else "TBD"

        approver = User.query.get(int(approver_user_id))
        approver_name = ""
        if approver:
            approver_name = (
                getattr(approver, "full_name", None)
                or getattr(approver, "username", "")
                or f"User #{approver.id}"
            )

        title = f"Escalation: {lesson_title} on {lesson_date_str}"
        class_name = getattr(class_obj, "name", "") or f"Class {lesson.class_id}"
        teacher_name = ""
        teacher_profile = getattr(lesson, "teacher", None)
        if teacher_profile:
            teacher_name = (
                getattr(teacher_profile, "full_name", None)
                or f"{getattr(teacher_profile, 'first_name', '')} {getattr(teacher_profile, 'last_name', '')}".strip()
            )
        message = (
            f"Escalation submitted by {approver_name} (User #{approver_user_id}).\n\n"
            f"Class: {class_name}\n"
            f"Lesson: {lesson_title}\n"
            f"Lesson Date: {lesson_date_str}\n"
            f"Assigned Teacher: {teacher_name or '—'}\n"
            f"Lesson Status: {getattr(lesson, 'status', '') or 'planned'}\n\n"
            f"Escalation Note:\n{escalation_note.strip()}"
        )

        try:
            from app.services.fanout import NotificationFanoutService
            fanout_available = True
        except Exception:
            fanout_available = False

        if fanout_available and class_obj and lesson.class_id:
            try:
                NotificationFanoutService.enqueue_class_fanout(
                    class_id=lesson.class_id,
                    title=title,
                    message=message,
                    notification_type="warning",
                )
            except Exception as fanout_err:
                logger.warning(
                    "lesson_escalation_class_fanout_failed",
                    lesson_id=lesson_id,
                    error=str(fanout_err),
                )

        admin_query = db.session.query(User).filter(User.status == "active")
        if lesson_tenant_id is not None:
            try:
                from app.models.enhanced_user import TenantMembership
                member_rows = (
                    db.session.query(TenantMembership.user_id)
                    .filter(TenantMembership.tenant_id == lesson_tenant_id)
                    .all()
                )
                tenant_user_ids = {r[0] for r in member_rows}
                if tenant_user_ids:
                    admin_query = admin_query.filter(User.id.in_(tenant_user_ids))
            except Exception:
                pass

        admin_rows = admin_query.all()
        targeted_admin_ids: set = set()
        for u in admin_rows:
            role = (getattr(u, "role", "") or "").lower()
            if role in LessonReminderService.ADMIN_ROLES:
                targeted_admin_ids.add(int(u.id))
            try:
                roles_rel = getattr(u, "roles", None) or []
                for r in roles_rel:
                    rname = (getattr(r, "name", "") or getattr(r, "role_name", "") or "").lower()
                    if rname in LessonReminderService.ADMIN_ROLES:
                        targeted_admin_ids.add(int(u.id))
                        break
            except Exception:
                pass

        now = datetime.utcnow()
        notifications = []
        for admin_user_id in targeted_admin_ids:
            notifications.append(
                Notification(
                    title=title,
                    message=message,
                    time=now,
                    read=False,
                    type="warning",
                    user_id=int(approver_user_id),
                    recipient_id=int(admin_user_id),
                    scope="admin",
                )
            )

        try:
            if notifications:
                db.session.add_all(notifications)
                db.session.flush()
                try:
                    from app.extensions import socketio
                    for notif in notifications:
                        try:
                            notif_data = {
                                "id": notif.id,
                                "title": notif.title,
                                "message": notif.message,
                                "time": notif.time.isoformat() if notif.time else notif.created_at.isoformat(),
                                "read": notif.read,
                                "type": notif.type,
                                "priority": "high",
                                "lesson_id": lesson.id,
                                "class_id": lesson.class_id,
                            }
                            socketio.emit(
                                "new_notification",
                                notif_data,
                                room=f"user_{notif.recipient_id}",
                                namespace="/notifications",
                            )
                        except Exception as socket_err:
                            logger.debug(
                                "escalation_socket_emit_failed",
                                user_id=notif.recipient_id,
                                error=str(socket_err),
                            )
                except Exception as import_err:
                    logger.debug("socketio_not_available_for_escalation", error=str(import_err))
            db.session.commit()
        except Exception as db_err:
            db.session.rollback()
            logger.error(
                "lesson_escalation_db_commit_failed",
                lesson_id=lesson_id,
                error=str(db_err),
            )
            return {"success": False, "error": f"DB commit failed: {db_err}", "notified_users": 0}

        return {
            "success": True,
            "lesson_id": lesson_id,
            "class_id": lesson.class_id,
            "approver_user_id": int(approver_user_id),
            "notified_users": len(targeted_admin_ids),
            "admin_user_ids": sorted(targeted_admin_ids),
            "notification_title": title,
            "sent_at": now.isoformat(),
        }
