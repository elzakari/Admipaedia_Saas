import uuid
import pytest
from unittest.mock import patch
from app.extensions import db
from app.models.class_ import Class
from app.models.subject import Subject
from app.models.tenant import Tenant
from app.models.grading_system import GradingScheme
from tests.test_production_integration import (
    create_test_tenant,
    create_test_user,
    create_test_membership
)

def setup_teacher_permissions(db_session, user):
    from app.services.rbac_service import RBACService
    from app.models.rbac import RBACRole, RBACPermission
    
    RBACService.initialize_default_permissions()
    
    teacher_role = RBACRole.query.filter_by(name='teacher').first()
    if not teacher_role:
        RBACService.initialize_default_roles()
        teacher_role = RBACRole.query.filter_by(name='teacher').first()
        
    for perm_name in ['class.read', 'subject.read']:
        perm = RBACPermission.query.filter_by(name=perm_name).first()
        if perm and perm not in teacher_role.permissions:
            teacher_role.permissions.append(perm)
            
    RBACService.assign_role_to_user(
        user_id=user.id,
        role_name='teacher',
        assigned_by=user.id
    )
    db_session.commit()

def test_grading_scheme_exception_fallback(app, client, db_session):
    """Verify that academics/grading-scheme endpoint returns fallback payload on DB exception/anomaly."""
    with app.app_context():
        tenant = create_test_tenant(db_session)
        user = create_test_user(db_session, f"t_{uuid.uuid4().hex[:6]}@example.com", 'teacher', tenant.id)
        create_test_membership(db_session, tenant.id, user.id, 'teacher')
        
        setup_teacher_permissions(db_session, user)

        login_resp = client.post('/api/v1/auth/login', json={
            'email': user.email,
            'password': 'Password123!'
        })
        token = login_resp.json['access_token']
        headers = {
            'Authorization': f'Bearer {token}',
            'X-Tenant-ID': str(tenant.id)
        }

        # Mock GradingScheme.query.filter_by to raise an exception
        with patch('app.models.grading_system.GradingScheme.query') as mock_query:
            mock_query.filter_by.side_effect = Exception("Simulated DB connection failure")

            resp = client.get('/api/v1/academics/grading-scheme', headers=headers)
            
            # Assert route caught the exception defensively and returned 200 with standard fallback
            assert resp.status_code == 200
            assert resp.json['success'] is True
            assert resp.json['maximum_grade'] == 100
            assert resp.json['passing_grade'] == 50
            assert resp.json['boundaries'] == []
            assert resp.json['gradingScheme'] == []

def test_subjects_class_resilient_fallback(app, client, db_session):
    """Verify that subject endpoints fall back to returning active subjects when class mapping is empty."""
    with app.app_context():
        tenant = create_test_tenant(db_session)
        user = create_test_user(db_session, f"t_{uuid.uuid4().hex[:6]}@example.com", 'teacher', tenant.id)
        create_test_membership(db_session, tenant.id, user.id, 'teacher')
        
        setup_teacher_permissions(db_session, user)
        
        # Create active subjects
        sub1 = Subject(name='Education Moral', code='EDM101', is_active=True, tenant_id=tenant.id)
        sub2 = Subject(name='Mathematique', code='MTH101', is_active=True, tenant_id=tenant.id)
        sub3 = Subject(name='Science', code='SCI101', is_active=True, tenant_id=tenant.id)
        db_session.add_all([sub1, sub2, sub3])
        
        # Create class with no subjects assigned
        c = Class(
            name=f"Class {uuid.uuid4().hex[:6]}",
            grade_level='Primary 1',
            academic_year='2024/2025',
            capacity=30,
            tenant_id=tenant.id,
            status='active'
        )
        db_session.add(c)
        db_session.flush()
        db_session.commit()

        login_resp = client.post('/api/v1/auth/login', json={
            'email': user.email,
            'password': 'Password123!'
        })
        token = login_resp.json['access_token']
        headers = {
            'Authorization': f'Bearer {token}',
            'X-Tenant-ID': str(tenant.id)
        }

        # 1. Test GET /api/v1/academics/subjects?class_id=X
        resp = client.get(f'/api/v1/academics/subjects?class_id={c.id}', headers=headers)
        assert resp.status_code == 200
        subjects = resp.json['subjects']
        subject_names = {s['name'] for s in subjects}
        assert 'Education Moral' in subject_names
        assert 'Mathematique' in subject_names
        assert 'Science' in subject_names

        # 2. Test GET /api/v1/subjects?class_id=X
        resp2 = client.get(f'/api/v1/subjects?class_id={c.id}', headers=headers)
        assert resp2.status_code == 200
        subjects2 = resp2.json['subjects']
        subject_names2 = {s['name'] for s in subjects2}
        assert 'Education Moral' in subject_names2
        assert 'Mathematique' in subject_names2
        assert 'Science' in subject_names2

        # 3. Test GET /api/v1/classes/X/subjects
        resp3 = client.get(f'/api/v1/classes/{c.id}/subjects', headers=headers)
        assert resp3.status_code == 200
        subjects3 = resp3.json['subjects']
        subject_names3 = {s['name'] for s in subjects3}
        assert 'Education Moral' in subject_names3
        assert 'Mathematique' in subject_names3
        assert 'Science' in subject_names3
