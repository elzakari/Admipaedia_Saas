from datetime import datetime

import structlog
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import joinedload

from app.extensions import db
from app.models.class_ import Class
from app.models.lesson import Lesson
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
    def serialize_lesson(lesson, extra=None):
        extra = extra or {}
        subject_meta = LessonService.get_lesson_subject(
            getattr(lesson, "materials", None)
        )
        teacher = getattr(lesson, "teacher", None)
        teacher_name = ""
        if teacher:
            teacher_name = (
                getattr(teacher, "full_name", None)
                or f"{getattr(teacher, 'first_name', '')} {getattr(teacher, 'last_name', '')}".strip()
            )

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
            "subject_id": subject_meta["subject_id"],
            "subject_name": subject_meta["subject_name"],
            "objectives": LessonService.get_material_value(
                lesson.materials, "objectives"
            ),
            "classwork": LessonService.get_material_value(
                lesson.materials, "classwork"
            ),
            "homework": LessonService.get_material_value(lesson.materials, "homework"),
            "notes": LessonService.get_material_value(lesson.materials, "notes"),
            "resources": LessonService.get_material_value(
                lesson.materials, "resources", []
            ),
            "created_at": lesson.created_at.isoformat() if lesson.created_at else None,
            "updated_at": lesson.updated_at.isoformat() if lesson.updated_at else None,
        }
        payload.update(extra)
        return payload

    @staticmethod
    def get_lessons_by_class(class_id, page=1, per_page=20):
        """Get lessons for a specific class with pagination and optimized query."""
        # Check if class exists
        class_obj = Class.query.get(class_id)
        if not class_obj:
            return None

        # Use joinedload to prevent N+1 queries when accessing related data
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
    def create_lesson(lesson_data):
        """Create a new lesson."""
        try:
            # Check if class exists
            class_obj = Class.query.get(lesson_data["class_id"])
            if not class_obj:
                return None, "Class not found"

            new_lesson = Lesson(**lesson_data)
            db.session.add(new_lesson)
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

            # Verify the lesson belongs to the specified class
            if lesson.class_id != class_id:
                return None, "Lesson does not belong to the specified class"

            # Verify the teacher has permission to update this lesson
            if lesson.teacher_id != teacher_id:
                return None, "You don't have permission to update this lesson"

            for key, value in lesson_data.items():
                setattr(lesson, key, value)

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

            # Verify the lesson belongs to the specified class
            if lesson.class_id != class_id:
                return False, "Lesson does not belong to the specified class"

            # Verify the teacher has permission to delete this lesson
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
