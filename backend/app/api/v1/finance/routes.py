from flask import Blueprint, request, jsonify
from app.services.finance.service import FeeService
from app.models.finance import FeeStructure, FeeCategory, StudentFee, Payment
from app.models.user import User
from app.models.student import Student
from app.models.parent import Parent
from app.extensions import db
from flask_jwt_extended import jwt_required, get_jwt_identity
from app.utils.rbac_decorators import require_permission, require_role

finance_bp = Blueprint('finance', __name__)

# --- Fee Structures ---

@finance_bp.route('/structures', methods=['POST'])
@jwt_required()
@require_permission('finance.manage')
def create_structure():
    """Create a fee structure."""
    data = request.json
    structure, error = FeeService.create_fee_structure(data)
    if error:
        return jsonify({'success': False, 'message': error}), 400
    
    return jsonify({'success': True, 'message': 'Fee structure created', 'id': structure.id}), 201

@finance_bp.route('/structures/<int:id>/assign', methods=['POST'])
@jwt_required()
@require_permission('finance.manage')
def assign_structure(id):
    """Assign a fee structure to eligible students."""
    count, error = FeeService.assign_fees_to_students(id)
    if error:
        return jsonify({'success': False, 'message': error}), 400
        
    return jsonify({'success': True, 'message': f'Assigned to {count} students'}), 200

# --- Payments ---

@finance_bp.route('/payments', methods=['POST'])
@jwt_required()
@require_permission('finance.collect')
def record_payment():
    """Record a payment."""
    data = request.json
    user_id = get_jwt_identity()
    
    payment, error = FeeService.record_payment(data, user_id)
    if error:
        return jsonify({'success': False, 'message': error}), 400
        
    return jsonify({'success': True, 'message': 'Payment recorded', 'id': payment.id}), 201

# --- Student Views ---

@finance_bp.route('/students/<int:student_id>/balance', methods=['GET'])
@jwt_required()
def get_balance(student_id):
    """Get student balance."""
    user_id = get_jwt_identity()
    user = User.query.get(user_id)
    if not user:
        return jsonify({'success': False, 'message': 'User not found'}), 404

    if user.role != 'admin':
        if user.role != 'parent':
            return jsonify({'success': False, 'message': 'Unauthorized'}), 403
        parent = Parent.query.filter_by(user_id=user_id).first()
        student = Student.query.get(student_id)
        if not parent or not student or student.parent_id != parent.id:
            return jsonify({'success': False, 'message': 'Unauthorized'}), 403

    balance = FeeService.get_student_balance(student_id)
    return jsonify({'success': True, 'balance': balance}), 200

@finance_bp.route('/students/<int:student_id>/ledger', methods=['GET'])
@jwt_required()
def get_ledger(student_id):
    """Get student fee ledger (invoices and payments)."""
    user_id = get_jwt_identity()
    user = User.query.get(user_id)
    if not user:
        return jsonify({'success': False, 'message': 'User not found'}), 404

    if user.role != 'admin':
        if user.role != 'parent':
            return jsonify({'success': False, 'message': 'Unauthorized'}), 403
        parent = Parent.query.filter_by(user_id=user_id).first()
        student = Student.query.get(student_id)
        if not parent or not student or student.parent_id != parent.id:
            return jsonify({'success': False, 'message': 'Unauthorized'}), 403

    fees = StudentFee.query.filter_by(student_id=student_id).all()
    payments = Payment.query.filter_by(student_id=student_id).all()
    
    return jsonify({
        'success': True,
        'fees': [{
            'id': f.id,
            'category': f.structure.category.name,
            'amount': float(f.final_amount),
            'balance': float(f.balance),
            'status': f.status,
            'due_date': f.structure.due_date.isoformat() if f.structure.due_date else None
        } for f in fees],
        'payments': [{
            'id': p.id,
            'amount': float(p.amount),
            'date': p.paid_at.isoformat(),
            'method': p.payment_method,
            'ref': p.transaction_id
        } for p in payments]
    }), 200
