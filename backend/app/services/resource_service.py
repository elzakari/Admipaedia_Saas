import structlog
from app.extensions import db
from app.models.resource import Resource
from app.models.class_ import Class
from datetime import datetime
from sqlalchemy.exc import SQLAlchemyError
from app.utils.file_utils import FileUtils
import os
from flask import current_app

logger = structlog.get_logger()

class ResourceService:
    """Service for resource-related operations."""
    
    @staticmethod
    def get_resources_by_class(class_id, page=1, per_page=20):
        """Get resources for a specific class with pagination and optimized query."""
        from sqlalchemy.orm import joinedload
        
        # Check if class exists
        class_obj = Class.query.get(class_id)
        if not class_obj:
            return None
            
        # Use joinedload to prevent N+1 queries when accessing related data
        return Resource.query.options(
            joinedload(Resource.class_),
            joinedload(Resource.uploaded_by)
        ).filter_by(class_id=class_id).order_by(Resource.created_at.desc()).paginate(page=page, per_page=per_page)
    
    @staticmethod
    def get_resource_by_id(resource_id):
        """Get a resource by ID."""
        return Resource.query.get(resource_id)
    
    @staticmethod
    def create_resource(resource_data, file=None):
        """Create a new resource with optional file upload."""
        try:
            # Check if class exists
            class_obj = Class.query.get(resource_data['class_id'])
            if not class_obj:
                return None, "Class not found"
            
            # Handle file upload if provided
            if file:
                file_path, error = FileUtils.upload_resource_file(file)
                if error:
                    return None, error
                resource_data['file_path'] = file_path
                # Set type based on file extension if not provided
                if 'type' not in resource_data or not resource_data['type']:
                    ext = file.filename.rsplit('.', 1)[1].lower()
                    if ext in ['pdf', 'doc', 'docx', 'txt']:
                        resource_data['type'] = 'document'
                    elif ext in ['jpg', 'jpeg', 'png', 'gif']:
                        resource_data['type'] = 'image'
                    elif ext in ['mp4']:
                        resource_data['type'] = 'video'
                    elif ext in ['mp3']:
                        resource_data['type'] = 'audio'
                    else:
                        resource_data['type'] = 'other'
            
            new_resource = Resource(**resource_data)
            db.session.add(new_resource)
            db.session.commit()
            
            logger.info("Resource created", resource_id=new_resource.id, class_id=new_resource.class_id)
            return new_resource, None
        except SQLAlchemyError as e:
            db.session.rollback()
            logger.error("Error creating resource", error=str(e))
            return None, str(e)
    
    @staticmethod
    def update_resource(resource_id, resource_data, class_id, teacher_id, file=None):
        """Update an existing resource with optional file replacement."""
        try:
            # Get the resource
            resource = Resource.query.get(resource_id)
            if not resource:
                return None, "Resource not found"
            
            # Verify resource belongs to the specified class
            if resource.class_id != class_id:
                return None, "Resource does not belong to the specified class"
            
            # Verify teacher has permission to update this resource
            if resource.teacher_id != teacher_id:
                return None, "You don't have permission to update this resource"
            
            # Handle file upload if provided
            if file:
                # Delete old file if exists
                if resource.file_path and os.path.exists(os.path.join(current_app.root_path, resource.file_path)):
                    os.remove(os.path.join(current_app.root_path, resource.file_path))
                
                file_path, error = FileUtils.upload_resource_file(file, resource_id)
                if error:
                    return None, error
                resource_data['file_path'] = file_path
            
            # Update resource fields
            for key, value in resource_data.items():
                setattr(resource, key, value)
            
            resource.updated_at = datetime.utcnow()
            db.session.commit()
            
            logger.info("Resource updated", resource_id=resource.id)
            return resource, None
        except SQLAlchemyError as e:
            db.session.rollback()
            logger.error("Error updating resource", error=str(e))
            return None, str(e)
    
    @staticmethod
    def delete_resource(resource_id, class_id, teacher_id):
        """Delete a resource."""
        try:
            # Get the resource
            resource = Resource.query.get(resource_id)
            if not resource:
                return False, "Resource not found"
            
            # Verify resource belongs to the specified class
            if resource.class_id != class_id:
                return False, "Resource does not belong to the specified class"
            
            # Verify teacher has permission to delete this resource
            if resource.teacher_id != teacher_id:
                return False, "You don't have permission to delete this resource"
            
            # Delete the file if it exists
            if resource.file_path and os.path.exists(os.path.join(current_app.root_path, resource.file_path)):
                os.remove(os.path.join(current_app.root_path, resource.file_path))
            
            db.session.delete(resource)
            db.session.commit()
            
            logger.info("Resource deleted", resource_id=resource_id)
            return True, None
        except SQLAlchemyError as e:
            db.session.rollback()
            logger.error("Error deleting resource", error=str(e))
            return False, str(e)