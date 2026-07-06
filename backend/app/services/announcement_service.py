import structlog
import uuid
from app.extensions import db, socketio
from app.models.announcement import Announcement
from app.models.class_ import Class
from app.models.tenant import TenantMembership
from datetime import datetime
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy import and_, false, or_

logger = structlog.get_logger()

SUPPORTED_TARGET_ROLES = ('all', 'students', 'parents', 'teachers', 'admins')
ROLE_ALIASES = {
    'student': 'students',
    'parent': 'parents',
    'teacher': 'teachers',
    'admin': 'admins',
    'school_admin': 'admins',
    'super_admin': 'admins',
    'super_manager': 'admins',
}

class AnnouncementService:
    """Service for announcement-related operations."""

    @staticmethod
    def normalize_scope(scope):
        value = str(scope or 'global').strip().lower()
        return value if value in ('global', 'class_bound') else 'global'

    @staticmethod
    def normalize_target_roles(target_roles):
        if isinstance(target_roles, str):
            raw_roles = [item.strip().lower() for item in target_roles.split(',') if item.strip()]
        elif isinstance(target_roles, (list, tuple, set)):
            raw_roles = [str(item).strip().lower() for item in target_roles if str(item).strip()]
        else:
            raw_roles = []

        normalized = []
        for role in raw_roles:
            if role in SUPPORTED_TARGET_ROLES and role not in normalized:
                normalized.append(role)

        if not normalized:
            return ['all']
        if 'all' in normalized:
            return ['all']
        return normalized

    @staticmethod
    def serialize_target_roles(target_roles):
        normalized = AnnouncementService.normalize_target_roles(target_roles)
        return ','.join(normalized)

    @staticmethod
    def derive_recipients(target_roles):
        normalized = AnnouncementService.normalize_target_roles(target_roles)
        if normalized == ['all']:
            return 'all'
        if len(normalized) == 1:
            return normalized[0]
        return 'selected'

    @staticmethod
    def normalize_tenant_id(tenant_id):
        if tenant_id in (None, ''):
            return None
        if isinstance(tenant_id, uuid.UUID):
            return tenant_id
        try:
            return uuid.UUID(str(tenant_id))
        except Exception:
            return None

    @staticmethod
    def build_tenant_filter(tenant_id):
        normalized_tenant_id = AnnouncementService.normalize_tenant_id(tenant_id)
        if not normalized_tenant_id:
            return None

        return or_(
            Announcement.tenant_id == normalized_tenant_id,
            and_(Announcement.tenant_id.is_(None), Class.tenant_id == normalized_tenant_id)
        )

    @staticmethod
    def prepare_announcement_payload(announcement_data):
        payload = dict(announcement_data or {})
        scope = AnnouncementService.normalize_scope(payload.get('scope'))
        payload['scope'] = scope
        payload['target_roles'] = AnnouncementService.serialize_target_roles(payload.get('target_roles'))
        payload['recipients'] = AnnouncementService.derive_recipients(payload.get('target_roles'))

        if scope == 'class_bound':
            class_obj = Class.query.get(payload.get('class_id'))
            if not class_obj:
                return None, "Class not found"

            expected_tenant_id = AnnouncementService.normalize_tenant_id(getattr(class_obj, 'tenant_id', None))
            provided_tenant_id = AnnouncementService.normalize_tenant_id(payload.get('tenant_id'))
            if provided_tenant_id and expected_tenant_id and provided_tenant_id != expected_tenant_id:
                return None, "Class does not belong to the active tenant context"

            payload['class_id'] = class_obj.id
            payload['tenant_id'] = expected_tenant_id
            return payload, None

        tenant_id = AnnouncementService.normalize_tenant_id(payload.get('tenant_id'))
        if not tenant_id:
            return None, "Tenant context is required for global announcements"

        payload['tenant_id'] = tenant_id
        payload['class_id'] = None
        return payload, None

    @staticmethod
    def announcement_targets_role(announcement, role_key):
        normalized = AnnouncementService.normalize_target_roles(getattr(announcement, 'target_roles', None))
        if 'all' in normalized:
            return True
        if role_key in normalized:
            return True

        recipients = (getattr(announcement, 'recipients', None) or 'all').strip().lower()
        if recipients == 'all':
            return True
        return recipients == role_key
    
    @staticmethod
    def get_announcements_by_class(class_id, page=1, per_page=20):
        """Get announcements for a specific class with pagination."""
        # Check if class exists
        class_obj = Class.query.get(class_id)
        if not class_obj:
            return None
            
        return Announcement.query.filter_by(class_id=class_id).order_by(Announcement.created_at.desc()).paginate(page=page, per_page=per_page)
    
    @staticmethod
    def get_announcement_by_id(announcement_id):
        """Get an announcement by ID."""
        return Announcement.query.get(announcement_id)
    
    @staticmethod
    def create_announcement(announcement_data, broadcast=True):
        """Create a new announcement.
        
        Args:
            announcement_data (dict): The announcement data
            broadcast (bool): Whether to broadcast the announcement via WebSocket
            
        Returns:
            tuple: (Announcement object or None, error message or None)
        """
        try:
            prepared_payload, error = AnnouncementService.prepare_announcement_payload(announcement_data)
            if error:
                return None, error

            new_announcement = Announcement(**prepared_payload)
            db.session.add(new_announcement)
            db.session.flush()
            
            if new_announcement.class_id:
                # Execute durable fanout in the same transaction for class-bound announcements.
                from app.services.fanout import execute_durable_audience_fanout
                execute_durable_audience_fanout(
                    class_id=new_announcement.class_id,
                    title=new_announcement.title,
                    message=new_announcement.content
                )
            
            db.session.commit()
            logger.info("Announcement created", announcement_id=new_announcement.id, class_id=new_announcement.class_id)
            
            # Broadcast the announcement if requested
            if broadcast:
                try:
                    AnnouncementService.broadcast_announcement(new_announcement)
                except Exception as be:
                    logger.error("Error broadcasting announcement", error=str(be), announcement_id=new_announcement.id)
            
            return new_announcement, None
        except Exception as e:
            db.session.rollback()
            logger.error("Error creating announcement", error=str(e))
            return None, str(e)
    
    @staticmethod
    def update_announcement(announcement_id, announcement_data, class_id, teacher_id, broadcast=True):
        """Update an existing announcement."""
        try:
            announcement = Announcement.query.get(announcement_id)
            if not announcement:
                return None, "Announcement not found"
            
            # Verify the announcement belongs to the specified class
            if announcement.class_id != class_id:
                return None, "Announcement does not belong to the specified class"
            
            # Verify the teacher has permission to update this announcement
            if announcement.teacher_id != teacher_id:
                return None, "You don't have permission to update this announcement"

            if 'target_roles' in announcement_data:
                announcement_data['target_roles'] = AnnouncementService.serialize_target_roles(
                    announcement_data.get('target_roles')
                )
                announcement_data['recipients'] = AnnouncementService.derive_recipients(
                    announcement_data.get('target_roles')
                )
            
            for key, value in announcement_data.items():
                setattr(announcement, key, value)
            
            announcement.updated_at = datetime.utcnow()
            db.session.commit()
            
            logger.info("Announcement updated", announcement_id=announcement.id)
            
            # Broadcast the updated announcement if requested
            if broadcast:
                AnnouncementService.broadcast_announcement(announcement, is_update=True)
            
            return announcement, None
        except SQLAlchemyError as e:
            db.session.rollback()
            logger.error("Error updating announcement", error=str(e), announcement_id=announcement_id)
            return None, str(e)

    @staticmethod
    def update_announcement_admin(announcement_id, announcement_data, broadcast=True):
        try:
            announcement = Announcement.query.get(announcement_id)
            if not announcement:
                return None, "Announcement not found"

            merged_payload = {
                'title': announcement.title,
                'content': announcement.content,
                'scope': announcement.scope or ('class_bound' if announcement.class_id else 'global'),
                'tenant_id': announcement.tenant_id,
                'class_id': announcement.class_id,
                'teacher_id': announcement.teacher_id,
                'send_email': announcement.send_email,
                'scheduled_date': announcement.scheduled_date,
                'target_roles': announcement_data.get('target_roles', announcement.target_roles),
                'is_published': announcement_data.get('is_published', announcement.is_published),
            }
            merged_payload.update(announcement_data)

            prepared_payload, error = AnnouncementService.prepare_announcement_payload(merged_payload)
            if error:
                return None, error

            announcement_data = {
                **announcement_data,
                'scope': prepared_payload['scope'],
                'tenant_id': prepared_payload['tenant_id'],
                'class_id': prepared_payload.get('class_id'),
                'target_roles': prepared_payload['target_roles'],
                'recipients': prepared_payload['recipients'],
            }

            for key, value in announcement_data.items():
                setattr(announcement, key, value)

            announcement.updated_at = datetime.utcnow()
            db.session.commit()

            if broadcast:
                AnnouncementService.broadcast_announcement(announcement, is_update=True)

            return announcement, None
        except SQLAlchemyError as e:
            db.session.rollback()
            logger.error("Error updating announcement (admin)", error=str(e), announcement_id=announcement_id)
            return None, str(e)

    @staticmethod
    def delete_announcement_admin(announcement_id):
        try:
            announcement = Announcement.query.get(announcement_id)
            if not announcement:
                return False, "Announcement not found"

            announcement_id_for_broadcast = announcement.id
            class_id_for_broadcast = announcement.class_id
            db.session.delete(announcement)
            db.session.commit()

            AnnouncementService.broadcast_announcement_deletion(announcement_id_for_broadcast, class_id_for_broadcast)
            return True, None
        except SQLAlchemyError as e:
            db.session.rollback()
            logger.error("Error deleting announcement (admin)", error=str(e), announcement_id=announcement_id)
            return False, str(e)
    
    @staticmethod
    def delete_announcement(announcement_id, class_id, teacher_id):
        """Delete an announcement."""
        try:
            announcement = Announcement.query.get(announcement_id)
            if not announcement:
                return False, "Announcement not found"
            
            # Verify the announcement belongs to the specified class
            if announcement.class_id != class_id:
                return False, "Announcement does not belong to the specified class"
            
            # Verify the teacher has permission to delete this announcement
            if announcement.teacher_id != teacher_id:
                return False, "You don't have permission to delete this announcement"
            
            # Store announcement ID and class ID before deletion for broadcasting
            announcement_id_for_broadcast = announcement.id
            class_id_for_broadcast = announcement.class_id
            
            db.session.delete(announcement)
            db.session.commit()
            
            logger.info("Announcement deleted", announcement_id=announcement_id)
            
            # Broadcast the deletion
            AnnouncementService.broadcast_announcement_deletion(announcement_id_for_broadcast, class_id_for_broadcast)
            
            return True, None
        except SQLAlchemyError as e:
            db.session.rollback()
            logger.error("Error deleting announcement", error=str(e), announcement_id=announcement_id)
            return False, str(e)
    
    @staticmethod
    def get_announcements_for_user(user_id, page=1, per_page=10, tenant_id=None):
        """Get announcements relevant to a specific user.
        
        This method fetches announcements based on user's role and classes.
        """
        try:
            from app.models.user import User
            from app.models.student import Student
            from app.models.teacher import Teacher
            from app.models.parent import Parent
            
            user = User.query.get(user_id)
            if not user:
                return [], 0
                
            requested_tenant_id = AnnouncementService.normalize_tenant_id(tenant_id)
            query = Announcement.query.outerjoin(Class, Announcement.class_id == Class.id)

            now = datetime.utcnow()
            
            # Filter based on user role
            if user.role == 'student':
                student = Student.query.filter_by(user_id=user_id).first()
                if student:
                    effective_tenant_id = requested_tenant_id or AnnouncementService.normalize_tenant_id(student.tenant_id)
                    tenant_filter = AnnouncementService.build_tenant_filter(effective_tenant_id)
                    if tenant_filter is not None:
                        query = query.filter(tenant_filter)

                    query = query.filter(
                        or_(
                            Announcement.scope == 'global',
                            Announcement.class_id == student.class_id,
                        )
                    )
            elif user.role == 'parent':
                parent = Parent.query.filter_by(user_id=user_id).first()
                if parent:
                    student_ids = [student.id for student in parent.children]
                    students = Student.query.filter(Student.id.in_(student_ids)).all() if student_ids else []
                    class_ids = [student.class_id for student in students if student.class_id]
                    effective_tenant_id = requested_tenant_id or (
                        AnnouncementService.normalize_tenant_id(students[0].tenant_id) if students else None
                    )
                    tenant_filter = AnnouncementService.build_tenant_filter(effective_tenant_id)
                    if tenant_filter is not None:
                        query = query.filter(tenant_filter)
                    query = query.filter(
                        or_(
                            Announcement.scope == 'global',
                            Announcement.class_id.in_(class_ids) if class_ids else false(),
                        )
                    )
            elif user.role == 'teacher':
                teacher = Teacher.query.filter_by(user_id=user_id).first()
                from app.services.identity_resolver import IdentityResolver
                class_ids = IdentityResolver.resolve_teacher_class_ids(user_id)
                effective_tenant_id = requested_tenant_id or AnnouncementService.normalize_tenant_id(getattr(teacher, 'tenant_id', None))
                tenant_filter = AnnouncementService.build_tenant_filter(effective_tenant_id)
                if tenant_filter is not None:
                    query = query.filter(tenant_filter)
                query = query.filter(
                    or_(
                        Announcement.scope == 'global',
                        Announcement.class_id.in_(class_ids) if class_ids else false(),
                    )
                )
            elif user.role in ('admin', 'school_admin', 'super_admin', 'super_manager'):
                effective_tenant_ids = []
                if requested_tenant_id:
                    effective_tenant_ids = [requested_tenant_id]
                else:
                    memberships = TenantMembership.query.filter_by(user_id=user.id, status='active').all()
                    effective_tenant_ids = [AnnouncementService.normalize_tenant_id(membership.tenant_id) for membership in memberships]

                effective_tenant_ids = [tenant for tenant in effective_tenant_ids if tenant]
                if effective_tenant_ids:
                    tenant_filters = [AnnouncementService.build_tenant_filter(tenant) for tenant in effective_tenant_ids]
                    tenant_filters = [tenant_filter for tenant_filter in tenant_filters if tenant_filter is not None]
                    if tenant_filters:
                        query = query.filter(or_(*tenant_filters))
            else:
                return [], 0
                
            if user.role in ('student', 'parent'):
                query = query.filter(
                    (Announcement.is_published == True) &
                    ((Announcement.scheduled_date == None) | (Announcement.scheduled_date <= now))
                )
            elif user.role == 'teacher':
                query = query.filter(
                    (Announcement.scheduled_date == None) | (Announcement.scheduled_date <= now) | (Announcement.is_published == True)
                )

            # Order by creation date (newest first)
            query = query.order_by(Announcement.created_at.desc())

            all_items = query.all()
            if user.role in ('student', 'parent'):
                role_key = ROLE_ALIASES.get(user.role, user.role)
                all_items = [
                    announcement
                    for announcement in all_items
                    if AnnouncementService.announcement_targets_role(announcement, role_key)
                ]

            total = len(all_items)
            start = max(page - 1, 0) * per_page
            end = start + per_page
            page_items = all_items[start:end]

            # Format announcements for API response
            from app.schemas.announcement import AnnouncementListSchema
            announcement_schema = AnnouncementListSchema(many=True)
            announcements = announcement_schema.dump(page_items)

            return announcements, total
            
        except Exception as e:
            logger.error("Error fetching announcements for user", error=str(e), user_id=user_id)
            return [], 0
    
    @staticmethod
    def broadcast_announcement(announcement, is_update=False):
        """Broadcast an announcement via WebSocket.
        
        Args:
            announcement (Announcement): The announcement to broadcast
            is_update (bool): Whether this is an update to an existing announcement
        """
        try:
            # Import here to avoid circular imports
            from app.websockets.announcements import broadcast_announcement
            
            # Format the announcement data for broadcasting
            announcement_data = {
                'id': announcement.id,
                'title': announcement.title,
                'content': announcement.content,
                'class_id': announcement.class_id,
                'teacher_id': announcement.teacher_id,
                'recipients': announcement.recipients,
                'send_email': bool(getattr(announcement, 'send_email', False)),
                'scheduled_date': announcement.scheduled_date.isoformat() if getattr(announcement, 'scheduled_date', None) else None,
                'is_published': bool(getattr(announcement, 'is_published', True)),
                'target_roles': getattr(announcement, 'target_roles', None),
                'created_at': announcement.created_at.isoformat(),
                'updated_at': announcement.updated_at.isoformat(),
                'is_update': is_update
            }
            
            # Preserve the existing class room broadcast and add role rooms from normalized audience data.
            target_rooms = [f"class_{announcement.class_id}"]
            normalized_roles = AnnouncementService.normalize_target_roles(getattr(announcement, 'target_roles', None))

            if normalized_roles == ['all']:
                target_rooms.extend(["role_students", "role_parents", "role_teachers", "role_admins"])
            else:
                target_rooms.extend([f"role_{role}" for role in normalized_roles if role != 'all'])

            target_rooms = list(dict.fromkeys(target_rooms))
            
            # Broadcast to all target rooms
            broadcast_announcement(announcement_data, target_rooms)
            
            logger.info("Announcement broadcasted", 
                       announcement_id=announcement.id, 
                       class_id=announcement.class_id,
                       is_update=is_update)
            
            return True
        except Exception as e:
            logger.error("Error broadcasting announcement", error=str(e), announcement_id=announcement.id)
            return False
    
    @staticmethod
    def broadcast_announcement_deletion(announcement_id, class_id):
        """Broadcast an announcement deletion via WebSocket.
        
        Args:
            announcement_id (int): The ID of the deleted announcement
            class_id (int): The class ID the announcement belonged to
        """
        try:
            # Import here to avoid circular imports
            from app.websockets.announcements import broadcast_announcement
            
            # Format the deletion data for broadcasting
            deletion_data = {
                'id': announcement_id,
                'class_id': class_id,
                'is_deleted': True
            }
            
            # Broadcast to the class room
            target_rooms = [f"class_{class_id}", "role_students", "role_parents", "role_teachers", "role_admins"]
            broadcast_announcement(deletion_data, target_rooms)
            
            logger.info("Announcement deletion broadcasted", 
                       announcement_id=announcement_id, 
                       class_id=class_id)
            
            return True
        except Exception as e:
            logger.error("Error broadcasting announcement deletion", 
                        error=str(e), 
                        announcement_id=announcement_id)
            return False
