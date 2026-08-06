import re
from datetime import datetime

import structlog
from sqlalchemy import or_, and_
from sqlalchemy.exc import SQLAlchemyError

from app.extensions import db
from app.models.lesson import Lesson
from app.models.lesson_comment import LessonComment
from app.models.student import Student
from app.models.teacher import Teacher
from app.models.user import User

logger = structlog.get_logger()

_PROFANITY_PATTERNS = [
    re.compile(p, re.IGNORECASE)
    for p in [
        r"\b(damn|hell|crap|shit|fuck|bitch|bastard|ass(hole)?|piss|cock|dick|pussy|twat|cunt)\b",
    ]
]

_PII_PATTERNS = [
    (re.compile(r"\b\d{3}[-.\s]?\d{3}[-.\s]?\d{4}\b"), "[PHONE]"),
    (re.compile(r"\b\d{4}[-.\s]?\d{4}[-.\s]?\d{4}[-.\s]?\d{4}\b"), "[CARD]"),
    (re.compile(r"\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b"), "[EMAIL]"),
    (re.compile(r"\b\d{3}-\d{2}-\d{4}\b"), "[SSN]"),
]


class LessonModerationService:
    """Service for lesson comment moderation, visibility, and audit workflows."""

    @staticmethod
    def _apply_content_filters(content: str) -> tuple[str, list[str]]:
        flags: list[str] = []
        filtered = content
        for pattern in _PROFANITY_PATTERNS:
            if pattern.search(filtered):
                flags.append("profanity")
                filtered = pattern.sub("[REDACTED]", filtered)
        for pattern, replacement in _PII_PATTERNS:
            matches = pattern.findall(filtered)
            if matches:
                flags.append("pii")
                filtered = pattern.sub(replacement, filtered)
        return filtered, flags

    @staticmethod
    def _is_teacher_user(user_id) -> bool:
        if not user_id:
            return False
        t = Teacher.query.filter_by(user_id=int(user_id)).first()
        return t is not None

    @staticmethod
    def _is_student_user(user_id) -> bool:
        if not user_id:
            return False
        s = Student.query.filter_by(user_id=int(user_id)).first()
        return s is not None

    @staticmethod
    def _get_tenant_id_for_lesson(lesson):
        class_ = getattr(lesson, "class_", None)
        if class_:
            return getattr(class_, "tenant_id", None)
        return getattr(lesson, "tenant_id", None)

    @staticmethod
    def create_comment(
        lesson_id,
        author_user_id,
        content,
        visibility=None,
        parent_comment_id=None,
        ip_address=None,
        user_agent=None,
    ):
        try:
            lesson = Lesson.query.get(lesson_id)
            if not lesson:
                return None, "Lesson not found"

            user = User.query.get(author_user_id)
            if not user:
                return None, "Author user not found"

            tenant_id = LessonModerationService._get_tenant_id_for_lesson(lesson)
            if not tenant_id:
                return None, "Lesson tenant context missing"

            is_teacher = LessonModerationService._is_teacher_user(author_user_id)
            is_student = LessonModerationService._is_student_user(author_user_id)

            if visibility is None:
                visibility = "teachers_only" if is_teacher else "class"

            if is_student and visibility in ("private",):
                visibility = "class"
                logger.debug(
                    "lesson_comment_student_visibility_forced",
                    lesson_id=lesson_id,
                    user_id=author_user_id,
                )

            if is_student and visibility not in ("teachers_only", "class", "school_wide"):
                visibility = "class"

            requires_approval = not is_teacher

            filtered_content, flags = LessonModerationService._apply_content_filters(content)
            auto_flagged = bool(flags)
            if auto_flagged and not is_teacher:
                requires_approval = True

            comment = LessonComment(
                lesson_id=lesson_id,
                author_id=author_user_id,
                tenant_id=tenant_id,
                parent_comment_id=parent_comment_id,
                content=filtered_content,
                visibility=visibility,
                requires_approval=requires_approval,
                is_approved=is_teacher and not auto_flagged,
                approved_by_id=author_user_id if (is_teacher and not auto_flagged) else None,
                approved_at=datetime.utcnow() if (is_teacher and not auto_flagged) else None,
                is_deleted=False,
                created_by_ip=ip_address,
                created_by_user_agent=user_agent,
                comment_metadata={
                    "original_content": content if auto_flagged else None,
                    "moderation_flags": flags,
                    "auto_flagged": auto_flagged,
                    "author_role": "teacher" if is_teacher else ("student" if is_student else "other"),
                },
            )

            db.session.add(comment)
            db.session.commit()
            logger.info(
                "lesson_comment_created",
                comment_id=comment.id,
                lesson_id=lesson_id,
                author_id=author_user_id,
                is_approved=comment.is_approved,
                requires_approval=comment.requires_approval,
            )
            return comment, None
        except SQLAlchemyError as e:
            db.session.rollback()
            logger.error(
                "lesson_comment_create_error",
                error=str(e),
                lesson_id=lesson_id,
                author_id=author_user_id if 'author_user_id' in locals() else None,
            )
            return None, str(e)

    @staticmethod
    def approve_comment(comment_id, approver_user_id):
        try:
            comment = LessonComment.query.get(comment_id)
            if not comment:
                return None, "Comment not found"

            if comment.is_deleted:
                return None, "Cannot approve deleted comment"

            is_approver_teacher = LessonModerationService._is_teacher_user(approver_user_id)
            approver = User.query.get(approver_user_id)
            is_admin = bool(approver and approver.role in ("admin", "super_admin"))
            if not (is_approver_teacher or is_admin):
                return None, "Permission denied: only teachers or admins can approve"

            if comment.is_approved:
                return comment, None

            comment.is_approved = True
            comment.approved_by_id = approver_user_id
            comment.approved_at = datetime.utcnow()
            meta = dict(comment.comment_metadata or {})
            meta["approved_by"] = approver_user_id
            meta["approved_at"] = comment.approved_at.isoformat()
            comment.comment_metadata = meta

            db.session.commit()
            logger.info(
                "lesson_comment_approved",
                comment_id=comment.id,
                approver_id=approver_user_id,
            )
            return comment, None
        except SQLAlchemyError as e:
            db.session.rollback()
            logger.error(
                "lesson_comment_approve_error",
                error=str(e),
                comment_id=comment_id,
            )
            return None, str(e)

    @staticmethod
    def soft_delete_comment(comment_id, deleter_user_id, reason=None):
        try:
            comment = LessonComment.query.get(comment_id)
            if not comment:
                return False, "Comment not found"

            if comment.is_deleted:
                return True, None

            is_deleter_teacher = LessonModerationService._is_teacher_user(deleter_user_id)
            deleter = User.query.get(deleter_user_id)
            is_admin = bool(deleter and deleter.role in ("admin", "super_admin"))
            is_author = comment.author_id == int(deleter_user_id)

            if not (is_deleter_teacher or is_admin or is_author):
                return False, "Permission denied"

            comment.is_deleted = True
            comment.deleted_by_id = deleter_user_id
            comment.deleted_at = datetime.utcnow()
            meta = dict(comment.comment_metadata or {})
            meta["deleted_reason"] = reason
            meta["deleted_by_role"] = (
                "admin" if is_admin else ("teacher" if is_deleter_teacher else "self")
            )
            comment.comment_metadata = meta

            db.session.commit()
            logger.info(
                "lesson_comment_soft_deleted",
                comment_id=comment.id,
                deleter_id=deleter_user_id,
                reason=reason,
            )
            return True, None
        except SQLAlchemyError as e:
            db.session.rollback()
            logger.error(
                "lesson_comment_delete_error",
                error=str(e),
                comment_id=comment_id,
            )
            return False, str(e)

    @staticmethod
    def query_visible_comments_for_user(lesson_id, viewer_user_id, page=1, per_page=50):
        if viewer_user_id is None:
            return [], 0

        viewer = User.query.get(viewer_user_id)
        is_teacher = LessonModerationService._is_teacher_user(viewer_user_id)
        is_admin = bool(viewer and viewer.role in ("admin", "super_admin"))
        is_moderator = is_teacher or is_admin

        viewer_is_author_filter = LessonComment.author_id == int(viewer_user_id)

        public_approved_filter = and_(
            LessonComment.is_approved == True,
            LessonComment.is_deleted == False,
            LessonComment.visibility.in_(["class", "school_wide"]),
        )

        teachers_only_filter = and_(
            LessonComment.is_approved == True,
            LessonComment.is_deleted == False,
            LessonComment.visibility == "teachers_only",
        )

        own_private_filter = and_(
            viewer_is_author_filter,
            LessonComment.is_deleted == False,
        )

        base_query = LessonComment.query.filter_by(lesson_id=lesson_id)

        if is_moderator:
            query = base_query.filter(
                or_(
                    public_approved_filter,
                    teachers_only_filter,
                    own_private_filter,
                )
            )
        else:
            query = base_query.filter(
                or_(
                    public_approved_filter,
                    own_private_filter,
                )
            )

        total = query.count()
        comments = (
            query.order_by(LessonComment.created_at.asc())
            .limit(per_page)
            .offset((page - 1) * per_page)
            .all()
        )
        return comments, total
