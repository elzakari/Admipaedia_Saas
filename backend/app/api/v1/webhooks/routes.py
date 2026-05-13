from __future__ import annotations

from flask import jsonify, request

from app.services.payments.service import PaymentService

from . import webhooks_bp


def _headers_dict():
    return {str(k).lower(): str(v) for k, v in request.headers.items()}


@webhooks_bp.route('/paystack', methods=['POST'])
def paystack_webhook():
    ok, msg = PaymentService.handle_webhook(gateway_name='paystack', headers=_headers_dict(), body=request.get_data() or b'')
    status = 200 if ok else 400
    return jsonify({'success': ok, 'message': msg}), status


@webhooks_bp.route('/cinetpay', methods=['POST'])
def cinetpay_webhook():
    ok, msg = PaymentService.handle_webhook(gateway_name='cinetpay', headers=_headers_dict(), body=request.get_data() or b'')
    status = 200 if ok else 400
    return jsonify({'success': ok, 'message': msg}), status


@webhooks_bp.route('/flutterwave', methods=['POST'])
def flutterwave_webhook():
    ok, msg = PaymentService.handle_webhook(gateway_name='flutterwave', headers=_headers_dict(), body=request.get_data() or b'')
    status = 200 if ok else 400
    return jsonify({'success': ok, 'message': msg}), status

