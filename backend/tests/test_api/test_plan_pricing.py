import uuid
from datetime import date, timedelta

from app.extensions import db, bcrypt
from app.models.user import User
from app.models.tenant import Tenant
from app.models.academic_term import AcademicTerm
from app.models.billing import Plan, PlanPricingTier, SchoolPlanSubscription, StudentTermRegistration
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

