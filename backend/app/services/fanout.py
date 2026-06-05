import structlog
from app.extensions import db
from app.models.student import Student
from app.models.parent import Parent
from app.models.dashboard import Notification

logger = structlog.get_logger()

def execute_durable_audience_fanout(class_id, title, message):
    """
    Executes a transactional fanout of a class notification to all enrolled
    students and their parents, inserting records in the notifications table.
    
    Args:
        class_id (int): The ID of the class.
        title (str): Title of the notification.
        message (str): Body content of the notification.
    """
    try:
        # 1. Fetch all active students in the class
        # Look up by class_id and status='active' (or just filter by class_id)
        students = Student.query.filter_by(class_id=class_id).all()
        logger.info("Executing audience fanout", class_id=class_id, student_count=len(students))
        
        student_user_ids = set()
        parent_user_ids = set()
        
        for student in students:
            if student.user_id:
                student_user_ids.add(student.user_id)
            # Find the parent of the student and add their user_id
            if student.parent_id:
                parent = Parent.query.get(student.parent_id)
                if parent and parent.user_id:
                    parent_user_ids.add(parent.user_id)
            elif student.parent and student.parent.user_id:
                parent_user_ids.add(student.parent.user_id)
                
        notifications = []
        
        # Create student notifications
        for s_user_id in student_user_ids:
            notifications.append(
                Notification(
                    title=title,
                    message=message or f"New update for class: {title}",
                    type='info',
                    user_id=s_user_id,
                    recipient_id=s_user_id,
                    scope='student'
                )
            )
            
        # Create parent notifications
        for p_user_id in parent_user_ids:
            notifications.append(
                Notification(
                    title=title,
                    message=message or f"New update for class: {title}",
                    type='info',
                    user_id=p_user_id,
                    recipient_id=p_user_id,
                    scope='parent'
                )
            )
            
        if notifications:
            db.session.add_all(notifications)
            db.session.flush()
            logger.info("Durable audience fanout flushed successfully", notification_count=len(notifications))
            
    except Exception as e:
        logger.error("Error in execute_durable_audience_fanout", error=str(e), class_id=class_id)
        raise e
