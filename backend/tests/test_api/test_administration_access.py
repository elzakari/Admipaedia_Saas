from flask_jwt_extended import create_access_token

from app.models.user import User
from app.utils.entitlements import has_any_feature_access
from tests.test_production_integration import create_test_membership


def _make_headers(user_id: int, tenant_id) -> dict[str, str]:
    token = create_access_token(identity=user_id)
    return {
        'Authorization': f'Bearer {token}',
        'X-Tenant-ID': str(tenant_id),
    }


def test_has_any_feature_access_allows_fallback_plan_when_entitlements_unconfigured(sample_tenant, monkeypatch):
    monkeypatch.setattr(
        'app.utils.entitlements.EntitlementService.getSchoolFeatures',
        lambda school_id: ({}, None),
    )

    assert has_any_feature_access(
        sample_tenant.id,
        ['roles.basic', 'finance.basic'],
        fallback_plan_slugs=['trial', 'basic', 'pro', 'enterprise'],
    ) is True


def test_has_any_feature_access_honors_explicit_feature_map(sample_tenant, monkeypatch):
    monkeypatch.setattr(
        'app.utils.entitlements.EntitlementService.getSchoolFeatures',
        lambda school_id: ({'roles.basic': True, 'finance.basic': False}, None),
    )

    assert has_any_feature_access(sample_tenant.id, ['roles.basic']) is True
    assert has_any_feature_access(sample_tenant.id, ['finance.basic']) is False


def test_administration_settings_allows_school_admin(client, db_session, sample_tenant):
    user = User(username='schooladmin', email='schooladmin@example.com', role='school_admin')
    user.set_password('Password123!')
    db_session.add(user)
    db_session.flush()
    create_test_membership(db_session, sample_tenant.id, user.id, 'school_admin')
    db_session.commit()

    response = client.get(
        '/api/v1/administration/settings',
        headers=_make_headers(user.id, sample_tenant.id),
    )

    assert response.status_code == 200
    assert response.get_json()['success'] is True


def test_administration_settings_denies_teacher(client, db_session, sample_tenant):
    user = User(username='teacheradmincheck', email='teacheradmincheck@example.com', role='teacher')
    user.set_password('Password123!')
    db_session.add(user)
    db_session.flush()
    create_test_membership(db_session, sample_tenant.id, user.id, 'teacher')
    db_session.commit()

    response = client.get(
        '/api/v1/administration/settings',
        headers=_make_headers(user.id, sample_tenant.id),
    )

    assert response.status_code == 403
