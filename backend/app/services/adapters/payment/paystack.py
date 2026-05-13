from __future__ import annotations

import hashlib
import hmac
from typing import Optional

import requests

from app.models.payments import PaymentGateway, Payment
from app.models.billing import BillingInvoice
from app.models.user import User

from .base import PaymentGatewayAdapter, PaymentInitResult, PaymentVerifyResult


class PaystackAdapter(PaymentGatewayAdapter):
    @property
    def name(self) -> str:
        return 'paystack'

    def _base_url(self, gateway: PaymentGateway) -> str:
        return 'https://api.paystack.co'

    def _auth_headers(self, gateway: PaymentGateway) -> dict[str, str]:
        secret = gateway.get_secret_key() or ''
        return {'Authorization': f'Bearer {secret}', 'Content-Type': 'application/json'}

    def _email_for_payment(self, payment: Payment) -> str:
        uid = getattr(payment, 'submitted_by_user_id', None)
        if not uid:
            return 'billing@admipaedia.local'
        u = User.query.get(int(uid))
        return (getattr(u, 'email', None) or 'billing@admipaedia.local').strip()

    def initialize(
        self,
        *,
        gateway: PaymentGateway,
        invoice: BillingInvoice,
        payment: Payment,
        return_url: Optional[str],
        notify_url: Optional[str],
    ) -> PaymentInitResult:
        amount_minor = int(round(float(invoice.total_amount) * 100))
        channel = str(payment.payment_channel or '').strip().lower()
        channels = None
        if channel == 'mobile_money':
            channels = ['mobile_money']
        elif channel == 'card':
            channels = ['card']
        elif channel == 'bank_transfer':
            channels = ['bank_transfer']

        payload = {
            'email': self._email_for_payment(payment),
            'amount': amount_minor,
            'currency': invoice.currency,
            'reference': payment.payment_reference,
        }
        if channels:
            payload['channels'] = channels
        if return_url:
            payload['callback_url'] = return_url

        url = f"{self._base_url(gateway)}/transaction/initialize"
        resp = requests.post(url, headers=self._auth_headers(gateway), json=payload, timeout=15)
        data = resp.json() if resp.content else {}
        if resp.status_code >= 400 or not data.get('status'):
            raise ValueError(data.get('message') or 'Paystack initialization failed')

        d = data.get('data') or {}
        return PaymentInitResult(
            payment_reference=str(d.get('reference') or payment.payment_reference),
            authorization_url=d.get('authorization_url'),
            gateway_transaction_id=d.get('access_code'),
            raw=data,
        )

    def verify(self, *, gateway: PaymentGateway, payment: Payment) -> PaymentVerifyResult:
        url = f"{self._base_url(gateway)}/transaction/verify/{payment.payment_reference}"
        resp = requests.get(url, headers=self._auth_headers(gateway), timeout=15)
        data = resp.json() if resp.content else {}
        if resp.status_code >= 400 or not data.get('status'):
            return PaymentVerifyResult(status='failed', gateway_transaction_id=None, paid=False, raw=data)

        d = data.get('data') or {}
        paid = str(d.get('status')).lower() == 'success'
        amount = d.get('amount')
        amount_major = float(amount) / 100.0 if amount is not None else None
        return PaymentVerifyResult(
            status='successful' if paid else 'failed',
            gateway_transaction_id=str(d.get('id')) if d.get('id') is not None else None,
            paid=paid,
            amount=amount_major,
            currency=d.get('currency'),
            raw=data,
        )

    def verify_webhook(self, *, gateway: PaymentGateway, body: bytes, headers: dict[str, str]) -> bool:
        signature = headers.get('x-paystack-signature') or headers.get('X-Paystack-Signature')
        secret = gateway.get_secret_key() or ''
        if not signature or not secret:
            return False
        computed = hmac.new(secret.encode('utf-8'), body, hashlib.sha512).hexdigest()
        return hmac.compare_digest(str(signature), str(computed))
