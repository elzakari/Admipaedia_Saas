import structlog
from app.extensions import db
from app.models.user import User
from app.services.rbac_service import RBACService
from app.models.rbac import RBACRole, RBACPermission, ResourceType, PermissionType

logger = structlog.get_logger()

class TeacherProvisioningService:
    """Service for provisioning teacher role, permissions, and settings idempotently."""
    
    @staticmethod
    def ensure_teacher_baseline_access(user_id: int) -> bool:
        """
        Idempotent authorization engine to look up or create the 'teacher' role,
        ensure the baseline permissions ('student.read', 'teacher.read', 'teacher_analytics.read')
        exist, map them to the 'teacher' role, and assign the 'teacher' role to the user.
        """
        try:
            user = User.query.get(user_id)
            if not user:
                logger.error("User not found for teacher baseline provisioning", user_id=user_id)
                return False

            # Ensure the user.role is set to 'teacher'
            if user.role != 'teacher':
                user.role = 'teacher'
                db.session.add(user)

            # 1. Look up or create 'teacher' role
            teacher_role = RBACRole.query.filter_by(name='teacher').first()
            if not teacher_role:
                teacher_role = RBACRole(
                    name='teacher',
                    display_name='Teacher',
                    description='Access to teaching and student management functions',
                    level=2,
                    color='#059669',
                    icon='academic-cap',
                    is_system=True,
                    is_active=True
                )
                db.session.add(teacher_role)
                db.session.flush()

            # 2. Verify primitives exist in rbac_permissions
            baseline_perms = [
                {
                    'name': 'student.read',
                    'display_name': 'View Students',
                    'resource_type': ResourceType.STUDENT if hasattr(ResourceType, 'STUDENT') else 'student',
                    'permission_type': PermissionType.READ if hasattr(PermissionType, 'READ') else 'read',
                    'category': 'academic'
                },
                {
                    'name': 'teacher.read',
                    'display_name': 'View Teachers',
                    'resource_type': ResourceType.TEACHER if hasattr(ResourceType, 'TEACHER') else 'teacher',
                    'permission_type': PermissionType.READ if hasattr(PermissionType, 'READ') else 'read',
                    'category': 'academic'
                },
                {
                    'name': 'teacher_analytics.read',
                    'display_name': 'View Teacher Analytics',
                    'resource_type': ResourceType.TEACHER if hasattr(ResourceType, 'TEACHER') else 'teacher',
                    'permission_type': PermissionType.READ if hasattr(PermissionType, 'READ') else 'read',
                    'category': 'academic'
                }
            ]

            for perm_data in baseline_perms:
                permission = RBACPermission.query.filter_by(name=perm_data['name']).first()
                if not permission:
                    permission = RBACPermission(
                        name=perm_data['name'],
                        display_name=perm_data['display_name'],
                        resource_type=perm_data['resource_type'],
                        permission_type=perm_data['permission_type'],
                        category=perm_data['category'],
                        is_system=True
                    )
                    db.session.add(permission)
                    db.session.flush()

                # Map permission to teacher role if missing
                if permission not in teacher_role.permissions:
                    teacher_role.permissions.append(permission)
                    db.session.add(teacher_role)

            # 3. Map the role assignment safely onto the target user_id
            has_role = False
            for r in user.roles:
                if r.name == 'teacher':
                    has_role = True
                    break
            
            if not has_role:
                RBACService.assign_role_to_user(user.id, 'teacher')
                logger.info("Assigned RBAC role 'teacher' to user", user_id=user.id)

            # 4. Initialize UserSecuritySettings if missing
            from app.models.enhanced_auth import UserSecuritySettings
            from app.config.enhanced_auth_config import EnhancedAuthConfig
            settings = UserSecuritySettings.query.filter_by(user_id=user.id).first()
            if not settings:
                default_settings = UserSecuritySettings(
                    user_id=user.id,
                    mfa_enabled=False,
                    login_notifications=True,
                    suspicious_activity_alerts=True,
                    session_timeout_minutes=int((EnhancedAuthConfig.SESSION_TIMEOUT.total_seconds() if hasattr(EnhancedAuthConfig, 'SESSION_TIMEOUT') else 3600) / 60),
                    max_concurrent_sessions=EnhancedAuthConfig.MAX_CONCURRENT_SESSIONS if hasattr(EnhancedAuthConfig, 'MAX_CONCURRENT_SESSIONS') else 5
                )
                db.session.add(default_settings)

            db.session.commit()
            logger.info("Teacher baseline access ensured successfully", user_id=user.id)
            return True
        except Exception as e:
            db.session.rollback()
            logger.error("Failed to ensure teacher baseline access", error=str(e), user_id=user_id)
            return False

    @staticmethod
    def provision_teacher(user_id: int) -> bool:
        """Idempotently provisions teacher baseline access."""
        return TeacherProvisioningService.ensure_teacher_baseline_access(user_id)

    @staticmethod
    def backfill_existing_teachers() -> int:
        """Active administrative hook to backfill existing teachers with missing baseline permissions."""
        try:
            # Evaluate all users who have the role set to 'teacher' or are registered in teachers table
            teacher_users = User.query.filter_by(role='teacher').all()
            count = 0
            for user in teacher_users:
                if TeacherProvisioningService.ensure_teacher_baseline_access(user.id):
                    count += 1
            logger.info("Completed administrative backfill for existing teachers", processed_count=count)
            return count
        except Exception as e:
            logger.error("Failed to run backfill for existing teachers", error=str(e))
            return 0
