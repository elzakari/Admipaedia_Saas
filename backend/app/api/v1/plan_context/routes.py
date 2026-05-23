from __future__ import annotations

from flask import jsonify, g, request

from app.api.v1.plan_context import plan_context_bp
from app.extensions import db
from app.models.tenant import Tenant
from app.services.entitlements.service import EntitlementService
from app.services.integrations.token_service import SERVICE_TYPES, ServiceTokenService
from app.utils.tenant_context import tenant_required


@plan_context_bp.route('/plan-context', methods=['GET'])
@tenant_required
def get_plan_context():
    if Tenant.query.first() is None:
        return jsonify({
            'success': True,
            'data': {
                'tenant_id': None,
                'plan': {
                    'id': 0,
                    'slug': 'free',
                    'name': 'Free Plan',
                },
                'subscription': {
                    'id': 0,
                    'status': 'active',
                    'starts_at': None,
                    'ends_at': None,
                },
                'features': {},
                'limits': {},
                'token_usage': {},
                'errors': {
                    'features': None,
                    'limits': None,
                },
            },
        }), 200

    tenant_id = str(getattr(g, 'tenant_id', None))
    if not tenant_id or tenant_id == 'None':
        return jsonify({
            'success': True,
            'data': {
                'tenant_id': None,
                'plan': {
                    'id': 0,
                    'slug': 'free',
                    'name': 'Free Plan',
                },
                'subscription': {
                    'id': 0,
                    'status': 'active',
                    'starts_at': None,
                    'ends_at': None,
                },
                'features': {},
                'limits': {},
                'token_usage': {},
                'errors': {
                    'features': None,
                    'limits': None,
                },
            },
        }), 200

    active, err = EntitlementService.getSchoolActivePlan(tenant_id)
    if err or not active:
        return jsonify({
            'success': True,
            'data': {
                'tenant_id': tenant_id,
                'plan': {
                    'id': 0,
                    'slug': 'free',
                    'name': 'Free Plan',
                },
                'subscription': {
                    'id': 0,
                    'status': 'active',
                    'starts_at': None,
                    'ends_at': None,
                },
                'features': {},
                'limits': {},
                'token_usage': {},
                'errors': {
                    'features': err or 'School has no active plan',
                    'limits': None,
                },
            },
        }), 200

    tenant = Tenant.query.get(active.subscription.school_id)
    if tenant and (tenant.plan or '').strip().lower() != (active.plan.slug or '').strip().lower():
        tenant.plan = active.plan.slug
        db.session.commit()
        ServiceTokenService.provision_for_tenant(str(tenant.id), actor_user_id=getattr(getattr(g, 'current_user', None), 'id', None))

    features, ferr = EntitlementService.getSchoolFeatures(tenant_id)
    limits, lerr = EntitlementService.getSchoolLimits(tenant_id)

    usage = {}
    for service_type in SERVICE_TYPES:
        st = ServiceTokenService.get_status(tenant_id, service_type)
        usage[service_type] = {
            'service_type': service_type,
            'used': st.used,
            'allowance': st.allowance,
            'unlimited': st.unlimited,
            'remaining': st.remaining,
        }

    resp = {
        'success': True,
        'data': {
            'tenant_id': tenant_id,
            'plan': {
                'id': int(active.plan.id),
                'slug': active.plan.slug,
                'name': active.plan.name,
            },
            'subscription': {
                'id': int(active.subscription.id),
                'status': active.subscription.status,
                'starts_at': active.subscription.starts_at.isoformat() if active.subscription.starts_at else None,
                'ends_at': active.subscription.ends_at.isoformat() if active.subscription.ends_at else None,
            },
            'features': features or {},
            'limits': limits or {},
            'token_usage': usage,
            'errors': {
                'features': ferr,
                'limits': lerr,
            },
        },
    }
    return jsonify(resp)
