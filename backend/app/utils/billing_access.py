from functools import wraps

from flask import jsonify, g

from app.models.tenant import TenantMembership
from app.utils.rbac_decorators import get_current_user


def super_admin_required(fn):
    @wraps(fn)
    def wrapper(*args, **kwargs):
        user = get_current_user()
        if not user:
            return jsonify({'success': False, 'message': 'Authentication required'}), 401
        if getattr(user, 'role', None) != 'super_admin':
            return jsonify({'success': False, 'message': 'Super Admin privileges required'}), 403
        g.current_user = user
        return fn(*args, **kwargs)

    return wrapper


def school_admin_required(fn):
    @wraps(fn)
    def wrapper(*args, **kwargs):
        user = getattr(g, 'current_user', None) or get_current_user()
        if not user:
            return jsonify({'success': False, 'message': 'Authentication required'}), 401

        tenant_id = getattr(g, 'tenant_id', None)
        if not tenant_id:
            return jsonify({'success': False, 'message': 'Tenant context required'}), 400

        legacy_role = getattr(user, 'role', None)
        if legacy_role == 'admin':
            g.current_user = user
            return fn(*args, **kwargs)

        membership = TenantMembership.query.filter_by(user_id=user.id, tenant_id=tenant_id, status='active').first()
        if not membership or membership.role != 'school_admin':
            return jsonify({'success': False, 'message': 'School Admin privileges required'}), 403
        g.current_user = user
        return fn(*args, **kwargs)

    return wrapper

