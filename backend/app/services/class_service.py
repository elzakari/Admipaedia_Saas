from datetime import datetime

import structlog
from sqlalchemy.exc import SQLAlchemyError

from app.extensions import db
from app.models.class_ import Class
from app.models.teacher import Teacher
from app.schemas.class_ import ClassSchema
from app.services.cache_service import get_cache_service

logger = structlog.get_logger()
cache_service = get_cache_service()
class_schema = ClassSchema()


class ClassService:
    """Service for class-related operations."""

    @staticmethod
    def _resolve_scope(tenant_id=None, branch_id=None):
        """Resolve (tenant_id, branch_id) from params or g context, preserving explicit None semantics."""
        from flask import g, has_app_context

        if has_app_context():
            if tenant_id is None:
                tenant_id = getattr(g, "tenant_id", None)
            if branch_id is None:
                branch_id = getattr(g, "branch_id", None)
        return tenant_id, branch_id

    @staticmethod
    def _apply_scope(query, cls, tenant_id, branch_id):
        """Apply OR-NULL scope filters on a Class/related query using resolved context values."""
        import uuid

        if tenant_id is not None and hasattr(cls, "tenant_id"):
            if isinstance(tenant_id, str):
                try:
                    tenant_id = uuid.UUID(tenant_id)
                except (ValueError, AttributeError, TypeError):
                    pass
            col = cls.tenant_id
            query = query.filter((col == tenant_id) | (col.is_(None)))
        if branch_id is not None and hasattr(cls, "branch_id"):
            if isinstance(branch_id, str):
                try:
                    branch_id = uuid.UUID(branch_id)
                except (ValueError, AttributeError, TypeError):
                    pass
            col = cls.branch_id
            query = query.filter((col == branch_id) | (col.is_(None)))
        return query

    @staticmethod
    def _coerce_age(value):
        """Coerce age_min/age_max payloads into optional ints (empty string / None stay None)."""
        if value is None:
            return None
        if isinstance(value, (int, float)):
            return int(value) if value == value else None  # NaN guard
        s = str(value).strip()
        if not s:
            return None
        try:
            return int(float(s))
        except (ValueError, TypeError):
            return None

    @staticmethod
    def _resolve_grade_level_payload(payload, tenant_id=None):
        """Normalize grade_level + educational_level_id inputs so they are safe for the Class model.

        Accepted inputs for ``grade_level`` (comes from UI dropdowns):
          * UUID str (36 chars or shortened): settings/academic Grade Levels use UUIDs.
          * Stringified integer: treated as EducationalLevel integer PK.
          * Short legacy name/code: written as-is to legacy column if nothing else matches.

        The Class table has:
          - ``grade_level``: String(20) (legacy, NOT NULL).
          - ``educational_level_id``: Integer FK to educational_levels.id (nullable).

        This helper NEVER writes a UUID verbatim into the 20-char legacy column. It tries
        to look up the matching EducationalLevel (by int id first, then name/code), falls
        back to a truncated/slugified legacy string, and always populates
        ``educational_level_id`` when a concrete match is found.
        """
        import re

        raw_grade = payload.get("grade_level")
        educational_level_id = payload.get("educational_level_id")

        # Avoid mutating caller dict
        payload = dict(payload)

        # First, resolve an EducationalLevel row if we possibly can
        EducationalLevel = None
        try:
            from app.models.educational_level import EducationalLevel as _EL
            EducationalLevel = _EL
        except Exception:  # noqa: BLE001
            EducationalLevel = None

        resolved_edu = None

        # Path 1: explicit integer FK sent
        if educational_level_id not in (None, ""):
            try:
                edu_pk = int(educational_level_id)
                if EducationalLevel is not None:
                    resolved_edu = EducationalLevel.query.get(edu_pk)
            except (ValueError, TypeError):
                pass

        # Path 2: grade_level is a stringified integer PK
        if resolved_edu is None and isinstance(raw_grade, str) and raw_grade.isdigit():
            try:
                edu_pk = int(raw_grade)
                if EducationalLevel is not None:
                    resolved_edu = EducationalLevel.query.get(edu_pk)
            except (ValueError, TypeError):
                pass

        # Path 3: grade_level looks like a UUID or long identifier -> try to match name/code
        if resolved_edu is None and isinstance(raw_grade, str) and EducationalLevel is not None:
            s = raw_grade.strip()
            if len(s) > 0:
                # Try name or code exact match (case-insensitive)
                resolved_edu = (
                    EducationalLevel.query.filter(
                        db.or_(
                            db.func.lower(EducationalLevel.level_name) == s.lower(),
                            db.func.lower(EducationalLevel.level_code) == s.lower(),
                        )
                    ).first()
                )
                # If still not found and it looks UUID-ish, try to strip dashes and
                # match on a potential legacy uuid_code column; if none, keep None.
                if resolved_edu is None and re.fullmatch(r"[0-9a-fA-F\-]{8,64}", s):
                    # Last-ditch: slugify first 3 words of "name" from any known record
                    # with similar length/structure - otherwise leave edu null.
                    resolved_edu = None

        # Now decide final legacy grade_level text (must fit in db.String(20)):
        if resolved_edu is not None:
            primary_text = resolved_edu.level_code or resolved_edu.level_name
            payload["educational_level_id"] = resolved_edu.id
        else:
            # Caller sent something we can't map to EducationalLevel row. Use the raw
            # value but make sure it's <= 20 chars.
            primary_text = str(raw_grade).strip() if raw_grade is not None else ""
            # keep educational_level_id from payload (explicit) or None
            payload["educational_level_id"] = educational_level_id if educational_level_id not in (
                None,
                "",
            ) else None

        # Truncate legacy text to 20 chars exactly to avoid DB String(20) error
        if primary_text:
            payload["grade_level"] = primary_text[:20]
        elif raw_grade:
            payload["grade_level"] = str(raw_grade)[:20]
        else:
            payload["grade_level"] = ""

        # If educational_level_id ended up as empty string / non-int, null it.
        el_id = payload.get("educational_level_id")
        if el_id in (None, ""):
            payload["educational_level_id"] = None
        else:
            try:
                payload["educational_level_id"] = int(el_id)
            except (ValueError, TypeError):
                payload["educational_level_id"] = None

        return payload

    @staticmethod
    def get_all_classes(
        page=1, per_page=20, grade_level=None, academic_year=None, tenant_id=None, branch_id=None
    ):
        """Get all classes with optional filtering and pagination, optimized for N+1 queries."""
        from sqlalchemy.orm import joinedload

        tenant_id, branch_id = ClassService._resolve_scope(tenant_id, branch_id)
        query = Class.query.options(
            joinedload(Class.teacher), joinedload(Class.educational_level)
        )
        query = ClassService._apply_scope(query, Class, tenant_id, branch_id)

        if grade_level:
            query = query.filter(Class.grade_level == grade_level)

        if academic_year:
            query = query.filter(Class.academic_year == academic_year)

        return query.order_by(Class.name).paginate(page=page, per_page=per_page)

    @staticmethod
    def get_class_by_id(class_id, tenant_id=None, branch_id=None):
        """Get a class by ID (IDOR-safe: scoped to tenant + branch)."""
        tenant_id, branch_id = ClassService._resolve_scope(tenant_id, branch_id)
        try:
            class_id_int = int(class_id)
        except (ValueError, TypeError):
            return None
        query = Class.query.filter(Class.id == class_id_int)
        query = ClassService._apply_scope(query, Class, tenant_id, branch_id)
        obj = query.first()
        if obj:
            # Tolerance check — explicit context mismatch still rejects
            if tenant_id is not None and getattr(obj, "tenant_id", None) is not None and obj.tenant_id != tenant_id:
                return None
            if branch_id is not None and getattr(obj, "branch_id", None) is not None and obj.branch_id != branch_id:
                return None
            key = f"class:dto:{class_id_int}"
            cache_service.set(key, class_schema.dump(obj), ttl=cache_service.LONG_TTL)
        return obj

    @staticmethod
    def get_class_dto(class_id, tenant_id=None, branch_id=None):
        """Get a class DTO (dict) by ID, using cache if available."""
        try:
            class_id_int = int(class_id)
        except (ValueError, TypeError):
            return None
        key = f"class:dto:{class_id_int}"
        dto = cache_service.get(key)
        if dto:
            return dto
        obj = ClassService.get_class_by_id(class_id_int, tenant_id=tenant_id, branch_id=branch_id)
        if obj:
            dto = class_schema.dump(obj)
            cache_service.set(key, dto, ttl=cache_service.LONG_TTL)
            return dto
        return None

    @staticmethod
    def get_classes_by_teacher_id(teacher_id, page=1, per_page=20, tenant_id=None, branch_id=None):
        """Get classes by teacher ID with optimized query."""
        from sqlalchemy.orm import joinedload

        tenant_id, branch_id = ClassService._resolve_scope(tenant_id, branch_id)
        query = Class.query.options(
            joinedload(Class.teacher), joinedload(Class.educational_level)
        ).filter_by(teacher_id=teacher_id)
        query = ClassService._apply_scope(query, Class, tenant_id, branch_id)
        return query.paginate(page=page, per_page=per_page)

    @staticmethod
    def create_class(class_data, tenant_id=None, branch_id=None):
        """Create a new class (scoped; writes tenant+branch context; accepts age_min/age_max)."""
        from flask import g, has_app_context

        try:
            tenant_id, branch_id = ClassService._resolve_scope(tenant_id, branch_id)
            # Check if teacher exists if teacher_id is provided
            if "teacher_id" in class_data and class_data["teacher_id"]:
                teacher_id = class_data["teacher_id"]
                if str(teacher_id).lower() == "none":
                    teacher_id = None
                if teacher_id:
                    teacher = Teacher.query.get(teacher_id)
                    if not teacher:
                        return None, "Teacher not found"
                    if (
                        tenant_id is not None
                        and hasattr(teacher, "tenant_id")
                        and teacher.tenant_id != tenant_id
                    ):
                        return None, "Teacher not found"

            payload = dict(class_data)

            # Teacher_id "none" sentinel → actual NULL
            if "teacher_id" in payload:
                t_val = payload.get("teacher_id")
                if t_val is None or str(t_val).lower() in {"none", "", "unassigned"}:
                    payload["teacher_id"] = None

            # Resolve grade_level (UUID / legacy name / integer PK) → safe legacy column + FK
            if "grade_level" in payload or "educational_level_id" in payload:
                payload = ClassService._resolve_grade_level_payload(payload, tenant_id=tenant_id)

            # Coerce age_min/age_max → int or None
            if "age_min" in payload:
                payload["age_min"] = ClassService._coerce_age(payload["age_min"])
            if "age_max" in payload:
                payload["age_max"] = ClassService._coerce_age(payload["age_max"])

            if (
                tenant_id is not None
                and "tenant_id" not in payload
                and hasattr(Class, "tenant_id")
            ):
                payload["tenant_id"] = tenant_id
            if has_app_context():
                if hasattr(Class, "tenant_id") and "tenant_id" not in payload:
                    ctx_t = getattr(g, "tenant_id", None)
                    if ctx_t is not None:
                        payload["tenant_id"] = ctx_t
                if hasattr(Class, "branch_id") and "branch_id" not in payload:
                    ctx_b = getattr(g, "branch_id", None)
                    if ctx_b is not None:
                        payload["branch_id"] = ctx_b

            new_class = Class(**payload)
            db.session.add(new_class)
            db.session.commit()
            cache_service.delete(f"class:dto:{new_class.id}")

            logger.info("Class created", class_id=new_class.id, name=new_class.name, age_min=new_class.age_min, age_max=new_class.age_max)
            return new_class, None
        except SQLAlchemyError as e:
            db.session.rollback()
            logger.error("Error creating class", error=str(e))
            return None, str(e)

    @staticmethod
    def update_class(class_id, class_data, tenant_id=None, branch_id=None):
        """Update an existing class (scoped lookup; age_min/age_max coerced)."""
        from flask import g, has_app_context

        try:
            tenant_id, branch_id = ClassService._resolve_scope(tenant_id, branch_id)
            class_obj = ClassService.get_class_by_id(class_id, tenant_id=tenant_id, branch_id=branch_id)
            if not class_obj:
                return None, "Class not found"

            # Check if teacher exists if teacher_id is provided
            if "teacher_id" in class_data and class_data["teacher_id"]:
                teacher_id = class_data["teacher_id"]
                if str(teacher_id).lower() == "none":
                    teacher_id = None
                if teacher_id:
                    teacher = Teacher.query.get(teacher_id)
                    if not teacher:
                        return None, "Teacher not found"
                    if (
                        tenant_id is not None
                        and hasattr(teacher, "tenant_id")
                        and teacher.tenant_id != tenant_id
                    ):
                        return None, "Teacher not found"

            payload = dict(class_data)
            if "teacher_id" in payload:
                t_val = payload.get("teacher_id")
                if t_val is None or str(t_val).lower() in {"none", "", "unassigned"}:
                    payload["teacher_id"] = None
            if "grade_level" in payload or "educational_level_id" in payload:
                payload = ClassService._resolve_grade_level_payload(payload, tenant_id=tenant_id)
            if "age_min" in payload:
                payload["age_min"] = ClassService._coerce_age(payload["age_min"])
            if "age_max" in payload:
                payload["age_max"] = ClassService._coerce_age(payload["age_max"])

            for key, value in payload.items():
                setattr(class_obj, key, value)

            class_obj.updated_at = datetime.utcnow()
            db.session.commit()
            cache_service.delete(f"class:dto:{class_id}")

            logger.info("Class updated", class_id=class_obj.id, age_min=class_obj.age_min, age_max=class_obj.age_max)
            return class_obj, None
        except SQLAlchemyError as e:
            db.session.rollback()
            logger.error("Error updating class", error=str(e), class_id=class_id)
            return None, str(e)

    @staticmethod
    def delete_class(class_id, force=False):
        """Delete a class."""
        try:
            class_obj = Class.query.get(class_id)
            if not class_obj:
                return False, "Class not found"

            # Log the class details before deletion
            logger.info(
                "Attempting to delete class",
                class_id=class_id,
                class_name=class_obj.name,
                grade_level=class_obj.grade_level,
            )

            # Check for related records that might prevent deletion
            from app.models.assignment import Assignment
            from app.models.attendance import Attendance
            from app.models.exam import Exam
            from app.models.grade import Grade
            from app.models.student import Student

            # Count related records
            student_count = Student.query.filter_by(class_id=class_id).count()
            attendance_count = Attendance.query.filter_by(class_id=class_id).count()
            exam_count = Exam.query.filter_by(class_id=class_id).count()
            assignment_count = Assignment.query.filter_by(class_id=class_id).count()
            grade_count = Grade.query.filter_by(class_id=class_id).count()

            # If there are related records and not forcing deletion, provide a detailed error message
            if (
                student_count > 0
                or attendance_count > 0
                or exam_count > 0
                or assignment_count > 0
                or grade_count > 0
            ) and not force:
                related_records = []
                if student_count > 0:
                    related_records.append(f"{student_count} student(s)")
                if attendance_count > 0:
                    related_records.append(f"{attendance_count} attendance record(s)")
                if exam_count > 0:
                    related_records.append(f"{exam_count} exam(s)")
                if assignment_count > 0:
                    related_records.append(f"{assignment_count} assignment(s)")
                if grade_count > 0:
                    related_records.append(f"{grade_count} grade(s)")

                return (
                    False,
                    f"Cannot delete class '{class_obj.name}' because it has related records: {', '.join(related_records)}. Deleting this class will permanently remove all associated data. If you're sure you want to proceed, use force delete.",
                )

            # If force delete, handle related records appropriately
            if force:
                # Set student class_id to NULL instead of deleting students
                if student_count > 0:
                    Student.query.filter_by(class_id=class_id).update(
                        {"class_id": None}
                    )
                    logger.info(
                        f"Unassigned {student_count} students from class {class_id}"
                    )

                # Delete related records that should be removed with the class
                if attendance_count > 0:
                    Attendance.query.filter_by(class_id=class_id).delete()
                    logger.info(
                        f"Deleted {attendance_count} attendance records for class {class_id}"
                    )

                if exam_count > 0:
                    # First delete grades associated with these exams
                    exam_ids = [
                        exam.id
                        for exam in Exam.query.filter_by(class_id=class_id).all()
                    ]
                    for exam_id in exam_ids:
                        Grade.query.filter_by(exam_id=exam_id).delete()
                    Exam.query.filter_by(class_id=class_id).delete()
                    logger.info(
                        f"Deleted {exam_count} exams and their grades for class {class_id}"
                    )

                if assignment_count > 0:
                    Assignment.query.filter_by(class_id=class_id).delete()
                    logger.info(
                        f"Deleted {assignment_count} assignments for class {class_id}"
                    )

                if grade_count > 0:
                    Grade.query.filter_by(class_id=class_id).delete()
                    logger.info(f"Deleted {grade_count} grades for class {class_id}")

            db.session.delete(class_obj)
            db.session.commit()
            cache_service.delete(f"class:dto:{class_id}")

            logger.info("Class deleted successfully", class_id=class_id)
            return True, None
        except SQLAlchemyError as e:
            db.session.rollback()
            error_msg = str(e)
            logger.error(
                "Error deleting class",
                error=error_msg,
                class_id=class_id,
                error_type=type(e).__name__,
            )

            # Provide more specific error messages
            if (
                "foreign key constraint" in error_msg.lower()
                or "not null violation" in error_msg.lower()
            ):
                return (
                    False,
                    f"Cannot delete class: it has related records that must be removed first. This class is still referenced by other records in the system.",
                )
            elif "does not exist" in error_msg.lower():
                return False, f"Class or related constraint not found: {error_msg}"
            else:
                return False, f"Database error: {error_msg}"

    @staticmethod
    def assign_teacher(class_id, teacher_id):
        """Assign a teacher to a class."""
        try:
            class_obj = Class.query.get(class_id)
            if not class_obj:
                return None, "Class not found"

            teacher = Teacher.query.get(teacher_id)
            if not teacher:
                return None, "Teacher not found"

            # Legacy pointer write
            class_obj.teacher_id = teacher_id
            class_obj.updated_at = datetime.utcnow()

            # Idempotent ClassTeacherMapping write
            from app.models.class_ import ClassTeacherMapping

            existing = ClassTeacherMapping.query.filter_by(
                class_id=class_id, teacher_id=teacher.user_id
            ).first()

            if not existing:
                mapping = ClassTeacherMapping(
                    class_id=class_id, teacher_id=teacher.user_id
                )
                db.session.add(mapping)

            db.session.commit()

            logger.info(
                "Teacher assigned to class (twin-write completed)",
                class_id=class_obj.id,
                teacher_id=teacher_id,
            )
            return class_obj, None
        except SQLAlchemyError as e:
            db.session.rollback()
            logger.error(
                "Error assigning teacher to class", error=str(e), class_id=class_id
            )
            return None, str(e)

    @staticmethod
    def unassign_teacher(class_id, teacher_id):
        """Unassign a teacher from a class."""
        try:
            class_obj = Class.query.get(class_id)
            if not class_obj:
                return False, "Class not found"

            teacher = Teacher.query.get(teacher_id)
            if not teacher:
                return False, "Teacher not found"

            # Legacy pointer revert
            if class_obj.teacher_id == teacher_id:
                class_obj.teacher_id = None
                class_obj.updated_at = datetime.utcnow()

            # Delete ClassTeacherMapping entries
            from app.models.class_ import ClassTeacherMapping

            ClassTeacherMapping.query.filter_by(
                class_id=class_id, teacher_id=teacher.user_id
            ).delete()

            db.session.commit()

            logger.info(
                "Teacher unassigned from class (twin-write sweep completed)",
                class_id=class_obj.id,
                teacher_id=teacher_id,
            )
            return True, None
        except SQLAlchemyError as e:
            db.session.rollback()
            logger.error(
                "Error unassigning teacher from class", error=str(e), class_id=class_id
            )
            return False, str(e)
