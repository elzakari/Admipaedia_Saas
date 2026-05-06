# Create a new service for assignment operations
from datetime import datetime
from sqlalchemy import and_, or_, func
from app.models.assignment import Assignment
from app.models.assignment_submission import AssignmentSubmission
from app.models.student import Student
from app.models.class_ import Class
from app.extensions import db

class AssignmentService:
    """Service for assignment-related operations."""
    
    @staticmethod
    def create_assignment(data):
        """Create a new assignment."""
        try:
            assignment = Assignment(**data)
            db.session.add(assignment)
            db.session.commit()
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
            joinedload(Assignment.created_by)
        ).filter(Assignment.class_id == class_id)
        
        if subject_id:
            query = query.filter(Assignment.subject_id == subject_id)
            
        if status:
            query = query.filter(Assignment.status == status)
            
        return query.order_by(Assignment.due_date.desc()).all()
    
    @staticmethod
    def submit_assignment(data):
        """Submit an assignment."""
        try:
            submission = AssignmentSubmission(**data)
            db.session.add(submission)
            db.session.commit()
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