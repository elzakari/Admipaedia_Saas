"""
Advanced Communication Service for ADMIPAEDIA
Handles messaging, announcements, and real-time communication features
"""

import structlog
from datetime import datetime, timedelta
from typing import List, Dict, Optional, Any
from flask import current_app
from flask_socketio import emit, join_room, leave_room
from sqlalchemy import and_, or_, desc, func
from app.extensions import db, socketio
from app.models.user import User
from app.models.dashboard import Notification
from app.services.notification_service import NotificationService
from app.services.email_service import send_notification_email

logger = structlog.get_logger()

class CommunicationService:
    """Advanced communication service with real-time messaging and announcements."""
    
    @staticmethod
    def create_announcement(title: str, content: str, author_id: int, 
                          target_roles: List[str] = None, 
                          target_classes: List[int] = None,
                          priority: str = 'normal',
                          expires_at: datetime = None,
                          send_notifications: bool = True) -> Dict[str, Any]:
        """
        Create a new announcement with advanced targeting and notification options.
        
        Args:
            title: Announcement title
            content: Announcement content
            author_id: ID of the user creating the announcement
            target_roles: List of roles to target (admin, teacher, student, parent)
            target_classes: List of class IDs to target
            priority: Priority level (low, normal, high, urgent)
            expires_at: Expiration datetime for the announcement
            send_notifications: Whether to send notifications to targeted users
            
        Returns:
            Dict containing announcement data and metadata
        """
        try:
            # Create announcement record
            announcement_data = {
                'id': f"ann_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}_{author_id}",
                'title': title,
                'content': content,
                'author_id': author_id,
                'target_roles': target_roles or ['all'],
                'target_classes': target_classes or [],
                'priority': priority,
                'created_at': datetime.utcnow(),
                'expires_at': expires_at,
                'read_by': [],
                'status': 'active'
            }
            
            # Get targeted users
            targeted_users = CommunicationService._get_targeted_users(
                target_roles, target_classes
            )
            
            # Send notifications if requested
            if send_notifications and targeted_users:
                notification_type = 'info'
                if priority == 'urgent':
                    notification_type = 'error'
                elif priority == 'high':
                    notification_type = 'warning'
                
                # Create notifications for targeted users
                user_ids = [user.id for user in targeted_users]
                NotificationService.create_bulk_notifications(
                    title=f"📢 New Announcement: {title}",
                    message=content[:200] + "..." if len(content) > 200 else content,
                    notification_type=notification_type,
                    user_ids=user_ids,
                    send_email=(priority in ['high', 'urgent']),
                    send_websocket=True
                )
            
            # Broadcast announcement via WebSocket
            socketio.emit('new_announcement', {
                'announcement': announcement_data,
                'target_roles': target_roles,
                'target_classes': target_classes
            }, namespace='/communications')
            
            logger.info("Announcement created", 
                       announcement_id=announcement_data['id'],
                       author_id=author_id,
                       target_count=len(targeted_users))
            
            return {
                'success': True,
                'announcement': announcement_data,
                'targeted_users_count': len(targeted_users)
            }
            
        except Exception as e:
            logger.error("Failed to create announcement", error=str(e))
            return {'success': False, 'error': str(e)}
    
    @staticmethod
    def create_direct_message(sender_id: int, recipient_id: int, 
                            subject: str, content: str,
                            priority: str = 'normal',
                            requires_response: bool = False) -> Dict[str, Any]:
        """
        Create a direct message between users.
        
        Args:
            sender_id: ID of the message sender
            recipient_id: ID of the message recipient
            subject: Message subject
            content: Message content
            priority: Message priority (low, normal, high, urgent)
            requires_response: Whether the message requires a response
            
        Returns:
            Dict containing message data and delivery status
        """
        try:
            message_data = {
                'id': f"msg_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}_{sender_id}",
                'sender_id': sender_id,
                'recipient_id': recipient_id,
                'subject': subject,
                'content': content,
                'priority': priority,
                'requires_response': requires_response,
                'created_at': datetime.utcnow(),
                'read_at': None,
                'responded_at': None,
                'status': 'sent'
            }
            
            # Get sender and recipient info
            sender = User.query.get(sender_id)
            recipient = User.query.get(recipient_id)
            
            if not sender or not recipient:
                return {'success': False, 'error': 'Invalid sender or recipient'}
            
            # Create notification for recipient
            notification_type = 'info'
            if priority == 'urgent':
                notification_type = 'error'
            elif priority == 'high':
                notification_type = 'warning'
            
            NotificationService.create_notification(
                title=f"💬 New Message from {sender.full_name}",
                message=f"Subject: {subject}",
                notification_type=notification_type,
                user_id=recipient_id,
                send_email=(priority in ['high', 'urgent']),
                send_websocket=True
            )
            
            # Send real-time message notification
            socketio.emit('new_message', {
                'message': message_data,
                'sender': {
                    'id': sender.id,
                    'name': sender.full_name,
                    'role': sender.role
                }
            }, room=f"user_{recipient_id}", namespace='/communications')
            
            logger.info("Direct message sent",
                       message_id=message_data['id'],
                       sender_id=sender_id,
                       recipient_id=recipient_id)
            
            return {'success': True, 'message': message_data}
            
        except Exception as e:
            logger.error("Failed to send direct message", error=str(e))
            return {'success': False, 'error': str(e)}
    
    @staticmethod
    def create_group_message(sender_id: int, group_type: str, group_id: int,
                           subject: str, content: str,
                           priority: str = 'normal') -> Dict[str, Any]:
        """
        Create a message for a group (class, department, etc.).
        
        Args:
            sender_id: ID of the message sender
            group_type: Type of group (class, department, role)
            group_id: ID of the group
            subject: Message subject
            content: Message content
            priority: Message priority
            
        Returns:
            Dict containing message data and delivery status
        """
        try:
            message_data = {
                'id': f"grp_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}_{sender_id}",
                'sender_id': sender_id,
                'group_type': group_type,
                'group_id': group_id,
                'subject': subject,
                'content': content,
                'priority': priority,
                'created_at': datetime.utcnow(),
                'read_by': [],
                'status': 'sent'
            }
            
            # Get group members
            group_members = CommunicationService._get_group_members(group_type, group_id)
            
            if not group_members:
                return {'success': False, 'error': 'No group members found'}
            
            # Create notifications for group members
            sender = User.query.get(sender_id)
            notification_type = 'info'
            if priority == 'urgent':
                notification_type = 'error'
            elif priority == 'high':
                notification_type = 'warning'
            
            user_ids = [member.id for member in group_members if member.id != sender_id]
            NotificationService.create_bulk_notifications(
                title=f"👥 Group Message from {sender.full_name}",
                message=f"Subject: {subject}",
                notification_type=notification_type,
                user_ids=user_ids,
                send_email=(priority in ['high', 'urgent']),
                send_websocket=True
            )
            
            # Broadcast to group room
            socketio.emit('new_group_message', {
                'message': message_data,
                'sender': {
                    'id': sender.id,
                    'name': sender.full_name,
                    'role': sender.role
                },
                'group_info': {
                    'type': group_type,
                    'id': group_id,
                    'member_count': len(group_members)
                }
            }, room=f"{group_type}_{group_id}", namespace='/communications')
            
            logger.info("Group message sent",
                       message_id=message_data['id'],
                       sender_id=sender_id,
                       group_type=group_type,
                       group_id=group_id,
                       member_count=len(group_members))
            
            return {
                'success': True, 
                'message': message_data,
                'delivered_to': len(group_members) - 1
            }
            
        except Exception as e:
            logger.error("Failed to send group message", error=str(e))
            return {'success': False, 'error': str(e)}
    
    @staticmethod
    def get_user_messages(user_id: int, message_type: str = 'all',
                         limit: int = 50, offset: int = 0) -> Dict[str, Any]:
        """
        Get messages for a specific user.
        
        Args:
            user_id: User ID
            message_type: Type of messages (inbox, sent, announcements, all)
            limit: Maximum number of messages to return
            offset: Offset for pagination
            
        Returns:
            Dict containing messages and pagination info
        """
        try:
            # This would typically query a messages table
            # For now, we'll return a structured response
            messages = []
            total_count = 0
            
            # Get user notifications as messages
            notifications = Notification.query.filter(
                or_(
                    Notification.user_id == user_id,
                    Notification.user_id == None  # Global notifications
                )
            ).order_by(desc(Notification.time)).limit(limit).offset(offset).all()
            
            for notification in notifications:
                messages.append({
                    'id': notification.id,
                    'type': 'notification',
                    'title': notification.title,
                    'content': notification.message,
                    'created_at': notification.time.isoformat(),
                    'read': notification.read,
                    'priority': notification.type
                })
            
            total_count = Notification.query.filter(
                or_(
                    Notification.user_id == user_id,
                    Notification.user_id == None
                )
            ).count()
            
            return {
                'success': True,
                'messages': messages,
                'pagination': {
                    'total': total_count,
                    'limit': limit,
                    'offset': offset,
                    'has_more': (offset + limit) < total_count
                }
            }
            
        except Exception as e:
            logger.error("Failed to get user messages", error=str(e))
            return {'success': False, 'error': str(e)}
    
    @staticmethod
    def mark_message_read(message_id: str, user_id: int) -> Dict[str, Any]:
        """Mark a message as read by a user."""
        try:
            # For notifications
            if message_id.startswith('notification_'):
                notification_id = message_id.replace('notification_', '')
                notification = Notification.query.get(notification_id)
                if notification and (notification.user_id == user_id or notification.user_id is None):
                    notification.read = True
                    db.session.commit()
                    
                    # Emit read status update
                    socketio.emit('message_read', {
                        'message_id': message_id,
                        'user_id': user_id,
                        'read_at': datetime.utcnow().isoformat()
                    }, room=f"user_{user_id}", namespace='/communications')
                    
                    return {'success': True}
            
            return {'success': False, 'error': 'Message not found'}
            
        except Exception as e:
            logger.error("Failed to mark message as read", error=str(e))
            return {'success': False, 'error': str(e)}
    
    @staticmethod
    def _get_targeted_users(target_roles: List[str], target_classes: List[int]) -> List[User]:
        """Get users based on targeting criteria."""
        query = User.query
        
        if target_roles and 'all' not in target_roles:
            query = query.filter(User.role.in_(target_roles))
        
        # Additional filtering by classes would require class membership tables
        # This is a simplified implementation
        
        return query.all()
    
    @staticmethod
    def _get_group_members(group_type: str, group_id: int) -> List[User]:
        """Get members of a specific group."""
        # This would typically query relationship tables
        # For now, return a basic query
        if group_type == 'role':
            roles = ['admin', 'teacher', 'student', 'parent']
            if group_id < len(roles):
                return User.query.filter(User.role == roles[group_id]).all()
        
        return User.query.all()  # Fallback
    
    @staticmethod
    def get_communication_analytics(user_id: int = None, 
                                  days: int = 30) -> Dict[str, Any]:
        """Get communication analytics and insights."""
        try:
            end_date = datetime.utcnow()
            start_date = end_date - timedelta(days=days)
            
            # Get notification statistics
            notification_query = Notification.query.filter(
                Notification.time >= start_date
            )
            
            if user_id:
                notification_query = notification_query.filter(
                    or_(
                        Notification.user_id == user_id,
                        Notification.user_id == None
                    )
                )
            
            total_notifications = notification_query.count()
            read_notifications = notification_query.filter(
                Notification.read == True
            ).count()
            
            # Calculate engagement metrics
            read_rate = (read_notifications / total_notifications * 100) if total_notifications > 0 else 0
            
            # Get notification types distribution
            type_distribution = {}
            for notification_type in ['info', 'warning', 'error', 'success']:
                count = notification_query.filter(
                    Notification.type == notification_type
                ).count()
                type_distribution[notification_type] = count
            
            return {
                'success': True,
                'analytics': {
                    'total_notifications': total_notifications,
                    'read_notifications': read_notifications,
                    'unread_notifications': total_notifications - read_notifications,
                    'read_rate': round(read_rate, 2),
                    'type_distribution': type_distribution,
                    'period_days': days,
                    'generated_at': datetime.utcnow().isoformat()
                }
            }
            
        except Exception as e:
            logger.error("Failed to get communication analytics", error=str(e))
            return {'success': False, 'error': str(e)}

# WebSocket event handlers for real-time communication
@socketio.on('join_communication_room', namespace='/communications')
def handle_join_communication_room(data):
    """Handle user joining communication rooms."""
    try:
        user_id = data.get('user_id')
        room_type = data.get('room_type', 'user')
        room_id = data.get('room_id', user_id)
        
        room_name = f"{room_type}_{room_id}"
        join_room(room_name)
        
        emit('joined_room', {
            'room': room_name,
            'status': 'connected',
            'timestamp': datetime.utcnow().isoformat()
        })
        
        logger.info("User joined communication room",
                   user_id=user_id,
                   room=room_name)
        
    except Exception as e:
        logger.error("Failed to join communication room", error=str(e))
        emit('error', {'message': 'Failed to join room'})

@socketio.on('leave_communication_room', namespace='/communications')
def handle_leave_communication_room(data):
    """Handle user leaving communication rooms."""
    try:
        user_id = data.get('user_id')
        room_type = data.get('room_type', 'user')
        room_id = data.get('room_id', user_id)
        
        room_name = f"{room_type}_{room_id}"
        leave_room(room_name)
        
        emit('left_room', {
            'room': room_name,
            'status': 'disconnected',
            'timestamp': datetime.utcnow().isoformat()
        })
        
        logger.info("User left communication room",
                   user_id=user_id,
                   room=room_name)
        
    except Exception as e:
        logger.error("Failed to leave communication room", error=str(e))

@socketio.on('send_real_time_message', namespace='/communications')
def handle_real_time_message(data):
    """Handle real-time message sending."""
    try:
        sender_id = data.get('sender_id')
        recipient_id = data.get('recipient_id')
        message = data.get('message')
        message_type = data.get('type', 'text')
        
        if not all([sender_id, recipient_id, message]):
            emit('error', {'message': 'Missing required fields'})
            return
        
        # Create real-time message
        real_time_message = {
            'id': f"rt_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}_{sender_id}",
            'sender_id': sender_id,
            'recipient_id': recipient_id,
            'message': message,
            'type': message_type,
            'timestamp': datetime.utcnow().isoformat(),
            'status': 'delivered'
        }
        
        # Send to recipient
        emit('real_time_message', real_time_message, 
             room=f"user_{recipient_id}")
        
        # Confirm to sender
        emit('message_sent', {
            'message_id': real_time_message['id'],
            'status': 'delivered',
            'timestamp': real_time_message['timestamp']
        })
        
        logger.info("Real-time message sent",
                   message_id=real_time_message['id'],
                   sender_id=sender_id,
                   recipient_id=recipient_id)
        
    except Exception as e:
        logger.error("Failed to send real-time message", error=str(e))
        emit('error', {'message': 'Failed to send message'})

class CommunicationService:
    """Enhanced service for communication-related operations."""
    
    @staticmethod
    def create_message(sender_id: int, recipient_id: int, recipient_type: str, 
                      subject: str, content: str, attachments: List = None,
                      reply_to: int = None, chat_room_id: str = None) -> Dict[str, Any]:
        """Create a new message with enhanced features.
        
        Args:
            sender_id (int): ID of the message sender
            recipient_id (int): ID of the message recipient
            recipient_type (str): Type of recipient (user, class, group)
            subject (str): Message subject
            content (str): Message content
            attachments (List, optional): List of file attachments
            reply_to (int, optional): ID of message being replied to
            chat_room_id (str, optional): Chat room identifier
            
        Returns:
            Dict: Created message data with metadata
        """
        try:
            # Create message record
            message = Message(
                sender_id=sender_id,
                recipient_id=recipient_id,
                recipient_type=recipient_type,
                subject=subject,
                content=content,
                reply_to=reply_to,
                chat_room_id=chat_room_id,
                created_at=datetime.utcnow(),
                is_read=False,
                delivery_status='sent'
            )
            
            db.session.add(message)
            db.session.flush()  # Get message ID
            
            # Handle file attachments
            attachment_data = []
            if attachments:
                for file in attachments:
                    file_path = save_uploaded_file(file, 'messages')
                    attachment = MessageAttachment(
                        message_id=message.id,
                        filename=file.filename,
                        file_path=file_path,
                        file_size=len(file.read()),
                        mime_type=file.content_type
                    )
                    db.session.add(attachment)
                    attachment_data.append({
                        'filename': file.filename,
                        'size': attachment.file_size,
                        'type': attachment.mime_type
                    })
            
            db.session.commit()
            
            # Prepare message data for real-time delivery
            message_data = {
                'id': message.id,
                'sender_id': sender_id,
                'recipient_id': recipient_id,
                'recipient_type': recipient_type,
                'subject': subject,
                'content': content,
                'attachments': attachment_data,
                'created_at': message.created_at.isoformat(),
                'is_read': False,
                'delivery_status': 'sent',
                'reply_to': reply_to
            }
            
            # Send real-time notification via WebSocket
            CommunicationService._send_realtime_message(message_data, chat_room_id)
            
            # Create notification for recipient
            NotificationService.create_notification(
                title=f"New message from {CommunicationService._get_user_name(sender_id)}",
                message=f"Subject: {subject}",
                notification_type='message',
                user_id=recipient_id,
                send_email=True,
                send_websocket=True
            )
            
            logger.info("Message created successfully", 
                       message_id=message.id, 
                       sender_id=sender_id,
                       recipient_id=recipient_id)
            
            return message_data
            
        except Exception as e:
            logger.error("Failed to create message", error=str(e))
            db.session.rollback()
            raise
    
    @staticmethod
    def create_bulk_message(sender_id: int, recipient_ids: List[int], 
                           recipient_type: str, subject: str, content: str,
                           attachments: List = None) -> Dict[str, Any]:
        """Create messages for multiple recipients.
        
        Args:
            sender_id (int): ID of the message sender
            recipient_ids (List[int]): List of recipient IDs
            recipient_type (str): Type of recipients
            subject (str): Message subject
            content (str): Message content
            attachments (List, optional): List of file attachments
            
        Returns:
            Dict: Summary of created messages
        """
        created_messages = []
        failed_messages = []
        
        for recipient_id in recipient_ids:
            try:
                message_data = CommunicationService.create_message(
                    sender_id=sender_id,
                    recipient_id=recipient_id,
                    recipient_type=recipient_type,
                    subject=subject,
                    content=content,
                    attachments=attachments
                )
                created_messages.append(message_data)
            except Exception as e:
                failed_messages.append({
                    'recipient_id': recipient_id,
                    'error': str(e)
                })
        
        return {
            'success': len(created_messages),
            'failed': len(failed_messages),
            'created_messages': created_messages,
            'failed_messages': failed_messages
        }
    
    @staticmethod
    def get_messages(user_id: int, folder: str = 'inbox', page: int = 1, 
                    per_page: int = 20, search_query: str = None,
                    chat_room_id: str = None) -> Dict[str, Any]:
        """Get messages for a user with advanced filtering.
        
        Args:
            user_id (int): User ID
            folder (str): Message folder (inbox, sent, trash)
            page (int): Page number for pagination
            per_page (int): Messages per page
            search_query (str, optional): Search query for filtering
            chat_room_id (str, optional): Specific chat room
            
        Returns:
            Dict: Messages with pagination info
        """
        try:
            query = Message.query
            
            # Filter by folder type
            if folder == 'inbox':
                query = query.filter(Message.recipient_id == user_id)
            elif folder == 'sent':
                query = query.filter(Message.sender_id == user_id)
            elif folder == 'trash':
                query = query.filter(
                    and_(
                        or_(Message.sender_id == user_id, Message.recipient_id == user_id),
                        Message.is_deleted == True
                    )
                )
            
            # Filter by chat room if specified
            if chat_room_id:
                query = query.filter(Message.chat_room_id == chat_room_id)
            
            # Apply search filter
            if search_query:
                search_filter = or_(
                    Message.subject.ilike(f'%{search_query}%'),
                    Message.content.ilike(f'%{search_query}%')
                )
                query = query.filter(search_filter)
            
            # Exclude deleted messages for non-trash folders
            if folder != 'trash':
                query = query.filter(Message.is_deleted == False)
            
            # Order by creation date (newest first)
            query = query.order_by(desc(Message.created_at))
            
            # Apply pagination
            paginated_messages = query.paginate(
                page=page, 
                per_page=per_page, 
                error_out=False
            )
            
            # Format messages with additional data
            messages = []
            for message in paginated_messages.items:
                message_data = {
                    'id': message.id,
                    'sender_id': message.sender_id,
                    'sender_name': CommunicationService._get_user_name(message.sender_id),
                    'recipient_id': message.recipient_id,
                    'recipient_type': message.recipient_type,
                    'subject': message.subject,
                    'content': message.content,
                    'created_at': message.created_at.isoformat(),
                    'is_read': message.is_read,
                    'delivery_status': message.delivery_status,
                    'reply_to': message.reply_to,
                    'attachments': CommunicationService._get_message_attachments(message.id),
                    'reactions': CommunicationService._get_message_reactions(message.id)
                }
                messages.append(message_data)
            
            return {
                'messages': messages,
                'pagination': {
                    'page': page,
                    'per_page': per_page,
                    'total': paginated_messages.total,
                    'pages': paginated_messages.pages,
                    'has_next': paginated_messages.has_next,
                    'has_prev': paginated_messages.has_prev
                }
            }
            
        except Exception as e:
            logger.error("Failed to get messages", error=str(e), user_id=user_id)
            raise
    
    @staticmethod
    def mark_message_as_read(message_id: int, user_id: int) -> bool:
        """Mark a message as read and update delivery status.
        
        Args:
            message_id (int): Message ID
            user_id (int): User ID marking the message as read
            
        Returns:
            bool: Success status
        """
        try:
            message = Message.query.get(message_id)
            if not message:
                return False
            
            # Only recipient can mark message as read
            if message.recipient_id != user_id:
                return False
            
            message.is_read = True
            message.read_at = datetime.utcnow()
            message.delivery_status = 'read'
            
            db.session.commit()
            
            # Notify sender about read status via WebSocket
            socketio.emit('message_read', {
                'message_id': message_id,
                'user_id': user_id,
                'read_at': message.read_at.isoformat()
            }, room=f"user_{message.sender_id}", namespace='/chat')
            
            logger.info("Message marked as read", 
                       message_id=message_id, 
                       user_id=user_id)
            
            return True
            
        except Exception as e:
            logger.error("Failed to mark message as read", 
                        error=str(e), 
                        message_id=message_id)
            db.session.rollback()
            return False
    
    @staticmethod
    def delete_message(message_id: int, user_id: int, permanent: bool = False) -> bool:
        """Delete or soft-delete a message.
        
        Args:
            message_id (int): Message ID
            user_id (int): User ID requesting deletion
            permanent (bool): Whether to permanently delete
            
        Returns:
            bool: Success status
        """
        try:
            message = Message.query.get(message_id)
            if not message:
                return False
            
            # Check if user has permission to delete
            if message.sender_id != user_id and message.recipient_id != user_id:
                return False
            
            if permanent:
                # Delete attachments from filesystem
                attachments = MessageAttachment.query.filter_by(message_id=message_id).all()
                for attachment in attachments:
                    delete_file(attachment.file_path)
                    db.session.delete(attachment)
                
                # Delete message permanently
                db.session.delete(message)
            else:
                # Soft delete
                message.is_deleted = True
                message.deleted_at = datetime.utcnow()
            
            db.session.commit()
            
            logger.info("Message deleted", 
                       message_id=message_id, 
                       user_id=user_id,
                       permanent=permanent)
            
            return True
            
        except Exception as e:
            logger.error("Failed to delete message", 
                        error=str(e), 
                        message_id=message_id)
            db.session.rollback()
            return False
    
    @staticmethod
    def create_chat_room(name: str, room_type: str, created_by: int, 
                        participants: List[int] = None) -> Dict[str, Any]:
        """Create a new chat room for group conversations.
        
        Args:
            name (str): Chat room name
            room_type (str): Type of room (class, group, private)
            created_by (int): User ID who created the room
            participants (List[int], optional): List of participant user IDs
            
        Returns:
            Dict: Created chat room data
        """
        try:
            chat_room = ChatRoom(
                name=name,
                room_type=room_type,
                created_by=created_by,
                created_at=datetime.utcnow(),
                is_active=True
            )
            
            db.session.add(chat_room)
            db.session.flush()
            
            # Add participants
            if participants:
                for user_id in participants:
                    participant = ChatParticipant(
                        chat_room_id=chat_room.id,
                        user_id=user_id,
                        joined_at=datetime.utcnow(),
                        role='member'
                    )
                    db.session.add(participant)
            
            # Add creator as admin
            creator_participant = ChatParticipant(
                chat_room_id=chat_room.id,
                user_id=created_by,
                joined_at=datetime.utcnow(),
                role='admin'
            )
            db.session.add(creator_participant)
            
            db.session.commit()
            
            room_data = {
                'id': chat_room.id,
                'name': chat_room.name,
                'room_type': chat_room.room_type,
                'created_by': created_by,
                'created_at': chat_room.created_at.isoformat(),
                'participants': len(participants or []) + 1
            }
            
            logger.info("Chat room created", 
                       room_id=chat_room.id, 
                       created_by=created_by)
            
            return room_data
            
        except Exception as e:
            logger.error("Failed to create chat room", error=str(e))
            db.session.rollback()
            raise
    
    @staticmethod
    def add_message_reaction(message_id: int, user_id: int, emoji: str) -> bool:
        """Add or toggle a reaction to a message.
        
        Args:
            message_id (int): Message ID
            user_id (int): User ID adding reaction
            emoji (str): Emoji reaction
            
        Returns:
            bool: Success status
        """
        try:
            # Implementation for message reactions
            # This would involve a MessageReaction model
            
            # Emit real-time reaction update
            socketio.emit('reaction_added', {
                'message_id': message_id,
                'user_id': user_id,
                'emoji': emoji
            }, namespace='/chat')
            
            return True
            
        except Exception as e:
            logger.error("Failed to add reaction", error=str(e))
            return False
    
    @staticmethod
    def handle_typing_indicator(user_id: int, chat_room_id: str, is_typing: bool):
        """Handle typing indicators for real-time chat.
        
        Args:
            user_id (int): User ID
            chat_room_id (str): Chat room ID
            is_typing (bool): Whether user is typing
        """
        try:
            user_name = CommunicationService._get_user_name(user_id)
            
            if is_typing:
                socketio.emit('user_typing', {
                    'user': {
                        'id': user_id,
                        'name': user_name,
                        'isTyping': True
                    }
                }, room=chat_room_id, namespace='/chat')
            else:
                socketio.emit('user_stopped_typing', {
                    'user_id': user_id
                }, room=chat_room_id, namespace='/chat')
                
        except Exception as e:
            logger.error("Failed to handle typing indicator", error=str(e))
    
    @staticmethod
    def get_chat_statistics(user_id: int) -> Dict[str, Any]:
        """Get communication statistics for a user.
        
        Args:
            user_id (int): User ID
            
        Returns:
            Dict: Communication statistics
        """
        try:
            # Unread messages count
            unread_count = Message.query.filter(
                and_(
                    Message.recipient_id == user_id,
                    Message.is_read == False,
                    Message.is_deleted == False
                )
            ).count()
            
            # Total messages sent
            sent_count = Message.query.filter(
                Message.sender_id == user_id
            ).count()
            
            # Total messages received
            received_count = Message.query.filter(
                Message.recipient_id == user_id
            ).count()
            
            # Recent activity (last 7 days)
            week_ago = datetime.utcnow() - timedelta(days=7)
            recent_activity = Message.query.filter(
                and_(
                    or_(Message.sender_id == user_id, Message.recipient_id == user_id),
                    Message.created_at >= week_ago
                )
            ).count()
            
            return {
                'unread_messages': unread_count,
                'total_sent': sent_count,
                'total_received': received_count,
                'recent_activity': recent_activity,
                'active_chats': CommunicationService._get_active_chats_count(user_id)
            }
            
        except Exception as e:
            logger.error("Failed to get chat statistics", error=str(e))
            return {}
    
    # Helper methods
    @staticmethod
    def _send_realtime_message(message_data: Dict, chat_room_id: str = None):
        """Send real-time message via WebSocket."""
        try:
            if chat_room_id:
                socketio.emit('new_message', message_data, 
                            room=chat_room_id, namespace='/chat')
            else:
                # Send to specific user
                socketio.emit('new_message', message_data, 
                            room=f"user_{message_data['recipient_id']}", 
                            namespace='/chat')
        except Exception as e:
            logger.error("Failed to send real-time message", error=str(e))
    
    @staticmethod
    def _get_user_name(user_id: int) -> str:
        """Get user name by ID."""
        try:
            user = User.query.get(user_id)
            return f"{user.first_name} {user.last_name}" if user else "Unknown User"
        except:
            return "Unknown User"
    
    @staticmethod
    def _get_message_attachments(message_id: int) -> List[Dict]:
        """Get attachments for a message."""
        try:
            attachments = MessageAttachment.query.filter_by(message_id=message_id).all()
            return [{
                'filename': att.filename,
                'size': att.file_size,
                'type': att.mime_type,
                'url': f"/api/messages/{message_id}/attachments/{att.filename}"
            } for att in attachments]
        except:
            return []
    
    @staticmethod
    def _get_message_reactions(message_id: int) -> List[Dict]:
        """Get reactions for a message."""
        # Implementation would depend on MessageReaction model
        return []
    
    @staticmethod
    def _get_active_chats_count(user_id: int) -> int:
        """Get count of active chats for user."""
        try:
            return ChatParticipant.query.filter_by(user_id=user_id).count()
        except:
            return 0

# WebSocket event handlers
@socketio.on('join_chat', namespace='/chat')
def handle_join_chat(data):
    """Handle user joining a chat room."""
    chat_id = data.get('chat_id')
    user_id = data.get('user_id')
    
    if chat_id and user_id:
        join_room(chat_id)
        join_room(f"user_{user_id}")
        
        emit('user_joined', {
            'user_id': user_id,
            'chat_id': chat_id
        }, room=chat_id)

@socketio.on('leave_chat', namespace='/chat')
def handle_leave_chat(data):
    """Handle user leaving a chat room."""
    chat_id = data.get('chat_id')
    user_id = data.get('user_id')
    
    if chat_id and user_id:
        leave_room(chat_id)
        
        emit('user_left', {
            'user_id': user_id,
            'chat_id': chat_id
        }, room=chat_id)

@socketio.on('typing_start', namespace='/chat')
def handle_typing_start(data):
    """Handle typing start event."""
    chat_id = data.get('chat_id')
    user_id = data.get('user_id')
    
    CommunicationService.handle_typing_indicator(user_id, chat_id, True)

@socketio.on('typing_stop', namespace='/chat')
def handle_typing_stop(data):
    """Handle typing stop event."""
    chat_id = data.get('chat_id')
    user_id = data.get('user_id')
    
    CommunicationService.handle_typing_indicator(user_id, chat_id, False)

@socketio.on('add_reaction', namespace='/chat')
def handle_add_reaction(data):
    """Handle message reaction."""
    message_id = data.get('message_id')
    user_id = data.get('user_id')
    emoji = data.get('emoji')
    
    if message_id and user_id and emoji:
        CommunicationService.add_message_reaction(message_id, user_id, emoji)