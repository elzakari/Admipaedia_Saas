from datetime import datetime

from flask import abort, jsonify, request
from flask_jwt_extended import get_jwt_identity, jwt_required
from marshmallow import ValidationError

from app.api.v1.attendances import attendances_bp
from app.extensions import db
from app.models.class_ import Class, ClassTeacherMapping
from app.models.teacher import Teacher
from app.models.user import User
from app.schemas.attendance import (AttendanceBulkCreateSchema,
                                    AttendanceCreateSchema, AttendanceSchema,
                                    AttendanceUpdateSchema)
from app.services.attendance_service import AttendanceService
from app.utils.auth_utils import admin_required, teacher_required
from app.utils.rbac_decorators import (has_permission, require_permission,
                                      require_role)
from app.utils.tenant_context import tenant_required

# Initialize schemas
attendance_schema = AttendanceSchema()
attendances_schema = AttendanceSchema(many=True)
attendance_create_schema = AttendanceCreateSchema()
attendance_update_schema = AttendanceUpdateSchema()
attendance_bulk_create_schema = AttendanceBulkCreateSchema()


def _current_user_teacher_ids() -> list:
    """Return Teacher ids owned by the current JWT user, or [] if none.

    A teacher portal login normally has a User row with role == 'teacher',
    a matching Teacher.user_id row, and tenant-membership assignments.
    """
    user_id = get_jwt_identity()
    if not user_id:
        return []
    rows = (
        db.session.query(Teacher.id)
        .filter(Teacher.user_id == user_id)
        .all()
    )
    return [int(r[0]) for r in rows if r and r[0]]


def _current_user_is_admin_like() -> bool:
    """Return True iff the current user carries an explicit admin-like role."""
    user_id = get_jwt_identity()
    if not user_id:
        return False
    user = db.session.query(User).filter(User.id == user_id).first()
    if getattr(user, "role", None) in {
        "admin",
        "school_admin",
        "super_admin",
        "super_manager",
        "manager",
        "billing_admin",
    }:
        return True
    return False


def _teacher_is_assigned_to_class(teacher_ids, class_id: int) -> bool:
    """Return True iff any of the supplied teacher ids is assigned to class_id.

    Assignment is satisfied by any one of:
      1. Class.teacher_id direct FK (the homeroom teacher).
      2. A ClassTeacherMapping row for the class/teacher pair.
      3. A subject assignment (TeacherSubjects join) for a subject linked to
         the class via ClassSubject join â€” this covers subject teachers who
         are not set as the homeroom contact.
    """
    if not teacher_ids or not class_id:
        return False

    class_ = db.session.query(Class).filter(Class.id == class_id).first()
    if class_ is None:
        return False

    if class_.teacher_id and int(class_.teacher_id) in {
        int(t) for t in teacher_ids
    }:
        return True

    mapping_exists = (
        db.session.query(ClassTeacherMapping.id)
        .filter(
            ClassTeacherMapping.class_id == class_id,
            ClassTeacherMapping.teacher_id.in_(teacher_ids),
        )
        .first()
    )
    if mapping_exists:
        return True

    # Subject-teacher assignments join: class -> class_subjects -> subjects -> teacher_subjects
    try:
        from app.models.associations import (class_subjects, teacher_subjects)
        from app.models.subject import Subject

        assigned_subject_ids = (
            db.session.query(class_subjects.c.subject_id)
            .filter(class_subjects.c.class_id == class_id)
            .all()
        )
        if not assigned_subject_ids:
            return False
        subject_ids = [int(r[0]) for r in assigned_subject_ids if r and r[0]]
        linked_teacher = (
            db.session.query(teacher_subjects.c.teacher_id)
            .filter(
                teacher_subjects.c.subject_id.in_(subject_ids),
                teacher_subjects.c.teacher_id.in_(teacher_ids),
            )
            .first()
        )
        if linked_teacher is not None:
            return True
    except Exception:
        pass
    return False


def _is_teacher_and_scoped_to_class(class_id=None, bulk_class_id=None, student_scope_class_id=None) -> bool:
    """Return True iff caller is a teacher AND the scope is assigned to them.

    When a teacher calls the endpoints without the global admin permission,
    we still allow the call only if the requested class is one they are
    explicitly assigned to (homeroom, class-teacher mapping, or subject
    teacher via ClassSubjects + TeacherSubjects joins).
    """
    target_class_ids = [c for c in [class_id, bulk_class_id, student_scope_class_id] if c]
    deduped = sorted({int(c) for c in target_class_ids})
    if not deduped:
        return False
    teacher_ids = _current_user_teacher_ids()
    if not teacher_ids:
        return False
    return all(_teacher_is_assigned_to_class(teacher_ids, c) for c in deduped)


@attendances_bp.route("/", methods=["GET"])
@jwt_required()
@tenant_required
def get_attendances():
    """Get all attendances with pagination and filtering.

    Admin path: requires the explicit attendance.read permission.
    Teacher path: allowed ONLY when an explicit class_id filter is present
    AND the JWT user resolves to a Teacher assigned to that class (homeroom,
    ClassTeacherMapping, or subject-teacher via class subjects join).
    """
    page = request.args.get("page", 1, type=int)
    per_page = request.args.get("per_page", 20, type=int)
    class_id = request.args.get("class_id", type=int)
    student_id = request.args.get("student_id", type=int)
    subject_id = request.args.get("subject_id", type=int)
    status = request.args.get("status", type=str)

    # Authorization gate.  Do this BEFORE any business logic so an unprivileged
    # caller cannot enumerate attendance IDs if they craft a request.
    current_user = db.session.query(User).filter(User.id == get_jwt_identity()).first() if get_jwt_identity() else None
    authorized = bool(current_user) and has_permission(current_user, "attendance.read")

    if not authorized:
        # Teacher-scoped escape hatch: must have explicit class_id and be
        # an assigned teacher for that class.
        if class_id is None:
            abort(403)
        if not _is_teacher_and_scoped_to_class(class_id=class_id):
            abort(403)

    # Parse date parameters
    date_from = request.args.get("date_from", type=str)
    date_to = request.args.get("date_to", type=str)

    if date_from:
        try:
            date_from = datetime.strptime(date_from, "%Y-%m-%d").date()
        except ValueError:
            return (
                jsonify(
                    {
                        "success": False,
                        "message": "Invalid date_from format. Use YYYY-MM-DD",
                    }
                ),
                400,
            )

    if date_to:
        try:
            date_to = datetime.strptime(date_to, "%Y-%m-%d").date()
        except ValueError:
            return (
                jsonify(
                    {
                        "success": False,
                        "message": "Invalid date_to format. Use YYYY-MM-DD",
                    }
                ),
                400,
            )

    paginated_attendances = AttendanceService.get_all_attendances(
        page, per_page, class_id, student_id, subject_id, date_from, date_to, status
    )

    return (
        jsonify(
            {
                "success": True,
                "attendances": attendances_schema.dump(paginated_attendances.items),
                "pagination": {
                    "total": paginated_attendances.total,
                    "pages": paginated_attendances.pages,
                    "page": paginated_attendances.page,
                    "per_page": paginated_attendances.per_page,
                    "next": paginated_attendances.next_num,
                    "prev": paginated_attendances.prev_num,
                },
            }
        ),
        200,
    )


@attendances_bp.route("/<int:attendance_id>", methods=["GET"])
@jwt_required()
@tenant_required
@require_permission("attendance.read")
def get_attendance(attendance_id):
    """Get a specific attendance record by ID."""
    attendance = AttendanceService.get_attendance_by_id(attendance_id)

    if not attendance:
        return (
            jsonify({"success": False, "message": "Attendance record not found"}),
            404,
        )

    return (
        jsonify({"success": True, "attendance": attendance_schema.dump(attendance)}),
        200,
    )


@attendances_bp.route("/", methods=["POST"])
@jwt_required()
@tenant_required
@require_role(["teacher", "admin", "school_admin", "super_admin", "super_manager"])
@require_permission("attendance.create")
def create_attendance():
    """Create a new attendance record."""
    try:
        data = attendance_create_schema.load(request.json)

        # Set recorded_by to current user if not provided
        if "recorded_by" not in data:
            data["recorded_by"] = get_jwt_identity()

        attendance, error = AttendanceService.create_attendance(data)

        if error:
            return jsonify({"success": False, "message": error}), 400

        return (
            jsonify(
                {
                    "success": True,
                    "message": "Attendance record created successfully",
                    "attendance": attendance_schema.dump(attendance),
                }
            ),
            201,
        )
    except ValidationError as err:
        return jsonify({"success": False, "errors": err.messages}), 400


@attendances_bp.route("/<int:attendance_id>", methods=["PUT"])
@jwt_required()
@tenant_required
@require_role(["teacher", "admin", "school_admin", "super_admin", "super_manager"])
@require_permission("attendance.update")
def update_attendance(attendance_id):
    """Update an existing attendance record."""
    try:
        data = attendance_update_schema.load(request.json)

        # Set recorded_by to current user if not provided
        if "recorded_by" not in data:
            data["recorded_by"] = get_jwt_identity()

        attendance, error = AttendanceService.update_attendance(attendance_id, data)

        if error:
            return jsonify({"success": False, "message": error}), 400

        return (
            jsonify(
                {
                    "success": True,
                    "message": "Attendance record updated successfully",
                    "attendance": attendance_schema.dump(attendance),
                }
            ),
            200,
        )
    except ValidationError as err:
        return jsonify({"success": False, "errors": err.messages}), 400


@attendances_bp.route("/<int:attendance_id>", methods=["DELETE"])
@jwt_required()
@tenant_required
@require_role(["admin", "school_admin", "super_admin", "super_manager"])
@require_permission("attendance.delete")
def delete_attendance(attendance_id):
    """Delete an attendance record."""
    success, error = AttendanceService.delete_attendance(attendance_id)

    if error:
        return jsonify({"success": False, "message": error}), 400

    return (
        jsonify({"success": True, "message": "Attendance record deleted successfully"}),
        200,
    )


@attendances_bp.route("/bulk", methods=["POST"])
@jwt_required()
@tenant_required
@require_role(["teacher", "admin", "school_admin", "super_admin", "super_manager"])
def bulk_create_attendance():
    """Create multiple attendance records at once.

    Admin path: requires the explicit attendance.create permission.
    Teacher path: allowed when an explicit class_id is supplied in the bulk
    payload AND the JWT user resolves to a Teacher assigned to that class.
    """
    try:
        data = attendance_bulk_create_schema.load(request.json)

        # Set recorded_by to current user if not provided
        if "recorded_by" not in data:
            data["recorded_by"] = get_jwt_identity()

        # Authorization gate (must run AFTER schema load so class_id parsed).
        user_for_bulk = db.session.query(User).filter(User.id == get_jwt_identity()).first() if get_jwt_identity() else None
        bulk_authorized = bool(user_for_bulk) and has_permission(user_for_bulk, "attendance.create")
        if not bulk_authorized:
            payload_class_id = None
            try:
                payload_class_id = int(data.get("class_id")) if data.get("class_id") not in (None, "") else None
            except Exception:
                payload_class_id = None
            if not _is_teacher_and_scoped_to_class(class_id=payload_class_id):
                abort(403)

        attendances, error = AttendanceService.bulk_create_attendance(data)

        if error:
            return jsonify({"success": False, "message": error}), 400

        return (
            jsonify(
                {
                    "success": True,
                    "message": f"{len(attendances)} attendance records created/updated successfully",
                    "attendances": attendances_schema.dump(attendances),
                }
            ),
            201,
        )
    except ValidationError as err:
        return jsonify({"success": False, "errors": err.messages}), 400


@attendances_bp.route("/stats", methods=["GET"])
@jwt_required()
@tenant_required
@require_permission("attendance.reports")
def get_attendance_stats():
    """Get attendance statistics."""
    class_id = request.args.get("class_id", type=int)
    student_id = request.args.get("student_id", type=int)

    # Parse date parameters
    date_from = request.args.get("date_from", type=str)
    date_to = request.args.get("date_to", type=str)

    if date_from:
        try:
            date_from = datetime.strptime(date_from, "%Y-%m-%d").date()
        except ValueError:
            return (
                jsonify(
                    {
                        "success": False,
                        "message": "Invalid date_from format. Use YYYY-MM-DD",
                    }
                ),
                400,
            )

    if date_to:
        try:
            date_to = datetime.strptime(date_to, "%Y-%m-%d").date()
        except ValueError:
            return (
                jsonify(
                    {
                        "success": False,
                        "message": "Invalid date_to format. Use YYYY-MM-DD",
                    }
                ),
                400,
            )

    stats, error = AttendanceService.get_attendance_stats(
        class_id, student_id, date_from, date_to
    )

    if error:
        return jsonify({"success": False, "message": error}), 400

    return jsonify({"success": True, "stats": stats}), 200


@attendances_bp.route("/analytics/trends", methods=["GET"])
@jwt_required()
@tenant_required
@require_permission("attendance.reports")
def get_attendance_trends():
    """Get attendance trends over time."""
    class_id = request.args.get("class_id", type=int)
    student_id = request.args.get("student_id", type=int)
    date_from = request.args.get("date_from")
    date_to = request.args.get("date_to")

    if date_from:
        date_from = datetime.strptime(date_from, "%Y-%m-%d").date()
    if date_to:
        date_to = datetime.strptime(date_to, "%Y-%m-%d").date()

    trends, error = AttendanceService.get_attendance_trends(
        class_id, student_id, date_from, date_to
    )

    if error:
        return jsonify({"success": False, "message": error}), 400

    return jsonify({"success": True, "trends": trends}), 200


@attendances_bp.route("/analytics/at-risk", methods=["GET"])
@jwt_required()
@tenant_required
@require_permission("attendance.reports")
def get_at_risk_students():
    """Get students with low attendance."""
    class_id = request.args.get("class_id", type=int)
    threshold = request.args.get("threshold", 80, type=int)

    students, error = AttendanceService.get_at_risk_students(class_id, threshold)

    if error:
        return jsonify({"success": False, "message": error}), 400

    return jsonify({"success": True, "students": students}), 200


@attendances_bp.route("/sync", methods=["POST"])
@jwt_required()
@tenant_required
@require_role(["teacher", "admin", "school_admin", "super_admin", "super_manager"])
def sync_offline_attendance():
    """Sync attendance data collected offline."""
    data = request.json
    if not isinstance(data, list):
        return (
            jsonify(
                {"success": False, "message": "Expected a list of attendance records"}
            ),
            400,
        )

    result, error = AttendanceService.sync_offline_attendance(data, get_jwt_identity())

    if error:
        return jsonify({"success": False, "message": error}), 400

    return jsonify({"success": True, "result": result}), 200
