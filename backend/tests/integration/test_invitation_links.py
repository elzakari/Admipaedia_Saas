import urllib.parse

from app.extensions import db
from app.models.tenant import Tenant, TenantMembership
from app.models.user import User


def _extract_params(signed_url: str):
    parsed = urllib.parse.urlparse(signed_url)
    path = parsed.path
    invite_id = path.rstrip('/').split('/')[-1]
    q = urllib.parse.parse_qs(parsed.query)
    exp = (q.get('exp') or [''])[0]
    sig = (q.get('sig') or [''])[0]
    return invite_id, exp, sig


def test_invitation_create_validate_consume_flow(app, client, auth_headers):
    with app.app_context():
        admin = User.query.filter_by(email='test@example.com').first()
        assert admin is not None
        tenant = Tenant(slug='test-school', name='Test School', country_code='GH', schema_name='public', currency='GHS')
        db.session.add(tenant)
        db.session.flush()
        db.session.add(TenantMembership(tenant_id=tenant.id, user_id=admin.id, role='school_admin', status='active'))
        db.session.commit()

        headers = dict(auth_headers)
        headers['X-Tenant-ID'] = str(tenant.id)

        create_res = client.post('/api/v1/admin/invitations', json={'invitee_type': 'general', 'expires_in_days': 7}, headers=headers)
        assert create_res.status_code == 201
        data = create_res.get_json()
        assert data['success'] is True
        assert data.get('signed_url')

        invite_id, exp, sig = _extract_params(data['signed_url'])
        assert invite_id
        assert exp
        assert sig

        validate_res = client.get(f'/api/v1/invitations/{invite_id}/validate?exp={exp}&sig={sig}')
        assert validate_res.status_code == 200
        v = validate_res.get_json()
        assert v['success'] is True
        assert v['invite']['invitee_type'] == 'general'

        reg_payload = {
            'username': 'invited_user',
            'email': 'invited_user@example.com',
            'password': 'SecurePass9!Xk',
            'confirm_password': 'SecurePass9!Xk'
        }
        register_res = client.post(f'/api/v1/invitations/{invite_id}/register?exp={exp}&sig={sig}', json=reg_payload)
        assert register_res.status_code == 201
        r = register_res.get_json()
        assert r['success'] is True
        assert r['user']['role'] == 'user'

        register_res2 = client.post(f'/api/v1/invitations/{invite_id}/register?exp={exp}&sig={sig}', json={
            'username': 'invited_user2',
            'email': 'invited_user2@example.com',
            'password': 'SecurePass9!Xk',
            'confirm_password': 'SecurePass9!Xk'
        })
        assert register_res2.status_code == 409
        r2 = register_res2.get_json()
        assert r2['success'] is False


def test_teacher_invite_requires_names(app, client, auth_headers):
    with app.app_context():
        admin = User.query.filter_by(email='test@example.com').first()
        tenant = Tenant(slug='test-school-2', name='Test School 2', country_code='GH', schema_name='public2', currency='GHS')
        db.session.add(tenant)
        db.session.flush()
        db.session.add(TenantMembership(tenant_id=tenant.id, user_id=admin.id, role='school_admin', status='active'))
        db.session.commit()

        headers = dict(auth_headers)
        headers['X-Tenant-ID'] = str(tenant.id)
        create_res = client.post('/api/v1/admin/invitations', json={'invitee_type': 'teacher'}, headers=headers)
        assert create_res.status_code == 201
        signed_url = create_res.get_json()['signed_url']
        invite_id, exp, sig = _extract_params(signed_url)

        register_res = client.post(f'/api/v1/invitations/{invite_id}/register?exp={exp}&sig={sig}', json={
            'username': 't1',
            'email': 't1@example.com',
            'password': 'SecurePass9!Xk',
            'confirm_password': 'SecurePass9!Xk'
        })
        assert register_res.status_code == 400
        data = register_res.get_json()
        assert data['success'] is False
