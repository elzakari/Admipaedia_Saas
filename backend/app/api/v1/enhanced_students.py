from flask import Blueprint, request, jsonify, current_app, g, send_from_directory
from flask_jwt_extended import jwt_required, get_jwt_identity
from werkzeug.utils import secure_filename
import os
import tempfile
from app.services.enhanced_student_service import EnhancedStudentService
from app.schemas.student import StudentSchema, StudentCreateSchema
from app.models.student import Student
from app.utils.decorators import role_required
from app.utils.tenant_context import tenant_required
from app.utils.response import success_response, error_response
from app.utils.auth_utils import admin_required
import structlog

logger = structlog.get_logger()

# To this
enhanced_students_bp = Blueprint('enhanced_students', __name__, url_prefix='/enhanced-students')


@enhanced_students_bp.route('/create-with-user', methods=['POST'])
@jwt_required()
@role_required(['admin', 'teacher'])
@tenant_required
def create_student_with_user():
    """Create a new student with integrated user account."""
    try:
        data = request.get_json()
        if not data:
            return error_response("No data provided", 400)

        student_data = data.get('student', {})
        user_data = data.get('user')

        student_schema = StudentCreateSchema()
        try:
            student_schema.load(student_data)
        except Exception as e:
            return error_response(f"Invalid student data: {str(e)}", 400)

        student, error = EnhancedStudentService.create_student_with_user(
            student_data,
            user_data,
            tenant_id=getattr(g, 'tenant_id', None),
        )
        if error:
            return error_response(error, 400)

        result = StudentSchema().dump(student)
        return success_response(data=result, message="Student created successfully with user account")

    except Exception as e:
        logger.error("Error in create_student_with_user", error=str(e))
        return error_response("Internal server error", 500)


@enhanced_students_bp.route('/<int:student_id>/profile-picture', methods=['POST'])
@jwt_required()
@admin_required
@tenant_required
def upload_profile_picture(student_id):
    """Upload profile picture for a student."""
    try:
        if 'file' not in request.files:
            return error_response("No file provided", 400)
        file = request.files['file']
        if file.filename == '':
            return error_response("No file selected", 400)

        student = Student.query.get(student_id)
        if not student or getattr(student, 'tenant_id', None) != getattr(g, 'tenant_id', None):
            return error_response("Student not found", 404)

        file_path, error = EnhancedStudentService.upload_profile_picture(student_id, file)
        if error:
            return error_response(error, 400)

        return success_response(
            data={'profile_picture_url': file_path},
            message="Profile picture uploaded successfully"
        )

    except Exception as e:
        logger.error("Error uploading profile picture", error=str(e))
        return error_response("Internal server error", 500)


@enhanced_students_bp.route('/profile-picture/<path:filename>', methods=['GET'])
def serve_profile_picture(filename):
    safe_name = secure_filename(filename)
    for upload_dir in (
        EnhancedStudentService.get_upload_directory(),
        EnhancedStudentService.get_upload_directory(prefer_legacy=True),
    ):
        candidate = os.path.join(upload_dir, safe_name)
        if os.path.isfile(candidate):
            return send_from_directory(upload_dir, safe_name)
    return error_response("Profile picture not found", 404)


@enhanced_students_bp.route('/export', methods=['GET'])
@jwt_required()
@role_required(['admin', 'teacher'])
@tenant_required
def export_students():
    """Export students to CSV or Excel file with filtering."""
    try:
        export_format = request.args.get('format', 'csv')
        class_id = request.args.get('class_id', type=int)
        grade_level = request.args.get('grade_level')
        status = request.args.get('status')
        fields = request.args.get('fields')
        
        if fields:
            fields = fields.split(',')
        
        if export_format.lower() == 'csv':
            file_path, error = EnhancedStudentService.export_students_to_csv(
                class_id=class_id, 
                grade_level=grade_level, 
                status=status,
                fields=fields,
                tenant_id=getattr(g, 'tenant_id', None),
            )
        elif export_format.lower() == 'excel':
            file_path, error = EnhancedStudentService.export_students_to_excel(
                class_id=class_id, 
                grade_level=grade_level, 
                status=status,
                fields=fields,
                tenant_id=getattr(g, 'tenant_id', None),
            )
        else:
            return error_response("Unsupported export format. Use 'csv' or 'excel'.", 400)
        
        if error:
            return error_response(error, 400)
        
        # Return file path for download
        return success_response(
            data={'file_path': file_path},
            message=f"Students exported successfully to {export_format.upper()}"
        )

    except Exception as e:
        logger.error("Error exporting students", error=str(e))
        return error_response("Internal server error", 500)

@enhanced_students_bp.route('/bulk-import', methods=['POST'])
@jwt_required()
@role_required(['admin'])
@tenant_required
def bulk_import_students():
    """Bulk import students from CSV/Excel file with option to update existing records."""
    try:
        if 'file' not in request.files:
            return error_response("No file provided", 400)
        file = request.files['file']
        if file.filename == '':
            return error_response("No file selected", 400)

        if not file.filename.lower().endswith(('.csv', '.xlsx', '.xls')):
            return error_response("Invalid file format. Use CSV or Excel files.", 400)

        filename = secure_filename(file.filename)
        temp_dir = tempfile.gettempdir()
        temp_path = os.path.join(temp_dir, filename)
        file.save(temp_path)

        create_users = request.form.get('create_users', 'false').lower() == 'true'
        update_existing = request.form.get('update_existing', 'false').lower() == 'true'

        try:
            result, error = EnhancedStudentService.bulk_import_students(
                temp_path, 
                create_users=create_users,
                update_existing=update_existing,
                tenant_id=getattr(g, 'tenant_id', None),
            )
            if error:
                return error_response(error, 400)

            return success_response(
                data=result,
                message=f"Bulk import completed. {result['successful_count']} students imported, {result['updated_count']} updated, {result['failed_count']} failed."
            )
        finally:
            if os.path.exists(temp_path):
                os.remove(temp_path)

    except Exception as e:
        logger.error("Error in bulk import", error=str(e))
        return error_response("Internal server error", 500)


@enhanced_students_bp.route('/<int:student_id>/analytics', methods=['GET'])
@jwt_required()
@role_required(['admin', 'teacher', 'student', 'parent'])
def get_student_analytics(student_id):
    """Get comprehensive analytics for a student."""
    try:
        date_from = request.args.get('date_from')
        date_to = request.args.get('date_to')

        from datetime import datetime
        if date_from:
            date_from = datetime.fromisoformat(date_from)
        if date_to:
            date_to = datetime.fromisoformat(date_to)

        analytics, error = EnhancedStudentService.get_student_analytics(student_id, date_from, date_to)
        if error:
            return error_response(error, 400)

        return success_response(data=analytics, message="Analytics retrieved successfully")

    except Exception as e:
        logger.error("Error getting student analytics", error=str(e))
        return error_response("Internal server error", 500)


@enhanced_students_bp.route('/<int:student_id>/link-parent', methods=['POST'])
@jwt_required()
@role_required(['admin', 'teacher'])
def link_student_to_parent(student_id):
    """Link a student to a parent account."""
    try:
        data = request.get_json()
        if not data or 'parent_id' not in data:
            return error_response("Parent ID is required", 400)

        parent_id = data['parent_id']
        student, error = EnhancedStudentService.link_student_to_parent(student_id, parent_id)
        if error:
            return error_response(error, 400)

        result = StudentSchema().dump(student)
        return success_response(data=result, message="Student linked to parent successfully")

    except Exception as e:
        logger.error("Error linking student to parent", error=str(e))
        return error_response("Internal server error", 500)


@enhanced_students_bp.route('/by-parent/<int:parent_id>', methods=['GET'])
@jwt_required()
@role_required(['admin', 'teacher', 'parent'])
def get_students_by_parent(parent_id):
    """Get all students linked to a parent."""
    try:
        students, error = EnhancedStudentService.get_students_by_parent(parent_id)
        if error:
            return error_response(error, 400)

        result = StudentSchema(many=True).dump(students)
        return success_response(data=result, message="Students retrieved successfully")

    except Exception as e:
        logger.error("Error getting students by parent", error=str(e))
        return error_response("Internal server error", 500)


@enhanced_students_bp.route('/<int:student_id>/report', methods=['GET'])
@jwt_required()
@role_required(['admin', 'teacher', 'parent'])
def generate_student_report(student_id):
    """Generate comprehensive student report."""
    try:
        report_type = request.args.get('type', 'comprehensive')
        report, error = EnhancedStudentService.generate_student_report(student_id, report_type)
        if error:
            return error_response(error, 400)

        return success_response(data=report, message="Student report generated successfully")

    except Exception as e:
        logger.error("Error generating student report", error=str(e))
        return error_response("Internal server error", 500)


@enhanced_students_bp.route('/analytics/summary', methods=['GET'])
@jwt_required()
@role_required(['admin', 'teacher'])
@tenant_required
def get_analytics_summary():
    """Get analytics summary for all students."""
    try:
        class_id = request.args.get('class_id', type=int)
        date_from = request.args.get('date_from')
        date_to = request.args.get('date_to')

        from datetime import datetime
        if date_from:
            date_from = datetime.fromisoformat(date_from)
        if date_to:
            date_to = datetime.fromisoformat(date_to)

        summary, error = EnhancedStudentService.get_overall_analytics_summary(
            tenant_id=g.tenant_id,
            class_id=class_id,
            date_from=date_from,
            date_to=date_to
        )
        if error:
            return error_response(error, 400)

        return success_response(data=summary, message="Analytics summary retrieved successfully")

    except Exception as e:
        logger.error("Error getting analytics summary", error=str(e))
        return error_response("Internal server error", 500)
