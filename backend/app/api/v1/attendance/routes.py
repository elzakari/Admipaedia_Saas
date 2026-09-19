import logging
from datetime import datetime

from flask import g, jsonify, request
from flask_jwt_extended import get_jwt_identity, jwt_required

from app.decorators.auth import role_required
from app.extensions import db
from app.models.associations import class_subjects, teacher_subjects
from app.models.class_ import Class, ClassTeacherMapping
from app.models.parent import Parent
from app.models.student import Student
from app.models.teacher import Teacher
from app.models.subject import Subject
from app.models.tenant import TenantMembership
from app.services.attendance_service import AttendanceService
from app.utils.tenant_context import tenant_required
from app.utils.rbac_decorators import get_current_user, get_request_effective_permissions, get_request_effective_roles, require_permission

from . import attendance_bp

logger = logging.getLogger(__name__)


def _active_attendance_membership(user_id, tenant_id):
    """Return the caller's active membership for the resolved tenant.

    TenantMembership is authoritative for the effective tenant role.
    Global User.role is deliberately not consulted here.
    """
    if user_id is None or tenant_id is None:
        return None

    return (
        TenantMembership.query
        .without_tenant_filter()
        .filter(
            TenantMembership.user_id == user_id,
            TenantMembership.tenant_id == tenant_id,
            TenantMembership.status == "active",
        )
        .first()
    )


def _attendance_teacher_ids(user_id, tenant_id, branch_id=None):
    """Resolve tenant-owned Teacher profile ids for the authenticated user."""
    query = (
        Teacher.query
        .without_tenant_filter()
        .filter(
            Teacher.user_id == user_id,
            Teacher.tenant_id == tenant_id,
        )
    )

    if branch_id is not None:
        query = query.filter(Teacher.branch_id == branch_id)

    return [int(row[0]) for row in query.with_entities(Teacher.id).all()]


def _attendance_teacher_can_access_class(
    user_id,
    class_obj,
    tenant_id,
    branch_id=None,
):
    """Check teacher assignment under exact tenant/branch authority.

    Identity domains:
      Class.teacher_id -> Teacher.id
      teacher_subjects.teacher_id -> Teacher.id
      ClassTeacherMapping.teacher_id -> User.id
    """
    if (
        user_id is None
        or tenant_id is None
        or class_obj is None
    ):
        return False

    # Never trust a previously resolved Class blindly.
    class_query = (
        Class.query
        .without_tenant_filter()
        .filter(
            Class.id == class_obj.id,
            Class.tenant_id == tenant_id,
        )
    )

    if branch_id is not None:
        class_query = class_query.filter(
            Class.branch_id == branch_id
        )

    authorized_class = class_query.first()

    if authorized_class is None:
        return False

    teacher_ids = _attendance_teacher_ids(
        user_id,
        tenant_id,
        branch_id=branch_id,
    )

    authorized_teacher_ids = {
        int(value)
        for value in teacher_ids
        if value is not None
    }

    if not authorized_teacher_ids:
        return False

    # Homeroom/direct assignment uses Teacher.id.
    if (
        authorized_class.teacher_id is not None
        and int(authorized_class.teacher_id)
        in authorized_teacher_ids
    ):
        return True

    # ClassTeacherMapping.teacher_id uses User.id.
    mapping_exists = (
        db.session.query(ClassTeacherMapping.id)
        .filter(
            ClassTeacherMapping.class_id
            == authorized_class.id,
            ClassTeacherMapping.teacher_id
            == user_id,
        )
        .first()
    )

    if mapping_exists is not None:
        return True

    # Subject assignment is valid only through a Subject
    # owned by the active tenant.
    try:
        assigned_subject_rows = (
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
                == authorized_class.id,
                Subject.tenant_id
                == tenant_id,
            )
            .all()
        )

        subject_ids = {
            int(row[0])
            for row in assigned_subject_rows
            if row
            and row[0] is not None
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
        # Authorization fails closed.
        return False



def _authorize_student_attendance_report(student_id):
    """Authorize access to one tenant-bound Student attendance resource.

    Returns:
        (student, None, None) when access is authorized.
        (None, message, status_code) when access must be denied.

    Security contract:
      * missing tenant context fails closed;
      * foreign-tenant / foreign-branch resources are concealed as 404;
      * TenantMembership.role is authoritative;
      * student access is self-only;
      * parent access is child-only;
      * teacher access requires an assigned authoritative class;
      * tenant administrators may access tenant/branch-owned students.
    """
    tenant_id = getattr(g, "tenant_id", None)
    branch_id = getattr(g, "branch_id", None)

    if tenant_id is None:
        return None, "Tenant context is required", 403

    try:
        user_id = int(get_jwt_identity())
    except (TypeError, ValueError):
        return None, "Unauthorized", 403

    membership = _active_attendance_membership(user_id, tenant_id)
    if membership is None:
        return None, "Unauthorized", 403

    student_query = (
        Student.query
        .without_tenant_filter()
        .filter(
            Student.id == student_id,
            Student.tenant_id == tenant_id,
        )
    )

    if branch_id is not None:
        student_query = student_query.filter(Student.branch_id == branch_id)

    student = student_query.first()
    if student is None:
        # Deliberately conceal foreign-tenant/foreign-branch resource existence.
        return None, "Student not found", 404

    role = str(membership.role or "").strip().lower()

    if role in {
        "admin",
        "school_admin",
        "super_admin",
        "super_manager",
    }:
        return student, None, None

    if role == "student":
        if student.user_id == user_id:
            return student, None, None
        return None, "Unauthorized", 403

    if role == "parent":
        parent_query = (
            Parent.query
            .without_tenant_filter()
            .filter(
                Parent.user_id == user_id,
                Parent.tenant_id == tenant_id,
            )
        )

        if branch_id is not None and hasattr(Parent, "branch_id"):
            parent_query = parent_query.filter(Parent.branch_id == branch_id)

        parent = parent_query.first()
        if parent is not None and student.parent_id == parent.id:
            return student, None, None

        return None, "Unauthorized", 403

    if role == "teacher":
        if student.class_id is None:
            return None, "Unauthorized", 403

        class_query = (
            Class.query
            .without_tenant_filter()
            .filter(
                Class.id == student.class_id,
                Class.tenant_id == tenant_id,
            )
        )

        if branch_id is not None:
            class_query = class_query.filter(Class.branch_id == branch_id)

        class_obj = class_query.first()
        if class_obj is None:
            return None, "Unauthorized", 403

        if _attendance_teacher_can_access_class(
            user_id,
            class_obj,
            tenant_id,
            branch_id=branch_id,
        ):
            return student, None, None

        return None, "Unauthorized", 403

    return None, "Unauthorized", 403


@attendance_bp.route("/student/<int:student_id>/report", methods=["GET"])
@jwt_required()
@tenant_required
@role_required(["admin", "teacher", "student", "parent"])
@require_permission("attendance.read")
def get_student_attendance_report(student_id):
    """Get detailed attendance report for a student."""
    try:
        _, authorization_error, authorization_status = (
            _authorize_student_attendance_report(student_id)
        )
        if authorization_error:
            return (
                jsonify(
                    {
                        "success": False,
                        "message": authorization_error,
                    }
                ),
                authorization_status,
            )

        date_from = request.args.get("date_from")
        date_to = request.args.get("date_to")
        class_id = request.args.get("class_id", type=int)
        subject_id = request.args.get("subject_id", type=int)
        tenant_id = getattr(g, "tenant_id", None)
        branch_id = getattr(g, "branch_id", None)

        # Convert date strings to date objects if provided
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

        report, error = AttendanceService.get_student_attendance_report(
            student_id, date_from, date_to, class_id, subject_id,
            tenant_id=tenant_id, branch_id=branch_id,
        )

        if error:
            return jsonify({"success": False, "message": error}), 400

        return jsonify({"success": True, "report": report}), 200

    except Exception as e:
        logger.exception(
            "Error getting student attendance report: %s",
            e,
        )
        return (
            jsonify(
                {
                    "success": False,
                    "message": "An error occurred while retrieving the attendance report",
                }
            ),
            500,
        )


@attendance_bp.route("/bulk-mark", methods=["POST"])
@jwt_required()
@tenant_required
@role_required(["admin", "teacher"])
@require_permission("attendance.create")
@require_permission("attendance.update")
def bulk_mark_attendance():
    """Mark attendance for multiple students in a class at once."""
    try:
        data = request.json

        if not data:
            return jsonify({"success": False, "message": "No data provided"}), 400

        class_id = data.get("class_id")
        date = data.get("date")
        attendances = data.get("attendances", [])

        # Get current user ID for recording
        current_user_id = get_jwt_identity()
        tenant_id = getattr(g, "tenant_id", None)
        branch_id = getattr(g, "branch_id", None)

        result, error = AttendanceService.bulk_mark_attendance(
            class_id, date, attendances, recorded_by=current_user_id,
            tenant_id=tenant_id, branch_id=branch_id,
        )

        if error:
            return jsonify({"success": False, "message": error}), 400

        return (
            jsonify(
                {
                    "success": True,
                    "message": f"Attendance marked successfully. {result['created']} created, {result['updated']} updated.",
                    "result": result,
                }
            ),
            200,
        )

    except Exception as e:
        logger.exception("Error in bulk mark attendance: %s", e)
        return (
            jsonify(
                {
                    "success": False,
                    "message": "An error occurred while marking attendance",
                }
            ),
            500,
        )


def _authorize_attendance_analytics(class_id=None):
    """Authorize attendance analytics in the active tenant context.

    Admin/school_admin:
        attendance.reports

    Teacher:
        attendance.read
        explicit class_id
        verified assignment to that class

    Teacher tenant/branch-wide analytics are intentionally denied.
    """
    user = get_current_user()

    if user is None:
        return (
            False,
            (
                jsonify(
                    {
                        "success": False,
                        "message":
                            "Authentication required",
                    }
                ),
                401,
            ),
        )

    tenant_id = getattr(
        g,
        "tenant_id",
        None,
    )

    branch_id = getattr(
        g,
        "branch_id",
        None,
    )

    if tenant_id is None:
        return (
            False,
            (
                jsonify(
                    {
                        "success": False,
                        "message":
                            "Tenant context required",
                    }
                ),
                403,
            ),
        )

    effective_roles = (
        get_request_effective_roles(user)
    )

    permissions = (
        get_request_effective_permissions(user)
    )

    # Platform authority remains governed by canonical
    # RBAC effective-permission resolution.
    if "*" in permissions:
        return True, None

    admin_roles = {
        "admin",
        "school_admin",
    }

    if admin_roles.intersection(
        effective_roles
    ):
        if (
            "attendance.reports"
            not in permissions
        ):
            return (
                False,
                (
                    jsonify(
                        {
                            "success": False,
                            "message":
                                "Insufficient permissions",
                        }
                    ),
                    403,
                ),
            )

        return True, None

    if "teacher" not in effective_roles:
        return (
            False,
            (
                jsonify(
                    {
                        "success": False,
                        "message":
                            "Insufficient role permissions",
                    }
                ),
                403,
            ),
        )

    if "attendance.read" not in permissions:
        return (
            False,
            (
                jsonify(
                    {
                        "success": False,
                        "message":
                            "Insufficient permissions",
                    }
                ),
                403,
            ),
        )

    # A teacher may not request whole-tenant or
    # whole-branch analytics.
    if class_id is None:
        return (
            False,
            (
                jsonify(
                    {
                        "success": False,
                        "message": (
                            "class_id is required for "
                            "teacher attendance analytics"
                        ),
                    }
                ),
                403,
            ),
        )

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

    class_obj = class_query.first()

    if class_obj is None:
        return (
            False,
            (
                jsonify(
                    {
                        "success": False,
                        "message": (
                            "Class not found in current "
                            "tenant/branch scope"
                        ),
                    }
                ),
                404,
            ),
        )

    if not _attendance_teacher_can_access_class(
        user.id,
        class_obj,
        tenant_id,
        branch_id=branch_id,
    ):
        return (
            False,
            (
                jsonify(
                    {
                        "success": False,
                        "message": (
                            "Teacher is not assigned "
                            "to this class"
                        ),
                    }
                ),
                403,
            ),
        )

    return True, None



@attendance_bp.route("/analytics", methods=["GET"])
@jwt_required()
@tenant_required
def get_attendance_analytics():
    """Get advanced attendance analytics.

    The nested analytics structure is canonical.

    Legacy flat fields are added as compatibility aliases without changing
    canonical exact-branch analytics semantics.
    """
    try:
        class_id = request.args.get(
            "class_id",
            type=int,
        )

        authorized, auth_response = (
            _authorize_attendance_analytics(
                class_id=class_id
            )
        )

        if not authorized:
            return auth_response

        date_from = request.args.get("date_from")
        date_to = request.args.get("date_to")

        if date_from:
            try:
                date_from = datetime.strptime(
                    date_from,
                    "%Y-%m-%d",
                ).date()
            except ValueError:
                return (
                    jsonify(
                        {
                            "success": False,
                            "message": (
                                "Invalid date_from format. "
                                "Use YYYY-MM-DD"
                            ),
                        }
                    ),
                    400,
                )

        if date_to:
            try:
                date_to = datetime.strptime(
                    date_to,
                    "%Y-%m-%d",
                ).date()
            except ValueError:
                return (
                    jsonify(
                        {
                            "success": False,
                            "message": (
                                "Invalid date_to format. "
                                "Use YYYY-MM-DD"
                            ),
                        }
                    ),
                    400,
                )

        tenant_id = getattr(
            g,
            "tenant_id",
            None,
        )

        branch_id = getattr(
            g,
            "branch_id",
            None,
        )

        # ----------------------------------------------------------
        # Canonical analytics:
        # exact Attendance.branch_id semantics remain untouched.
        # ----------------------------------------------------------
        analytics, error = (
            AttendanceService
            .get_advanced_attendance_analytics(
                class_id=class_id,
                date_from=date_from,
                date_to=date_to,
                tenant_id=tenant_id,
                branch_id=branch_id,
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

        # ----------------------------------------------------------
        # Historical flat compatibility projection.
        #
        # This is additive only. It does not replace or mutate
        # daily_stats/student_stats/overall_stats.
        # ----------------------------------------------------------
        legacy, legacy_error = (
            AttendanceService
            .get_historical_attendance_analytics_compat(
                class_id=class_id,
                date_from=date_from,
                date_to=date_to,
                tenant_id=tenant_id,
                branch_id=branch_id,
            )
        )

        if legacy_error:
            return (
                jsonify(
                    {
                        "success": False,
                        "message": legacy_error,
                    }
                ),
                400,
            )

        response_data = dict(analytics)

        response_data.update(
            {
                "rate": legacy["rate"],
                "by_status": legacy["by_status"],
                "total_records": legacy["total_records"],
            }
        )

        return (
            jsonify(
                {
                    "success": True,
                    "data": response_data,
                    "message": (
                        "Attendance analytics generated successfully"
                    ),
                }
            ),
            200,
        )

    except Exception as exc:
        logger.exception(
            "Error generating attendance analytics: %s",
            exc,
        )

        return (
            jsonify(
                {
                    "success": False,
                    "message": (
                        "An error occurred while generating "
                        "attendance analytics"
                    ),
                }
            ),
            500,
        )
