from flask import Blueprint, request, jsonify, send_file, after_this_request, g
from flask_jwt_extended import jwt_required, get_jwt_identity
from app.services.report_card_generator import ReportCardGenerator
from app.services.financial_ledger_service import FinancialLedgerService
from app.models.user import User
from app.utils.tenant_context import tenant_required
from decimal import Decimal
import gc
import uuid

saas_report_bp = Blueprint('saas_report', __name__)

def serialize_decimals(obj):
    """Recursively converts Decimal instances to floats for JSON compatibility."""
    if isinstance(obj, dict):
        return {k: serialize_decimals(v) for k, v in obj.items()}
    elif isinstance(obj, list):
        return [serialize_decimals(i) for i in obj]
    elif isinstance(obj, Decimal):
        return float(obj)
    return obj

@saas_report_bp.route('/saas/report-card/pdf', methods=['GET'])
@jwt_required()
def download_report_card_pdf():
    """
    HTTP GET endpoint delivering branch-isolated PDF streams.
    Accepts:
      - student_id (int)
      - academic_cycle_id (UUID string)
    """
    student_id = request.args.get('student_id')
    academic_cycle_id = request.args.get('academic_cycle_id')
    
    if not student_id or not academic_cycle_id:
        return jsonify({'success': False, 'message': 'Missing student_id or academic_cycle_id query arguments'}), 400
        
    try:
        # Enforce memory cleanup hook on request termination
        @after_this_request
        def trigger_garbage_collection(response):
            gc.collect()
            return response

        pdf_stream = ReportCardGenerator.generate_report_card_pdf(
            student_id=int(student_id),
            academic_cycle_id=academic_cycle_id
        )
        
        return send_file(
            pdf_stream,
            mimetype='application/pdf',
            as_attachment=True,
            download_name=f'report_card_{student_id}.pdf'
        )
    except ValueError as e:
        return jsonify({'success': False, 'message': str(e)}), 404
    except Exception as e:
        return jsonify({'success': False, 'message': 'Failed to compile report card', 'error': str(e)}), 500


@saas_report_bp.route('/saas/financial/branch-ledger', methods=['GET'])
@tenant_required
def get_branch_ledger():
    """
    GET branch ledger metrics.
    Enforces active branch context scoping for non-proprietors.
    """
    current_user_id = get_jwt_identity()
    user = User.query.get(current_user_id)
    if not user:
        return jsonify({"success": False, "message": "User not found."}), 404

    tenant_id = getattr(g, 'tenant_id', None)
    if not tenant_id:
        return jsonify({"success": False, "message": "Tenant context not found."}), 400

    # Resolve target branch_id
    req_branch_id_str = request.args.get('branch_id')
    active_branch_id = getattr(g, 'branch_id', None)

    # Determine if requesting user is a verified school proprietor
    is_proprietor = user.role in ('admin', 'school_admin', 'super_admin', 'super_manager')

    if req_branch_id_str:
        try:
            target_branch_id = uuid.UUID(str(req_branch_id_str).strip())
        except ValueError:
            return jsonify({"success": False, "message": "Invalid branch_id format."}), 400
    else:
        target_branch_id = active_branch_id

    if not target_branch_id:
        return jsonify({"success": False, "message": "Branch context not resolved."}), 400

    # Enforce horizontal visibility protection
    if not is_proprietor:
        if active_branch_id is None or target_branch_id != active_branch_id:
            return jsonify({
                "success": False,
                "message": "Unauthorized access to other branch financial statistics."
            }), 403

    try:
        metrics = FinancialLedgerService.get_branch_ledger_metrics(tenant_id, target_branch_id)
        return jsonify({
            "success": True,
            "data": serialize_decimals(metrics)
        })
    except ValueError as e:
        return jsonify({"success": False, "message": str(e)}), 404
    except Exception as e:
        return jsonify({"success": False, "message": "Failed to load ledger metrics.", "error": str(e)}), 500


@saas_report_bp.route('/saas/financial/global-ledger', methods=['GET'])
@tenant_required
def get_global_ledger():
    """
    GET global multi-branch comparison ledger metrics and SaaS subscription details.
    Restricted to verified school proprietors.
    """
    current_user_id = get_jwt_identity()
    user = User.query.get(current_user_id)
    if not user:
        return jsonify({"success": False, "message": "User not found."}), 404

    # Enforce verified school proprietor restriction
    is_proprietor = user.role in ('admin', 'school_admin', 'super_admin', 'super_manager')
    if not is_proprietor:
        return jsonify({
            "success": False,
            "message": "Unauthorized access to global cross-campus financial ledger statistics."
        }), 403

    tenant_id = getattr(g, 'tenant_id', None)
    if not tenant_id:
        return jsonify({"success": False, "message": "Tenant context not found."}), 400

    try:
        metrics = FinancialLedgerService.get_proprietor_global_metrics(tenant_id)
        return jsonify({
            "success": True,
            "data": serialize_decimals(metrics)
        })
    except Exception as e:
        return jsonify({"success": False, "message": "Failed to load global ledger metrics.", "error": str(e)}), 500

