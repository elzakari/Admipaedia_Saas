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


@saas_report_bp.route('/payments/webhook', methods=['POST'])
def paystack_webhook():
    """
    Open webhook endpoint from Paystack to settle student invoices.
    Verifies SHA512 signature, parses tenant/branch metadata,
    records payments, and updates student fee invoice balances.
    """
    from app.services.paystack_service import PaystackService
    from app.models.finance import StudentFee, Payment as StudentPayment, PaymentAllocation
    import uuid

    # 1. Cryptographic Validation
    signature = request.headers.get('x-paystack-signature')
    if not signature:
        return jsonify({"success": False, "message": "Missing x-paystack-signature header"}), 401

    raw_payload = request.data
    if not PaystackService.verify_webhook_signature(signature, raw_payload):
        return jsonify({"success": False, "message": "Invalid cryptographic signature"}), 401

    # 2. JSON Decoding
    payload = request.get_json(silent=True)
    if not payload:
        return jsonify({"success": False, "message": "Malformed JSON payload"}), 400

    # 3. Filter for charge.success event
    event = payload.get('event')
    if event != 'charge.success':
        return jsonify({"success": True, "message": f"Event {event} received and acknowledged"}), 200

    data = payload.get('data', {})
    reference = data.get('reference')
    if not reference:
        return jsonify({"success": False, "message": "Missing reference in transaction payload"}), 400

    # 4. Check for double processing (Idempotency)
    existing_payment = StudentPayment.query.filter_by(external_reference=reference).first()
    if existing_payment:
        return jsonify({"success": True, "message": "Payment already processed"}), 200

    # 5. Extract metadata context and bind to request g variables for RLS/scoping
    metadata = data.get('metadata') or {}
    tenant_id_str = metadata.get('tenant_id')
    branch_id_str = metadata.get('branch_id')
    student_id_val = metadata.get('student_id')
    student_fee_id_val = metadata.get('student_fee_id')

    if not tenant_id_str or not branch_id_str or not student_id_val or not student_fee_id_val:
        return jsonify({"success": False, "message": "Missing tenant_id, branch_id, student_id, or student_fee_id in metadata"}), 400

    try:
        g.tenant_id = uuid.UUID(str(tenant_id_str))
        g.branch_id = uuid.UUID(str(branch_id_str))
    except ValueError:
        return jsonify({"success": False, "message": "Invalid tenant_id or branch_id UUID format"}), 400

    try:
        student_id = int(student_id_val)
        student_fee_id = int(student_fee_id_val)
    except ValueError:
        return jsonify({"success": False, "message": "Invalid student_id or student_fee_id integer format"}), 400

    # 6. Fetch Student Fee and verify student ownership
    student_fee = StudentFee.query.get(student_fee_id)
    if not student_fee:
        return jsonify({"success": False, "message": f"Student fee record {student_fee_id} not found"}), 404

    if student_fee.student_id != student_id:
        return jsonify({"success": False, "message": "Student ID mismatch for target fee"}), 400

    # 7. Settle payment & allocate amount using precise Decimal mathematics
    try:
        amount_paid = PaystackService.from_minor_units(data.get('amount', 0))
        currency = data.get('currency', 'GHS')

        # Create StudentPayment record
        payment = StudentPayment(
            transaction_id=f"PMT-PAYSTACK-{reference}",
            student_id=student_id,
            amount=amount_paid,
            currency=currency,
            payment_method=data.get('channel', 'card'),
            payment_provider='paystack',
            external_reference=reference,
            status='completed',
            meta_data=payload
        )
        db.session.add(payment)
        db.session.flush()

        # Create PaymentAllocation record
        allocation = PaymentAllocation(
            payment_id=payment.id,
            student_fee_id=student_fee.id,
            amount_allocated=amount_paid
        )
        db.session.add(allocation)

        # Update fee paid amount and update balance/status
        student_fee.paid_amount = Decimal(str(student_fee.paid_amount or '0.00')) + amount_paid
        student_fee.update_balance()

        db.session.commit()
        return jsonify({"success": True, "message": "Payment recorded and invoice settled successfully"}), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({"success": False, "message": "Database transaction failed", "error": str(e)}), 500


@saas_report_bp.route('/payments/config', methods=['GET'])
def get_payment_config():
    """
    Retrieves the public key of the active Paystack payment gateway.
    This public configuration endpoint is accessible to the frontend.
    """
    from app.models.payments import PaymentGateway
    from flask import current_app
    
    gw = PaymentGateway.query.filter_by(name='paystack', is_active=True).first()
    if gw and gw.public_key:
        return jsonify({"success": True, "publicKey": gw.public_key}), 200
    
    pk = current_app.config.get('PAYSTACK_PUBLIC_KEY')
    if pk:
        return jsonify({"success": True, "publicKey": pk}), 200
        
    return jsonify({"success": False, "message": "Paystack payment gateway not configured"}), 404


@saas_report_bp.route('/saas/admissions', methods=['GET'])
@jwt_required()
@tenant_required
def get_admission_applications():
    """
    List all admission applications scoped to the active tenant.
    Optionally filters by branch_id if active branch is selected.
    """
    from app.models.admission import AdmissionApplication
    from app.models.parent import Parent
    from app.models.class_ import Class
    
    tenant_id = getattr(g, 'tenant_id', None)
    if not tenant_id:
        return jsonify({"success": False, "message": "Tenant context not found."}), 400
        
    query = AdmissionApplication.query.join(Parent, AdmissionApplication.parent_id == Parent.id).filter(Parent.tenant_id == tenant_id)
    
    branch_id = getattr(g, 'branch_id', None)
    if branch_id:
        query = query.join(Class, AdmissionApplication.target_class_id == Class.id).filter(Class.branch_id == branch_id)
        
    applications = query.order_by(AdmissionApplication.created_at.desc()).all()
    
    result = []
    for app in applications:
        result.append({
            "id": app.id,
            "parent_id": app.parent_id,
            "student_first_name": app.student_first_name,
            "student_last_name": app.student_last_name,
            "target_class_id": app.target_class_id,
            "target_class_name": app.target_class.name if app.target_class else None,
            "payment_status": app.payment_status,
            "status": app.status,
            "submission_date": app.submission_date.isoformat() if app.submission_date else None,
            "form_data": app.form_data,
            "created_at": app.created_at.isoformat() if app.created_at else None
        })
        
    return jsonify({"success": True, "applications": result}), 200


@saas_report_bp.route('/saas/admissions/<int:application_id>/status', methods=['POST'])
@jwt_required()
@tenant_required
def update_admission_status(application_id):
    """
    Transition admission application status and provision Student on acceptance.
    """
    from app.services.admission_service import AdmissionService
    
    tenant_id = getattr(g, 'tenant_id', None)
    if not tenant_id:
        return jsonify({"success": False, "message": "Tenant context not found."}), 400
        
    payload = request.json or {}
    new_status = payload.get('status')
    if not new_status:
        return jsonify({"success": False, "message": "Status parameter is required."}), 400
        
    app_record, student, raw_token, error = AdmissionService.change_application_status(
        application_id=application_id,
        new_status=new_status,
        tenant_id=tenant_id
    )
    
    if error:
        return jsonify({"success": False, "message": error}), 400
        
    response = {
        "success": True,
        "message": f"Application status transitioned to {new_status} successfully.",
        "application_id": app_record.id,
        "status": app_record.status
    }
    
    if student:
        response["student_id"] = student.id
        
    if raw_token:
        # Construct secure registration claim URL
        response["activation_url"] = f"https://admipaedia.easymsdigit.com/auth/claim-account?token={raw_token}"
        
    return jsonify(response), 200


@saas_report_bp.route('/saas/attendance/analytics', methods=['GET'])
@jwt_required()
@tenant_required
def get_attendance_analytics():
    """
    Retrieve precise class/branch attendance analytics using Decimal precision.
    """
    from app.services.attendance_analytics import AttendanceAnalytics
    
    tenant_id = getattr(g, 'tenant_id', None)
    if not tenant_id:
        return jsonify({"success": False, "message": "Tenant context not found."}), 400
        
    branch_id = getattr(g, 'branch_id', None)
    if not branch_id:
        return jsonify({"success": False, "message": "Branch context not resolved."}), 400
        
    year = request.args.get('year', datetime.now().year, type=int)
    month = request.args.get('month', datetime.now().month, type=int)
    class_id = request.args.get('class_id', type=int)
    
    stats = AttendanceAnalytics.get_monthly_branch_stats(
        branch_id=str(branch_id),
        year=year,
        month=month,
        class_id=class_id
    )
    
    # Serialize Decimals safely
    serialized_stats = serialize_decimals(stats)
    
    return jsonify({"success": True, "analytics": serialized_stats}), 200


@saas_report_bp.route('/saas/attendance/log', methods=['POST'])
@jwt_required()
@tenant_required
def log_student_attendance():
    """
    Log student attendance and dynamically trigger parent alerts for absences.
    """
    from app.models.student import Student
    from app.models.attendance import Attendance
    from app.services.notification_service import NotificationService
    
    tenant_id = getattr(g, 'tenant_id', None)
    if not tenant_id:
        return jsonify({"success": False, "message": "Tenant context not found."}), 400
        
    branch_id = getattr(g, 'branch_id', None)
    if not branch_id:
        return jsonify({"success": False, "message": "Branch context not resolved."}), 400
        
    payload = request.json or {}
    student_id = payload.get('student_id')
    class_id = payload.get('class_id')
    subject_id = payload.get('subject_id')
    date_str = payload.get('date')
    status = payload.get('status')
    remarks = payload.get('remarks')
    
    if not all([student_id, class_id, subject_id, date_str, status]):
        return jsonify({"success": False, "message": "Missing required attendance fields."}), 400
        
    try:
        from datetime import datetime
        parsed_date = datetime.strptime(str(date_str).split('T')[0].strip(), "%Y-%m-%d").date()
    except ValueError:
        return jsonify({"success": False, "message": "Invalid date format. Use YYYY-MM-DD."}), 400
        
    student = Student.query.get(student_id)
    if not student or student.tenant_id != tenant_id:
        return jsonify({"success": False, "message": "Student not found in this tenant."}), 404
        
    # Idempotent write
    record = Attendance.query.filter_by(
        student_id=student_id,
        class_id=class_id,
        subject_id=subject_id,
        date=parsed_date
    ).first()
    
    try:
        current_user_id = get_jwt_identity()
    except Exception:
        current_user_id = None
        
    if record:
        record.status = status
        if remarks is not None:
            record.remarks = remarks
        if current_user_id:
            record.recorded_by = int(current_user_id)
    else:
        record = Attendance(
            student_id=student_id,
            class_id=class_id,
            subject_id=subject_id,
            branch_id=branch_id,
            date=parsed_date,
            status=status,
            remarks=remarks,
            recorded_by=int(current_user_id) if current_user_id else None
        )
        db.session.add(record)
        
    db.session.flush()
    
    notification_sent = False
    if status == 'absent':
        # Retrieve parent details
        parent = student.parent
        parent_phone = None
        parent_email = None
        
        if parent:
            parent_phone = parent.emergency_contact
            if parent.user:
                parent_email = parent.user.email
                
        # Fallbacks to student model directly
        if not parent_phone:
            parent_phone = student.father_contact or student.mother_contact or student.phone
        if not parent_email:
            parent_email = student.father_email or student.mother_email or student.email
            
        student_name = f"{student.first_name} {student.last_name}"
        formatted_date = parsed_date.strftime("%B %d, %Y")
        
        # Dispatch SMS if phone is present
        if parent_phone:
            sms_msg = f"Dear Parent, your ward {student_name} was marked ABSENT today, {formatted_date}. Please contact school administration for details."
            NotificationService.send_sms(tenant_id, branch_id, parent_phone, sms_msg)
            notification_sent = True
            
        # Dispatch Email if email is present
        if parent_email:
            email_subject = f"Absence Notification: {student_name}"
            email_content = (
                f"Dear Parent,\n\n"
                f"We would like to inform you that your ward, {student_name}, was marked ABSENT from class today ({formatted_date}).\n\n"
                f"Please contact the school administration if you believe this is an error or to provide an explanation.\n\n"
                f"Best regards,\n"
                f"School Administration"
            )
            NotificationService.send_email(tenant_id, branch_id, parent_email, email_subject, email_content)
            notification_sent = True
            
    db.session.commit()
    
    return jsonify({
        "success": True, 
        "message": "Attendance processed successfully.", 
        "attendance_id": record.id,
        "notification_sent": notification_sent
    }), 200


@saas_report_bp.route('/saas/settings/notification-logs', methods=['GET'])
@jwt_required()
@tenant_required
def get_notification_logs():
    """
    Retrieve logged message dispatches scoped strictly to branch context.
    """
    from app.models.notification_log import NotificationLog
    
    tenant_id = getattr(g, 'tenant_id', None)
    if not tenant_id:
        return jsonify({"success": False, "message": "Tenant context not found."}), 400
        
    branch_id = getattr(g, 'branch_id', None)
    if not branch_id:
        return jsonify({"success": False, "message": "Branch context not resolved."}), 400
        
    channel = request.args.get('channel')
    status = request.args.get('status')
    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 20, type=int)
    
    query = NotificationLog.query_scoped()
    
    if channel and channel != 'all':
        query = query.filter_by(channel=channel.lower())
    if status and status != 'all':
        query = query.filter_by(status=status.lower())
        
    paginated = query.order_by(NotificationLog.created_at.desc()).paginate(
        page=page, 
        per_page=per_page, 
        error_out=False
    )
    
    result = []
    for log in paginated.items:
        result.append({
            "id": log.id,
            "channel": log.channel,
            "recipient": log.recipient,
            "subject": log.subject,
            "content": log.content,
            "status": log.status,
            "error_message": log.error_message,
            "created_at": log.created_at.isoformat() if log.created_at else None
        })
        
    # Aggregate summaries for charts
    total_sms = NotificationLog.query_scoped().filter_by(channel='sms').count()
    total_email = NotificationLog.query_scoped().filter_by(channel='email').count()
    total_success = NotificationLog.query_scoped().filter_by(status='sent').count()
    total_failed = NotificationLog.query_scoped().filter_by(status='failed').count()
    
    return jsonify({
        "success": True,
        "logs": result,
        "summary": {
            "total_count": paginated.total,
            "total_sms": total_sms,
            "total_email": total_email,
            "total_success": total_success,
            "total_failed": total_failed
        },
        "pagination": {
            "total": paginated.total,
            "pages": paginated.pages,
            "page": paginated.page,
            "per_page": paginated.per_page
        }
    }), 200






