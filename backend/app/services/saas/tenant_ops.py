import re
import secrets
from datetime import datetime, timedelta
import uuid

from app.extensions import db
from app.models.user import User
from app.models.tenant import Tenant, TenantMembership, TenantInvitation, TENANT_MEMBER_ROLES

from .audit import audit
from .serialization import serialize_tenant


def normalize_slug(slug: str) -> str:
    slug = (slug or '').strip().lower()
    slug = re.sub(r'[^a-z0-9-]+', '-', slug)
    slug = re.sub(r'-{2,}', '-', slug).strip('-')
    return slug


def _create_tenant_and_membership(user: User, name: str, slug: str, country_code: str, currency: str = 'USD'):
    if not name or not name.strip():
        return None, None, 'School name is required'

    slug_norm = normalize_slug(slug)
    if not slug_norm:
        return None, None, 'School slug is required'

    if not country_code or len(country_code) != 2:
        return None, None, 'country_code must be a 2-letter code'

    existing = Tenant.query.filter_by(slug=slug_norm).first()
    if existing:
        return None, None, 'Slug already in use'

    schema_name = f"tenant_{slug_norm}"[:63]

    tenant = Tenant(
        slug=slug_norm,
        name=name.strip(),
        country_code=country_code.upper(),
        schema_name=schema_name,
        currency=(currency or 'USD').upper()
    )
    db.session.add(tenant)
    db.session.flush()

    membership = TenantMembership(
        tenant_id=tenant.id,
        user_id=user.id,
        role='school_admin',
        status='active'
    )
    db.session.add(membership)

    audit(
        action='tenant.created',
        actor_id=None,
        tenant_id=tenant.id,
        resource_type='tenant',
        resource_id=str(tenant.id),
        details={'slug': tenant.slug, 'name': tenant.name}
    )

    return tenant, membership, None


def create_tenant(creator_user_id: int, name: str, slug: str, country_code: str, currency: str = 'USD'):
    user = User.query.get(int(creator_user_id))
    if not user:
        return None, 'User not found'

    tenant, _, err = _create_tenant_and_membership(user, name, slug, country_code, currency)
    if err:
        return None, err

    db.session.commit()
    return tenant, None


def get_user_tenants(user_id: int):
    memberships = TenantMembership.query.filter_by(user_id=int(user_id)).all()
    tenant_ids = [m.tenant_id for m in memberships]
    tenants = Tenant.query.filter(Tenant.id.in_(tenant_ids)).all() if tenant_ids else []

    membership_map = {str(m.tenant_id): m for m in memberships}
    result = []
    for t in tenants:
        m = membership_map.get(str(t.id))
        result.append({
            'tenant': serialize_tenant(t),
            'membership': {
                'role': getattr(m, 'role', None),
                'status': getattr(m, 'status', None)
            }
        })
    return result


def get_tenant_for_user(user_id: int, tenant_id):
    try:
        tenant_uuid = tenant_id if isinstance(tenant_id, uuid.UUID) else uuid.UUID(str(tenant_id))
    except Exception:
        return None, None, 'Tenant not found'

    tenant = Tenant.query.get(tenant_uuid)
    if not tenant:
        return None, None, 'Tenant not found'
    membership = TenantMembership.query.filter_by(user_id=int(user_id), tenant_id=tenant.id).first()
    return tenant, membership, None


def update_tenant(user_id: int, tenant_id, updates: dict, allow_platform_admin: bool = False):
    tenant, membership, err = get_tenant_for_user(user_id, tenant_id)
    if err:
        return None, err

    if not allow_platform_admin:
        if not membership or membership.role != 'school_admin':
            return None, 'Unauthorized'

    allowed = {'name', 'country_code', 'currency', 'default_language', 'timezone'}
    for k, v in (updates or {}).items():
        if k in allowed and v is not None:
            setattr(tenant, k, v)

    db.session.commit()
    return tenant, None


def list_members(user_id: int, tenant_id):
    tenant, membership, err = get_tenant_for_user(user_id, tenant_id)
    if err:
        return None, err
    if not membership:
        return None, 'Unauthorized'

    members = TenantMembership.query.filter_by(tenant_id=tenant.id).all()
    user_ids = [m.user_id for m in members]
    users = User.query.filter(User.id.in_(user_ids)).all() if user_ids else []
    users_by_id = {u.id: u for u in users}
    return [
        {
            'id': str(m.id),
            'user': {
                'id': m.user_id,
                'email': getattr(users_by_id.get(m.user_id), 'email', None),
                'username': getattr(users_by_id.get(m.user_id), 'username', None)
            },
            'role': m.role,
            'status': m.status,
            'created_at': m.created_at.isoformat() if m.created_at else None
        }
        for m in members
    ], None


def create_invitation(inviter_user_id: int, tenant_id, email: str, role: str):
    tenant, membership, err = get_tenant_for_user(inviter_user_id, tenant_id)
    if err:
        return None, err
    if not membership or membership.role != 'school_admin':
        return None, 'Unauthorized'

    email_norm = (email or '').strip().lower()
    if not email_norm:
        return None, 'Email is required'
    if role not in TENANT_MEMBER_ROLES:
        return None, 'Invalid role'

    token = secrets.token_hex(32)
    invite = TenantInvitation(
        tenant_id=tenant.id,
        email=email_norm,
        role=role,
        token=token,
        status='pending',
        expires_at=datetime.utcnow() + timedelta(days=7),
        invited_by_user_id=int(inviter_user_id)
    )
    db.session.add(invite)
    db.session.commit()
    return invite, None


def accept_invitation(user_id: int, token: str):
    token = (token or '').strip()
    if not token:
        return None, 'Token is required'

    invite = TenantInvitation.query.filter_by(token=token).first()
    if not invite:
        return None, 'Invitation not found'
    if invite.status != 'pending':
        return None, 'Invitation is not valid'
    if invite.expires_at and invite.expires_at < datetime.utcnow():
        invite.status = 'expired'
        db.session.commit()
        return None, 'Invitation expired'

    user = User.query.get(int(user_id))
    if not user:
        return None, 'User not found'

    if (user.email or '').lower() != invite.email.lower():
        return None, 'Invitation email does not match this account'

    existing = TenantMembership.query.filter_by(user_id=user.id, tenant_id=invite.tenant_id).first()
    if existing:
        invite.status = 'accepted'
        db.session.commit()
        return existing, None

    membership = TenantMembership(
        tenant_id=invite.tenant_id,
        user_id=user.id,
        role=invite.role,
        status='active',
        invited_by_user_id=invite.invited_by_user_id
    )
    db.session.add(membership)
    invite.status = 'accepted'
    db.session.commit()
    return membership, None


def _ensure_not_last_active_school_admin(tenant_id, membership_to_remove_id=None, membership_new_role=None, membership_new_status=None):
    query = TenantMembership.query.filter_by(tenant_id=tenant_id)
    members = query.all()
    active_admins = []
    for m in members:
        role = m.role
        status = m.status
        if membership_to_remove_id and str(m.id) == str(membership_to_remove_id):
            if membership_new_role is not None:
                role = membership_new_role
            if membership_new_status is not None:
                status = membership_new_status
            if membership_new_role is None and membership_new_status is None:
                continue
        if role == 'school_admin' and status == 'active':
            active_admins.append(m)
    if len(active_admins) == 0:
        return False
    return True


def platform_list_members(tenant_id):
    try:
        tenant_uuid = tenant_id if isinstance(tenant_id, uuid.UUID) else uuid.UUID(str(tenant_id))
    except Exception:
        return None, 'Tenant not found'

    tenant = Tenant.query.get(tenant_uuid)
    if not tenant:
        return None, 'Tenant not found'

    members = TenantMembership.query.filter_by(tenant_id=tenant.id).all()
    user_ids = [m.user_id for m in members]
    users = User.query.filter(User.id.in_(user_ids)).all() if user_ids else []
    users_by_id = {u.id: u for u in users}
    return [
        {
            'id': str(m.id),
            'user': {
                'id': m.user_id,
                'email': getattr(users_by_id.get(m.user_id), 'email', None),
                'username': getattr(users_by_id.get(m.user_id), 'username', None)
            },
            'role': m.role,
            'status': m.status,
            'created_at': m.created_at.isoformat() if m.created_at else None
        }
        for m in members
    ], None


def platform_upsert_member(tenant_id, email: str, role: str, status: str = 'active'):
    try:
        tenant_uuid = tenant_id if isinstance(tenant_id, uuid.UUID) else uuid.UUID(str(tenant_id))
    except Exception:
        return None, 'Tenant not found'

    tenant = Tenant.query.get(tenant_uuid)
    if not tenant:
        return None, 'Tenant not found'

    email_norm = (email or '').strip().lower()
    if not email_norm:
        return None, 'Email is required'
    if role not in TENANT_MEMBER_ROLES:
        return None, 'Invalid role'
    if status not in ('active', 'suspended', 'revoked'):
        return None, 'Invalid status'

    user = User.query.filter_by(email=email_norm).first()
    if not user:
        return None, 'User not found'

    membership = TenantMembership.query.filter_by(tenant_id=tenant.id, user_id=user.id).first()
    if membership:
        membership.role = role
        membership.status = status
    else:
        membership = TenantMembership(tenant_id=tenant.id, user_id=user.id, role=role, status=status)
        db.session.add(membership)

    if not _ensure_not_last_active_school_admin(tenant.id):
        db.session.rollback()
        return None, 'Tenant must have at least one active school admin'

    db.session.commit()
    return membership, None


def platform_update_membership(tenant_id, membership_id, updates: dict):
    try:
        tenant_uuid = tenant_id if isinstance(tenant_id, uuid.UUID) else uuid.UUID(str(tenant_id))
        membership_uuid = membership_id if isinstance(membership_id, uuid.UUID) else uuid.UUID(str(membership_id))
    except Exception:
        return None, 'Not found'

    tenant = Tenant.query.get(tenant_uuid)
    if not tenant:
        return None, 'Tenant not found'

    membership = TenantMembership.query.get(membership_uuid)
    if not membership or membership.tenant_id != tenant.id:
        return None, 'Membership not found'

    next_role = updates.get('role')
    next_status = updates.get('status')

    if next_role is not None and next_role not in TENANT_MEMBER_ROLES:
        return None, 'Invalid role'
    if next_status is not None and next_status not in ('active', 'suspended', 'revoked'):
        return None, 'Invalid status'

    if not _ensure_not_last_active_school_admin(tenant.id, membership_to_remove_id=membership.id, membership_new_role=next_role, membership_new_status=next_status):
        return None, 'Tenant must have at least one active school admin'

    if next_role is not None:
        membership.role = next_role
    if next_status is not None:
        membership.status = next_status

    db.session.commit()
    return membership, None


def platform_delete_membership(tenant_id, membership_id):
    try:
        tenant_uuid = tenant_id if isinstance(tenant_id, uuid.UUID) else uuid.UUID(str(tenant_id))
        membership_uuid = membership_id if isinstance(membership_id, uuid.UUID) else uuid.UUID(str(membership_id))
    except Exception:
        return 'Not found'

    tenant = Tenant.query.get(tenant_uuid)
    if not tenant:
        return 'Tenant not found'

    membership = TenantMembership.query.get(membership_uuid)
    if not membership or membership.tenant_id != tenant.id:
        return 'Membership not found'

    if not _ensure_not_last_active_school_admin(tenant.id, membership_to_remove_id=membership.id):
        return 'Tenant must have at least one active school admin'

    db.session.delete(membership)
    db.session.commit()
    return None
