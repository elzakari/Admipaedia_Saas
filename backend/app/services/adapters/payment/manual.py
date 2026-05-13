from __future__ import annotations

from typing import Optional

from app.models.payments import PaymentGateway, Payment
from app.models.billing import BillingInvoice

from .base import PaymentGatewayAdapter, PaymentInitResult, PaymentVerifyResult


class ManualPaymentAdapter(PaymentGatewayAdapter):
    @property
    def name(self) -> str:
        return 'manual'

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
            authorization_url=None,
            gateway_transaction_id=None,
            raw={'instructions': 'Submit proof of payment for manual review.'},
        )

    def verify(self, *, gateway: PaymentGateway, payment: Payment) -> PaymentVerifyResult:
        paid = str(payment.status) == 'successful'
        return PaymentVerifyResult(
            status=str(payment.status),
            gateway_transaction_id=payment.gateway_transaction_id,
            paid=paid,
            amount=float(payment.amount) if payment.amount is not None else None,
            currency=payment.currency,
            raw=payment.gateway_response if isinstance(payment.gateway_response, dict) else None,
        )

    def verify_webhook(self, *, gateway: PaymentGateway, body: bytes, headers: dict[str, str]) -> bool:
        return False
