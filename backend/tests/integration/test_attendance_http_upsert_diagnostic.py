from datetime import date

from flask import g

from app.extensions import db
from app.models.attendance import Attendance
from app.services.attendance_service import AttendanceService


def test_http_bulk_upsert_request_boundary(
    app,
    tenant_branch_auth_client,
    student_factory,
    monkeypatch,
):
    """
    Diagnose the difference between:
      direct AttendanceService invocation
      and
      POST /api/v1/attendances/bulk

    No production behavior is changed.
    """

    from app.models.class_ import Class
    from app.models.subject import Subject

    with app.app_context():
        tenant_id = tenant_branch_auth_client.test_tenant_id
        branch_id = tenant_branch_auth_client.test_branch_id

        class_obj = Class(
            name="R11A2E HTTP Diagnostic",
            grade_level="Grade 11",
            academic_year="2024",
            capacity=30,
            tenant_id=tenant_id,
            branch_id=branch_id,
        )

        subject = Subject(
            name="R11A2E Subject",
            code="R11A2E",
            credit_hours=4,
            tenant_id=tenant_id,
        )

        db.session.add_all([class_obj, subject])
        db.session.commit()

        student = student_factory(
            first_name="HTTP",
            last_name="Diagnostic",
            email="r11a2e-http@test.com",
            date_of_birth=date(2007, 5, 15),
            gender="Male",
            student_id_number="R11A2E001",
            class_id=class_obj.id,
            tenant_id=tenant_id,
            branch_id=branch_id,
        )

        db.session.add(student)
        db.session.commit()

        existing = Attendance(
            student_id=student.id,
            class_id=class_obj.id,
            subject_id=subject.id,
            date=date(2024, 3, 15),
            status="absent",
            remarks="Before HTTP update",
            # Intentionally reproduce historical fixture:
            branch_id=None,
        )

        db.session.add(existing)
        db.session.commit()

        existing_id = existing.id
        student_id = student.id
        class_id = class_obj.id
        subject_id = subject.id

        print("")
        print("=" * 78)
        print("A. PRE-REQUEST DATABASE STATE")
        print("=" * 78)
        print("existing_id:", existing_id)
        print("student_id:", student_id)
        print("class_id:", class_id)
        print("subject_id:", subject_id)
        print("date:", existing.date, type(existing.date))
        print("attendance_branch:", existing.branch_id)
        print("class_branch:", class_obj.branch_id)
        print("student_branch:", student.branch_id)

    original_bulk = AttendanceService.bulk_create_attendance

    bulk_payloads = []


    def diagnostic_bulk(
        data,
        tenant_id=None,
        branch_id=None,
    ):
        """
        Diagnostic wrapper for the canonical bulk service
        contract.

        Security context is intentionally explicit so this
        test fails if the HTTP route stops forwarding tenant
        or branch ownership to the service boundary.
        """
        print("")
        print("=" * 78)
        print("C. PAYLOAD RECEIVED BY SERVICE")
        print("=" * 78)

        print("payload:", data)
        print("tenant_id:", tenant_id)
        print("branch_id:", branch_id)

        for key, value in data.items():
            print(
                f"{key}: {value!r} "
                f"type={type(value)}"
            )

        bulk_payloads.append(
            {
                "data": dict(data),
                "tenant_id": tenant_id,
                "branch_id": branch_id,
            }
        )

        return original_bulk(
            data,
            tenant_id=tenant_id,
            branch_id=branch_id,
        )


    monkeypatch.setattr(
        AttendanceService,
        "bulk_create_attendance",
        staticmethod(diagnostic_bulk),
    )

    payload = {
        "class_id": class_id,
        "subject_id": subject_id,
        "date": "2024-03-15",
        "attendances": [
            {
                "student_id": student_id,
                "status": "present",
                "remarks": "Corrected status",
            }
        ],
    }

    print("")
    print("=" * 78)
    print("D. REAL HTTP REQUEST")
    print("=" * 78)

    response = tenant_branch_auth_client.post(
        "/api/v1/attendances/bulk",
        json=payload,
    )

    print("response_status:", response.status_code)

    try:
        print("response_json:", response.get_json())
    except Exception as exc:
        print("response_json_error:", repr(exc))

    print("")
    print("=" * 78)
    print("E. POST-REQUEST DATABASE STATE")
    print("=" * 78)

    with app.app_context():
        rows = Attendance.query.filter(
            Attendance.student_id == student_id,
            Attendance.class_id == class_id,
            Attendance.date == date(2024, 3, 15),
        ).all()

        print("unique_key_row_count:", len(rows))

        for row in rows:
            print(
                "row:",
                {
                    "id": row.id,
                    "status": row.status,
                    "remarks": row.remarks,
                    "subject_id": row.subject_id,
                    "branch_id": row.branch_id,
                },
            )

    print("")
    print("=" * 78)
    print("F. DIAGNOSTIC SUMMARY")
    print("=" * 78)

    print("bulk_call_count:", len(bulk_payloads))

    # Boundary assertions:
    # Test externally meaningful upsert/security invariants,
    # not a private helper implementation.
    assert len(bulk_payloads) == 1

    bulk_call = bulk_payloads[0]

    # The real HTTP route must explicitly propagate the
    # authenticated tenant/branch boundary into the
    # canonical Attendance writer.
    assert bulk_call["tenant_id"] == tenant_id
    assert bulk_call["branch_id"] == branch_id

    # Audit identity is server-owned by the route.
    assert bulk_call["data"]["recorded_by"] is not None

    # HTTP contract.
    assert response.status_code == 201

    # Canonical identity remains exactly one row for
    # student + class + date.
    assert len(rows) == 1

    persisted = rows[0]

    # This is an UPSERT, not a duplicate insert.
    assert persisted.id == existing_id

    # Requested mutable fields were updated.
    assert persisted.status == "present"
    assert persisted.remarks == "Corrected status"

    # Historical NULL branch is progressively repaired from
    # the authoritative Class, never from arbitrary input.
    assert persisted.branch_id == branch_id

    # Actor identity is server authoritative.
    assert persisted.recorded_by == bulk_call["data"]["recorded_by"]

    # The canonical HTTP upsert boundary is expected to succeed.
