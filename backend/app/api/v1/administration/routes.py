from flask import request, jsonify, current_app
from flask_jwt_extended import jwt_required, get_jwt_identity
from app.api.v1.administration import administration_bp
from app.services.administration_service import AdministrationService
from app.schemas.administration import (
    BudgetSchema, BudgetCreateSchema, BudgetUpdateSchema,
    TransactionSchema, TransactionCreateSchema, TransactionUpdateSchema,
    FeeStructureSchema, FeeStructureCreateSchema, FeeStructureUpdateSchema,
    # FeeRecordSchema, FeeRecordCreateSchema,
    # FeePaymentSchema, FeePaymentCreateSchema,
    FinancialSummarySchema,

    # Infrastructure schemas
    FacilitySchema, MaintenanceRequestSchema, AssetSchema,
    InfrastructureSummarySchema, SystemSettingSchema
)
from app.utils.auth_utils import admin_required, teacher_required
from marshmallow import ValidationError
from app.extensions import db
from datetime import datetime, date
from app.models.system_setting import SystemSetting
from app.models.finance import FeeCategory, FeeStructure, StudentFee, Payment, PaymentAllocation
from app.models.student import Student
from sqlalchemy import func
import uuid

# Initialize schemas
budget_schema = BudgetSchema()
budgets_schema = BudgetSchema(many=True)
budget_create_schema = BudgetCreateSchema()
budget_update_schema = BudgetUpdateSchema()

system_setting_schema = SystemSettingSchema()
system_settings_schema = SystemSettingSchema(many=True)

transaction_schema = TransactionSchema()
transactions_schema = TransactionSchema(many=True)
transaction_create_schema = TransactionCreateSchema()
transaction_update_schema = TransactionUpdateSchema()

# Fee Schemas are deprecated
# fee_structure_schema = FeeStructureSchema()
# fee_structures_schema = FeeStructureSchema(many=True)
# fee_structure_create_schema = FeeStructureCreateSchema()
# fee_structure_update_schema = FeeStructureUpdateSchema()
#
# fee_record_schema = FeeRecordSchema()
# fee_records_schema = FeeRecordSchema(many=True)
# fee_record_create_schema = FeeRecordCreateSchema()
#
# fee_payment_schema = FeePaymentSchema()
# fee_payments_schema = FeePaymentSchema(many=True)
# fee_payment_create_schema = FeePaymentCreateSchema()

financial_summary_schema = FinancialSummarySchema()


# Infrastructure schemas
facility_schema = FacilitySchema()
facilities_schema = FacilitySchema(many=True)

maintenance_request_schema = MaintenanceRequestSchema()
maintenance_requests_schema = MaintenanceRequestSchema(many=True)

asset_schema = AssetSchema()
assets_schema = AssetSchema(many=True)

infrastructure_summary_schema = InfrastructureSummarySchema()

# Initialize service
administration_service = AdministrationService(db.session)


def _serialize_fee_template_group(group_rows, category_by_id):
    first = group_rows[0]
    academic_year = str(getattr(first, 'academic_year', None) or 'unknown')
    term = str(getattr(first, 'term', None) or 'unknown')
    class_id = getattr(first, 'class_id', None)
    total = sum(float(r.amount or 0) for r in group_rows)
    return {
        'id': f"{academic_year}__{term}__{class_id or 0}",
        'class_id': class_id,
        'academic_year': academic_year,
        'term': term,
        'due_date': first.due_date.isoformat() if first.due_date else None,
        'items': [
            {
                'fee_structure_id': r.id,
                'category_id': r.fee_category_id,
                'category': category_by_id.get(r.fee_category_id, 'Unknown'),
                'amount': float(r.amount or 0)
            }
            for r in sorted(group_rows, key=lambda x: category_by_id.get(x.fee_category_id, ''))
        ],
        'total_amount': total,
        'created_at': first.created_at.isoformat() if getattr(first, 'created_at', None) else None
    }


def _parse_group_id(group_id: str):
    parts = (group_id or '').split('__')
    if len(parts) != 3:
        return None
    academic_year, term, class_id_str = parts
    try:
        class_id = int(class_id_str)
    except Exception:
        return None
    return academic_year, term, (None if class_id == 0 else class_id)


@administration_bp.route('/fee-structures', methods=['GET'])
@administration_bp.route('/fee-structures/', methods=['GET'])
@jwt_required()
@admin_required
def get_fee_structure_groups():
    try:
        academic_year = request.args.get('academic_year', type=str)
        term = request.args.get('term', type=str)
        class_id = request.args.get('class_id', type=int)
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 20, type=int)

        query = FeeStructure.query
        if academic_year:
            query = query.filter(FeeStructure.academic_year == academic_year)
        if term:
            query = query.filter(FeeStructure.term == term)
        if class_id:
            query = query.filter(FeeStructure.class_id == class_id)

        rows = query.order_by(FeeStructure.id.desc()).all()
        categories = FeeCategory.query.all()
        category_by_id = {c.id: c.name for c in categories}

        grouped = {}
        for r in rows:
            key = (r.academic_year, r.term, r.class_id)
            grouped.setdefault(key, []).append(r)

        groups_list = [_serialize_fee_template_group(v, category_by_id) for v in grouped.values()]
        groups_list.sort(
            key=lambda g: (
                str(g.get('academic_year') or ''),
                str(g.get('term') or ''),
                int(g.get('class_id') or 0)
            ),
            reverse=True
        )

        total = len(groups_list)
        start = (page - 1) * per_page
        end = start + per_page
        page_items = groups_list[start:end]

        return jsonify({
            'success': True,
            'fee_structures': page_items,
            'pagination': {
                'total': total,
                'pages': (total + per_page - 1) // per_page,
                'page': page,
                'per_page': per_page
            }
        }), 200
    except Exception as e:
        try:
            current_app.logger.exception("Error getting fee structures")
        except Exception:
            pass

        if getattr(current_app, 'debug', False):
            return jsonify({
                'success': False,
                'message': str(e),
                'error_type': type(e).__name__
            }), 500
        return jsonify({'success': False, 'message': 'An error occurred while retrieving fee structures'}), 500


@administration_bp.route('/fee-structures', methods=['POST'])
@administration_bp.route('/fee-structures/', methods=['POST'])
@jwt_required()
@admin_required
def create_fee_structure_group():
    try:
        data = request.get_json() or {}
        academic_year = (data.get('academic_year') or '').strip()
        term = (data.get('term') or '').strip()
        class_id = data.get('class_id')
        items = data.get('items') or []
        due_date_raw = data.get('due_date')

        if not academic_year or not term or not isinstance(items, list) or len(items) == 0:
            return jsonify({'success': False, 'message': 'academic_year, term, and items are required'}), 400

        due_date = None
        if due_date_raw:
            try:
                due_date = datetime.fromisoformat(str(due_date_raw).replace('Z', '+00:00')).date()
            except Exception:
                due_date = None

        if class_id in (0, '0', '', None):
            class_id = None
        else:
            try:
                class_id = int(class_id)
            except Exception:
                return jsonify({'success': False, 'message': 'Invalid class_id'}), 400

        FeeStructure.query.filter(
            FeeStructure.academic_year == academic_year,
            FeeStructure.term == term,
            (FeeStructure.class_id == class_id)
        ).delete(synchronize_session=False)

        created = []
        for it in items:
            name = (it.get('category') or it.get('category_name') or '').strip()
            amount = it.get('amount')
            if not name:
                continue
            try:
                amount_val = float(amount)
            except Exception:
                amount_val = 0.0

            category = FeeCategory.query.filter(func.lower(FeeCategory.name) == name.lower()).first()
            if not category:
                category = FeeCategory(name=name)
                db.session.add(category)
                db.session.flush()

            structure = FeeStructure(
                fee_category_id=category.id,
                class_id=class_id,
                academic_year=academic_year,
                term=term,
                amount=amount_val,
                due_date=due_date
            )
            db.session.add(structure)
            created.append(structure)

        db.session.commit()

        categories = FeeCategory.query.all()
        category_by_id = {c.id: c.name for c in categories}
        group = _serialize_fee_template_group(created, category_by_id)

        return jsonify({'success': True, 'fee_structure': group}), 201
    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Error creating fee structure group: {str(e)}")
        return jsonify({'success': False, 'message': 'An error occurred while creating fee structure'}), 500


@administration_bp.route('/fee-structures/<group_id>', methods=['PUT'])
@jwt_required()
@admin_required
def update_fee_structure_group(group_id):
    parsed = _parse_group_id(group_id)
    if not parsed:
        return jsonify({'success': False, 'message': 'Invalid fee structure group id'}), 400
    academic_year, term, class_id = parsed

    data = request.get_json() or {}
    data['academic_year'] = academic_year
    data['term'] = term
    data['class_id'] = class_id or 0
    return create_fee_structure_group()


@administration_bp.route('/fee-structures/<group_id>', methods=['DELETE'])
@jwt_required()
@admin_required
def delete_fee_structure_group(group_id):
    parsed = _parse_group_id(group_id)
    if not parsed:
        return jsonify({'success': False, 'message': 'Invalid fee structure group id'}), 400
    academic_year, term, class_id = parsed
    try:
        FeeStructure.query.filter(
            FeeStructure.academic_year == academic_year,
            FeeStructure.term == term,
            (FeeStructure.class_id == class_id)
        ).delete(synchronize_session=False)
        db.session.commit()
        return jsonify({'success': True}), 200
    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Error deleting fee structure group: {str(e)}")
        return jsonify({'success': False, 'message': 'Failed to delete fee structure'}), 500


@administration_bp.route('/fee-structures/<group_id>/assign', methods=['POST'])
@jwt_required()
@admin_required
def assign_fee_structure_group(group_id):
    parsed = _parse_group_id(group_id)
    if not parsed:
        return jsonify({'success': False, 'message': 'Invalid fee structure group id'}), 400
    academic_year, term, class_id = parsed

    data = request.get_json() or {}
    student_id = data.get('student_id')
    try:
        q = FeeStructure.query.filter(
            FeeStructure.academic_year == academic_year,
            FeeStructure.term == term,
            (FeeStructure.class_id == class_id)
        )
        structures = q.all()
        if not structures:
            return jsonify({'success': False, 'message': 'No fee structures found for this group'}), 404

        student_query = Student.query
        if student_id:
            student_query = student_query.filter(Student.id == int(student_id))
        elif class_id:
            student_query = student_query.filter(Student.class_id == class_id)

        students = student_query.all()
        created_count = 0
        for student in students:
            for s in structures:
                existing = StudentFee.query.filter_by(student_id=student.id, fee_structure_id=s.id).first()
                if existing:
                    continue
                amt = float(s.amount or 0)
                fee = StudentFee(
                    student_id=student.id,
                    fee_structure_id=s.id,
                    original_amount=amt,
                    discount_amount=0.0,
                    final_amount=amt,
                    paid_amount=0.0,
                    balance=amt,
                    status='pending'
                )
                db.session.add(fee)
                created_count += 1

        db.session.commit()
        return jsonify({'success': True, 'created': created_count}), 200
    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Error assigning fee structure group: {str(e)}")
        return jsonify({'success': False, 'message': 'Failed to assign fee structure'}), 500


@administration_bp.route('/fee-records/<int:fee_record_id>/payments', methods=['GET'])
@jwt_required()
@admin_required
def get_fee_record_payments(fee_record_id):
    try:
        fee = StudentFee.query.get(fee_record_id)
        if not fee:
            return jsonify({'success': False, 'message': 'Fee record not found'}), 404

        allocations = PaymentAllocation.query.filter_by(student_fee_id=fee.id).all()
        payment_ids = [a.payment_id for a in allocations]
        payments = Payment.query.filter(Payment.id.in_(payment_ids)).all() if payment_ids else []
        payment_by_id = {p.id: p for p in payments}

        out = []
        for a in allocations:
            p = payment_by_id.get(a.payment_id)
            if not p:
                continue
            out.append({
                'id': p.id,
                'fee_record_id': fee.id,
                'amount': float(a.amount_allocated or 0),
                'payment_method': p.payment_method,
                'reference_number': p.transaction_id,
                'payment_date': p.paid_at.date().isoformat() if p.paid_at else None,
                'created_by': p.recorded_by,
                'created_at': p.paid_at.isoformat() if p.paid_at else None
            })

        out.sort(key=lambda x: x.get('created_at') or '', reverse=True)
        return jsonify(out), 200
    except Exception as e:
        current_app.logger.error(f"Error getting fee record payments: {str(e)}")
        return jsonify({'success': False, 'message': 'Failed to fetch payments'}), 500


@administration_bp.route('/fee-payments', methods=['GET'])
@administration_bp.route('/fee-payments/', methods=['GET'])
@jwt_required()
@admin_required
def list_fee_payments():
    try:
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 20, type=int)
        student_id = request.args.get('student_id', type=int)

        query = Payment.query
        if student_id:
            query = query.filter(Payment.student_id == student_id)

        paginated = query.order_by(Payment.paid_at.desc()).paginate(page=page, per_page=per_page, error_out=False)
        student_ids = [p.student_id for p in paginated.items]
        students = Student.query.filter(Student.id.in_(student_ids)).all() if student_ids else []
        student_by_id = {s.id: s for s in students}

        items = []
        for p in paginated.items:
            s = student_by_id.get(p.student_id)
            items.append({
                'id': p.id,
                'student_id': p.student_id,
                'student_name': f"{getattr(s, 'first_name', '')} {getattr(s, 'last_name', '')}".strip() if s else None,
                'amount': float(p.amount or 0),
                'payment_method': p.payment_method,
                'reference_number': p.transaction_id,
                'payment_date': p.paid_at.date().isoformat() if p.paid_at else None,
                'status': p.status,
                'created_at': p.paid_at.isoformat() if p.paid_at else None
            })

        return jsonify({
            'success': True,
            'payments': items,
            'pagination': {
                'total': paginated.total,
                'pages': paginated.pages,
                'page': paginated.page,
                'per_page': paginated.per_page,
                'next': paginated.next_num,
                'prev': paginated.prev_num
            }
        }), 200
    except Exception as e:
        current_app.logger.error(f"Error listing payments: {str(e)}")
        return jsonify({'success': False, 'message': 'Failed to list payments'}), 500


@administration_bp.route('/fee-payments', methods=['POST'])
@administration_bp.route('/fee-payments/', methods=['POST'])
@jwt_required()
@admin_required
def create_fee_payment_v2():
    try:
        data = request.get_json() or {}
        fee_record_id = data.get('fee_record_id')
        amount = data.get('amount')
        payment_method = (data.get('payment_method') or '').strip()
        reference_number = (data.get('reference_number') or '').strip() or str(uuid.uuid4())
        payment_date_raw = data.get('payment_date')

        if not fee_record_id or amount is None or not payment_method:
            return jsonify({'success': False, 'message': 'fee_record_id, amount and payment_method are required'}), 400

        fee = StudentFee.query.get(int(fee_record_id))
        if not fee:
            return jsonify({'success': False, 'message': 'Fee record not found'}), 404

        try:
            amount_val = float(amount)
        except Exception:
            return jsonify({'success': False, 'message': 'Invalid amount'}), 400

        paid_at = datetime.utcnow()
        if payment_date_raw:
            try:
                paid_at = datetime.fromisoformat(str(payment_date_raw).replace('Z', '+00:00')).replace(tzinfo=None)
            except Exception:
                paid_at = datetime.utcnow()

        user_id = get_jwt_identity()
        payment = Payment(
            transaction_id=reference_number,
            student_id=fee.student_id,
            amount=amount_val,
            payment_method=payment_method,
            payment_provider='manual',
            recorded_by=user_id,
            status='completed',
            paid_at=paid_at
        )
        db.session.add(payment)
        db.session.flush()

        allocation_amount = min(float(fee.balance or 0), amount_val)
        alloc = PaymentAllocation(payment_id=payment.id, student_fee_id=fee.id, amount_allocated=allocation_amount)
        db.session.add(alloc)

        fee.paid_amount = float(fee.paid_amount or 0) + allocation_amount
        fee.update_balance()
        db.session.commit()

        return jsonify({
            'success': True,
            'fee_payment': {
                'id': payment.id,
                'fee_record_id': fee.id,
                'amount': float(allocation_amount),
                'payment_method': payment.payment_method,
                'reference_number': payment.transaction_id,
                'payment_date': payment.paid_at.date().isoformat() if payment.paid_at else None,
                'created_by': payment.recorded_by,
                'created_at': payment.paid_at.isoformat() if payment.paid_at else None
            }
        }), 201
    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Error creating fee payment: {str(e)}")
        return jsonify({'success': False, 'message': 'Failed to create fee payment'}), 500


@administration_bp.route('/overdue-fees', methods=['GET'])
@administration_bp.route('/overdue-fees/', methods=['GET'])
@jwt_required()
@admin_required
def get_overdue_fees_v2():
    try:
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 20, type=int)
        class_id = request.args.get('class_id', type=int)
        academic_year = request.args.get('academic_year', type=str)

        paginated = administration_service.get_all_fee_records(page=page, per_page=per_page, academic_year=academic_year, class_id=class_id)
        today = date.today()
        overdue_items = []
        for r in paginated.items:
            due = getattr(r.structure, 'due_date', None)
            if not due:
                continue
            if due >= today:
                continue
            if float(r.balance or 0) <= 0:
                continue
            s = r.student
            cls = getattr(s, 'class_', None) if s else None
            overdue_items.append({
                'id': r.id,
                'student_id': r.student_id,
                'student_name': f"{getattr(s, 'first_name', '')} {getattr(s, 'last_name', '')}".strip() if s else None,
                'class_name': getattr(cls, 'name', None) if cls else None,
                'total_amount': float(r.final_amount or 0),
                'paid_amount': float(r.paid_amount or 0),
                'balance': float(r.balance or 0),
                'due_date': due.isoformat(),
                'days_overdue': (today - due).days,
                'status': 'overdue'
            })

        return jsonify({
            'success': True,
            'overdue_fees': overdue_items,
            'pagination': {
                'total': len(overdue_items),
                'pages': 1,
                'page': page,
                'per_page': per_page
            }
        }), 200
    except Exception as e:
        current_app.logger.error(f"Error getting overdue fees: {str(e)}")
        return jsonify({'success': False, 'message': 'Failed to fetch overdue fees'}), 500


@administration_bp.route('/fee-reminders/send', methods=['POST'])
@administration_bp.route('/fee-reminders/send/', methods=['POST'])
@jwt_required()
@admin_required
def send_fee_reminders():
    try:
        data = request.get_json() or {}
        audience = (data.get('audience') or 'overdue').strip().lower()

        if audience != 'overdue':
            return jsonify({'success': False, 'message': 'Unsupported audience'}), 400

        today = date.today()
        q = StudentFee.query.join(FeeStructure).filter(
            StudentFee.balance > 0,
            FeeStructure.due_date != None,
            FeeStructure.due_date < today
        )

        fee_ids = [f.id for f in q.limit(500).all()]
        student_ids = [f.student_id for f in q.limit(500).all()]

        return jsonify({
            'success': True,
            'audience': audience,
            'count': len(set(student_ids)),
            'fee_records': fee_ids[:50]
        }), 200
    except Exception as e:
        current_app.logger.error(f"Error sending fee reminders: {str(e)}")
        return jsonify({'success': False, 'message': 'Failed to send reminders'}), 500

# Budget Management Routes
@administration_bp.route('/budgets', methods=['GET'])
@administration_bp.route('/budgets/', methods=['GET'])
@jwt_required()
@admin_required
def get_budgets():
    """Get all budgets with pagination and filtering."""
    try:
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 20, type=int)
        academic_year = request.args.get('academic_year', type=str)
        
        paginated_budgets = administration_service.get_all_budgets(page, per_page, academic_year)
        
        return jsonify({
            'success': True,
            'budgets': budgets_schema.dump(paginated_budgets.items),
            'pagination': {
                'total': paginated_budgets.total,
                'pages': paginated_budgets.pages,
                'page': paginated_budgets.page,
                'per_page': paginated_budgets.per_page,
                'next': paginated_budgets.next_num,
                'prev': paginated_budgets.prev_num
            }
        }), 200
    except Exception as e:
        current_app.logger.error(f"Error getting budgets: {str(e)}")
        return jsonify({
            'success': False,
            'message': 'An error occurred while retrieving budgets'
        }), 500

@administration_bp.route('/budgets/<int:budget_id>', methods=['GET'])
@jwt_required()
@admin_required
def get_budget(budget_id):
    """Get a specific budget by ID."""
    try:
        budget = administration_service.get_budget_by_id(budget_id)
        
        if not budget:
            return jsonify({'success': False, 'message': 'Budget not found'}), 404
        
        return jsonify({
            'success': True,
            'budget': budget_schema.dump(budget)
        }), 200
    except Exception as e:
        current_app.logger.error(f"Error getting budget {budget_id}: {str(e)}")
        return jsonify({
            'success': False,
            'message': 'An error occurred while retrieving the budget'
        }), 500

@administration_bp.route('/budgets', methods=['POST'])
@administration_bp.route('/budgets/', methods=['POST'])
@jwt_required()
@admin_required
def create_budget():
    """Create a new budget."""
    try:
        current_app.logger.debug(f"Create budget request data: {request.json}")
        
        data = budget_create_schema.load(request.json)
        budget, error = administration_service.create_budget(data)
        
        if error:
            return jsonify({'success': False, 'message': error}), 400
        
        return jsonify({
            'success': True,
            'message': 'Budget created successfully',
            'budget': budget_schema.dump(budget)
        }), 201
        
    except ValidationError as e:
        return jsonify({
            'success': False,
            'message': 'Validation error',
            'errors': e.messages
        }), 400
    except Exception as e:
        current_app.logger.error(f"Error creating budget: {str(e)}")
        return jsonify({
            'success': False,
            'message': 'An error occurred while creating the budget'
        }), 500

@administration_bp.route('/budgets/<int:budget_id>', methods=['PUT'])
@jwt_required()
@admin_required
def update_budget(budget_id):
    """Update a budget."""
    try:
        data = budget_update_schema.load(request.json)
        budget, error = administration_service.update_budget(budget_id, data)
        
        if error:
            return jsonify({'success': False, 'message': error}), 400
        
        return jsonify({
            'success': True,
            'message': 'Budget updated successfully',
            'budget': budget_schema.dump(budget)
        }), 200
        
    except ValidationError as e:
        return jsonify({
            'success': False,
            'message': 'Validation error',
            'errors': e.messages
        }), 400
    except Exception as e:
        current_app.logger.error(f"Error updating budget {budget_id}: {str(e)}")
        return jsonify({
            'success': False,
            'message': 'An error occurred while updating the budget'
        }), 500

@administration_bp.route('/budgets/<int:budget_id>', methods=['DELETE'])
@jwt_required()
@admin_required
def delete_budget(budget_id):
    """Delete a budget."""
    try:
        success, error = administration_service.delete_budget(budget_id)
        
        if error:
            return jsonify({'success': False, 'message': error}), 400
        
        return jsonify({
            'success': True,
            'message': 'Budget deleted successfully'
        }), 200
        
    except Exception as e:
        current_app.logger.error(f"Error deleting budget {budget_id}: {str(e)}")
        return jsonify({
            'success': False,
            'message': 'An error occurred while deleting the budget'
        }), 500

# Transaction Management Routes
@administration_bp.route('/transactions', methods=['GET'])
@administration_bp.route('/transactions/', methods=['GET'])
@jwt_required()
@admin_required
def get_transactions():
    """Get all transactions with pagination and filtering."""
    try:
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 20, type=int)
        transaction_type = request.args.get('type', type=str)
        start_date_str = request.args.get('start_date', type=str)
        end_date_str = request.args.get('end_date', type=str)
        
        start_date = None
        end_date = None
        
        if start_date_str:
            start_date = datetime.strptime(start_date_str, '%Y-%m-%d').date()
        if end_date_str:
            end_date = datetime.strptime(end_date_str, '%Y-%m-%d').date()
        
        paginated_transactions = administration_service.get_all_transactions(
            page, per_page, transaction_type, start_date, end_date
        )
        
        return jsonify({
            'success': True,
            'transactions': transactions_schema.dump(paginated_transactions.items),
            'pagination': {
                'total': paginated_transactions.total,
                'pages': paginated_transactions.pages,
                'page': paginated_transactions.page,
                'per_page': paginated_transactions.per_page,
                'next': paginated_transactions.next_num,
                'prev': paginated_transactions.prev_num
            }
        }), 200
    except Exception as e:
        current_app.logger.error(f"Error getting transactions: {str(e)}")
        return jsonify({
            'success': False,
            'message': 'An error occurred while retrieving transactions'
        }), 500

@administration_bp.route('/transactions/<int:transaction_id>', methods=['GET'])
@jwt_required()
@admin_required
def get_transaction(transaction_id):
    """Get a specific transaction by ID."""
    try:
        transaction = administration_service.get_transaction_by_id(transaction_id)
        
        if not transaction:
            return jsonify({'success': False, 'message': 'Transaction not found'}), 404
        
        return jsonify({
            'success': True,
            'transaction': transaction_schema.dump(transaction)
        }), 200
    except Exception as e:
        current_app.logger.error(f"Error getting transaction {transaction_id}: {str(e)}")
        return jsonify({
            'success': False,
            'message': 'An error occurred while retrieving the transaction'
        }), 500

@administration_bp.route('/transactions', methods=['POST'])
@administration_bp.route('/transactions/', methods=['POST'])
@jwt_required()
@admin_required
def create_transaction():
    """Create a new transaction."""
    try:
        current_app.logger.debug(f"Create transaction request data: {request.json}")
        
        data = transaction_create_schema.load(request.json)
        transaction, error = administration_service.create_transaction(data)
        
        if error:
            return jsonify({'success': False, 'message': error}), 400
        
        return jsonify({
            'success': True,
            'message': 'Transaction created successfully',
            'transaction': transaction_schema.dump(transaction)
        }), 201
        
    except ValidationError as e:
        return jsonify({
            'success': False,
            'message': 'Validation error',
            'errors': e.messages
        }), 400
    except Exception as e:
        current_app.logger.error(f"Error creating transaction: {str(e)}")
        return jsonify({
            'success': False,
            'message': 'An error occurred while creating the transaction'
        }), 500

 

@administration_bp.route('/fee-records', methods=['GET'])
@administration_bp.route('/fee-records/', methods=['GET'])
@jwt_required()
@admin_required
def get_fee_records():
    """Get all fee records (admin)."""
    try:
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 20, type=int)
        academic_year = request.args.get('academic_year', type=str)
        class_id = request.args.get('class_id', type=int)

        paginated = administration_service.get_all_fee_records(page, per_page, academic_year, class_id)

        items = []
        for r in paginated.items:
            structure = getattr(r, 'structure', None)
            category = getattr(structure, 'category', None) if structure else None
            student = getattr(r, 'student', None)

            items.append({
                'id': r.id,
                'student_id': r.student_id,
                'fee_structure_id': r.fee_structure_id,
                'academic_year': getattr(structure, 'academic_year', None) if structure else None,
                'total_amount': float(r.final_amount) if r.final_amount is not None else 0.0,
                'original_amount': float(r.original_amount) if r.original_amount is not None else 0.0,
                'discount_amount': float(r.discount_amount) if r.discount_amount is not None else 0.0,
                'final_amount': float(r.final_amount) if r.final_amount is not None else 0.0,
                'paid_amount': float(r.paid_amount) if r.paid_amount is not None else 0.0,
                'balance': float(r.balance) if r.balance is not None else 0.0,
                'status': r.status,
                'due_date': structure.due_date.isoformat() if getattr(structure, 'due_date', None) else None,
                'created_at': r.created_at.isoformat() if r.created_at else None,
                'updated_at': r.updated_at.isoformat() if getattr(r, 'updated_at', None) else None,
                'student': {
                    'id': getattr(student, 'id', None),
                    'admission_number': getattr(student, 'admission_number', None),
                    'first_name': getattr(student, 'first_name', None),
                    'last_name': getattr(student, 'last_name', None)
                } if student else None,
                'structure': {
                    'id': getattr(structure, 'id', None),
                    'academic_year': getattr(structure, 'academic_year', None),
                    'term': getattr(structure, 'term', None),
                    'amount': float(getattr(structure, 'amount', 0) or 0),
                    'currency': getattr(structure, 'currency', None),
                    'due_date': structure.due_date.isoformat() if getattr(structure, 'due_date', None) else None,
                    'fee_category': getattr(category, 'name', None)
                } if structure else None
            })

        return jsonify({
            'success': True,
            'fee_records': items,
            'pagination': {
                'total': paginated.total,
                'pages': paginated.pages,
                'page': paginated.page,
                'per_page': paginated.per_page,
                'next': paginated.next_num,
                'prev': paginated.prev_num
            }
        }), 200
    except Exception as e:
        current_app.logger.error(f"Error getting fee records: {str(e)}")
        return jsonify({
            'success': False,
            'message': 'An error occurred while retrieving fee records'
        }), 500


@administration_bp.route('/students/<int:student_id>/fee-records', methods=['GET'])
@jwt_required()
def get_student_fee_records(student_id):
    """Get fee records for a specific student."""
    try:
        academic_year = request.args.get('academic_year', type=str)

        fee_records = administration_service.get_student_fee_records(student_id, academic_year)
        items = []
        for r in fee_records:
            structure = getattr(r, 'structure', None)
            category = getattr(structure, 'category', None) if structure else None
            items.append({
                'id': r.id,
                'student_id': r.student_id,
                'fee_structure_id': r.fee_structure_id,
                'academic_year': getattr(structure, 'academic_year', None) if structure else None,
                'total_amount': float(r.final_amount) if r.final_amount is not None else 0.0,
                'paid_amount': float(r.paid_amount) if r.paid_amount is not None else 0.0,
                'balance': float(r.balance) if r.balance is not None else 0.0,
                'status': r.status,
                'due_date': structure.due_date.isoformat() if getattr(structure, 'due_date', None) else None,
                'created_at': r.created_at.isoformat() if r.created_at else None,
                'structure': {
                    'id': getattr(structure, 'id', None),
                    'academic_year': getattr(structure, 'academic_year', None),
                    'term': getattr(structure, 'term', None),
                    'amount': float(getattr(structure, 'amount', 0) or 0),
                    'fee_category': getattr(category, 'name', None)
                } if structure else None
            })

        return jsonify({'success': True, 'fee_records': items}), 200
    except Exception as e:
        current_app.logger.error(f"Error getting fee records for student {student_id}: {str(e)}")
        return jsonify({
            'success': False,
            'message': 'An error occurred while retrieving fee records'
        }), 500

@administration_bp.route('/fee-records', methods=['POST'])
@administration_bp.route('/fee-records/', methods=['POST'])
@jwt_required()
@admin_required
def create_fee_record():
    """Create a new fee record for a student."""
    try:
        data = request.get_json() or {}
        student_id = data.get('student_id')
        fee_structure_id = data.get('fee_structure_id')
        if not student_id or not fee_structure_id:
            return jsonify({'success': False, 'message': 'student_id and fee_structure_id are required'}), 400

        structure = FeeStructure.query.get(int(fee_structure_id))
        if not structure:
            return jsonify({'success': False, 'message': 'Fee structure not found'}), 404

        existing = StudentFee.query.filter_by(student_id=int(student_id), fee_structure_id=structure.id).first()
        if existing:
            return jsonify({'success': True, 'fee_record': {'id': existing.id}}), 200

        amt = float(structure.amount or 0)
        fee = StudentFee(
            student_id=int(student_id),
            fee_structure_id=structure.id,
            original_amount=amt,
            discount_amount=0.0,
            final_amount=amt,
            paid_amount=0.0,
            balance=amt,
            status='pending'
        )
        db.session.add(fee)
        db.session.commit()

        return jsonify({
            'success': True,
            'message': 'Fee record created successfully',
            'fee_record': {
                'id': fee.id,
                'student_id': fee.student_id,
                'fee_structure_id': fee.fee_structure_id,
                'final_amount': float(fee.final_amount or 0),
                'paid_amount': float(fee.paid_amount or 0),
                'balance': float(fee.balance or 0),
                'status': fee.status,
                'created_at': fee.created_at.isoformat() if fee.created_at else None
            }
        }), 201
    except Exception as e:
        current_app.logger.error(f"Error creating fee record: {str(e)}")
        return jsonify({
            'success': False,
            'message': 'An error occurred while creating the fee record'
        }), 500

# Financial Reports and Analytics Routes
@administration_bp.route('/financial-summary', methods=['GET'])
@administration_bp.route('/financial-summary/', methods=['GET'])
@jwt_required()
@admin_required
def get_financial_summary():
    """Get comprehensive financial summary."""
    try:
        academic_year = request.args.get('academic_year', type=str)
        
        summary = administration_service.get_financial_summary(academic_year)
        
        return jsonify({
            'success': True,
            'financial_summary': financial_summary_schema.dump(summary)
        }), 200
    except Exception as e:
        current_app.logger.error(f"Error getting financial summary: {str(e)}")
        return jsonify({
            'success': False,
            'message': 'An error occurred while retrieving financial summary'
        }), 500



# Infrastructure Management Routes

# Facility Management Routes
@administration_bp.route('/facilities', methods=['GET'])
@administration_bp.route('/facilities/', methods=['GET'])
@jwt_required()
def get_facilities():
    """Get all facilities with pagination and filtering."""
    try:
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 20, type=int)
        facility_type = request.args.get('facility_type', type=str)
        status = request.args.get('status', type=str)
        
        paginated_facilities = administration_service.get_all_facilities(
            page, per_page, facility_type, status
        )
        
        return jsonify({
            'success': True,
            'facilities': facilities_schema.dump(paginated_facilities.items),
            'pagination': {
                'total': paginated_facilities.total,
                'pages': paginated_facilities.pages,
                'page': paginated_facilities.page,
                'per_page': paginated_facilities.per_page,
                'next': paginated_facilities.next_num,
                'prev': paginated_facilities.prev_num
            }
        }), 200
    except Exception as e:
        current_app.logger.error(f"Error getting facilities: {str(e)}")
        return jsonify({
            'success': False,
            'message': 'An error occurred while retrieving facilities'
        }), 500

@administration_bp.route('/facilities/<int:facility_id>', methods=['GET'])
@jwt_required()
def get_facility(facility_id):
    """Get a specific facility by ID."""
    try:
        facility = administration_service.get_facility_by_id(facility_id)
        
        if not facility:
            return jsonify({'success': False, 'message': 'Facility not found'}), 404
        
        return jsonify({
            'success': True,
            'facility': facility_schema.dump(facility)
        }), 200
    except Exception as e:
        current_app.logger.error(f"Error getting facility {facility_id}: {str(e)}")
        return jsonify({
            'success': False,
            'message': 'An error occurred while retrieving the facility'
        }), 500

@administration_bp.route('/facilities', methods=['POST'])
@administration_bp.route('/facilities/', methods=['POST'])
@jwt_required()
@admin_required
def create_facility():
    """Create a new facility."""
    try:
        current_app.logger.debug(f"Create facility request data: {request.json}")
        
        data = facility_schema.load(request.json)
        facility, error = administration_service.create_facility(data)
        
        if error:
            return jsonify({'success': False, 'message': error}), 400
        
        return jsonify({
            'success': True,
            'message': 'Facility created successfully',
            'facility': facility_schema.dump(facility)
        }), 201
        
    except ValidationError as e:
        return jsonify({
            'success': False,
            'message': 'Validation error',
            'errors': e.messages
        }), 400
    except Exception as e:
        current_app.logger.error(f"Error creating facility: {str(e)}")
        return jsonify({
            'success': False,
            'message': 'An error occurred while creating the facility'
        }), 500

@administration_bp.route('/facilities/<int:facility_id>', methods=['PUT'])
@jwt_required()
@admin_required
def update_facility(facility_id):
    """Update an existing facility."""
    try:
        current_app.logger.debug(f"Update facility {facility_id} request data: {request.json}")
        
        data = facility_schema.load(request.json, partial=True)
        facility, error = administration_service.update_facility(facility_id, data)
        
        if error:
            return jsonify({'success': False, 'message': error}), 400
        
        return jsonify({
            'success': True,
            'message': 'Facility updated successfully',
            'facility': facility_schema.dump(facility)
        }), 200
        
    except ValidationError as e:
        return jsonify({
            'success': False,
            'message': 'Validation error',
            'errors': e.messages
        }), 400
    except Exception as e:
        current_app.logger.error(f"Error updating facility {facility_id}: {str(e)}")
        return jsonify({
            'success': False,
            'message': 'An error occurred while updating the facility'
        }), 500

@administration_bp.route('/facilities/<int:facility_id>', methods=['DELETE'])
@jwt_required()
@admin_required
def delete_facility(facility_id):
    """Delete a facility."""
    try:
        success, error = administration_service.delete_facility(facility_id)
        
        if not success:
            return jsonify({'success': False, 'message': error}), 400
        
        return jsonify({
            'success': True,
            'message': 'Facility deleted successfully'
        }), 200
        
    except Exception as e:
        current_app.logger.error(f"Error deleting facility {facility_id}: {str(e)}")
        return jsonify({
            'success': False,
            'message': 'An error occurred while deleting the facility'
        }), 500

# Maintenance Request Management Routes
@administration_bp.route('/maintenance-requests', methods=['GET'])
@administration_bp.route('/maintenance-requests/', methods=['GET'])
@jwt_required()
def get_maintenance_requests():
    """Get all maintenance requests with pagination and filtering."""
    try:
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 20, type=int)
        facility_id = request.args.get('facility_id', type=int)
        status = request.args.get('status', type=str)
        priority = request.args.get('priority', type=str)
        
        paginated_requests = administration_service.get_all_maintenance_requests(
            page, per_page, facility_id, status, priority
        )
        
        return jsonify({
            'success': True,
            'maintenance_requests': maintenance_requests_schema.dump(paginated_requests.items),
            'pagination': {
                'total': paginated_requests.total,
                'pages': paginated_requests.pages,
                'page': paginated_requests.page,
                'per_page': paginated_requests.per_page,
                'next': paginated_requests.next_num,
                'prev': paginated_requests.prev_num
            }
        }), 200
    except Exception as e:
        current_app.logger.error(f"Error getting maintenance requests: {str(e)}")
        return jsonify({
            'success': False,
            'message': 'An error occurred while retrieving maintenance requests'
        }), 500

@administration_bp.route('/maintenance-requests/<int:request_id>', methods=['GET'])
@jwt_required()
def get_maintenance_request(request_id):
    """Get a specific maintenance request by ID."""
    try:
        maintenance_request = administration_service.get_maintenance_request_by_id(request_id)
        
        if not maintenance_request:
            return jsonify({'success': False, 'message': 'Maintenance request not found'}), 404
        
        return jsonify({
            'success': True,
            'maintenance_request': maintenance_request_schema.dump(maintenance_request)
        }), 200
    except Exception as e:
        current_app.logger.error(f"Error getting maintenance request {request_id}: {str(e)}")
        return jsonify({
            'success': False,
            'message': 'An error occurred while retrieving the maintenance request'
        }), 500

@administration_bp.route('/maintenance-requests', methods=['POST'])
@administration_bp.route('/maintenance-requests/', methods=['POST'])
@jwt_required()
def create_maintenance_request():
    """Create a new maintenance request."""
    try:
        current_app.logger.debug(f"Create maintenance request data: {request.json}")

        incoming = dict(request.json or {})
        incoming['reported_by'] = get_jwt_identity()
        if not incoming.get('reported_date'):
            incoming['reported_date'] = datetime.utcnow().date().isoformat()

        data = maintenance_request_schema.load(incoming)
        
        maintenance_request, error = administration_service.create_maintenance_request(data)
        
        if error:
            return jsonify({'success': False, 'message': error}), 400
        
        return jsonify({
            'success': True,
            'message': 'Maintenance request created successfully',
            'maintenance_request': maintenance_request_schema.dump(maintenance_request)
        }), 201
        
    except ValidationError as e:
        return jsonify({
            'success': False,
            'message': 'Validation error',
            'errors': e.messages
        }), 400
    except Exception as e:
        current_app.logger.error(f"Error creating maintenance request: {str(e)}")
        return jsonify({
            'success': False,
            'message': 'An error occurred while creating the maintenance request'
        }), 500

@administration_bp.route('/maintenance-requests/<int:request_id>', methods=['PUT'])
@jwt_required()
def update_maintenance_request(request_id):
    """Update an existing maintenance request."""
    try:
        current_app.logger.debug(f"Update maintenance request {request_id} data: {request.json}")
        
        data = maintenance_request_schema.load(request.json, partial=True)
        maintenance_request, error = administration_service.update_maintenance_request(request_id, data)
        
        if error:
            return jsonify({'success': False, 'message': error}), 400
        
        return jsonify({
            'success': True,
            'message': 'Maintenance request updated successfully',
            'maintenance_request': maintenance_request_schema.dump(maintenance_request)
        }), 200
        
    except ValidationError as e:
        return jsonify({
            'success': False,
            'message': 'Validation error',
            'errors': e.messages
        }), 400
    except Exception as e:
        current_app.logger.error(f"Error updating maintenance request {request_id}: {str(e)}")
        return jsonify({
            'success': False,
            'message': 'An error occurred while updating the maintenance request'
        }), 500

@administration_bp.route('/maintenance-requests/<int:request_id>', methods=['DELETE'])
@jwt_required()
@admin_required
def delete_maintenance_request(request_id):
    """Delete a maintenance request."""
    try:
        success, error = administration_service.delete_maintenance_request(request_id)
        
        if not success:
            return jsonify({'success': False, 'message': error}), 400
        
        return jsonify({
            'success': True,
            'message': 'Maintenance request deleted successfully'
        }), 200
        
    except Exception as e:
        current_app.logger.error(f"Error deleting maintenance request {request_id}: {str(e)}")
        return jsonify({
            'success': False,
            'message': 'An error occurred while deleting the maintenance request'
        }), 500

# Asset Management Routes
@administration_bp.route('/assets', methods=['GET'])
@administration_bp.route('/assets/', methods=['GET'])
@jwt_required()
def get_assets():
    """Get all assets with pagination and filtering."""
    try:
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 20, type=int)
        asset_type = request.args.get('asset_type', type=str)
        condition = request.args.get('condition', type=str)
        location = request.args.get('location', type=str)
        
        paginated_assets = administration_service.get_all_assets(
            page, per_page, asset_type, condition, location
        )
        
        return jsonify({
            'success': True,
            'assets': assets_schema.dump(paginated_assets.items),
            'pagination': {
                'total': paginated_assets.total,
                'pages': paginated_assets.pages,
                'page': paginated_assets.page,
                'per_page': paginated_assets.per_page,
                'next': paginated_assets.next_num,
                'prev': paginated_assets.prev_num
            }
        }), 200
    except Exception as e:
        current_app.logger.error(f"Error getting assets: {str(e)}")
        return jsonify({
            'success': False,
            'message': 'An error occurred while retrieving assets'
        }), 500

@administration_bp.route('/assets/<int:asset_id>', methods=['GET'])
@jwt_required()
def get_asset(asset_id):
    """Get a specific asset by ID."""
    try:
        asset = administration_service.get_asset_by_id(asset_id)
        
        if not asset:
            return jsonify({'success': False, 'message': 'Asset not found'}), 404
        
        return jsonify({
            'success': True,
            'asset': asset_schema.dump(asset)
        }), 200
    except Exception as e:
        current_app.logger.error(f"Error getting asset {asset_id}: {str(e)}")
        return jsonify({
            'success': False,
            'message': 'An error occurred while retrieving the asset'
        }), 500

@administration_bp.route('/assets', methods=['POST'])
@administration_bp.route('/assets/', methods=['POST'])
@jwt_required()
@admin_required
def create_asset():
    """Create a new asset."""
    try:
        current_app.logger.debug(f"Create asset request data: {request.json}")

        incoming = dict(request.json or {})
        incoming['created_by'] = get_jwt_identity()
        data = asset_schema.load(incoming)
        asset, error = administration_service.create_asset(data)
        
        if error:
            return jsonify({'success': False, 'message': error}), 400
        
        return jsonify({
            'success': True,
            'message': 'Asset created successfully',
            'asset': asset_schema.dump(asset)
        }), 201
        
    except ValidationError as e:
        return jsonify({
            'success': False,
            'message': 'Validation error',
            'errors': e.messages
        }), 400
    except Exception as e:
        current_app.logger.error(f"Error creating asset: {str(e)}")
        return jsonify({
            'success': False,
            'message': 'An error occurred while creating the asset'
        }), 500

@administration_bp.route('/assets/<int:asset_id>', methods=['PUT'])
@jwt_required()
@admin_required
def update_asset(asset_id):
    """Update an existing asset."""
    try:
        current_app.logger.debug(f"Update asset {asset_id} request data: {request.json}")
        
        data = asset_schema.load(request.json, partial=True)
        asset, error = administration_service.update_asset(asset_id, data)
        
        if error:
            return jsonify({'success': False, 'message': error}), 400
        
        return jsonify({
            'success': True,
            'message': 'Asset updated successfully',
            'asset': asset_schema.dump(asset)
        }), 200
        
    except ValidationError as e:
        return jsonify({
            'success': False,
            'message': 'Validation error',
            'errors': e.messages
        }), 400
    except Exception as e:
        current_app.logger.error(f"Error updating asset {asset_id}: {str(e)}")
        return jsonify({
            'success': False,
            'message': 'An error occurred while updating the asset'
        }), 500

@administration_bp.route('/assets/<int:asset_id>', methods=['DELETE'])
@jwt_required()
@admin_required
def delete_asset(asset_id):
    """Delete an asset."""
    try:
        success, error = administration_service.delete_asset(asset_id)
        
        if not success:
            return jsonify({'success': False, 'message': error}), 400
        
        return jsonify({
            'success': True,
            'message': 'Asset deleted successfully'
        }), 200
        
    except Exception as e:
        current_app.logger.error(f"Error deleting asset {asset_id}: {str(e)}")
        return jsonify({
            'success': False,
            'message': 'An error occurred while deleting the asset'
        }), 500

# Infrastructure Analytics and Reports Routes
@administration_bp.route('/infrastructure-summary', methods=['GET'])
@administration_bp.route('/infrastructure-summary/', methods=['GET'])
@jwt_required()
def get_infrastructure_summary():
    """Get comprehensive infrastructure summary."""
    try:
        summary = administration_service.get_infrastructure_summary()
        
        return jsonify({
            'success': True,
            'infrastructure_summary': infrastructure_summary_schema.dump(summary)
        }), 200
    except Exception as e:
        current_app.logger.error(f"Error getting infrastructure summary: {str(e)}")
        return jsonify({
            'success': False,
            'message': 'An error occurred while retrieving infrastructure summary'
        }), 500

@administration_bp.route('/maintenance-requests/overdue', methods=['GET'])
@administration_bp.route('/maintenance-requests/overdue/', methods=['GET'])
@jwt_required()
def get_overdue_maintenance_requests():
    """Get all overdue maintenance requests."""
    try:
        overdue_requests = administration_service.get_overdue_maintenance_requests()
        
        return jsonify({
            'success': True,
            'overdue_maintenance_requests': maintenance_requests_schema.dump(overdue_requests)
        }), 200
    except Exception as e:
        current_app.logger.error(f"Error getting overdue maintenance requests: {str(e)}")
        return jsonify({
            'success': False,
            'message': 'An error occurred while retrieving overdue maintenance requests'
        }), 500

@administration_bp.route('/assets/service-due', methods=['GET'])
@administration_bp.route('/assets/service-due/', methods=['GET'])
@jwt_required()
def get_assets_needing_service():
    """Get all assets that need service."""
    try:
        assets_needing_service = administration_service.get_assets_needing_service()
        
        return jsonify({
            'success': True,
            'assets_needing_service': assets_schema.dump(assets_needing_service)
        }), 200
    except Exception as e:
        current_app.logger.error(f"Error getting assets needing service: {str(e)}")
        return jsonify({
            'success': False,
            'message': 'An error occurred while retrieving assets needing service'
        }), 500

@administration_bp.route('/assets/warranty-expired', methods=['GET'])
@administration_bp.route('/assets/warranty-expired/', methods=['GET'])
@jwt_required()
def get_assets_with_expired_warranty():
    """Get all assets with expired warranty."""
    try:
        expired_warranty_assets = administration_service.get_assets_with_expired_warranty()
        
        return jsonify({
            'success': True,
            'expired_warranty_assets': assets_schema.dump(expired_warranty_assets)
        }), 200
    except Exception as e:
        current_app.logger.error(f"Error getting assets with expired warranty: {str(e)}")
        return jsonify({
            'success': False,
            'message': 'An error occurred while retrieving assets with expired warranty'
        }), 500

# System Settings Routes
@administration_bp.route('/settings', methods=['GET'])
@jwt_required()
def get_system_settings():
    """Get all system settings."""
    try:
        keys = request.args.getlist('keys')
        if keys:
            settings = SystemSetting.query.filter(SystemSetting.key.in_(keys)).all()
        else:
            settings = SystemSetting.query.all()
            
        return jsonify({
            'success': True,
            'settings': {s.key: s.value for s in settings}
        }), 200
    except Exception as e:
        current_app.logger.error(f"Error getting system settings: {str(e)}")
        return jsonify({
            'success': False,
            'message': 'An error occurred while retrieving system settings'
        }), 500

@administration_bp.route('/settings', methods=['POST'])
@jwt_required()
@admin_required
def update_system_settings():
    """Update system settings."""
    try:
        data = request.json
        if not data:
            return jsonify({'success': False, 'message': 'No data provided'}), 400
            
        updated_settings = []
        for key, value in data.items():
            setting = SystemSetting.set_value(key, str(value))
            updated_settings.append(setting)
            
        return jsonify({
            'success': True,
            'message': 'Settings updated successfully'
        }), 200
    except Exception as e:
        current_app.logger.error(f"Error updating system settings: {str(e)}")
        return jsonify({
            'success': False,
            'message': 'An error occurred while updating system settings'
        }), 500
