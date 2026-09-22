"""
V28-R11B.3B8

Focused regression certification for advanced attendance
analytics.

Scope:
- real Attendance data JSON serialization;
- pandas/numpy scalar boundary;
- exact active-branch filtering;
- historical NULL-branch exclusion;
- foreign-branch Class rejection.

Authorization policy itself is covered separately by the
attendance security regression suites.
"""
import json
from datetime import date, timedelta
from app.extensions import db
from app.models.attendance import Attendance
from app.models.class_ import Class
from app.models.student import Student
from app.models.tenant import Branch

def test_analytics_real_data_is_json_safe_and_branch_exact(client, app, admin_headers, sample_tenant, sample_branch, sample_class, sample_student, rbac_defaults):
    with app.app_context():
        tenant_id = sample_tenant.id
        branch_id = sample_branch.id
        request_headers = dict(admin_headers)
        request_headers['X-Active-Branch-ID'] = str(branch_id)
        request_headers['X-Branch-ID'] = str(branch_id)
        class_id = sample_class.id
        student_id = sample_student.id
        school_class = Class.query.without_tenant_filter().filter_by(id=class_id, tenant_id=tenant_id).first()
        assert school_class is not None
        school_class.branch_id = branch_id
        student = Student.query.without_tenant_filter().filter_by(id=student_id, tenant_id=tenant_id).first()
        assert student is not None
        student.class_id = class_id
        student.branch_id = branch_id
        exact_date = date(2099, 1, 10)
        null_date = date(2099, 1, 11)
        Attendance.query.without_tenant_filter().filter(Attendance.student_id == student_id, Attendance.class_id == class_id, Attendance.date.in_([exact_date, null_date])).delete(synchronize_session=False)
        exact = Attendance(student_id=student_id, class_id=class_id, date=exact_date, status='present', branch_id=branch_id)
        historical_null = Attendance(student_id=student_id, class_id=class_id, date=null_date, status='absent', branch_id=None)
        db.session.add_all([exact, historical_null])
        db.session.commit()
    response = client.get(f'/api/v1/attendance/analytics?class_id={class_id}&start_date=2099-01-10&end_date=2099-01-11', headers=request_headers)
    assert response.status_code == 200, response.get_data(as_text=True)
    envelope = response.get_json()
    assert isinstance(envelope, dict)
    assert envelope.get('success') is True
    assert isinstance(envelope.get('data'), dict)
    payload = envelope['data']
    assert {'daily_stats', 'student_stats', 'overall_stats'}.issubset(payload)
    json.dumps(payload)
    student_key = str(student_id)
    assert student_key in payload['student_stats']
    student_data = payload['student_stats'][student_key]
    assert student_data['student_id'] == student_id
    overall = payload['overall_stats']
    assert overall['total_records'] == 1
    assert overall['present_records'] == 1
    assert overall['absent_records'] == 0

def test_analytics_rejects_foreign_branch_class(client, app, admin_headers, sample_tenant, sample_branch, sample_class, rbac_defaults):
    with app.app_context():
        tenant_id = sample_tenant.id
        active_branch_id = sample_branch.id
        request_headers = dict(admin_headers)
        request_headers['X-Active-Branch-ID'] = str(active_branch_id)
        request_headers['X-Branch-ID'] = str(active_branch_id)
        class_id = sample_class.id
        school_class = Class.query.without_tenant_filter().filter_by(id=class_id, tenant_id=tenant_id).first()
        assert school_class is not None
        foreign_branch = Branch.query.without_tenant_filter().filter(Branch.tenant_id == tenant_id, Branch.id != active_branch_id).first()
        if foreign_branch is None:
            foreign_branch = Branch(tenant_id=tenant_id, name='Analytics Foreign Branch', code='ANALYTICS-FOREIGN')
            db.session.add(foreign_branch)
            db.session.flush()
        foreign_branch_id = foreign_branch.id
        school_class.branch_id = foreign_branch_id
        db.session.commit()
        foreign_class_id = school_class.id
    response = client.get(f'/api/v1/attendance/analytics?class_id={foreign_class_id}', headers=request_headers)
    assert response.status_code == 400, response.get_data(as_text=True)
    error_payload = response.get_json()
    assert error_payload.get('success') is False
    assert error_payload.get('message') == 'Class not found in current tenant/branch scope'
