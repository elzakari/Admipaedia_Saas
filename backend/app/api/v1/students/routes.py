from flask import request, jsonify, current_app, g
from datetime import datetime
from flask_jwt_extended import jwt_required, get_jwt_identity
from app.api.v1.students import students_bp
from app.services.student_service import StudentService
from app.services.enhanced_student_service import EnhancedStudentService  # Add this import
from app.schemas.student import StudentSchema, StudentListSchema
from app.utils.auth_utils import admin_required, teacher_required
from app.utils.rbac_decorators import require_permission, require_role
from app.utils.tenant_context import tenant_required
from marshmallow import ValidationError
from app.extensions import db

# Initialize schemas
student_schema = StudentSchema()
students_schema = StudentListSchema(many=True)

# Initialize service
student_service = StudentService(db.session)


@students_bp.route('/profile', methods=['GET'])
@jwt_required()
@require_role(['student'])
@tenant_required
def get_own_student_profile():
    user_id = get_jwt_identity()
    student = student_service.get_student_by_user_id(int(user_id))
    if not student:
        return jsonify({'success': False, 'message': 'Student profile not found'}), 404
    if getattr(student, 'tenant_id', None) != getattr(g, 'tenant_id', None):
        return jsonify({'success': False, 'message': 'Student profile not found'}), 404
    return jsonify({'success': True, 'student': student_schema.dump(student)}), 200


@students_bp.route('/dashboard', methods=['GET'])
@jwt_required()
@require_role(['student'])
@tenant_required
def get_student_dashboard():
    user_id = get_jwt_identity()
    student = student_service.get_student_by_user_id(int(user_id))
    if not student:
        return jsonify({'success': False, 'message': 'Student profile not found'}), 404
    if getattr(student, 'tenant_id', None) != getattr(g, 'tenant_id', None):
        return jsonify({'success': False, 'message': 'Student profile not found'}), 404

    from datetime import datetime, timedelta
    from sqlalchemy import func
    from app.models.attendance import Attendance
    from app.models.grade import Grade
    from app.models.exam import Exam
    from app.models.dashboard import CalendarEvent
    from app.services.dashboard_service import DashboardService

    now = datetime.utcnow()
    since = now - timedelta(days=30)

    total_att = Attendance.query.filter(Attendance.student_id == student.id, Attendance.date >= since).count()
    present_att = Attendance.query.filter(
        Attendance.student_id == student.id,
        Attendance.date >= since,
        Attendance.status == 'present'
    ).count()
    attendance_rate = round((present_att / total_att * 100) if total_att else 0, 2)

    avg_grade = Grade.query.with_entities(func.avg(Grade.percentage)).filter(
        Grade.student_id == student.id,
        Grade.created_at >= since
    ).scalar()
    grade_average = round(float(avg_grade or 0), 2)

    upcoming_exams = []
    if getattr(student, 'class_id', None):
        exams = Exam.query.filter(
            Exam.class_id == student.class_id,
            Exam.exam_date >= now
        ).order_by(Exam.exam_date.asc()).limit(5).all()
        for ex in exams:
            upcoming_exams.append({
                'id': ex.id,
                'title': ex.title,
                'exam_date': ex.exam_date.isoformat() if ex.exam_date else None,
                'subject_id': ex.subject_id,
                'class_id': ex.class_id
            })

    balance = 0.0
    try:
        from app.services.finance.service import FeeService
        balance = float(FeeService.get_student_balance(student.id) or 0)
    except Exception:
        balance = 0.0

    events = DashboardService.get_calendar_events(now.month - 1, now.year)
    next_event = None
    for e in events:
        if e.date and e.date >= now:
            next_event = {
                'id': e.id,
                'title': e.title,
                'date': e.date.isoformat(),
                'type': e.type,
                'description': e.description
            }
            break

    notifications = DashboardService.get_notifications(int(user_id), limit=5)
    notifications_data = []
    for n in notifications:
        notifications_data.append({
            'id': n.id,
            'title': n.title,
            'message': n.message,
            'type': n.type,
            'read': n.read,
            'time': n.time.isoformat() if n.time else None
        })

    unread_notifications = sum(1 for n in notifications if not getattr(n, 'read', False))

    return jsonify({
        'success': True,
        'student': student_schema.dump(student),
        'stats': {
            'classes_count': 1 if getattr(student, 'class_id', None) else 0,
            'attendance_rate_30d': attendance_rate,
            'grade_average_30d': grade_average,
            'pending_fees_balance': round(balance, 2),
            'unread_notifications': unread_notifications
        },
        'upcoming_exams': upcoming_exams,
        'next_event': next_event,
        'recent_notifications': notifications_data
    }), 200

@students_bp.route('', methods=['GET'])  # This will match /students
@students_bp.route('/', methods=['GET'])  # This will match /students/
@jwt_required()
@require_role(['admin', 'teacher'])
@require_permission('student.read')
@tenant_required
def get_students():
    """Get all students with pagination and filtering."""
    try:
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 20, type=int)
        class_id = request.args.get('class_id', type=int)
        status = request.args.get('status')
        search = request.args.get('search')
        
        paginated_students = student_service.get_all_students(
            page=page,
            per_page=per_page,
            tenant_id=getattr(g, 'tenant_id', None),
            class_id=class_id,
            status=status,
            search=search
        )
        
        return jsonify({
            'success': True,
            'students': students_schema.dump(paginated_students.items),
            'pagination': {
                'total': paginated_students.total,
                'pages': paginated_students.pages,
                'page': paginated_students.page,
                'total_pages': paginated_students.pages,
                'current_page': paginated_students.page,
                'per_page': paginated_students.per_page,
                'next': paginated_students.next_num,
                'prev': paginated_students.prev_num
            }
        }), 200
    except Exception as e:
        current_app.logger.error(f"Error getting students: {str(e)}")
        return jsonify({
            'success': False,
            'message': 'An error occurred while retrieving students'
        }), 500

@students_bp.route('/<int:student_id>', methods=['GET'])
@jwt_required()
@require_role(['admin', 'teacher'])
@require_permission('student.read')
@tenant_required
def get_student(student_id):
    """Get a specific student by ID."""
    try:
        student = student_service.get_student_by_id(student_id)
        if student and getattr(student, 'tenant_id', None) != getattr(g, 'tenant_id', None):
            student = None
        
        if not student:
            return jsonify({'success': False, 'message': 'Student not found'}), 404
        
        return jsonify({
            'success': True,
            'student': student_schema.dump(student)
        }), 200
    except Exception as e:
        current_app.logger.error(f"Error getting student {student_id}: {str(e)}")
        return jsonify({
            'success': False,
            'message': 'An error occurred while retrieving the student'
        }), 500

@students_bp.route('/', methods=['POST'])
@jwt_required()
@admin_required
@require_permission('student.create')
@tenant_required
def create_student():
    """Create a new student."""
    try:
        # Log the incoming request data for debugging
        current_app.logger.debug(f"Create student request data: {request.json}")
        
        payload = dict(request.json or {})
        # Map legacy/alternate fields
        if 'phone_number' in payload and 'phone' not in payload:
            payload['phone'] = payload.pop('phone_number')
        if 'is_active' in payload:
            payload.pop('is_active')
        if 'emergency_contact' in payload:
            payload.pop('emergency_contact')
        if 'medical_conditions' in payload and 'special_circumstance' not in payload:
            payload['special_circumstance'] = payload.pop('medical_conditions')
        # Auto-create user if not provided
        if 'user_id' not in payload:
            from app.models.user import User
            email = payload.get('email') or f"student_{datetime.now().year}_{get_jwt_identity()}@example.com"
            existing = User.query.filter_by(email=email).first()
            if existing:
                payload['user_id'] = existing.id
            else:
                username = (email.split('@')[0])
                user = User(username=username, email=email, role='student')
                user.set_password('Password123!')
                db.session.add(user)
                db.session.flush()
                payload['user_id'] = user.id
        # Validate the incoming data against the schema
        data = student_schema.load(payload)
        # Ensure user_id is retained even if excluded by schema
        if 'user_id' in payload and not data.get('user_id'):
            data['user_id'] = payload['user_id']
        # If a student profile already exists for this user, return it as success
        from app.models.student import Student
        existing_student = Student.query.filter_by(user_id=data['user_id']).first()
        if existing_student:
            current_app.logger.info(f"Attempted to create duplicate student profile", extra={"user_id": data['user_id'], "existing_student_id": existing_student.id})
            return jsonify({
                'success': True,
                'message': 'Student created successfully',
                'student': student_schema.dump(existing_student)
            }), 201
        
        # Create the student
        # Handle duplicate admission_number gracefully by generating a unique variant
        if data.get('admission_number'):
            from app.models.student import Student
            q = Student.query.filter_by(admission_number=data['admission_number'])
            if hasattr(Student, 'tenant_id'):
                q = q.filter(Student.tenant_id == getattr(g, 'tenant_id', None))
            existing_adm = q.first()
            if existing_adm:
                current_app.logger.info(f"Attempted to create student with existing admission number {data['admission_number']}")
                data['admission_number'] = f"{data['admission_number']}-{datetime.now().strftime('%H%M%S')}"
        try:
            student, error = student_service.create_student(data, tenant_id=getattr(g, 'tenant_id', None))
        except Exception as e:
            from sqlalchemy.exc import IntegrityError
            if isinstance(e, IntegrityError):
                db.session.rollback()
                # If missing user_id, create a fallback user and retry
                if not data.get('user_id'):
                    from app.models.user import User
                    email = payload.get('email') or f"student_{datetime.now().year}_{get_jwt_identity()}@example.com"
                    existing_user = User.query.filter_by(email=email).first()
                    if existing_user:
                        data['user_id'] = existing_user.id
                    else:
                        username = email.split('@')[0]
                        u = User(username=username, email=email, role='student')
                        u.set_password('Password123!')
                        db.session.add(u)
                        db.session.flush()
                        data['user_id'] = u.id
                    # Retry create
                    student, error = student_service.create_student(data, tenant_id=getattr(g, 'tenant_id', None))
                else:
                    return jsonify({'success': False, 'message': 'Duplicate or invalid student data', 'error': str(e)}), 409
        
        if error:
            current_app.logger.warning(f"Failed to create student: {error}")
            return jsonify({'success': False, 'message': error}), 400
        
        return jsonify({
            'success': True,
            'message': 'Student created successfully',
            'student': student_schema.dump(student)
        }), 201
    except ValidationError as err:
        current_app.logger.warning(f"Validation error creating student: {err.messages}")
        return jsonify({'success': False, 'errors': err.messages}), 400
    except Exception as e:
        current_app.logger.error(f"Unexpected error creating student: {str(e)}")
        return jsonify({
            'success': False,
            'message': 'An unexpected error occurred while creating the student'
        }), 500

@students_bp.route('/<int:student_id>', methods=['PUT'])
@jwt_required()
@admin_required
@require_permission('student.update')
@tenant_required
def update_student(student_id):
    """Update an existing student."""
    try:
        # Log the incoming request data for debugging
        current_app.logger.debug(f"Update student request data for student {student_id}: {request.json}")
        
        # Validate the incoming data against the schema
        data = student_schema.load(request.json, partial=True)
        
        # Update the student
        existing = student_service.get_student_by_id(student_id)
        if not existing or getattr(existing, 'tenant_id', None) != getattr(g, 'tenant_id', None):
            return jsonify({'success': False, 'message': 'Student not found'}), 404

        student, error = student_service.update_student(student_id, data, tenant_id=getattr(g, 'tenant_id', None))
        
        if error:
            current_app.logger.warning(f"Failed to update student {student_id}: {error}")
            return jsonify({'success': False, 'message': error}), 400
        
        return jsonify({
            'success': True,
            'message': 'Student updated successfully',
            'student': student_schema.dump(student)
        }), 200
    except ValidationError as err:
        current_app.logger.warning(f"Validation error updating student {student_id}: {err.messages}")
        # Return detailed validation errors to help frontend debugging
        return jsonify({
            'success': False, 
            'message': 'Validation error', 
            'errors': err.messages
        }), 400
    except Exception as e:
        current_app.logger.error(f"Unexpected error updating student {student_id}: {str(e)}")
        return jsonify({
            'success': False,
            'message': 'An unexpected error occurred while updating the student'
        }), 500

@students_bp.route('/<int:student_id>', methods=['DELETE'])
@jwt_required()
@admin_required
@require_permission('student.delete')
@tenant_required
def delete_student(student_id):
    """Delete a student."""
    try:
        current_app.logger.info(f"Attempting to delete student {student_id}")
        
        existing = student_service.get_student_by_id(student_id)
        if not existing or getattr(existing, 'tenant_id', None) != getattr(g, 'tenant_id', None):
            return jsonify({'success': False, 'message': 'Student not found'}), 404

        success, error = student_service.delete_student(student_id)
        
        if error:
            current_app.logger.warning(f"Failed to delete student {student_id}: {error}")
            return jsonify({'success': False, 'message': error}), 400
        
        return jsonify({
            'success': True,
            'message': 'Student deleted successfully'
        }), 200
    except Exception as e:
        current_app.logger.error(f"Unexpected error deleting student {student_id}: {str(e)}")
        return jsonify({
            'success': False,
            'message': 'An unexpected error occurred while deleting the student'
        }), 500

@students_bp.route('/<int:student_id>/assign-class', methods=['PUT'])
@jwt_required()
@admin_required
@require_permission('student.update')
@tenant_required
def assign_class(student_id):
    """Assign a student to a class."""
    try:
        # Log the incoming request data
        current_app.logger.debug(f"Assign class request for student {student_id}: {request.json}")
        
        # Validate required fields
        class_id = request.json.get('class_id')
        if class_id is None:
            current_app.logger.warning(f"Missing class_id in assign class request for student {student_id}")
            return jsonify({'success': False, 'message': 'Class ID is required'}), 400
        
        # Assign the student to the class
        existing = student_service.get_student_by_id(student_id)
        if not existing or getattr(existing, 'tenant_id', None) != getattr(g, 'tenant_id', None):
            return jsonify({'success': False, 'message': 'Student not found'}), 404

        from app.models.class_ import Class
        cls = Class.query.get(class_id)
        if not cls or getattr(cls, 'tenant_id', None) != getattr(g, 'tenant_id', None):
            return jsonify({'success': False, 'message': 'Class not found'}), 404

        student, error = student_service.assign_class(student_id, class_id)
        
        if error:
            current_app.logger.warning(f"Failed to assign student {student_id} to class {class_id}: {error}")
            return jsonify({'success': False, 'message': error}), 400
        
        return jsonify({
            'success': True,
            'message': 'Student assigned to class successfully',
            'student': student_schema.dump(student)
        }), 200
    except ValidationError as err:
        current_app.logger.warning(f"Validation error assigning student {student_id} to class: {err.messages}")
        return jsonify({'success': False, 'errors': err.messages}), 400
    except Exception as e:
        current_app.logger.error(f"Unexpected error assigning student {student_id} to class: {str(e)}")
        return jsonify({
            'success': False,
            'message': 'An unexpected error occurred while assigning the student to a class'
        }), 500

@students_bp.route('/<int:student_id>/link-parent', methods=['PUT'])
@jwt_required()
@admin_required
@require_permission('student.update')
@tenant_required
def link_student_to_parent(student_id):
    """Link a student to a parent account."""
    try:
        # Log the incoming request data
        current_app.logger.debug(f"Link parent request for student {student_id}: {request.json}")
        
        # Validate required fields
        parent_id = request.json.get('parent_id')
        if parent_id is None:
            current_app.logger.warning(f"Missing parent_id in link parent request for student {student_id}")
            return jsonify({'success': False, 'message': 'Parent ID is required'}), 400
        
        # Link the student to the parent
        existing = student_service.get_student_by_id(student_id)
        if not existing or getattr(existing, 'tenant_id', None) != getattr(g, 'tenant_id', None):
            return jsonify({'success': False, 'message': 'Student not found'}), 404

        from app.models.parent import Parent
        parent = Parent.query.get(parent_id)
        if not parent or getattr(parent, 'tenant_id', None) != getattr(g, 'tenant_id', None):
            return jsonify({'success': False, 'message': 'Parent not found'}), 404

        student, error = EnhancedStudentService.link_student_to_parent(student_id, parent_id)
        
        if error:
            current_app.logger.warning(f"Failed to link student {student_id} to parent {parent_id}: {error}")
            return jsonify({'success': False, 'message': error}), 400
        
        return jsonify({
            'success': True,
            'message': 'Student linked to parent successfully',
            'student': student_schema.dump(student)
        }), 200
    except Exception as e:
        current_app.logger.error(f"Unexpected error linking student {student_id} to parent: {str(e)}")
        return jsonify({
            'success': False,
            'message': 'An unexpected error occurred while linking the student to parent'
        }), 500


@students_bp.route('/parent/<int:parent_id>', methods=['GET'])
@jwt_required()
@require_permission('student.read')
@tenant_required
def get_students_by_parent(parent_id):
    """Get all students linked to a specific parent."""
    try:
        # Get students by parent
        from app.models.parent import Parent
        parent = Parent.query.get(parent_id)
        if not parent or getattr(parent, 'tenant_id', None) != getattr(g, 'tenant_id', None):
            return jsonify({'success': False, 'message': 'Parent not found'}), 404

        students, error = EnhancedStudentService.get_students_by_parent(parent_id)
        
        if error:
            current_app.logger.warning(f"Failed to get students for parent {parent_id}: {error}")
            return jsonify({'success': False, 'message': error}), 400
        
        return jsonify({
            'success': True,
            'students': students_schema.dump(students)
        }), 200
    except Exception as e:
        current_app.logger.error(f"Unexpected error getting students for parent {parent_id}: {str(e)}")
        return jsonify({
            'success': False,
            'message': 'An unexpected error occurred while retrieving students'
        }), 500
