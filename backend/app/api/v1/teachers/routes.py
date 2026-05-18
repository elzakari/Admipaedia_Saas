from flask import request, jsonify, current_app, g
from flask_jwt_extended import jwt_required, get_jwt_identity
from app.api.v1.teachers import teachers_bp
from app.services.teacher_service import TeacherService
from app.schemas.teacher import TeacherSchema, TeacherListSchema
from app.utils.auth_utils import admin_required, teacher_required
from app.utils.rbac_decorators import require_permission, require_role
from app.utils.tenant_context import tenant_required
from marshmallow import ValidationError

# Initialize schemas
teacher_schema = TeacherSchema()
teachers_schema = TeacherListSchema(many=True)

from app.schemas.class_ import ClassListSchema
classes_schema = ClassListSchema(many=True)

@teachers_bp.route('', methods=['GET'])  # This will match /teachers
@teachers_bp.route('/', methods=['GET'])  # This will match /teachers/
@jwt_required()
@require_permission('teacher.read')
@tenant_required
def get_teachers():
    """Get all teachers with pagination and filtering."""
    try:
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 20, type=int)
        status = request.args.get('status')
        specialization = request.args.get('specialization')
        search = request.args.get('search')
        
        paginated_teachers = TeacherService.get_all_teachers(
            page=page,
            per_page=per_page,
            status=status,
            specialization=specialization,
            search=search,
            tenant_id=getattr(g, 'tenant_id', None)
        )
        
        return jsonify({
            'success': True,
            'teachers': teachers_schema.dump(paginated_teachers.items),
            'pagination': {
                'total': paginated_teachers.total,
                'pages': paginated_teachers.pages,
                'total_pages': paginated_teachers.pages,
                'current_page': paginated_teachers.page,
                'per_page': paginated_teachers.per_page,
                'has_next': paginated_teachers.has_next,
                'has_prev': paginated_teachers.has_prev
            }
        }), 200
    except Exception as e:
        try:
            current_app.logger.exception('Error in get_teachers route')
        except Exception:
            pass
        return jsonify({
            'success': False,
            'message': 'Failed to fetch teachers',
            'error': str(e)
        }), 500

@teachers_bp.route('/<int:teacher_id>', methods=['GET'])
@jwt_required()
@require_permission('teacher.read')
@tenant_required
def get_teacher(teacher_id):
    """Get a specific teacher by ID."""
    teacher = TeacherService.get_teacher_by_id(teacher_id)
    if teacher and getattr(teacher, 'tenant_id', None) != getattr(g, 'tenant_id', None):
        teacher = None
    
    if not teacher:
        return jsonify({'success': False, 'message': 'Teacher not found'}), 404
    
    return jsonify({
        'success': True,
        'teacher': teacher_schema.dump(teacher)
    }), 200

@teachers_bp.route('', methods=['POST'])
@teachers_bp.route('/', methods=['POST'])
@admin_required
@tenant_required
def create_teacher():
    """Create a new teacher."""
    try:
        payload = dict(request.json or {})
        # Map legacy fields
        if 'is_active' in payload and 'status' not in payload:
            payload['status'] = 'active' if bool(payload.pop('is_active')) else 'inactive'
        if 'phone' in payload and 'phone_number' not in payload:
            payload['phone_number'] = payload.pop('phone')
        if 'name' in payload:
            name = (payload.pop('name') or '').strip()
            parts = name.split()
            if parts:
                payload['first_name'] = parts[0]
                payload['last_name'] = ' '.join(parts[1:]) if len(parts) > 1 else parts[0]
        if 'hire_date' in payload and 'joining_date' not in payload:
            payload['joining_date'] = payload.pop('hire_date')
        # Ensure user exists or create
        from app.models.user import User
        email = payload.get('email')
        if email:
            existing_user = User.query.filter_by(email=email).first()
            if existing_user:
                payload['user_id'] = existing_user.id
            else:
                username = email.split('@')[0]
                u = User(username=username, email=email, role='teacher')
                u.set_password('Password123!')
                from app.extensions import db
                db.session.add(u)
                db.session.flush()
                payload['user_id'] = u.id
        # Remove unknown fields before validation
        allowed = {
            'user_id','employee_id','first_name','last_name','date_of_birth','gender',
            'address','phone_number','qualification','specialization','joining_date','status'
        }
        payload = {k: v for k, v in payload.items() if k in allowed}
        # Validate
        data = teacher_schema.load(payload)
        
        try:
            teacher, error = TeacherService.create_teacher(data, tenant_id=getattr(g, 'tenant_id', None))
            if not teacher and error:
                # Idempotent behavior: if teacher already exists for this user, return it
                existing = TeacherService.get_teacher_by_user_id(data['user_id'])
                if existing:
                    tdata = teacher_schema.dump(existing)
                    tdata['name'] = f"{existing.first_name} {existing.last_name}"
                    return jsonify({
                        'success': True,
                        'message': 'Teacher created successfully',
                        'teacher': tdata
                    }), 201
        except Exception as e:
            from sqlalchemy.exc import IntegrityError
            if isinstance(e, IntegrityError):
                from app.extensions import db
                db.session.rollback()
                return jsonify({'success': False, 'message': 'Duplicate teacher data', 'error': str(e)}), 409
            raise
        
        if error:
            return jsonify({'success': False, 'message': error}), 400
        
        tdata = teacher_schema.dump(teacher)
        tdata['name'] = f"{teacher.first_name} {teacher.last_name}"
        return jsonify({
            'success': True,
            'message': 'Teacher created successfully',
            'teacher': tdata
        }), 201
    except ValidationError as err:
        # Fallback: attempt minimal creation if essential fields are present
        minimal = {
            'user_id': payload.get('user_id'),
            'first_name': payload.get('first_name'),
            'last_name': payload.get('last_name'),
            'joining_date': payload.get('joining_date')
        }
        if all([minimal['user_id'], minimal['first_name'], minimal['last_name']]):
            teacher, error = TeacherService.create_teacher(minimal, tenant_id=getattr(g, 'tenant_id', None))
            if teacher:
                tdata = teacher_schema.dump(teacher)
                tdata['name'] = f"{teacher.first_name} {teacher.last_name}"
                return jsonify({
                    'success': True,
                    'message': 'Teacher created successfully',
                    'teacher': tdata
                }), 201
        return jsonify({'success': False, 'errors': err.messages}), 400
    except Exception as e:
        # Handle unique constraint collisions
        return jsonify({'success': False, 'message': str(e)}), 400

@teachers_bp.route('/<int:teacher_id>', methods=['PUT'])
@admin_required
@tenant_required
def update_teacher(teacher_id):
    """Update an existing teacher."""
    try:
        data = teacher_schema.load(request.json, partial=True)
        
        teacher, error = TeacherService.update_teacher(teacher_id, data, tenant_id=getattr(g, 'tenant_id', None))
        
        if error:
            return jsonify({'success': False, 'message': error}), 400
        
        return jsonify({
            'success': True,
            'message': 'Teacher updated successfully',
            'teacher': teacher_schema.dump(teacher)
        }), 200
    except ValidationError as err:
        return jsonify({'success': False, 'errors': err.messages}), 400

@teachers_bp.route('/<int:teacher_id>', methods=['DELETE'])
@admin_required
@tenant_required
def delete_teacher(teacher_id):
    """Delete a teacher."""
    teacher = TeacherService.get_teacher_by_id(teacher_id)
    if not teacher or getattr(teacher, 'tenant_id', None) != getattr(g, 'tenant_id', None):
        return jsonify({'success': False, 'message': 'Teacher not found'}), 404
    success, error = TeacherService.delete_teacher(teacher_id)
    
    if error:
        return jsonify({'success': False, 'message': error}), 400
    
    return jsonify({
        'success': True,
        'message': 'Teacher deleted successfully'
    }), 200

@teachers_bp.route('/<int:teacher_id>/status', methods=['PATCH'])
@admin_required
@tenant_required
def update_teacher_status(teacher_id):
    """Update a teacher's status."""
    try:
        status = request.json.get('status')
        
        if not status or status not in ['active', 'inactive', 'on_leave']:
            return jsonify({'success': False, 'message': 'Invalid status'}), 400
        
        teacher, error = TeacherService.update_teacher_status(teacher_id, status)
        if teacher and getattr(teacher, 'tenant_id', None) != getattr(g, 'tenant_id', None):
            return jsonify({'success': False, 'message': 'Teacher not found'}), 404
        
        if error:
            return jsonify({'success': False, 'message': error}), 400
        
        return jsonify({
            'success': True,
            'message': 'Teacher status updated successfully',
            'teacher': teacher_schema.dump(teacher)
        }), 200
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500

@teachers_bp.route('/profile', methods=['GET'])
@jwt_required()
@teacher_required
@tenant_required
def get_own_profile():
    """Get the profile of the currently logged in teacher."""
    user_id = get_jwt_identity()
    
    teacher = TeacherService.get_teacher_by_user_id(user_id)
    
    if not teacher:
        return jsonify({'success': False, 'message': 'Teacher profile not found'}), 404
    if getattr(teacher, 'tenant_id', None) != getattr(g, 'tenant_id', None):
        return jsonify({'success': False, 'message': 'Teacher profile not found'}), 404
    
    return jsonify({
        'success': True,
        'teacher': teacher_schema.dump(teacher)
    }), 200


@teachers_bp.route('/<int:teacher_id>/classes', methods=['GET'])
@jwt_required()
@require_permission('teacher.read')
@tenant_required
def get_teacher_classes(teacher_id):
    """Get classes taught by a specific teacher."""
    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 20, type=int)
    status = request.args.get('status')
    
    # Reuse the existing service method
    from app.services.class_service import ClassService
    teacher = TeacherService.get_teacher_by_id(teacher_id)
    if not teacher or getattr(teacher, 'tenant_id', None) != getattr(g, 'tenant_id', None):
        return jsonify({'success': False, 'message': 'Teacher not found'}), 404

    if status:
        from app.models.class_ import Class as ClassModel
        query = ClassModel.query.filter_by(teacher_id=teacher_id)
        if getattr(g, 'tenant_id', None) is not None:
            query = query.filter(ClassModel.tenant_id == getattr(g, 'tenant_id', None))
        
        if status == 'active':
            query = query.filter(ClassModel.status == 'active')
        elif status == 'past':
            query = query.filter(ClassModel.status != 'active')
            
        paginated_classes = query.paginate(page=page, per_page=per_page, error_out=False)
    else:
        paginated_classes = ClassService.get_classes_by_teacher_id(teacher_id, page, per_page, tenant_id=getattr(g, 'tenant_id', None))
    
    return jsonify({
        'success': True,
        'classes': classes_schema.dump(paginated_classes.items),
        'pagination': {
            'total': paginated_classes.total,
            'pages': paginated_classes.pages,
            'page': paginated_classes.page,
            'per_page': paginated_classes.per_page,
            'next': paginated_classes.next_num,
            'prev': paginated_classes.prev_num
        }
    }), 200


@teachers_bp.route('/<int:teacher_id>/classes', methods=['POST'])
@jwt_required()
@admin_required
def assign_teacher_class(teacher_id):
    data = request.get_json() or {}
    class_id = data.get('class_id')
    if not class_id:
        return jsonify({'success': False, 'message': 'class_id is required'}), 400

    from app.services.class_service import ClassService
    class_obj, error = ClassService.assign_teacher(class_id=int(class_id), teacher_id=teacher_id)
    if error:
        return jsonify({'success': False, 'message': error}), 400

    return jsonify({'success': True, 'message': 'Teacher assigned to class', 'class_id': class_obj.id}), 200


@teachers_bp.route('/<int:teacher_id>/classes/<int:class_id>', methods=['DELETE'])
@jwt_required()
@admin_required
def unassign_teacher_class(teacher_id, class_id):
    from app.models.class_ import Class
    from app.extensions import db

    class_obj = Class.query.get(class_id)
    if not class_obj:
        return jsonify({'success': False, 'message': 'Class not found'}), 404
    if class_obj.teacher_id != teacher_id:
        return jsonify({'success': False, 'message': 'Class is not assigned to this teacher'}), 400

    class_obj.teacher_id = None
    db.session.commit()
    return jsonify({'success': True, 'message': 'Teacher unassigned from class'}), 200


@teachers_bp.route('/<int:teacher_id>/subjects', methods=['GET'])
@jwt_required()
@require_permission('teacher.read')
def get_teacher_subjects(teacher_id):
    subjects = TeacherService.get_teacher_subjects(teacher_id)
    if subjects is None:
        return jsonify({'success': False, 'message': 'Teacher not found'}), 404
    return jsonify({
        'success': True,
        'subjects': [
            {
                'id': s.id,
                'name': s.name,
                'code': getattr(s, 'code', None)
            }
            for s in subjects
        ]
    }), 200


@teachers_bp.route('/<int:teacher_id>/subjects', methods=['POST'])
@jwt_required()
@admin_required
def assign_teacher_subject(teacher_id):
    data = request.get_json() or {}
    subject_id = data.get('subject_id')
    if not subject_id:
        return jsonify({'success': False, 'message': 'subject_id is required'}), 400

    from app.models.subject import Subject
    from app.extensions import db

    teacher = TeacherService.get_teacher_by_id(teacher_id)
    if not teacher:
        return jsonify({'success': False, 'message': 'Teacher not found'}), 404

    subject = Subject.query.get(int(subject_id))
    if not subject:
        return jsonify({'success': False, 'message': 'Subject not found'}), 404

    if subject not in teacher.subjects:
        teacher.subjects.append(subject)
        db.session.commit()

    return jsonify({'success': True, 'message': 'Subject assigned'}), 200


@teachers_bp.route('/<int:teacher_id>/subjects/<int:subject_id>', methods=['DELETE'])
@jwt_required()
@admin_required
def remove_teacher_subject(teacher_id, subject_id):
    from app.models.subject import Subject
    from app.extensions import db

    teacher = TeacherService.get_teacher_by_id(teacher_id)
    if not teacher:
        return jsonify({'success': False, 'message': 'Teacher not found'}), 404
    subject = Subject.query.get(subject_id)
    if not subject:
        return jsonify({'success': False, 'message': 'Subject not found'}), 404
    if subject in teacher.subjects:
        teacher.subjects.remove(subject)
        db.session.commit()
    return jsonify({'success': True, 'message': 'Subject removed'}), 200

# Add these imports at the top
from app.schemas.teacher_attendance import TeacherAttendanceSchema, TeacherAttendanceCreateSchema
from datetime import datetime

# Initialize schemas
teacher_attendance_schema = TeacherAttendanceSchema()
teacher_attendances_schema = TeacherAttendanceSchema(many=True)
teacher_attendance_create_schema = TeacherAttendanceCreateSchema()

# Add these routes
@teachers_bp.route('/<int:teacher_id>/attendance', methods=['GET'])
@jwt_required()
@require_permission('attendance.read')
def get_teacher_attendance(teacher_id):
    """Get attendance records for a specific teacher."""
    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 20, type=int)
    
    # Parse date parameters
    start_date = request.args.get('start_date', type=str)
    end_date = request.args.get('end_date', type=str)
    
    if start_date:
        try:
            start_date = datetime.strptime(start_date, '%Y-%m-%d').date()
        except ValueError:
            return jsonify({'success': False, 'message': 'Invalid start_date format. Use YYYY-MM-DD'}), 400
    
    if end_date:
        try:
            end_date = datetime.strptime(end_date, '%Y-%m-%d').date()
        except ValueError:
            return jsonify({'success': False, 'message': 'Invalid end_date format. Use YYYY-MM-DD'}), 400
    
    paginated_attendance, error = TeacherService.get_teacher_attendance(
        teacher_id, page, per_page, start_date, end_date
    )
    
    if error:
        return jsonify({'success': False, 'message': error}), 400
    
    return jsonify({
        'success': True,
        'attendance': teacher_attendances_schema.dump(paginated_attendance.items),
        'pagination': {
            'total': paginated_attendance.total,
            'pages': paginated_attendance.pages,
            'page': paginated_attendance.page,
            'per_page': paginated_attendance.per_page,
            'next': paginated_attendance.next_num,
            'prev': paginated_attendance.prev_num
        }
    }), 200

@teachers_bp.route('/<int:teacher_id>/attendance', methods=['POST'])
@jwt_required()
@admin_required
def mark_teacher_attendance(teacher_id):
    """Mark attendance for a teacher."""
    try:
        data = teacher_attendance_create_schema.load(request.json)
        
        attendance, error = TeacherService.mark_teacher_attendance(teacher_id, data)
        
        if error:
            return jsonify({'success': False, 'message': error}), 400
        
        return jsonify({
            'success': True,
            'message': 'Teacher attendance recorded successfully',
            'attendance': teacher_attendance_schema.dump(attendance)
        }), 201
    except ValidationError as err:
        return jsonify({'success': False, 'errors': err.messages}), 400

@teachers_bp.route('/<int:teacher_id>/stats', methods=['GET'])
@jwt_required()
@require_permission('teacher.read')
def get_teacher_stats(teacher_id):
    """Get statistics for a teacher."""
    stats, error = TeacherService.get_teacher_stats(teacher_id)
    
    if error:
        return jsonify({'success': False, 'message': error}), 400
        
    return jsonify({
        'success': True,
        'stats': stats
    }), 200

@teachers_bp.route('/<int:teacher_id>/analytics', methods=['GET'])
@jwt_required()
@require_permission('teacher.read')
def get_teacher_analytics(teacher_id):
    """Get detailed analytics for a teacher dashboard."""
    analytics, error = TeacherService.get_teacher_analytics(teacher_id)
    
    if error:
        return jsonify({'success': False, 'message': error}), 400
        
    return jsonify({
        'success': True,
        'analytics': analytics
    }), 200

@teachers_bp.route('/<int:teacher_id>/ai-insights', methods=['GET'])
@jwt_required()
@require_permission('teacher.read')
def get_teacher_ai_insights(teacher_id):
    """Get AI-powered insights for a teacher."""
    insights, error = TeacherService.get_teacher_ai_insights(teacher_id)
    
    if error:
        return jsonify({'success': False, 'message': error}), 400
        
    return jsonify(insights)


@teachers_bp.route('/<int:teacher_id>/schedule-assets', methods=['GET'])
@jwt_required()
@require_permission('teacher.read')
@tenant_required
def get_teacher_schedule_assets(teacher_id):
    """Aggregate recurring timetable slots and date-bound events for a teacher."""
    try:
        from app.models.timetable import TimetableSlot
        from app.models.subject import Subject
        from app.models.class_ import Class
        from app.extensions import db
        from sqlalchemy.orm import joinedload
        
        teacher = TeacherService.get_teacher_by_id(teacher_id)
        if not teacher or getattr(teacher, 'tenant_id', None) != getattr(g, 'tenant_id', None):
            return jsonify({'success': False, 'message': 'Teacher not found'}), 404
            
        # 1. Fetch recurring timetable slots
        slots = TimetableSlot.query.options(
            joinedload(TimetableSlot.class_),
            joinedload(TimetableSlot.subject),
            joinedload(TimetableSlot.period)
        ).filter(TimetableSlot.teacher_id == teacher_id).all()
        
        mapped_slots = []
        for s in slots:
            mapped_slots.append({
                'id': s.id,
                'class_id': s.class_id,
                'class_name': s.class_.name if s.class_ else '',
                'subject_id': s.subject_id,
                'subject_name': s.subject.name if s.subject else '',
                'period_name': s.period.name if s.period else '',
                'start_time': s.period.start_time.strftime('%H:%M') if s.period and s.period.start_time else '',
                'end_time': s.period.end_time.strftime('%H:%M') if s.period and s.period.end_time else '',
                'day_of_week': s.day_of_week,
                'term': s.term,
                'academic_year': s.academic_year
            })
            
        # 2. Fetch date-bound calendar events
        user_id = get_jwt_identity()
        from app.services.calendar_service import CalendarService
        events = CalendarService.get_events_for_user(
            user_id=user_id
        )
        
        return jsonify({
            'success': True,
            'timetable_slots': mapped_slots,
            'calendar_events': events
        }), 200
    except Exception as e:
        current_app.logger.error(f"Error compiling schedule assets: {str(e)}")
        return jsonify({
            'success': False,
            'message': 'Failed to compile schedule assets',
            'error': str(e)
        }), 500
