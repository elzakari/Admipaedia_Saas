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
            
            # Extract recipient_ref if provided, or build from recipient_id and recipient_type
            recipient_ref = data.get('recipient_ref')
            if not recipient_ref:
                recipient_id = data.get('recipient_id')
                recipient_type = data.get('recipient_type')
                if not recipient_id or not recipient_type:
                    raise ValueError("Either recipient_ref or recipient_id + recipient_type must be provided.")
                # Build simulated recipient_ref
                if recipient_type == 'class':
                    recipient_ref = f"class:{recipient_id}:all"
                elif recipient_type in ('parent', 'student', 'teacher'):
                    recipient_ref = f"{recipient_type}:{recipient_id}"
                else:
                    recipient_ref = f"user:{recipient_id}"
            
            # Resolve the recipient ref
            resolved_recipients, r_type = MessageService.resolve_recipient_ref(recipient_ref)
            
            # Validate permissions for each resolved recipient
            for r_id, r_role in resolved_recipients:
                if not MessageService.validate_sender_recipient_relation(data['sender_id'], r_id):
                    raise ValueError(f"Messaging not allowed between sender and recipient {r_id}.")
            
            created_messages = []
            for r_id, r_role in resolved_recipients:
                msg = Message(
                    sender_id=data['sender_id'],
                    sender_type=sender_type,
                    recipient_id=r_id,
                    recipient_type=r_role,
                    subject=data['subject'],
                    content=data['content'],
                    attachments=attachment_paths if attachment_paths else None
                )
                db.session.add(msg)
                created_messages.append(msg)
                
            db.session.commit()
            
            # Emit socket events safely
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
                logger.warning(f"Failed to emit Socket.IO notification: {str(socket_err)}")
                
            return created_messages[0] if created_messages else None
            
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
            
            recipient_refs = data.get('recipient_refs')
            if not recipient_refs:
                recipient_ids = data.get('recipient_ids')
                recipient_type = data.get('recipient_type')
                recipient_refs = []
                for rid in recipient_ids:
                    if recipient_type == 'class':
                        recipient_refs.append(f"class:{rid}:all")
                    elif recipient_type in ('parent', 'student', 'teacher'):
                        recipient_refs.append(f"{recipient_type}:{rid}")
                    else:
                        recipient_refs.append(f"user:{rid}")
            
            messages = []
            for ref in recipient_refs:
                resolved_recipients, r_type = MessageService.resolve_recipient_ref(ref)
                for r_id, r_role in resolved_recipients:
                    if not MessageService.validate_sender_recipient_relation(data['sender_id'], r_id):
                        raise ValueError(f"Messaging not allowed between sender and recipient {r_id}.")
                    
                    message = Message(
                        sender_id=data['sender_id'],
                        sender_type=sender_type,
                        recipient_id=r_id,
                        recipient_type=r_role,
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
    def resolve_recipient_ref(recipient_ref):
        """
        Resolves a recipient_ref string into a list of tuples: (user_id, role)
        Supported ref formats:
        - user:<id> -> [(user_id, role)]
        - parent:<id> -> [(parent.user_id, 'parent')]
        - student:<id> -> [(student.user_id, 'student')]
        - teacher:<id> -> [(teacher.user_id, 'teacher')]
        - class:<id>:students -> list of (student.user_id, 'student')
        - class:<id>:parents -> list of (parent.user_id, 'parent')
        - class:<id>:all -> list of both
        """
        if not recipient_ref:
            raise ValueError("recipient_ref cannot be empty")
            
        parts = recipient_ref.split(':')
        if not parts:
            raise ValueError(f"Invalid recipient_ref: {recipient_ref}")
            
        ref_type = parts[0]
        
        if ref_type == 'class':
            if len(parts) < 3:
                raise ValueError(f"Invalid class ref format. Expected class:<id>:<audience>, got: {recipient_ref}")
            class_id_str, audience = parts[1], parts[2]
            try:
                class_id = int(class_id_str)
            except ValueError:
                raise ValueError(f"Invalid class ID: {class_id_str}")
                
            from app.models.student import Student
            from app.models.parent import Parent
            
            students = Student.query.filter_by(class_id=class_id).all()
            recipients = []
            
            if audience in ('students', 'all'):
                for s in students:
                    if s.user_id:
                        recipients.append((s.user_id, 'student'))
            if audience in ('parents', 'all'):
                for s in students:
                    if s.parent_id:
                        parent = Parent.query.get(s.parent_id)
                        if parent and parent.user_id:
                            recipients.append((parent.user_id, 'parent'))
                            
            # Deduplicate and validate that the users exist
            seen = set()
            deduped = []
            for uid, role in recipients:
                if uid not in seen:
                    user_exists = User.query.get(uid) is not None
                    if user_exists:
                        seen.add(uid)
                        deduped.append((uid, role))
                    
            if not deduped:
                raise ValueError(f"No active recipients found for class ID {class_id}")
            return deduped, 'class'
            
        else:
            if len(parts) < 2:
                raise ValueError(f"Invalid ref format: {recipient_ref}")
            id_str = parts[1]
            try:
                numeric_id = int(id_str)
            except ValueError:
                raise ValueError(f"Invalid numeric ID: {id_str}")
                
            if ref_type == 'parent':
                from app.models.parent import Parent
                parent = Parent.query.get(numeric_id)
                if not parent:
                    # Fallback to User table
                    user = User.query.get(numeric_id)
                    if user and MessageService._get_user_type(user) == 'parent':
                        return [(user.id, 'parent')], 'parent'
                    raise ValueError(f"Parent profile with ID {numeric_id} does not exist.")
                
                # Enforce that parent.user_id is valid and exists in users table
                p_user_id = parent.user_id
                if not p_user_id or User.query.get(p_user_id) is None:
                    raise ValueError("Associated parent user account not found or deactivated.")
                return [(p_user_id, 'parent')], 'parent'
                
            elif ref_type == 'student':
                from app.models.student import Student
                student = Student.query.get(numeric_id)
                if not student:
                    # Fallback to User table
                    user = User.query.get(numeric_id)
                    if user and MessageService._get_user_type(user) == 'student':
                        return [(user.id, 'student')], 'student'
                    raise ValueError(f"Student profile with ID {numeric_id} does not exist.")
                
                # Enforce that student.user_id is valid and exists in users table
                s_user_id = student.user_id
                if not s_user_id or User.query.get(s_user_id) is None:
                    raise ValueError("Associated student user account not found or deactivated.")
                return [(s_user_id, 'student')], 'student'
                
            elif ref_type == 'teacher':
                from app.models.teacher import Teacher
                teacher = Teacher.query.get(numeric_id)
                if not teacher:
                    # Fallback to User table
                    user = User.query.get(numeric_id)
                    if user and MessageService._get_user_type(user) == 'teacher':
                        return [(user.id, 'teacher')], 'teacher'
                    raise ValueError(f"Teacher profile with ID {numeric_id} does not exist.")
                
                # Enforce that teacher.user_id is valid and exists in users table
                t_user_id = teacher.user_id
                if not t_user_id or User.query.get(t_user_id) is None:
                    raise ValueError("Associated teacher user account not found or deactivated.")
                return [(t_user_id, 'teacher')], 'teacher'
                
            elif ref_type == 'user':
                user = User.query.get(numeric_id)
                if not user:
                    raise ValueError(f"User with ID {numeric_id} does not exist.")
                role = MessageService._get_user_type(user)
                return [(user.id, role)], role
            else:
                raise ValueError(f"Unknown recipient ref type: {ref_type}")

    @staticmethod
    def validate_sender_recipient_relation(sender_id, recipient_user_id):
        """
        Validates whether a sender is allowed to message a recipient user.
        """
        from app.services.identity_resolver import IdentityResolver
        return IdentityResolver.can_user_message_recipient(sender_id, f"user:{recipient_user_id}")
    
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
        if hasattr(user, 'roles') and user.roles:
            role_names = [role.name for role in user.roles]
            if 'admin' in role_names:
                return 'admin'
            elif 'teacher' in role_names:
                return 'teacher'
            elif 'parent' in role_names:
                return 'parent'
            elif 'student' in role_names:
                return 'student'
        
        # Check user.role attribute directly
        if hasattr(user, 'role') and user.role:
            if user.role in ('admin', 'school_admin', 'super_admin', 'super_manager'):
                return 'admin'
            elif user.role in ('teacher', 'parent', 'student'):
                return user.role
        
        # Fallback to checking related models
        if hasattr(user, 'teacher_profile') and user.teacher_profile:
            return 'teacher'
        elif hasattr(user, 'student') and user.student:
            return 'student'
        elif hasattr(user, 'parent') and user.parent:
            return 'parent'
        
        return 'user'

    @staticmethod
    def _resolve_recipient(recipient_id, recipient_type):
        """
        Resolves a frontend recipient_id (which could be a User.id or a profile ID)
        to the canonical User.id, and validates/harmonizes the recipient_type role.
        """
        original_recipient_id = recipient_id
        original_recipient_type = recipient_type
        resolved_recipient_id = None

        try:
            numeric_id = int(recipient_id)
        except (ValueError, TypeError):
            raise ValueError(f"Invalid recipient ID format: {recipient_id}")

        if recipient_type == 'parent':
            from app.models.parent import Parent
            parent = Parent.query.get(numeric_id)
            if parent:
                resolved_recipient_id = parent.user_id
            else:
                user = User.query.get(numeric_id)
                if user and MessageService._get_user_type(user) == 'parent':
                    resolved_recipient_id = user.id
        elif recipient_type == 'student':
            from app.models.student import Student
            student = Student.query.get(numeric_id)
            if student:
                resolved_recipient_id = student.user_id
            else:
                user = User.query.get(numeric_id)
                if user and MessageService._get_user_type(user) == 'student':
                    resolved_recipient_id = user.id
        elif recipient_type == 'teacher':
            from app.models.teacher import Teacher
            teacher = Teacher.query.get(numeric_id)
            if teacher:
                resolved_recipient_id = teacher.user_id
            else:
                user = User.query.get(numeric_id)
                if user and MessageService._get_user_type(user) == 'teacher':
                    resolved_recipient_id = user.id
        elif recipient_type == 'admin':
            user = User.query.get(numeric_id)
            if user and MessageService._get_user_type(user) == 'admin':
                resolved_recipient_id = user.id
        else:
            user = User.query.get(numeric_id)
            if user:
                resolved_recipient_id = user.id

        if not resolved_recipient_id:
            raise ValueError(f"Could not resolve recipient ID {original_recipient_id} with type {original_recipient_type} to a valid user.")

        resolved_user = User.query.get(resolved_recipient_id)
        if not resolved_user:
            raise ValueError(f"Resolved recipient ID {resolved_recipient_id} does not exist in users table.")

        resolved_user_role = MessageService._get_user_type(resolved_user)

        logger.info(
            "Recipient resolved successfully: "
            "original_recipient_id=%s, "
            "original_recipient_type=%s, "
            "resolved_recipient_id=%s, "
            "resolved_user_role=%s",
            original_recipient_id,
            original_recipient_type,
            resolved_recipient_id,
            resolved_user_role
        )

        return resolved_recipient_id, resolved_user_role

    @staticmethod
    def get_user_display_name(user):
        if not user:
            return "Unknown"
        if hasattr(user, 'teacher_profile') and user.teacher_profile:
            return f"{user.teacher_profile.first_name} {user.teacher_profile.last_name}"
        if hasattr(user, 'student') and user.student:
            return f"{user.student.first_name} {user.student.last_name}"
        if hasattr(user, 'profile') and user.profile:
            if user.profile.display_name:
                return user.profile.display_name
            if user.profile.legal_name:
                return user.profile.legal_name
        return user.username

    @staticmethod
    def get_parent_display_name(parent):
        if not parent:
            return "Unknown Parent"
        if parent.user:
            return MessageService.get_user_display_name(parent.user)
        return f"Parent #{parent.id}"

    @staticmethod
    def get_allowed_recipient_queries(current_user_id, current_role, tenant_id, type_filter, search=None, class_id=None, audience=None):
        from app.models.user import User
        from app.models.class_ import Class, ClassTeacherMapping
        from app.models.teacher import Teacher
        from app.models.student import Student
        from app.models.parent import Parent
        from app.models.tenant import TenantMembership
        from app.models.user_profile import UserProfile
        from sqlalchemy import or_, and_

        if current_role == 'teacher':
            assigned_class_ids = set()
            teacher_profile = Teacher.query.filter_by(user_id=current_user_id).first()
            if teacher_profile:
                primary_classes = Class.query.filter_by(teacher_id=teacher_profile.id).all()
                for c in primary_classes:
                    assigned_class_ids.add(c.id)
            mappings = ClassTeacherMapping.query.filter_by(teacher_id=current_user_id).all()
            for m in mappings:
                assigned_class_ids.add(m.class_id)
                
            if type_filter == 'class':
                classes_query = Class.query.filter(Class.tenant_id == tenant_id, Class.id.in_(assigned_class_ids))
                if search:
                    classes_query = classes_query.filter(Class.name.ilike(f"%{search}%"))
                return classes_query.all()
                
            elif type_filter == 'student':
                student_query = Student.query.filter(Student.tenant_id == tenant_id, Student.class_id.in_(assigned_class_ids))
                if search:
                    student_query = student_query.filter(
                        or_(
                            Student.first_name.ilike(f"%{search}%"),
                            Student.last_name.ilike(f"%{search}%"),
                            Student.admission_number.ilike(f"%{search}%"),
                            Student.email.ilike(f"%{search}%")
                        )
                    )
                return student_query.all()
                
            elif type_filter == 'parent':
                parent_query = Parent.query.filter(Parent.tenant_id == tenant_id)
                if search:
                    search_pat = f"%{search}%"
                    parent_query = parent_query.join(User, User.id == Parent.user_id)\
                                               .outerjoin(UserProfile, UserProfile.user_id == User.id)\
                                               .join(Student, Student.parent_id == Parent.id)\
                                               .filter(
                                                   and_(
                                                       Student.class_id.in_(assigned_class_ids),
                                                       or_(
                                                           User.email.ilike(search_pat),
                                                           User.username.ilike(search_pat),
                                                           UserProfile.display_name.ilike(search_pat),
                                                           UserProfile.legal_name.ilike(search_pat),
                                                           Student.first_name.ilike(search_pat),
                                                           Student.last_name.ilike(search_pat)
                                                       )
                                                   )
                                               )
                else:
                    parent_query = parent_query.join(Student, Student.parent_id == Parent.id)\
                                               .filter(Student.class_id.in_(assigned_class_ids))
                return parent_query.distinct().all()
                
            elif type_filter == 'teacher':
                teacher_query = Teacher.query.filter(Teacher.tenant_id == tenant_id)
                if search:
                    teacher_query = teacher_query.filter(
                        or_(
                            Teacher.first_name.ilike(f"%{search}%"),
                            Teacher.last_name.ilike(f"%{search}%")
                        )
                    )
                return teacher_query.all()
                
            elif type_filter == 'admin':
                admin_query = User.query.join(TenantMembership, TenantMembership.user_id == User.id)\
                                        .filter(TenantMembership.tenant_id == tenant_id, TenantMembership.role.in_(['admin', 'school_admin', 'super_admin']))
                if search:
                    search_pat = f"%{search}%"
                    admin_query = admin_query.outerjoin(UserProfile, UserProfile.user_id == User.id)\
                                             .filter(
                                                 or_(
                                                     User.email.ilike(search_pat),
                                                     User.username.ilike(search_pat),
                                                     UserProfile.display_name.ilike(search_pat)
                                                 )
                                             )
                return admin_query.all()

        elif current_role == 'parent':
            parent_profile = Parent.query.filter_by(user_id=current_user_id).first()
            child_class_ids = set()
            if parent_profile:
                children = Student.query.filter_by(parent_id=parent_profile.id).all()
                child_class_ids = {s.class_id for s in children if s.class_id}
                
            if type_filter == 'teacher':
                class_teachers = Class.query.filter(Class.tenant_id == tenant_id, Class.id.in_(child_class_ids)).all()
                teacher_ids = {c.teacher_id for c in class_teachers if c.teacher_id}
                mappings = ClassTeacherMapping.query.filter(ClassTeacherMapping.class_id.in_(child_class_ids)).all()
                mapped_user_ids = {m.teacher_id for m in mappings}
                
                teacher_query = Teacher.query.filter(
                    Teacher.tenant_id == tenant_id,
                    or_(
                        Teacher.id.in_(teacher_ids),
                        Teacher.user_id.in_(mapped_user_ids)
                    )
                )
                if search:
                    teacher_query = teacher_query.filter(
                        or_(
                            Teacher.first_name.ilike(f"%{search}%"),
                            Teacher.last_name.ilike(f"%{search}%")
                        )
                    )
                return teacher_query.all()
                
            elif type_filter == 'admin':
                admin_query = User.query.join(TenantMembership, TenantMembership.user_id == User.id)\
                                        .filter(TenantMembership.tenant_id == tenant_id, TenantMembership.role.in_(['admin', 'school_admin', 'super_admin']))
                if search:
                    search_pat = f"%{search}%"
                    admin_query = admin_query.outerjoin(UserProfile, UserProfile.user_id == User.id)\
                                             .filter(
                                                 or_(
                                                     User.email.ilike(search_pat),
                                                     User.username.ilike(search_pat),
                                                     UserProfile.display_name.ilike(search_pat)
                                                 )
                                             )
                return admin_query.all()

        elif current_role == 'student':
            student_profile = Student.query.filter_by(user_id=current_user_id).first()
            class_id = student_profile.class_id if student_profile else None
            
            if type_filter == 'teacher' and class_id:
                class_obj = Class.query.get(class_id)
                teacher_ids = {class_obj.teacher_id} if class_obj and class_obj.teacher_id else set()
                mappings = ClassTeacherMapping.query.filter_by(class_id=class_id).all()
                mapped_user_ids = {m.teacher_id for m in mappings}
                
                teacher_query = Teacher.query.filter(
                    Teacher.tenant_id == tenant_id,
                    or_(
                        Teacher.id.in_(teacher_ids),
                        Teacher.user_id.in_(mapped_user_ids)
                    )
                )
                if search:
                    teacher_query = teacher_query.filter(
                        or_(
                            Teacher.first_name.ilike(f"%{search}%"),
                            Teacher.last_name.ilike(f"%{search}%")
                        )
                    )
                return teacher_query.all()
                
            elif type_filter == 'admin':
                admin_query = User.query.join(TenantMembership, TenantMembership.user_id == User.id)\
                                        .filter(TenantMembership.tenant_id == tenant_id, TenantMembership.role.in_(['admin', 'school_admin', 'super_admin']))
                if search:
                    search_pat = f"%{search}%"
                    admin_query = admin_query.outerjoin(UserProfile, UserProfile.user_id == User.id)\
                                             .filter(
                                                 or_(
                                                     User.email.ilike(search_pat),
                                                     User.username.ilike(search_pat),
                                                     UserProfile.display_name.ilike(search_pat)
                                                 )
                                             )
                return admin_query.all()

        elif current_role in ('admin', 'school_admin', 'super_admin'):
            if type_filter == 'class':
                classes_query = Class.query.filter(Class.tenant_id == tenant_id)
                if search:
                    classes_query = classes_query.filter(Class.name.ilike(f"%{search}%"))
                return classes_query.all()
                
            elif type_filter == 'student':
                student_query = Student.query.filter(Student.tenant_id == tenant_id)
                if search:
                    student_query = student_query.filter(
                        or_(
                            Student.first_name.ilike(f"%{search}%"),
                            Student.last_name.ilike(f"%{search}%"),
                            Student.admission_number.ilike(f"%{search}%"),
                            Student.email.ilike(f"%{search}%")
                        )
                    )
                return student_query.all()
                
            elif type_filter == 'parent':
                parent_query = Parent.query.filter(Parent.tenant_id == tenant_id)
                if search:
                    search_pat = f"%{search}%"
                    parent_query = parent_query.join(User, User.id == Parent.user_id)\
                                               .outerjoin(UserProfile, UserProfile.user_id == User.id)\
                                               .outerjoin(Student, Student.parent_id == Parent.id)\
                                               .filter(
                                                   or_(
                                                       User.email.ilike(search_pat),
                                                       User.username.ilike(search_pat),
                                                       UserProfile.display_name.ilike(search_pat),
                                                       UserProfile.legal_name.ilike(search_pat),
                                                       Student.first_name.ilike(search_pat),
                                                       Student.last_name.ilike(search_pat)
                                                   )
                                               )
                return parent_query.distinct().all()
                
            elif type_filter == 'teacher':
                teacher_query = Teacher.query.filter(Teacher.tenant_id == tenant_id)
                if search:
                    teacher_query = teacher_query.filter(
                        or_(
                            Teacher.first_name.ilike(f"%{search}%"),
                            Teacher.last_name.ilike(f"%{search}%")
                        )
                    )
                return teacher_query.all()
                
            elif type_filter == 'admin':
                admin_query = User.query.join(TenantMembership, TenantMembership.user_id == User.id)\
                                        .filter(TenantMembership.tenant_id == tenant_id, TenantMembership.role.in_(['admin', 'school_admin', 'super_admin']))
                if search:
                    search_pat = f"%{search}%"
                    admin_query = admin_query.outerjoin(UserProfile, UserProfile.user_id == User.id)\
                                             .filter(
                                                 or_(
                                                     User.email.ilike(search_pat),
                                                     User.username.ilike(search_pat),
                                                     UserProfile.display_name.ilike(search_pat)
                                                 )
                                             )
                return admin_query.all()

        return []