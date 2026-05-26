from flask import Blueprint, request, jsonify, send_file, after_this_request
from flask_jwt_extended import jwt_required
from app.services.report_card_generator import ReportCardGenerator
import gc

saas_report_bp = Blueprint('saas_report', __name__)

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
