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
    
    # Query all active assignments for class
    assignments = Assignment.query.filter_by(class_id=class_id, status='active').all()
    # Query all submissions by this student
    submissions = AssignmentSubmission.query.filter_by(student_id=student.id).all()
    submission_map = {sub.assignment_id: sub for sub in submissions}
    
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
            'feedback': feedback
        })

    # Sort assignments by due date ascending
    assignments_data = sorted(assignments_data, key=lambda x: x['due_date'])

    return jsonify({
        'success': True,
        'assignments': assignments_data
    }), 200
