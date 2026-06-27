import uuid
from datetime import date, timedelta
from app.extensions import db, bcrypt
from app.models.user import User
from app.models.tenant import Tenant
from app.models.academic_term import AcademicTerm
from app.models.billing import (
    Plan, PlanPricingTier, SchoolPlanSubscription,
    StudentTermRegistration, BillingInvoice, PendingInvoiceAdjustment
)
from app.models.student import Student
from app.services.payments.service import PaymentService


def _create_user(email: str, role: str = 'user', password: str = 'Password123!') -> User:
    u = User.query.filter_by(email=email).first()
    if u:
        u.role = role
        u.password_hash = bcrypt.generate_password_hash(password).decode('utf-8')
        u.status = 'active'
        db.session.commit()
        return u
    u = User(
        username=email.split('@')[0],
        email=email,
        password_hash=bcrypt.generate_password_hash(password).decode('utf-8'),
        role=role,
        status='active',
    )
    db.session.add(u)
    db.session.commit()
    return u


def test_mid_cycle_proration_and_invoice_aggregation(client):
    # 1. Setup Tenant (XOF Currency, TG Country)
    tenant = Tenant(
        id=uuid.uuid4(),
        slug=f"prorate-{uuid.uuid4().hex[:6]}",
        name="Proration School",
        country_code='TG',
        schema_name=f"schema_{uuid.uuid4().hex[:8]}",
        currency='XOF',
        status='active',
        plan='basic',
    )
    db.session.add(tenant)
    db.session.flush()

    # 2. Setup Academic Term (90 days duration)
    today = date.today()
    term = AcademicTerm(
        tenant_id=tenant.id,
        name='Term 1',
        start_date=today,
        end_date=today + timedelta(days=89),
    )
    db.session.add(term)
    db.session.flush()

    # 3. Setup Billing Plan
    plan = Plan.query.filter_by(slug='basic').first()
    if not plan:
        plan = Plan(
            name='Basic',
            slug='basic',
            description='Basic plan',
            price_per_student=100,
            currency='XOF',
            is_active=True,
            billing_min_months=1,
        )
        db.session.add(plan)
    else:
        plan.name = 'Basic'
        plan.description = 'Basic plan'
        plan.price_per_student = 100
        plan.currency = 'XOF'
        plan.is_active = True
        plan.billing_min_months = 1
    db.session.flush()

    # 4. Setup Pricing Tier (120 XOF per student month)
    tier = PlanPricingTier(
        plan_id=int(plan.id),
        country_code='TG',
        currency='XOF',
        min_students=1,
        max_students=10,
        price_per_student_month=150,
        is_active=True,
    )
    db.session.add(tier)
    db.session.flush()

    # 5. Setup School Subscription with 30-day cycle
    # Starts 10 days ago, ends 20 days from now
    starts_at = today - timedelta(days=10)
    ends_at = today + timedelta(days=20)
    
    sub = SchoolPlanSubscription(
        school_id=tenant.id,
        plan_id=int(plan.id),
        starts_at=starts_at,
        ends_at=ends_at,
        status='active',
        price_per_student_snapshot=150,
        currency_snapshot='XOF',
    )
    db.session.add(sub)
    db.session.flush()

    # 6. Pre-create user for Student
    base_user = _create_user('prorate_student@example.com', role='user')
    db.session.commit()

    # Clear any leftover adjustments for the tenant to ensure isolated assertions
    PendingInvoiceAdjustment.query.filter_by(tenant_id=tenant.id).delete()
    db.session.commit()

    # 7. Create a student mid-cycle
    # S = starts_at (10 days ago), E = ends_at (20 days from now)
    # Total cycle days = 30
    # Remaining cycle days = 20
    # Expected fee = 150 XOF * (20 / 30) = 100.00 XOF
    student = Student(
        tenant_id=tenant.id,
        user_id=base_user.id,
        admission_number="ADM-PRORATE-00001",
        first_name='John',
        last_name='Doe',
        date_of_birth=today - timedelta(days=3650),
        gender='male',
        status='active',
    )
    db.session.add(student)
    db.session.commit()

    # 8. Assert proration ledger entry was generated successfully
    adj = PendingInvoiceAdjustment.query.filter_by(tenant_id=tenant.id).first()
    assert adj is not None, "Proration ledger entry should be written to pending_invoice_adjustments"
    assert adj.status == 'pending'
    assert adj.currency == 'XOF'
    assert float(adj.amount) == 100.00, f"Expected fee to be 100.00 XOF, got {adj.amount}"
    assert "Prorated addition for Student: John Doe" in adj.description

    # 9. Register student for term and generate invoice to verify aggregation
    reg = StudentTermRegistration(
        tenant_id=tenant.id,
        student_id=int(student.id),
        academic_term_id=int(term.id),
        registration_status='registered',
        student_status='active',
    )
    db.session.add(reg)
    db.session.commit()

    invoice, err = PaymentService.generate_invoice_for_school_term(
        school_id=tenant.id,
        academic_term_id=int(term.id),
        months=1
    )
    assert err is None
    assert invoice is not None
    
    # Expected: 1 active student * 150 XOF * 1 month = 150 XOF subtotal
    # Expected total = subtotal + 100 XOF adjustment = 250 XOF total
    assert float(invoice.subtotal) == 150.00
    assert float(invoice.total_amount) == 250.00, f"Expected total_amount to be 250.00 XOF, got {invoice.total_amount}"
    assert float(invoice.balance_due) == 250.00

    # 10. Assert the pending adjustment transitions to 'billed' status and links to invoice
    db.session.refresh(adj)
    assert adj.status == 'billed'
    assert adj.invoice_id == invoice.id
