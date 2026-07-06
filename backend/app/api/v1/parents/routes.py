from flask import Blueprint, request, jsonify, g
from flask_jwt_extended import jwt_required, get_jwt_identity
from marshmallow import ValidationError
from app.api.v1.parents import parents_bp
from app.services.parent_service import ParentService
from app.schemas.parent import ParentSchema, ParentCreateSchema, ParentUpdateSchema
from app.schemas.student import StudentSchema
from app.schemas.attendance import AttendanceSchema
from app.schemas.grade import GradeSchema
from app.schemas.message import MessageSchema
from app.schemas.notification import NotificationSchema
from app.services.message_service import MessageService
from app.utils.auth_utils import admin_required, teacher_required, parent_required
from app.utils.tenant_context import tenant_required
from app.utils.response import success_response, error_response, paginated_response
from app.models.tenant import Tenant
from sqlalchemy.exc import SQLAlchemyError
import logging

logger = logging.getLogger(__name__)

# Initialize schemas
parent_schema = ParentSchema()
parents_schema = ParentSchema(many=True)
parent_create_schema = ParentCreateSchema()
parent_update_schema = ParentUpdateSchema()
student_schema = StudentSchema()
students_schema = StudentSchema(many=True)
attendance_schema = AttendanceSchema()
attendances_schema = AttendanceSchema(many=True)
grade_schema = GradeSchema()
grades_schema = GradeSchema(many=True)
messages_schema = MessageSchema(many=True)
notification_schema = NotificationSchema()
notifications_schema = NotificationSchema(many=True)


def _resolve_school_currency(student=None, fallback='USD'):
    tenant_id = getattr(g, 'tenant_id', None) or getattr(student, 'tenant_id', None)
    if tenant_id:
        tenant = Tenant.query.filter_by(id=tenant_id).first()
        if tenant and getattr(tenant, 'currency', None):
            return str(tenant.currency).upper()
    return str(fallback or 'USD').upper()

@parents_bp.route('', methods=['GET'])
@jwt_required()
@admin_required
@tenant_required
def get_parents():
    """Get all parents with pagination"""
    try:
        page = request.args.get('page', 1, type=int)
        per_page = min(request.args.get('per_page', 10, type=int), 100)
        search = request.args.get('search', '')
        status = request.args.get('status')
        
        tenant_id = getattr(g, 'tenant_id', None)
        parents, total = ParentService.get_all_parents(
            page=page,
            per_page=per_page,
            search=search,
            status=status,
            tenant_id=tenant_id,
        )
        
        if not parents:
            return jsonify({
                "success": True,
                "parents": [],
                "total": 0,
                "page": page,
                "per_page": per_page
            }), 200
        
        return success_response(
            data={
                'parents': parents_schema.dump(parents),
                'pagination': {
                    'page': page,
                    'per_page': per_page,
                    'total': total,
                    'pages': (total + per_page - 1) // per_page
                }
            },
            message="Parents retrieved successfully"
        )
    except Exception as e:
        logger.error(f"Error retrieving parents: {str(e)}")
        return jsonify({
            "success": True,
            "parents": [],
            "total": 0,
            "page": 1,
            "per_page": 10
        }), 200

@parents_bp.route('', methods=['POST'])
@jwt_required()
@admin_required
@tenant_required
def create_parent():
    """Create a new parent"""
    try:
        data = parent_create_schema.load(request.json)
        parent = ParentService.create_parent(data, tenant_id=getattr(g, 'tenant_id', None))
        return success_response(
            data=parent_schema.dump(parent),
            message="Parent created successfully",
            status_code=201
        )
    except ValidationError as e:
        return error_response(message="Validation error", errors=e.messages, status_code=400)
    except ValueError as e:
        logger.warning(f"Validation error creating parent: {str(e)}")
        return error_response(message=str(e), status_code=400)
    except SQLAlchemyError as e:
        logger.error(f"Database error creating parent: {str(e)}")
        return error_response(message="Failed to create parent", status_code=500)
    except Exception as e:
        logger.error(f"Error creating parent: {str(e)}")
        return error_response(message="Failed to create parent", status_code=500)

@parents_bp.route('/<int:parent_id>', methods=['GET'])
@jwt_required()
@admin_required
@tenant_required
def get_parent(parent_id):
    """Get a specific parent by ID"""
    try:
        parent = ParentService.get_parent_by_id(parent_id)
        if parent and getattr(parent, 'tenant_id', None) != getattr(g, 'tenant_id', None):
            parent = None
        if not parent:
            return error_response(message="Parent not found", status_code=404)
        
        return success_response(
            data=parent_schema.dump(parent),
            message="Parent retrieved successfully"
        )
    except Exception as e:
        logger.error(f"Error retrieving parent {parent_id}: {str(e)}")
        return error_response(message="Failed to retrieve parent", status_code=500)

@parents_bp.route('/<int:parent_id>', methods=['PUT'])
@jwt_required()
@admin_required
@tenant_required
def update_parent(parent_id):
    """Update a specific parent"""
    try:
        data = parent_update_schema.load(request.json)
        parent = ParentService.update_parent(parent_id, data)
        if parent and getattr(parent, 'tenant_id', None) != getattr(g, 'tenant_id', None):
            parent = None
        if not parent:
            return error_response(message="Parent not found", status_code=404)
        
        return success_response(
            data=parent_schema.dump(parent),
            message="Parent updated successfully"
        )
    except ValidationError as e:
        return error_response(message="Validation error", errors=e.messages, status_code=400)
    except SQLAlchemyError as e:
        logger.error(f"Database error updating parent {parent_id}: {str(e)}")
        return error_response(message="Failed to update parent", status_code=500)
    except Exception as e:
        logger.error(f"Error updating parent {parent_id}: {str(e)}")
        return error_response(message="Failed to update parent", status_code=500)

@parents_bp.route('/<int:parent_id>', methods=['DELETE'])
@jwt_required()
@admin_required
@tenant_required
def delete_parent(parent_id):
    """Delete a specific parent"""
    try:
        parent = ParentService.get_parent_by_id(parent_id)
        if not parent or getattr(parent, 'tenant_id', None) != getattr(g, 'tenant_id', None):
            return error_response(message="Parent not found", status_code=404)
        success = ParentService.delete_parent(parent_id)
        if not success:
            return error_response(message="Parent not found", status_code=404)
        
        return success_response(message="Parent deleted successfully")
    except SQLAlchemyError as e:
        logger.error(f"Database error deleting parent {parent_id}: {str(e)}")
        return error_response(message="Failed to delete parent", status_code=500)
    except Exception as e:
        logger.error(f"Error deleting parent {parent_id}: {str(e)}")
        return error_response(message="Failed to delete parent", status_code=500)

@parents_bp.route('/<int:parent_id>/children', methods=['GET'])
@jwt_required()
@admin_required
@tenant_required
def get_parent_children(parent_id):
    """Get children of a specific parent"""
    try:
        page = request.args.get('page', 1, type=int)
        per_page = min(request.args.get('per_page', 10, type=int), 100)
        
        parent = ParentService.get_parent_by_id(parent_id)
        if not parent or getattr(parent, 'tenant_id', None) != getattr(g, 'tenant_id', None):
            return error_response(message="Parent not found", status_code=404)
        children, total = ParentService.get_children(parent_id, page=page, per_page=per_page)
        
        return success_response(
            data={
                'children': students_schema.dump(children),
                'pagination': {
                    'page': page,
                    'per_page': per_page,
                    'total': total,
                    'pages': (total + per_page - 1) // per_page
                }
            },
            message="Children retrieved successfully"
        )
    except Exception as e:
        logger.error(f"Error retrieving children for parent {parent_id}: {str(e)}")
        return error_response(message="Failed to retrieve children", status_code=500)

# Parent Dashboard Routes
@parents_bp.route('/dashboard', methods=['GET'])
@jwt_required()
@parent_required
def get_parent_dashboard():
    """Get parent dashboard data"""
    try:
        current_user_id = get_jwt_identity()
        parent = ParentService.get_parent_by_user_id(current_user_id)
        
        if not parent:
            return error_response(message="Parent profile not found", status_code=404)
        
        dashboard_data = ParentService.get_parent_dashboard_stats(parent.id)
        
        return success_response(
            data=dashboard_data,
            message="Dashboard data retrieved successfully"
        )
    except Exception as e:
        logger.error(f"Error retrieving parent dashboard: {str(e)}")
        return error_response(message="Failed to retrieve dashboard data", status_code=500)

@parents_bp.route('/profile', methods=['GET'])
@jwt_required()
@parent_required
def get_parent_profile():
    """Get current parent's profile"""
    try:
        current_user_id = get_jwt_identity()
        parent = ParentService.get_parent_by_user_id(current_user_id)
        
        if not parent:
            return error_response(message="Parent profile not found", status_code=404)
        
        return success_response(
            data=parent_schema.dump(parent),
            message="Profile retrieved successfully"
        )
    except Exception as e:
        logger.error(f"Error retrieving parent profile: {str(e)}")
        return error_response(message="Failed to retrieve profile", status_code=500)

@parents_bp.route('/profile', methods=['PUT'])
@jwt_required()
@parent_required
def update_parent_profile():
    """Update current parent's profile"""
    try:
        current_user_id = get_jwt_identity()
        parent = ParentService.get_parent_by_user_id(current_user_id)
        
        if not parent:
            return error_response(message="Parent profile not found", status_code=404)
        
        data = parent_update_schema.load(request.json)
        updated_parent = ParentService.update_parent(parent.id, data)
        
        return success_response(
            data=parent_schema.dump(updated_parent),
            message="Profile updated successfully"
        )
    except ValidationError as e:
        return error_response(message="Validation error", errors=e.messages, status_code=400)
    except Exception as e:
        logger.error(f"Error updating parent profile: {str(e)}")
        return error_response(message="Failed to update profile", status_code=500)

@parents_bp.route('/children', methods=['GET'])
@jwt_required()
@parent_required
def get_my_children():
    """Get current parent's children"""
    try:
        current_user_id = get_jwt_identity()
        parent = ParentService.get_parent_by_user_id(current_user_id)
        
        if not parent:
            return error_response(message="Parent profile not found", status_code=404)
        
        page = request.args.get('page', 1, type=int)
        per_page = min(request.args.get('per_page', 10, type=int), 100)
        
        children, total = ParentService.get_children(parent.id, page=page, per_page=per_page)
        
        # Get summary data for each child
        children_data = []
        for child in children:
            child_data = student_schema.dump(child)
            child_summary = ParentService.get_child_summary(child.id)
            child_data.update(child_summary)
            children_data.append(child_data)
        
        return success_response(
            data={
                'children': children_data,
                'pagination': {
                    'page': page,
                    'per_page': per_page,
                    'total': total,
                    'pages': (total + per_page - 1) // per_page
                }
            },
            message="Children retrieved successfully"
        )
    except Exception as e:
        logger.error(f"Error retrieving children: {str(e)}")
        return error_response(message="Failed to retrieve children", status_code=500)

@parents_bp.route('/children/<int:child_id>/attendance', methods=['GET'])
@jwt_required()
@parent_required
def get_child_attendance(child_id):
    """Get attendance records for a specific child"""
    try:
        current_user_id = get_jwt_identity()
        parent = ParentService.get_parent_by_user_id(current_user_id)
        
        if not parent:
            return error_response(message="Parent profile not found", status_code=404)
        
        children, _ = ParentService.get_children(parent.id)
        child_ids = [child.id for child in children]

        if child_id not in child_ids:
            return error_response(message="Child not found or access denied", status_code=403)

        # Early structural existence check
        from app.models.attendance import Attendance
        has_records = Attendance.query.filter_by(student_id=child_id).first() is not None
        page = request.args.get('page', 1, type=int)
        per_page = min(request.args.get('per_page', 20, type=int), 100)
        if not has_records:
            return success_response(
                data={
                    'attendance': [],
                    'pagination': {
                        'page': page,
                        'per_page': per_page,
                        'total': 0,
                        'pages': 0
                    }
                },
                message="Attendance records retrieved successfully"
            )
        
        from app.services.attendance_service import AttendanceService
        from datetime import datetime
        start_date = request.args.get('start_date')
        end_date = request.args.get('end_date')

        date_from = None
        date_to = None
        if start_date:
            try:
                date_from = datetime.strptime(start_date, '%Y-%m-%d').date()
            except ValueError:
                return error_response(message="Invalid start_date format. Use YYYY-MM-DD", status_code=400)
        if end_date:
            try:
                date_to = datetime.strptime(end_date, '%Y-%m-%d').date()
            except ValueError:
                return error_response(message="Invalid end_date format. Use YYYY-MM-DD", status_code=400)

        paginated = AttendanceService.get_all_attendances(
            page=page,
            per_page=per_page,
            class_id=None,
            student_id=child_id,
            date_from=date_from,
            date_to=date_to,
            status=None
        )
        
        return success_response(
            data={
                'attendance': attendances_schema.dump(paginated.items),
                'pagination': {
                    'page': page,
                    'per_page': per_page,
                    'total': paginated.total,
                    'pages': paginated.pages
                }
            },
            message="Attendance records retrieved successfully"
        )
    except Exception as e:
        logger.error(f"Error retrieving child attendance: {str(e)}")
        return error_response(message="Failed to retrieve attendance records", status_code=500)

@parents_bp.route('/children/<int:child_id>/grades', methods=['GET'])
@jwt_required()
@parent_required
def get_child_grades(child_id):
    """Get grade records for a specific child"""
    try:
        current_user_id = get_jwt_identity()
        parent = ParentService.get_parent_by_user_id(current_user_id)
        
        if not parent:
            return error_response(message="Parent profile not found", status_code=404)
        
        # Verify child belongs to parent
        children, _ = ParentService.get_children(parent.id)
        child_ids = [child.id for child in children]
        
        if child_id not in child_ids:
            return error_response(message="Child not found or access denied", status_code=403)

        # Early structural existence check
        from app.models.grade import Grade
        has_records = Grade.query.filter_by(student_id=child_id).first() is not None
        page = request.args.get('page', 1, type=int)
        per_page = min(request.args.get('per_page', 20, type=int), 100)
        subject_id = request.args.get('subject_id', type=int)
        if not has_records:
            return success_response(
                data={
                    'grades': [],
                    'pagination': {
                        'page': page,
                        'per_page': per_page,
                        'total': 0,
                        'pages': 0
                    }
                },
                message="Grade records retrieved successfully"
            )
        
        # Get grade records
        from app.services.grade_service import GradeService
        
        paginated = GradeService.get_student_grades(
            child_id, page=page, per_page=per_page, subject_id=subject_id
        )
        
        return success_response(
            data={
                'grades': grades_schema.dump(paginated.items),
                'pagination': {
                    'page': page,
                    'per_page': per_page,
                    'total': paginated.total,
                    'pages': paginated.pages
                }
            },
            message="Grade records retrieved successfully"
        )
    except Exception as e:
        logger.error(f"Error retrieving child grades: {str(e)}")
        return error_response(message="Failed to retrieve grade records", status_code=500)

@parents_bp.route('/notifications', methods=['GET'])
@jwt_required()
@parent_required
def get_parent_notifications():
    """Get notifications for the current parent"""
    try:
        current_user_id = get_jwt_identity()
        
        # Get notifications
        from app.services.notification_service import NotificationService
        page = request.args.get('page', 1, type=int)
        per_page = min(request.args.get('per_page', 20, type=int), 100)
        unread_only = request.args.get('unread_only', 'false').lower() == 'true'
        
        notifications, total = NotificationService.get_user_notifications(
            current_user_id, page=page, per_page=per_page, unread_only=unread_only
        )
        
        return success_response(
            data={
                'notifications': notifications_schema.dump(notifications),
                'pagination': {
                    'page': page,
                    'per_page': per_page,
                    'total': total,
                    'pages': (total + per_page - 1) // per_page
                }
            },
            message="Notifications retrieved successfully"
        )
    except Exception as e:
        logger.error(f"Error retrieving notifications: {str(e)}")
        return error_response(message="Failed to retrieve notifications", status_code=500)

@parents_bp.route('/notifications/<int:notification_id>/read', methods=['PUT'])
@jwt_required()
@parent_required
def mark_notification_read(notification_id):
    """Mark a notification as read"""
    try:
        current_user_id = get_jwt_identity()
        
        from app.services.notification_service import NotificationService
        success = NotificationService.mark_as_read(notification_id, current_user_id)
        
        if not success:
            return error_response(message="Notification not found or access denied", status_code=404)
        
        return success_response(message="Notification marked as read")
    except Exception as e:
        logger.error(f"Error marking notification as read: {str(e)}")
        return error_response(message="Failed to mark notification as read", status_code=500)

@parents_bp.route('/events', methods=['GET'])
@jwt_required()
@parent_required
def get_parent_events():
    """Get events relevant to parent's children"""
    try:
        current_user_id = get_jwt_identity()
        parent = ParentService.get_parent_by_user_id(current_user_id)
        
        if not parent:
            return error_response(message="Parent profile not found", status_code=404)
        
        page = request.args.get('page', 1, type=int)
        per_page = min(request.args.get('per_page', 20, type=int), 100)
        
        # For now, return empty events list
        events = []
        total = 0
        
        return success_response(
            data={
                'events': events,
                'pagination': {
                    'page': page,
                    'per_page': per_page,
                    'total': total,
                    'pages': 0
                }
            },
            message="Events retrieved successfully"
        )
    except Exception as e:
        logger.error(f"Error retrieving parent events: {str(e)}")
        return error_response(message="Failed to retrieve events", status_code=500)

@parents_bp.route('/children/<int:child_id>/homework', methods=['GET'])
@jwt_required()
@parent_required
def get_child_homework(child_id):
    """Get homework assignments for a specific child"""
    try:
        current_user_id = get_jwt_identity()
        parent = ParentService.get_parent_by_user_id(current_user_id)
        
        if not parent:
            return error_response(message="Parent profile not found", status_code=404)
        
        children, _ = ParentService.get_children(parent.id)
        child_ids = [child.id for child in children]

        if child_id not in child_ids:
            return error_response(message="Child not found or access denied", status_code=403)
        
        # Get homework assignments
        page = request.args.get('page', 1, type=int)
        per_page = min(request.args.get('per_page', 20, type=int), 100)
        
        from app.models.student import Student
        from app.models.assignment import Assignment
        from app.models.assignment_submission import AssignmentSubmission
        from app.services.assignment_service import AssignmentService
        
        child = Student.query.get(child_id)
        if not child or not child.class_id:
            homework = []
            total = 0
        else:
            query = Assignment.query.filter_by(class_id=child.class_id, status='active')
            total = query.count()
            items = query.order_by(Assignment.due_date.desc()).offset((page - 1) * per_page).limit(per_page).all()
            submissions = AssignmentSubmission.query.filter_by(student_id=child.id).all()
            submission_map = {submission.assignment_id: submission for submission in submissions}
            assignment_attachment_map = AssignmentService.get_attachment_map('assignment', [assignment.id for assignment in items])
            submission_attachment_map = AssignmentService.get_attachment_map('assignment_submission', [submission.id for submission in submissions])
            
            homework = []
            for a in items:
                submission = submission_map.get(a.id)
                status = 'pending'
                if submission:
                    status = 'graded' if submission.status == 'graded' or submission.score is not None else 'submitted'
                homework.append({
                    'id': a.id,
                    'title': a.title,
                    'description': a.description or '',
                    'instructions': a.description or '',
                    'due_date': a.due_date.isoformat(),
                    'dueAt': a.due_date.isoformat(),
                    'subject_name': a.subject.name if a.subject else 'Subject',
                    'assignment_type': a.assignment_type,
                    'total_points': a.total_points,
                    'status': status,
                    'score': submission.score if submission else None,
                    'feedback': submission.feedback if submission else None,
                    'submission_date': submission.submission_date.isoformat() if submission and submission.submission_date else None,
                    'attachments': assignment_attachment_map.get(str(a.id), []),
                    'submission_attachments': submission_attachment_map.get(str(submission.id), []) if submission else [],
                })
        
        return success_response(
            data={
                'homework': homework,
                'pagination': {
                    'page': page,
                    'per_page': per_page,
                    'total': total,
                    'pages': (total + per_page - 1) // per_page
                }
            },
            message="Homework assignments retrieved successfully"
        )
    except Exception as e:
        logger.error(f"Error retrieving child homework: {str(e)}")
        return error_response(message="Failed to retrieve homework assignments", status_code=500)

@parents_bp.route('/children/<int:child_id>/fees', methods=['GET'])
@jwt_required()
@parent_required
def get_child_fees(child_id):
    """Get fee records for a specific child"""
    try:
        current_user_id = get_jwt_identity()
        parent = ParentService.get_parent_by_user_id(current_user_id)
        
        if not parent:
            return error_response(message="Parent profile not found", status_code=404)
        
        children, _ = ParentService.get_children(parent.id)
        child_ids = [child.id for child in children]

        if child_id not in child_ids:
            return error_response(message="Child not found or access denied", status_code=403)

        from app.models.finance import StudentFee, Payment
        from math import ceil
        child = next((item for item in children if item.id == child_id), None)
        currency = _resolve_school_currency(child)
        fee_query = StudentFee.query_scoped().filter_by(student_id=child_id)
        fee_records = fee_query.order_by(StudentFee.created_at.desc()).all()
        page = request.args.get('page', 1, type=int)
        per_page = min(request.args.get('per_page', 20, type=int), 100)
        if not fee_records:
            return success_response(
                data={
                    'student_id': child_id,
                    'currency': currency,
                    'total_fees': 0,
                    'paid_amount': 0,
                    'pending_amount': 0,
                    'fee_structure': [],
                    'payment_history': [],
                    'fees': [],
                    'pagination': {
                        'page': page,
                        'per_page': per_page,
                        'total': 0,
                        'pages': 0
                    }
                },
                message="Fee records retrieved successfully"
            )
        
        total_count = len(fee_records)
        start_index = max(0, (page - 1) * per_page)
        end_index = start_index + per_page
        page_fee_records = fee_records[start_index:end_index]
        today = datetime.utcnow().date()

        def serialize_fee_record(record):
            structure = getattr(record, 'structure', None)
            category = getattr(getattr(structure, 'category', None), 'name', None) or 'Fee'
            due_date = getattr(structure, 'due_date', None)
            balance = float(record.balance or 0)
            status = record.status or 'pending'
            structure_class = getattr(structure, 'class_', None)
            if due_date and due_date < today and balance > 0:
                status = 'overdue'

            return {
                'id': record.id,
                'fee_structure_id': getattr(structure, 'id', None),
                'template_group_id': f"{getattr(structure, 'academic_year', '')}__{getattr(structure, 'term', '')}__{getattr(structure, 'class_id', None) or 0}" if structure else None,
                'category': category,
                'amount': float(record.final_amount or 0),
                'paid_amount': float(record.paid_amount or 0),
                'balance': balance,
                'currency': currency,
                'academic_year': getattr(structure, 'academic_year', None),
                'term': getattr(structure, 'term', None),
                'class_id': getattr(structure, 'class_id', None),
                'class_name': (getattr(structure_class, 'display_name', None) or getattr(structure_class, 'name', None)) if structure_class else None,
                'due_date': due_date.isoformat() if due_date else '',
                'status': status
            }

        serialized_fees = [serialize_fee_record(record) for record in page_fee_records]
        fee_structure = [serialize_fee_record(record) for record in fee_records]

        payments = Payment.query.filter_by(student_id=child_id).order_by(Payment.paid_at.desc()).all()
        payment_history = [{
            'date': payment.paid_at.date().isoformat() if payment.paid_at else '',
            'amount': float(payment.amount or 0),
            'currency': currency,
            'method': payment.payment_method or 'payment',
            'receipt_number': payment.receipt_number or payment.transaction_id or ''
        } for payment in payments]

        total_fees = sum(float(record.final_amount or 0) for record in fee_records)
        paid_amount = sum(float(record.paid_amount or 0) for record in fee_records)
        pending_amount = sum(float(record.balance or 0) for record in fee_records)
        
        return success_response(
            data={
                'student_id': child_id,
                'currency': currency,
                'total_fees': total_fees,
                'paid_amount': paid_amount,
                'pending_amount': pending_amount,
                'fee_structure': fee_structure,
                'payment_history': payment_history,
                'fees': serialized_fees,
                'pagination': {
                    'page': page,
                    'per_page': per_page,
                    'total': total_count,
                    'pages': ceil(total_count / per_page) if total_count else 0
                }
            },
            message="Fee records retrieved successfully"
        )
    except Exception as e:
        logger.error(f"Error retrieving child fees: {str(e)}")
        return error_response(message="Failed to retrieve fee records", status_code=500)

@parents_bp.route('/children/<int:child_id>/summary', methods=['GET'])
@jwt_required()
@parent_required
def get_child_summary_detailed(child_id):
    """Get highly detailed academic/financial summary for a specific child"""
    try:
        current_user_id = get_jwt_identity()
        parent = ParentService.get_parent_by_user_id(current_user_id)
        
        if not parent:
            return error_response(message="Parent profile not found", status_code=404)
        
        # Verify parent ownership of child
        children, _ = ParentService.get_children(parent.id)
        child_ids = [child.id for child in children]
        if child_id not in child_ids:
            return error_response(message="Child not found or access denied", status_code=403)
            
        summary_data = ParentService.get_child_detailed_summary(child_id)
        if not summary_data:
            return error_response(message="Child summary not found", status_code=404)
            
        return success_response(
            data=summary_data,
            message="Child detailed summary retrieved successfully"
        )
    except Exception as e:
        logger.error(f"Error retrieving child summary detailed: {str(e)}")
        return error_response(message="Failed to retrieve child detailed summary", status_code=500)

@parents_bp.route('/children/<int:child_id>/academic', methods=['GET'])
@jwt_required()
@parent_required
def get_child_academic(child_id):
    """Get academic records for a specific child"""
    try:
        current_user_id = get_jwt_identity()
        parent = ParentService.get_parent_by_user_id(current_user_id)
        
        if not parent:
            return error_response(message="Parent profile not found", status_code=404)
        
        children, _ = ParentService.get_children(parent.id)
        child_ids = [child.id for child in children]

        if child_id not in child_ids:
            return error_response(message="Child not found or access denied", status_code=403)
        
        # Get academic records
        page = request.args.get('page', 1, type=int)
        per_page = min(request.args.get('per_page', 20, type=int), 100)
        
        # For now, return empty academic records - can be implemented later
        academic_records = []
        total = 0
        
        return success_response(
            data={
                'academic_records': academic_records,
                'pagination': {
                    'page': page,
                    'per_page': per_page,
                    'total': total,
                    'pages': 0
                }
            },
            message="Academic records retrieved successfully"
        )
    except Exception as e:
        logger.error(f"Error retrieving child academic records: {str(e)}")
        return error_response(message="Failed to retrieve academic records", status_code=500)

@parents_bp.route('/<int:parent_id>/messages', methods=['GET'])
@jwt_required()
@parent_required
@tenant_required
def get_parent_messages(parent_id):
    """Get messages for a specific parent"""
    try:
        current_user_id = get_jwt_identity()
        parent = ParentService.get_parent_by_user_id(current_user_id)
        
        if not parent or (parent.id != parent_id and getattr(parent, 'user_id', None) != parent_id):
            return error_response(message="Parent not found or access denied", status_code=403)
        
        page = request.args.get('page', 1, type=int)
        per_page = min(request.args.get('per_page', 20, type=int), 100)
        folder = request.args.get('folder', 'all')
        is_read = request.args.get('is_read', type=bool)

        messages, total = MessageService.get_user_messages(
            user_id=current_user_id,
            folder=folder,
            is_read=is_read,
            page=page,
            per_page=per_page,
            tenant_id=getattr(g, 'tenant_id', None),
        )
        
        return success_response(
            data={
                'messages': messages_schema.dump(messages),
                'pagination': {
                    'page': page,
                    'per_page': per_page,
                    'total': total,
                    'pages': (total + per_page - 1) // per_page if per_page else 0
                }
            },
            message="Messages retrieved successfully"
        )
    except Exception as e:
        logger.error(f"Error retrieving parent messages: {str(e)}")
        return error_response(message="Failed to retrieve messages", status_code=500)
