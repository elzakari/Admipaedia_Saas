from datetime import date, datetime

from flask_jwt_extended import create_access_token

from app.models.dashboard import Notification
from app.models.exam import Exam
from app.models.grade import Grade
from app.models.parent import Parent
from app.models.student import Student
from app.models.class_ import Class
from app.models.subject import Subject
from app.models.tenant import Tenant, TenantMembership


def _auth_headers(token: str, tenant_id) -> dict:
    return {
        "Authorization": f"Bearer {token}",
        "X-Tenant-ID": str(tenant_id),
    }


def test_parent_can_access_owned_child_dashboard(client, db_session, sample_tenant, user_factory):
    parent_user = user_factory("parent")
    child_user = user_factory("student")

    db_session.add(TenantMembership(tenant_id=sample_tenant.id, user_id=parent_user.id, role="parent", status="active"))
    db_session.add(TenantMembership(tenant_id=sample_tenant.id, user_id=child_user.id, role="student", status="active"))
    db_session.flush()

    parent_profile = Parent(tenant_id=sample_tenant.id, user_id=parent_user.id)
    db_session.add(parent_profile)
    db_session.flush()

    child = Student(
        tenant_id=sample_tenant.id,
        user_id=child_user.id,
        parent_id=parent_profile.id,
        admission_number="PORTAL-OWNED-001",
        first_name="Owned",
        last_name="Child",
        date_of_birth=date(2010, 1, 1),
        gender="male",
        email=child_user.email,
        status="active",
    )
    db_session.add(child)
    db_session.commit()

    token = create_access_token(identity=parent_user.id)
    response = client.get(
        f"/api/v1/portal/child/{child.id}/dashboard",
        headers=_auth_headers(token, sample_tenant.id),
    )

    assert response.status_code == 200
    assert response.json["success"] is True
    assert response.json["data"]["student"]["id"] == child.id


def test_parent_cannot_access_unowned_child_dashboard(client, db_session, sample_tenant, user_factory):
    parent_user = user_factory("parent")
    other_parent_user = user_factory("parent")
    child_user = user_factory("student")

    db_session.add_all([
        TenantMembership(tenant_id=sample_tenant.id, user_id=parent_user.id, role="parent", status="active"),
        TenantMembership(tenant_id=sample_tenant.id, user_id=other_parent_user.id, role="parent", status="active"),
        TenantMembership(tenant_id=sample_tenant.id, user_id=child_user.id, role="student", status="active"),
    ])
    db_session.flush()

    requesting_parent = Parent(tenant_id=sample_tenant.id, user_id=parent_user.id)
    actual_parent = Parent(tenant_id=sample_tenant.id, user_id=other_parent_user.id)
    db_session.add_all([requesting_parent, actual_parent])
    db_session.flush()

    child = Student(
        tenant_id=sample_tenant.id,
        user_id=child_user.id,
        parent_id=actual_parent.id,
        admission_number="PORTAL-FOREIGN-001",
        first_name="Foreign",
        last_name="Child",
        date_of_birth=date(2011, 2, 2),
        gender="female",
        email=child_user.email,
        status="active",
    )
    db_session.add(child)
    db_session.commit()

    token = create_access_token(identity=parent_user.id)
    response = client.get(
        f"/api/v1/portal/child/{child.id}/dashboard",
        headers=_auth_headers(token, sample_tenant.id),
    )

    assert response.status_code == 403
    assert response.json["success"] is False
    assert "not authorized" in response.json["message"].lower()


def test_parent_children_are_scoped_to_requested_tenant(client, db_session, sample_tenant, user_factory):
    parent_user = user_factory("parent")
    child_user = user_factory("student")

    second_tenant = Tenant(
        slug="portal-tenant-b",
        name="Portal Tenant B",
        country_code="GH",
        schema_name="portal_tenant_b",
        currency="GHS",
    )
    db_session.add(second_tenant)
    db_session.flush()

    db_session.add_all([
        TenantMembership(tenant_id=sample_tenant.id, user_id=parent_user.id, role="parent", status="active"),
        TenantMembership(tenant_id=second_tenant.id, user_id=parent_user.id, role="parent", status="active"),
        TenantMembership(tenant_id=sample_tenant.id, user_id=child_user.id, role="student", status="active"),
    ])
    db_session.flush()

    tenant_a_parent = Parent(tenant_id=sample_tenant.id, user_id=parent_user.id)
    db_session.add(tenant_a_parent)
    db_session.flush()

    db_session.add(Student(
        tenant_id=sample_tenant.id,
        user_id=child_user.id,
        parent_id=tenant_a_parent.id,
        admission_number="PORTAL-TENANT-A-001",
        first_name="Tenant",
        last_name="Alpha",
        date_of_birth=date(2010, 3, 3),
        gender="male",
        email=child_user.email,
        status="active",
    ))
    db_session.commit()

    token = create_access_token(identity=parent_user.id)
    sample_response = client.get(
        "/api/v1/portal/children",
        headers=_auth_headers(token, sample_tenant.id),
    )
    second_tenant_response = client.get(
        "/api/v1/portal/children",
        headers=_auth_headers(token, second_tenant.id),
    )

    assert sample_response.status_code == 200
    assert sample_response.json["success"] is True
    assert len(sample_response.json["children"]) == 1
    assert sample_response.json["children"][0]["admission_number"] == "PORTAL-TENANT-A-001"

    assert second_tenant_response.status_code == 404
    assert second_tenant_response.json["success"] is False
    assert "parent profile not found" in second_tenant_response.json["message"].lower()


def test_parent_can_mark_own_notification_as_read(client, db_session, sample_tenant, user_factory):
    parent_user = user_factory("parent")

    db_session.add(TenantMembership(tenant_id=sample_tenant.id, user_id=parent_user.id, role="parent", status="active"))
    db_session.add(Parent(tenant_id=sample_tenant.id, user_id=parent_user.id))
    db_session.flush()

    notification = Notification(
        title="Portal Update",
        message="A new assignment has been posted.",
        type="info",
        recipient_id=parent_user.id,
        user_id=parent_user.id,
        read=False,
        scope="parents",
    )
    db_session.add(notification)
    db_session.commit()

    token = create_access_token(identity=parent_user.id)
    response = client.put(
        f"/api/v1/parents/notifications/{notification.id}/read",
        headers=_auth_headers(token, sample_tenant.id),
    )

    db_session.refresh(notification)

    assert response.status_code == 200
    assert response.json["success"] is True
    assert notification.read is True


def test_parent_grades_route_supports_subject_filter(client, db_session, sample_tenant, user_factory):
    parent_user = user_factory("parent")
    student_user = user_factory("student")
    teacher_user = user_factory("teacher")

    db_session.add_all([
        TenantMembership(tenant_id=sample_tenant.id, user_id=parent_user.id, role="parent", status="active"),
        TenantMembership(tenant_id=sample_tenant.id, user_id=student_user.id, role="student", status="active"),
        TenantMembership(tenant_id=sample_tenant.id, user_id=teacher_user.id, role="teacher", status="active"),
    ])
    db_session.flush()

    parent_profile = Parent(tenant_id=sample_tenant.id, user_id=parent_user.id)
    db_session.add(parent_profile)
    db_session.flush()

    class_obj = Class(
        tenant_id=sample_tenant.id,
        name="Portal Grade Class",
        grade_level="Primary 4",
        academic_year="2024/2025",
        status="active",
    )
    db_session.add(class_obj)
    db_session.flush()

    maths = Subject(tenant_id=sample_tenant.id, name="Mathematics", code="PORTAL-MATH")
    science = Subject(tenant_id=sample_tenant.id, name="Science", code="PORTAL-SCI")
    db_session.add_all([maths, science])
    db_session.flush()

    student = Student(
        tenant_id=sample_tenant.id,
        user_id=student_user.id,
        parent_id=parent_profile.id,
        class_id=class_obj.id,
        admission_number="PORTAL-GRADE-001",
        first_name="Grade",
        last_name="Student",
        date_of_birth=date(2010, 5, 5),
        gender="male",
        email=student_user.email,
        status="active",
    )
    db_session.add(student)
    db_session.flush()

    maths_exam = Exam(
        title="Math Quiz",
        exam_date=datetime(2024, 6, 1, 9, 0, 0),
        duration=60,
        total_marks=100,
        passing_marks=50,
        class_id=class_obj.id,
        subject_id=maths.id,
        created_by=teacher_user.id,
        status="completed",
    )
    science_exam = Exam(
        title="Science Quiz",
        exam_date=datetime(2024, 6, 2, 9, 0, 0),
        duration=60,
        total_marks=100,
        passing_marks=50,
        class_id=class_obj.id,
        subject_id=science.id,
        created_by=teacher_user.id,
        status="completed",
    )
    db_session.add_all([maths_exam, science_exam])
    db_session.flush()

    db_session.add_all([
        Grade(
            student_id=student.id,
            exam_id=maths_exam.id,
            marks_obtained=88,
            percentage=88,
            graded_by=teacher_user.id,
            subject_id=maths.id,
            class_id=class_obj.id,
            assessment_type="exam",
        ),
        Grade(
            student_id=student.id,
            exam_id=science_exam.id,
            marks_obtained=72,
            percentage=72,
            graded_by=teacher_user.id,
            subject_id=science.id,
            class_id=class_obj.id,
            assessment_type="exam",
        ),
    ])
    db_session.commit()

    token = create_access_token(identity=parent_user.id)
    response = client.get(
        f"/api/v1/parents/children/{student.id}/grades",
        headers=_auth_headers(token, sample_tenant.id),
        query_string={"subject_id": maths.id},
    )

    assert response.status_code == 200
    assert response.json["success"] is True
    assert len(response.json["data"]["grades"]) == 1
    assert response.json["data"]["grades"][0]["exam_id"] == maths_exam.id
