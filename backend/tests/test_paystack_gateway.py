import json
import hmac
import hashlib
import uuid
import datetime
from decimal import Decimal
from flask import g
import pytest

from app.extensions import db
from app.models.tenant import Tenant, Branch
from app.models.student import Student
from app.models.finance import StudentFee, Payment as StudentPayment, PaymentAllocation
from app.models.payments import PaymentGateway
from app.models.user import User
from app.services.paystack_service import PaystackService

def test_paystack_service_unit():
    """
    Unit test for PaystackService minor/major unit conversions.
    """
    # 1. Decimal to Minor Units (Pesewas/Cents)
    assert PaystackService.to_minor_units(Decimal('10.50')) == 1050
    assert PaystackService.to_minor_units(Decimal('0.05')) == 5
    assert PaystackService.to_minor_units(Decimal('100.00')) == 10000

    # 2. Minor Units to Decimal
    assert PaystackService.from_minor_units(1050) == Decimal('10.50')
    assert PaystackService.from_minor_units(5) == Decimal('0.05')
    assert PaystackService.from_minor_units(10000) == Decimal('100.00')


def test_paystack_webhook_success(app, client):
    """
    Integration test asserting a valid cryptographic webhook successfully
    records student payment allocations and settles fee balances.
    """
    # Ensure test isolation by deleting any existing paystack gateway
    db.session.query(PaymentGateway).filter_by(name="paystack").delete()
    db.session.commit()

    tenant_id = uuid.uuid4()
    branch_id = uuid.uuid4()
    secret_key = "sk_test_secret_paystack_key_12345"

    # 1. Create a tenant and active paystack payment gateway configuration
    tenant = Tenant(
        id=tenant_id,
        slug=f"school-{uuid.uuid4().hex[:4]}",
        name="Test Academy",
        country_code="GH",
        currency="GHS",
        status="active",
        schema_name=f"schema_{uuid.uuid4().hex[:4]}"
    )
    branch = Branch(
        id=branch_id,
        tenant_id=tenant_id,
        name="Main Campus"
    )
    
    # Active gateway with encrypted secret key
    gateway = PaymentGateway(
        name="paystack",
        public_key="pk_test_public_paystack_key_12345",
        is_active=True,
        supported_channels=["card", "mobile_money"]
    )
    gateway.set_secret_key(secret_key)

    db.session.add_all([tenant, branch, gateway])
    db.session.flush()

    # 2. Create student user and student
    student_user = User(
        username=f"student_{uuid.uuid4().hex[:4]}",
        email="student@academy.com",
        role="student"
    )
    db.session.add(student_user)
    db.session.flush()

    student = Student(
        tenant_id=tenant_id,
        branch_id=branch_id,
        user_id=student_user.id,
        admission_number="ADM-PAY-01",
        first_name="Emmanuel",
        last_name="Mensah",
        date_of_birth=datetime.date(2012, 5, 20),
        gender="Male",
        email="student@academy.com"
    )
    db.session.add(student)
    db.session.flush()

    # 3. Create outstanding student fee record
    student_fee = StudentFee(
        student_id=student.id,
        fee_structure_id=99,
        branch_id=branch_id,
        original_amount=Decimal("150.00"),
        discount_amount=Decimal("0.00"),
        final_amount=Decimal("150.00"),
        paid_amount=Decimal("50.00"),
        balance=Decimal("100.00"),
        status="partial"
    )
    db.session.add(student_fee)
    db.session.commit()

    # 4. Prepare Paystack Webhook Payload
    reference = f"ref_{uuid.uuid4().hex[:8]}"
    payload = {
        "event": "charge.success",
        "data": {
            "id": 1234567,
            "status": "success",
            "reference": reference,
            "amount": 10000,  # 100.00 GHS in minor units
            "currency": "GHS",
            "channel": "mobile_money",
            "metadata": {
                "tenant_id": str(tenant_id),
                "branch_id": str(branch_id),
                "student_id": student.id,
                "student_fee_id": student_fee.id
            },
            "customer": {
                "email": "student@academy.com"
            }
        }
    }

    body = json.dumps(payload).encode('utf-8')

    # Compute valid signature
    signature = hmac.new(
        secret_key.encode('utf-8'),
        body,
        hashlib.sha512
    ).hexdigest()

    # 5. POST to Webhook
    response = client.post(
        '/api/v1/payments/webhook',
        data=body,
        headers={
            'Content-Type': 'application/json',
            'x-paystack-signature': signature
        }
    )

    # 6. Verify response and db state
    assert response.status_code == 200
    assert response.json["success"] is True

    # Assert student payment record was written
    payment = StudentPayment.query.filter_by(external_reference=reference).first()
    assert payment is not None
    assert payment.amount == Decimal("100.00")
    assert payment.currency == "GHS"
    assert payment.payment_method == "mobile_money"
    assert payment.payment_provider == "paystack"
    assert payment.status == "completed"

    # Assert payment allocation was written
    allocation = PaymentAllocation.query.filter_by(payment_id=payment.id).first()
    assert allocation is not None
    assert allocation.student_fee_id == student_fee.id
    assert allocation.amount_allocated == Decimal("100.00")

    # Assert student fee balance and status are settled
    updated_fee = StudentFee.query.get(student_fee.id)
    assert updated_fee.paid_amount == Decimal("150.00")
    assert updated_fee.balance == Decimal("0.00")
    assert updated_fee.status == "paid"


def test_paystack_webhook_invalid_signature(app, client):
    """
    Test that webhook calls with invalid cryptographic signatures are blocked.
    """
    # Ensure test isolation by deleting any existing paystack gateway
    db.session.query(PaymentGateway).filter_by(name="paystack").delete()
    db.session.commit()

    tenant_id = uuid.uuid4()
    branch_id = uuid.uuid4()
    secret_key = "sk_test_correct_key"

    # Create active gateway
    gateway = PaymentGateway(
        name="paystack",
        public_key="pk_test",
        is_active=True
    )
    gateway.set_secret_key(secret_key)
    db.session.add(gateway)
    db.session.commit()

    payload = {
        "event": "charge.success",
        "data": {
            "reference": "txn_test_123",
            "amount": 5000,
            "currency": "GHS",
            "metadata": {
                "tenant_id": str(tenant_id),
                "branch_id": str(branch_id),
                "student_id": 1,
                "student_fee_id": 1
            }
        }
    }

    body = json.dumps(payload).encode('utf-8')
    invalid_signature = "wrong_signature_123456"

    response = client.post(
        '/api/v1/payments/webhook',
        data=body,
        headers={
            'Content-Type': 'application/json',
            'x-paystack-signature': invalid_signature
        }
    )

    assert response.status_code == 401
    assert response.json["success"] is False
    assert "Invalid cryptographic signature" in response.json["message"]

    # Verify no payment was created
    payment = StudentPayment.query.filter_by(external_reference="txn_test_123").first()
    assert payment is None


def test_paystack_webhook_missing_metadata(app, client):
    """
    Test that webhook requests with missing metadata parameters return 400.
    """
    # Ensure test isolation by deleting any existing paystack gateway
    db.session.query(PaymentGateway).filter_by(name="paystack").delete()
    db.session.commit()

    secret_key = "sk_test_secret"
    gateway = PaymentGateway(name="paystack", is_active=True)
    gateway.set_secret_key(secret_key)
    db.session.add(gateway)
    db.session.commit()

    payload = {
        "event": "charge.success",
        "data": {
            "reference": "txn_no_meta",
            "amount": 2500,
            "currency": "GHS",
            "metadata": {
                # Missing student_id, student_fee_id, etc.
                "tenant_id": str(uuid.uuid4())
            }
        }
    }

    body = json.dumps(payload).encode('utf-8')
    signature = hmac.new(secret_key.encode('utf-8'), body, hashlib.sha512).hexdigest()

    response = client.post(
        '/api/v1/payments/webhook',
        data=body,
        headers={
            'Content-Type': 'application/json',
            'x-paystack-signature': signature
        }
    )

    assert response.status_code == 400
    assert response.json["success"] is False
    assert "Missing tenant_id" in response.json["message"]


def test_get_payment_config(app, client):
    """
    Asserts the dynamic public config endpoint correctly exposes the
    active Paystack public key.
    """
    # Ensure test isolation by deleting any existing paystack gateway
    db.session.query(PaymentGateway).filter_by(name="paystack").delete()
    db.session.commit()

    # Create active paystack gateway config
    gateway = PaymentGateway(
        name="paystack",
        public_key="pk_dynamic_active_key_999",
        is_active=True
    )
    db.session.add(gateway)
    db.session.commit()

    response = client.get('/api/v1/payments/config')

    assert response.status_code == 200
    assert response.json["success"] is True
    assert response.json["publicKey"] == "pk_dynamic_active_key_999"
