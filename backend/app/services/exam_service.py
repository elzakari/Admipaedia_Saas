from datetime import datetime, timezone

from sqlalchemy import and_

from app.extensions import db
from app.models.class_ import Class
from app.models.exam import Exam
from app.models.subject import Subject
from app.schemas.exam import ExamSchema
from app.services.cache_service import get_cache_service

cache_service = get_cache_service()
exam_schema = ExamSchema()


def normalize_exam_datetime(value):
    """Normalize exam datetimes to naive UTC values for DB storage and comparisons."""
    if value is None or value == "":
        return None

    if isinstance(value, datetime):
        dt = value
    else:
        raw = str(value).strip()
        if not raw:
            return None
        normalized = raw.replace("Z", "+00:00")
        try:
            dt = datetime.fromisoformat(normalized)
        except ValueError:
            dt = datetime.strptime(raw[:10], "%Y-%m-%d")

    if dt.tzinfo is not None:
        return dt.astimezone(timezone.utc).replace(tzinfo=None)
    return dt


class ExamService:
    @staticmethod
    def _apply_exam_scope(query, tenant_id=None, branch_id=None):
        """
        Apply authoritative Exam ownership through its parent Class.

        Exam intentionally has no tenant_id or branch_id columns.
        Tenant/branch ownership is therefore inherited from Class.

        Class.tenant_id is mandatory and must match exactly.
        When an active branch is present, Class.branch_id must also
        match exactly. No OR-NULL compatibility is admitted here.
        """
        if tenant_id is None:
            return query.filter(db.false())

        query = query.join(
            Class,
            Exam.class_id == Class.id,
        ).filter(
            Class.tenant_id == tenant_id,
        )

        if branch_id is not None:
            query = query.filter(
                Class.branch_id == branch_id,
            )

        return query

    @staticmethod
    def _get_scoped_exam(exam_id, tenant_id=None, branch_id=None):
        from sqlalchemy.orm import joinedload

        query = Exam.query.options(
            joinedload(Exam.class_),
            joinedload(Exam.subject),
            joinedload(Exam.creator),
        ).filter(
            Exam.id == exam_id,
        )

        query = ExamService._apply_exam_scope(
            query,
            tenant_id=tenant_id,
            branch_id=branch_id,
        )

        return query.first()

    @staticmethod
    def _load_exam_model(exam_id):
        from sqlalchemy.orm import joinedload

        return Exam.query.options(
            joinedload(Exam.class_), joinedload(Exam.subject), joinedload(Exam.creator)
        ).get(exam_id)

    @staticmethod
    def get_all_exams(
        page,
        per_page,
        class_id=None,
        subject_id=None,
        date_from=None,
        date_to=None,
        status=None,
        tenant_id=None,
        branch_id=None,
        allowed_class_ids=None,
    ):
        """Get all exams with optional filtering and resource scope."""
        from sqlalchemy.orm import joinedload

        query = Exam.query.options(
            joinedload(Exam.class_),
            joinedload(Exam.subject),
            joinedload(Exam.creator),
        )

        query = ExamService._apply_exam_scope(
            query,
            tenant_id=tenant_id,
            branch_id=branch_id,
        )

        # Apply caller-specific resource scope BEFORE pagination.
        # This prevents both row disclosure and pagination metadata leaks.
        if allowed_class_ids is not None:
            allowed_class_ids = set(allowed_class_ids)

            if not allowed_class_ids:
                query = query.filter(db.false())
            else:
                query = query.filter(
                    Exam.class_id.in_(allowed_class_ids)
                )

        # Apply filters if provided
        if class_id:
            query = query.filter(Exam.class_id == class_id)
        if subject_id:
            query = query.filter(Exam.subject_id == subject_id)
        if date_from:
            query = query.filter(Exam.exam_date >= date_from)
        if date_to:
            query = query.filter(Exam.exam_date <= date_to)
        if status:
            query = query.filter(Exam.status == status)

        # Order by exam date (upcoming exams first)
        query = query.order_by(Exam.exam_date.asc())

        # Paginate results
        return query.paginate(page=page, per_page=per_page, error_out=False)

    @staticmethod
    def get_exam_by_id(exam_id):
        """Get a specific exam by ID."""
        from flask import g

        current_tenant_id = getattr(g, "tenant_id", None)
        current_branch_id = getattr(g, "branch_id", None)

        exam = ExamService._get_scoped_exam(
            exam_id,
            tenant_id=current_tenant_id,
            branch_id=current_branch_id,
        )

        if not exam:
            return None

        cache_key = f"exam:dto:{exam_id}"
        cached_exam = cache_service.get(cache_key)
        if not cached_exam:
            cache_service.set(
                cache_key, exam_schema.dump(exam), ttl=cache_service.SHORT_TTL
            )

        return exam

    @staticmethod
    def create_exam(data):
        """Create a new exam."""
        from flask import g

        try:
            db.session.rollback()
        except Exception:
            pass
        current_tenant_id = getattr(g, "tenant_id", None)
        current_branch_id = getattr(g, "branch_id", None)

        if current_tenant_id is None:
            return None, "Tenant context required"

        class_query = Class.query.filter(
            Class.id == data["class_id"],
            Class.tenant_id == current_tenant_id,
        )

        if current_branch_id is not None:
            class_query = class_query.filter(
                Class.branch_id == current_branch_id,
            )

        class_obj = class_query.first()

        if not class_obj:
            return None, "Class not found"

        subject_obj = Subject.query.filter(
            Subject.id == data["subject_id"],
            Subject.tenant_id == current_tenant_id,
        ).first()

        if not subject_obj:
            return None, "Subject not found"

        exam_date = normalize_exam_datetime(data.get("exam_date"))
        if exam_date is None:
            return None, "exam_date is required"

        # Create new exam
        exam = Exam(
            title=data["title"],
            description=data.get("description"),
            exam_date=exam_date,
            duration=data["duration"],
            total_marks=data["total_marks"],
            passing_marks=data["passing_marks"],
            class_id=data["class_id"],
            subject_id=data["subject_id"],
            created_by=data["created_by"],
            status=data.get("status", "scheduled"),
            assessment_type=data.get("assessment_type"),
        )

        try:
            db.session.add(exam)
            db.session.commit()
            cache_service.delete(f"exam:dto:{exam.id}")
            return exam, None
        except Exception as e:
            db.session.rollback()
            return None, str(e)

    @staticmethod
    def update_exam(exam_id, data):
        """Update an existing exam."""
        from flask import g

        current_tenant_id = getattr(g, "tenant_id", None)
        current_branch_id = getattr(g, "branch_id", None)

        exam = ExamService._get_scoped_exam(
            exam_id,
            tenant_id=current_tenant_id,
            branch_id=current_branch_id,
        )

        if not exam:
            return None, "Exam not found"

        if exam.status == "completed":
            return None, "Cannot update a completed exam"

        # Update fields if provided
        if "title" in data:
            exam.title = data["title"]
        if "description" in data:
            exam.description = data["description"]
        if "exam_date" in data:
            exam.exam_date = normalize_exam_datetime(data["exam_date"])
        if "duration" in data:
            exam.duration = data["duration"]
        if "total_marks" in data:
            exam.total_marks = data["total_marks"]
        if "passing_marks" in data:
            exam.passing_marks = data["passing_marks"]
        if "status" in data:
            exam.status = data["status"]
        if "assessment_type" in data:
            exam.assessment_type = data["assessment_type"]

        try:
            db.session.commit()
            cache_service.delete(f"exam:dto:{exam_id}")
            return exam, None
        except Exception as e:
            db.session.rollback()
            return None, str(e)

    @staticmethod
    def delete_exam(exam_id, force=False):
        """Delete an exam."""
        from flask import g

        current_tenant_id = getattr(g, "tenant_id", None)
        current_branch_id = getattr(g, "branch_id", None)

        exam = ExamService._get_scoped_exam(
            exam_id,
            tenant_id=current_tenant_id,
            branch_id=current_branch_id,
        )

        if not exam:
            return False, "Exam not found"

        from app.models.grade import Grade

        grade_count = Grade.query.filter_by(exam_id=exam_id).count()

        # Don't allow deletion of completed exams with grades unless forced
        if exam.status == "completed" and grade_count > 0 and not force:
            return (
                False,
                f"Cannot delete completed exam '{exam.title}' because it has {grade_count} grade(s) associated with it. Deleting this exam will permanently remove all associated grades. If you're sure you want to proceed, use force delete.",
            )

        try:
            # If force delete, remove associated grades first
            if force and grade_count > 0:
                Grade.query.filter_by(exam_id=exam_id).delete()

            db.session.delete(exam)
            db.session.commit()
            cache_service.delete(f"exam:dto:{exam_id}")
            return True, None
        except Exception as e:
            db.session.rollback()
            return False, str(e)

    @staticmethod
    def get_upcoming_exams(
        class_id=None,
        days=7,
        tenant_id=None,
        branch_id=None,
        allowed_class_ids=None,
    ):
        """Get upcoming exams within the specified number of days.

        Returns list of Exam ORM rows (NOT pre-dumped dicts) so route handlers
        can perform marshmallow serialization exactly once.  This avoids the
        double-dump bug (DTO dicts dumped again via ExamSchema → DateTime
        serializer crashes because it receives a string, not a datetime).
        """
        from datetime import timedelta

        from sqlalchemy.orm import joinedload

        # Caller-specific class scopes must never share the coarse
        # tenant/branch/class cache entry. Bypass cache for scoped reads.
        use_cache = allowed_class_ids is None
        cache_key = (
            f"upcoming_exams:raw:t{tenant_id}:b{branch_id}:"
            f"class_{class_id}:days_{days}"
        )

        if use_cache:
            try:
                cached_rows = cache_service.get(cache_key)
            except Exception:
                cached_rows = None
        else:
            cached_rows = None

        now = datetime.now()
        end_date = now + timedelta(days=days)

        query = Exam.query.options(
            joinedload(Exam.class_), joinedload(Exam.subject), joinedload(Exam.creator)
        )

        # Exam does not carry tenant/branch ownership directly.
        # Class is the authoritative ownership-bearing parent.
        #
        # Join explicitly so tenant and branch isolation cannot be skipped
        # merely because Exam itself has no tenant_id / branch_id columns.
        from app.models.class_ import Class

        query = query.join(Class, Exam.class_id == Class.id)

        if tenant_id is not None:
            query = query.filter(Class.tenant_id == tenant_id)

        if branch_id is not None:
            query = query.filter(Class.branch_id == branch_id)

        query = query.filter(
            and_(
                Exam.exam_date >= now,
                Exam.exam_date <= end_date,
                Exam.status == "scheduled",
            )
        )

        if allowed_class_ids is not None:
            allowed_class_ids = set(allowed_class_ids)

            if not allowed_class_ids:
                query = query.filter(db.false())
            else:
                query = query.filter(
                    Exam.class_id.in_(allowed_class_ids)
                )

        if class_id:
            query = query.filter(Exam.class_id == class_id)

        if cached_rows and isinstance(cached_rows, list) and all(
            getattr(e, "__table__", None) is not None for e in cached_rows
        ):
            exams = cached_rows
        else:
            exams = query.order_by(Exam.exam_date.asc()).all()
            if use_cache:
                try:
                    cache_service.set(
                        cache_key,
                        exams,
                        ttl=cache_service.SHORT_TTL,
                    )
                except Exception:
                    pass

        return exams

    @staticmethod
    def get_exam_schedule(class_id=None, subject_id=None, date_from=None, date_to=None):
        """Get exam schedule with filtering options."""
        query = Exam.query

        if class_id:
            query = query.filter(Exam.class_id == class_id)

        if subject_id:
            query = query.filter(Exam.subject_id == subject_id)

        if date_from:
            query = query.filter(Exam.exam_date >= date_from)

        if date_to:
            query = query.filter(Exam.exam_date <= date_to)

        return query.order_by(Exam.exam_date).all()

    def check_exam_conflicts(
        class_id,
        exam_date,
        duration,
        exclude_exam_id=None,
        tenant_id=None,
        branch_id=None,
    ):
        """
        Return schedule conflicts only after proving the requested
        Class belongs to the active tenant/branch.

        Exam itself has no tenant ownership columns; Class is the
        authoritative ownership anchor.
        """
        from flask import g

        tenant_id = (
            tenant_id
            if tenant_id is not None
            else getattr(g, "tenant_id", None)
        )

        branch_id = (
            branch_id
            if branch_id is not None
            else getattr(g, "branch_id", None)
        )

        if tenant_id is None:
            return []

        class_query = Class.query.without_tenant_filter().filter(
            Class.id == class_id,
            Class.tenant_id == tenant_id,
        )

        if branch_id is not None:
            class_query = class_query.filter(
                Class.branch_id == branch_id
            )

        authorized_class = class_query.first()

        if authorized_class is None:
            return []

        end_time = exam_date + timedelta(
            minutes=duration
        )

        query = Exam.query.filter(
            Exam.class_id == authorized_class.id,
        )

        if exclude_exam_id is not None:
            query = query.filter(
                Exam.id != exclude_exam_id
            )

        conflicts = []

        for exam in query.all():
            exam_end = exam.exam_date + timedelta(
                minutes=exam.duration
            )

            if (
                exam.exam_date < end_time
                and exam_end > exam_date
            ):
                conflicts.append(exam)

        return conflicts
