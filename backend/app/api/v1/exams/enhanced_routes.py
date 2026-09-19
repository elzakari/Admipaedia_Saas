"""
Enhanced Exam Routes for Advanced Exam Management
Provides endpoints for conflict detection, analytics, and scheduling optimization
"""

import logging
from datetime import date, datetime

from flask import Blueprint, g, jsonify, request
from flask_jwt_extended import get_jwt_identity, jwt_required

from app.models.exam import Exam
from app.models.parent import Parent
from app.models.student import Student
from app.models.subject import Subject
from app.models.class_ import Class
from app.models.user import User
from app.services.enhanced_exam_service import EnhancedExamService
from app.services.exam_service import ExamService
from app.services.identity_resolver import IdentityResolver
from app.utils.rbac_decorators import (
    get_request_effective_roles,
    require_permission,
    require_role,
)

logger = logging.getLogger(__name__)


def _enhanced_exam_allowed_class_ids(current_user):
    """Resolve tenant-effective class visibility for enhanced exam reads."""
    tenant_id = getattr(g, "tenant_id", None)
    branch_id = getattr(g, "branch_id", None)
    effective_roles = get_request_effective_roles(current_user)

    if effective_roles.intersection(
        {"super_admin", "platform_admin", "admin", "school_admin"}
    ):
        return None

    if "teacher" in effective_roles:
        return set(
            IdentityResolver.resolve_teacher_class_ids(current_user.id)
        )

    if "student" in effective_roles:
        student_query = (
            Student.query.without_tenant_filter()
            .filter(
                Student.user_id == current_user.id,
                Student.tenant_id == tenant_id,
            )
        )

        if branch_id is not None:
            student_query = student_query.filter(
                Student.branch_id == branch_id
            )

        student = student_query.first()

        if not student or student.class_id is None:
            return set()

        return {student.class_id}

    if "parent" in effective_roles:
        parent = (
            Parent.query.without_tenant_filter()
            .filter(
                Parent.user_id == current_user.id,
                Parent.tenant_id == tenant_id,
            )
            .first()
        )

        if not parent:
            return set()

        student_query = (
            Student.query.without_tenant_filter()
            .filter(
                Student.parent_id == parent.id,
                Student.tenant_id == tenant_id,
            )
        )

        if branch_id is not None:
            student_query = student_query.filter(
                Student.branch_id == branch_id
            )

        return {
            class_id
            for (class_id,) in student_query.with_entities(
                Student.class_id
            ).all()
            if class_id is not None
        }

    return set()


def _enhanced_exam_scope_denied_response():
    return (
        jsonify(
            {
                "success": False,
                "message": "Insufficient permissions for this class context",
            }
        ),
        403,
    )


def _enhanced_exam_is_authorized_for_user(exam, current_user):
    allowed_class_ids = _enhanced_exam_allowed_class_ids(current_user)

    if allowed_class_ids is None:
        return True

    return exam.class_id in allowed_class_ids

enhanced_exams_bp = Blueprint("enhanced_exams", __name__)


@enhanced_exams_bp.route("/conflicts/check", methods=["POST"])
@jwt_required()
@require_permission("exam.manage")
def check_exam_conflicts():
    """Check for exam scheduling conflicts"""
    try:
        data = request.get_json()

        # Validate required fields
        required_fields = ["class_id", "exam_date", "duration"]
        for field in required_fields:
            if field not in data:
                return (
                    jsonify(
                        {
                            "success": False,
                            "message": f"Missing required field: {field}",
                        }
                    ),
                    400,
                )

        # Parse exam date
        try:
            exam_date = datetime.fromisoformat(data["exam_date"].replace("Z", "+00:00"))
        except ValueError:
            return (
                jsonify(
                    {
                        "success": False,
                        "message": "Invalid exam_date format. Use ISO format.",
                    }
                ),
                400,
            )

        # Check conflicts
        # R13H.5B: authorize caller-controlled class resource
        tenant_id = getattr(g, "tenant_id", None)
        branch_id = getattr(g, "branch_id", None)

        class_query = (
            Class.query.without_tenant_filter()
            .filter(
                Class.id == data["class_id"],
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
                jsonify(
                    {
                        "success": False,
                        "message": "Class not found",
                    }
                ),
                404,
            )

        current_user = get_current_user()
        allowed_class_ids = _enhanced_exam_allowed_class_ids(
            current_user
        )

        if (
            allowed_class_ids is not None
            and class_obj.id not in allowed_class_ids
        ):
            return _enhanced_exam_scope_denied_response()

        conflicts = EnhancedExamService.detect_exam_conflicts(
            class_id=data["class_id"],
            exam_date=exam_date,
            duration=data["duration"],
            exam_id=data.get("exam_id"),
        )

        return jsonify({"success": True, "conflicts": conflicts}), 200

    except Exception as e:
        logger.error(f"Error checking exam conflicts: {str(e)}")
        return (
            jsonify(
                {
                    "success": False,
                    "message": "Failed to check conflicts",
                    "error": str(e),
                }
            ),
            500,
        )


@enhanced_exams_bp.route("/<int:exam_id>/analytics", methods=["GET"])
@jwt_required()
@require_permission("exam.read")
def get_exam_analytics(exam_id):
    """Get comprehensive analytics for an authorized exam."""
    try:
        exam = ExamService.get_exam_by_id(exam_id)
        if not exam:
            return jsonify(
                {
                    "success": False,
                    "message": "Exam not found",
                }
            ), 404

        current_user_id = get_jwt_identity()
        current_user = User.query.get(current_user_id)

        if not current_user:
            return jsonify(
                {
                    "success": False,
                    "message": "User not found",
                }
            ), 404

        if not _enhanced_exam_is_authorized_for_user(
            exam,
            current_user,
        ):
            return _enhanced_exam_scope_denied_response()

        analytics = EnhancedExamService.get_exam_analytics(
            exam_id
        )

        if not analytics:
            return jsonify(
                {
                    "success": False,
                    "message": "Exam analytics not available",
                }
            ), 404

        if "error" in analytics:
            return jsonify(
                {
                    "success": False,
                    "message": analytics["error"],
                }
            ), (
                404
                if "not found" in analytics["error"].lower()
                else 500
            )

        return jsonify(
            {
                "success": True,
                "analytics": analytics,
            }
        ), 200

    except Exception as e:
        logger.error(
            f"Error getting exam analytics: {str(e)}"
        )
        return (
            jsonify(
                {
                    "success": False,
                    "message": "Failed to get analytics",
                    "error": str(e),
                }
            ),
            500,
        )



@enhanced_exams_bp.route(
    "/classes/<int:class_id>/schedule",
    methods=["GET"],
)
@jwt_required()
@require_permission("exam.read")
def get_class_exam_schedule(class_id):
    """Get exam schedule for an authorized class."""
    try:
        current_user_id = get_jwt_identity()
        current_user = User.query.get(current_user_id)

        if not current_user:
            return jsonify(
                {
                    "success": False,
                    "message": "User not found",
                }
            ), 404

        allowed_class_ids = _enhanced_exam_allowed_class_ids(
            current_user
        )

        if (
            allowed_class_ids is not None
            and class_id not in allowed_class_ids
        ):
            return _enhanced_exam_scope_denied_response()

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
                                "Use YYYY-MM-DD."
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
                                "Use YYYY-MM-DD."
                            ),
                        }
                    ),
                    400,
                )

        schedule = EnhancedExamService.get_class_exam_schedule(
            class_id=class_id,
            date_from=date_from,
            date_to=date_to,
        )

        if not schedule:
            return jsonify(
                {
                    "success": False,
                    "message": "Class schedule not available",
                }
            ), 404

        if "error" in schedule:
            return jsonify(
                {
                    "success": False,
                    "message": schedule["error"],
                }
            ), (
                404
                if "not found" in schedule["error"].lower()
                else 500
            )

        return jsonify(
            {
                "success": True,
                "schedule": schedule,
            }
        ), 200

    except Exception as e:
        logger.error(
            f"Error getting class exam schedule: {str(e)}"
        )
        return (
            jsonify(
                {
                    "success": False,
                    "message": "Failed to get schedule",
                    "error": str(e),
                }
            ),
            500,
        )



@enhanced_exams_bp.route("/duration/calculate", methods=["POST"])
@jwt_required()
@require_permission("exam.read")
def calculate_optimal_duration():
    """Calculate optimal exam duration."""
    try:
        data = request.get_json() or {}

        required_fields = [
            "subject_id",
            "total_marks",
        ]

        for field in required_fields:
            if field not in data:
                return (
                    jsonify(
                        {
                            "success": False,
                            "message": (
                                f"Missing required field: {field}"
                            ),
                        }
                    ),
                    400,
                )

        # R13H.5B: authorize caller-controlled subject resource
        tenant_id = getattr(g, "tenant_id", None)

        subject_obj = (
            Subject.query.without_tenant_filter()
            .filter(
                Subject.id == data["subject_id"],
                Subject.tenant_id == tenant_id,
            )
            .first()
        )

        if subject_obj is None:
            return (
                jsonify(
                    {
                        "success": False,
                        "message": "Subject not found",
                    }
                ),
                404,
            )

        duration_info = (
            EnhancedExamService.calculate_optimal_exam_duration(
                subject_id=data["subject_id"],
                total_marks=data["total_marks"],
                exam_type=data.get(
                    "exam_type",
                    "regular",
                ),
            )
        )

        return jsonify(
            {
                "success": True,
                "duration_info": duration_info,
            }
        ), 200

    except Exception as e:
        logger.error(
            f"Error calculating optimal duration: {str(e)}"
        )
        return (
            jsonify(
                {
                    "success": False,
                    "message": (
                        "Failed to calculate duration"
                    ),
                    "error": str(e),
                }
            ),
            500,
        )



@enhanced_exams_bp.route("/batch-analytics", methods=["POST"])
@jwt_required()
@require_permission("exam.read")
def get_batch_exam_analytics():
    """Get analytics for a fully authorized set of exams."""
    try:
        data = request.get_json() or {}
        exam_ids = data.get("exam_ids", [])

        if not exam_ids:
            return jsonify(
                {
                    "success": False,
                    "message": "No exam IDs provided",
                }
            ), 400

        current_user_id = get_jwt_identity()
        current_user = User.query.get(current_user_id)

        if not current_user:
            return jsonify(
                {
                    "success": False,
                    "message": "User not found",
                }
            ), 404

        authorized_exams = []

        # Authorization phase: fail closed before analytics.
        for exam_id in exam_ids:
            exam = ExamService.get_exam_by_id(exam_id)

            if not exam:
                return jsonify(
                    {
                        "success": False,
                        "message": (
                            "One or more exams are unavailable"
                        ),
                    }
                ), 404

            if not _enhanced_exam_is_authorized_for_user(
                exam,
                current_user,
            ):
                return _enhanced_exam_scope_denied_response()

            authorized_exams.append(exam)

        analytics_results = []

        # Computation phase only after the entire batch is authorized.
        for exam in authorized_exams:
            analytics = EnhancedExamService.get_exam_analytics(
                exam.id
            )

            if not analytics:
                return jsonify(
                    {
                        "success": False,
                        "message": (
                            "One or more exam analytics "
                            "are unavailable"
                        ),
                    }
                ), 404

            if "error" in analytics:
                return jsonify(
                    {
                        "success": False,
                        "message": (
                            "One or more exam analytics "
                            "could not be retrieved"
                        ),
                    }
                ), 404

            analytics_results.append(analytics)

        total_students = sum(
            result["total_students"]
            for result in analytics_results
        )

        statistics_results = [
            result["statistics"]
            for result in analytics_results
            if result.get("statistics")
        ]

        if statistics_results:
            avg_pass_rate = (
                sum(
                    statistics.get(
                        "pass_rate",
                        0,
                    )
                    for statistics in statistics_results
                )
                / len(statistics_results)
            )
        else:
            avg_pass_rate = 0

        aggregate_stats = {
            "total_exams": len(analytics_results),
            "total_students": total_students,
            "average_pass_rate": round(
                avg_pass_rate,
                2,
            ),
            "exams_analyzed": len(
                analytics_results
            ),
        }

        return (
            jsonify(
                {
                    "success": True,
                    "analytics": analytics_results,
                    "aggregate_statistics": aggregate_stats,
                }
            ),
            200,
        )

    except Exception as e:
        logger.error(
            f"Error getting batch analytics: {str(e)}"
        )
        return (
            jsonify(
                {
                    "success": False,
                    "message": (
                        "Failed to get batch analytics"
                    ),
                    "error": str(e),
                }
            ),
            500,
        )



@enhanced_exams_bp.route("/performance-trends", methods=["GET"])
@jwt_required()
@require_permission("exam.read")
def get_performance_trends():
    """Get authorized performance trends across exams."""
    try:
        class_id = request.args.get(
            "class_id",
            type=int,
        )
        subject_id = request.args.get(
            "subject_id",
            type=int,
        )
        date_from = request.args.get("date_from")
        date_to = request.args.get("date_to")

        current_user_id = get_jwt_identity()
        current_user = User.query.get(current_user_id)

        if not current_user:
            return jsonify(
                {
                    "success": False,
                    "message": "User not found",
                }
            ), 404

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
            return jsonify(
                {
                    "success": False,
                    "message": "Tenant context required",
                }
            ), 403

        allowed_class_ids = _enhanced_exam_allowed_class_ids(
            current_user
        )

        if (
            class_id is not None
            and allowed_class_ids is not None
            and class_id not in allowed_class_ids
        ):
            return _enhanced_exam_scope_denied_response()

        query = (
            Exam.query
            .join(
                Class,
                Exam.class_id == Class.id,
            )
            .filter(
                Class.tenant_id == tenant_id
            )
        )

        if branch_id is not None:
            query = query.filter(
                Class.branch_id == branch_id
            )

        if allowed_class_ids is not None:
            if not allowed_class_ids:
                query = query.filter(False)
            else:
                query = query.filter(
                    Exam.class_id.in_(
                        allowed_class_ids
                    )
                )

        if class_id is not None:
            query = query.filter(
                Exam.class_id == class_id
            )

        if subject_id is not None:
            query = query.filter(
                Exam.subject_id == subject_id
            )

        if date_from:
            query = query.filter(
                Exam.exam_date
                >= datetime.strptime(
                    date_from,
                    "%Y-%m-%d",
                )
            )

        if date_to:
            query = query.filter(
                Exam.exam_date
                <= datetime.strptime(
                    date_to,
                    "%Y-%m-%d",
                )
            )

        exams = query.order_by(
            Exam.exam_date
        ).all()

        trends = []

        for exam in exams:
            analytics = EnhancedExamService.get_exam_analytics(
                exam.id
            )

            if not analytics:
                continue

            if (
                "error" not in analytics
                and analytics.get("statistics")
            ):
                trends.append(
                    {
                        "exam_id": exam.id,
                        "title": exam.title,
                        "subject": exam.subject.name,
                        "exam_date": (
                            exam.exam_date.isoformat()
                        ),
                        "mean_score": (
                            analytics["statistics"]["mean"]
                        ),
                        "pass_rate": (
                            analytics["statistics"]["pass_rate"]
                        ),
                        "total_students": (
                            analytics["total_students"]
                        ),
                    }
                )

        return (
            jsonify(
                {
                    "success": True,
                    "trends": trends,
                    "summary": {
                        "total_exams": len(trends),
                        "date_range": {
                            "from": (
                                trends[0]["exam_date"]
                                if trends
                                else None
                            ),
                            "to": (
                                trends[-1]["exam_date"]
                                if trends
                                else None
                            ),
                        },
                    },
                }
            ),
            200,
        )

    except ValueError:
        return jsonify(
            {
                "success": False,
                "message": (
                    "Invalid date format. "
                    "Use YYYY-MM-DD."
                ),
            }
        ), 400

    except Exception as e:
        logger.error(
            f"Error getting performance trends: {str(e)}"
        )
        return (
            jsonify(
                {
                    "success": False,
                    "message": (
                        "Failed to get performance trends"
                    ),
                    "error": str(e),
                }
            ),
            500,
        )



# Error handlers
@enhanced_exams_bp.errorhandler(400)
def bad_request(error):
    return (
        jsonify({"success": False, "message": "Bad request", "error": str(error)}),
        400,
    )


@enhanced_exams_bp.errorhandler(404)
def not_found(error):
    return (
        jsonify(
            {"success": False, "message": "Resource not found", "error": str(error)}
        ),
        404,
    )


@enhanced_exams_bp.errorhandler(500)
def internal_error(error):
    return (
        jsonify(
            {"success": False, "message": "Internal server error", "error": str(error)}
        ),
        500,
    )
