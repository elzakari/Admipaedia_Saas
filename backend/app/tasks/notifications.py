import structlog
from datetime import datetime, timedelta
from app.extensions import db
from app.models.dashboard import Notification
from app.services.notification_service import NotificationService
from app.models.student import Student
from app.models.attendance import Attendance
from app.models.grade import Grade
from app.models.user import User
from app.models.dashboard import CalendarEvent
from app.celery_app import celery_app

logger = structlog.get_logger()

@celery_app.task
def generate_attendance_notifications():
    """Generate notifications for absent students."""
    try:
        # Get yesterday's date
        yesterday = datetime.utcnow().date() - timedelta(days=1)
        
        # Find students who were absent yesterday
        absent_records = Attendance.query.filter(
            Attendance.date == yesterday,
            Attendance.status == 'absent'
        ).all()
        
        # Group by parent to avoid sending multiple notifications
        parent_notifications = {}
        
        for record in absent_records:
            student = Student.query.get(record.student_id)
            if student and student.parent_id:
                parent = User.query.get(student.parent_id)
                if parent:
                    if parent.id not in parent_notifications:
                        parent_notifications[parent.id] = []
                    parent_notifications[parent.id].append(student.name)
        
        # Create notifications for parents
        for parent_id, student_names in parent_notifications.items():
            students_str = ", ".join(student_names)
            title = "Attendance Alert"
            message = f"Your child(ren) {students_str} {'was' if len(student_names) == 1 else 'were'} marked absent yesterday."
            
            NotificationService.create_notification(
                title=title,
                message=message,
                notification_type="warning",
                user_id=parent_id,
                send_email=True,
                send_websocket=True
            )
        
        logger.info("Generated attendance notifications", count=len(parent_notifications))
        return True
    except Exception as e:
        logger.error("Failed to generate attendance notifications", error=str(e))
        return False

@celery_app.task
def generate_grade_notifications():
    """Generate notifications for new grades."""
    try:
        # Get grades added in the last 24 hours
        yesterday = datetime.utcnow() - timedelta(days=1)
        new_grades = Grade.query.filter(Grade.created_at >= yesterday).all()
        
        # Group by student to avoid sending multiple notifications
        student_notifications = {}
        
        for grade in new_grades:
            student = Student.query.get(grade.student_id)
            if student:
                if student.id not in student_notifications:
                    student_notifications[student.id] = []
                student_notifications[student.id].append(grade)
        
        # Create notifications for students and parents
        for student_id, grades in student_notifications.items():
            student = Student.query.get(student_id)
            if student:
                # Notification for student
                if student.user_id:
                    title = "New Grades Posted"
                    message = f"You have {len(grades)} new grade(s) posted."
                    
                    NotificationService.create_notification(
                        title=title,
                        message=message,
                        notification_type="info",
                        user_id=student.user_id,
                        send_email=False,
                        send_websocket=True
                    )
                
                # Notification for parent
                if student.parent_id:
                    title = "New Grades Posted"
                    message = f"Your child {student.name} has {len(grades)} new grade(s) posted."
                    
                    NotificationService.create_notification(
                        title=title,
                        message=message,
                        notification_type="info",
                        user_id=student.parent_id,
                        send_email=True,
                        send_websocket=True
                    )
        
        logger.info("Generated grade notifications", count=len(student_notifications))
        return True
    except Exception as e:
        logger.error("Failed to generate grade notifications", error=str(e))
        return False

@celery_app.task
def generate_calendar_event_reminders():
    """Generate reminders for upcoming calendar events."""
    try:
        # Get events happening in the next 24 hours
        tomorrow = datetime.utcnow() + timedelta(days=1)
        today = datetime.utcnow()
        
        upcoming_events = CalendarEvent.query.filter(
            CalendarEvent.date >= today.date(),
            CalendarEvent.date <= tomorrow.date()
        ).all()
        
        # Create notifications for each event
        notification_count = 0
        
        for event in upcoming_events:
            # Determine who should receive notifications based on event type
            target_roles = []
            
            if event.type == 'class':
                target_roles = ['teacher', 'student']
            elif event.type == 'exam':
                target_roles = ['teacher', 'student', 'parent']
            elif event.type == 'meeting':
                target_roles = ['teacher', 'admin']
            elif event.type == 'holiday':
                target_roles = ['teacher', 'student', 'parent', 'admin']
            
            # Format event time for notification
            event_time = ""
            if event.start_time and event.end_time:
                event_time = f" from {event.start_time} to {event.end_time}"
            
            # Create notification for each role
            for role in target_roles:
                users = User.query.filter_by(role=role).all()
                
                for user in users:
                    # Check if notification already sent (avoid duplicates)
                    existing_notification = Notification.query.filter(
                        Notification.title.like(f"Reminder: {event.title}%"),
                        Notification.user_id == user.id,
                        Notification.created_at >= today
                    ).first()
                    
                    if not existing_notification:
                        # Create notification
                        title = f"Reminder: {event.title}"
                        message = f"You have an upcoming {event.type}: {event.title}{event_time} on {event.date.strftime('%B %d, %Y')}"
                        
                        NotificationService.create_notification(
                            title=title,
                            message=message,
                            notification_type="info",
                            user_id=user.id,
                            send_email=event.type in ['exam', 'meeting'],  # Send emails for important events
                            send_websocket=True
                        )
                        notification_count += 1
        
        logger.info("Generated calendar event reminders", count=notification_count)
        return True
    except Exception as e:
        logger.error("Failed to generate calendar event reminders", error=str(e))
        return False

@celery_app.task
def notify_event_changes(event_id, change_type):
    """Notify users about changes to calendar events.
    
    Args:
        event_id (str): ID of the changed event
        change_type (str): Type of change (updated, cancelled, rescheduled)
    """
    try:
        event = CalendarEvent.query.get(event_id)
        if not event:
            logger.error("Event not found for notification", event_id=event_id)
            return False
        
        # Determine notification title and message based on change type
        title = f"Event {change_type.capitalize()}: {event.title}"
        message = ""
        
        if change_type == "updated":
            message = f"The event '{event.title}' has been updated. Please check the calendar for details."
        elif change_type == "cancelled":
            message = f"The event '{event.title}' scheduled for {event.date.strftime('%B %d, %Y')} has been cancelled."
        elif change_type == "rescheduled":
            message = f"The event '{event.title}' has been rescheduled. New date: {event.date.strftime('%B %d, %Y')}."
        else:
            message = f"There has been a change to the event '{event.title}'. Please check the calendar for details."
        
        # Determine who should receive notifications based on event type
        target_roles = []
        
        if event.type == 'class':
            target_roles = ['teacher', 'student']
        elif event.type == 'exam':
            target_roles = ['teacher', 'student', 'parent']
        elif event.type == 'meeting':
            target_roles = ['teacher', 'admin']
        elif event.type == 'holiday':
            target_roles = ['teacher', 'student', 'parent', 'admin']
        
        # Create notification for each role
        notification_count = 0
        
        for role in target_roles:
            users = User.query.filter_by(role=role).all()
            
            for user in users:
                NotificationService.create_notification(
                    title=title,
                    message=message,
                    notification_type="warning" if change_type == "cancelled" else "info",
                    user_id=user.id,
                    send_email=event.type in ['exam', 'meeting'],  # Send emails for important events
                    send_websocket=True
                )
                notification_count += 1
        
        logger.info(f"Generated event {change_type} notifications", count=notification_count)
        return True
    except Exception as e:
        logger.error(f"Failed to generate event {change_type} notifications", error=str(e))
        return False