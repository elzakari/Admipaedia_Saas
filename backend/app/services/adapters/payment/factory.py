from __future__ import annotations

from dataclasses import dataclass
from typing import Optional

from flask import current_app

from app.models.tenant import Tenant
from app.models.payments import PaymentGateway

from .base import PaymentGatewayAdapter
from .manual import ManualPaymentAdapter
from .mock import MockPaymentAdapter
from .paystack import PaystackAdapter
from .flutterwave import FlutterwaveAdapter
from .cinetpay import CinetPayAdapter


FRANCOPHONE_XOF_COUNTRIES = {'TG', 'CI', 'BJ', 'BF', 'SN', 'ML', 'NE'}


@dataclass
class SelectedGateway:
    gateway: PaymentGateway
    adapter: PaymentGatewayAdapter


class PaymentGatewayFactory:
    @staticmethod
    def adapter_for(name: str) -> PaymentGatewayAdapter:
        key = (name or '').strip().lower()
        if current_app.config.get('TESTING'):
            return MockPaymentAdapter()
        if key == 'paystack':
            return PaystackAdapter()
        if key == 'cinetpay':
            return CinetPayAdapter()
        if key == 'flutterwave':
            return FlutterwaveAdapter()
        return ManualPaymentAdapter()

    @staticmethod
    def _active_gateway(name: str, country_code: Optional[str], currency: Optional[str]) -> Optional[PaymentGateway]:
        q = PaymentGateway.query.filter_by(name=name, is_active=True)
        if country_code is not None:
            q = q.filter(PaymentGateway.country_code == country_code)
        if currency is not None:
            q = q.filter(PaymentGateway.currency == currency)
        q = q.order_by(PaymentGateway.is_default.desc(), PaymentGateway.id.desc())
        return q.first()

    @staticmethod
    def getBestPaymentGatewayForSchool(school_id) -> Optional[SelectedGateway]:
        tenant = Tenant.query.get(school_id)
        if not tenant:
            return None

        cc = (tenant.country_code or '').upper().strip() or None
        currency = (tenant.currency or '').upper().strip() or None

        if cc == 'GH':
            g = PaymentGatewayFactory._active_gateway('paystack', 'GH', currency or 'GHS') or PaymentGatewayFactory._active_gateway('paystack', 'GH', None)
            if g:
                return SelectedGateway(gateway=g, adapter=PaymentGatewayFactory.adapter_for(g.name))

        if cc == 'TG':
            g = PaymentGatewayFactory._active_gateway('cinetpay', 'TG', currency or 'XOF') or PaymentGatewayFactory._active_gateway('cinetpay', 'TG', None)
            if g:
                return SelectedGateway(gateway=g, adapter=PaymentGatewayFactory.adapter_for(g.name))

        if cc in FRANCOPHONE_XOF_COUNTRIES or (currency == 'XOF' and cc and cc != 'GH'):
            g = (
                PaymentGatewayFactory._active_gateway('cinetpay', cc, currency or 'XOF')
                or PaymentGatewayFactory._active_gateway('cinetpay', None, currency or 'XOF')
                or PaymentGatewayFactory._active_gateway('cinetpay', None, None)
            )
            if g:
                return SelectedGateway(gateway=g, adapter=PaymentGatewayFactory.adapter_for(g.name))

        fw = PaymentGatewayFactory._active_gateway('flutterwave', cc, currency) or PaymentGatewayFactory._active_gateway('flutterwave', None, None)
        if fw:
            return SelectedGateway(gateway=fw, adapter=PaymentGatewayFactory.adapter_for(fw.name))

        manual = PaymentGatewayFactory._active_gateway('manual', cc, currency) or PaymentGatewayFactory._active_gateway('manual', None, None)
        if manual:
            return SelectedGateway(gateway=manual, adapter=PaymentGatewayFactory.adapter_for(manual.name))

        return None

