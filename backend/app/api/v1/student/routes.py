from flask import request, jsonify, g
from datetime import datetime, timedelta
from flask_jwt_extended import jwt_required, get_jwt_identity
from app.api.v1.student import student_bp
from app.extensions import db
from app.utils.rbac_decorators import require_role
from app.utils.tenant_context import tenant_required
from sqlalchemy import func

from app.models.student import Student
from app.models.class_ import Class
from app.models.subject import Subject
from app.models.assignment import Assignment
from app.models.assignment_submission import AssignmentSubmission
from app.models.attendance import Attendance
from app.models.grade import Grade
from app.models.timetable import TimetableSlot, Period

@student_bp.route('/dashboard-summary', methods=['GET'])
@jwt_required()
@require_role(['student'])
@tenant_required
def get_student_dashboard_summary():
    user_id = get_jwt_identity()
    student = Student.query.filter_by(user_id=int(user_id)).first()
    if not student:
        return jsonify({'success': False, 'message': 'Student profile not found'}), 404
        
    # Safety checks
    class_name = "N/A"
    class_id = student.class_id
    if class_id:
        cls = Class.query.get(class_id)
        if cls:
            class_name = cls.name

    # Attendance Rate calculation
    total_att = Attendance.query.filter(Attendance.student_id == student.id).count()
    present_att = Attendance.query.filter(
        Attendance.student_id == student.id,
        Attendance.status.in_(['present', 'late'])
    ).count()
    attendance_rate = round((present_att / total_att * 100) if total_att else 0.0, 2)

    # Pending Assignments Calculation
    pending_count = 0
    upcoming_deadlines = []
    if class_id:
        # All assignments for the class
        all_assignments = Assignment.query.filter(Assignment.class_id == class_id, Assignment.status == 'active').all()
        # Submissions by this student
        submissions = AssignmentSubmission.query.filter(AssignmentSubmission.student_id == student.id).all()
        submitted_assignment_ids = {sub.assignment_id for sub in submissions}
        
        # Pending count is active assignments not submitted yet
        pending_count = sum(1 for a in all_assignments if a.id not in submitted_assignment_ids)
        
        # Upcoming deadlines: future assignments sorted by due date ascending
        now = datetime.utcnow()
        upcoming = Assignment.query.filter(
            Assignment.class_id == class_id,
            Assignment.status == 'active',
            Assignment.due_date >= now
        ).order_by(Assignment.due_date.asc()).limit(5).all()
        
        for a in upcoming:
            upcoming_deadlines.append({
                'id': a.id,
                'title': a.title,
                'subject_name': a.subject.name if a.subject else 'Subject',
                'due_date': a.due_date.isoformat()
            })

    # Term Average Grade calculation
    avg_grade = Grade.query.with_entities(func.avg(Grade.percentage)).filter(Grade.student_id == student.id).scalar()
    term_average_grade = round(float(avg_grade or 0.0), 2) if avg_grade is not None else None

    # Today's Classes schedule
    todays_classes = []
    if class_id:
        day_name = datetime.utcnow().strftime('%A')
        day_abbr = day_name[:3] # e.g. "Mon"
        
        slots = TimetableSlot.query.filter(
            TimetableSlot.class_id == class_id,
            TimetableSlot.day_of_week.in_([day_name, day_abbr])
        ).all()
        
        # Sort slots by period start time
        slots_sorted = sorted(slots, key=lambda s: s.period.start_time if s.period else datetime.min.time())
        for s in slots_sorted:
            start_str = s.period.start_time.strftime('%H:%M') if s.period and s.period.start_time else "08:00"
            end_str = s.period.end_time.strftime('%H:%M') if s.period and s.period.end_time else "09:30"
            todays_classes.append({
                'id': s.id,
                'subject': s.subject.name if s.subject else 'Subject',
                'teacher': s.teacher.full_name if s.teacher else 'Teacher',
                'time': f"{start_str}–{end_str}",
                'room': s.class_.room or f"Room {s.room_id}" if s.room_id else (s.class_.room or 'N/A')
            })

    return jsonify({
        'success': True,
        'data': {
            'enrollment_scope': {
                'class_name': class_name,
                'student_id': student.id,
                'admission_number': student.admission_number
            },
            'attendance_percentage': attendance_rate,
            'pending_assignments_count': pending_count,
            'term_average_grade': term_average_grade,
            'todays_classes': todays_classes,
            'upcoming_deadlines': upcoming_deadlines
        }
    }), 200

@student_bp.route('/courses', methods=['GET'])
@jwt_required()
@require_role(['student'])
@tenant_required
def get_student_courses():
    user_id = get_jwt_identity()
    student = Student.query.filter_by(user_id=int(user_id)).first()
    if not student:
        return jsonify({'success': False, 'message': 'Student profile not found'}), 404
        
    class_id = student.class_id
    if not class_id:
        return jsonify({'success': True, 'courses': [], 'timetable': []}), 200
        
    cls = Class.query.get(class_id)
    if not cls:
        return jsonify({'success': True, 'courses': [], 'timetable': []}), 200

    # Subjects for this class
    subjects = cls.subjects.all()
    courses_data = []
    for sub in subjects:
        # Find teacher for this subject in the class timetable slots
        first_slot = TimetableSlot.query.filter_by(class_id=class_id, subject_id=sub.id).first()
        teacher_name = first_slot.teacher.full_name if first_slot and first_slot.teacher else (cls.class_teacher_name or 'TBA')
        courses_data.append({
            'id': sub.id,
            'subject': sub.name,
            'code': sub.code,
            'teacher': teacher_name,
            'room': cls.room or 'N/A',
            'nextSession': 'Weekly session'
        })

    # Timetable slots
    slots = TimetableSlot.query.filter_by(class_id=class_id).all()
    timetable_data = []
    for slot in slots:
        start_str = slot.period.start_time.strftime('%H:%M') if slot.period and slot.period.start_time else "08:00"
        end_str = slot.period.end_time.strftime('%H:%M') if slot.period and slot.period.end_time else "09:30"
        
        # Map full day name to 3 letter day abbreviation if needed in UI (Mon, Tue, Wed, Thu, Fri)
        day_map = {
            'Monday': 'Mon', 'Tuesday': 'Tue', 'Wednesday': 'Wed', 'Thursday': 'Thu', 'Friday': 'Fri',
            'Mon': 'Mon', 'Tue': 'Tue', 'Wed': 'Wed', 'Thu': 'Thu', 'Fri': 'Fri'
        }
        day_abbr = day_map.get(slot.day_of_week, slot.day_of_week[:3])
        
        timetable_data.append({
            'id': slot.id,
            'day': day_abbr,
            'start': start_str,
            'end': end_str,
            'subject': slot.subject.name if slot.subject else 'Subject',
            'teacher': slot.teacher.full_name if slot.teacher else 'Teacher',
            'room': cls.room or f"Room {slot.room_id}" if slot.room_id else (cls.room or 'N/A')
        })

    return jsonify({
        'success': True,
        'courses': courses_data,
        'timetable': timetable_data
    }), 200

@student_bp.route('/assignments', methods=['GET'])
@jwt_required()
@require_role(['student'])
@tenant_required
def get_student_assignments():
    user_id = get_jwt_identity()
    student = Student.query.filter_by(user_id=int(user_id)).first()
    if not student:
        return jsonify({'success': False, 'message': 'Student profile not found'}), 404
        
    class_id = student.class_id
    if not class_id:
        return jsonify({'success': True, 'assignments': []}), 200

    status_filter = request.args.get('status', 'all')
    
    from app.services.assignment_service import AssignmentService

    # Query all active assignments for class
    assignments = Assignment.query.filter_by(class_id=class_id, status='active').all()
    # Query all submissions by this student
    submissions = AssignmentSubmission.query.filter_by(student_id=student.id).all()
    submission_map = {sub.assignment_id: sub for sub in submissions}
    assignment_attachment_map = AssignmentService.get_attachment_map('assignment', [a.id for a in assignments])
    submission_attachment_map = AssignmentService.get_attachment_map('assignment_submission', [sub.id for sub in submissions])
    
    now = datetime.utcnow()
    assignments_data = []
    
    for a in assignments:
        sub = submission_map.get(a.id)
        status = 'pending'
        score = None
        feedback = None
        
        if sub:
            if sub.status == 'graded' or sub.score is not None:
                status = 'graded'
                score = sub.score
                feedback = sub.feedback
            else:
                status = 'submitted'
        else:
            if a.due_date < now:
                status = 'overdue'
            else:
                status = 'open'

        # Filter check
        if status_filter == 'open' and status not in ['open', 'overdue']:
            continue
        elif status_filter == 'submitted' and status != 'submitted':
            continue
        elif status_filter == 'graded' and status != 'graded':
            continue
        elif status_filter == 'pending' and status not in ['open', 'overdue']:
            # 'pending' status requested by frontend maps to assignments that are not submitted
            continue

        assignments_data.append({
            'id': a.id,
            'classId': f"cls-{a.class_id}",
            'title': a.title,
            'description': a.description or '',
            'subject_name': a.subject.name if a.subject else 'Subject',
            'due_date': a.due_date.isoformat(),
            'dueAt': a.due_date.isoformat(), # support both camelCase and snake_case
            'status': status,
            'score': score,
            'max_points': a.total_points,
            'feedback': feedback,
            'attachments': assignment_attachment_map.get(str(a.id), []),
            'submission_date': sub.submission_date.isoformat() if sub and sub.submission_date else None,
            'submission_attachments': submission_attachment_map.get(str(sub.id), []) if sub else [],
            'submitted_file_path': sub.file_path if sub else None
        })

    # Sort assignments by due date ascending
    assignments_data = sorted(assignments_data, key=lambda x: x['due_date'])

    return jsonify({
        'success': True,
        'assignments': assignments_data
    }), 200

@student_bp.route('/grades', methods=['GET'])
@jwt_required()
@require_role(['student'])
@tenant_required
def get_student_grades():
    from app.models.exam import Exam
    
    user_id = get_jwt_identity()
    student = Student.query.filter_by(user_id=int(user_id)).first()
    if not student:
        return jsonify({'success': False, 'message': 'Student profile not found'}), 404

    term_filter = request.args.get('term_id') or 'Term 1'
    
    # 1. Total students in class
    total_students = Student.query.filter_by(class_id=student.class_id).count() if student.class_id else 1
    
    # 2. Class rank & cumulative average
    class_students = Student.query.filter_by(class_id=student.class_id).all() if student.class_id else [student]
    
    student_averages = []
    for s in class_students:
        avg_percentage = db.session.query(func.avg(Grade.percentage))\
            .filter(Grade.student_id == s.id)\
            .scalar()
        student_averages.append((s.id, float(avg_percentage or 0.0)))
        
    student_averages.sort(key=lambda x: x[1], reverse=True)
    
    class_rank = 1
    for idx, (s_id, avg_val) in enumerate(student_averages):
        if s_id == student.id:
            class_rank = idx + 1
            break
            
    student_avg = next((avg_val for s_id, avg_val in student_averages if s_id == student.id), 0.0)

    # 3. Retrieve detailed grades
    grade_query = Grade.query.filter(Grade.student_id == student.id)
    if term_filter and term_filter != 'all':
        # Optional term filtering: check both direct column and exam description/title
        grade_query = grade_query.filter(Grade.term == term_filter)
        
    grades_list = grade_query.all()

    # Group grades by subject to split CA vs Exam
    grades_by_subject = {}
    for g in grades_list:
        sub_id = g.subject_id
        if not sub_id:
            continue
        if sub_id not in grades_by_subject:
            grades_by_subject[sub_id] = []
        grades_by_subject[sub_id].append(g)

    grades_data = []
    for sub_id, g_list in grades_by_subject.items():
        subject = Subject.query.get(sub_id)
        if not subject:
            continue
            
        ca_percentages = []
        exam_percentages = []
        
        for g in g_list:
            exam_title = ""
            if g.exam_id:
                exam = Exam.query.get(g.exam_id)
                if exam:
                    exam_title = exam.title.lower()
            
            if 'final' in exam_title or 'end' in exam_title:
                exam_percentages.append(g.percentage)
            else:
                ca_percentages.append(g.percentage)

        # Average calculations (40% continuous assessment, 60% exam score)
        avg_ca = sum(ca_percentages) / len(ca_percentages) if ca_percentages else (g_list[0].percentage if g_list else 0.0)
        avg_exam = sum(exam_percentages) / len(exam_percentages) if exam_percentages else (g_list[0].percentage if g_list else 0.0)
        
        ca_score = round(avg_ca * 0.4, 2)
        exam_score = round(avg_exam * 0.6, 2)
        total_score = round(ca_score + exam_score, 2)
        
        # Calculate grade letter
        if total_score >= 90:
            grade_letter = 'A+'
        elif total_score >= 80:
            grade_letter = 'A'
        elif total_score >= 70:
            grade_letter = 'B+'
        elif total_score >= 60:
            grade_letter = 'B'
        elif total_score >= 50:
            grade_letter = 'C'
        elif total_score >= 40:
            grade_letter = 'D'
        else:
            grade_letter = 'F'
            
        remarks = g_list[0].remarks if (g_list and g_list[0].remarks) else ""
        if not remarks:
            if grade_letter in ['A+', 'A']:
                remarks = "Excellent"
            elif grade_letter in ['B+', 'B']:
                remarks = "Pass"
            else:
                remarks = "Needs Improvement"

        grades_data.append({
            'id': g_list[0].id,
            'subject': {
                'id': subject.id,
                'name': subject.name,
                'code': subject.code
            },
            'ca_score': ca_score,
            'exam_score': exam_score,
            'total_score': total_score,
            'grade_letter': grade_letter,
            'remarks': remarks
        })

    return jsonify({
        'success': True,
        'data': {
            'cumulative_average': round(student_avg, 2),
            'class_rank': class_rank,
            'total_students': total_students,
            'grades': grades_data
        }
    }), 200

@student_bp.route('/attendance/summary', methods=['GET'])
@jwt_required()
@require_role(['student'])
@tenant_required
def get_student_attendance_summary():
    user_id = get_jwt_identity()
    student = Student.query.filter_by(user_id=int(user_id)).first()
    if not student:
        return jsonify({'success': False, 'message': 'Student profile not found'}), 404

    # Consolidated counts
    days_present = Attendance.query.filter_by(student_id=student.id, status='present').count()
    days_absent = Attendance.query.filter_by(student_id=student.id, status='absent').count()
    days_late = Attendance.query.filter_by(student_id=student.id, status='late').count()
    days_excused = Attendance.query.filter_by(student_id=student.id, status='excused').count()

    total_days = days_present + days_absent + days_late + days_excused
    overall_percentage = round(((days_present + days_late + days_excused) / total_days * 100) if total_days else 100.0, 2)

    # History logs sorted descending by date
    history_records = Attendance.query.filter_by(student_id=student.id).order_by(Attendance.date.desc()).all()
    
    history_data = []
    for att in history_records:
        history_data.append({
            'id': att.id,
            'date': att.date.strftime('%Y-%m-%d'),
            'status': att.status,
            'remarks': att.remarks or '-'
        })

    return jsonify({
        'success': True,
        'data': {
            'overall_percentage': overall_percentage,
            'days_present': days_present,
            'days_absent': days_absent,
            'days_late': days_late,
            'days_excused': days_excused,
            'history': history_data
        }
    }), 200

@student_bp.route('/timetable', methods=['GET'])
@jwt_required()
@require_role(['student'])
@tenant_required
def get_student_timetable():
    user_id = get_jwt_identity()
    student = Student.query.filter_by(user_id=int(user_id)).first()
    if not student:
        return jsonify({'success': False, 'message': 'Student profile not found'}), 404
        
    class_id = student.class_id
    if not class_id:
        return jsonify({'success': True, 'timetable': []}), 200
        
    cls = Class.query.get(class_id)
    if not cls:
        return jsonify({'success': True, 'timetable': []}), 200

    slots = TimetableSlot.query.filter_by(class_id=class_id).all()
    timetable_data = []
    
    day_map = {
        'Monday': 'Mon', 'Tuesday': 'Tue', 'Wednesday': 'Wed', 'Thursday': 'Thu', 'Friday': 'Fri', 'Saturday': 'Sat', 'Sunday': 'Sun',
        'Mon': 'Mon', 'Tue': 'Tue', 'Wed': 'Wed', 'Thu': 'Thu', 'Fri': 'Fri', 'Sat': 'Sat', 'Sun': 'Sun'
    }
    
    for slot in slots:
        start_str = slot.period.start_time.strftime('%H:%M') if slot.period and slot.period.start_time else "08:00"
        end_str = slot.period.end_time.strftime('%H:%M') if slot.period and slot.period.end_time else "09:30"
        day_abbr = day_map.get(slot.day_of_week, slot.day_of_week[:3])
        
        timetable_data.append({
            'id': slot.id,
            'day': day_abbr,
            'start': start_str,
            'end': end_str,
            'subject': slot.subject.name if slot.subject else 'Subject',
            'teacher': slot.teacher.full_name if slot.teacher else 'Teacher',
            'room': cls.room or f"Room {slot.room_id}" if slot.room_id else (cls.room or 'N/A')
        })

    return jsonify({
        'success': True,
        'timetable': timetable_data
    }), 200

@student_bp.route('/calendar/events', methods=['GET'])
@jwt_required()
@require_role(['student'])
@tenant_required
def get_student_calendar_events():
    user_id = get_jwt_identity()
    student = Student.query.filter_by(user_id=int(user_id)).first()
    if not student:
        return jsonify({'success': False, 'message': 'Student profile not found'}), 404

    from app.models.dashboard import CalendarEvent
    month = request.args.get('month', type=int)  # Expected 0-indexed from frontend
    year = request.args.get('year', type=int)

    now = datetime.utcnow()
    if month is None:
        month = now.month - 1
    if not year:
        year = now.year

    api_month = month + 1 if month < 12 else month

    # Fetch events for the month
    from sqlalchemy import extract
    events = CalendarEvent.query.filter(
        extract('year', CalendarEvent.date) == year,
        extract('month', CalendarEvent.date) == api_month
    ).all()

    serialized = []
    for e in events:
        serialized.append({
            'id': e.id,
            'title': e.title,
            'date': e.date.strftime('%Y-%m-%d'),
            'type': e.type,
            'description': e.description or '',
            'location': e.location or '',
            'start_time': e.start_time or '',
            'end_time': e.end_time or ''
        })
    return jsonify({'success': True, 'events': serialized}), 200

@student_bp.route('/notifications', methods=['GET'])
@jwt_required()
@require_role(['student'])
@tenant_required
def get_student_notifications():
    user_id = get_jwt_identity()
    student = Student.query.filter_by(user_id=int(user_id)).first()
    if not student:
        return jsonify({'success': False, 'message': 'Student profile not found'}), 404

    from app.services.notification_service import NotificationService
    
    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 50, type=int)
    
    notifications, _ = NotificationService.get_user_notifications(
        user_id=int(user_id),
        page=page,
        per_page=per_page
    )

    serialized = []
    for n in notifications:
        serialized.append({
            'id': str(n.id),
            'title': n.title,
            'body': n.message,
            'message': n.message,
            'createdAt': n.created_at.isoformat() if hasattr(n, 'created_at') and n.created_at else (n.time.isoformat() if hasattr(n, 'time') and n.time else ''),
            'read': getattr(n, 'is_read', False),
            'kind': n.type or 'info'
        })
    return jsonify({'success': True, 'notifications': serialized}), 200

@student_bp.route('/notifications/<string:notification_id>/read', methods=['PUT'])
@jwt_required()
@require_role(['student'])
@tenant_required
def mark_student_notification_read(notification_id):
    user_id = get_jwt_identity()
    from app.models.dashboard import Notification
    n = Notification.query.filter_by(id=notification_id).first()
    if not n:
        return jsonify({'success': False, 'message': 'Notification not found'}), 404
        
    if n.recipient_id and n.recipient_id != int(user_id):
        return jsonify({'success': False, 'message': 'Unauthorized'}), 403
        
    n.read = True
    db.session.commit()
    return jsonify({'success': True, 'message': 'Notification marked as read'}), 200

@student_bp.route('/notifications/read-all', methods=['PUT'])
@jwt_required()
@require_role(['student'])
@tenant_required
def mark_all_student_notifications_read():
    user_id = get_jwt_identity()
    from app.models.dashboard import Notification
    from sqlalchemy import or_
    unread = Notification.query.filter(
        or_(Notification.recipient_id == int(user_id), Notification.scope.in_(['students', 'all'])),
        Notification.read == False
    ).all()
    for n in unread:
        n.read = True
    db.session.commit()
    return jsonify({'success': True, 'message': 'All notifications marked as read'}), 200

@student_bp.route('/notifications/clear', methods=['DELETE'])
@jwt_required()
@require_role(['student'])
@tenant_required
def clear_student_notifications_history():
    user_id = get_jwt_identity()
    from app.models.dashboard import Notification
    personal = Notification.query.filter_by(recipient_id=int(user_id)).all()
    for n in personal:
        db.session.delete(n)
    db.session.commit()
    return jsonify({'success': True, 'message': 'Notifications history cleared'}), 200

@student_bp.route('/messages/conversations', methods=['GET'])
@jwt_required()
@require_role(['student'])
@tenant_required
def get_student_conversations():
    user_id = get_jwt_identity()
    student = Student.query.filter_by(user_id=int(user_id)).first()
    if not student:
        return jsonify({'success': False, 'message': 'Student profile not found'}), 404

    from app.models.message import Message
    from app.models.user import User
    from app.services.message_service import MessageService
    from sqlalchemy import or_, and_
    
    # Include student user ID and their parent user ID (if any)
    user_ids = [int(user_id)]
    if student.parent_id:
        from app.models.parent import Parent
        parent = Parent.query.get(student.parent_id)
        if parent and parent.user_id:
            user_ids.append(parent.user_id)
    
    # Query all valid messages involving either student or parent
    query = Message.query.filter(Message.sender_id.in_(db.session.query(User.id)))
    query = query.filter(Message.recipient_id.in_(db.session.query(User.id)))
    query = query.filter(
        or_(
            and_(Message.recipient_id.in_(user_ids), Message.is_deleted_by_recipient == False),
            and_(Message.sender_id.in_(user_ids), Message.is_deleted_by_sender == False)
        )
    ).order_by(Message.created_at.desc())
    
    messages = query.all()
    
    thread_map = {}
    for msg in messages:
        if msg.sender_id in user_ids:
            other_id = msg.recipient_id
            other_role = msg.recipient_type
        else:
            other_id = msg.sender_id
            other_role = msg.sender_type
            
        if not other_id:
            continue
            
        if other_id not in thread_map:
            other_user = User.query.get(other_id)
            if not other_user:
                continue
            display_name = MessageService.get_user_display_name(other_user)
            thread_map[other_id] = {
                'id': f"thread_{other_id}",
                'teacher_user_id': other_id,
                'title': display_name,
                'participants': f"{other_role.capitalize()}",
                'unread': False,
                'lastMessagePreview': '',
                'messages': []
            }
            
        sender_name = 'You' if msg.sender_id in user_ids else thread_map[other_id]['title']
        
        thread_map[other_id]['messages'].append({
            'id': str(msg.id),
            'sender': sender_name,
            'body': msg.content,
            'sentAt': msg.created_at.isoformat() if msg.created_at else ''
        })
        
        if msg.recipient_id in user_ids and not msg.is_read:
            thread_map[other_id]['unread'] = True

    threads = list(thread_map.values())
    for t in threads:
        t['messages'].sort(key=lambda x: x['sentAt'])
        if t['messages']:
            t['lastMessagePreview'] = t['messages'][-1]['body']
            if len(t['lastMessagePreview']) > 50:
                t['lastMessagePreview'] = t['lastMessagePreview'][:50] + '...'
                
    return jsonify({
        'success': True,
        'threads': threads
    }), 200

@student_bp.route('/messages/send', methods=['POST'])
@jwt_required()
@require_role(['student'])
@tenant_required
def send_student_message():
    user_id = get_jwt_identity()
    data = request.json or {}
    recipient_id = data.get('recipient_id')
    recipient_type = data.get('recipient_type') or 'teacher'
    content = data.get('content')
    
    if not recipient_id or not content:
        return jsonify({'success': False, 'message': 'Missing recipient or content'}), 400
        
    from app.services.message_service import MessageService
    from app.models.user import User
    
    recipient_user_id = int(recipient_id)
    recipient_role = recipient_type
    
    # Resolve parent profiles to user_id
    if recipient_type == 'parent':
        from app.models.parent import Parent
        parent = Parent.query.get(recipient_user_id)
        if parent and parent.user_id:
            recipient_user_id = parent.user_id
            recipient_role = 'parent'
            
    recipient_user = User.query.get(recipient_user_id)
    if not recipient_user:
        return jsonify({'success': False, 'message': 'Recipient not found'}), 404
        
    recipient_role = MessageService._get_user_type(recipient_user)
    
    try:
        msg = MessageService.create_message({
            'sender_id': int(user_id),
            'recipient_id': recipient_user_id,
            'recipient_type': recipient_role,
            'subject': 'Direct Message',
            'content': content
        })
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500
    
    return jsonify({'success': True, 'message': 'Sent successfully'}), 200

@student_bp.route('/assignments/<int:assignment_id>/submit', methods=['POST'])
@jwt_required()
@require_role(['student'])
@tenant_required
def submit_student_assignment(assignment_id):
    user_id = get_jwt_identity()
    student = Student.query.filter_by(user_id=int(user_id)).first()
    if not student:
        return jsonify({'success': False, 'message': 'Student profile not found'}), 404
        
    assignment = Assignment.query.get(assignment_id)
    if not assignment:
        return jsonify({'success': False, 'message': 'Assignment not found'}), 404
        
    if assignment.class_id != student.class_id:
        return jsonify({'success': False, 'message': 'Insufficient permissions for this class context'}), 403
        
    data = request.form.to_dict() if request.form else (request.get_json(silent=True) or {})
    content = data.get('content')
    file_path = data.get('file_path')
    uploaded_files = []
    if request.files:
        if request.files.get('file'):
            uploaded_files.append(request.files['file'])
        uploaded_files.extend(request.files.getlist('attachments'))
    
    from app.services.assignment_service import AssignmentService
    submission, error = AssignmentService.submit_assignment({
        'assignment_id': assignment_id,
        'student_id': student.id,
        'content': content,
        'file_path': file_path,
        'status': 'submitted'
    }, attachments=uploaded_files, uploader_id=int(user_id), tenant_id=getattr(student, 'tenant_id', None))
    
    if error:
        return jsonify({'success': False, 'message': error}), 400
        
    return jsonify({
        'success': True,
        'message': 'Assignment submitted successfully',
        'submission': {
            'id': submission.id,
            'assignment_id': submission.assignment_id,
            'student_id': submission.student_id,
            'status': submission.status,
            'submission_date': submission.submission_date.isoformat() if submission.submission_date else None,
            'file_path': submission.file_path,
            'attachments': getattr(submission, 'attachments_payload', [])
        }
    }), 201
