# Create a new service for assignment operations
from datetime import datetime
from app.models.assignment import Assignment
from app.models.assignment_submission import AssignmentSubmission
from app.models.attachment import Attachment
from app.models.student import Student
from app.models.class_ import Class
from app.extensions import db
from app.utils.file_utils import FileUtils

class AssignmentService:
    """Service for assignment-related operations."""

    @staticmethod
    def serialize_attachment(attachment):
        data = attachment.to_dict()
        tenant_id = data.get('tenant_id')
        if tenant_id is not None:
            data['tenant_id'] = str(tenant_id)
        return data

    @staticmethod
    def get_attachment_map(entity_type, entity_ids):
        if not entity_ids:
            return {}

        normalized_ids = [str(entity_id) for entity_id in entity_ids if entity_id is not None]
        if not normalized_ids:
            return {}

        attachments = Attachment.query.filter(
            Attachment.entity_type == entity_type,
            Attachment.entity_id.in_(normalized_ids)
        ).order_by(Attachment.created_at.asc()).all()

        attachment_map = {entity_id: [] for entity_id in normalized_ids}
        for attachment in attachments:
            attachment_map.setdefault(str(attachment.entity_id), []).append(
                AssignmentService.serialize_attachment(attachment)
            )
        return attachment_map

    @staticmethod
    def _save_attachment_records(files, *, entity_type, entity_id, uploader_id=None, tenant_id=None):
        saved_attachments = []
        for upload in files or []:
            if not upload or not getattr(upload, 'filename', None):
                continue

            file_path, error = FileUtils.upload_resource_file(upload, resource_id=f'{entity_type}_{entity_id}')
            if error:
                raise ValueError(error)

            attachment = Attachment(
                filename=upload.filename,
                file_path=file_path,
                size=getattr(upload, 'content_length', None),
                mime_type=getattr(upload, 'mimetype', None),
                uploader_id=uploader_id,
                tenant_id=tenant_id,
                entity_type=entity_type,
                entity_id=str(entity_id),
            )
            db.session.add(attachment)
            db.session.flush()
            saved_attachments.append(attachment)

        return saved_attachments
    
    @staticmethod
    def create_assignment(data, *, attachments=None, uploader_id=None, tenant_id=None):
        """Create a new assignment."""
        try:
            assignment = Assignment(**data)
            db.session.add(assignment)
            db.session.flush()

            saved_attachments = AssignmentService._save_attachment_records(
                attachments,
                entity_type='assignment',
                entity_id=assignment.id,
                uploader_id=uploader_id,
                tenant_id=tenant_id,
            )
            
            # Execute durable fanout in the same transaction
            from app.services.fanout import NotificationFanoutService
            NotificationFanoutService.enqueue_class_fanout(
                class_id=assignment.class_id,
                title=f"New Assignment: {assignment.title}",
                message=assignment.description or f"A new assignment for your subject has been posted. Due date: {assignment.due_date}",
                notification_type="assignment"
            )
            
            db.session.commit()
            assignment.attachments_payload = [
                AssignmentService.serialize_attachment(attachment)
                for attachment in saved_attachments
            ]
            return assignment, None
        except Exception as e:
            db.session.rollback()
            return None, str(e)
    
    @staticmethod
    def get_assignments_by_class(class_id, subject_id=None, status='active'):
        """Get assignments for a specific class."""
        from sqlalchemy.orm import joinedload
        
        query = Assignment.query.options(
            joinedload(Assignment.class_),
            joinedload(Assignment.subject),
            joinedload(Assignment.teacher)
        ).filter(Assignment.class_id == class_id)
        
        if subject_id:
            query = query.filter(Assignment.subject_id == subject_id)
            
        if status:
            query = query.filter(Assignment.status == status)
            
        return query.order_by(Assignment.due_date.desc()).all()
    
    @staticmethod
    def submit_assignment(data, *, attachments=None, uploader_id=None, tenant_id=None):
        """Submit an assignment."""
        try:
            assignment_id = data['assignment_id']
            student_id = data['student_id']
            submission = AssignmentSubmission.query.filter_by(
                assignment_id=assignment_id,
                student_id=student_id,
            ).order_by(AssignmentSubmission.id.desc()).first()

            if submission:
                submission.content = data.get('content')
                submission.status = data.get('status', submission.status)
                submission.submission_date = datetime.utcnow()
                submission.score = None
                submission.feedback = None
                submission.graded_by = None
                submission.graded_at = None
            else:
                submission = AssignmentSubmission(**data)
                db.session.add(submission)

            db.session.flush()

            saved_attachments = AssignmentService._save_attachment_records(
                attachments,
                entity_type='assignment_submission',
                entity_id=submission.id,
                uploader_id=uploader_id,
                tenant_id=tenant_id,
            )
            if saved_attachments:
                submission.file_path = saved_attachments[-1].file_path

            db.session.commit()
            submission.attachments_payload = [
                AssignmentService.serialize_attachment(attachment)
                for attachment in saved_attachments
            ]
            return submission, None
        except Exception as e:
            db.session.rollback()
            return None, str(e)
    
    @staticmethod
    def grade_submission(submission_id, score, feedback, graded_by):
        """Grade an assignment submission."""
        try:
            submission = AssignmentSubmission.query.get(submission_id)
            if not submission:
                return None, "Submission not found"
                
            submission.score = score
            submission.feedback = feedback
            submission.status = 'graded'
            submission.graded_by = graded_by
            submission.graded_at = datetime.utcnow()
            
            db.session.commit()
            return submission, None
        except Exception as e:
            db.session.rollback()
            return None, str(e)
    
    # Add more methods for assignment management
