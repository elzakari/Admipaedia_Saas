import structlog
from app.extensions import db
from app.models.student import Student
from app.models.parent import Parent
from app.models.dashboard import Notification

logger = structlog.get_logger()

class NotificationFanoutService:
    """Service to handle transactional notification fanout to class audiences."""
    
    @staticmethod
    def enqueue_class_fanout(class_id, title, message, notification_type='info'):
        """
        Executes a transactional fanout of a class notification to all enrolled
        students and their parents, inserting records in the notifications table.
        
        Args:
            class_id (int): The ID of the class.
            title (str): Title of the notification.
            message (str): Body content of the notification.
            notification_type (str): Type/kind of notification (e.g., info, assignment).
        """
        try:
            from app.models.class_ import Class
            
            # 1. Fetch the class to resolve tenant_id and branch_id
            class_obj = Class.query.get(class_id)
            if not class_obj:
                logger.error("Class not found for fanout", class_id=class_id)
                raise ValueError(f"Class with ID {class_id} not found")

            tenant_id = getattr(class_obj, 'tenant_id', None)
            branch_id = getattr(class_obj, 'branch_id', None)

            # Query active student user IDs
            student_query = db.session.query(Student.user_id).filter(
                Student.class_id == class_id,
                Student.user_id.isnot(None),
                Student.status == 'active'
            )
            if tenant_id is not None:
                student_query = student_query.filter(Student.tenant_id == tenant_id)
            if branch_id is not None:
                student_query = student_query.filter(Student.branch_id == branch_id)

            student_user_ids = {r[0] for r in student_query.all()}

            # Query unique parent user IDs (deduplicated via set comprehension)
            parent_query = db.session.query(Parent.user_id).join(Student, Student.parent_id == Parent.id).filter(
                Student.class_id == class_id,
                Parent.user_id.isnot(None),
                Student.status == 'active'
            )
            if tenant_id is not None:
                parent_query = parent_query.filter(Parent.tenant_id == tenant_id)
                parent_query = parent_query.filter(Student.tenant_id == tenant_id)
            if branch_id is not None:
                parent_query = parent_query.filter(Student.branch_id == branch_id)

            parent_user_ids = {r[0] for r in parent_query.all()}
                
            notifications = []
            
            # Create student notifications
            for s_user_id in student_user_ids:
                notifications.append(
                    Notification(
                        title=title,
                        message=message or f"New update for class: {title}",
                        type=notification_type,
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
                        type=notification_type,
                        user_id=p_user_id,
                        recipient_id=p_user_id,
                        scope='parent'
                    )
                )
                
            if notifications:
                db.session.add_all(notifications)
                db.session.flush()
                logger.info("Durable audience fanout flushed successfully", notification_count=len(notifications))
                
                try:
                    from app.extensions import socketio
                    for notif in notifications:
                        try:
                            notif_data = {
                                'id': notif.id,
                                'title': notif.title,
                                'message': notif.message,
                                'time': notif.time.isoformat() if getattr(notif, 'time', None) else (notif.created_at.isoformat() if getattr(notif, 'created_at', None) else ''),
                                'read': notif.read,
                                'type': notif.type,
                                'priority': getattr(notif, 'priority', 'normal')
                            }
                            socketio.emit('new_notification', notif_data, room=f"user_{notif.recipient_id}", namespace='/notifications')
                        except Exception as socket_err:
                            logger.warning("Socket.IO notification emission failed for user", user_id=notif.recipient_id, error=str(socket_err))
                except Exception as import_err:
                    logger.warning("Failed to initialize Socket.IO broadcast for fanout", error=str(import_err))
                
        except Exception as e:
            logger.error("Error in enqueue_class_fanout", error=str(e), class_id=class_id)
            raise e


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
        NotificationFanoutService.enqueue_class_fanout(class_id, title, message)
    except Exception as e:
        logger.error("Error in execute_durable_audience_fanout", error=str(e), class_id=class_id)
        raise e
