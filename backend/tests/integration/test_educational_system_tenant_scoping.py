import uuid


def _create_tenant(db, Tenant, **overrides):
    t = Tenant(
        id=uuid.uuid4(),
        slug=overrides.get('slug') or f"t-{uuid.uuid4().hex[:8]}",
        name=overrides.get('name') or "Test Tenant",
        country_code=overrides.get('country_code') or "GH",
        schema_name=overrides.get('schema_name') or f"tenant_{uuid.uuid4().hex[:8]}",
        status=overrides.get('status') or "active",
    )
    db.session.add(t)
    db.session.commit()
    return t


def _create_membership(db, TenantMembership, tenant_id, user_id, role="school_admin"):
    m = TenantMembership(tenant_id=tenant_id, user_id=user_id, role=role, status="active")
    db.session.add(m)
    db.session.commit()
    return m


def _create_template(db, EducationalSystemTemplate, *, country_code, system_key, name):
    tpl = EducationalSystemTemplate(
        id=uuid.uuid4(),
        country_code=country_code,
        system_key=system_key,
        name=name,
        description=None,
        config={
            "phases": [
                {"name": "Phase 1", "levels": ["L1", "L2"]},
            ],
            "grading": {"type": "percentage", "scale": "0-100"},
        },
        is_active=True,
        version=1,
    )
    db.session.add(tpl)
    db.session.commit()
    return tpl


def test_platform_list_templates_requires_jwt(client):
    res = client.get("/api/v1/platform/educational-systems")
    assert res.status_code in (401, 422)


def test_platform_list_templates_filters_by_country(app, db, client, auth_headers):
    from app.models.educational_system import EducationalSystemTemplate

    _create_template(db, EducationalSystemTemplate, country_code="GH", system_key="gh_test", name="Ghana Test")
    _create_template(db, EducationalSystemTemplate, country_code="TG", system_key="tg_test", name="Togo Test")

    res = client.get("/api/v1/platform/educational-systems?country_code=GH", headers=auth_headers)
    assert res.status_code == 200
    data = res.get_json()
    keys = [t["system_key"] for t in data["data"]]
    assert "gh_test" in keys
    assert "tg_test" not in keys


def test_tenant_apply_and_get_is_tenant_scoped(app, db, client, auth_headers):
    from app.models.user import User
    from app.models.tenant import Tenant, TenantMembership
    from app.models.educational_system import EducationalSystemTemplate, EducationalSystemConfig, GradeLevel

    user = User.query.filter_by(email="test@example.com").first()
    assert user is not None

    tenant_a = _create_tenant(db, Tenant, slug="tenant-a", name="Tenant A", country_code="GH")
    tenant_b = _create_tenant(db, Tenant, slug="tenant-b", name="Tenant B", country_code="TG")

    _create_membership(db, TenantMembership, tenant_id=tenant_a.id, user_id=user.id)
    _create_membership(db, TenantMembership, tenant_id=tenant_b.id, user_id=user.id)

    tpl_a = _create_template(db, EducationalSystemTemplate, country_code="GH", system_key="gh_test", name="Ghana Test")
    tpl_b = _create_template(db, EducationalSystemTemplate, country_code="TG", system_key="tg_test", name="Togo Test")

    res_apply_a = client.post(
        "/api/v1/tenant/educational-system/apply",
        headers={**auth_headers, "X-Tenant-ID": str(tenant_a.id)},
        json={"template_key": tpl_a.system_key},
    )
    assert res_apply_a.status_code == 200

    cfg_a = EducationalSystemConfig.query.filter_by(tenant_id=tenant_a.id, is_active=True).first()
    assert cfg_a is not None
    assert cfg_a.template_key == tpl_a.system_key
    assert GradeLevel.query.filter_by(tenant_id=tenant_a.id, educational_system_id=cfg_a.id).count() > 0

    res_get_b_before = client.get(
        "/api/v1/tenant/educational-system",
        headers={**auth_headers, "X-Tenant-ID": str(tenant_b.id)},
    )
    assert res_get_b_before.status_code == 404

    res_apply_b = client.post(
        "/api/v1/tenant/educational-system/apply",
        headers={**auth_headers, "X-Tenant-ID": str(tenant_b.id)},
        json={"template_key": tpl_b.system_key},
    )
    assert res_apply_b.status_code == 200

    cfg_b = EducationalSystemConfig.query.filter_by(tenant_id=tenant_b.id, is_active=True).first()
    assert cfg_b is not None
    assert cfg_b.template_key == tpl_b.system_key

    res_get_a = client.get(
        "/api/v1/tenant/educational-system",
        headers={**auth_headers, "X-Tenant-ID": str(tenant_a.id)},
    )
    assert res_get_a.status_code == 200
    assert res_get_a.get_json()["data"]["template_key"] == tpl_a.system_key


def test_tenant_apply_deactivates_previous_config(app, db, client, auth_headers):
    from app.models.user import User
    from app.models.tenant import Tenant, TenantMembership
    from app.models.educational_system import EducationalSystemTemplate, EducationalSystemConfig

    user = User.query.filter_by(email="test@example.com").first()
    tenant = _create_tenant(db, Tenant, slug="tenant-x", name="Tenant X", country_code="GH")
    _create_membership(db, TenantMembership, tenant_id=tenant.id, user_id=user.id)

    tpl1 = _create_template(db, EducationalSystemTemplate, country_code="GH", system_key="tpl1", name="Template 1")
    tpl2 = _create_template(db, EducationalSystemTemplate, country_code="GH", system_key="tpl2", name="Template 2")

    r1 = client.post(
        "/api/v1/tenant/educational-system/apply",
        headers={**auth_headers, "X-Tenant-ID": str(tenant.id)},
        json={"template_key": tpl1.system_key},
    )
    assert r1.status_code == 200

    r2 = client.post(
        "/api/v1/tenant/educational-system/apply",
        headers={**auth_headers, "X-Tenant-ID": str(tenant.id)},
        json={"template_key": tpl2.system_key},
    )
    assert r2.status_code == 200

    active = EducationalSystemConfig.query.filter_by(tenant_id=tenant.id, is_active=True).all()
    assert len(active) == 1
    assert active[0].template_key == tpl2.system_key

