import uuid
from datetime import date, timedelta

from app.extensions import db, bcrypt
from app.models.user import User
from app.models.tenant import Tenant
from app.models.academic_term import AcademicTerm
from app.models.billing import Plan, PlanPricingTier, SchoolPlanSubscription, StudentTermRegistration, BillingInvoice
from app.models.student import Student
from app.services.payments.service import PaymentService


def _create_user(email: str, role: str = 'super_admin', password: str = 'Password123!') -> User:
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


def test_tiered_pricing_invoice_calculation(client):
    tenant = Tenant(
        id=uuid.uuid4(),
        slug=f"test-{uuid.uuid4().hex[:6]}",
        name="Pricing School",
        country_code='TG',
        schema_name=f"schema_{uuid.uuid4().hex[:8]}",
        currency='XOF',
        status='active',
        plan='basic',
    )
    db.session.add(tenant)
    db.session.flush()

    today = date.today()
    term = AcademicTerm(
        tenant_id=tenant.id,
        name='Term',
        start_date=today,
        end_date=today + timedelta(days=89),
    )
    db.session.add(term)
    db.session.flush()

    plan = Plan.query.filter_by(slug='basic').first()
    if not plan:
        plan = Plan(
            name='Basic',
            slug='basic',
            description='Basic plan',
            price_per_student=100,
            currency='XOF',
            is_active=True,
            billing_min_months=3,
        )
        db.session.add(plan)
    else:
        plan.name = 'Basic'
        plan.description = 'Basic plan'
        plan.price_per_student = 100
        plan.currency = 'XOF'
        plan.is_active = True
        plan.billing_min_months = 3
    db.session.flush()

    tier = PlanPricingTier(
        plan_id=int(plan.id),
        country_code='TG',
        currency='XOF',
        min_students=100,
        max_students=200,
        price_per_student_month=125,
        is_active=True,
    )
    db.session.add(tier)
    db.session.flush()

    sub = SchoolPlanSubscription(
        school_id=tenant.id,
        plan_id=int(plan.id),
        starts_at=today,
        ends_at=None,
        status='active',
        price_per_student_snapshot=125,
        currency_snapshot='XOF',
    )
    db.session.add(sub)
    db.session.flush()

    base_user = _create_user('students_base@example.com', role='user')

    students = []
    regs = []
    for i in range(150):
        s = Student(
            tenant_id=tenant.id,
            user_id=base_user.id,
            admission_number=f"ADM-{i+1:05d}",
            first_name='A',
            last_name=f"S{i}",
            date_of_birth=today - timedelta(days=3650),
            gender='male',
            status='active',
        )
        students.append(s)
        db.session.add(s)
    db.session.flush()

    for s in students:
        regs.append(StudentTermRegistration(
            tenant_id=tenant.id,
            student_id=int(s.id),
            academic_term_id=int(term.id),
            registration_status='registered',
            student_status='active',
        ))
    db.session.bulk_save_objects(regs)
    db.session.commit()

    invoice, err = PaymentService.generate_invoice_for_school_term(school_id=tenant.id, academic_term_id=int(term.id))
    assert err is None
    assert invoice is not None
    assert int(invoice.active_student_count) == 150
    assert int(invoice.billing_months) == 3
    assert float(invoice.price_per_student_snapshot) == 125.0
    assert float(invoice.total_amount) == 150 * 125 * 3


def test_multi_currency_graduated_tiered_billing(client):
    from app.models.tenant_academic_settings import TenantAcademicSettings

    # Create a tenant with currency GHS
    tenant_ghs = Tenant(
        id=uuid.uuid4(),
        slug=f"ghs-{uuid.uuid4().hex[:6]}",
        name="GHS School",
        country_code='GH',
        schema_name=f"schema_{uuid.uuid4().hex[:8]}",
        currency='GHS',
        status='active',
        plan='basic',
    )
    db.session.add(tenant_ghs)

    # Create a tenant with currency XOF
    tenant_xof = Tenant(
        id=uuid.uuid4(),
        slug=f"xof-{uuid.uuid4().hex[:6]}",
        name="XOF School",
        country_code='TG',
        schema_name=f"schema_{uuid.uuid4().hex[:8]}",
        currency='XOF',
        status='active',
        plan='basic',
    )
    db.session.add(tenant_xof)
    db.session.flush()

    today = date.today()
    term_ghs = AcademicTerm(
        tenant_id=tenant_ghs.id,
        name='Term GHS',
        start_date=today,
        end_date=today + timedelta(days=89),
    )
    db.session.add(term_ghs)

    term_xof = AcademicTerm(
        tenant_id=tenant_xof.id,
        name='Term XOF',
        start_date=today,
        end_date=today + timedelta(days=89),
    )
    db.session.add(term_xof)
    db.session.flush()

    plan = Plan.query.filter_by(slug='basic').first()
    if not plan:
        plan = Plan(
            name='Basic',
            slug='basic',
            description='Basic plan',
            price_per_student=100,
            currency='USD',
            is_active=True,
            billing_min_months=1,
        )
        db.session.add(plan)
    else:
        plan.billing_min_months = 1
    db.session.flush()

    # Clear any old tiers to avoid interference
    PlanPricingTier.query.filter_by(plan_id=int(plan.id)).delete()
    db.session.flush()

    # Define GHS pricing tiers:
    # Tier 1: 100-200 -> GHS 15
    # Tier 2: 201-500 -> GHS 10
    tier_ghs_1 = PlanPricingTier(
        plan_id=int(plan.id),
        country_code='GH',
        currency='GHS',
        min_students=100,
        max_students=200,
        price_per_student_month=15,
        is_active=True,
    )
    tier_ghs_2 = PlanPricingTier(
        plan_id=int(plan.id),
        country_code='GH',
        currency='GHS',
        min_students=201,
        max_students=500,
        price_per_student_month=10,
        is_active=True,
    )
    db.session.add(tier_ghs_1)
    db.session.add(tier_ghs_2)

    # Define XOF pricing tiers:
    # Tier 1: 100-200 -> XOF 150
    # Tier 2: 201-500 -> XOF 125
    tier_xof_1 = PlanPricingTier(
        plan_id=int(plan.id),
        country_code='TG',
        currency='XOF',
        min_students=100,
        max_students=200,
        price_per_student_month=150,
        is_active=True,
    )
    tier_xof_2 = PlanPricingTier(
        plan_id=int(plan.id),
        country_code='TG',
        currency='XOF',
        min_students=201,
        max_students=500,
        price_per_student_month=125,
        is_active=True,
    )
    db.session.add(tier_xof_1)
    db.session.add(tier_xof_2)
    db.session.flush()

    # Create school plan subscriptions
    sub_ghs = SchoolPlanSubscription(
        school_id=tenant_ghs.id,
        plan_id=int(plan.id),
        starts_at=today,
        ends_at=None,
        status='active',
        price_per_student_snapshot=15,
        currency_snapshot='GHS',
    )
    sub_xof = SchoolPlanSubscription(
        school_id=tenant_xof.id,
        plan_id=int(plan.id),
        starts_at=today,
        ends_at=None,
        status='active',
        price_per_student_snapshot=150,
        currency_snapshot='XOF',
    )
    db.session.add(sub_ghs)
    db.session.add(sub_xof)
    db.session.flush()

    base_user = _create_user('students_tiered@example.com', role='user')

    # Helper function to register students
    def register_n_students(tenant_id, term_id, n):
        StudentTermRegistration.query.filter_by(tenant_id=tenant_id, academic_term_id=term_id).delete()
        Student.query.filter_by(tenant_id=tenant_id).delete()
        db.session.flush()

        students = []
        regs = []
        for i in range(n):
            s = Student(
                tenant_id=tenant_id,
                user_id=base_user.id,
                admission_number=f"ADM-{tenant_id.hex[:4]}-{i+1:05d}",
                first_name='A',
                last_name=f"S{i}",
                date_of_birth=today - timedelta(days=3650),
                gender='male',
                status='active',
            )
            students.append(s)
            db.session.add(s)
        db.session.flush()

        for s in students:
            regs.append(StudentTermRegistration(
                tenant_id=tenant_id,
                student_id=int(s.id),
                academic_term_id=int(term_id),
                registration_status='registered',
                student_status='active',
            ))
        db.session.bulk_save_objects(regs)
        db.session.commit()

    # Case 1: 150 students -> GHS 2,250 / XOF 22,500
    register_n_students(tenant_ghs.id, term_ghs.id, 150)
    register_n_students(tenant_xof.id, term_xof.id, 150)

    # Validate GHS for 150 students
    invoice_ghs, err = PaymentService.generate_invoice_for_school_term(
        school_id=tenant_ghs.id,
        academic_term_id=int(term_ghs.id),
        months=1
    )
    assert err is None
    assert invoice_ghs is not None
    assert int(invoice_ghs.active_student_count) == 150
    assert invoice_ghs.currency == 'GHS'
    assert float(invoice_ghs.price_per_student_snapshot) == 15.0
    assert float(invoice_ghs.total_amount) == 2250.0  # 150 * 15 * 1 month

    # Validate XOF for 150 students
    invoice_xof, err = PaymentService.generate_invoice_for_school_term(
        school_id=tenant_xof.id,
        academic_term_id=int(term_xof.id),
        months=1
    )
    assert err is None
    assert invoice_xof is not None
    assert int(invoice_xof.active_student_count) == 150
    assert invoice_xof.currency == 'XOF'
    assert float(invoice_xof.price_per_student_snapshot) == 150.0
    assert float(invoice_xof.total_amount) == 22500.0  # 150 * 150 * 1 month

    # Case 2: 350 students -> GHS 3,500 / XOF 43,750
    register_n_students(tenant_ghs.id, term_ghs.id, 350)
    register_n_students(tenant_xof.id, term_xof.id, 350)

    # Force recalculation by deleting previous invoices
    BillingInvoice.query.filter_by(tenant_id=tenant_ghs.id).delete()
    BillingInvoice.query.filter_by(tenant_id=tenant_xof.id).delete()
    db.session.commit()

    # Validate GHS for 350 students
    invoice_ghs, err = PaymentService.generate_invoice_for_school_term(
        school_id=tenant_ghs.id,
        academic_term_id=int(term_ghs.id),
        months=1
    )
    assert err is None
    assert invoice_ghs is not None
    assert int(invoice_ghs.active_student_count) == 350
    assert invoice_ghs.currency == 'GHS'
    assert float(invoice_ghs.price_per_student_snapshot) == 10.0
    assert float(invoice_ghs.total_amount) == 3500.0  # 350 * 10 * 1 month

    # Validate XOF for 350 students
    invoice_xof, err = PaymentService.generate_invoice_for_school_term(
        school_id=tenant_xof.id,
        academic_term_id=int(term_xof.id),
        months=1
    )
    assert err is None
    assert invoice_xof is not None
    assert int(invoice_xof.active_student_count) == 350
    assert invoice_xof.currency == 'XOF'
    assert float(invoice_xof.price_per_student_snapshot) == 125.0
    assert float(invoice_xof.total_amount) == 43750.0  # 350 * 125 * 1 month

    # Case 3: Anti-Tampering Prevention
    # active students = 50, but peak = 150
    register_n_students(tenant_ghs.id, term_ghs.id, 50)
    BillingInvoice.query.filter_by(tenant_id=tenant_ghs.id).delete()
    db.session.commit()

    # Store peak count of 150 in TenantAcademicSettings
    db.session.add(TenantAcademicSettings(
        tenant_id=tenant_ghs.id,
        settings={'billing_peak_students': 150}
    ))
    db.session.commit()

    invoice_anti_tamper, err = PaymentService.generate_invoice_for_school_term(
        school_id=tenant_ghs.id,
        academic_term_id=int(term_ghs.id),
        months=1
    )
    assert err is None
    assert invoice_anti_tamper is not None
    # Count should evaluate to the historical peak (150) instead of current (50)
    assert int(invoice_anti_tamper.active_student_count) == 150
    assert float(invoice_anti_tamper.total_amount) == 2250.0

    # Case 4: Safe Fallback for out of bounds
    # Register 600 students (exceeding all defined tiers where max is 500)
    register_n_students(tenant_ghs.id, term_ghs.id, 600)
    BillingInvoice.query.filter_by(tenant_id=tenant_ghs.id).delete()
    # Remove settings so it uses actual active count
    TenantAcademicSettings.query.filter_by(tenant_id=tenant_ghs.id).delete()
    db.session.commit()

    invoice_fallback, err = PaymentService.generate_invoice_for_school_term(
        school_id=tenant_ghs.id,
        academic_term_id=int(term_ghs.id),
        months=1
    )
    assert err is None
    assert invoice_fallback is not None
    # Uses highest active tier (GHS 10/student/month)
    assert float(invoice_fallback.price_per_student_snapshot) == 10.0
    assert float(invoice_fallback.total_amount) == 6000.0  # 600 * 10


