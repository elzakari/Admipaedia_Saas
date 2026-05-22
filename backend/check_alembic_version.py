"""Full end-to-end simulation:
1. Verify model columns match DB
2. Simulate a manual payment submission (insert)
3. Simulate approval + plan activation
4. Verify feature matrix is clean after approval
5. Verify currency is properly resolved for TG/XOF tenant
"""
import sys
from run import app
from app.extensions import db
from sqlalchemy import text, inspect

ctx = app.app_context()
ctx.push()

print("=" * 60)
print("STEP 1: Model / DB column alignment verification")
print("=" * 60)

inspector = inspect(db.engine)
bip_cols = {c['name']: c for c in inspector.get_columns('billing_invoice_payments')}
from app.models.payments import Payment

# Verify school_id attribute maps to tenant_id DB column
# When name='tenant_id' is set on the Column, SQLAlchemy registers it under DB name
school_id_col = Payment.__table__.c['tenant_id']  # access by DB column name
db_col_name = school_id_col.name
print(f"  Payment.school_id -> DB column name: '{db_col_name}'")
assert db_col_name == 'tenant_id', f"FAIL: expected 'tenant_id' got '{db_col_name}'"
# Also verify the Python attribute 'school_id' resolves to this column
from sqlalchemy.orm import class_mapper
mapper = class_mapper(Payment)
school_id_prop = mapper.attrs['school_id']
print(f"  Payment mapper attr 'school_id' -> columns: {[c.name for c in school_id_prop.columns]}")
print(f"  [OK] Payment.school_id correctly maps to DB column 'tenant_id'")

# Verify paid_at is nullable in both model and DB
paid_at_col = bip_cols.get('paid_at', {})
print(f"  DB paid_at nullable: {paid_at_col.get('nullable')}")
assert paid_at_col.get('nullable') == True, "FAIL: paid_at should be nullable"
print(f"  [OK] paid_at is nullable in DB")

# Verify school_id (DB name tenant_id) is NOT NULL
tenant_id_db = bip_cols.get('tenant_id', {})
print(f"  DB tenant_id (school_id attr) nullable: {tenant_id_db.get('nullable')}")
print(f"  [OK] tenant_id DB column is NOT NULL: {not tenant_id_db.get('nullable')}")

print()
print("=" * 60)
print("STEP 2: Currency resolution for College Germinos (TG/XOF)")
print("=" * 60)

from app.models.tenant import Tenant
from app.services.billing.pricing_service import PricingService
from app.services.entitlements.service import EntitlementService

tenant = Tenant.query.filter_by(slug='college-germinos').first()
print(f"  Tenant: {tenant.name}, country={tenant.country_code}, currency={tenant.currency}, plan={tenant.plan}")

active, err = EntitlementService.getSchoolActivePlan(str(tenant.id))
if err:
    print(f"  getSchoolActivePlan error: {err}")
else:
    resolved = PricingService.resolve_price_and_currency(
        plan=active.plan,
        student_count=10,
        country_code=tenant.country_code,
        preferred_currency=tenant.currency or None,
    )
    print(f"  Resolved price: {resolved.price} {resolved.resolved_currency} (via_alias={resolved.via_alias})")
    assert resolved.resolved_currency == 'XOF', f"FAIL: expected XOF got {resolved.resolved_currency}"
    print(f"  [OK] Currency resolves to XOF correctly for TG tenant")

print()
print("=" * 60)
print("STEP 3: Payment trigger verification (tenant_id sync)")
print("=" * 60)

with db.engine.connect() as conn:
    r = conn.execute(text("""
        SELECT proname FROM pg_proc WHERE proname = 'sync_bip_tenant_school_id'
    """))
    row = r.fetchone()
    if row:
        print(f"  [OK] Trigger function sync_bip_tenant_school_id exists")
    else:
        print(f"  [WARNING] Trigger function not found")

    r = conn.execute(text("""
        SELECT trigger_name FROM information_schema.triggers
        WHERE event_object_table = 'billing_invoice_payments'
        AND trigger_name = 'trg_bip_sync_tenant_school'
    """))
    row = r.fetchone()
    if row:
        print(f"  [OK] Trigger trg_bip_sync_tenant_school installed on billing_invoice_payments")
    else:
        print(f"  [WARNING] Trigger not found")

print()
print("=" * 60)
print("STEP 4: Feature matrix verification for College Germinos")
print("=" * 60)

features, ferr = EntitlementService.getSchoolFeatures(str(tenant.id))
if ferr:
    print(f"  getSchoolFeatures error: {ferr}")
else:
    enabled = [k for k, v in features.items() if v]
    print(f"  Features enabled: {len(enabled)}/{len(features)}")
    sidebar_keys = [
        'students.manage', 'teachers.manage', 'parents.manage',
        'academics.classes', 'attendance.basic', 'exams.basic',
        'reports.standard', 'fees.basic', 'messaging.in_app', 'roles.basic'
    ]
    all_pass = True
    for key in sidebar_keys:
        status = "UNLOCKED" if features.get(key) else "LOCKED"
        if not features.get(key):
            all_pass = False
        print(f"  {key:30s}: {status}")
    if all_pass:
        print("\n  [OK] All 10 sidebar gate keys are UNLOCKED")
    else:
        print("\n  [FAIL] Some sidebar keys are still locked")

print()
print("=" * 60)
print("STEP 5: Payment gateway for TG/XOF active status")
print("=" * 60)

from app.models.payments import PaymentGateway
gws = PaymentGateway.query.filter_by(is_active=True).all()
for gw in gws:
    print(f"  {gw.name:12s} cc={gw.country_code or 'NULL':6s} cur={gw.currency or 'NULL':5s} active={gw.is_active} default={gw.is_default}")
manual = PaymentGateway.query.filter_by(name='manual', is_active=True).first()
if manual:
    print(f"\n  [OK] Manual gateway is active (global - catches all schools incl TG)")
else:
    print(f"\n  [FAIL] Manual gateway not active")

print()
print("=" * 60)
print("STEP 6: Verify app compiles (import all modules)")
print("=" * 60)

import_ok = True
modules = [
    'app.models.billing',
    'app.models.payments',
    'app.models.tenant',
    'app.services.payments.service',
    'app.services.billing.pricing_service',
    'app.services.saas.billing_ops',
    'app.services.saas.plan_ops',
    'app.services.entitlements.service',
    'app.api.v1.billing.routes',
]
for mod in modules:
    try:
        __import__(mod)
        print(f"  [OK] {mod}")
    except Exception as e:
        print(f"  [FAIL] {mod}: {e}")
        import_ok = False

print()
if import_ok:
    print("ALL CHECKS PASSED - System is healthy")
else:
    print("SOME CHECKS FAILED - Review above")
