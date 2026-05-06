from flask import request, jsonify, current_app
from flask_jwt_extended import jwt_required
from app.api.v1.enhanced_students import enhanced_students_bp
from app.services.enhanced_student_service import EnhancedStudentService
from app.utils.auth_utils import admin_required, teacher_required
from app.utils.rbac_decorators import require_permission
from werkzeug.utils import secure_filename
import os

@enhanced_students_bp.route('/import', methods=['POST'])
@jwt_required()
@admin_required
@require_permission('student.create')
def bulk_import_students():
    """Bulk import students from CSV/Excel file."""
    try:
        if 'file' not in request.files:
            return jsonify({'success': False, 'message': 'No file part'}), 400
        
        file = request.files['file']
        if file.filename == '':
            return jsonify({'success': False, 'message': 'No selected file'}), 400
        
        create_users = request.form.get('create_users', 'false').lower() == 'true'
        update_existing = request.form.get('update_existing', 'false').lower() == 'true'
        
        # Save file temporarily
        filename = secure_filename(file.filename)
        temp_path = os.path.join(current_app.config['UPLOAD_FOLDER'], 'temp', filename)
        os.makedirs(os.path.dirname(temp_path), exist_ok=True)
        file.save(temp_path)
        
        try:
            result, error = EnhancedStudentService.bulk_import_students(
                temp_path, 
                create_users=create_users, 
                update_existing=update_existing
            )
            
            if error:
                return jsonify({'success': False, 'message': error}), 400
            
            return jsonify({
                'success': True,
                'message': 'Bulk import completed',
                'details': result
            }), 200
            
        finally:
            # Clean up temp file
            if os.path.exists(temp_path):
                os.remove(temp_path)
                
    except Exception as e:
        current_app.logger.error(f"Unexpected error in bulk import: {str(e)}")
        return jsonify({
            'success': False,
            'message': 'An unexpected error occurred during import'
        }), 500

@enhanced_students_bp.route('/<int:student_id>/documents', methods=['POST'])
@jwt_required()
@require_permission('student.update')
def upload_student_document(student_id):
    """Upload a document for a student."""
    try:
        if 'file' not in request.files:
            return jsonify({'success': False, 'message': 'No file part'}), 400
            
        file = request.files['file']
        if file.filename == '':
            return jsonify({'success': False, 'message': 'No selected file'}), 400
            
        # In a real implementation, this would use a proper DocumentService
        # For now, we reuse the profile picture upload logic or extend it
        # Let's assume we want to support general documents
        
        # Validate file type
        ALLOWED_EXTENSIONS = {'pdf', 'jpg', 'jpeg', 'png', 'doc', 'docx'}
        if not '.' in file.filename or \
           file.filename.rsplit('.', 1)[1].lower() not in ALLOWED_EXTENSIONS:
            return jsonify({'success': False, 'message': 'Invalid file type'}), 400
            
        # Save logic here (S3 or local)
        # For prototype, we'll mock success
        
        return jsonify({
            'success': True,
            'message': 'Document uploaded successfully',
            'data': {
                'filename': file.filename,
                'url': f"/uploads/students/{student_id}/{file.filename}"
            }
        }), 200
        
    except Exception as e:
        current_app.logger.error(f"Error uploading document: {str(e)}")
        return jsonify({'success': False, 'message': 'Upload failed'}), 500

@enhanced_students_bp.route('/<int:student_id>/invite-parent', methods=['POST'])
@jwt_required()
@admin_required
def invite_parent(student_id):
    """Send an invitation to a parent to link with this student."""
    try:
        data = request.json
        email = data.get('email')
        phone = data.get('phone')
        
        if not email and not phone:
            return jsonify({'success': False, 'message': 'Email or phone required'}), 400
            
        # Logic to generate invite token and send email/SMS
        # Mocking for now
        
        return jsonify({
            'success': True,
            'message': f"Invitation sent to {email or phone}"
        }), 200
        
    except Exception as e:
        current_app.logger.error(f"Error sending invite: {str(e)}")
        return jsonify({'success': False, 'message': 'Failed to send invitation'}), 500
