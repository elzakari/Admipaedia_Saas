import uuid
from typing import Any, Dict, Tuple

from sqlalchemy import func, text

from app.extensions import db
from app.models.tenant import (
    Tenant,
    TenantMembership,
    TenantInvitation,
    Subscription,
    PlatformInvoice,
    PlatformPayment,
)
from app.models.educational_system import EducationalSystemConfig, GradeLevel
from app.models.academic_term import AcademicTerm
from app.models.tenant_academic_settings import TenantAcademicSettings
from app.models.grading_system import GradingScheme
from app.models.student import Student
from app.models.teacher import Teacher
from app.models.parent import Parent
from app.models.staff import Staff
from app.models.class_ import Class
from app.models.department import Department
from app.models.subject import Subject

from app.models.user import User, user_roles, LoginHistory
from app.models.security import SecurityEvent, PasswordHistory, PasswordResetToken, APIKey, SchoolRegistrationToken
from app.models.session_token import SessionToken
from app.models.dashboard import Notification
from app.models.user_profile import UserProfile
from app.models.user_preferences import UserPreferences
from app.models.audit_log import AuditLog
from app.models.staff_enhanced import StaffLeave
from app.models.enhanced_auth import MFADevice, TrustedDevice, AuthenticationAttempt, UserSecuritySettings, SecurityAuditLog
from app.models.grading_system import FinalGrade


class OrphanCleanupService:
    @staticmethod
    def _iter_mapped_models():
        try:
            mappers = list(db.Model.registry.mappers)
        except Exception:
            mappers = []
        for m in mappers:
            cls = getattr(m, 'class_', None)
            if not cls:
                continue
            if not hasattr(cls, '__table__'):
                continue
            yield cls

    @staticmethod
    def _user_fk_references(user_id: int):
        blocking = []
        detachable = []

        for cls in OrphanCleanupService._iter_mapped_models():
            if cls is User:
                continue
            table = getattr(cls, '__table__', None)
            if table is None:
                continue

            for col in table.columns:
                if not col.foreign_keys:
                    continue
                if not any(getattr(fk.column, 'table', None) is not None and fk.column.table.name == 'users' and fk.column.name == 'id' for fk in col.foreign_keys):
                    continue

                try:
                    cnt = db.session.query(func.count()).select_from(cls).filter(col == user_id).scalar() or 0
                except Exception:
                    continue

                if int(cnt) <= 0:
                    continue

                entry = {
                    'table': table.name,
                    'column': col.name,
                    'count': int(cnt),
                    'nullable': bool(col.nullable),
                }
                if col.nullable:
                    detachable.append(entry)
                else:
                    blocking.append(entry)

        return blocking, detachable

    @staticmethod
    def _parse_tenant_id(tenant_id: str) -> uuid.UUID:
        return uuid.UUID(str(tenant_id))

    @staticmethod
    def get_orphan_tenant_status(tenant_id: str) -> Dict[str, Any]:
        tid = OrphanCleanupService._parse_tenant_id(tenant_id)
        tenant = Tenant.query.get(tid)
        if not tenant:
            return {
                'exists': False,
                'tenant_id': str(tid),
                'can_delete': False,
                'reasons': ['Tenant not found'],
                'counts': {},
            }

        counts = {
            'memberships': TenantMembership.query.filter_by(tenant_id=tid).count(),
            'invitations': TenantInvitation.query.filter_by(tenant_id=tid).count(),
            'subscriptions': Subscription.query.filter_by(tenant_id=tid).count(),
            'platform_invoices': PlatformInvoice.query.filter_by(tenant_id=tid).count(),
            'platform_payments': PlatformPayment.query.filter_by(tenant_id=tid).count(),
            'students': Student.query.filter_by(tenant_id=tid).count(),
            'teachers': Teacher.query.filter_by(tenant_id=tid).count(),
            'parents': Parent.query.filter_by(tenant_id=tid).count(),
            'staff': Staff.query.filter_by(tenant_id=tid).count(),
            'classes': Class.query.filter_by(tenant_id=tid).count(),
            'departments': Department.query.filter_by(tenant_id=tid).count(),
            'subjects': Subject.query.filter_by(tenant_id=tid).count(),
            'grading_schemes': GradingScheme.query.filter_by(tenant_id=tid).count(),
            'educational_system_config': EducationalSystemConfig.query.filter_by(tenant_id=tid).count(),
            'grade_levels': GradeLevel.query.filter_by(tenant_id=tid).count(),
            'academic_terms': AcademicTerm.query.filter_by(tenant_id=tid).count(),
            'tenant_academic_settings': TenantAcademicSettings.query.filter_by(tenant_id=tid).count(),
        }

        reasons = []
        if counts['memberships'] > 0:
            reasons.append('Tenant has memberships')
        if counts['subscriptions'] > 0:
            reasons.append('Tenant has subscriptions')
        if counts['platform_invoices'] > 0 or counts['platform_payments'] > 0:
            reasons.append('Tenant has billing history')

        blocking = ['students', 'teachers', 'parents', 'staff', 'classes', 'departments', 'subjects']
        for key in blocking:
            if counts[key] > 0:
                reasons.append(f"Tenant has {key}")

        can_delete = len(reasons) == 0
        return {
            'exists': True,
            'tenant_id': str(tid),
            'tenant': {
                'id': str(tenant.id),
                'name': tenant.name,
                'slug': tenant.slug,
                'country_code': tenant.country_code,
                'status': tenant.status,
                'plan': tenant.plan,
                'created_at': tenant.created_at.isoformat() if tenant.created_at else None,
            },
            'can_delete': can_delete,
            'reasons': reasons,
            'counts': counts,
        }

    @staticmethod
    def delete_orphan_tenant(tenant_id: str) -> Tuple[bool, Dict[str, Any]]:
        status = OrphanCleanupService.get_orphan_tenant_status(tenant_id)
        if not status.get('exists'):
            return False, status
        if not status.get('can_delete'):
            return False, status

        tid = OrphanCleanupService._parse_tenant_id(tenant_id)
        tenant = Tenant.query.get(tid)
        if not tenant:
            return False, status

        deletions = {}

        deletions['platform_payments'] = PlatformPayment.query.filter_by(tenant_id=tid).delete(synchronize_session=False)
        deletions['platform_invoices'] = PlatformInvoice.query.filter_by(tenant_id=tid).delete(synchronize_session=False)
        deletions['subscriptions'] = Subscription.query.filter_by(tenant_id=tid).delete(synchronize_session=False)
        deletions['tenant_invitations'] = TenantInvitation.query.filter_by(tenant_id=tid).delete(synchronize_session=False)
        deletions['tenant_memberships'] = TenantMembership.query.filter_by(tenant_id=tid).delete(synchronize_session=False)

        deletions['grading_schemes'] = GradingScheme.query.filter_by(tenant_id=tid).delete(synchronize_session=False)
        deletions['tenant_academic_settings'] = TenantAcademicSettings.query.filter_by(tenant_id=tid).delete(synchronize_session=False)
        deletions['academic_terms'] = AcademicTerm.query.filter_by(tenant_id=tid).delete(synchronize_session=False)

        deletions['grade_levels'] = GradeLevel.query.filter_by(tenant_id=tid).delete(synchronize_session=False)
        deletions['educational_system_config'] = EducationalSystemConfig.query.filter_by(tenant_id=tid).delete(synchronize_session=False)

        deletions['subjects'] = Subject.query.filter_by(tenant_id=tid).delete(synchronize_session=False)
        deletions['departments'] = Department.query.filter_by(tenant_id=tid).delete(synchronize_session=False)
        deletions['classes'] = Class.query.filter_by(tenant_id=tid).delete(synchronize_session=False)
        deletions['staff'] = Staff.query.filter_by(tenant_id=tid).delete(synchronize_session=False)
        deletions['parents'] = Parent.query.filter_by(tenant_id=tid).delete(synchronize_session=False)
        deletions['teachers'] = Teacher.query.filter_by(tenant_id=tid).delete(synchronize_session=False)
        deletions['students'] = Student.query.filter_by(tenant_id=tid).delete(synchronize_session=False)

        db.session.delete(tenant)
        deletions['tenant'] = 1

        return True, {'deleted': deletions, 'tenant_id': str(tid)}

    @staticmethod
    def get_orphan_user_status(user_id: int) -> Dict[str, Any]:
        user = User.query.get(user_id)
        if not user:
            return {
                'exists': False,
                'user_id': user_id,
                'can_delete': False,
                'reasons': ['User not found'],
                'counts': {},
            }

        blocking_fk, detachable_fk = OrphanCleanupService._user_fk_references(user_id)

        counts = {
            'memberships': TenantMembership.query.filter_by(user_id=user_id).count(),
            'invited_memberships': TenantMembership.query.filter_by(invited_by_user_id=user_id).count(),
            'students': Student.query.filter_by(user_id=user_id).count(),
            'teachers': Teacher.query.filter_by(user_id=user_id).count(),
            'parents': Parent.query.filter_by(user_id=user_id).count(),
            'staff': Staff.query.filter_by(user_id=user_id).count(),
            'session_tokens': SessionToken.query.filter_by(user_id=user_id).count(),
            'login_history': LoginHistory.query.filter_by(user_id=user_id).count(),
            'password_history': PasswordHistory.query.filter_by(user_id=user_id).count(),
            'password_reset_tokens': PasswordResetToken.query.filter_by(user_id=user_id).count(),
            'api_keys': APIKey.query.filter_by(user_id=user_id).count(),
            'notifications': Notification.query.filter_by(user_id=user_id).count(),
            'user_profile': UserProfile.query.filter_by(user_id=user_id).count(),
            'user_preferences': UserPreferences.query.filter_by(user_id=user_id).count(),
            'mfa_devices': MFADevice.query.filter_by(user_id=user_id).count(),
            'trusted_devices': TrustedDevice.query.filter_by(user_id=user_id).count(),
            'auth_attempts': AuthenticationAttempt.query.filter_by(user_id=user_id).count(),
            'user_security_settings': UserSecuritySettings.query.filter_by(user_id=user_id).count(),
            'security_audit_logs': SecurityAuditLog.query.filter_by(user_id=user_id).count(),
            'staff_leaves': StaffLeave.query.filter_by(user_id=user_id).count(),
            'final_grades_computed': FinalGrade.query.filter_by(computed_by=user_id).count(),
            'registration_tokens_created': SchoolRegistrationToken.query.filter_by(created_by_user_id=user_id).count(),
            'blocking_fk_refs': len(blocking_fk),
            'detachable_fk_refs': len(detachable_fk),
        }

        reasons = []
        if user.role == 'super_admin':
            reasons.append('Cannot delete a super admin account')
        if counts['memberships'] > 0:
            reasons.append('User belongs to one or more schools')
        if counts['students'] > 0 or counts['teachers'] > 0 or counts['parents'] > 0 or counts['staff'] > 0:
            reasons.append('User has a school profile')
        if counts['final_grades_computed'] > 0:
            reasons.append('User is referenced by computed grades')
        if counts['registration_tokens_created'] > 0:
            reasons.append('User has created school registration links')
        if blocking_fk:
            reasons.append('User is referenced by non-nullable foreign keys')

        can_delete = len(reasons) == 0
        return {
            'exists': True,
            'user_id': user_id,
            'user': {
                'id': user.id,
                'email': user.email,
                'username': user.username,
                'role': user.role,
                'status': user.status,
                'created_at': user.created_at.isoformat() if user.created_at else None,
            },
            'can_delete': can_delete,
            'reasons': reasons,
            'counts': counts,
            'blocking_references': blocking_fk,
            'detachable_references': detachable_fk,
        }

    @staticmethod
    def delete_orphan_user(user_id: int, actor_user_id: int) -> Tuple[bool, Dict[str, Any]]:
        status = OrphanCleanupService.get_orphan_user_status(user_id)
        if not status.get('exists'):
            return False, status
        if not status.get('can_delete'):
            return False, status
        if user_id == actor_user_id:
            return False, {**status, 'can_delete': False, 'reasons': ['Cannot delete your own account']}

        user = User.query.get(user_id)
        if not user:
            return False, status

        deletions = {}

        for ref in status.get('detachable_references') or []:
            table = ref.get('table')
            column = ref.get('column')
            if not table or not column:
                continue
            try:
                db.session.execute(text(f"UPDATE {table} SET {column} = NULL WHERE {column} = :uid"), {'uid': user_id})
            except Exception:
                continue

        deletions['notifications'] = Notification.query.filter_by(user_id=user_id).delete(synchronize_session=False)
        deletions['mfa_devices'] = MFADevice.query.filter_by(user_id=user_id).delete(synchronize_session=False)
        deletions['trusted_devices'] = TrustedDevice.query.filter_by(user_id=user_id).delete(synchronize_session=False)
        deletions['auth_attempts'] = AuthenticationAttempt.query.filter_by(user_id=user_id).delete(synchronize_session=False)
        deletions['user_security_settings'] = UserSecuritySettings.query.filter_by(user_id=user_id).delete(synchronize_session=False)
        deletions['security_audit_logs'] = SecurityAuditLog.query.filter_by(user_id=user_id).delete(synchronize_session=False)
        deletions['staff_leaves'] = StaffLeave.query.filter_by(user_id=user_id).delete(synchronize_session=False)
        deletions['user_preferences'] = UserPreferences.query.filter_by(user_id=user_id).delete(synchronize_session=False)
        deletions['user_profile'] = UserProfile.query.filter_by(user_id=user_id).delete(synchronize_session=False)
        deletions['api_keys'] = APIKey.query.filter_by(user_id=user_id).delete(synchronize_session=False)
        deletions['password_reset_tokens'] = PasswordResetToken.query.filter_by(user_id=user_id).delete(synchronize_session=False)
        deletions['password_history'] = PasswordHistory.query.filter_by(user_id=user_id).delete(synchronize_session=False)
        deletions['login_history'] = LoginHistory.query.filter_by(user_id=user_id).delete(synchronize_session=False)
        deletions['tenant_memberships_invited_by'] = TenantMembership.query.filter_by(invited_by_user_id=user_id).delete(synchronize_session=False)

        deletions['detached_nullable_refs'] = len(status.get('detachable_references') or [])

        db.session.execute(user_roles.delete().where(user_roles.c.user_id == user_id))
        deletions['user_roles'] = True

        SessionToken.query.filter_by(user_id=user_id).delete(synchronize_session=False)
        deletions['session_tokens'] = status['counts'].get('session_tokens', 0)

        db.session.delete(user)
        deletions['user'] = 1

        return True, {'deleted': deletions, 'user_id': user_id}
