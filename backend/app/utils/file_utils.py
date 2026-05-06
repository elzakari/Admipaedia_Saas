import os
import uuid
from werkzeug.utils import secure_filename
from flask import current_app
import structlog

logger = structlog.get_logger()

class FileUtils:
    """Utility class for file operations."""
    
    ALLOWED_RESOURCE_EXTENSIONS = {'pdf', 'doc', 'docx', 'ppt', 'pptx', 'xls', 'xlsx', 'txt', 'png', 'jpg', 'jpeg', 'gif', 'mp4', 'mp3'}
    RESOURCE_UPLOAD_FOLDER = 'uploads/resources'
    
    @staticmethod
    def allowed_resource_file(filename):
        """Check if resource file extension is allowed."""
        return '.' in filename and \
               filename.rsplit('.', 1)[1].lower() in FileUtils.ALLOWED_RESOURCE_EXTENSIONS
    
    @staticmethod
    def upload_resource_file(file, resource_id=None):
        """Upload and save resource file."""
        try:
            if file and FileUtils.allowed_resource_file(file.filename):
                # Generate unique filename
                filename = secure_filename(file.filename)
                unique_filename = f"resource_{resource_id or uuid.uuid4().hex}_{filename}"
                
                # Create upload directory if it doesn't exist
                upload_path = os.path.join(current_app.root_path, FileUtils.RESOURCE_UPLOAD_FOLDER)
                os.makedirs(upload_path, exist_ok=True)
                
                # Save file
                file_path = os.path.join(upload_path, unique_filename)
                file.save(file_path)
                
                logger.info("Resource file uploaded", resource_id=resource_id, filename=unique_filename)
                return f"{FileUtils.RESOURCE_UPLOAD_FOLDER}/{unique_filename}", None
            
            return None, "Invalid file type or no file provided."
            
        except Exception as e:
            logger.error("Error uploading resource file", error=str(e))
            return None, f"Failed to upload resource file: {str(e)}"