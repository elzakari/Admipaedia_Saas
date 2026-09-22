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

def test_financial_ledger_service_calculations(
    app,
    sample_tenant,
    student_factory,
):
    """
    Verify branch and proprietor ledger calculations using a complete,
    FK-valid tenant ownership graph.

    The test intentionally creates real relational parents rather than
    relying on fabricated primary-key values.
    """
    import datetime
    from decimal import Decimal

    from app.extensions import db
    from app.models.academic_term import AcademicTerm
    from app.models.billing import (
        BillingInvoice,
        Plan,
        SchoolPlanSubscription,
    )
    from app.models.finance import (
        FeeCategory,
        FeeStructure,
        Payment as StudentPayment,
    )
    from app.models.tenant import Branch
    from app.services.finance.service import FeeService
    from app.services.financial_ledger_service import (
        FinancialLedgerService,
    )

    tenant_id = sample_tenant.id

    # =========================================================
    # 1. Real tenant-owned branches
    # =========================================================

    campus_a = Branch(
        tenant_id=tenant_id,
        name="Campus A",
        code="CAMPUS-A",
        is_active=True,
    )

    campus_b = Branch(
        tenant_id=tenant_id,
        name="Campus B",
        code="CAMPUS-B",
        is_active=True,
    )

    db.session.add_all(
        [
            campus_a,
            campus_b,
        ]
    )
    db.session.flush()

    branch1 = campus_a.id
    branch2 = campus_b.id

    # =========================================================
    # 2. Canonical students with real linked Users
    # =========================================================

    student_a = student_factory(
        tenant_id=tenant_id,
        branch_id=branch1,
    )

    student_b = student_factory(
        tenant_id=tenant_id,
        branch_id=branch2,
    )

    student_a.first_name = "Alice"
    student_a.last_name = "Smith"

    student_b.first_name = "Charlie"
    student_b.last_name = "Brown"

    db.session.flush()

    # =========================================================
    # 3. Real fee parents
    #
    # FeeStructure is tenant-owned. It does not currently have a
    # direct branch_id, so these are deliberately tenant-wide
    # structures. Branch ownership of the actual ledger entry is
    # represented by Student + StudentFee.branch_id.
    # =========================================================

    category = FeeCategory(
        tenant_id=tenant_id,
        name="Tuition",
        description=(
            "Tuition category for branch ledger integration tests"
        ),
    )

    db.session.add(category)
    db.session.flush()

    structure_a = FeeStructure(
        tenant_id=tenant_id,
        fee_category_id=category.id,
        academic_year="2026/2027",
        term="Term 1",
        amount=Decimal("1000.00"),
        currency="GHS",
        due_date=datetime.date(
            2026,
            12,
            1,
        ),
    )

    structure_b = FeeStructure(
        tenant_id=tenant_id,
        fee_category_id=category.id,
        academic_year="2026/2027",
        term="Term 1",
        amount=Decimal("1500.00"),
        currency="GHS",
        due_date=datetime.date(
            2026,
            12,
            1,
        ),
    )

    db.session.add_all(
        [
            structure_a,
            structure_b,
        ]
    )
    db.session.flush()

    # =========================================================
    # 4. Canonical StudentFee creation
    # =========================================================

    fee_a = FeeService._build_student_fee(
        structure_a,
        student_a,
    )

    fee_b = FeeService._build_student_fee(
        structure_b,
        student_b,
    )

    db.session.add_all(
        [
            fee_a,
            fee_b,
        ]
    )
    db.session.flush()

    # Campus A:
    # 1000 billed - 400 paid = 600 outstanding.
    fee_a.paid_amount = Decimal("400.00")
    fee_a.update_balance()

    # Campus B remains fully outstanding.
    fee_b.paid_amount = Decimal("0.00")
    fee_b.update_balance()

    db.session.flush()

    # =========================================================
    # 5. Actual payment records consumed by
    #    FinancialLedgerService
    # =========================================================

    payment_a = StudentPayment(
        transaction_id="TXN-L1",
        student_id=student_a.id,
        amount=Decimal("400.00"),
        currency="GHS",
        payment_method="mobile_money",
        payment_provider="paystack",
        status="completed",
        paid_at=datetime.datetime.utcnow(),
    )

    # Deliberately pending: must NOT count as collected.
    payment_b = StudentPayment(
        transaction_id="TXN-L2",
        student_id=student_b.id,
        amount=Decimal("500.00"),
        currency="GHS",
        payment_method="bank_transfer",
        payment_provider="manual",
        status="pending",
        paid_at=datetime.datetime.utcnow(),
    )

    db.session.add_all(
        [
            payment_a,
            payment_b,
        ]
    )

    # =========================================================
    # 6. Real tenant-owned academic term for SaaS invoice
    # =========================================================

    academic_term = AcademicTerm(
        tenant_id=tenant_id,
        name="Term 1 - 2026/2027",
        start_date=datetime.date(
            2026,
            9,
            1,
        ),
        end_date=datetime.date(
            2026,
            12,
            20,
        ),
    )

    db.session.add(academic_term)
    db.session.flush()

    # =========================================================
    # 7. Platform-global SaaS Plan
    # =========================================================

    plan = Plan(
        name="Growth Premium",
        slug="growth-premium",
        price_per_student=Decimal("2.50"),
        currency="USD",
        is_active=True,
    )

    db.session.add(plan)
    db.session.flush()

    subscription = SchoolPlanSubscription(
        school_id=tenant_id,
        plan_id=plan.id,
        starts_at=datetime.date(
            2026,
            1,
            1,
        ),
        status="active",
        price_per_student_snapshot=Decimal("2.50"),
        currency_snapshot="USD",
    )

    invoice = BillingInvoice(
        invoice_number="INV-SaaS-1",
        tenant_id=tenant_id,
        plan_id=plan.id,
        academic_term_id=academic_term.id,
        price_per_student_snapshot=Decimal("2.50"),
        subtotal=Decimal("500.00"),
        total_amount=Decimal("500.00"),
        currency="USD",
        status="pending",
        payment_status="partial",
        due_date=datetime.date(
            2026,
            12,
            1,
        ),
        amount_paid=Decimal("100.00"),
        balance_due=Decimal("400.00"),
    )

    db.session.add_all(
        [
            subscription,
            invoice,
        ]
    )

    db.session.commit()

    # =========================================================
    # 8. Ownership invariants
    #
    # Fail here before metric assertions if test data ever drifts
    # across tenant or branch boundaries.
    # =========================================================

    assert campus_a.tenant_id == tenant_id
    assert campus_b.tenant_id == tenant_id

    assert student_a.tenant_id == tenant_id
    assert student_b.tenant_id == tenant_id

    assert student_a.branch_id == branch1
    assert student_b.branch_id == branch2

    assert structure_a.tenant_id == tenant_id
    assert structure_b.tenant_id == tenant_id

    assert category.tenant_id == tenant_id

    assert fee_a.student_id == student_a.id
    assert fee_b.student_id == student_b.id

    assert (
        fee_a.fee_structure_id
        == structure_a.id
    )
    assert (
        fee_b.fee_structure_id
        == structure_b.id
    )

    assert fee_a.branch_id == branch1
    assert fee_b.branch_id == branch2

    assert subscription.school_id == tenant_id
    assert subscription.plan_id == plan.id

    assert invoice.tenant_id == tenant_id
    assert invoice.plan_id == plan.id
    assert (
        invoice.academic_term_id
        == academic_term.id
    )

    # =========================================================
    # 9. Campus A metrics
    # =========================================================

    metrics1 = (
        FinancialLedgerService
        .get_branch_ledger_metrics(
            tenant_id,
            branch1,
        )
    )

    assert metrics1[
        "branch_id"
    ] == str(branch1)

    assert metrics1[
        "total_billed"
    ] == Decimal("1000.00")

    assert metrics1[
        "total_collected"
    ] == Decimal("400.00")

    assert metrics1[
        "total_outstanding"
    ] == Decimal("600.00")

    assert metrics1[
        "collection_rate"
    ] == Decimal("40.00")

    assert metrics1[
        "collections_by_method"
    ]["mobile_money"] == Decimal(
        "400.00"
    )

    assert metrics1[
        "fees_by_status"
    ]["partial"] == 1

    # =========================================================
    # 10. Campus B metrics
    # =========================================================

    metrics2 = (
        FinancialLedgerService
        .get_branch_ledger_metrics(
            tenant_id,
            branch2,
        )
    )

    assert metrics2[
        "total_billed"
    ] == Decimal("1500.00")

    # Pending payment must remain excluded.
    assert metrics2[
        "total_collected"
    ] == Decimal("0.00")

    assert metrics2[
        "total_outstanding"
    ] == Decimal("1500.00")

    assert metrics2[
        "collection_rate"
    ] == Decimal("0.00")

    assert metrics2[
        "fees_by_status"
    ]["pending"] == 1

    # =========================================================
    # 11. Proprietor tenant-wide metrics
    # =========================================================

    global_metrics = (
        FinancialLedgerService
        .get_proprietor_global_metrics(
            tenant_id
        )
    )

    assert global_metrics[
        "global_billed"
    ] == Decimal("2500.00")

    assert global_metrics[
        "global_collected"
    ] == Decimal("400.00")

    assert global_metrics[
        "global_outstanding"
    ] == Decimal("2100.00")

    assert global_metrics[
        "global_collection_rate"
    ] == Decimal("16.00")

    branch_comparison = (
        global_metrics[
            "branch_comparison"
        ]
    )

    assert len(
        branch_comparison
    ) == 2

    comparison_names = {
        branch[
            "branch_name"
        ]
        for branch in branch_comparison
    }

    assert comparison_names == {
        "Campus A",
        "Campus B",
    }

    # =========================================================
    # 12. SaaS billing metrics
    # =========================================================

    saas = global_metrics[
        "saas_subscription"
    ]

    assert (
        saas[
            "active_plan_name"
        ]
        == "Growth Premium"
    )

    assert saas[
        "invoice_count"
    ] == 1

    assert saas[
        "total_paid"
    ] == Decimal("100.00")

    assert saas[
        "balance_due"
    ] == Decimal("400.00")

    assert (
        saas[
            "next_due_date"
        ]
        == "2026-12-01"
    )


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
