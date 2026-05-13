from __future__ import annotations

from typing import Optional

import requests

from app.models.payments import PaymentGateway, Payment
from app.models.billing import BillingInvoice
from app.models.user import User

from .base import PaymentGatewayAdapter, PaymentInitResult, PaymentVerifyResult


class FlutterwaveAdapter(PaymentGatewayAdapter):
    @property
    def name(self) -> str:
        return 'flutterwave'

    def _base_url(self, gateway: PaymentGateway) -> str:
        return 'https://api.flutterwave.com'

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
        channel = str(payment.payment_channel or '').strip().lower()
        payment_options = None
        if channel == 'mobile_money':
            payment_options = 'mobilemoney'
        elif channel == 'card':
            payment_options = 'card'
        elif channel == 'bank_transfer':
            payment_options = 'banktransfer'
        elif channel == 'wallet':
            payment_options = 'account'

        payload = {
            'tx_ref': payment.payment_reference,
            'amount': str(invoice.total_amount),
            'currency': invoice.currency,
            'redirect_url': return_url or '',
            'customer': {'email': self._email_for_payment(payment)},
            'customizations': {
                'title': 'ADMIPAEDIA Invoice',
                'description': f'Invoice {invoice.invoice_number}',
            },
        }
        if payment_options:
            payload['payment_options'] = payment_options

        url = f"{self._base_url(gateway)}/v3/payments"
        resp = requests.post(url, headers=self._auth_headers(gateway), json=payload, timeout=15)
        data = resp.json() if resp.content else {}
        if resp.status_code >= 400 or str(data.get('status')).lower() not in ('success', 'successful'):
            raise ValueError(data.get('message') or 'Flutterwave initialization failed')

        d = data.get('data') or {}
        return PaymentInitResult(
            payment_reference=payment.payment_reference,
            authorization_url=d.get('link'),
            gateway_transaction_id=None,
            raw=data,
        )

    def verify(self, *, gateway: PaymentGateway, payment: Payment) -> PaymentVerifyResult:
        url = f"{self._base_url(gateway)}/v3/transactions/verify_by_reference"
        resp = requests.get(url, headers=self._auth_headers(gateway), params={'tx_ref': payment.payment_reference}, timeout=15)
        data = resp.json() if resp.content else {}
        if resp.status_code >= 400:
            return PaymentVerifyResult(status='failed', gateway_transaction_id=None, paid=False, raw=data)

        d = data.get('data') or {}
        paid = str(d.get('status')).lower() == 'successful'
        return PaymentVerifyResult(
            status='successful' if paid else 'failed',
            gateway_transaction_id=str(d.get('id')) if d.get('id') is not None else None,
            paid=paid,
            amount=float(d.get('amount')) if d.get('amount') is not None else None,
            currency=d.get('currency'),
            raw=data,
        )

    def verify_webhook(self, *, gateway: PaymentGateway, body: bytes, headers: dict[str, str]) -> bool:
        expected = gateway.get_webhook_secret() or ''
        provided = headers.get('verif-hash') or headers.get('Verif-Hash') or headers.get('VERIF-HASH')
        if not expected or not provided:
            return False
        return str(provided).strip() == str(expected).strip()
