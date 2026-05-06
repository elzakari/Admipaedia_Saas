from flask import Blueprint, send_from_directory, current_app, abort
from flask_jwt_extended import jwt_required
import os

download_bp = Blueprint('download', __name__)

@download_bp.route('/<path:file_path>', methods=['GET'])
@jwt_required()
def download_file(file_path):
    """Download a file from the uploads directory."""
    try:
        # Extract directory and filename
        directory = os.path.dirname(file_path)
        filename = os.path.basename(file_path)
        
        # Ensure the path is within the uploads directory
        if not directory.startswith('uploads/'):
            abort(404)
        
        # Get the uploads directory from the root path
        uploads_dir = os.path.join(current_app.root_path, directory)
        
        return send_from_directory(uploads_dir, filename, as_attachment=True)
    except Exception as e:
        current_app.logger.error(f"Error downloading file: {str(e)}")
        abort(404)