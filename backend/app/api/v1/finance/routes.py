from flask import Blueprint, g, jsonify, request
from flask_jwt_extended import get_jwt_identity, jwt_required

from app.extensions import db
from app.models.finance import FeeCategory, FeeStructure, Payment, StudentFee
from app.models.parent import Parent
from app.models.student import Student
from app.models.user import User
from app.services.finance.service import FeeService
from app.utils.finance_scope import (
    scoped_payments,
    scoped_student_fees,
    scoped_students,
)
from app.utils.rbac_decorators import get_request_effective_roles, require_permission, require_role

finance_bp = Blueprint("finance", __name__)

# --- Fee Structures ---


@finance_bp.route("/structures", methods=["POST"])
@jwt_required()
@require_permission("finance.manage")
def create_structure():
    """Create a fee structure."""
    data = request.json
    structure, error = FeeService.create_fee_structure(data)
    if error:
        return jsonify({"success": False, "message": error}), 400

    return (
        jsonify(
            {"success": True, "message": "Fee structure created", "id": structure.id}
        ),
        201,
    )


@finance_bp.route("/structures/<int:id>/assign", methods=["POST"])
@jwt_required()
@require_permission("finance.manage")
def assign_structure(id):
    """Assign a fee structure to eligible students."""
    count, error = FeeService.assign_fees_to_students(id)
    if error:
        return jsonify({"success": False, "message": error}), 400

    return jsonify({"success": True, "message": f"Assigned to {count} students"}), 200


# --- Payments ---


@finance_bp.route("/payments", methods=["POST"])
@jwt_required()
@require_permission("finance.collect")
def record_payment():
    """Record a payment."""
    data = request.json
    user_id = get_jwt_identity()

    payment, error = FeeService.record_payment(data, user_id)
    if error:
        return jsonify({"success": False, "message": error}), 400

    return (
        jsonify({"success": True, "message": "Payment recorded", "id": payment.id}),
        201,
    )


# --- Student Views ---


@finance_bp.route("/students/<int:student_id>/balance", methods=["GET"])
@jwt_required()
def get_balance(student_id):
    """Get student balance."""
    user_id = get_jwt_identity()
    user = User.query.get(user_id)
    if not user:
        return jsonify({"success": False, "message": "User not found"}), 404

    # SECURITY: prove ownership before role-specific authorization.
    student = (
        scoped_students()
        .filter(Student.id == student_id)
        .first()
    )
    if not student:
        return jsonify(
            {"success": False, "message": "Student not found"}
        ), 404

    # SECURITY:
    # Authorization comes from the active membership for THIS tenant,
    # never from the legacy global User.role value.
    effective_roles = get_request_effective_roles(user)

    privileged_roles = {
        "school_admin",
        "admin",
        "super_admin",
        "super_manager",
    }

    if not (effective_roles & privileged_roles):
        if "parent" in effective_roles:
            parent = Parent.query.filter_by(
                user_id=user_id,
                tenant_id=getattr(g, "tenant_id", None),
            ).first()

            if not parent or student.parent_id != parent.id:
                return (
                    jsonify(
                        {
                            "success": False,
                            "message": "Unauthorized",
                        }
                    ),
                    403,
                )

        elif "student" in effective_roles:
            if student.user_id != user_id:
                return (
                    jsonify(
                        {
                            "success": False,
                            "message": "Unauthorized",
                        }
                    ),
                    403,
                )

        else:
            return (
                jsonify(
                    {
                        "success": False,
                        "message": "Unauthorized",
                    }
                ),
                403,
            )

    balance = FeeService.get_student_balance(student_id)
    return jsonify({"success": True, "balance": balance}), 200


@finance_bp.route("/students/<int:student_id>/ledger", methods=["GET"])
@jwt_required()
def get_ledger(student_id):
    """Get student fee ledger (invoices and payments)."""
    user_id = get_jwt_identity()
    user = User.query.get(user_id)
    if not user:
        return jsonify({"success": False, "message": "User not found"}), 404

    # SECURITY: prove ownership before role-specific authorization.
    student = (
        scoped_students()
        .filter(Student.id == student_id)
        .first()
    )
    if not student:
        return jsonify(
            {"success": False, "message": "Student not found"}
        ), 404

    # SECURITY:
    # Authorization comes from the active membership for THIS tenant,
    # never from the legacy global User.role value.
    effective_roles = get_request_effective_roles(user)

    privileged_roles = {
        "school_admin",
        "admin",
        "super_admin",
        "super_manager",
    }

    if not (effective_roles & privileged_roles):
        if "parent" in effective_roles:
            parent = Parent.query.filter_by(
                user_id=user_id,
                tenant_id=getattr(g, "tenant_id", None),
            ).first()

            if not parent or student.parent_id != parent.id:
                return (
                    jsonify(
                        {
                            "success": False,
                            "message": "Unauthorized",
                        }
                    ),
                    403,
                )

        elif "student" in effective_roles:
            if student.user_id != user_id:
                return (
                    jsonify(
                        {
                            "success": False,
                            "message": "Unauthorized",
                        }
                    ),
                    403,
                )

        else:
            return (
                jsonify(
                    {
                        "success": False,
                        "message": "Unauthorized",
                    }
                ),
                403,
            )

    fees = (
        scoped_student_fees()
        .filter(StudentFee.student_id == student_id)
        .all()
    )
    payments = (
        scoped_payments()
        .filter(Payment.student_id == student_id)
        .all()
    )

    return (
        jsonify(
            {
                "success": True,
                "fees": [
                    {
                        "id": f.id,
                        "category": f.structure.category.name,
                        "amount": float(f.final_amount),
                        "balance": float(f.balance),
                        "status": f.status,
                        "due_date": (
                            f.structure.due_date.isoformat()
                            if f.structure.due_date
                            else None
                        ),
                    }
                    for f in fees
                ],
                "payments": [
                    {
                        "id": p.id,
                        "amount": float(p.amount),
                        "date": p.paid_at.isoformat(),
                        "method": p.payment_method,
                        "ref": p.transaction_id,
                    }
                    for p in payments
                ],
            }
        ),
        200,
    )
