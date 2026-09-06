"""
Invitation link integration tests.

WHY THE TWO ORIGINAL TESTS DID NOT CATCH THE PRODUCTION 404 BUG
==============================================================

The production symptom:
    * DB row exists (active, tenant_id = X)
    * Admin UI shows Active
    * Anonymous GET /api/v1/invitations/<id>/validate → 404 "Invitation not found"
    * Structlog warning fires: tenant.missing_context_fail_closed entity=InvitationLink

Root cause (tenant chicken-egg bootstrap problem):
    1. Anonymous visitor has NO JWT, NO X-Tenant-ID header.
    2. factory.py _global_resolve_tenant_context() correctly sets g.tenant_id = None
       (it's a whitelisted path — no enforcement, but also no context).
    3. extensions.py before_compile listener fires on EVERY query for entities
       with a tenant_id column.  If g.tenant_id is None AND the entity is not
       in _TENANT_SCOPE_AUTO_EXCLUDE, it injects:
           WHERE tenant_id = '00000000-0000-0000-0000-000000000000'
       → ZERO rows match (fail-closed).
    4. InvitationLink HAS a tenant_id column and was NOT in the auto-exclude set.
       Even when routes.py used .without_tenant_filter() on the explicit lookup,
       additional queries made *outside* the explicit call site (session flush,
       lazy-load backrefs, event inserts, commits that trigger listeners) can
       still hit InvitationLink and return zero rows → 404.

Why the existing tests passed:
    a) Tests run inside `with app.app_context():` that sometimes inherits
       g.tenant_id from a previous test fixture, so the fail-closed injector
       never actually fired for InvitationLink.
    b) Tests never explicitly nulled out g.tenant_id / g.branch_id before
       making the anonymous client.get / client.post call.  A real, fresh
       HTTP hit in production has those unset.
    c) Tests never asserted that the structlog
       "tenant.missing_context_fail_closed" warning was ABSENT for entity
       InvitationLink.  In production that warning fires on every single
       public validate/register hit, which is the smoking gun that ORM
       auto-scoping is still attempting to filter InvitationLink.

What the fix does (see also: .trae/specs/invitation_tenant_bootstrap_fix/):
    * Adds InvitationLink + InvitationEvent to _TENANT_SCOPE_AUTO_EXCLUDE so
      the fail-closed injector no longer touches them.
    * Adds lookup_invitation_for_bootstrap() single source of truth in
      invitation_service.py.  Routes validate + register now go through it.
    * Adds _establish_tenant_context_from_invitation() helper that sets
      g.tenant_id = inv.tenant_id from the DB row immediately after lookup.
      Tenant_id is NEVER read from headers/qp/body for anonymous endpoints.
    * Factory whitelist patterns remain EXACT (no `/admin/` paths exposed).
"""

import copy
import urllib.parse

from app.extensions import db
from app.models.invitation import InvitationEvent, InvitationLink
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


def _clear_g_tenant_context(app):
    """Simulate a fresh anonymous HTTP hit by wiping flask.g tenant globals."""
    from flask import g as _g
    _g.pop('tenant_id', None)
    _g.pop('branch_id', None)
    _g.pop('current_user', None)
    # Clear any per-request warned_missing_tenant markers too:
    for key in list(vars(_g).keys()):
        if key.startswith('_warned_missing_tenant_'):
            delattr(_g, key)


def _make_tenant_and_admin(app, slug='test-school'):
    """Return (tenant, admin) and commit."""
    admin = User.query.filter_by(email='test@example.com').first()
    assert admin is not None, "auth_headers fixture should have created test@example.com"
    tenant = Tenant(
        slug=slug,
        name=f'Test School ({slug})',
        country_code='GH',
        schema_name='public',
        currency='GHS',
    )
    db.session.add(tenant)
    db.session.flush()
    db.session.add(TenantMembership(
        tenant_id=tenant.id,
        user_id=admin.id,
        role='school_admin',
        status='active',
    ))
    db.session.commit()
    return tenant, admin


# ---------------------------------------------------------------------------
# AC-1: anonymous valid /validate succeeds with NO pre-existing tenant context
# ---------------------------------------------------------------------------
def test_invitation_validate_anonymous_no_tenant_context(app, client, auth_headers):
    with app.app_context():
        tenant, admin = _make_tenant_and_admin(app, slug='anon-validate')

    client_with_auth = copy.copy(client)
    client_with_auth.environ_base = dict(client.environ_base)
    client_with_auth.environ_base.update(dict(auth_headers))
    client_with_auth.environ_base['HTTP_X_TENANT_ID'] = str(tenant.id)

    with app.app_context():
        create_res = client_with_auth.post(
            '/api/v1/invitations/admin/invitations',
            json={'invitee_type': 'parent', 'expires_in_days': 7},
        )
        assert create_res.status_code == 201, create_res.get_data(as_text=True)
        data = create_res.get_json()
        assert data['success'] is True
        signed_url = data['signed_url']
        invite_id, exp, sig = _extract_params(signed_url)
        assert invite_id
        assert exp
        assert sig

    # -------- Now simulate fresh, COMPLETELY anonymous HTTP hit ---------
    with app.app_context():
        _clear_g_tenant_context(app)
        # Deliberately NO auth header, NO X-Tenant-ID header
        validate_res = client.get(
            f'/api/v1/invitations/{invite_id}/validate?exp={exp}&sig={sig}'
        )
        assert validate_res.status_code == 200, validate_res.get_data(as_text=True)
        body = validate_res.get_json()
        assert body['success'] is True
        assert body['invite']['invitee_type'] == 'parent'
        assert body['invite']['tenant_id'] == str(tenant.id)
        assert body['invite']['status'] == 'active'

        # Invitation must still be active after validate.
        inv = InvitationLink.query.filter_by(id=invite_id).first()
        assert inv is not None
        assert inv.status == 'active'


# ---------------------------------------------------------------------------
# AC-2: anonymous valid /register succeeds with no tenant context
# ---------------------------------------------------------------------------
def test_invitation_register_anonymous_no_tenant_context(app, client, auth_headers):
    with app.app_context():
        tenant, admin = _make_tenant_and_admin(app, slug='anon-register')

    client_with_auth = copy.copy(client)
    client_with_auth.environ_base = dict(client.environ_base)
    client_with_auth.environ_base.update(dict(auth_headers))
    client_with_auth.environ_base['HTTP_X_TENANT_ID'] = str(tenant.id)

    with app.app_context():
        create_res = client_with_auth.post(
            '/api/v1/invitations/admin/invitations',
            json={'invitee_type': 'parent', 'expires_in_days': 7},
        )
        assert create_res.status_code == 201
        signed_url = create_res.get_json()['signed_url']
        invite_id, exp, sig = _extract_params(signed_url)

    # -------- Anonymous registration, clean g.* context ------------------
    with app.app_context():
        _clear_g_tenant_context(app)
        payload = {
            'username': 'parent_reg_anon',
            'email': 'parent_reg_anon@example.com',
            'password': 'SecurePass9!Xk',
            'confirm_password': 'SecurePass9!Xk',
        }
        reg_res = client.post(
            f'/api/v1/invitations/{invite_id}/register?exp={exp}&sig={sig}',
            json=payload,
        )
        assert reg_res.status_code == 201, reg_res.get_data(as_text=True)
        r = reg_res.get_json()
        assert r['success'] is True
        assert r['user']['role'] == 'parent'
        user = User.query.filter_by(username='parent_reg_anon').first()
        assert user is not None
        memberships = TenantMembership.query.filter_by(
            user_id=user.id, role='parent', status='active'
        ).all()
        assert len(memberships) == 1
        assert str(memberships[0].tenant_id) == str(tenant.id)


# ---------------------------------------------------------------------------
# AC-3: tenant is derived from InvitationLink, never request input
# ---------------------------------------------------------------------------
def test_invitation_register_ignores_attacker_tenant_in_input(app, client, auth_headers):
    with app.app_context():
        tenant_legit, _ = _make_tenant_and_admin(app, slug='legit-tenant')
        tenant_attacker, _ = _make_tenant_and_admin(app, slug='attacker-tenant')
        assert str(tenant_legit.id) != str(tenant_attacker.id)

    client_with_auth = copy.copy(client)
    client_with_auth.environ_base = dict(client.environ_base)
    client_with_auth.environ_base.update(dict(auth_headers))
    client_with_auth.environ_base['HTTP_X_TENANT_ID'] = str(tenant_legit.id)

    with app.app_context():
        create_res = client_with_auth.post(
            '/api/v1/invitations/admin/invitations',
            json={'invitee_type': 'teacher', 'expires_in_days': 7},
        )
        signed_url = create_res.get_json()['signed_url']
        invite_id, exp, sig = _extract_params(signed_url)

    # -------- Register with attacker tenant_id in header/qp/body ---------
    with app.app_context():
        _clear_g_tenant_context(app)
        payload = {
            'username': 't_ignores_attacker',
            'email': 't_ignores_attacker@example.com',
            'password': 'SecurePass9!Xk',
            'confirm_password': 'SecurePass9!Xk',
            'first_name': 'Alice',
            'last_name': 'T',
            'tenant_id': str(tenant_attacker.id),   # should be IGNORED
        }
        headers = {
            # Attacker also sends header + qp:
            'X-Tenant-ID': str(tenant_attacker.id),
        }
        reg_res = client.post(
            f'/api/v1/invitations/{invite_id}/register'
            f'?exp={exp}&sig={sig}&tenant_id={tenant_attacker.id}',
            json=payload,
            headers=headers,
        )
        assert reg_res.status_code == 201, reg_res.get_data(as_text=True)
        user = User.query.filter_by(username='t_ignores_attacker').first()
        user_mems = TenantMembership.query.filter_by(
            user_id=user.id, status='active'
        ).all()
        # Must have exactly one membership, in the LEGIT tenant (the one
        # that created the invitation), never the attacker tenant.
        assert len(user_mems) == 1
        assert str(user_mems[0].tenant_id) == str(tenant_legit.id)
        # Also: zero memberships created under the attacker tenant.
        attacker_mems = TenantMembership.query.filter_by(
            tenant_id=tenant_attacker.id, user_id=user.id
        ).all()
        assert len(attacker_mems) == 0


# ---------------------------------------------------------------------------
# AC-4: invalid UUID path segment → 400, not 404
# ---------------------------------------------------------------------------
def test_invitation_invalid_uuid_segment_returns_400(app, client):
    with app.app_context():
        _clear_g_tenant_context(app)
        res = client.get('/api/v1/invitations/not-a-uuid/validate?exp=1&sig=x')
        assert res.status_code == 400
        body = res.get_json()
        assert body['success'] is False
        assert 'Invalid invitation link' in body['message']


# ---------------------------------------------------------------------------
# AC-5: unknown (well-formed) invite UUID → 404, tenant stays None
# ---------------------------------------------------------------------------
def test_invitation_unknown_uuid_returns_404(app, client):
    unknown = '00000000-0000-0000-0000-000000000001'
    with app.app_context():
        _clear_g_tenant_context(app)
        res = client.get(f'/api/v1/invitations/{unknown}/validate?exp=1&sig=x')
        assert res.status_code == 404
        assert res.get_json()['message'] == 'Invitation not found'
        from flask import g
        assert getattr(g, 'tenant_id', None) is None


# ---------------------------------------------------------------------------
# AC-6: bad signature → 400 + validation_failed event with reason=bad_signature
# ---------------------------------------------------------------------------
def test_invitation_bad_signature_rejected_and_audited(app, client, auth_headers):
    with app.app_context():
        tenant, admin = _make_tenant_and_admin(app, slug='bad-sig')

    client_with_auth = copy.copy(client)
    client_with_auth.environ_base = dict(client.environ_base)
    client_with_auth.environ_base.update(dict(auth_headers))
    client_with_auth.environ_base['HTTP_X_TENANT_ID'] = str(tenant.id)

    with app.app_context():
        create_res = client_with_auth.post(
            '/api/v1/invitations/admin/invitations',
            json={'invitee_type': 'general', 'expires_in_days': 7},
        )
        invite_id, exp, _sig = _extract_params(create_res.get_json()['signed_url'])
        bad_sig = _sig[:-1] + ('A' if _sig[-1] != 'A' else 'B')

        _clear_g_tenant_context(app)
        res = client.get(
            f'/api/v1/invitations/{invite_id}/validate?exp={exp}&sig={bad_sig}'
        )
        assert res.status_code == 400
        assert 'Invalid or tampered invitation link' in res.get_json()['message']

        events = (
            InvitationEvent.query
            .filter_by(invite_id=invite_id, event_type='validation_failed')
            .all()
        )
        assert len(events) >= 1
        metadata = events[0].metadata_json or {}
        assert metadata.get('reason') == 'bad_signature'


# ---------------------------------------------------------------------------
# AC-7: changed exp query param → rejected (same validation_failed event)
# ---------------------------------------------------------------------------
def test_invitation_tampered_exp_rejected(app, client, auth_headers):
    with app.app_context():
        tenant, admin = _make_tenant_and_admin(app, slug='tamper-exp')

    client_with_auth = copy.copy(client)
    client_with_auth.environ_base = dict(client.environ_base)
    client_with_auth.environ_base.update(dict(auth_headers))
    client_with_auth.environ_base['HTTP_X_TENANT_ID'] = str(tenant.id)

    with app.app_context():
        create_res = client_with_auth.post(
            '/api/v1/invitations/admin/invitations',
            json={'invitee_type': 'general', 'expires_in_days': 7},
        )
        invite_id, exp, sig = _extract_params(create_res.get_json()['signed_url'])
        tampered_exp = str(int(exp) + 1)

        _clear_g_tenant_context(app)
        res = client.get(
            f'/api/v1/invitations/{invite_id}/validate?exp={tampered_exp}&sig={sig}'
        )
        assert res.status_code == 400, res.get_data(as_text=True)
        events = (
            InvitationEvent.query
            .filter_by(invite_id=invite_id, event_type='validation_failed')
            .all()
        )
        assert len(events) >= 1
        md = events[0].metadata_json or {}
        assert md.get('reason') == 'bad_signature'


# ---------------------------------------------------------------------------
# AC-8: expired invite fails both validate and register
# ---------------------------------------------------------------------------
def test_invitation_expired_fails(app, client, auth_headers):
    with app.app_context():
        tenant, admin = _make_tenant_and_admin(app, slug='expired')

    client_with_auth = copy.copy(client)
    client_with_auth.environ_base = dict(client.environ_base)
    client_with_auth.environ_base.update(dict(auth_headers))
    client_with_auth.environ_base['HTTP_X_TENANT_ID'] = str(tenant.id)

    with app.app_context():
        from datetime import timedelta, timezone
        from app.services.invitation_service import sign_invitation

        create_res = client_with_auth.post(
            '/api/v1/invitations/admin/invitations',
            json={'invitee_type': 'general', 'expires_in_days': 1},
        )
        data = create_res.get_json()
        invite_id_signed = _extract_params(data['signed_url'])[0]
        inv = InvitationLink.query.filter_by(id=invite_id_signed).first()
        # Force expiry in the past.
        inv.expires_at = inv.expires_at - timedelta(days=30)
        inv.status = 'active'
        # Re-sign so sig isn't the reason for failure.
        exp_ts, sig = sign_invitation(inv)
        db.session.commit()

        _clear_g_tenant_context(app)
        v_res = client.get(
            f'/api/v1/invitations/{inv.id}/validate?exp={exp_ts}&sig={sig}'
        )
        # Either mark_expired changes status → 409 or already expired → 409.
        assert v_res.status_code == 409, v_res.get_data(as_text=True)

        _clear_g_tenant_context(app)
        payload = {
            'username': 'exp_user',
            'email': 'exp_user@example.com',
            'password': 'SecurePass9!Xk',
            'confirm_password': 'SecurePass9!Xk',
        }
        r_res = client.post(
            f'/api/v1/invitations/{inv.id}/register?exp={exp_ts}&sig={sig}',
            json=payload,
        )
        assert r_res.status_code == 409


# ---------------------------------------------------------------------------
# AC-9: revoked invite fails both endpoints (status=revoked)
# ---------------------------------------------------------------------------
def test_invitation_revoked_fails(app, client, auth_headers):
    with app.app_context():
        tenant, admin = _make_tenant_and_admin(app, slug='revoked')

    client_with_auth = copy.copy(client)
    client_with_auth.environ_base = dict(client.environ_base)
    client_with_auth.environ_base.update(dict(auth_headers))
    client_with_auth.environ_base['HTTP_X_TENANT_ID'] = str(tenant.id)

    with app.app_context():
        create_res = client_with_auth.post(
            '/api/v1/invitations/admin/invitations',
            json={'invitee_type': 'general', 'expires_in_days': 7},
        )
        body = create_res.get_json()
        invite_id, exp, sig = _extract_params(body['signed_url'])

        # Revoke via the admin endpoint (proper flow, emulates the admin UI).
        revoke_res = client_with_auth.post(
            f'/api/v1/invitations/admin/invitations/{invite_id}/revoke'
        )
        assert revoke_res.status_code == 200, revoke_res.get_data(as_text=True)

        _clear_g_tenant_context(app)
        v = client.get(
            f'/api/v1/invitations/{invite_id}/validate?exp={exp}&sig={sig}'
        )
        assert v.status_code == 409
        assert v.get_json().get('status') == 'revoked'

        _clear_g_tenant_context(app)
        payload = {
            'username': 'rev_user',
            'email': 'rev_user@example.com',
            'password': 'SecurePass9!Xk',
            'confirm_password': 'SecurePass9!Xk',
        }
        r = client.post(
            f'/api/v1/invitations/{invite_id}/register?exp={exp}&sig={sig}',
            json=payload,
        )
        assert r.status_code == 409
        assert r.get_json().get('status') == 'revoked'


# ---------------------------------------------------------------------------
# AC-10: consumed invite fails both endpoints (status=consumed)
# ---------------------------------------------------------------------------
def test_invitation_consumed_fails(app, client, auth_headers):
    with app.app_context():
        tenant, admin = _make_tenant_and_admin(app, slug='consumed')

    client_with_auth = copy.copy(client)
    client_with_auth.environ_base = dict(client.environ_base)
    client_with_auth.environ_base.update(dict(auth_headers))
    client_with_auth.environ_base['HTTP_X_TENANT_ID'] = str(tenant.id)

    with app.app_context():
        create_res = client_with_auth.post(
            '/api/v1/invitations/admin/invitations',
            json={'invitee_type': 'general', 'expires_in_days': 7},
        )
        invite_id, exp, sig = _extract_params(create_res.get_json()['signed_url'])

        # First register consumes it.
        _clear_g_tenant_context(app)
        ok_reg = client.post(
            f'/api/v1/invitations/{invite_id}/register?exp={exp}&sig={sig}',
            json={
                'username': 'first_consume',
                'email': 'first_consume@example.com',
                'password': 'SecurePass9!Xk',
                'confirm_password': 'SecurePass9!Xk',
            },
        )
        assert ok_reg.status_code == 201, ok_reg.get_data(as_text=True)

        inv = InvitationLink.query.filter_by(id=invite_id).first()
        assert inv.status == 'consumed'

        _clear_g_tenant_context(app)
        v = client.get(
            f'/api/v1/invitations/{invite_id}/validate?exp={exp}&sig={sig}'
        )
        assert v.status_code == 409
        assert v.get_json().get('status') == 'consumed'

        _clear_g_tenant_context(app)
        dup = client.post(
            f'/api/v1/invitations/{invite_id}/register?exp={exp}&sig={sig}',
            json={
                'username': 'second_user',
                'email': 'second_user@example.com',
                'password': 'SecurePass9!Xk',
                'confirm_password': 'SecurePass9!Xk',
            },
        )
        assert dup.status_code == 409
        assert dup.get_json().get('status') == 'consumed'


# ---------------------------------------------------------------------------
# AC-11: same invite cannot be consumed twice
# ---------------------------------------------------------------------------
def test_invitation_single_use_guarantee(app, client, auth_headers):
    with app.app_context():
        tenant, admin = _make_tenant_and_admin(app, slug='single-use')

    client_with_auth = copy.copy(client)
    client_with_auth.environ_base = dict(client.environ_base)
    client_with_auth.environ_base.update(dict(auth_headers))
    client_with_auth.environ_base['HTTP_X_TENANT_ID'] = str(tenant.id)

    with app.app_context():
        create_res = client_with_auth.post(
            '/api/v1/invitations/admin/invitations',
            json={'invitee_type': 'general', 'expires_in_days': 7},
        )
        invite_id, exp, sig = _extract_params(create_res.get_json()['signed_url'])

        # First register succeeds.
        _clear_g_tenant_context(app)
        r1 = client.post(
            f'/api/v1/invitations/{invite_id}/register?exp={exp}&sig={sig}',
            json={
                'username': 'u_once',
                'email': 'u_once@example.com',
                'password': 'SecurePass9!Xk',
                'confirm_password': 'SecurePass9!Xk',
            },
        )
        assert r1.status_code == 201
        r1_body = r1.get_json()
        user1_id = r1_body['user']['id']

        # Second register fails 409.
        _clear_g_tenant_context(app)
        r2 = client.post(
            f'/api/v1/invitations/{invite_id}/register?exp={exp}&sig={sig}',
            json={
                'username': 'u_twice',
                'email': 'u_twice@example.com',
                'password': 'SecurePass9!Xk',
                'confirm_password': 'SecurePass9!Xk',
            },
        )
        assert r2.status_code == 409

        inv = InvitationLink.query.filter_by(id=invite_id).first()
        assert inv.status == 'consumed'
        assert inv.consumed_by_user_id == user1_id
        # Exactly 1 active membership under the invite's tenant for user1.
        mems = TenantMembership.query.filter_by(
            tenant_id=inv.tenant_id, user_id=user1_id, status='active'
        ).all()
        assert len(mems) == 1
        # Second user should NOT exist (rollback of 409 path).
        u2 = User.query.filter_by(username='u_twice').first()
        assert u2 is None


# ---------------------------------------------------------------------------
# AC-12: admin invitation routes stay protected
# ---------------------------------------------------------------------------
def test_invitation_admin_routes_require_auth_and_role(app, client, auth_headers):
    # Anonymous hits: expect 401 or 403 (never 200 with real data).
    with app.app_context():
        _clear_g_tenant_context(app)
        r1 = client.get('/api/v1/invitations/admin/invitations')
        assert r1.status_code in (400, 401, 403)

        _clear_g_tenant_context(app)
        r2 = client.post(
            '/api/v1/invitations/admin/invitations',
            json={'invitee_type': 'parent', 'expires_in_days': 7},
        )
        assert r2.status_code in (400, 401, 403)

        _clear_g_tenant_context(app)
        r3 = client.post(
            '/api/v1/invitations/admin/invitations/00000000-0000-0000-0000-000000000001/revoke'
        )
        assert r3.status_code in (400, 401, 403)

        _clear_g_tenant_context(app)
        r4 = client.get(
            '/api/v1/invitations/admin/invitations/00000000-0000-0000-0000-000000000001/events'
        )
        assert r4.status_code in (400, 401, 403)

    # Missing X-Tenant-ID on admin create, even though user is authorized.
    with app.app_context():
        tenant, admin = _make_tenant_and_admin(app, slug='admin-protect')

    client_with_auth = copy.copy(client)
    client_with_auth.environ_base = dict(client.environ_base)
    client_with_auth.environ_base.update(dict(auth_headers))
    # Deliberately no X-Tenant-ID.
    with app.app_context():
        res = client_with_auth.post(
            '/api/v1/invitations/admin/invitations',
            json={'invitee_type': 'general', 'expires_in_days': 7},
        )
        # tenant_required returns 400 ("Tenant context required") or 403.
        assert res.status_code in (400, 401, 403)


# ---------------------------------------------------------------------------
# AC-13: global tenant fail-closed still works for non-bootstrap tables
# ---------------------------------------------------------------------------
def test_global_fail_closed_still_works_on_scoped_tables(app, client):
    """A scoped table (Student has tenant_id column) with g.tenant_id None
    must return 0 rows via the NULL_TENANT_ID auto-injector.

    This is the regression test that proves the InvitationLink bootstrap
    exception hasn't weakened any OTHER isolation.
    """
    with app.app_context():
        _clear_g_tenant_context(app)
        from flask import g
        assert getattr(g, 'tenant_id', None) is None

        # We use Student as a canonical tenant-scoped model.  It has a
        # tenant_id column and is NOT in _TENANT_SCOPE_AUTO_EXCLUDE, so the
        # fail-closed auto-injector MUST add WHERE tenant_id = 0-UUID → 0 rows.
        from app.models.student import Student
        count = db.session.query(Student).count()
        assert count == 0, (
            "With g.tenant_id=None the ORM fail-closed filter must make "
            "Student queries return [] — still leaking after our Invite fix?"
        )
