import uuid
import datetime
from decimal import Decimal
from flask import g
from app.extensions import db
from app.models.tenant import Tenant, Branch
from app.models.student import Student
from app.models.finance import StudentFee, Payment as StudentPayment
from app.models.user import User
from app.models.billing import BillingInvoice, SchoolPlanSubscription, Plan
from app.services.financial_ledger_service import FinancialLedgerService
from tests.test_api.test_saas import _create_user, _login, STRONG_PASSWORD

def test_financial_ledger_service_calculations(app):
    """
    Test that FinancialLedgerService correctly aggregates scoped branch-level fees 
    and payments using precise Decimal math with zero rounding drift.
    """
    tenant_id = uuid.uuid4()
    branch1 = uuid.uuid4()
    branch2 = uuid.uuid4()
    
    # 1. Seed Branches
    b1 = Branch(id=branch1, tenant_id=tenant_id, name="Campus A", is_active=True)
    b2 = Branch(id=branch2, tenant_id=tenant_id, name="Campus B", is_active=True)
    db.session.add_all([b1, b2])
    db.session.flush()
    
    # 2. Seed Student Users & Students
    u1 = User(username=f"student_{uuid.uuid4().hex[:4]}", email="s1@test.com", role="student")
    u2 = User(username=f"student_{uuid.uuid4().hex[:4]}", email="s2@test.com", role="student")
    db.session.add_all([u1, u2])
    db.session.flush()
    
    s1 = Student(
        tenant_id=tenant_id,
        branch_id=branch1,
        user_id=u1.id,
        admission_number="ADM-F1",
        first_name="Alice",
        last_name="Smith",
        date_of_birth=datetime.date(2010, 1, 1),
        gender="Female"
    )
    s2 = Student(
        tenant_id=tenant_id,
        branch_id=branch2,
        user_id=u2.id,
        admission_number="ADM-F2",
        first_name="Charlie",
        last_name="Brown",
        date_of_birth=datetime.date(2009, 1, 1),
        gender="Male"
    )
    db.session.add_all([s1, s2])
    db.session.flush()
    
    # 3. Seed StudentFee records
    # Branch 1 fee: $1000.00 final_amount, $600.00 outstanding balance, $400.00 paid
    sf1 = StudentFee(
        student_id=s1.id,
        fee_structure_id=1,
        branch_id=branch1,
        original_amount=Decimal("1000.00"),
        discount_amount=Decimal("0.00"),
        final_amount=Decimal("1000.00"),
        paid_amount=Decimal("400.00"),
        balance=Decimal("600.00"),
        status="partial"
    )
    # Branch 2 fee: $1500.00 final_amount, $1500.00 outstanding balance
    sf2 = StudentFee(
        student_id=s2.id,
        fee_structure_id=2,
        branch_id=branch2,
        original_amount=Decimal("1500.00"),
        discount_amount=Decimal("0.00"),
        final_amount=Decimal("1500.00"),
        paid_amount=Decimal("0.00"),
        balance=Decimal("1500.00"),
        status="pending"
    )
    db.session.add_all([sf1, sf2])
    db.session.flush()
    
    # 4. Seed completed student payments (Branch 1 collected: $400.00, Branch 2 collected: $0.00)
    p1 = StudentPayment(
        transaction_id="TXN-L1",
        student_id=s1.id,
        amount=Decimal("400.00"),
        currency="GHS",
        payment_method="mobile_money",
        payment_provider="paystack",
        status="completed",
        paid_at=datetime.datetime.utcnow()
    )
    p2 = StudentPayment(
        transaction_id="TXN-L2",
        student_id=s2.id,
        amount=Decimal("500.00"),
        currency="GHS",
        payment_method="bank_transfer",
        payment_provider="manual",
        status="pending", # NOT completed, should be excluded from collections!
        paid_at=datetime.datetime.utcnow()
    )
    db.session.add_all([p1, p2])
    
    # Seed a SaaS plan and subscriptions for SaaS metrics
    plan = Plan(name="Growth Premium", slug="growth-premium", price_per_student=Decimal("2.50"))
    db.session.add(plan)
    db.session.flush()
    
    sub = SchoolPlanSubscription(school_id=tenant_id, plan_id=plan.id, starts_at=datetime.date(2026, 1, 1), status="active")
    db.session.add(sub)
    
    invoice = BillingInvoice(
        invoice_number="INV-SaaS-1",
        tenant_id=tenant_id,
        plan_id=plan.id,
        academic_term_id=1,
        price_per_student_snapshot=Decimal("2.50"),
        subtotal=Decimal("500.00"),
        total_amount=Decimal("500.00"),
        currency="USD",
        status="pending",
        due_date=datetime.date(2026, 12, 1),
        amount_paid=Decimal("100.00"),
        balance_due=Decimal("400.00")
    )
    db.session.add(invoice)
    db.session.commit()
    
    # 5. Assert Service Math for Branch 1
    metrics1 = FinancialLedgerService.get_branch_ledger_metrics(tenant_id, branch1)
    assert metrics1["branch_id"] == str(branch1)
    assert metrics1["total_billed"] == Decimal("1000.00")
    assert metrics1["total_collected"] == Decimal("400.00")
    assert metrics1["total_outstanding"] == Decimal("600.00")
    assert metrics1["collection_rate"] == Decimal("40.00")
    assert metrics1["collections_by_method"]["mobile_money"] == Decimal("400.00")
    assert metrics1["fees_by_status"]["partial"] == 1
    
    # 6. Assert Service Math for Branch 2
    metrics2 = FinancialLedgerService.get_branch_ledger_metrics(tenant_id, branch2)
    assert metrics2["total_billed"] == Decimal("1500.00")
    assert metrics2["total_collected"] == Decimal("0.00") # Excludes pending payment p2
    assert metrics2["total_outstanding"] == Decimal("1500.00")
    assert metrics2["collection_rate"] == Decimal("0.00")
    assert metrics2["fees_by_status"]["pending"] == 1
    
    # 7. Assert Proprietor Global View Metrics
    global_metrics = FinancialLedgerService.get_proprietor_global_metrics(tenant_id)
    assert global_metrics["global_billed"] == Decimal("2500.00")
    assert global_metrics["global_collected"] == Decimal("400.00")
    assert global_metrics["global_outstanding"] == Decimal("2100.00")
    assert global_metrics["global_collection_rate"] == Decimal("16.00") # 400 / 2500 * 100
    
    # Branch comparisons list asserts
    assert len(global_metrics["branch_comparison"]) == 2
    comparison_names = [b["branch_name"] for b in global_metrics["branch_comparison"]]
    assert "Campus A" in comparison_names
    assert "Campus B" in comparison_names
    
    # SaaS Subscription asserts
    assert global_metrics["saas_subscription"]["active_plan_name"] == "Growth Premium"
    assert global_metrics["saas_subscription"]["invoice_count"] == 1
    assert global_metrics["saas_subscription"]["total_paid"] == Decimal("100.00")
    assert global_metrics["saas_subscription"]["balance_due"] == Decimal("400.00")
    assert global_metrics["saas_subscription"]["next_due_date"] == "2026-12-01"


def test_financial_ledger_access_isolation_scoping(client):
    """
    Test that local accountants with restricted campus access are blocked from horizontal 
    visibility queries, while verified proprietor logins resolve global and comparative analytics.
    """
    # 1. Create proprietor and local accountant logins
    _create_user('ledgerprop@example.com', role='school_admin', password='Password123!')
    prop_token = _login(client, 'ledgerprop@example.com', 'Password123!')
    
    _create_user('ledgeraccountant@example.com', role='school_finance', password='Password123!')
    acct_token = _login(client, 'ledgeraccountant@example.com', 'Password123!')
    
    # Resolve Tenant and Branches
    tenant = Tenant(
        slug=f"ledger-sch-{uuid.uuid4().hex[:6]}",
        name="Ledger School",
        country_code="GH",
        schema_name=f"sch_{uuid.uuid4().hex[:6]}"
    )
    db.session.add(tenant)
    db.session.flush()
    
    u_prop = User.query.filter_by(email='ledgerprop@example.com').first()
    u_acct = User.query.filter_by(email='ledgeraccountant@example.com').first()
    
    from app.models.tenant import TenantMembership
    m_prop = TenantMembership(tenant_id=tenant.id, user_id=u_prop.id, role='school_admin', status='active')
    m_acct = TenantMembership(tenant_id=tenant.id, user_id=u_acct.id, role='school_finance', status='active')
    db.session.add_all([m_prop, m_acct])
    db.session.flush()
    
    branch_primary = Branch(tenant_id=tenant.id, name="Campus Alpha", is_active=True)
    branch_secondary = Branch(tenant_id=tenant.id, name="Campus Beta", is_active=True)
    db.session.add_all([branch_primary, branch_secondary])
    db.session.commit()
    
    # A. Test restricted branch accountant isolation bounds
    # Local accountant requesting Campus Beta financials directly when locked to Campus Alpha
    resp_locked = client.get(
        f'/api/v1/saas/financial/branch-ledger?branch_id={branch_secondary.id}',
        headers={
            'Authorization': f'Bearer {acct_token}',
            'X-Tenant-ID': str(tenant.id),
            'X-Active-Branch-ID': str(branch_primary.id),
            'X-Branch-ID': str(branch_primary.id) # Accountant locked to primary campus Alpha
        }
    )
    print("!!! DEBUG resp_locked:", resp_locked.status_code, resp_locked.json)
    # MUST return 403 Forbidden!
    assert resp_locked.status_code == 403
    assert "Unauthorized access to other branch" in resp_locked.json["message"]
    
    # Local accountant requesting Campus Alpha (authorized active branch context)
    resp_ok = client.get(
        f'/api/v1/saas/financial/branch-ledger?branch_id={branch_primary.id}',
        headers={
            'Authorization': f'Bearer {acct_token}',
            'X-Tenant-ID': str(tenant.id),
            'X-Active-Branch-ID': str(branch_primary.id),
            'X-Branch-ID': str(branch_primary.id)
        }
    )
    assert resp_ok.status_code == 200
    assert resp_ok.json["success"] is True
    assert resp_ok.json["data"]["branch_id"] == str(branch_primary.id)

    # Local accountant requesting global metrics
    resp_global_block = client.get(
        '/api/v1/saas/financial/global-ledger',
        headers={
            'Authorization': f'Bearer {acct_token}',
            'X-Tenant-ID': str(tenant.id),
            'X-Active-Branch-ID': str(branch_primary.id),
            'X-Branch-ID': str(branch_primary.id)
        }
    )
    # MUST return 403 Forbidden!
    assert resp_global_block.status_code == 403
    assert "Unauthorized access to global cross-campus" in resp_global_block.json["message"]

    # B. Test school proprietor global broad access visibility
    # Proprietor calling global ledger
    resp_prop_global = client.get(
        '/api/v1/saas/financial/global-ledger',
        headers={
            'Authorization': f'Bearer {prop_token}',
            'X-Tenant-ID': str(tenant.id),
            'X-Active-Branch-ID': str(branch_primary.id),
            'X-Branch-ID': str(branch_primary.id)
        }
    )
    assert resp_prop_global.status_code == 200
    assert resp_prop_global.json["success"] is True
    assert "branch_comparison" in resp_prop_global.json["data"]
    
    # Proprietor calling specific branch metrics (Campus Beta)
    resp_prop_branch = client.get(
        f'/api/v1/saas/financial/branch-ledger?branch_id={branch_secondary.id}',
        headers={
            'Authorization': f'Bearer {prop_token}',
            'X-Tenant-ID': str(tenant.id),
            'X-Active-Branch-ID': str(branch_primary.id),
            'X-Branch-ID': str(branch_primary.id)
        }
    )
    assert resp_prop_branch.status_code == 200
    assert resp_prop_branch.json["success"] is True
    assert resp_prop_branch.json["data"]["branch_id"] == str(branch_secondary.id)
