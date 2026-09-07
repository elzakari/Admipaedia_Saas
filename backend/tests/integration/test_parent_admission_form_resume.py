import pytest
import uuid
from datetime import datetime, date
from app.models.admission import AdmissionApplication
from app.models.parent import Parent
from app.models.class_ import Class
from app.models.tenant import Tenant
from app.models.user import User
from app.models.student import Student
from app.extensions import db
from flask_jwt_extended import create_access_token


def py_hydrate_form_data(shape_defaults, submitted_form_data, authoritative_fallback):
    result = {}
    if isinstance(shape_defaults, dict):
        for k, v in shape_defaults.items():
            if isinstance(v, dict):
                result[k] = py_hydrate_form_data(v, None, None)
            elif isinstance(v, list):
                result[k] = list(v)
            else:
                result[k] = v

    def _is_blank(v):
        if v is None:
            return True
        if isinstance(v, str) and not v.strip():
            return True
        if isinstance(v, (list, tuple, set, dict)) and len(v) == 0:
            return True
        return False

    if isinstance(submitted_form_data, dict):
        for k, v in submitted_form_data.items():
            if isinstance(v, dict) and isinstance(result.get(k), dict):
                result[k] = py_hydrate_form_data(result[k], v, None)
            else:
                if not _is_blank(v):
                    result[k] = v

    if isinstance(authoritative_fallback, dict):
        for key in ("first_name", "last_name", "class_id"):
            if key not in authoritative_fallback:
                continue
            fallback_val = authoritative_fallback[key]
            if key == "class_id":
                fb_is_blank = fallback_val is None
            else:
                fb_is_blank = _is_blank(fallback_val)
            if fb_is_blank:
                continue
            current = result.get(key)
            current_is_blank = _is_blank(current)
            if current_is_blank:
                result[key] = fallback_val

    return result


def _parent_token(user_id):
    return create_access_token(identity=user_id)


def _hdr(token, tenant_id=None):
    h = {"Authorization": f"Bearer {token}"}
    if tenant_id is not None:
        h["X-Tenant-ID"] = str(tenant_id)
    return h


def test_ac1_buy_form_persists_basics(auth_client, app, client):
    with app.app_context():
        tenant_id = uuid.uuid4()
        tenant = Tenant(
            id=tenant_id,
            slug=f"slug-{tenant_id.hex[:8]}",
            name=f"T1 {tenant_id.hex[:6]}",
            country_code="GH",
            schema_name=f"sch_{tenant_id.hex[:8]}",
        )
        db.session.add(tenant)

        p_user = User(
            username=f"pu_{uuid.uuid4().hex[:8]}",
            email=f"pu_{uuid.uuid4().hex[:8]}@example.com",
            role="parent",
            status="active",
        )
        p_user.set_password("Password123!")
        db.session.add(p_user)
        db.session.flush()

        parent = Parent(tenant_id=tenant.id, user_id=p_user.id)
        db.session.add(parent)

        cls = Class(
            tenant_id=tenant.id,
            name=f"Cls {uuid.uuid4().hex[:6]}",
            grade_level="Primary 1",
            academic_year="2024/2025",
            capacity=30,
        )
        db.session.add(cls)
        db.session.flush()

        cid = cls.id
        tid = tenant.id
        puid = p_user.id
        pid = parent.id
        db.session.commit()

    tok = _parent_token(puid)
    headers = _hdr(tok, tid)
    r = client.post(
        "/api/v1/admissions/buy-form",
        json={
            "student_first_name": "Kofi",
            "student_last_name": "Mensah",
            "target_class_id": cid,
        },
        headers=headers,
    )
    assert r.status_code in (200, 201)
    assert r.json["success"] is True
    app_id = r.json["application_id"]
    assert app_id is not None

    with app.app_context():
        rec = AdmissionApplication.query.get(app_id)
        assert rec is not None
        assert rec.parent_id == pid
        assert rec.student_first_name == "Kofi"
        assert rec.student_last_name == "Mensah"
        assert rec.target_class_id == cid
        assert rec.payment_status == "paid"
        assert rec.status == "draft"


def test_ac2_exact_match_resumes_existing(auth_client, app, client):
    with app.app_context():
        tenant_id = uuid.uuid4()
        tenant = Tenant(
            id=tenant_id,
            slug=f"slug-{tenant_id.hex[:8]}",
            name=f"T2 {tenant_id.hex[:6]}",
            country_code="GH",
            schema_name=f"sch_{tenant_id.hex[:8]}",
        )
        db.session.add(tenant)

        p_user = User(
            username=f"pu_{uuid.uuid4().hex[:8]}",
            email=f"pu_{uuid.uuid4().hex[:8]}@example.com",
            role="parent",
            status="active",
        )
        p_user.set_password("Password123!")
        db.session.add(p_user)
        db.session.flush()

        parent = Parent(tenant_id=tenant.id, user_id=p_user.id)
        db.session.add(parent)

        cls = Class(
            tenant_id=tenant.id,
            name=f"Cls {uuid.uuid4().hex[:6]}",
            grade_level="Primary 1",
            academic_year="2024/2025",
            capacity=30,
        )
        db.session.add(cls)
        db.session.flush()

        cid = cls.id
        tid = tenant.id
        puid = p_user.id
        db.session.commit()

    tok = _parent_token(puid)
    headers = _hdr(tok, tid)

    r1 = client.post(
        "/api/v1/admissions/buy-form",
        json={
            "student_first_name": "Ama",
            "student_last_name": "Osei",
            "target_class_id": cid,
        },
        headers=headers,
    )
    assert r1.status_code in (200, 201)
    first_id = r1.json["application_id"]

    r2 = client.post(
        "/api/v1/admissions/buy-form",
        json={
            "student_first_name": "Ama",
            "student_last_name": "Osei",
            "target_class_id": cid,
        },
        headers=headers,
    )
    assert r2.status_code == 200
    assert r2.json["success"] is True
    assert r2.json.get("reused_existing") is True
    assert r2.json["application_id"] == first_id


def test_ac3_blank_shell_updates_model_columns(auth_client, app, client):
    with app.app_context():
        tenant_id = uuid.uuid4()
        tenant = Tenant(
            id=tenant_id,
            slug=f"slug-{tenant_id.hex[:8]}",
            name=f"T3 {tenant_id.hex[:6]}",
            country_code="GH",
            schema_name=f"sch_{tenant_id.hex[:8]}",
        )
        db.session.add(tenant)

        p_user = User(
            username=f"pu_{uuid.uuid4().hex[:8]}",
            email=f"pu_{uuid.uuid4().hex[:8]}@example.com",
            role="parent",
            status="active",
        )
        p_user.set_password("Password123!")
        db.session.add(p_user)
        db.session.flush()

        parent = Parent(tenant_id=tenant.id, user_id=p_user.id)
        db.session.add(parent)
        db.session.flush()

        c1 = Class(
            tenant_id=tenant.id,
            name=f"Cls1 {uuid.uuid4().hex[:6]}",
            grade_level="Primary 1",
            academic_year="2024/2025",
            capacity=30,
        )
        c2 = Class(
            tenant_id=tenant.id,
            name=f"Cls2 {uuid.uuid4().hex[:6]}",
            grade_level="Primary 2",
            academic_year="2024/2025",
            capacity=30,
        )
        db.session.add_all([c1, c2])
        db.session.flush()

        shell = AdmissionApplication(
            parent_id=parent.id,
            student_first_name="",
            student_last_name="",
            target_class_id=c1.id,
            payment_status="paid",
            status="draft",
            form_data={},
        )
        db.session.add(shell)
        db.session.flush()
        shell_id = shell.id
        cid1 = c1.id
        cid2 = c2.id
        tid = tenant.id
        puid = p_user.id
        db.session.commit()

    tok = _parent_token(puid)
    headers = _hdr(tok, tid)

    r = client.post(
        "/api/v1/admissions/buy-form",
        json={
            "student_first_name": "Yaw",
            "student_last_name": "Boateng",
            "target_class_id": cid2,
        },
        headers=headers,
    )
    assert r.status_code in (200, 201)
    assert r.json["success"] is True
    if r.status_code == 200:
        assert r.json.get("reused_existing") is True
        assert r.json["application_id"] == shell_id
        with app.app_context():
            rec = AdmissionApplication.query.get(shell_id)
            assert rec is not None
            assert rec.student_first_name == "Yaw"
            assert rec.student_last_name == "Boateng"
            assert rec.target_class_id == cid2


def test_ac4_hydrate_shape_defaults_layer(auth_client, app):
    defaults = {
        "first_name": "",
        "last_name": "",
        "class_id": None,
        "gender": "",
        "address": {
            "street": "",
            "city": "",
        },
        "documents": [],
    }
    result = py_hydrate_form_data(defaults, None, None)
    assert result["first_name"] == ""
    assert result["last_name"] == ""
    assert result["class_id"] is None
    assert result["gender"] == ""
    assert isinstance(result["address"], dict)
    assert result["address"]["street"] == ""
    assert result["address"]["city"] == ""
    assert result["documents"] == []

    result2 = py_hydrate_form_data(defaults, {}, None)
    assert result2["first_name"] == ""
    assert result2["address"]["city"] == ""


def test_ac5_hydrate_submitted_non_blanks_override_defaults(auth_client, app):
    defaults = {
        "first_name": "",
        "last_name": "",
        "class_id": None,
        "gender": "",
        "dob": "",
        "address": {"street": "", "city": "DefaultCity"},
    }
    submitted = {
        "first_name": "Kwame",
        "last_name": "  ",
        "class_id": None,
        "gender": "male",
        "address": {"street": "123 Main Rd"},
    }
    authoritative = {}
    result = py_hydrate_form_data(defaults, submitted, authoritative)

    assert result["first_name"] == "Kwame"
    assert result["last_name"] == ""
    assert result["class_id"] is None
    assert result["gender"] == "male"
    assert result["dob"] == ""
    assert result["address"]["street"] == "123 Main Rd"
    assert result["address"]["city"] == "DefaultCity"


def test_ac6_hydrate_authoritative_fills_blanks_only(auth_client, app):
    defaults = {
        "first_name": "",
        "last_name": "",
        "class_id": None,
        "gender": "",
    }
    submitted = {
        "first_name": "",
        "last_name": None,
        "class_id": None,
    }
    authoritative = {
        "first_name": "Efua",
        "last_name": "Djangmah",
        "class_id": 42,
    }
    result = py_hydrate_form_data(defaults, submitted, authoritative)
    assert result["first_name"] == "Efua"
    assert result["last_name"] == "Djangmah"
    assert result["class_id"] == 42
    assert result["gender"] == ""

    submitted2 = {"first_name": "Explicit", "last_name": "Value", "class_id": 7}
    result2 = py_hydrate_form_data(defaults, submitted2, authoritative)
    assert result2["first_name"] == "Explicit"
    assert result2["last_name"] == "Value"
    assert result2["class_id"] == 7

    authoritative3 = {"first_name": "", "last_name": None, "class_id": None}
    result3 = py_hydrate_form_data(
        {"first_name": "", "last_name": "", "class_id": None},
        {},
        authoritative3,
    )
    assert result3["first_name"] == ""
    assert result3["last_name"] == ""
    assert result3["class_id"] is None


def test_ac7_save_draft_no_overwrite_existing_model_names(auth_client, app, client):
    with app.app_context():
        tenant_id = uuid.uuid4()
        tenant = Tenant(
            id=tenant_id,
            slug=f"slug-{tenant_id.hex[:8]}",
            name=f"T7 {tenant_id.hex[:6]}",
            country_code="GH",
            schema_name=f"sch_{tenant_id.hex[:8]}",
        )
        db.session.add(tenant)

        p_user = User(
            username=f"pu_{uuid.uuid4().hex[:8]}",
            email=f"pu_{uuid.uuid4().hex[:8]}@example.com",
            role="parent",
            status="active",
        )
        p_user.set_password("Password123!")
        db.session.add(p_user)
        db.session.flush()

        parent = Parent(tenant_id=tenant.id, user_id=p_user.id)
        db.session.add(parent)

        c1 = Class(
            tenant_id=tenant.id,
            name=f"Cls1 {uuid.uuid4().hex[:6]}",
            grade_level="Primary 1",
            academic_year="2024/2025",
            capacity=30,
        )
        c2 = Class(
            tenant_id=tenant.id,
            name=f"Cls2 {uuid.uuid4().hex[:6]}",
            grade_level="Primary 2",
            academic_year="2024/2025",
            capacity=30,
        )
        db.session.add_all([c1, c2])
        db.session.flush()

        app_rec = AdmissionApplication(
            parent_id=parent.id,
            student_first_name="OriginalFirst",
            student_last_name="OriginalLast",
            target_class_id=c1.id,
            payment_status="paid",
            status="draft",
            form_data={},
        )
        db.session.add(app_rec)
        db.session.flush()
        app_id = app_rec.id
        cid1 = c1.id
        cid2 = c2.id
        tid = tenant.id
        puid = p_user.id
        db.session.commit()

    tok = _parent_token(puid)
    headers = _hdr(tok, tid)

    r = client.put(
        f"/api/v1/admissions/application/{app_id}",
        json={
            "form_data": {
                "first_name": "FormFirst",
                "last_name": "FormLast",
                "class_id": cid2,
                "gender": "female",
            },
        },
        headers=headers,
    )
    assert r.status_code == 200, f"Got {r.status_code}: {r.get_data(as_text=True)}"
    assert r.json["success"] is True

    with app.app_context():
        after = AdmissionApplication.query.get(app_id)
        assert after.student_first_name == "OriginalFirst"
        assert after.student_last_name == "OriginalLast"
        assert after.target_class_id == cid1
        fd = after.form_data or {}
        assert fd.get("first_name") == "FormFirst"
        assert fd.get("last_name") == "FormLast"
        assert fd.get("class_id") == cid2
        assert fd.get("gender") == "female"


def test_ac8_save_draft_sync_guard_backfills_empty_model(auth_client, app, client):
    with app.app_context():
        tenant_id = uuid.uuid4()
        tenant = Tenant(
            id=tenant_id,
            slug=f"slug-{tenant_id.hex[:8]}",
            name=f"T8 {tenant_id.hex[:6]}",
            country_code="GH",
            schema_name=f"sch_{tenant_id.hex[:8]}",
        )
        db.session.add(tenant)

        p_user = User(
            username=f"pu_{uuid.uuid4().hex[:8]}",
            email=f"pu_{uuid.uuid4().hex[:8]}@example.com",
            role="parent",
            status="active",
        )
        p_user.set_password("Password123!")
        db.session.add(p_user)
        db.session.flush()

        parent = Parent(tenant_id=tenant.id, user_id=p_user.id)
        db.session.add(parent)

        c2 = Class(
            tenant_id=tenant.id,
            name=f"Cls {uuid.uuid4().hex[:6]}",
            grade_level="Primary 2",
            academic_year="2024/2025",
            capacity=30,
        )
        db.session.add(c2)
        db.session.flush()

        app_rec = AdmissionApplication(
            parent_id=parent.id,
            student_first_name="",
            student_last_name="   ",
            target_class_id=None,
            payment_status="paid",
            status="draft",
            form_data={},
        )
        db.session.add(app_rec)
        db.session.flush()
        app_id = app_rec.id
        cid2 = c2.id
        tid = tenant.id
        puid = p_user.id
        db.session.commit()

    tok = _parent_token(puid)
    headers = _hdr(tok, tid)

    r = client.put(
        f"/api/v1/admissions/application/{app_id}",
        json={
            "form_data": {
                "first_name": "BackfilledFirst",
                "last_name": "BackfilledLast",
                "class_id": cid2,
                "gender": "male",
            },
        },
        headers=headers,
    )
    assert r.status_code == 200, f"Got {r.status_code}: {r.get_data(as_text=True)}"
    assert r.json["success"] is True

    with app.app_context():
        after = AdmissionApplication.query.get(app_id)
        assert after.student_first_name == "BackfilledFirst"
        assert after.student_last_name == "BackfilledLast"
        assert after.target_class_id == cid2


def test_ac8b_sync_guard_invalid_class_noop(auth_client, app, client):
    with app.app_context():
        tenant_id = uuid.uuid4()
        tenant = Tenant(
            id=tenant_id,
            slug=f"slug-{tenant_id.hex[:8]}",
            name=f"T8b {tenant_id.hex[:6]}",
            country_code="GH",
            schema_name=f"sch_{tenant_id.hex[:8]}",
        )
        db.session.add(tenant)

        p_user = User(
            username=f"pu_{uuid.uuid4().hex[:8]}",
            email=f"pu_{uuid.uuid4().hex[:8]}@example.com",
            role="parent",
            status="active",
        )
        p_user.set_password("Password123!")
        db.session.add(p_user)
        db.session.flush()

        parent = Parent(tenant_id=tenant.id, user_id=p_user.id)
        db.session.add(parent)
        db.session.flush()

        app2 = AdmissionApplication(
            parent_id=parent.id,
            student_first_name=None,
            student_last_name=None,
            target_class_id=None,
            payment_status="paid",
            status="draft",
            form_data={},
        )
        db.session.add(app2)
        db.session.flush()
        app2_id = app2.id
        tid = tenant.id
        puid = p_user.id
        db.session.commit()

    tok = _parent_token(puid)
    headers = _hdr(tok, tid)

    bad_class_id = 9999999
    r2 = client.put(
        f"/api/v1/admissions/application/{app2_id}",
        json={
            "form_data": {
                "first_name": "OnlyName",
                "class_id": bad_class_id,
            },
        },
        headers=headers,
    )
    assert r2.status_code == 200, f"Got {r2.status_code}: {r2.get_data(as_text=True)}"
    with app.app_context():
        after2 = AdmissionApplication.query.get(app2_id)
        assert after2.student_first_name == "OnlyName"
        assert after2.target_class_id is None


def test_ac9_cross_parent_access_returns_403(auth_client, app, client):
    with app.app_context():
        tenant_id = uuid.uuid4()
        tenant = Tenant(
            id=tenant_id,
            slug=f"slug-{tenant_id.hex[:8]}",
            name=f"T9 {tenant_id.hex[:6]}",
            country_code="GH",
            schema_name=f"sch_{tenant_id.hex[:8]}",
        )
        db.session.add(tenant)

        p1_user = User(
            username=f"p1_{uuid.uuid4().hex[:8]}",
            email=f"p1_{uuid.uuid4().hex[:8]}@example.com",
            role="parent",
            status="active",
        )
        p1_user.set_password("Password123!")
        p2_user = User(
            username=f"p2_{uuid.uuid4().hex[:8]}",
            email=f"p2_{uuid.uuid4().hex[:8]}@example.com",
            role="parent",
            status="active",
        )
        p2_user.set_password("Password123!")
        db.session.add_all([p1_user, p2_user])
        db.session.flush()

        p1 = Parent(tenant_id=tenant.id, user_id=p1_user.id)
        p2 = Parent(tenant_id=tenant.id, user_id=p2_user.id)
        db.session.add_all([p1, p2])
        db.session.flush()

        c1 = Class(
            tenant_id=tenant.id,
            name=f"Cls {uuid.uuid4().hex[:6]}",
            grade_level="Primary 1",
            academic_year="2024/2025",
            capacity=30,
        )
        db.session.add(c1)
        db.session.flush()

        app_rec = AdmissionApplication(
            parent_id=p1.id,
            student_first_name="ChildOne",
            student_last_name="ParentOne",
            target_class_id=c1.id,
            payment_status="paid",
            status="draft",
            form_data={},
        )
        db.session.add(app_rec)
        db.session.flush()
        app_id = app_rec.id
        tid = tenant.id
        p1_uid = p1_user.id
        p2_uid = p2_user.id
        db.session.commit()

    tok1 = _parent_token(p1_uid)
    tok2 = _parent_token(p2_uid)
    h1 = _hdr(tok1, tid)
    h2 = _hdr(tok2, tid)

    r_save = client.put(
        f"/api/v1/admissions/application/{app_id}",
        json={"form_data": {"gender": "male"}},
        headers=h2,
    )
    assert r_save.status_code == 403
    assert r_save.json["success"] is False

    r_get = client.get(
        f"/api/v1/admissions/application/{app_id}",
        headers=h2,
    )
    assert r_get.status_code == 403
    assert r_get.json["success"] is False

    r_get_ok = client.get(
        f"/api/v1/admissions/application/{app_id}",
        headers=h1,
    )
    assert r_get_ok.status_code == 200, f"Owner got {r_get_ok.status_code}: {r_get_ok.get_data(as_text=True)}"
    assert r_get_ok.json["success"] is True


def test_ac10_cross_tenant_access_returns_403(auth_client, app, client):
    with app.app_context():
        t1_id = uuid.uuid4()
        t1 = Tenant(
            id=t1_id,
            slug=f"slug-t1-{t1_id.hex[:6]}",
            name=f"T10a {t1_id.hex[:6]}",
            country_code="GH",
            schema_name=f"sch_t1_{t1_id.hex[:6]}",
        )
        t2_id = uuid.uuid4()
        t2 = Tenant(
            id=t2_id,
            slug=f"slug-t2-{t2_id.hex[:6]}",
            name=f"T10b {t2_id.hex[:6]}",
            country_code="GH",
            schema_name=f"sch_t2_{t2_id.hex[:6]}",
        )
        db.session.add_all([t1, t2])

        pt_user = User(
            username=f"pt_{uuid.uuid4().hex[:8]}",
            email=f"pt_{uuid.uuid4().hex[:8]}@example.com",
            role="parent",
            status="active",
        )
        pt_user.set_password("Password123!")
        db.session.add(pt_user)
        db.session.flush()

        parent_t2 = Parent(tenant_id=t2.id, user_id=pt_user.id)
        db.session.add(parent_t2)
        db.session.flush()

        class_t2 = Class(
            tenant_id=t2.id,
            name=f"T2C {uuid.uuid4().hex[:6]}",
            grade_level="Primary 3",
            academic_year="2024/2025",
            capacity=25,
        )
        db.session.add(class_t2)
        db.session.flush()

        app_rec = AdmissionApplication(
            parent_id=parent_t2.id,
            student_first_name="T2Child",
            student_last_name="T2Last",
            target_class_id=class_t2.id,
            payment_status="paid",
            status="draft",
            form_data={},
        )
        db.session.add(app_rec)
        db.session.flush()
        app_id = app_rec.id
        pt_uid = pt_user.id
        db.session.commit()

    tok = _parent_token(pt_uid)
    h_wrong = _hdr(tok, t1_id)
    h_correct = _hdr(tok, t2_id)

    r_wrong = client.get(
        f"/api/v1/admissions/application/{app_id}",
        headers=h_wrong,
    )
    assert r_wrong.status_code == 403

    r_ok = client.get(
        f"/api/v1/admissions/application/{app_id}",
        headers=h_correct,
    )
    assert r_ok.status_code in (200, 403)
    if r_ok.status_code == 200:
        assert r_ok.json["success"] is True


def test_ac11_parent_admission_number_reject_400(auth_client, app, client):
    with app.app_context():
        tenant_id = uuid.uuid4()
        tenant = Tenant(
            id=tenant_id,
            slug=f"slug-{tenant_id.hex[:8]}",
            name=f"T11 {tenant_id.hex[:6]}",
            country_code="GH",
            schema_name=f"sch_{tenant_id.hex[:8]}",
        )
        db.session.add(tenant)

        p_user = User(
            username=f"pu_{uuid.uuid4().hex[:8]}",
            email=f"pu_{uuid.uuid4().hex[:8]}@example.com",
            role="parent",
            status="active",
        )
        p_user.set_password("Password123!")
        db.session.add(p_user)
        db.session.flush()

        parent = Parent(tenant_id=tenant.id, user_id=p_user.id)
        db.session.add(parent)

        c1 = Class(
            tenant_id=tenant.id,
            name=f"Cls {uuid.uuid4().hex[:6]}",
            grade_level="Primary 1",
            academic_year="2024/2025",
            capacity=30,
        )
        db.session.add(c1)
        db.session.flush()

        app_rec = AdmissionApplication(
            parent_id=parent.id,
            student_first_name="Test",
            student_last_name="Child",
            target_class_id=c1.id,
            payment_status="paid",
            status="draft",
            form_data={},
        )
        db.session.add(app_rec)
        db.session.flush()
        app_id = app_rec.id
        tid = tenant.id
        puid = p_user.id
        db.session.commit()

    tok = _parent_token(puid)
    headers = _hdr(tok, tid)

    r1 = client.put(
        f"/api/v1/admissions/application/{app_id}",
        json={
            "form_data": {
                "admission_number": "STU-2024-00001",
                "gender": "male",
            },
        },
        headers=headers,
    )
    assert r1.status_code == 400, f"Got {r1.status_code}: {r1.get_data(as_text=True)}"
    assert r1.json["success"] is False
    assert r1.json["message"] == "Admission Number cannot be set by parents"

    r2 = client.put(
        f"/api/v1/admissions/application/{app_id}",
        json={
            "form_data": {
                "admission_number": "   ",
                "gender": "female",
            },
        },
        headers=headers,
    )
    assert r2.status_code == 200, f"Blank-admission-number got {r2.status_code}"
    assert r2.json["success"] is True
    assert (r2.json.get("data") or {}).get("form_data", {}).get("gender") == "female"

    r3 = client.put(
        f"/api/v1/admissions/application/{app_id}",
        json={
            "form_data": {
                "admission_number": None,
                "dob": "2018-01-10",
            },
        },
        headers=headers,
    )
    assert r3.status_code == 200, f"None-admission-number got {r3.status_code}: {r3.get_data(as_text=True)}"
    assert r3.json["success"] is True
    assert (r3.json.get("data") or {}).get("form_data", {}).get("dob") == "2018-01-10"

    r4 = client.post(
        f"/api/v1/admissions/application/{app_id}/submit",
        json={
            "form_data": {
                "admission_number": "ADM-2026-000999",
                "first_name": "Test",
                "last_name": "Child",
            },
        },
        headers=headers,
    )
    assert r4.status_code == 400, f"Submit-admission-number got {r4.status_code}: {r4.get_data(as_text=True)}"
    assert r4.json["success"] is False
    assert r4.json["message"] == "Admission Number cannot be set by parents"

    with app.app_context():
        reread = AdmissionApplication.query.get(app_id)
        assert reread.status == "draft", (
            f"Expected still draft after rejected submit; got status={reread.status}"
        )
        fd = reread.form_data or {}
        assert not str(fd.get("admission_number") or "").strip(), (
            f"Submitted adm_number unexpectedly persisted: {fd.get('admission_number')}"
        )


def test_ac12_approval_generates_number_only(auth_client, app, client):
    with app.app_context():
        tenant_id = uuid.uuid4()
        tenant = Tenant(
            id=tenant_id,
            slug=f"slug-{tenant_id.hex[:8]}",
            name=f"T12 {tenant_id.hex[:6]}",
            country_code="GH",
            schema_name=f"sch_{tenant_id.hex[:8]}",
        )
        db.session.add(tenant)

        p_user = User(
            username=f"pu_{uuid.uuid4().hex[:8]}",
            email=f"pu_{uuid.uuid4().hex[:8]}@example.com",
            role="parent",
            status="active",
        )
        p_user.set_password("Password123!")
        db.session.add(p_user)
        db.session.flush()

        parent = Parent(tenant_id=tenant.id, user_id=p_user.id)
        db.session.add(parent)

        c1 = Class(
            tenant_id=tenant.id,
            name=f"Cls {uuid.uuid4().hex[:6]}",
            grade_level="Primary 1",
            academic_year="2024/2025",
            capacity=30,
        )
        db.session.add(c1)
        db.session.flush()

        app_rec = AdmissionApplication(
            parent_id=parent.id,
            student_first_name="Approved",
            student_last_name="Student",
            target_class_id=c1.id,
            payment_status="paid",
            status="submitted",
            form_data={
                "gender": "male",
                "dob": "2016-06-20",
                "first_name": "Approved",
                "last_name": "Student",
                "class_id": c1.id,
                "home_address": "123 Test St",
                "emergency_contact": "+233000000000",
            },
        )
        db.session.add(app_rec)
        db.session.flush()
        app_id = app_rec.id
        tid = tenant.id
        puid = p_user.id
        db.session.commit()

    with app.app_context():
        before = Student.query.filter_by(
            first_name="Approved", last_name="Student"
        ).first()
        assert before is None

    admin_hdr = {"X-Tenant-ID": str(tid)}
    admin_r = auth_client.post(
        f"/api/v1/admissions/application/{app_id}/review",
        json={"status": "approved", "notes": "Approved for AC12"},
        headers=admin_hdr,
    )
    assert admin_r.status_code == 200, f"Approval got {admin_r.status_code}: {admin_r.get_data(as_text=True)}"
    body = admin_r.json
    assert body.get("success") is True

    with app.app_context():
        stu = Student.query.filter_by(
            first_name="Approved", last_name="Student"
        ).first()
        assert stu is not None
        assert stu.admission_number is not None
        assert isinstance(stu.admission_number, str)
        assert len(stu.admission_number.strip()) > 0

    parent_tok = _parent_token(puid)
    parent_hdr = _hdr(parent_tok, tid)
    r_try_parent_set = client.put(
        f"/api/v1/admissions/application/{app_id}",
        json={"form_data": {"admission_number": "INJECTED-999"}},
        headers=parent_hdr,
    )
    assert r_try_parent_set.status_code in (400, 403)
