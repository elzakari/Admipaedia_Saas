import structlog
from app.extensions import db

logger = structlog.get_logger()

class IdentityResolver:
    """
    Centralized service to resolve identities, validate relationships,
    and enforce security boundaries between users, profiles, and classes.
    """

    @staticmethod
    def resolve_user_id(ref, expected_role=None):
        """
        Resolves a reference string (e.g. 'parent:7', 'student:5', 'teacher:2', 'user:10')
        or a numeric ID/string to a canonical users.id.
        
        Args:
            ref: The reference string or numeric ID.
            expected_role (str, optional): Enforce that the resolved user has this role.
            
        Returns:
            int: The canonical users.id, or None if not resolvable.
        """
        if ref is None:
            return None

        from app.models.user import User

        # Handle numeric input directly (resolving as user ID)
        if isinstance(ref, int) or (isinstance(ref, str) and ref.isdigit()):
            user_id = int(ref)
            user = User.query.get(user_id)
            if user:
                if expected_role:
                    role = IdentityResolver.get_user_role(user)
                    if role != expected_role:
                        logger.warning("Role mismatch during direct ID resolution", user_id=user_id, expected=expected_role, actual=role)
                        return None
                return user_id
            return None

        # Parse reference format 'type:id' or 'type:id:extra'
        if not isinstance(ref, str) or ':' not in ref:
            logger.warning("Invalid reference format", ref=ref)
            return None

        parts = ref.split(':')
        ref_type = parts[0].lower()
        
        try:
            numeric_id = int(parts[1])
        except (ValueError, IndexErr):
            logger.warning("Invalid ID in reference", ref=ref)
            return None

        resolved_id = None
        if ref_type == 'parent':
            resolved_id = IdentityResolver.resolve_parent_user_id(numeric_id)
        elif ref_type == 'student':
            resolved_id = IdentityResolver.resolve_student_user_id(numeric_id)
        elif ref_type == 'teacher':
            resolved_id = IdentityResolver.resolve_teacher_user_id(numeric_id)
        elif ref_type == 'user':
            user = User.query.get(numeric_id)
            if user:
                resolved_id = user.id

        if resolved_id is not None:
            if expected_role:
                user = User.query.get(resolved_id)
                role = IdentityResolver.get_user_role(user)
                if role != expected_role:
                    logger.warning("Role mismatch after resolving reference", ref=ref, expected=expected_role, actual=role)
                    return None
            return resolved_id

        return None

    @staticmethod
    def resolve_parent_user_id(parent_profile_id):
        """Resolves a parent profile ID to its associated users.id"""
        from app.models.parent import Parent
        parent = Parent.query.get(parent_profile_id)
        return parent.user_id if parent else None

    @staticmethod
    def resolve_student_user_id(student_profile_id):
        """Resolves a student profile ID to its associated users.id"""
        from app.models.student import Student
        student = Student.query.get(student_profile_id)
        return student.user_id if student else None

    @staticmethod
    def resolve_teacher_user_id(teacher_profile_id):
        """Resolves a teacher profile ID to its associated users.id"""
        from app.models.teacher import Teacher
        teacher = Teacher.query.get(teacher_profile_id)
        return teacher.user_id if teacher else None

    @staticmethod
    def resolve_class_student_user_ids(class_id):
        """Returns users.id list of active students enrolled in a class"""
        from app.models.student import Student
        students = Student.query.filter_by(class_id=class_id, status='active').all()
        return [s.user_id for s in students if s.user_id is not None]

    @staticmethod
    def resolve_class_parent_user_ids(class_id):
        """Returns users.id list of parents of active students in a class"""
        from app.models.student import Student
        from app.models.parent import Parent
        parents = Parent.query.join(Student, Student.parent_id == Parent.id).filter(
            Student.class_id == class_id,
            Student.status == 'active',
            Parent.user_id.isnot(None)
        ).all()
        return list({p.user_id for p in parents})

    @staticmethod
    def resolve_teacher_class_ids(user_id):
        """Returns list of class IDs assigned to a teacher (via primary class or mappings)"""
        from app.models.class_ import Class, ClassTeacherMapping
        from app.models.teacher import Teacher
        
        class_ids = set()
        teacher_profile = Teacher.query.filter_by(user_id=user_id).first()
        if teacher_profile:
            primary_classes = Class.query.filter_by(teacher_id=teacher_profile.id).all()
            for c in primary_classes:
                class_ids.add(c.id)
                
        mappings = ClassTeacherMapping.query.filter_by(teacher_id=user_id).all()
        for m in mappings:
            class_ids.add(m.class_id)
            
        return list(class_ids)

    @staticmethod
    def get_user_role(user):
        """Determines the user role safely, matching MessageService._get_user_type"""
        if not user:
            return 'unknown'
            
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
                
        if hasattr(user, 'role') and user.role:
            if user.role in ('admin', 'school_admin', 'super_admin', 'super_manager'):
                return 'admin'
            elif user.role in ('teacher', 'parent', 'student'):
                return user.role
                
        if hasattr(user, 'teacher_profile') and user.teacher_profile:
            return 'teacher'
        elif hasattr(user, 'student') and user.student:
            return 'student'
        elif hasattr(user, 'parent') and user.parent:
            return 'parent'
            
        return 'user'

    @staticmethod
    def can_user_access_class(user_id, class_id):
        """Enforces relationship-aware class boundary access checks"""
        from app.models.user import User
        user = User.query.get(user_id)
        if not user:
            return False
            
        role = IdentityResolver.get_user_role(user)
        if role in ('admin', 'super_admin', 'school_admin'):
            return True
            
        if role == 'teacher':
            assigned_classes = IdentityResolver.resolve_teacher_class_ids(user_id)
            return class_id in assigned_classes
            
        if role == 'student':
            from app.models.student import Student
            student = Student.query.filter_by(user_id=user_id).first()
            return student is not None and student.class_id == class_id
            
        if role == 'parent':
            from app.models.student import Student
            from app.models.parent import Parent
            parent = Parent.query.filter_by(user_id=user_id).first()
            if not parent:
                return False
            child_class_ids = {s.class_id for s in parent.children if s.class_id}
            return class_id in child_class_ids
            
        return False

    @staticmethod
    def can_user_message_recipient(sender_user_id, recipient_ref):
        """
        Validates if sender_user_id is allowed to message the recipient(s) in recipient_ref.
        Handles class groups and direct profiles by resolving to canonical user IDs.
        """
        if sender_user_id is None or recipient_ref is None:
            return False

        from app.models.user import User
        sender = User.query.get(sender_user_id)
        if not sender:
            return False
            
        sender_role = IdentityResolver.get_user_role(sender)

        # 1. Resolve the reference to users.id list
        from app.services.message_service import MessageService
        try:
            resolved_recipients, ref_role = MessageService.resolve_recipient_ref(recipient_ref)
        except Exception as e:
            logger.warning("Error resolving reference in can_user_message_recipient", error=str(e), ref=recipient_ref)
            return False

        if not resolved_recipients:
            return False

        # 2. Check each resolved recipient
        for recipient_user_id, recipient_role in resolved_recipients:
            if sender_user_id == recipient_user_id:
                continue # Always allowed to message self
                
            recipient = User.query.get(recipient_user_id)
            if not recipient:
                return False

            # Check Flask context for tenant scope
            from flask import g, has_app_context
            tenant_context_active = has_app_context() and getattr(g, 'tenant_id', None) is not None
            
            # Legacy/test bypass rules
            if not tenant_context_active or sender_role == 'user' or recipient_role == 'user':
                continue

            # Tenant boundary checks
            from app.models.tenant import TenantMembership
            sender_memberships = TenantMembership.query.filter_by(user_id=sender_user_id, status='active').all()
            recipient_memberships = TenantMembership.query.filter_by(user_id=recipient_user_id, status='active').all()
            
            sender_tenants = {m.tenant_id for m in sender_memberships}
            recipient_tenants = {m.tenant_id for m in recipient_memberships}
            
            common_tenants = sender_tenants.intersection(recipient_tenants)
            if not common_tenants and sender_role not in ('super_admin', 'super_manager'):
                return False

            # Admin can message anyone in tenant; anyone can message admins
            if sender_role in ('admin', 'school_admin', 'super_admin', 'super_manager'):
                continue
            if recipient_role in ('admin', 'school_admin', 'super_admin', 'super_manager'):
                continue

            # Teacher permissions
            if sender_role == 'teacher':
                if recipient_role == 'teacher':
                    continue
                assigned_classes = IdentityResolver.resolve_teacher_class_ids(sender_user_id)
                
                if recipient_role == 'student':
                    from app.models.student import Student
                    student_profile = Student.query.filter_by(user_id=recipient_user_id).first()
                    if not student_profile or student_profile.class_id not in assigned_classes:
                        return False
                elif recipient_role == 'parent':
                    from app.models.student import Student
                    from app.models.parent import Parent
                    parent_profile = Parent.query.filter_by(user_id=recipient_user_id).first()
                    if not parent_profile:
                        return False
                    children = Student.query.filter_by(parent_id=parent_profile.id).all()
                    child_in_assigned = any(c.class_id in assigned_classes for c in children if c.class_id)
                    if not child_in_assigned:
                        return False
                else:
                    return False

            # Parent permissions
            elif sender_role == 'parent':
                if recipient_role != 'teacher':
                    if recipient_role == 'student':
                        from app.models.student import Student
                        from app.models.parent import Parent
                        parent_profile = Parent.query.filter_by(user_id=sender_user_id).first()
                        student_profile = Student.query.filter_by(user_id=recipient_user_id).first()
                        if student_profile and parent_profile and student_profile.parent_id == parent_profile.id:
                            continue
                    return False
                from app.models.student import Student
                from app.models.parent import Parent
                parent_profile = Parent.query.filter_by(user_id=sender_user_id).first()
                if not parent_profile:
                    return False
                children = Student.query.filter_by(parent_id=parent_profile.id).all()
                child_class_ids = {s.class_id for s in children if s.class_id}
                
                assigned_classes = IdentityResolver.resolve_teacher_class_ids(recipient_user_id)
                if not any(cid in child_class_ids for cid in assigned_classes):
                    return False
 
            # Student permissions
            elif sender_role == 'student':
                if recipient_role != 'teacher':
                    if recipient_role == 'parent':
                        from app.models.student import Student
                        from app.models.parent import Parent
                        student_profile = Student.query.filter_by(user_id=sender_user_id).first()
                        parent_profile = Parent.query.filter_by(user_id=recipient_user_id).first()
                        if student_profile and parent_profile and student_profile.parent_id == parent_profile.id:
                            continue
                    return False
                from app.models.student import Student
                student_profile = Student.query.filter_by(user_id=sender_user_id).first()
                if not student_profile or not student_profile.class_id:
                    return False
                assigned_classes = IdentityResolver.resolve_teacher_class_ids(recipient_user_id)
                if student_profile.class_id not in assigned_classes:
                    return False
            else:
                return False

        return True
