from __future__ import annotations

from flask import jsonify, g

from app.api.v1.plan_context import plan_context_bp
from app.services.entitlements.service import EntitlementService
from app.services.integrations.token_service import SERVICE_TYPES, ServiceTokenService
from app.utils.tenant_context import tenant_required


@plan_context_bp.route('/plan-context', methods=['GET'])
@tenant_required(resolve_branch=False, load_full_user=False)
def get_plan_context():
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

    active, features, limits, err = EntitlementService.getSchoolPlanContext(tenant_id)
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
                    'limits': err or None,
                },
            },
        }), 200

    usage = {}
    for service_type, st in ServiceTokenService.get_status_map(tenant_id, SERVICE_TYPES).items():
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
                'features': None,
                'limits': None,
            },
        },
    }
    return jsonify(resp)
