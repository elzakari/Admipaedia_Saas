from __future__ import annotations

import hashlib
import hmac
from typing import Optional

import requests

from app.models.payments import PaymentGateway, Payment
from app.models.billing import BillingInvoice
from app.models.user import User

from .base import PaymentGatewayAdapter, PaymentInitResult, PaymentVerifyResult


class CinetPayAdapter(PaymentGatewayAdapter):
    @property
    def name(self) -> str:
        return 'cinetpay'

    def _base_url(self, gateway: PaymentGateway) -> str:
        return 'https://api-checkout.cinetpay.com'

    def _apikey(self, gateway: PaymentGateway) -> str:
        return gateway.get_secret_key() or ''

    def _site_id(self, gateway: PaymentGateway) -> str:
        return (gateway.public_key or '').strip()

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
        apikey = self._apikey(gateway)
        site_id = self._site_id(gateway)
        if not apikey or not site_id:
            raise ValueError('CinetPay gateway keys are not configured')

        payload = {
            'apikey': apikey,
            'site_id': site_id,
            'transaction_id': payment.payment_reference,
            'amount': int(round(float(invoice.total_amount))),
            'currency': invoice.currency,
            'description': f'Invoice {invoice.invoice_number}',
            'return_url': return_url or '',
            'notify_url': notify_url or '',
            'customer_email': self._email_for_payment(payment),
        }

        channel = str(payment.payment_channel or '').strip().lower()
        if channel in ('mobile_money', 'card', 'bank_transfer', 'wallet'):
            payload['channels'] = channel

        url = f"{self._base_url(gateway)}/v2/payment"
        resp = requests.post(url, json=payload, timeout=20)
        data = resp.json() if resp.content else {}
        if resp.status_code >= 400 or str(data.get('code')) not in ('201', '00', '0') and str(data.get('status')).lower() not in ('success', 'successful'):
            raise ValueError(data.get('message') or 'CinetPay initialization failed')

        d = data.get('data') or data
        payment_url = d.get('payment_url') or d.get('payment_url') or d.get('paymentUrl')
        return PaymentInitResult(
            payment_reference=payment.payment_reference,
            authorization_url=payment_url,
            gateway_transaction_id=None,
            raw=data,
        )

    def verify(self, *, gateway: PaymentGateway, payment: Payment) -> PaymentVerifyResult:
        apikey = self._apikey(gateway)
        site_id = self._site_id(gateway)
        if not apikey or not site_id:
            return PaymentVerifyResult(status='failed', gateway_transaction_id=None, paid=False)

        url = f"{self._base_url(gateway)}/v2/payment/check"
        resp = requests.post(
            url,
            json={'apikey': apikey, 'site_id': site_id, 'transaction_id': payment.payment_reference},
            timeout=20,
        )
        data = resp.json() if resp.content else {}
        if resp.status_code >= 400:
            return PaymentVerifyResult(status='failed', gateway_transaction_id=None, paid=False, raw=data)

        d = data.get('data') or {}
        status = str(d.get('status') or d.get('payment_status') or '').lower()
        paid = status in ('accepted', 'success', 'successful', 'paid')
        return PaymentVerifyResult(
            status='successful' if paid else 'failed',
            gateway_transaction_id=str(d.get('cpm_trans_id') or d.get('transaction_id') or '') or None,
            paid=paid,
            amount=float(d.get('amount')) if d.get('amount') is not None else None,
            currency=d.get('currency'),
            raw=data,
        )

    def verify_webhook(self, *, gateway: PaymentGateway, body: bytes, headers: dict[str, str]) -> bool:
        token = headers.get('x-token') or headers.get('X-Token') or headers.get('X-TOKEN')
        secret = gateway.get_webhook_secret() or gateway.get_secret_key() or ''
        if not token or not secret:
            return False
        computed = hmac.new(secret.encode('utf-8'), body, hashlib.sha256).hexdigest()
        return hmac.compare_digest(str(token), str(computed))

