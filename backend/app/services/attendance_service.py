from datetime import date, datetime

import structlog
from sqlalchemy import and_, func
from sqlalchemy.exc import SQLAlchemyError

from app.extensions import db
from app.models.attendance import Attendance
from app.models.class_ import Class
from app.models.student import Student
from app.models.subject import Subject
from app.schemas.attendance import AttendanceSchema
from app.services.cache_service import get_cache_service

logger = structlog.get_logger()
cache_service = get_cache_service()
attendance_schema = AttendanceSchema()


class AttendanceService:
    """Service for attendance-related operations."""

    @staticmethod
    def _validate_subject_context(class_, subject_id):
        """Validate optional subject context without making it part of daily uniqueness."""
        if not subject_id:
            return None, None

        subject = Subject.query.get(subject_id)
        if not subject:
            return None, "Subject not found"

        if getattr(class_, "tenant_id", None) and getattr(subject, "tenant_id", None):
            if getattr(class_, "tenant_id", None) != getattr(
                subject, "tenant_id", None
            ):
                return None, "Subject is outside the selected class tenant context"

        return subject, None

    @staticmethod
    def get_all_attendances(
        page=1,
        per_page=20,
        class_id=None,
        student_id=None,
        subject_id=None,
        date_from=None,
        date_to=None,
        status=None,
    ):
        """Get all attendances with optional filtering and pagination."""
        from sqlalchemy.orm import joinedload

        query = Attendance.query.options(
            joinedload(Attendance.student).joinedload(Student.user),
            joinedload(Attendance.class_),
            joinedload(Attendance.subject),
        )

        if class_id:
            query = query.filter(Attendance.class_id == class_id)

        if student_id:
            query = query.filter(Attendance.student_id == student_id)

        if subject_id:
            query = query.filter(Attendance.subject_id == subject_id)

        if date_from:
            query = query.filter(Attendance.date >= date_from)

        if date_to:
            query = query.filter(Attendance.date <= date_to)

        if status:
            query = query.filter(Attendance.status == status)

        return query.order_by(Attendance.date.desc(), Attendance.student_id).paginate(
            page=page, per_page=per_page
        )

    @staticmethod
    def get_attendance_by_id(attendance_id):
        """Get an attendance record by ID."""
        from sqlalchemy.orm import joinedload

        # Try to get DTO from cache first
        cache_key = f"attendance:dto:{attendance_id}"
        cached_attendance = cache_service.get(cache_key)
        if cached_attendance:
            return cached_attendance

        # If not in cache, query database
        attendance = Attendance.query.options(
            joinedload(Attendance.student).joinedload(Student.user),
            joinedload(Attendance.class_),
            joinedload(Attendance.subject),
        ).get(attendance_id)

        # Cache the result if found (as DTO)
        if attendance:
            cache_service.set(
                cache_key,
                attendance_schema.dump(attendance),
                ttl=cache_service.SHORT_TTL,
            )

        return attendance

    @staticmethod
    def get_attendance_by_student_date(
        student_id, date_val, class_id=None, subject_id=None
    ):
        """Get the canonical daily attendance record for a student."""
        from sqlalchemy.orm import joinedload

        query = Attendance.query.options(
            joinedload(Attendance.student).joinedload(Student.user),
            joinedload(Attendance.class_),
            joinedload(Attendance.subject),
        ).filter(Attendance.student_id == student_id, Attendance.date == date_val)

        if class_id:
            query = query.filter(Attendance.class_id == class_id)

        return query.first()

    @staticmethod
    def _get_authorized_daily_attendance_unscoped(
        student_id,
        class_id,
        date_val,
    ):
        """Resolve one already-authorized canonical daily attendance row.

        SECURITY CONTRACT:
        The caller MUST first establish the authoritative Class and Student
        ownership graph for the active tenant/branch.

        Attendance itself has no tenant_id and historical rows may have
        branch_id=NULL. The global ORM before_compile scope would therefore
        hide such a row even though the database uniqueness contract still
        identifies it by (student_id, class_id, date).

        This narrowly bypasses automatic tenant/branch query scoping only
        after parent-resource authorization. It MUST NOT be used for arbitrary
        attendance reads or discovery.
        """
        return (
            Attendance.query
            .without_tenant_filter()
            .filter(
                Attendance.student_id == student_id,
                Attendance.class_id == class_id,
                Attendance.date == date_val,
            )
            .first()
        )

    @staticmethod
    @staticmethod
    def _attendance_scope_query(
        tenant_id,
        branch_id=None,
    ):
        """Authoritative Attendance ownership via Student + Class."""
        if tenant_id is None:
            return None

        query = (
            Attendance.query
            .without_tenant_filter()
            .join(
                Student,
                Student.id == Attendance.student_id,
            )
            .join(
                Class,
                Class.id == Attendance.class_id,
            )
            .filter(
                Student.tenant_id == tenant_id,
                Class.tenant_id == tenant_id,
                Student.class_id == Class.id,
            )
        )

        if branch_id is not None:
            query = query.filter(
                Student.branch_id == branch_id,
                Class.branch_id == branch_id,
            )

        return query


    @staticmethod
    def get_attendance_by_id_scoped(
        attendance_id,
        tenant_id,
        branch_id=None,
    ):
        query = AttendanceService._attendance_scope_query(
            tenant_id,
            branch_id,
        )

        if query is None:
            return None

        return query.filter(
            Attendance.id == attendance_id
        ).first()


    @staticmethod
    def get_all_attendances_scoped(
        tenant_id,
        branch_id=None,
        page=1,
        per_page=20,
        class_id=None,
        student_id=None,
        subject_id=None,
        date_from=None,
        date_to=None,
        status=None,
    ):
        query = AttendanceService._attendance_scope_query(
            tenant_id,
            branch_id,
        )

        if query is None:
            query = Attendance.query.filter(
                db.false()
            )

        if class_id:
            query = query.filter(
                Attendance.class_id == class_id
            )

        if student_id:
            query = query.filter(
                Attendance.student_id == student_id
            )

        if subject_id:
            query = query.filter(
                Attendance.subject_id == subject_id
            )

        if date_from:
            query = query.filter(
                Attendance.date >= date_from
            )

        if date_to:
            query = query.filter(
                Attendance.date <= date_to
            )

        if status:
            query = query.filter(
                Attendance.status == status
            )

        return query.order_by(
            Attendance.date.desc(),
            Attendance.id.desc(),
        ).paginate(
            page=page,
            per_page=per_page,
            error_out=False,
        )


    @staticmethod
    def create_attendance_scoped(
        attendance_data,
        tenant_id,
        branch_id=None,
    ):
        """Create only after exact authoritative parent proof."""
        try:
            if tenant_id is None:
                return None, "Tenant context required"

            student_query = (
                Student.query
                .without_tenant_filter()
                .filter(
                    Student.id
                    == attendance_data["student_id"],
                    Student.tenant_id == tenant_id,
                )
            )

            class_query = (
                Class.query
                .without_tenant_filter()
                .filter(
                    Class.id
                    == attendance_data["class_id"],
                    Class.tenant_id == tenant_id,
                )
            )

            if branch_id is not None:
                student_query = student_query.filter(
                    Student.branch_id == branch_id
                )
                class_query = class_query.filter(
                    Class.branch_id == branch_id
                )

            student = student_query.first()
            class_ = class_query.first()

            if not student:
                return None, "Student not found"

            if not class_:
                return None, "Class not found"

            if student.class_id != class_.id:
                return (
                    None,
                    "Student is not assigned to the selected class",
                )

            subject_id = attendance_data.get(
                "subject_id"
            )

            if subject_id is not None:
                subject = (
                    Subject.query
                    .without_tenant_filter()
                    .filter(
                        Subject.id == subject_id,
                        Subject.tenant_id == tenant_id,
                    )
                    .first()
                )

                if not subject:
                    return None, "Subject not found"

            # Class branch is authoritative.
            attendance_data["branch_id"] = class_.branch_id

            existing = (
                Attendance.query
                .without_tenant_filter()
                .filter(
                    Attendance.student_id == student.id,
                    Attendance.class_id == class_.id,
                    Attendance.date
                    == attendance_data["date"],
                )
                .first()
            )

            if existing:
                return (
                    None,
                    "Attendance record already exists "
                    "for this student on this date",
                )

            attendance = Attendance(
                **attendance_data
            )

            db.session.add(attendance)
            db.session.commit()

            cache_service.delete(
                f"attendance:dto:{attendance.id}"
            )

            logger.info(
                "Attendance created",
                attendance_id=attendance.id,
                student_id=attendance.student_id,
            )

            return attendance, None

        except SQLAlchemyError as exc:
            db.session.rollback()

            logger.error(
                "Error creating attendance",
                error=str(exc),
            )

            return None, str(exc)


    @staticmethod
    def update_attendance_scoped(
        attendance_id,
        attendance_data,
        tenant_id,
        branch_id=None,
    ):
        try:
            attendance = (
                AttendanceService.get_attendance_by_id_scoped(
                    attendance_id,
                    tenant_id,
                    branch_id,
                )
            )

            if not attendance:
                return None, "Attendance record not found"

            # Update schema is expected to expose only mutable
            # fields. Ownership identifiers are never reassigned.
            protected = {
                "id",
                "student_id",
                "class_id",
                "subject_id",
                "branch_id",
            }

            for key, value in attendance_data.items():
                if key not in protected:
                    setattr(
                        attendance,
                        key,
                        value,
                    )

            attendance.updated_at = datetime.utcnow()

            db.session.commit()

            cache_service.delete(
                f"attendance:dto:{attendance_id}"
            )

            logger.info(
                "Attendance updated",
                attendance_id=attendance.id,
            )

            return attendance, None

        except SQLAlchemyError as exc:
            db.session.rollback()

            logger.error(
                "Error updating attendance",
                error=str(exc),
                attendance_id=attendance_id,
            )

            return None, str(exc)


    @staticmethod
    def delete_attendance_scoped(
        attendance_id,
        tenant_id,
        branch_id=None,
    ):
        try:
            attendance = (
                AttendanceService.get_attendance_by_id_scoped(
                    attendance_id,
                    tenant_id,
                    branch_id,
                )
            )

            if not attendance:
                return False, "Attendance record not found"

            db.session.delete(attendance)
            db.session.commit()

            cache_service.delete(
                f"attendance:dto:{attendance_id}"
            )

            logger.info(
                "Attendance deleted",
                attendance_id=attendance_id,
            )

            return True, None

        except SQLAlchemyError as exc:
            db.session.rollback()

            logger.error(
                "Error deleting attendance",
                error=str(exc),
                attendance_id=attendance_id,
            )

            return False, str(exc)

    def create_attendance(attendance_data):
        """Create a new attendance record."""
        try:
            # Check if student exists
            student = Student.query.get(attendance_data["student_id"])
            if not student:
                return None, "Student not found"

            # Check if class exists
            class_ = Class.query.get(attendance_data["class_id"])
            if not class_:
                return None, "Class not found"
            if getattr(student, "class_id", None) != getattr(class_, "id", None):
                return None, "Student is not assigned to the selected class"

            _, subject_error = AttendanceService._validate_subject_context(
                class_, attendance_data.get("subject_id")
            )
            if subject_error:
                return None, subject_error

            # Check if attendance record already exists for this student on this date
            existing = AttendanceService.get_attendance_by_student_date(
                attendance_data["student_id"],
                attendance_data["date"],
                attendance_data.get("class_id"),
            )

            if existing:
                return (
                    None,
                    "Attendance record already exists for this student on this date",
                )

            new_attendance = Attendance(**attendance_data)
            db.session.add(new_attendance)
            db.session.commit()

            # Use the ID from the committed object
            attendance_id = new_attendance.id
            cache_service.delete(f"attendance:dto:{attendance_id}")

            logger.info(
                "Attendance created",
                attendance_id=attendance_id,
                student_id=new_attendance.student_id,
            )
            return new_attendance, None
        except SQLAlchemyError as e:
            db.session.rollback()
            logger.error("Error creating attendance", error=str(e))
            return None, str(e)

    @staticmethod
    def update_attendance(attendance_id, attendance_data):
        """Update an existing attendance record."""
        try:
            attendance = Attendance.query.get(attendance_id)
            if not attendance:
                return None, "Attendance record not found"

            for key, value in attendance_data.items():
                setattr(attendance, key, value)

            attendance.updated_at = datetime.utcnow()
            db.session.commit()
            cache_service.delete(f"attendance:dto:{attendance_id}")

            logger.info("Attendance updated", attendance_id=attendance.id)
            return attendance, None
        except SQLAlchemyError as e:
            db.session.rollback()
            logger.error(
                "Error updating attendance", error=str(e), attendance_id=attendance_id
            )
            return None, str(e)

    @staticmethod
    def delete_attendance(attendance_id):
        """Delete an attendance record."""
        try:
            attendance = Attendance.query.get(attendance_id)
            if not attendance:
                return False, "Attendance record not found"

            db.session.delete(attendance)
            db.session.commit()
            cache_service.delete(f"attendance:dto:{attendance_id}")

            logger.info("Attendance deleted", attendance_id=attendance_id)
            return True, None
        except SQLAlchemyError as e:
            db.session.rollback()
            logger.error(
                "Error deleting attendance", error=str(e), attendance_id=attendance_id
            )
            return False, str(e)

    @staticmethod
    def bulk_create_attendance(
        bulk_data,
        tenant_id=None,
        branch_id=None,
    ):
        """Create or update attendance inside an explicit tenant/branch scope."""
        try:
            # Writes must never infer tenant ownership from arbitrary resource
            # IDs or rely only on automatic ORM request filtering.
            if tenant_id is None:
                return None, "Tenant context is required"

            # Class is the authoritative parent for attendance ownership.
            class_q = (
                Class.query
                .without_tenant_filter()
                .filter(
                    Class.id == bulk_data["class_id"],
                    Class.tenant_id == tenant_id,
                )
            )

            if branch_id is not None and hasattr(Class, "branch_id"):
                class_q = class_q.filter(Class.branch_id == branch_id)

            class_ = class_q.first()
            if not class_:
                return None, "Class not found in current tenant/branch scope"

            subject_id = bulk_data.get("subject_id")

            # Subject is optional for daily attendance identity, but when
            # supplied it must be an exact tenant-owned resource.
            if subject_id is not None:
                subject = (
                    Subject.query
                    .without_tenant_filter()
                    .filter(
                        Subject.id == subject_id,
                        Subject.tenant_id == tenant_id,
                    )
                    .first()
                )
                if not subject:
                    return None, "Subject not found in current tenant"

            created_attendances = []
            for attendance_item in bulk_data["attendances"]:
                # Create a complete attendance record
                attendance_data = {
                    "student_id": attendance_item["student_id"],
                    "class_id": bulk_data["class_id"],
                    "subject_id": subject_id,
                    "date": bulk_data["date"],
                    "status": attendance_item["status"],
                    "remarks": attendance_item.get("remarks"),
                    "recorded_by": bulk_data.get("recorded_by"),
                }

                # Student must belong to this tenant and this exact class.
                # When an active branch exists, the student must also belong
                # to that branch. Invalid rows preserve historical bulk
                # skip semantics rather than aborting unrelated valid rows.
                student_q = (
                    Student.query
                    .without_tenant_filter()
                    .filter(
                        Student.id == attendance_data["student_id"],
                        Student.tenant_id == tenant_id,
                        Student.class_id == class_.id,
                    )
                )

                if branch_id is not None and hasattr(Student, "branch_id"):
                    student_q = student_q.filter(Student.branch_id == branch_id)

                student = student_q.first()
                if not student:
                    continue

                # The Class and Student above are authoritative parent
                # resources already resolved inside the active request scope.
                #
                # Attendance identity is canonical once per
                # student + class + date. Historical records may legitimately
                # predate branch_id population and therefore carry NULL.
                # Automatic branch scoping hides those rows, but the database
                # uniqueness constraint still sees them. Resolve the identity
                # narrowly outside automatic scoping only after the parent
                # ownership checks have succeeded.
                existing = (
                    AttendanceService._get_authorized_daily_attendance_unscoped(
                        attendance_data["student_id"],
                        attendance_data["class_id"],
                        attendance_data["date"],
                    )
                )

                if existing:
                    # Progressive repair for historical attendance rows.
                    # Class is the authoritative branch-bearing parent.
                    # Never copy a caller-supplied arbitrary branch value.
                    authoritative_branch_id = getattr(class_, "branch_id", None)

                    if hasattr(existing, "branch_id"):
                        if (
                            existing.branch_id is not None
                            and authoritative_branch_id is not None
                            and existing.branch_id != authoritative_branch_id
                        ):
                            db.session.rollback()
                            return (
                                None,
                                "Attendance branch conflicts with authoritative class branch",
                            )

                        if (
                            existing.branch_id is None
                            and authoritative_branch_id is not None
                        ):
                            existing.branch_id = authoritative_branch_id

                    # Update existing record instead of creating a new one
                    for key, value in attendance_data.items():
                        if key not in ["student_id", "class_id", "subject_id", "date"]:
                            setattr(existing, key, value)
                    if not existing.subject_id and attendance_data.get("subject_id"):
                        existing.subject_id = attendance_data["subject_id"]
                    existing.updated_at = datetime.utcnow()
                    created_attendances.append(existing)
                else:
                    # Create a new row from validated resources. Branch
                    # ownership is derived from the authoritative Class,
                    # never from client input.
                    new_attendance = Attendance(**attendance_data)

                    authoritative_branch_id = getattr(class_, "branch_id", None)
                    if (
                        hasattr(new_attendance, "branch_id")
                        and authoritative_branch_id is not None
                    ):
                        new_attendance.branch_id = authoritative_branch_id

                    db.session.add(new_attendance)
                    created_attendances.append(new_attendance)

            db.session.commit()
            # Invalidate related cached aggregates
            cache_service.delete_pattern("student:dto:*")
            cache_service.delete_pattern("class:dto:*")

            logger.info("Bulk attendance created", count=len(created_attendances))
            return created_attendances, None
        except SQLAlchemyError as e:
            db.session.rollback()
            logger.error("Error creating bulk attendance", error=str(e))
            return None, str(e)

    @staticmethod
    def get_attendance_stats(
        class_id=None,
        student_id=None,
        date_from=None,
        date_to=None,
        tenant_id=None,
        branch_id=None,
    ):
        """Tenant/branch-authorized attendance statistics."""
        try:
            scope = AttendanceService._attendance_scope_query(
                tenant_id,
                branch_id,
            )

            if scope is None:
                return None, "Tenant context required"

            scoped_ids = scope.with_entities(
                Attendance.id
            ).subquery()

            query = (
                db.session.query(
                    Attendance.status,
                    func.count(
                        Attendance.id
                    ).label("count"),
                )
                .join(
                    scoped_ids,
                    scoped_ids.c.id == Attendance.id,
                )
            )

            if class_id:
                query = query.filter(
                    Attendance.class_id == class_id
                )

            if student_id:
                query = query.filter(
                    Attendance.student_id == student_id
                )

            if date_from:
                query = query.filter(
                    Attendance.date >= date_from
                )

            if date_to:
                query = query.filter(
                    Attendance.date <= date_to
                )

            rows = query.group_by(
                Attendance.status
            ).all()

            result = {
                "total": sum(
                    row.count for row in rows
                ),
                "present": 0,
                "absent": 0,
                "late": 0,
                "excused": 0,
            }

            for row in rows:
                result[row.status] = row.count

            total = result["total"]

            for key in (
                "present",
                "absent",
                "late",
                "excused",
            ):
                result[f"{key}_percentage"] = (
                    result[key] / total * 100
                    if total
                    else 0
                )

            return result, None

        except SQLAlchemyError as exc:
            logger.error(
                "Error getting attendance stats",
                error=str(exc),
            )
            return None, str(exc)




    @staticmethod
    def get_student_attendance_report(
        student_id,
        date_from=None,
        date_to=None,
        class_id=None,
        subject_id=None,
        tenant_id=None,
        branch_id=None,
    ):
        """Generate a tenant/branch-safe attendance report for one student.

        Resource authorization is anchored first through the exact tenant-owned
        Student.

        A Student with no assigned Class legitimately has an empty attendance
        report. Class ownership becomes mandatory only before Attendance rows
        can be admitted.

        Historical Attendance.branch_id=NULL rows remain readable only after
        their authoritative Student and Class parents are both proven to belong
        to the exact active tenant/branch.
        """
        try:
            if tenant_id is None:
                return None, "Tenant context is required"

            from sqlalchemy import or_
            from app.models.class_ import Class as ClassModel
            from app.models.subject import Subject as SubjectModel

            # --------------------------------------------------------------
            # 1. Authoritative Student ownership
            # --------------------------------------------------------------
            student_query = (
                Student.query
                .without_tenant_filter()
                .filter(
                    Student.id == student_id,
                    Student.tenant_id == tenant_id,
                )
            )

            if branch_id is not None:
                student_query = student_query.filter(
                    Student.branch_id == branch_id
                )

            student = student_query.first()

            if student is None:
                return (
                    None,
                    "Student not found in current tenant/branch scope",
                )

            # --------------------------------------------------------------
            # 2. Explicit class filter may never override Student ownership.
            #
            # If class_id is supplied, it must be the Student's authoritative
            # class. This prevents an arbitrary tenant-owned Class from being
            # used as provenance for another Student.
            # --------------------------------------------------------------
            if class_id is not None:
                if (
                    student.class_id is None
                    or int(class_id) != int(student.class_id)
                ):
                    return (
                        None,
                        "Class not found in current tenant/branch scope",
                    )

            effective_class_id = student.class_id

            # --------------------------------------------------------------
            # 3. Optional Subject ownership can be validated independently.
            # --------------------------------------------------------------
            if subject_id is not None:
                subject = (
                    SubjectModel.query
                    .without_tenant_filter()
                    .filter(
                        SubjectModel.id == subject_id,
                        SubjectModel.tenant_id == tenant_id,
                    )
                    .first()
                )

                if subject is None:
                    return None, "Subject not found in current tenant"

            # --------------------------------------------------------------
            # 4. Student has no Class.
            #
            # This is a valid resource state, not a bad request. Since there
            # is no authoritative Class parent, NO Attendance query is made
            # and therefore no historical NULL-branch Attendance can enter.
            # --------------------------------------------------------------
            if effective_class_id is None:
                report = {
                    "student_id": student.id,
                    "period": {
                        "date_from": (
                            date_from.isoformat()
                            if date_from is not None
                            else None
                        ),
                        "date_to": (
                            date_to.isoformat()
                            if date_to is not None
                            else None
                        ),
                    },
                    "summary": {
                        "total_days": 0,
                        "present_days": 0,
                        "absent_days": 0,
                        "late_days": 0,
                        "excused_days": 0,
                        "attendance_rate": 0.0,
                    },
                    "monthly_trends": [],
                    "records": [],
                }

                return report, None

            # --------------------------------------------------------------
            # 5. Authoritative Class ownership
            # --------------------------------------------------------------
            class_query = (
                ClassModel.query
                .without_tenant_filter()
                .filter(
                    ClassModel.id == effective_class_id,
                    ClassModel.tenant_id == tenant_id,
                )
            )

            if branch_id is not None:
                class_query = class_query.filter(
                    ClassModel.branch_id == branch_id
                )

            class_obj = class_query.first()

            if class_obj is None:
                return (
                    None,
                    "Class not found in current tenant/branch scope",
                )

            # --------------------------------------------------------------
            # 6. Attendance read.
            #
            # The ambient branch filter is bypassed only after exact Student
            # and Class ownership above has been established.
            #
            # Historical branch_id=NULL is admitted only through those
            # authoritative parents.
            # --------------------------------------------------------------
            query = (
                Attendance.query
                .without_tenant_filter()
                .filter(
                    Attendance.student_id == student.id,
                    Attendance.class_id == class_obj.id,
                )
            )

            if branch_id is not None:
                query = query.filter(
                    or_(
                        Attendance.branch_id == branch_id,
                        Attendance.branch_id.is_(None),
                    )
                )

            if subject_id is not None:
                query = query.filter(
                    Attendance.subject_id == subject_id
                )

            if date_from is not None:
                query = query.filter(
                    Attendance.date >= date_from
                )

            if date_to is not None:
                query = query.filter(
                    Attendance.date <= date_to
                )

            records = (
                query
                .order_by(Attendance.date.asc())
                .all()
            )

            total_days = len(records)

            present_days = sum(
                1
                for row in records
                if row.status == "present"
            )

            absent_days = sum(
                1
                for row in records
                if row.status == "absent"
            )

            late_days = sum(
                1
                for row in records
                if row.status == "late"
            )

            excused_days = sum(
                1
                for row in records
                if row.status == "excused"
            )

            attended_days = (
                present_days
                + late_days
            )

            attendance_rate = (
                round(
                    (attended_days / total_days) * 100,
                    2,
                )
                if total_days
                else 0.0
            )

            monthly = {}

            for row in records:
                month_key = row.date.strftime("%Y-%m")

                if month_key not in monthly:
                    monthly[month_key] = {
                        "total_days": 0,
                        "present_days": 0,
                        "absent_days": 0,
                        "late_days": 0,
                        "excused_days": 0,
                    }

                bucket = monthly[month_key]

                bucket["total_days"] += 1

                if row.status == "present":
                    bucket["present_days"] += 1

                elif row.status == "absent":
                    bucket["absent_days"] += 1

                elif row.status == "late":
                    bucket["late_days"] += 1

                elif row.status == "excused":
                    bucket["excused_days"] += 1

            monthly_trends = []

            for month_key in sorted(monthly):
                bucket = monthly[month_key]

                attended = (
                    bucket["present_days"]
                    + bucket["late_days"]
                )

                bucket["attendance_rate"] = (
                    round(
                        (
                            attended
                            / bucket["total_days"]
                        )
                        * 100,
                        2,
                    )
                    if bucket["total_days"]
                    else 0.0
                )

                monthly_trends.append(
                    {
                        "month": month_key,
                        **bucket,
                    }
                )

            report = {
                "student_id": student.id,
                "period": {
                    "date_from": (
                        date_from.isoformat()
                        if date_from is not None
                        else None
                    ),
                    "date_to": (
                        date_to.isoformat()
                        if date_to is not None
                        else None
                    ),
                },
                "summary": {
                    "total_days": total_days,
                    "present_days": present_days,
                    "absent_days": absent_days,
                    "late_days": late_days,
                    "excused_days": excused_days,
                    "attendance_rate": attendance_rate,
                },
                "monthly_trends": monthly_trends,
                "records": [
                    {
                        "id": row.id,
                        "student_id": row.student_id,
                        "class_id": row.class_id,
                        "subject_id": row.subject_id,
                        "branch_id": (
                            str(row.branch_id)
                            if row.branch_id is not None
                            else None
                        ),
                        "date": row.date.isoformat(),
                        "status": row.status,
                        "remarks": row.remarks,
                        "recorded_by": row.recorded_by,
                    }
                    for row in records
                ],
            }

            return report, None

        except Exception as exc:
            logger.exception(
                "Error generating student attendance report: %s",
                exc,
            )

            return (
                None,
                "Failed to generate attendance report",
            )



    @staticmethod
    @staticmethod
    def bulk_mark_attendance(
        class_id,
        date,
        attendances,
        recorded_by=None,
        tenant_id=None,
        branch_id=None,
    ):
        """
        Legacy bulk-mark compatibility wrapper.

        Attendance writes have one canonical implementation:
        bulk_create_attendance(). This wrapper preserves the legacy
        service signature and response contract while delegating all
        tenant, branch, resource, identity, and historical-row handling
        to that certified implementation.
        """
        try:
            if not class_id:
                return None, "Class ID is required"

            if not date:
                return None, "Date is required"

            if not attendances or not isinstance(attendances, list):
                return None, "Attendances must be a non-empty list"

            if isinstance(date, str):
                try:
                    date = datetime.strptime(
                        date,
                        "%Y-%m-%d",
                    ).date()
                except ValueError:
                    return None, "Invalid date format. Use YYYY-MM-DD"

            if tenant_id is None:
                return None, "Tenant context is required"

            # Preserve legacy skip semantics for malformed rows before
            # entering the canonical writer. Valid rows are passed
            # through unchanged.
            normalized_attendances = []

            for item in attendances:
                if not isinstance(item, dict):
                    continue

                if not item.get("student_id") or not item.get("status"):
                    continue

                normalized_attendances.append(
                    {
                        "student_id": item["student_id"],
                        "status": item["status"],
                        "remarks": item.get("remarks"),
                    }
                )

            if not normalized_attendances:
                return {
                    "created": 0,
                    "updated": 0,
                    "total": 0,
                }, None

            # The legacy payload historically allowed subject_id per row.
            # Canonical daily attendance has one subject annotation per
            # student/class/date row, not subject as part of identity.
            #
            # Group by requested subject so the canonical writer can
            # validate every supplied Subject against the tenant while
            # still preserving legacy row-level skip behavior.
            groups = {}

            for original in attendances:
                if not isinstance(original, dict):
                    continue

                student_id = original.get("student_id")
                status = original.get("status")

                if not student_id or not status:
                    continue

                subject_id = original.get("subject_id")

                groups.setdefault(
                    subject_id,
                    [],
                ).append(
                    {
                        "student_id": student_id,
                        "status": status,
                        "remarks": original.get("remarks"),
                    }
                )

            created_count = 0
            updated_count = 0

            # Determine whether each canonical identity existed before
            # the write. This lookup is intentionally performed through
            # the same narrow unscoped identity helper used by the
            # certified writer. Parent ownership is still enforced by
            # bulk_create_attendance before any mutation occurs.
            preexisting = {}

            for rows in groups.values():
                for row in rows:
                    identity = (
                        row["student_id"],
                        class_id,
                        date,
                    )

                    if identity in preexisting:
                        continue

                    preexisting[identity] = (
                        AttendanceService
                        ._get_authorized_daily_attendance_unscoped(
                            row["student_id"],
                            class_id,
                            date,
                        )
                        is not None
                    )

            processed_identities = set()

            for subject_id, rows in groups.items():
                payload = {
                    "class_id": class_id,
                    "subject_id": subject_id,
                    "date": date,
                    "attendances": rows,
                    "recorded_by": recorded_by,
                }

                records, error = (
                    AttendanceService.bulk_create_attendance(
                        payload,
                        tenant_id=tenant_id,
                        branch_id=branch_id,
                    )
                )

                if error:
                    return None, error

                for record in records or []:
                    identity = (
                        record.student_id,
                        record.class_id,
                        record.date,
                    )

                    # A duplicated identity in the incoming legacy payload
                    # still represents one canonical attendance row.
                    if identity in processed_identities:
                        continue

                    processed_identities.add(identity)

                    if preexisting.get(identity, False):
                        updated_count += 1
                    else:
                        created_count += 1

            return {
                "created": created_count,
                "updated": updated_count,
                "total": created_count + updated_count,
            }, None

        except Exception as e:
            db.session.rollback()
            logger.error(
                "Error in bulk mark attendance",
                error=str(e),
            )
            return None, (
                "Failed to mark attendance: "
                f"{str(e)}"
            )


    @staticmethod
    def get_historical_class_attendance_summary(
        class_id,
        tenant_id=None,
        branch_id=None,
    ):
        """Build the historical class-summary contract safely.

        This compatibility reader intentionally supports legacy attendance
        rows whose denormalized branch_id is NULL. Ownership is proven first
        through exact tenant/branch Class and Student parents.
        """
        try:
            if tenant_id is None:
                return None, "Tenant context is required"

            from app.models.class_ import Class as ClassModel

            class_query = (
                db.session.query(ClassModel)
                .filter(
                    ClassModel.id == class_id,
                    ClassModel.tenant_id == tenant_id,
                )
            )

            if branch_id is not None:
                class_query = class_query.filter(
                    ClassModel.branch_id == branch_id
                )

            class_obj = class_query.first()

            if class_obj is None:
                return (
                    None,
                    "Class not found in current tenant/branch scope",
                )

            query = (
                db.session.query(
                    Attendance.student_id,
                    Attendance.status,
                )
                .join(
                    Student,
                    Student.id == Attendance.student_id,
                )
                .join(
                    ClassModel,
                    ClassModel.id == Attendance.class_id,
                )
                .filter(
                    Attendance.class_id == class_id,
                    Student.tenant_id == tenant_id,
                    ClassModel.id == class_id,
                    ClassModel.tenant_id == tenant_id,
                )
            )

            if branch_id is not None:
                query = query.filter(
                    Student.branch_id == branch_id,
                    ClassModel.branch_id == branch_id,
                    (
                        (Attendance.branch_id == branch_id)
                        | (Attendance.branch_id.is_(None))
                    ),
                )

            rows = query.all()

            total_records = len(
                rows
            )

            present = sum(
                1
                for row in rows
                if row.status == "present"
            )

            absent = sum(
                1
                for row in rows
                if row.status == "absent"
            )

            late = sum(
                1
                for row in rows
                if row.status == "late"
            )

            excused = sum(
                1
                for row in rows
                if row.status == "excused"
            )

            student_ids = {
                int(row.student_id)
                for row in rows
            }

            attendance_rate = (
                present / total_records * 100
                if total_records > 0
                else 0
            )

            return (
                {
                    "class_id": class_id,
                    "total_students": len(
                        student_ids
                    ),
                    "total_records": total_records,
                    "attendance_rate": round(
                        attendance_rate,
                        2,
                    ),
                    "by_status": {
                        "present": present,
                        "absent": absent,
                        "late": late,
                        "excused": excused,
                    },
                },
                None,
            )

        except Exception as exc:
            logger.error(
                "Error generating historical class "
                "attendance summary: %s",
                exc,
            )

            return (
                None,
                "Failed to generate class attendance summary: "
                f"{str(exc)}",
            )


    @staticmethod
    def get_historical_class_attendance_summary(
        class_id,
        tenant_id=None,
        branch_id=None,
    ):
        """Return the legacy class attendance summary safely.

        This is intentionally a compatibility service and does NOT alter the
        canonical advanced analytics contract.

        Historical Attendance rows with branch_id=NULL are accepted only when
        their authoritative Student and Class parents both belong to the exact
        active tenant/branch.
        """
        try:
            if tenant_id is None:
                return None, "Tenant context is required"

            from collections import Counter
            from sqlalchemy import or_
            from app.models.class_ import Class as ClassModel

            # Authorize the class first.
            class_query = (
                ClassModel.query
                .without_tenant_filter()
                .filter(
                    ClassModel.id == class_id,
                    ClassModel.tenant_id == tenant_id,
                )
            )

            if branch_id is not None:
                class_query = class_query.filter(
                    ClassModel.branch_id == branch_id
                )

            class_obj = class_query.first()

            if class_obj is None:
                return (
                    None,
                    "Class not found in current tenant/branch scope",
                )

            # Explicitly bypass ambient Attendance branch scoping only after
            # authoritative parent ownership has been established.
            query = (
                Attendance.query
                .without_tenant_filter()
                .join(
                    Student,
                    Student.id == Attendance.student_id,
                )
                .join(
                    ClassModel,
                    ClassModel.id == Attendance.class_id,
                )
                .filter(
                    Attendance.class_id == class_obj.id,
                    Student.tenant_id == tenant_id,
                    Student.class_id == class_obj.id,
                    ClassModel.tenant_id == tenant_id,
                )
            )

            if branch_id is not None:
                query = query.filter(
                    Student.branch_id == branch_id,
                    ClassModel.branch_id == branch_id,
                    or_(
                        Attendance.branch_id == branch_id,
                        Attendance.branch_id.is_(None),
                    ),
                )

            rows = query.all()

            statuses = Counter(row.status for row in rows)

            total_records = len(rows)
            attended_records = (
                statuses.get("present", 0)
                + statuses.get("late", 0)
            )

            attendance_rate = (
                round(
                    (attended_records / total_records) * 100,
                    2,
                )
                if total_records
                else 0.0
            )

            total_students = len(
                {
                    row.student_id
                    for row in rows
                }
            )

            summary = {
                "total_students": total_students,
                "attendance_rate": attendance_rate,
                "by_status": dict(statuses),
            }

            return summary, None

        except Exception as exc:
            logger.exception(
                "Error generating historical class attendance summary: %s",
                exc,
            )
            return None, "Failed to generate class attendance summary"


    @staticmethod
    def get_historical_attendance_analytics_compat(
        class_id=None,
        date_from=None,
        date_to=None,
        tenant_id=None,
        branch_id=None,
    ):
        """Build only the legacy flat attendance analytics projection.

        This method exists solely for backward compatibility with historical
        consumers of /api/v1/attendance/analytics.

        Canonical advanced analytics remains exact Attendance.branch_id.

        Historical Attendance.branch_id=NULL rows are admitted here only when
        authoritative Student and Class parents prove exact tenant/branch
        ownership.
        """
        try:
            from collections import Counter
            from sqlalchemy import or_
            from app.models.class_ import Class as ClassModel

            if tenant_id is None:
                return None, "Tenant context is required"

            # ----------------------------------------------------------
            # Optional Class must itself belong to the exact request
            # tenant/branch before it may anchor compatibility records.
            # ----------------------------------------------------------
            if class_id is not None:
                class_query = (
                    ClassModel.query
                    .without_tenant_filter()
                    .filter(
                        ClassModel.id == class_id,
                        ClassModel.tenant_id == tenant_id,
                    )
                )

                if branch_id is not None:
                    class_query = class_query.filter(
                        ClassModel.branch_id == branch_id
                    )

                if class_query.first() is None:
                    return (
                        None,
                        "Class not found in current tenant/branch scope",
                    )

            # ----------------------------------------------------------
            # Attendance has no authoritative tenant ownership itself.
            # Join both authoritative parents before allowing historical
            # branch_id=NULL compatibility.
            # ----------------------------------------------------------
            query = (
                Attendance.query
                .without_tenant_filter()
                .join(
                    Student,
                    Student.id == Attendance.student_id,
                )
                .join(
                    ClassModel,
                    ClassModel.id == Attendance.class_id,
                )
                .filter(
                    Student.tenant_id == tenant_id,
                    ClassModel.tenant_id == tenant_id,
                )
            )

            if branch_id is not None:
                query = query.filter(
                    Student.branch_id == branch_id,
                    ClassModel.branch_id == branch_id,
                    or_(
                        Attendance.branch_id == branch_id,
                        Attendance.branch_id.is_(None),
                    ),
                )

            if class_id is not None:
                query = query.filter(
                    Attendance.class_id == class_id,
                    Student.class_id == class_id,
                )

            if date_from is not None:
                query = query.filter(
                    Attendance.date >= date_from
                )

            if date_to is not None:
                query = query.filter(
                    Attendance.date <= date_to
                )

            records = query.all()

            statuses = Counter(
                row.status
                for row in records
            )

            total_records = len(records)
            present_records = statuses.get(
                "present",
                0,
            )

            # Preserve the historical meaning of "rate".
            # Existing analytics_service.py defines attendance rate from
            # present records rather than changing canonical semantics here.
            rate = (
                (present_records / total_records) * 100
                if total_records
                else 0
            )

            return {
                "rate": rate,
                "by_status": {
                    "present": statuses.get("present", 0),
                    "absent": statuses.get("absent", 0),
                    "late": statuses.get("late", 0),
                    "excused": statuses.get("excused", 0),
                },
                "total_records": total_records,
            }, None

        except Exception as exc:
            logger.exception(
                "Error generating historical attendance "
                "analytics compatibility projection: %s",
                exc,
            )

            return (
                None,
                "Failed to generate attendance analytics",
            )

    @staticmethod
    def get_advanced_attendance_analytics(class_id=None, date_from=None, date_to=None, tenant_id=None, branch_id=None):
        """Generate advanced attendance analytics for a class."""
        try:
            from datetime import datetime, timedelta

            import pandas as pd

            if tenant_id is None:
                return None, "Tenant context is required"

            if class_id is not None:
                from app.models.class_ import Class as ClassModel

                class_q = (
                    db.session.query(ClassModel)
                    .filter(
                        ClassModel.id == class_id,
                        ClassModel.tenant_id == tenant_id,
                    )
                )

                if branch_id is not None and hasattr(ClassModel, "branch_id"):
                    class_q = class_q.filter(
                        ClassModel.branch_id == branch_id
                    )

                if not class_q.first():
                    return None, "Class not found in current tenant/branch scope"

            # Build base query
            query = db.session.query(
                Attendance.student_id, Attendance.date, Attendance.status
            ).join(Student)

            if tenant_id is not None:
                query = query.filter(Student.tenant_id == tenant_id)

            if branch_id is not None:
                query = query.filter(
                    Attendance.branch_id == branch_id
                )

            if class_id:
                query = query.filter(Attendance.class_id == class_id)

            if date_from:
                query = query.filter(Attendance.date >= date_from)

            if date_to:
                query = query.filter(Attendance.date <= date_to)

            attendances = query.all()

            if not attendances:
                # Return empty stats structure instead of an error message to avoid 400 Bad Request
                return {
                    "daily_stats": {},
                    "student_stats": {},
                    "overall_stats": {
                        "total_records": 0,
                        "present_records": 0,
                        "absent_records": 0,
                        "late_records": 0,
                        "excused_records": 0,
                        "overall_attendance_rate": 0,
                        "date_range": {
                            "start": (
                                date_from.strftime("%Y-%m-%d") if date_from else None
                            ),
                            "end": date_to.strftime("%Y-%m-%d") if date_to else None,
                            "total_days": 0,
                        },
                    },
                }, None

            # Convert to DataFrame for easier analysis
            df = pd.DataFrame(
                [(a.student_id, a.date, a.status) for a in attendances],
                columns=["student_id", "date", "status"],
            )

            # Get unique students and dates
            students = df["student_id"].unique()
            dates = sorted(df["date"].unique())

            # Calculate attendance trends over time
            daily_stats = {}
            for date in dates:
                day_df = df[df["date"] == date]
                total = len(day_df)
                present = len(day_df[day_df["status"] == "present"])
                absent = len(day_df[day_df["status"] == "absent"])
                late = len(day_df[day_df["status"] == "late"])
                excused = len(day_df[day_df["status"] == "excused"])

                daily_stats[date.strftime("%Y-%m-%d")] = {
                    "total": total,
                    "present": present,
                    "absent": absent,
                    "late": late,
                    "excused": excused,
                    "attendance_rate": (present / total * 100) if total > 0 else 0,
                }

            # Calculate student-wise attendance
            student_stats = {}
            for student_id_raw in students:
                student_id = int(student_id_raw)
                student_df = df[df["student_id"] == student_id_raw]
                total_days = len(student_df)
                present_days = len(student_df[student_df["status"] == "present"])
                absent_days = len(student_df[student_df["status"] == "absent"])
                late_days = len(student_df[student_df["status"] == "late"])
                excused_days = len(student_df[student_df["status"] == "excused"])

                # Get student details (scoped to avoid cross-tenant PII leak)
                student_q = db.session.query(Student).filter(Student.id == student_id)
                if tenant_id is not None:
                    student_q = student_q.filter(Student.tenant_id == tenant_id)
                student = student_q.first()
                student_name = (
                    f"{student.first_name} {student.last_name}"
                    if student
                    else f"Student {student_id}"
                )

                student_stats[str(student_id)] = {
                    "student_id": student_id,
                    "student_name": student_name,
                    "total_days": total_days,
                    "present_days": present_days,
                    "absent_days": absent_days,
                    "late_days": late_days,
                    "excused_days": excused_days,
                    "attendance_rate": (
                        (present_days / total_days * 100) if total_days > 0 else 0
                    ),
                    "consecutive_absences": AttendanceService._calculate_consecutive_absences(
                        student_df
                    ),
                }

            # Calculate overall statistics
            total_records = len(df)
            present_records = len(df[df["status"] == "present"])
            absent_records = len(df[df["status"] == "absent"])
            late_records = len(df[df["status"] == "late"])
            excused_records = len(df[df["status"] == "excused"])

            overall_stats = {
                "total_records": total_records,
                "present_records": present_records,
                "absent_records": absent_records,
                "late_records": late_records,
                "excused_records": excused_records,
                "overall_attendance_rate": (
                    (present_records / total_records * 100) if total_records > 0 else 0
                ),
                "date_range": {
                    "start": dates[0].strftime("%Y-%m-%d") if dates else None,
                    "end": dates[-1].strftime("%Y-%m-%d") if dates else None,
                    "total_days": len(dates),
                },
            }

            return {
                "daily_stats": daily_stats,
                "student_stats": student_stats,
                "overall_stats": overall_stats,
            }, None

        except Exception as e:
            return None, f"Failed to generate attendance analytics: {str(e)}"

    @staticmethod
    def _calculate_consecutive_absences(student_df):
        """Helper method to calculate the longest streak of consecutive absences."""
        if student_df.empty:
            return 0

        # Sort by date
        student_df = student_df.sort_values("date")

        # Consider both 'absent' and 'late' as absences for this calculation
        absences = student_df["status"].isin(["absent"])

        # Calculate consecutive absences
        max_streak = 0
        current_streak = 0

        for absent in absences:
            if absent:
                current_streak += 1
                max_streak = max(max_streak, current_streak)
            else:
                current_streak = 0

        return max_streak

    @staticmethod
    def get_attendance_trends(
        class_id=None,
        student_id=None,
        date_from=None,
        date_to=None,
        tenant_id=None,
        branch_id=None,
    ):
        """Tenant/branch-authorized daily attendance trends."""
        try:
            scope = AttendanceService._attendance_scope_query(
                tenant_id,
                branch_id,
            )

            if scope is None:
                return None, "Tenant context required"

            scoped_ids = scope.with_entities(
                Attendance.id
            ).subquery()

            query = (
                db.session.query(
                    Attendance.date,
                    Attendance.status,
                    func.count(
                        Attendance.id
                    ).label("count"),
                )
                .join(
                    scoped_ids,
                    scoped_ids.c.id == Attendance.id,
                )
                .group_by(
                    Attendance.date,
                    Attendance.status,
                )
            )

            if class_id:
                query = query.filter(
                    Attendance.class_id == class_id
                )

            if student_id:
                query = query.filter(
                    Attendance.student_id == student_id
                )

            if date_from:
                query = query.filter(
                    Attendance.date >= date_from
                )

            if date_to:
                query = query.filter(
                    Attendance.date <= date_to
                )

            trends = {}

            for row in query.all():
                key = row.date.strftime(
                    "%Y-%m-%d"
                )

                data = trends.setdefault(
                    key,
                    {
                        "present": 0,
                        "absent": 0,
                        "late": 0,
                        "excused": 0,
                        "total": 0,
                    },
                )

                data[row.status] = row.count
                data["total"] += row.count

            for data in trends.values():
                data["attendance_rate"] = (
                    round(
                        data["present"]
                        / data["total"]
                        * 100,
                        2,
                    )
                    if data["total"]
                    else 0
                )

            return dict(
                sorted(trends.items())
            ), None

        except Exception as exc:
            logger.error(
                "Error getting attendance trends",
                error=str(exc),
            )
            return None, str(exc)

    @staticmethod
    def get_at_risk_students(
        class_id=None,
        threshold=80,
        tenant_id=None,
        branch_id=None,
    ):
        """Tenant/branch-authorized at-risk student projection."""
        try:
            if tenant_id is None:
                return None, "Tenant context required"

            student_query = (
                Student.query
                .without_tenant_filter()
                .filter(
                    Student.tenant_id == tenant_id
                )
            )

            if branch_id is not None:
                student_query = student_query.filter(
                    Student.branch_id == branch_id
                )

            if class_id:
                class_query = (
                    Class.query
                    .without_tenant_filter()
                    .filter(
                        Class.id == class_id,
                        Class.tenant_id == tenant_id,
                    )
                )

                if branch_id is not None:
                    class_query = class_query.filter(
                        Class.branch_id == branch_id
                    )

                if class_query.first() is None:
                    return None, "Class not found"

                student_query = student_query.filter(
                    Student.class_id == class_id
                )

            scope = AttendanceService._attendance_scope_query(
                tenant_id,
                branch_id,
            )

            scoped_ids = scope.with_entities(
                Attendance.id
            ).subquery()

            attendance_rates = (
                db.session.query(
                    Attendance.student_id,
                    func.count(
                        Attendance.id
                    ).label("total_days"),
                    func.sum(
                        func.cast(
                            Attendance.status == "present",
                            db.Integer,
                        )
                    ).label("present_days"),
                )
                .join(
                    scoped_ids,
                    scoped_ids.c.id == Attendance.id,
                )
                .group_by(
                    Attendance.student_id
                )
                .subquery()
            )

            query = (
                student_query
                .join(
                    attendance_rates,
                    Student.id
                    == attendance_rates.c.student_id,
                )
                .with_entities(
                    Student,
                    attendance_rates.c.total_days,
                    attendance_rates.c.present_days,
                )
            )

            students = []

            for student, total, present in query.all():
                total = int(total or 0)
                present = int(present or 0)

                if total == 0:
                    continue

                rate = (
                    present / total
                ) * 100

                if rate < threshold:
                    students.append({
                        "student_id": student.id,
                        "name": (
                            f"{student.first_name} "
                            f"{student.last_name}"
                        ),
                        "admission_number": (
                            student.admission_number
                        ),
                        "attendance_rate": round(
                            rate,
                            2,
                        ),
                        "total_days": total,
                        "present_days": present,
                        "absent_days": total - present,
                    })

            return students, None

        except Exception as exc:
            logger.error(
                "Error getting at-risk students",
                error=str(exc),
            )
            return None, str(exc)


    @staticmethod
    def sync_offline_attendance(
        attendance_data_list,
        recorded_by,
        tenant_id=None,
        branch_id=None,
    ):
        """Synchronize offline attendance through the canonical writer.

        SECURITY CONTRACT:
          * tenant_id is mandatory;
          * recorded_by comes from the authenticated caller;
          * Class/Student/Subject ownership is NOT trusted from client IDs;
          * branch ownership is derived by bulk_create_attendance();
          * canonical identity remains student + class + date;
          * persistence is delegated exclusively to the certified canonical
            bulk attendance writer.

        Offline synchronization preserves the historical partial-batch
        response contract: independently grouped records may succeed while
        invalid groups are reported in ``errors``.
        """
        if tenant_id is None:
            return None, "Tenant context is required"

        if not isinstance(
            attendance_data_list,
            list,
        ):
            return None, (
                "Attendance data must be a list"
            )

        if recorded_by is None:
            return None, (
                "Authenticated recorder is required"
            )

        # Group rows into the canonical bulk writer's contract:
        #
        #   one Class + one Subject + one Date
        #       -> N student attendance rows
        #
        # Subject is intentionally part of the transport grouping,
        # NOT Attendance database identity.
        groups = {}
        input_count = 0
        errors = []

        for index, raw_item in enumerate(
            attendance_data_list
        ):
            input_count += 1

            if not isinstance(raw_item, dict):
                errors.append(
                    {
                        "index": index,
                        "student_id": None,
                        "error": (
                            "Attendance record must "
                            "be an object"
                        ),
                    }
                )
                continue

            item = dict(raw_item)

            try:
                student_id = item["student_id"]
                class_id = item["class_id"]
                status = item["status"]
                date_value = item["date"]

                if isinstance(date_value, str):
                    date_value = datetime.strptime(
                        date_value,
                        "%Y-%m-%d",
                    ).date()

                subject_id = item.get(
                    "subject_id"
                )

                group_key = (
                    class_id,
                    subject_id,
                    date_value,
                )

                groups.setdefault(
                    group_key,
                    [],
                ).append(
                    {
                        "source_index": index,
                        "student_id": student_id,
                        "status": status,
                        "remarks": item.get(
                            "remarks"
                        ),
                    }
                )

            except KeyError as exc:
                errors.append(
                    {
                        "index": index,
                        "student_id": item.get(
                            "student_id"
                        ),
                        "error": (
                            f"Missing required field: "
                            f"{exc.args[0]}"
                        ),
                    }
                )

            except (
                TypeError,
                ValueError,
            ):
                errors.append(
                    {
                        "index": index,
                        "student_id": item.get(
                            "student_id"
                        ),
                        "error": (
                            "Invalid attendance date. "
                            "Use YYYY-MM-DD"
                        ),
                    }
                )

        synced_count = 0

        for (
            class_id,
            subject_id,
            date_value,
        ), rows in groups.items():

            bulk_payload = {
                "class_id": class_id,
                "subject_id": subject_id,
                "date": date_value,
                "recorded_by": recorded_by,
                "attendances": [
                    {
                        "student_id":
                            row["student_id"],
                        "status":
                            row["status"],
                        "remarks":
                            row["remarks"],
                    }
                    for row in rows
                ],
            }

            records, error = (
                AttendanceService
                .bulk_create_attendance(
                    bulk_payload,
                    tenant_id=tenant_id,
                    branch_id=branch_id,
                )
            )

            if error:
                for row in rows:
                    errors.append(
                        {
                            "index":
                                row["source_index"],
                            "student_id":
                                row["student_id"],
                            "error":
                                error,
                        }
                    )

                continue

            # bulk_create_attendance deliberately skips students that fail
            # authoritative tenant/class/branch ownership. Translate those
            # skips into explicit offline-sync errors rather than reporting
            # them as synchronized.
            returned_student_ids = {
                record.student_id
                for record in (
                    records or []
                )
            }

            for row in rows:
                if (
                    row["student_id"]
                    in returned_student_ids
                ):
                    synced_count += 1
                else:
                    errors.append(
                        {
                            "index":
                                row["source_index"],
                            "student_id":
                                row["student_id"],
                            "error": (
                                "Student not found in "
                                "current tenant/class/"
                                "branch scope"
                            ),
                        }
                    )

        return {
            "synced": synced_count,
            "received": input_count,
            "errors": errors,
        }, None
