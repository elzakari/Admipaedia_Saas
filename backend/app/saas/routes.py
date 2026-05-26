from flask import Blueprint, request, jsonify, send_file, after_this_request, g
from flask_jwt_extended import jwt_required, get_jwt_identity
from app.services.report_card_generator import ReportCardGenerator
from app.services.financial_ledger_service import FinancialLedgerService
from app.services.timetable_engine import TimetableEngine
from app.models.user import User
from app.models.timetable import TimetableSlot, Period
from app.models.class_ import Class
from app.models.subject import Subject
from app.models.teacher import Teacher
from app.utils.tenant_context import tenant_required
from decimal import Decimal
from app.extensions import db
import gc
import uuid

saas_report_bp = Blueprint('saas_report', __name__)

def serialize_decimals(obj):
    """Recursively converts Decimal instances to floats for JSON compatibility."""
    if isinstance(obj, dict):
        return {k: serialize_decimals(v) for k, v in obj.items()}
    elif isinstance(obj, list):
        return [serialize_decimals(i) for i in obj]
    elif isinstance(obj, Decimal):
        return float(obj)
    return obj

@saas_report_bp.route('/saas/report-card/pdf', methods=['GET'])
@jwt_required()
def download_report_card_pdf():
    """
    HTTP GET endpoint delivering branch-isolated PDF streams.
    Accepts:
      - student_id (int)
      - academic_cycle_id (UUID string)
    """
    student_id = request.args.get('student_id')
    academic_cycle_id = request.args.get('academic_cycle_id')
    
    if not student_id or not academic_cycle_id:
        return jsonify({'success': False, 'message': 'Missing student_id or academic_cycle_id query arguments'}), 400
        
    try:
        # Enforce memory cleanup hook on request termination
        @after_this_request
        def trigger_garbage_collection(response):
            gc.collect()
            return response

        pdf_stream = ReportCardGenerator.generate_report_card_pdf(
            student_id=int(student_id),
            academic_cycle_id=academic_cycle_id
        )
        
        return send_file(
            pdf_stream,
            mimetype='application/pdf',
            as_attachment=True,
            download_name=f'report_card_{student_id}.pdf'
        )
    except ValueError as e:
        return jsonify({'success': False, 'message': str(e)}), 404
    except Exception as e:
        return jsonify({'success': False, 'message': 'Failed to compile report card', 'error': str(e)}), 500


@saas_report_bp.route('/saas/financial/branch-ledger', methods=['GET'])
@tenant_required
def get_branch_ledger():
    """
    GET branch ledger metrics.
    Enforces active branch context scoping for non-proprietors.
    """
    current_user_id = get_jwt_identity()
    user = User.query.get(current_user_id)
    if not user:
        return jsonify({"success": False, "message": "User not found."}), 404

    tenant_id = getattr(g, 'tenant_id', None)
    if not tenant_id:
        return jsonify({"success": False, "message": "Tenant context not found."}), 400

    # Resolve target branch_id
    req_branch_id_str = request.args.get('branch_id')
    active_branch_id = getattr(g, 'branch_id', None)

    # Determine if requesting user is a verified school proprietor
    is_proprietor = user.role in ('admin', 'school_admin', 'super_admin', 'super_manager')

    if req_branch_id_str:
        try:
            target_branch_id = uuid.UUID(str(req_branch_id_str).strip())
        except ValueError:
            return jsonify({"success": False, "message": "Invalid branch_id format."}), 400
    else:
        target_branch_id = active_branch_id

    if not target_branch_id:
        return jsonify({"success": False, "message": "Branch context not resolved."}), 400

    # Enforce horizontal visibility protection
    if not is_proprietor:
        if active_branch_id is None or target_branch_id != active_branch_id:
            return jsonify({
                "success": False,
                "message": "Unauthorized access to other branch financial statistics."
            }), 403

    try:
        metrics = FinancialLedgerService.get_branch_ledger_metrics(tenant_id, target_branch_id)
        return jsonify({
            "success": True,
            "data": serialize_decimals(metrics)
        })
    except ValueError as e:
        return jsonify({"success": False, "message": str(e)}), 404
    except Exception as e:
        return jsonify({"success": False, "message": "Failed to load ledger metrics.", "error": str(e)}), 500


@saas_report_bp.route('/saas/financial/global-ledger', methods=['GET'])
@tenant_required
def get_global_ledger():
    """
    GET global multi-branch comparison ledger metrics and SaaS subscription details.
    Restricted to verified school proprietors.
    """
    current_user_id = get_jwt_identity()
    user = User.query.get(current_user_id)
    if not user:
        return jsonify({"success": False, "message": "User not found."}), 404

    # Enforce verified school proprietor restriction
    is_proprietor = user.role in ('admin', 'school_admin', 'super_admin', 'super_manager')
    if not is_proprietor:
        return jsonify({
            "success": False,
            "message": "Unauthorized access to global cross-campus financial ledger statistics."
        }), 403

    tenant_id = getattr(g, 'tenant_id', None)
    if not tenant_id:
        return jsonify({"success": False, "message": "Tenant context not found."}), 400

    try:
        metrics = FinancialLedgerService.get_proprietor_global_metrics(tenant_id)
        return jsonify({
            "success": True,
            "data": serialize_decimals(metrics)
        })
    except Exception as e:
        return jsonify({"success": False, "message": "Failed to load global ledger metrics.", "error": str(e)}), 500


@saas_report_bp.route('/saas/timetable/periods', methods=['GET'])
@jwt_required()
def get_timetable_periods():
    """Returns timetable periods ordered by order_index."""
    periods = Period.query.order_by(Period.order_index).all()
    return jsonify({
        "success": True,
        "data": [{
            "id": p.id,
            "name": p.name,
            "start_time": str(p.start_time),
            "end_time": str(p.end_time),
            "is_break": p.is_break,
            "order_index": p.order_index
        } for p in periods]
    }), 200


@saas_report_bp.route('/saas/timetable/slots', methods=['GET'])
@tenant_required
def get_timetable_slots():
    """Gets timetable slots for a class or teacher under active tenant and branch contexts."""
    tenant_id = getattr(g, 'tenant_id', None)
    branch_id = getattr(g, 'branch_id', None)
    
    if not tenant_id or not branch_id:
        return jsonify({"success": False, "message": "Tenant and Branch context required."}), 400

    query = db.session.query(TimetableSlot)\
        .join(Class, Class.id == TimetableSlot.class_id)\
        .filter(Class.tenant_id == tenant_id, Class.branch_id == branch_id)

    class_id = request.args.get('class_id')
    teacher_id = request.args.get('teacher_id')

    if class_id:
        query = query.filter(TimetableSlot.class_id == class_id)
    if teacher_id:
        query = query.filter(TimetableSlot.teacher_id == teacher_id)

    slots = query.all()
    return jsonify({
        "success": True,
        "data": [{
            "id": s.id,
            "class_id": s.class_id,
            "class_name": s.class_.name,
            "subject_id": s.subject_id,
            "subject_name": s.subject.name,
            "teacher_id": s.teacher_id,
            "teacher_name": s.teacher.full_name,
            "period_id": s.period_id,
            "period_name": s.period.name,
            "start_time": str(s.period.start_time),
            "end_time": str(s.period.end_time),
            "day_of_week": s.day_of_week,
            "term": s.term,
            "academic_year": s.academic_year,
            "room_number": str(s.room_id or '')
        } for s in slots]
    }), 200


@saas_report_bp.route('/saas/timetable/slots', methods=['POST'])
@tenant_required
def create_timetable_slot():
    """Creates a proposed timetable slot placement after running 3-way clash validation checks."""
    tenant_id = getattr(g, 'tenant_id', None)
    branch_id = getattr(g, 'branch_id', None)

    if not tenant_id or not branch_id:
        return jsonify({"success": False, "message": "Tenant and Branch context required."}), 400

    data = request.json
    conflicts = TimetableEngine.check_conflicts(tenant_id, branch_id, data)
    if conflicts:
        return jsonify({
            "success": False, 
            "message": "Scheduling Conflict Detected", 
            "conflicts": conflicts
        }), 400

    try:
        slot = TimetableSlot(
            class_id=data.get('class_id'),
            subject_id=data.get('subject_id'),
            teacher_id=data.get('teacher_id'),
            period_id=data.get('period_id'),
            day_of_week=data.get('day_of_week'),
            term=data.get('term'),
            academic_year=data.get('academic_year'),
            room_id=data.get('room_id')
        )
        db.session.add(slot)
        db.session.commit()
        return jsonify({"success": True, "id": slot.id}), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({"success": False, "message": "Failed to create slot.", "error": str(e)}), 500


@saas_report_bp.route('/saas/timetable/slots/<int:slot_id>', methods=['PUT'])
@tenant_required
def update_timetable_slot(slot_id):
    """Updates a proposed timetable slot placement after running 3-way clash validation checks."""
    tenant_id = getattr(g, 'tenant_id', None)
    branch_id = getattr(g, 'branch_id', None)

    if not tenant_id or not branch_id:
        return jsonify({"success": False, "message": "Tenant and Branch context required."}), 400

    slot = TimetableSlot.query.get(slot_id)
    if not slot:
        return jsonify({"success": False, "message": "Timetable slot not found."}), 404

    data = request.json
    conflicts = TimetableEngine.check_conflicts(tenant_id, branch_id, data, current_slot_id=slot_id)
    if conflicts:
        return jsonify({
            "success": False, 
            "message": "Scheduling Conflict Detected", 
            "conflicts": conflicts
        }), 400

    try:
        slot.class_id = data.get('class_id', slot.class_id)
        slot.subject_id = data.get('subject_id', slot.subject_id)
        slot.teacher_id = data.get('teacher_id', slot.teacher_id)
        slot.period_id = data.get('period_id', slot.period_id)
        slot.day_of_week = data.get('day_of_week', slot.day_of_week)
        slot.term = data.get('term', slot.term)
        slot.academic_year = data.get('academic_year', slot.academic_year)
        slot.room_id = data.get('room_id', slot.room_id)
        
        db.session.commit()
        return jsonify({"success": True, "id": slot.id}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({"success": False, "message": "Failed to update slot.", "error": str(e)}), 500


@saas_report_bp.route('/saas/timetable/slots/<int:slot_id>', methods=['DELETE'])
@tenant_required
def delete_timetable_slot(slot_id):
    """Deletes a timetable slot."""
    slot = TimetableSlot.query.get(slot_id)
    if not slot:
        return jsonify({"success": False, "message": "Timetable slot not found."}), 404

    try:
        db.session.delete(slot)
        db.session.commit()
        return jsonify({"success": True, "message": "Slot deleted successfully."}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({"success": False, "message": "Failed to delete slot.", "error": str(e)}), 500


