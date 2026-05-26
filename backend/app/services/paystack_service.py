from __future__ import annotations

import hashlib
import hmac
from decimal import Decimal
from typing import Any, Optional
from flask import current_app

from app.extensions import db
from app.models.payments import PaymentGateway

class PaystackService:
    @staticmethod
    def get_secret_key() -> str:
        """
        Retrieves the Paystack Secret Key from the active database payment gateway configuration.
        Falls back to current_app.config['PAYSTACK_SECRET_KEY'] if not configured.
        """
        # Look up active paystack gateway config
        gw = PaymentGateway.query.filter_by(name='paystack', is_active=True).first()
        if gw:
            secret = gw.get_secret_key()
            if secret:
                return secret
        
        # Fallback to configuration
        return current_app.config.get('PAYSTACK_SECRET_KEY') or ''

    @classmethod
    def verify_webhook_signature(cls, signature: str, payload: bytes) -> bool:
        """
        Validates the SHA512 signature header sent by Paystack against the local secret key.
        """
        if not signature:
            return False
            
        secret_key = cls.get_secret_key()
        if not secret_key:
            current_app.logger.warning("Paystack secret key is not configured. Webhook validation skipped/failed.")
            return False
            
        computed = hmac.new(
            secret_key.encode('utf-8'),
            payload,
            hashlib.sha512
        ).hexdigest()
        
        return hmac.compare_digest(computed, signature)

    @staticmethod
    def to_minor_units(amount: Decimal) -> int:
        """
        Converts a Decimal amount in major units (e.g. GHS 10.50) to minor units (e.g. 1050 pesewas).
        """
        return int(amount * Decimal('100'))

    @staticmethod
    def from_minor_units(amount: int) -> Decimal:
        """
        Converts minor units (integer, e.g. 1050) back to major units Decimal (e.g. 10.50).
        """
        return Decimal(amount) / Decimal('100')
