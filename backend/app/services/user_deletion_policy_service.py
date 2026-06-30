from typing import Any, Dict, List, Optional, Set, Tuple
import uuid

from app.extensions import db
from app.models.parent import Parent
from app.models.staff import Staff
from app.models.student import Student
from app.models.teacher import Teacher
from app.models.tenant import Tenant, TenantMembership
from app.models.user import User
from app.services.orphan_cleanup_service import OrphanCleanupService
from app.services.user_service import SecurePurgeService


class UserDeletionPolicyService:
    @staticmethod
    def _user_role(user: Optional[User]) -> Optional[str]:
        if not user:
            return None
        role = getattr(user, 'role', None)
        if role:
            return role
        try:
            if any(getattr(r, 'name', None) == 'super_admin' for r in (user.roles or [])):
                return 'super_admin'
            if any(getattr(r, 'name', None) == 'super_manager' for r in (user.roles or [])):
                return 'super_manager'
        except Exception:
            pass
        return role

    @staticmethod
    def _tenant_scope_id(tenant_scope_id) -> Optional[uuid.UUID]:
        if not tenant_scope_id:
            return None
        if isinstance(tenant_scope_id, uuid.UUID):
            return tenant_scope_id
        return uuid.UUID(str(tenant_scope_id))

    @staticmethod
    def _memberships_for_user(user_id: int) -> List[Tuple[TenantMembership, Optional[Tenant]]]:
        return (
            db.session.query(TenantMembership, Tenant)
            .outerjoin(Tenant, Tenant.id == TenantMembership.tenant_id)
            .filter(TenantMembership.user_id == user_id)
            .order_by(TenantMembership.created_at.asc())
            .all()
        )

    @staticmethod
    def _profile_tenant_ids(user_id: int) -> Set[uuid.UUID]:
        tenant_ids: Set[uuid.UUID] = set()
        for model in (Student, Teacher, Parent, Staff):
            rows = model.query.filter_by(user_id=user_id).all()
            for row in rows:
                tenant_id = getattr(row, 'tenant_id', None)
                if tenant_id:
                    tenant_ids.add(tenant_id)
        return tenant_ids

    @staticmethod
    def _membership_summary(rows: List[Tuple[TenantMembership, Optional[Tenant]]]) -> List[Dict[str, Any]]:
        items: List[Dict[str, Any]] = []
        for membership, tenant in rows:
            items.append({
                'tenant_id': str(membership.tenant_id),
                'tenant_name': tenant.name if tenant else None,
                'tenant_slug': tenant.slug if tenant else None,
                'tenant_status': tenant.status if tenant else None,
                'membership_role': membership.role,
                'membership_status': membership.status,
            })
        return items

    @staticmethod
    def get_delete_status(user_id: int, actor_user_id: int, *, tenant_scope_id=None) -> Dict[str, Any]:
        target = User.query.get(user_id)
        if not target:
            return {
                'exists': False,
                'user_id': user_id,
                'can_delete': False,
                'reasons': ['User not found'],
            }

        actor = User.query.get(actor_user_id)
        actor_role = UserDeletionPolicyService._user_role(actor)
        target_role = UserDeletionPolicyService._user_role(target)
        scope_tenant_id = UserDeletionPolicyService._tenant_scope_id(tenant_scope_id)

        memberships = UserDeletionPolicyService._memberships_for_user(user_id)
        membership_tenant_ids = {membership.tenant_id for membership, _tenant in memberships if membership.tenant_id}
        target_profile_tenant_ids = UserDeletionPolicyService._profile_tenant_ids(user_id)
        linked_tenant_ids = membership_tenant_ids | target_profile_tenant_ids

        status: Dict[str, Any] = {
            'exists': True,
            'user_id': user_id,
            'user': {
                'id': target.id,
                'email': target.email,
                'username': target.username,
                'role': target_role,
                'status': getattr(target, 'status', None),
            },
            'can_delete': False,
            'mode': None,
            'reasons': [],
            'memberships': UserDeletionPolicyService._membership_summary(memberships),
            'linked_tenant_ids': [str(tid) for tid in sorted(linked_tenant_ids, key=str)],
        }

        if actor_user_id == user_id:
            status['reasons'] = ['Cannot delete your own account']
            return status

        if target_role in ('super_admin', 'super_manager'):
            status['reasons'] = ['Cannot delete a platform admin account']
            return status

        orphan_status = OrphanCleanupService.get_orphan_user_status(user_id)
        is_true_orphan = not memberships and not target_profile_tenant_ids
        if is_true_orphan:
            if orphan_status.get('can_delete'):
                status['can_delete'] = True
                status['mode'] = 'orphan'
                status['reasons'] = []
                return status
            status['reasons'] = orphan_status.get('reasons') or ['User is not eligible for deletion']
            return status

        if actor_role == 'super_admin':
            if not linked_tenant_ids:
                status['reasons'] = orphan_status.get('reasons') or ['User is not eligible for deletion']
                return status

            tenant_status_map = {
                tenant.id: (tenant.status or '').lower()
                for tenant in Tenant.query.filter(Tenant.id.in_(list(linked_tenant_ids))).all()
            }
            active_tenants = [
                str(tid)
                for tid in linked_tenant_ids
                if tenant_status_map.get(tid) not in ('inactive', 'suspended')
            ]
            if active_tenants:
                status['reasons'] = ['Super Admin can only delete orphan users or users linked only to inactive or suspended schools']
                status['active_tenant_ids'] = active_tenants
                return status

            status['can_delete'] = True
            status['mode'] = 'purge'
            status['reasons'] = []
            status['expected_delete'] = f"DELETE {target.email}"
            return status

        if scope_tenant_id is None:
            status['reasons'] = ['Tenant context is required']
            return status

        scope_tenant = Tenant.query.get(scope_tenant_id)
        if not scope_tenant:
            status['reasons'] = ['School not found']
            return status

        actor_membership = TenantMembership.query.filter_by(
            tenant_id=scope_tenant_id,
            user_id=actor_user_id,
            role='school_admin',
            status='active',
        ).first()
        if not actor_membership:
            status['reasons'] = ['Only a School Admin can delete users from a school']
            return status

        if (scope_tenant.status or '').lower() != 'active':
            status['reasons'] = ['School Admin can only delete users from an active school']
            return status

        if not linked_tenant_ids:
            status['reasons'] = ['School Admin can only delete users linked to their school']
            return status

        if any(tid != scope_tenant_id for tid in linked_tenant_ids):
            status['reasons'] = ['User has links to another school and cannot be deleted from this school']
            return status

        target_membership_roles = {
            (membership.role or '').lower()
            for membership, _tenant in memberships
            if membership.tenant_id == scope_tenant_id
        }
        if 'school_admin' in target_membership_roles or target_role in ('school_admin', 'admin'):
            status['reasons'] = ['School Admin cannot delete another School Admin account']
            return status

        status['can_delete'] = True
        status['mode'] = 'purge'
        status['reasons'] = []
        return status

    @staticmethod
    def delete_user(user_id: int, actor_user_id: int, *, tenant_scope_id=None) -> Tuple[bool, Dict[str, Any]]:
        status = UserDeletionPolicyService.get_delete_status(
            user_id,
            actor_user_id,
            tenant_scope_id=tenant_scope_id,
        )
        if not status.get('can_delete'):
            return False, status

        ok, result = SecurePurgeService.force_purge_user(user_id, actor_user_id=actor_user_id)
        if not ok:
            payload = dict(status)
            payload['reasons'] = [result.get('error', 'Secure delete failed')]
            payload['delete_error'] = result
            return False, payload
        return True, result
