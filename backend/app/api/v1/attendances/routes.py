from datetime import datetime

from flask import abort, jsonify, request, g
from flask_jwt_extended import get_jwt_identity, jwt_required
from marshmallow import ValidationError

from app.api.v1.attendances import attendances_bp
from app.extensions import db
from app.models.class_ import Class, ClassTeacherMapping
from app.models.student import Student
from app.models.teacher import Teacher
from app.models.user import User
from app.schemas.attendance import (AttendanceBulkCreateSchema,
                                    AttendanceCreateSchema, AttendanceSchema,
                                    AttendanceUpdateSchema)
from app.services.attendance_service import AttendanceService
from app.utils.auth_utils import admin_required, teacher_required
from app.utils.rbac_decorators import (
    get_request_effective_permissions,
    get_request_effective_roles,
    require_permission,
    require_role,
    get_current_user,
)
from app.utils.tenant_context import tenant_required

# Initialize schemas
attendance_schema = AttendanceSchema()
attendances_schema = AttendanceSchema(many=True)
attendance_create_schema = AttendanceCreateSchema()
attendance_update_schema = AttendanceUpdateSchema()
attendance_bulk_create_schema = AttendanceBulkCreateSchema()


def _current_user_teacher_ids() -> list:
    """Return current user's Teacher ids in the active tenant/branch.

    TenantMembership determines whether the request is acting as a teacher.
    This helper resolves only the tenant/branch-owned Teacher profile used
    by resource-assignment relationships.
    """
    user_id = get_jwt_identity()
    tenant_id = getattr(g, "tenant_id", None)
    branch_id = getattr(g, "branch_id", None)

    if not user_id or tenant_id is None:
        return []

    query = (
        Teacher.query
        .without_tenant_filter()
        .filter(
            Teacher.user_id == user_id,
            Teacher.tenant_id == tenant_id,
        )
    )

    if branch_id is not None:
        query = query.filter(
            Teacher.branch_id == branch_id
        )

    rows = query.with_entities(Teacher.id).all()

    return [
        int(row[0])
        for row in rows
        if row and row[0]
    ]


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


def _teacher_is_assigned_to_class(
    teacher_ids,
    class_id: int,
) -> bool:
    """Return True only for an assignment inside active tenant/branch.

    Identity domains:
      * Class.teacher_id -> Teacher.id
      * teacher_subjects.teacher_id -> Teacher.id
      * ClassTeacherMapping.teacher_id -> User.id

    Association tables do not carry tenant ownership themselves, so their
    authority is inherited only through explicitly tenant-owned parent rows.
    """
    if not teacher_ids or not class_id:
        return False

    tenant_id = getattr(g, "tenant_id", None)
    branch_id = getattr(g, "branch_id", None)
    user_id = get_jwt_identity()

    if tenant_id is None or not user_id:
        return False

    normalized_teacher_ids = {
        int(teacher_id)
        for teacher_id in teacher_ids
        if teacher_id
    }

    if not normalized_teacher_ids:
        return False

    # Re-authorize supplied Teacher ids against the current JWT user,
    # tenant, and active branch. Never trust caller-supplied numeric ids.
    teacher_query = (
        Teacher.query
        .without_tenant_filter()
        .filter(
            Teacher.id.in_(normalized_teacher_ids),
            Teacher.user_id == user_id,
            Teacher.tenant_id == tenant_id,
        )
    )

    if branch_id is not None:
        teacher_query = teacher_query.filter(
            Teacher.branch_id == branch_id
        )

    authorized_teacher_ids = {
        int(row[0])
        for row in teacher_query
        .with_entities(Teacher.id)
        .all()
        if row and row[0]
    }

    if not authorized_teacher_ids:
        return False

    # Class is the authoritative target resource.
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

    class_ = class_query.first()

    if class_ is None:
        return False

    # 1. Homeroom teacher:
    #    Class.teacher_id references Teacher.id.
    if (
        class_.teacher_id
        and int(class_.teacher_id)
        in authorized_teacher_ids
    ):
        return True

    # 2. Explicit class mapping:
    #    ClassTeacherMapping.teacher_id references User.id,
    #    NOT Teacher.id.
    mapping_exists = (
        db.session.query(ClassTeacherMapping.id)
        .filter(
            ClassTeacherMapping.class_id == class_.id,
            ClassTeacherMapping.teacher_id == user_id,
        )
        .first()
    )

    if mapping_exists:
        return True

    # 3. Subject assignment.
    #
    # class_subjects and teacher_subjects have no tenant columns.
    # Authorize the graph through:
    #
    # tenant/branch Class
    #   -> class_subjects
    #   -> tenant-owned Subject
    #   -> teacher_subjects
    #   -> tenant/branch-owned Teacher
    try:
        from app.models.associations import (
            class_subjects,
            teacher_subjects,
        )
        from app.models.subject import Subject

        assigned_subject_ids = (
            db.session.query(
                class_subjects.c.subject_id
            )
            .join(
                Subject,
                Subject.id
                == class_subjects.c.subject_id,
            )
            .filter(
                class_subjects.c.class_id
                == class_.id,
                Subject.tenant_id
                == tenant_id,
            )
            .all()
        )

        subject_ids = {
            int(row[0])
            for row in assigned_subject_ids
            if row and row[0]
        }

        if not subject_ids:
            return False

        linked_teacher = (
            db.session.query(
                teacher_subjects.c.teacher_id
            )
            .filter(
                teacher_subjects.c.subject_id.in_(
                    subject_ids
                ),
                teacher_subjects.c.teacher_id.in_(
                    authorized_teacher_ids
                ),
            )
            .first()
        )

        return linked_teacher is not None

    except Exception:
        # Assignment lookup is an authorization boundary.
        # Any unexpected lookup failure must fail closed.
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
    """
    Get attendance records authorized by tenant RBAC plus
    role-specific resource scope.

    attendance.read grants operation authority; it does not
    by itself grant branch-wide record authority.
    """
    page = request.args.get("page", 1, type=int)
    per_page = request.args.get("per_page", 20, type=int)

    class_id = request.args.get("class_id", type=int)
    student_id = request.args.get("student_id", type=int)
    subject_id = request.args.get("subject_id", type=int)
    status = request.args.get("status", type=str)

    user = get_current_user()

    if not user:
        return jsonify({
            "error": "Authentication required"
        }), 401

    permissions = get_request_effective_permissions(user)
    roles = get_request_effective_roles(user)

    platform = "*" in permissions

    if (
        not platform
        and "attendance.read" not in permissions
    ):
        abort(403)

    privileged = bool(
        {
            "admin",
            "school_admin",
        }.intersection(roles)
    )

    teacher = "teacher" in roles
    student_role = "student" in roles
    parent_role = "parent" in roles

    # ------------------------------------------------------
    # Platform / tenant administrators
    # ------------------------------------------------------

    if platform or privileged:
        # The service still applies exact tenant/branch
        # parent provenance.
        pass

    # ------------------------------------------------------
    # Teacher
    # ------------------------------------------------------

    elif teacher:
        # A teacher must identify a class and must actually
        # be assigned to that class.
        if class_id is None:
            abort(403)

        if not _is_teacher_and_scoped_to_class(
            class_id=class_id
        ):
            abort(403)

    # ------------------------------------------------------
    # Student
    # ------------------------------------------------------

    elif student_role:
        tenant_id = getattr(g, "tenant_id", None)
        branch_id = getattr(g, "branch_id", None)

        if tenant_id is None:
            abort(403)

        profile_query = (
            Student.query
            .without_tenant_filter()
            .filter(
                Student.user_id == user.id,
                Student.tenant_id == tenant_id,
            )
        )

        if branch_id is not None:
            profile_query = profile_query.filter(
                Student.branch_id == branch_id
            )

        profile = profile_query.first()

        if not profile:
            abort(403)

        # Explicit student_id may only refer to self.
        if (
            student_id is not None
            and student_id != profile.id
        ):
            abort(403)

        student_id = profile.id

        # Explicit class_id may only match the student's
        # authoritative current class.
        if (
            class_id is not None
            and class_id != profile.class_id
        ):
            abort(403)

        if class_id is None:
            class_id = profile.class_id

    # ------------------------------------------------------
    # Parent
    # ------------------------------------------------------

    elif parent_role:
        # Parent-child authorization is already implemented
        # on the certified student report endpoint.
        #
        # Until the generic collection endpoint receives an
        # explicit parent-child projection, fail closed here.
        abort(403)

    # ------------------------------------------------------
    # Other attendance.read roles
    # ------------------------------------------------------

    else:
        # Coarse permission without an established resource
        # scope must never become branch-wide access.
        abort(403)

    date_from = request.args.get(
        "date_from",
        type=str,
    )

    date_to = request.args.get(
        "date_to",
        type=str,
    )

    if date_from:
        try:
            date_from = datetime.strptime(
                date_from,
                "%Y-%m-%d",
            ).date()
        except ValueError:
            return jsonify({
                "success": False,
                "message": (
                    "Invalid date_from format. "
                    "Use YYYY-MM-DD"
                ),
            }), 400

    if date_to:
        try:
            date_to = datetime.strptime(
                date_to,
                "%Y-%m-%d",
            ).date()
        except ValueError:
            return jsonify({
                "success": False,
                "message": (
                    "Invalid date_to format. "
                    "Use YYYY-MM-DD"
                ),
            }), 400

    paginated = (
        AttendanceService.get_all_attendances_scoped(
            tenant_id=getattr(
                g,
                "tenant_id",
                None,
            ),
            branch_id=getattr(
                g,
                "branch_id",
                None,
            ),
            page=page,
            per_page=per_page,
            class_id=class_id,
            student_id=student_id,
            subject_id=subject_id,
            date_from=date_from,
            date_to=date_to,
            status=status,
        )
    )

    return jsonify({
        "success": True,
        "attendances": attendances_schema.dump(
            paginated.items
        ),
        "pagination": {
            "total": paginated.total,
            "pages": paginated.pages,
            "page": paginated.page,
            "per_page": paginated.per_page,
            "next": paginated.next_num,
            "prev": paginated.prev_num,
        },
    }), 200


@attendances_bp.route("/<int:attendance_id>", methods=["GET"])
@jwt_required()
@tenant_required
@require_permission("attendance.read")
def get_attendance(attendance_id):
    """Get one attendance inside current tenant/branch."""
    attendance = AttendanceService.get_attendance_by_id_scoped(
        attendance_id=attendance_id,
        tenant_id=getattr(g, "tenant_id", None),
        branch_id=getattr(g, "branch_id", None),
    )

    if not attendance:
        return jsonify({
            "success": False,
            "message": "Attendance record not found",
        }), 404

    roles = get_request_effective_roles(
        get_current_user()
    )

    if "teacher" in roles:
        if not _is_teacher_and_scoped_to_class(
            class_id=attendance.class_id
        ):
            abort(403)

    return jsonify({
        "success": True,
        "attendance": attendance_schema.dump(attendance),
    }), 200


@attendances_bp.route("/", methods=["POST"])
@jwt_required()
@tenant_required
@require_role(["teacher", "admin", "school_admin", "super_admin", "super_manager"])
@require_permission("attendance.create")
def create_attendance():
    """Create attendance using authoritative request scope."""
    try:
        data = attendance_create_schema.load(request.json)

        # Never trust a client-supplied actor.
        data["recorded_by"] = get_jwt_identity()

        tenant_id = getattr(g, "tenant_id", None)
        branch_id = getattr(g, "branch_id", None)

        class_id = data.get("class_id")

        roles = get_request_effective_roles(
            get_current_user()
        )

        if "teacher" in roles:
            if not _is_teacher_and_scoped_to_class(
                class_id=class_id
            ):
                abort(403)

        attendance, error = (
            AttendanceService.create_attendance_scoped(
                data,
                tenant_id=tenant_id,
                branch_id=branch_id,
            )
        )

        if error:
            return jsonify({
                "success": False,
                "message": error,
            }), 400

        return jsonify({
            "success": True,
            "message": (
                "Attendance record created successfully"
            ),
            "attendance": attendance_schema.dump(
                attendance
            ),
        }), 201

    except ValidationError as err:
        return jsonify({
            "success": False,
            "errors": err.messages,
        }), 400


@attendances_bp.route("/<int:attendance_id>", methods=["PUT"])
@jwt_required()
@tenant_required
@require_role(["teacher", "admin", "school_admin", "super_admin", "super_manager"])
@require_permission("attendance.update")
def update_attendance(attendance_id):
    """Update attendance inside current tenant/branch."""
    try:
        data = attendance_update_schema.load(request.json)

        tenant_id = getattr(g, "tenant_id", None)
        branch_id = getattr(g, "branch_id", None)

        attendance = (
            AttendanceService.get_attendance_by_id_scoped(
                attendance_id=attendance_id,
                tenant_id=tenant_id,
                branch_id=branch_id,
            )
        )

        if not attendance:
            return jsonify({
                "success": False,
                "message": "Attendance record not found",
            }), 404

        roles = get_request_effective_roles(
            get_current_user()
        )

        if "teacher" in roles:
            if not _is_teacher_and_scoped_to_class(
                class_id=attendance.class_id
            ):
                abort(403)

        # Server-authoritative actor on every mutation.
        data["recorded_by"] = get_jwt_identity()

        attendance, error = (
            AttendanceService.update_attendance_scoped(
                attendance_id,
                data,
                tenant_id=tenant_id,
                branch_id=branch_id,
            )
        )

        if error:
            return jsonify({
                "success": False,
                "message": error,
            }), 400

        return jsonify({
            "success": True,
            "message": (
                "Attendance record updated successfully"
            ),
            "attendance": attendance_schema.dump(
                attendance
            ),
        }), 200

    except ValidationError as err:
        return jsonify({
            "success": False,
            "errors": err.messages,
        }), 400


@attendances_bp.route("/<int:attendance_id>", methods=["DELETE"])
@jwt_required()
@tenant_required
@require_role(["admin", "school_admin", "super_admin", "super_manager"])
@require_permission("attendance.delete")
def delete_attendance(attendance_id):
    """Delete attendance inside current tenant/branch."""
    tenant_id = getattr(g, "tenant_id", None)
    branch_id = getattr(g, "branch_id", None)

    attendance = AttendanceService.get_attendance_by_id_scoped(
        attendance_id=attendance_id,
        tenant_id=tenant_id,
        branch_id=branch_id,
    )

    if not attendance:
        return jsonify({
            "success": False,
            "message": "Attendance record not found",
        }), 404

    success, error = (
        AttendanceService.delete_attendance_scoped(
            attendance_id,
            tenant_id=tenant_id,
            branch_id=branch_id,
        )
    )

    if error:
        return jsonify({
            "success": False,
            "message": error,
        }), 400

    return jsonify({
        "success": True,
        "message": "Attendance record deleted successfully",
    }), 200


@attendances_bp.route("/bulk", methods=["POST"])
@jwt_required()
@tenant_required
@require_role(["teacher", "admin", "school_admin", "super_admin", "super_manager"])
def bulk_create_attendance():
    """Create or update multiple attendance records atomically.

    Bulk attendance is an upsert operation. Callers therefore require both
    attendance.create and attendance.update.

    Teachers must additionally be assigned to the requested class. Class
    assignment narrows resource scope; it never substitutes for RBAC.
    """
    try:
        data = attendance_bulk_create_schema.load(request.json)

        # Audit authority is server-owned. Never accept a caller-supplied
        # recorded_by identity for attendance mutation.
        data["recorded_by"] = get_jwt_identity()

        # Bulk is an upsert: a single payload may create new rows and modify
        # existing canonical daily attendance rows. Require both capabilities
        # before entering service mutation logic.
        user_for_bulk = (
            db.session.query(User)
            .filter(User.id == get_jwt_identity())
            .first()
            if get_jwt_identity()
            else None
        )

        if not user_for_bulk:
            abort(403)

        effective_permissions = (
            get_request_effective_permissions(
                user_for_bulk
            )
        )

        required_permissions = {
            "attendance.create",
            "attendance.update",
        }

        if (
            "*" not in effective_permissions
            and not required_permissions.issubset(
                effective_permissions
            )
        ):
            abort(403)

        # Teachers have an additional resource-level boundary: permission to
        # upsert attendance does not authorize an unrelated class.
        # TenantMembership-derived request roles are authoritative.
        # Global User.role must neither create nor suppress teacher
        # resource scope inside a tenant request.
        effective_roles = get_request_effective_roles(
            user_for_bulk
        )
        if "teacher" in effective_roles:
            payload_class_id = None
            try:
                payload_class_id = (
                    int(data.get("class_id"))
                    if data.get("class_id") not in (None, "")
                    else None
                )
            except (TypeError, ValueError):
                payload_class_id = None

            if not _is_teacher_and_scoped_to_class(class_id=payload_class_id):
                abort(403)

        attendances, error = AttendanceService.bulk_create_attendance(
            data,
            tenant_id=g.tenant_id,
            branch_id=g.branch_id,
        )

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
    """Get tenant/branch-scoped attendance statistics."""
    class_id = request.args.get("class_id", type=int)
    student_id = request.args.get("student_id", type=int)

    date_from = request.args.get("date_from", type=str)
    date_to = request.args.get("date_to", type=str)

    if date_from:
        try:
            date_from = datetime.strptime(
                date_from,
                "%Y-%m-%d",
            ).date()
        except ValueError:
            return jsonify({
                "success": False,
                "message": (
                    "Invalid date_from format. "
                    "Use YYYY-MM-DD"
                ),
            }), 400

    if date_to:
        try:
            date_to = datetime.strptime(
                date_to,
                "%Y-%m-%d",
            ).date()
        except ValueError:
            return jsonify({
                "success": False,
                "message": (
                    "Invalid date_to format. "
                    "Use YYYY-MM-DD"
                ),
            }), 400

    stats, error = AttendanceService.get_attendance_stats(
        class_id,
        student_id,
        date_from,
        date_to,
        tenant_id=getattr(g, "tenant_id", None),
        branch_id=getattr(g, "branch_id", None),
    )

    if error:
        return jsonify({
            "success": False,
            "message": error,
        }), 400

    return jsonify({
        "success": True,
        "stats": stats,
    }), 200


@attendances_bp.route("/analytics/trends", methods=["GET"])
@jwt_required()
@tenant_required
@require_permission("attendance.reports")
def get_attendance_trends():
    """Get tenant/branch-scoped attendance trends."""
    class_id = request.args.get("class_id", type=int)
    student_id = request.args.get("student_id", type=int)

    date_from = request.args.get("date_from")
    date_to = request.args.get("date_to")

    try:
        if date_from:
            date_from = datetime.strptime(
                date_from,
                "%Y-%m-%d",
            ).date()

        if date_to:
            date_to = datetime.strptime(
                date_to,
                "%Y-%m-%d",
            ).date()

    except ValueError:
        return jsonify({
            "success": False,
            "message": (
                "Invalid date format. Use YYYY-MM-DD"
            ),
        }), 400

    trends, error = AttendanceService.get_attendance_trends(
        class_id,
        student_id,
        date_from,
        date_to,
        tenant_id=getattr(g, "tenant_id", None),
        branch_id=getattr(g, "branch_id", None),
    )

    if error:
        return jsonify({
            "success": False,
            "message": error,
        }), 400

    return jsonify({
        "success": True,
        "trends": trends,
    }), 200


@attendances_bp.route("/analytics/at-risk", methods=["GET"])
@jwt_required()
@tenant_required
@require_permission("attendance.reports")
def get_at_risk_students():
    """Get tenant/branch-scoped students with low attendance."""
    class_id = request.args.get("class_id", type=int)
    threshold = request.args.get("threshold", 80, type=int)

    students, error = AttendanceService.get_at_risk_students(
        class_id,
        threshold,
        tenant_id=getattr(g, "tenant_id", None),
        branch_id=getattr(g, "branch_id", None),
    )

    if error:
        return jsonify({
            "success": False,
            "message": error,
        }), 400

    return jsonify({
        "success": True,
        "students": students,
    }), 200



@attendances_bp.route("/sync", methods=["POST"])
@jwt_required()
@tenant_required
@require_role(
    [
        "teacher",
        "admin",
        "school_admin",
        "super_admin",
        "super_manager",
    ]
)
def sync_offline_attendance():
    """Synchronize offline attendance through canonical write authority.

    Offline synchronization is an upsert operation, so the caller requires
    both attendance.create and attendance.update.

    Teachers are additionally restricted to every Class referenced by the
    payload. TenantMembership-derived effective roles remain authoritative.
    """
    data = request.get_json(
        silent=True
    )

    if not isinstance(data, list):
        return (
            jsonify(
                {
                    "success": False,
                    "message": (
                        "Expected a list of "
                        "attendance records"
                    ),
                }
            ),
            400,
        )

    user_id = get_jwt_identity()

    try:
        user_id = int(user_id)
    except (
        TypeError,
        ValueError,
    ):
        abort(403)

    user = (
        db.session.query(User)
        .filter(
            User.id == user_id
        )
        .first()
    )

    if user is None:
        abort(403)

    permissions = (
        get_request_effective_permissions(
            user
        )
    )

    required_permissions = {
        "attendance.create",
        "attendance.update",
    }

    if (
        "*" not in permissions
        and not required_permissions.issubset(
            permissions
        )
    ):
        abort(403)

    effective_roles = (
        get_request_effective_roles(
            user
        )
    )

    # Teacher resource authorization must occur before any mutation.
    # Every referenced class must be one assigned to the authenticated
    # tenant teacher.
    if "teacher" in effective_roles:
        class_ids = set()

        for item in data:
            if not isinstance(
                item,
                dict,
            ):
                # Structural validation belongs to the service, but an
                # unparseable row cannot establish teacher class authority.
                abort(403)

            raw_class_id = item.get(
                "class_id"
            )

            try:
                class_id = int(
                    raw_class_id
                )
            except (
                TypeError,
                ValueError,
            ):
                abort(403)

            class_ids.add(
                class_id
            )

        if not class_ids:
            abort(403)

        for class_id in class_ids:
            if not (
                _is_teacher_and_scoped_to_class(
                    class_id=class_id
                )
            ):
                abort(403)

    result, error = (
        AttendanceService
        .sync_offline_attendance(
            data,
            recorded_by=user.id,
            tenant_id=g.tenant_id,
            branch_id=g.branch_id,
        )
    )

    if error:
        return (
            jsonify(
                {
                    "success": False,
                    "message": error,
                }
            ),
            400,
        )

    return (
        jsonify(
            {
                "success": True,
                "result": result,
            }
        ),
        200,
    )
