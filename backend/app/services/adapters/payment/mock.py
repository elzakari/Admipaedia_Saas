from __future__ import annotations

from datetime import datetime
from typing import Optional

from app.models.payments import PaymentGateway, Payment
from app.models.billing import BillingInvoice

from .base import PaymentGatewayAdapter, PaymentInitResult, PaymentVerifyResult


class MockPaymentAdapter(PaymentGatewayAdapter):
    @property
    def name(self) -> str:
        return 'mock'

    def initialize(
        self,
        *,
        gateway: PaymentGateway,
        invoice: BillingInvoice,
        payment: Payment,
        return_url: Optional[str],
        notify_url: Optional[str],
    ) -> PaymentInitResult:
        return PaymentInitResult(
            payment_reference=payment.payment_reference,
            authorization_url=f'https://example.test/pay/{payment.payment_reference}',
            gateway_transaction_id=f'mock_{payment.payment_reference}',
            raw={'provider': 'mock', 'created_at': datetime.utcnow().isoformat()},
        )

    def verify(self, *, gateway: PaymentGateway, payment: Payment) -> PaymentVerifyResult:
        return PaymentVerifyResult(
            status='successful',
            gateway_transaction_id=payment.gateway_transaction_id,
            paid=True,
            amount=float(payment.amount) if payment.amount is not None else None,
            currency=payment.currency,
            raw={'provider': 'mock'},
        )

    def verify_webhook(self, *, gateway: PaymentGateway, body: bytes, headers: dict[str, str]) -> bool:
        return True
