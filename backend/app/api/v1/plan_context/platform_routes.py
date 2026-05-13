from __future__ import annotations

from flask import jsonify, request

from app.api.v1.plan_context import plan_context_bp
from app.models.service_tokens import TenantServiceTokenUsage
from app.services.entitlements.service import EntitlementService
from app.services.integrations.token_service import SERVICE_TYPES, ServiceTokenService
from app.utils.tenant_context import resolve_tenant_for_request


@plan_context_bp.route('/platform/plan-context', methods=['GET'])
def get_plan_context_platform():
    tenant_id, user, err = resolve_tenant_for_request(require_explicit=True)
    if err:
        return jsonify({'success': False, 'message': err}), 400 if err == 'Tenant context required' else 403
    if not user or user.role not in ('super_admin', 'super_manager'):
        return jsonify({'success': False, 'message': 'Unauthorized'}), 403

    tid = str(tenant_id)
    active, aerr = EntitlementService.getSchoolActivePlan(tid)
    if aerr or not active:
        return jsonify({'success': False, 'message': aerr or 'School has no active plan'}), 404

    features, ferr = EntitlementService.getSchoolFeatures(tid)
    limits, lerr = EntitlementService.getSchoolLimits(tid)

    usage = {}
    for service_type in SERVICE_TYPES:
        st = ServiceTokenService.get_status(tid, service_type)
        usage[service_type] = {
            'service_type': service_type,
            'used': st.used,
            'allowance': st.allowance,
            'unlimited': st.unlimited,
            'remaining': st.remaining,
        }

    return jsonify({
        'success': True,
        'data': {
            'tenant_id': tid,
            'plan': {'id': int(active.plan.id), 'slug': active.plan.slug, 'name': active.plan.name},
            'subscription': {
                'id': int(active.subscription.id),
                'status': active.subscription.status,
                'starts_at': active.subscription.starts_at.isoformat() if active.subscription.starts_at else None,
                'ends_at': active.subscription.ends_at.isoformat() if active.subscription.ends_at else None,
            },
            'features': features or {},
            'limits': limits or {},
            'token_usage': usage,
            'errors': {'features': ferr, 'limits': lerr},
        },
    })


@plan_context_bp.route('/platform/token-usage/summary', methods=['GET'])
def token_usage_summary():
    _, user, err = resolve_tenant_for_request(require_explicit=False)
    if err:
        return jsonify({'success': False, 'message': err}), 403
    if not user or user.role not in ('super_admin', 'super_manager'):
        return jsonify({'success': False, 'message': 'Unauthorized'}), 403

    year = request.args.get('year', type=int)
    month = request.args.get('month', type=int)
    q = TenantServiceTokenUsage.query
    if year:
        q = q.filter(TenantServiceTokenUsage.year == int(year))
    if month:
        q = q.filter(TenantServiceTokenUsage.month == int(month))

    rows = q.all()
    by_service = {}
    by_tenant = {}
    total = 0
    for r in rows:
        svc = str(r.service_type)
        tid = str(r.tenant_id)
        used = int(r.used_count or 0)
        total += used
        by_service[svc] = int(by_service.get(svc, 0)) + used
        by_tenant[tid] = int(by_tenant.get(tid, 0)) + used

    return jsonify({
        'success': True,
        'summary': {
            'total_used': total,
            'by_service': by_service,
            'by_tenant': by_tenant,
        }
    })

