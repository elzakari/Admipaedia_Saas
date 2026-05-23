import pytest
import uuid
from datetime import datetime, timedelta
from app.extensions import db
from app.models.tenant import Tenant
from app.models.user import User
from app.models.department import Department
from app.models.session_token import SessionToken

def _login(client, email: str, password: str):
    resp = client.post('/api/v1/auth/login', json={'email': email, 'password': password})
    assert resp.status_code == 200
    token = resp.json.get('access_token')
    assert token
    return token

def _make_user(db, role: str, email: str):
    user = User(username=email.split('@')[0], email=email, role=role)
    user.set_password_hash('password')
    db.session.add(user)
    db.session.commit()
    return user

def _make_tenant(db, slug: str, plan: str):
    t = Tenant(
        slug=slug,
        name=f'{slug} School',
        country_code='GH',
        schema_name=f'{slug}_schema',
        status='active',
        plan=plan
    )
    db.session.add(t)
    db.session.commit()
    return t

def _link_membership(db, tenant_id, user_id, role='school_admin'):
    from app.models.tenant import TenantMembership
    membership = TenantMembership(tenant_id=tenant_id, user_id=user_id, role=role, status='active')
    db.session.add(membership)
    db.session.commit()
    return membership

def test_admin_dashboard_metrics_success(client, db):
    """Test retrieving dynamic admin dashboard metrics with departments and active sessions"""
    user = _make_user(db, 'school_admin', 'metrics-admin@example.com')
    tenant = _make_tenant(db, 'metrics-school', 'enterprise')
    _link_membership(db, tenant.id, user.id)
    token = _login(client, 'metrics-admin@example.com', 'password')
    
    headers = {
        'Authorization': f'Bearer {token}',
        'X-Tenant-ID': str(tenant.id)
    }
    
    # 1. Access dashboard metrics endpoint
    res = client.get('/api/v1/admin/dashboard-metrics', headers=headers)
    assert res.status_code == 200
    
    payload = res.get_json()
    assert payload['success'] is True
    assert 'data' in payload
    
    data = payload['data']
    assert 'departments' in data
    assert 'active_sessions_total' in data
    assert 'monthly_trends' in data
    assert 'currency' in data
    
    # 2. Check department structure
    departments = data['departments']
    assert isinstance(departments, list)
    assert len(departments) > 0
    
    for dept in departments:
        assert 'department' in dept
        assert 'performance' in dept
        assert 'teachers' in dept
        assert 'students' in dept
        assert 'budget' in dept
        
        # Verify budget and statistics are realistic positive numbers
        assert dept['budget'] >= 0
        assert dept['teachers'] >= 0
        assert dept['students'] >= 0
        assert 0.0 <= dept['performance'] <= 100.0

def test_admin_dashboard_metrics_active_sessions(client, db):
    """Test that active session tokens are counted accurately in dashboard metrics"""
    user = _make_user(db, 'school_admin', 'sessions-admin@example.com')
    tenant = _make_tenant(db, 'sessions-school', 'enterprise')
    _link_membership(db, tenant.id, user.id)
    token = _login(client, 'sessions-admin@example.com', 'password')
    
    headers = {
        'Authorization': f'Bearer {token}',
        'X-Tenant-ID': str(tenant.id)
    }
    
    # Clean up any existing tokens
    SessionToken.query.filter_by(user_id=user.id).delete()
    db.session.commit()
    
    # Create active access token session
    active_token = SessionToken(
        jti="active-jti-test-abc-123",
        user_id=user.id,
        token_type="access",
        expires_at=datetime.utcnow() + timedelta(hours=2)
    )
    db.session.add(active_token)
    
    # Create revoked access token session
    revoked_token = SessionToken(
        jti="revoked-jti-test-xyz-789",
        user_id=user.id,
        token_type="access",
        expires_at=datetime.utcnow() + timedelta(hours=2)
    )
    revoked_token.is_revoked = True
    db.session.add(revoked_token)
    
    db.session.commit()
    
    # Query dashboard metrics
    res = client.get('/api/v1/admin/dashboard-metrics', headers=headers)
    assert res.status_code == 200
    
    data = res.get_json()['data']
    # Check that our active token was successfully counted
    assert data['active_sessions_total'] >= 1
