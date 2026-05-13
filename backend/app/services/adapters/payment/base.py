from __future__ import annotations

import abc
from dataclasses import dataclass
from typing import Any, Optional

from app.models.payments import PaymentGateway, Payment
from app.models.billing import BillingInvoice


@dataclass
class PaymentInitResult:
    payment_reference: str
    authorization_url: Optional[str]
    gateway_transaction_id: Optional[str]
    raw: Optional[dict[str, Any]] = None


@dataclass
class PaymentVerifyResult:
    status: str
    gateway_transaction_id: Optional[str]
    paid: bool
    amount: Optional[float] = None
    currency: Optional[str] = None
    raw: Optional[dict[str, Any]] = None


class PaymentGatewayAdapter(abc.ABC):
    @property
    @abc.abstractmethod
    def name(self) -> str:
        raise NotImplementedError

    @abc.abstractmethod
    def initialize(
        self,
        *,
        gateway: PaymentGateway,
        invoice: BillingInvoice,
        payment: Payment,
        return_url: Optional[str],
        notify_url: Optional[str],
    ) -> PaymentInitResult:
        raise NotImplementedError

    @abc.abstractmethod
    def verify(self, *, gateway: PaymentGateway, payment: Payment) -> PaymentVerifyResult:
        raise NotImplementedError

    @abc.abstractmethod
    def verify_webhook(self, *, gateway: PaymentGateway, body: bytes, headers: dict[str, str]) -> bool:
        raise NotImplementedError
