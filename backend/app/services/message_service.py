from app.models.message import Message
from app.models.user import User
from app.extensions import db
from sqlalchemy import or_, and_, desc
from datetime import datetime
import os
import uuid
from werkzeug.utils import secure_filename
from flask import current_app
import logging

logger = logging.getLogger(__name__)

class MessageService:
    
    @staticmethod
    def get_user_messages(user_id, folder='inbox', is_read=None, page=1, per_page=20):
        """Get messages for a user with pagination and filtering"""
        try:
            query = Message.query
            
            if folder == 'inbox':
                # Messages received by the user (not deleted by recipient)
                query = query.filter(
                    and_(
                        Message.recipient_id == user_id,
                        Message.is_deleted_by_recipient == False
                    )
                )
            elif folder == 'sent':
                # Messages sent by the user (not deleted by sender)
                query = query.filter(
                    and_(
                        Message.sender_id == user_id,
                        Message.is_deleted_by_sender == False
                    )
                )
            elif folder == 'trash':
                # Messages deleted by the user
                query = query.filter(
                    or_(
                        and_(
                            Message.sender_id == user_id,
                            Message.is_deleted_by_sender == True
                        ),
                        and_(
                            Message.recipient_id == user_id,
                            Message.is_deleted_by_recipient == True
                        )
                    )
                )
            
            # Filter by read status if specified
            if is_read is not None:
                query = query.filter(Message.is_read == is_read)
            
            # Order by creation date (newest first)
            query = query.order_by(desc(Message.created_at))
            
            # Paginate
            paginated = query.paginate(
                page=page,
                per_page=per_page,
                error_out=False
            )
            
            return paginated.items, paginated.total
            
        except Exception as e:
            logger.error(f"Error getting user messages: {str(e)}")
            raise
    
    @staticmethod
    def get_message_by_id(message_id, user_id):
        """Get a specific message by ID if user has access"""
        try:
            message = Message.query.filter(
                and_(
                    Message.id == message_id,
                    or_(
                        Message.sender_id == user_id,
                        Message.recipient_id == user_id
                    )
                )
            ).first()
            
            return message
            
        except Exception as e:
            logger.error(f"Error getting message by ID: {str(e)}")
            raise
    
    @staticmethod
    def create_message(data):
        """Create a new message"""
        try:
            # Handle file attachments
            attachment_paths = []
            if 'attachments' in data and data['attachments']:
                attachment_paths = MessageService._save_attachments(data['attachments'])
            
            # Determine sender type based on user
            sender = User.query.get(data['sender_id'])
            sender_type = MessageService._get_user_type(sender)
            
            recipient_id = data['recipient_id']
            recipient_type = data['recipient_type']
            
            created_messages = []
            
            if recipient_type == 'class':
                from app.models.student import Student
                from app.models.parent import Parent
                
                # Resolve all students in this class
                students_in_class = Student.query.filter_by(class_id=recipient_id).all()
                
                target_recipients = []
                for student in students_in_class:
                    if student.user_id:
                        target_recipients.append((student.user_id, 'student'))
                    if student.parent_id:
                        parent = Parent.query.get(student.parent_id)
                        if parent and parent.user_id:
                            target_recipients.append((parent.user_id, 'parent'))
                
                # Deduplicate recipients by user_id
                seen_ids = set()
                deduped_recipients = []
                for r_id, r_type in target_recipients:
                    if r_id not in seen_ids:
                        seen_ids.add(r_id)
                        deduped_recipients.append((r_id, r_type))
                
                if not deduped_recipients:
                    raise ValueError("No recipients found in the specified class.")
                
                for r_id, r_type in deduped_recipients:
                    msg = Message(
                        sender_id=data['sender_id'],
                        sender_type=sender_type,
                        recipient_id=r_id,
                        recipient_type=r_type,
                        subject=data['subject'],
                        content=data['content'],
                        attachments=attachment_paths if attachment_paths else None
                    )
                    db.session.add(msg)
                    created_messages.append(msg)
                
                db.session.commit()
                
                # Attempt Socket.IO emit inside try/except Exception
                try:
                    from app.extensions import socketio
                    from app.schemas.message import MessageSchema
                    schema = MessageSchema()
                    
                    for msg in created_messages:
                        msg_data = schema.dump(msg)
                        socketio.emit('new_message', msg_data, room=f"user_{msg.recipient_id}", namespace='/messages')
                        socketio.emit('new_message', msg_data, room=f"user_{msg.recipient_id}", namespace='/chat')
                    
                    if created_messages:
                        sender_msg_data = schema.dump(created_messages[0])
                        socketio.emit('message_sent', {'success': True, 'message': sender_msg_data}, room=f"user_{data['sender_id']}", namespace='/messages')
                        socketio.emit('message_sent', {'success': True, 'message': sender_msg_data}, room=f"user_{data['sender_id']}", namespace='/chat')
                except Exception as socket_err:
                    logger.warning(f"Failed to emit Socket.IO notification for class message: {str(socket_err)}")
                
                return created_messages[0] if created_messages else None
            
            else:
                # Direct message (recipient_type can be student, parent, teacher, admin, user)
                # 1. Resolve parent/student/teacher profile id to user_id
                if recipient_type == 'parent':
                    from app.models.parent import Parent
                    parent = Parent.query.get(recipient_id)
                    if parent:
                        recipient_id = parent.user_id
                elif recipient_type == 'student':
                    from app.models.student import Student
                    student = Student.query.get(recipient_id)
                    if student:
                        recipient_id = student.user_id
                elif recipient_type == 'teacher':
                    from app.models.teacher import Teacher
                    teacher = Teacher.query.get(recipient_id)
                    if teacher:
                        recipient_id = teacher.user_id
                
                # 2. Harmonize recipient_type to role label only
                recipient = User.query.get(recipient_id)
                if recipient:
                    recipient_type = MessageService._get_user_type(recipient)
                else:
                    if recipient_type not in ['admin', 'teacher', 'student', 'parent']:
                        recipient_type = 'user'
                
                message = Message(
                    sender_id=data['sender_id'],
                    sender_type=sender_type,
                    recipient_id=recipient_id,
                    recipient_type=recipient_type,
                    subject=data['subject'],
                    content=data['content'],
                    attachments=attachment_paths if attachment_paths else None
                )
                
                db.session.add(message)
                db.session.commit()
                
                # Attempt Socket.IO emit inside try/except Exception
                try:
                    from app.extensions import socketio
                    from app.schemas.message import MessageSchema
                    schema = MessageSchema()
                    message_data = schema.dump(message)
                    
                    socketio.emit('new_message', message_data, room=f"user_{message.recipient_id}", namespace='/messages')
                    socketio.emit('new_message', message_data, room=f"user_{message.recipient_id}", namespace='/chat')
                    socketio.emit('message_sent', {'success': True, 'message': message_data}, room=f"user_{message.sender_id}", namespace='/messages')
                    socketio.emit('message_sent', {'success': True, 'message': message_data}, room=f"user_{message.sender_id}", namespace='/chat')
                except Exception as socket_err:
                    logger.warning(f"Failed to emit Socket.IO notification: {str(socket_err)}")
                
                return message
                
        except Exception as e:
            db.session.rollback()
            logger.error(f"Error creating message: {str(e)}")
            raise
    
    @staticmethod
    def create_bulk_message(data):
        """Create messages to multiple recipients"""
        try:
            # Handle file attachments
            attachment_paths = []
            if 'attachments' in data and data['attachments']:
                attachment_paths = MessageService._save_attachments(data['attachments'])
            
            # Determine sender type
            sender = User.query.get(data['sender_id'])
            sender_type = MessageService._get_user_type(sender)
            
            messages = []
            for recipient_id in data['recipient_ids']:
                r_id = int(recipient_id)
                r_type = data['recipient_type']
                
                if r_type == 'parent':
                    from app.models.parent import Parent
                    parent = Parent.query.get(r_id)
                    if parent:
                        r_id = parent.user_id
                elif r_type == 'student':
                    from app.models.student import Student
                    student = Student.query.get(r_id)
                    if student:
                        r_id = student.user_id
                elif r_type == 'teacher':
                    from app.models.teacher import Teacher
                    teacher = Teacher.query.get(r_id)
                    if teacher:
                        r_id = teacher.user_id
                
                recipient = User.query.get(r_id)
                if recipient:
                    r_type = MessageService._get_user_type(recipient)
                else:
                    if r_type not in ['admin', 'teacher', 'student', 'parent']:
                        r_type = 'user'
                
                message = Message(
                    sender_id=data['sender_id'],
                    sender_type=sender_type,
                    recipient_id=r_id,
                    recipient_type=r_type,
                    subject=data['subject'],
                    content=data['content'],
                    attachments=attachment_paths if attachment_paths else None
                )
                messages.append(message)
            
            db.session.add_all(messages)
            db.session.commit()
            
            # Attempt Socket.IO emit inside try/except Exception
            try:
                from app.extensions import socketio
                from app.schemas.message import MessageSchema
                schema = MessageSchema()
                
                for msg in messages:
                    msg_data = schema.dump(msg)
                    socketio.emit('new_message', msg_data, room=f"user_{msg.recipient_id}", namespace='/messages')
                    socketio.emit('new_message', msg_data, room=f"user_{msg.recipient_id}", namespace='/chat')
                
                if messages:
                    sender_msg_data = schema.dump(messages[0])
                    socketio.emit('message_sent', {'success': True, 'message': sender_msg_data}, room=f"user_{data['sender_id']}", namespace='/messages')
                    socketio.emit('message_sent', {'success': True, 'message': sender_msg_data}, room=f"user_{data['sender_id']}", namespace='/chat')
            except Exception as socket_err:
                logger.warning(f"Failed to emit Socket.IO notification for bulk messages: {str(socket_err)}")
            
            return len(messages)
            
        except Exception as e:
            db.session.rollback()
            logger.error(f"Error creating bulk message: {str(e)}")
            raise
    
    @staticmethod
    def update_message(message_id, user_id, data):
        """Update a message (mainly for marking as read/unread)"""
        try:
            message = MessageService.get_message_by_id(message_id, user_id)
            if not message:
                return None
            
            # Only allow recipient to mark as read/unread
            if message.recipient_id == user_id and 'is_read' in data:
                message.is_read = data['is_read']
                message.updated_at = datetime.utcnow()
            
            db.session.commit()
            return message
            
        except Exception as e:
            db.session.rollback()
            logger.error(f"Error updating message: {str(e)}")
            raise
    
    @staticmethod
    def delete_message(message_id, user_id, permanent=False):
        """Delete a message for a user"""
        try:
            message = MessageService.get_message_by_id(message_id, user_id)
            if not message:
                return False
            
            message.delete_for_user(user_id, permanent)
            return True
            
        except Exception as e:
            db.session.rollback()
            logger.error(f"Error deleting message: {str(e)}")
            raise
    
    @staticmethod
    def mark_as_read(message_id):
        """Mark a message as read"""
        try:
            message = Message.query.get(message_id)
            if message:
                message.mark_as_read()
                return True
            return False
            
        except Exception as e:
            logger.error(f"Error marking message as read: {str(e)}")
            raise
    
    @staticmethod
    def get_attachment_path(message_id, attachment_name):
        """Get the full path to a message attachment"""
        try:
            message = Message.query.get(message_id)
            if not message or not message.attachments:
                return None
            
            # Find the attachment in the message's attachments list
            for attachment_path in message.attachments:
                if os.path.basename(attachment_path) == attachment_name:
                    full_path = os.path.join(current_app.root_path, attachment_path)
                    if os.path.exists(full_path):
                        return full_path
            
            return None
            
        except Exception as e:
            logger.error(f"Error getting attachment path: {str(e)}")
            return None
    
    @staticmethod
    def _save_attachments(files):
        """Save uploaded files and return their paths"""
        try:
            upload_folder = os.path.join(current_app.root_path, 'uploads', 'messages')
            os.makedirs(upload_folder, exist_ok=True)
            
            attachment_paths = []
            for file in files:
                if file and file.filename:
                    # Generate unique filename
                    filename = secure_filename(file.filename)
                    unique_filename = f"{uuid.uuid4()}_{filename}"
                    file_path = os.path.join(upload_folder, unique_filename)
                    
                    # Save file
                    file.save(file_path)
                    
                    # Store relative path
                    relative_path = os.path.join('uploads', 'messages', unique_filename)
                    attachment_paths.append(relative_path)
            
            return attachment_paths
            
        except Exception as e:
            logger.error(f"Error saving attachments: {str(e)}")
            raise
    
    @staticmethod
    def _get_user_type(user):
        """Determine user type based on user roles"""
        if not user:
            return 'unknown'
        
        # Check user roles to determine type
        if hasattr(user, 'roles'):
            role_names = [role.name for role in user.roles]
            if 'admin' in role_names:
                return 'admin'
            elif 'teacher' in role_names:
                return 'teacher'
            elif 'parent' in role_names:
                return 'parent'
            elif 'student' in role_names:
                return 'student'
        
        # Fallback to checking related models
        if hasattr(user, 'teacher') and user.teacher:
            return 'teacher'
        elif hasattr(user, 'student') and user.student:
            return 'student'
        elif hasattr(user, 'parent') and user.parent:
            return 'parent'
        
        return 'user'