import structlog
from app.extensions import db
from app.models.lesson import Lesson
from app.models.class_ import Class
from datetime import datetime
from sqlalchemy.exc import SQLAlchemyError

logger = structlog.get_logger()

class LessonService:
    """Service for lesson-related operations."""
    
    @staticmethod
    def get_lessons_by_class(class_id, page=1, per_page=20):
        """Get lessons for a specific class with pagination and optimized query."""
        from sqlalchemy.orm import joinedload
        
        # Check if class exists
        class_obj = Class.query.get(class_id)
        if not class_obj:
            return None
            
        # Use joinedload to prevent N+1 queries when accessing related data
        return Lesson.query.options(
            joinedload(Lesson.class_),
            joinedload(Lesson.teacher)
        ).filter_by(class_id=class_id).order_by(Lesson.date.desc()).paginate(page=page, per_page=per_page)
    
    @staticmethod
    def get_lesson_by_id(lesson_id):
        """Get a lesson by ID."""
        return Lesson.query.get(lesson_id)
    
    @staticmethod
    def create_lesson(lesson_data):
        """Create a new lesson."""
        try:
            # Check if class exists
            class_obj = Class.query.get(lesson_data['class_id'])
            if not class_obj:
                return None, "Class not found"
            
            new_lesson = Lesson(**lesson_data)
            db.session.add(new_lesson)
            db.session.commit()
            
            logger.info("Lesson created", lesson_id=new_lesson.id, class_id=new_lesson.class_id)
            return new_lesson, None
        except SQLAlchemyError as e:
            db.session.rollback()
            logger.error("Error creating lesson", error=str(e))
            return None, str(e)
    
    @staticmethod
    def update_lesson(lesson_id, lesson_data, class_id, teacher_id):
        """Update an existing lesson."""
        try:
            lesson = Lesson.query.get(lesson_id)
            if not lesson:
                return None, "Lesson not found"
            
            # Verify the lesson belongs to the specified class
            if lesson.class_id != class_id:
                return None, "Lesson does not belong to the specified class"
            
            # Verify the teacher has permission to update this lesson
            if lesson.teacher_id != teacher_id:
                return None, "You don't have permission to update this lesson"
            
            for key, value in lesson_data.items():
                setattr(lesson, key, value)
            
            lesson.updated_at = datetime.utcnow()
            db.session.commit()
            
            logger.info("Lesson updated", lesson_id=lesson.id)
            return lesson, None
        except SQLAlchemyError as e:
            db.session.rollback()
            logger.error("Error updating lesson", error=str(e), lesson_id=lesson_id)
            return None, str(e)
    
    @staticmethod
    def delete_lesson(lesson_id, class_id, teacher_id):
        """Delete a lesson."""
        try:
            lesson = Lesson.query.get(lesson_id)
            if not lesson:
                return False, "Lesson not found"
            
            # Verify the lesson belongs to the specified class
            if lesson.class_id != class_id:
                return False, "Lesson does not belong to the specified class"
            
            # Verify the teacher has permission to delete this lesson
            if lesson.teacher_id != teacher_id:
                return False, "You don't have permission to delete this lesson"
            
            db.session.delete(lesson)
            db.session.commit()
            
            logger.info("Lesson deleted", lesson_id=lesson_id)
            return True, None
        except SQLAlchemyError as e:
            db.session.rollback()
            logger.error("Error deleting lesson", error=str(e), lesson_id=lesson_id)
            return False, str(e)