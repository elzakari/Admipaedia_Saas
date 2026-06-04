import structlog
from app.extensions import db
from app.services.cache_service import get_cache_service
from app.schemas.class_ import ClassSchema
from app.models.class_ import Class
from app.models.teacher import Teacher
from datetime import datetime
from sqlalchemy.exc import SQLAlchemyError

logger = structlog.get_logger()
cache_service = get_cache_service()
class_schema = ClassSchema()

class ClassService:
    """Service for class-related operations."""
    
    @staticmethod
    def get_all_classes(page=1, per_page=20, grade_level=None, academic_year=None, tenant_id=None):
        """Get all classes with optional filtering and pagination, optimized for N+1 queries."""
        from sqlalchemy.orm import joinedload
        
        query = Class.query.options(
            joinedload(Class.teacher),
            joinedload(Class.educational_level)
        )

        if tenant_id is not None and hasattr(Class, 'tenant_id'):
            query = query.filter(Class.tenant_id == tenant_id)
        
        if grade_level:
            query = query.filter(Class.grade_level == grade_level)
            
        if academic_year:
            query = query.filter(Class.academic_year == academic_year)
            
        return query.order_by(Class.name).paginate(page=page, per_page=per_page)
    
    @staticmethod
    def get_class_by_id(class_id, tenant_id=None):
        """Get a class by ID. Always returns a Class model instance."""
        obj = Class.query.get(class_id)
        if obj and tenant_id is not None and hasattr(obj, 'tenant_id') and obj.tenant_id != tenant_id:
            return None
        if obj:
            # We still cache the DTO for other uses, but this method returns the object
            key = f"class:dto:{class_id}"
            cache_service.set(key, class_schema.dump(obj), ttl=cache_service.LONG_TTL)
        return obj
    
    @staticmethod
    def get_class_dto(class_id):
        """Get a class DTO (dict) by ID, using cache if available."""
        key = f"class:dto:{class_id}"
        dto = cache_service.get(key)
        if dto:
            return dto
        obj = Class.query.get(class_id)
        if obj:
            dto = class_schema.dump(obj)
            cache_service.set(key, dto, ttl=cache_service.LONG_TTL)
            return dto
        return None
    
    @staticmethod
    def get_classes_by_teacher_id(teacher_id, page=1, per_page=20, tenant_id=None):
        """Get classes by teacher ID with optimized query."""
        from sqlalchemy.orm import joinedload
        
        query = Class.query.options(
            joinedload(Class.teacher),
            joinedload(Class.educational_level)
        ).filter_by(teacher_id=teacher_id)

        if tenant_id is not None and hasattr(Class, 'tenant_id'):
            query = query.filter(Class.tenant_id == tenant_id)

        return query.paginate(page=page, per_page=per_page)
    
    @staticmethod
    def create_class(class_data, tenant_id=None):
        """Create a new class."""
        try:
            # Check if teacher exists if teacher_id is provided
            if 'teacher_id' in class_data and class_data['teacher_id']:
                teacher = Teacher.query.get(class_data['teacher_id'])
                if not teacher:
                    return None, "Teacher not found"
                if tenant_id is not None and hasattr(teacher, 'tenant_id') and teacher.tenant_id != tenant_id:
                    return None, "Teacher not found"
            
            payload = dict(class_data)
            if tenant_id is not None and 'tenant_id' not in payload and hasattr(Class, 'tenant_id'):
                payload['tenant_id'] = tenant_id
            new_class = Class(**payload)
            db.session.add(new_class)
            db.session.commit()
            cache_service.delete(f"class:dto:{new_class.id}")
            
            logger.info("Class created", class_id=new_class.id, name=new_class.name)
            return new_class, None
        except SQLAlchemyError as e:
            db.session.rollback()
            logger.error("Error creating class", error=str(e))
            return None, str(e)
    
    @staticmethod
    def update_class(class_id, class_data, tenant_id=None):
        """Update an existing class."""
        try:
            class_obj = Class.query.get(class_id)
            if not class_obj:
                return None, "Class not found"
            if tenant_id is not None and hasattr(class_obj, 'tenant_id') and class_obj.tenant_id != tenant_id:
                return None, "Class not found"
            
            # Check if teacher exists if teacher_id is provided
            if 'teacher_id' in class_data and class_data['teacher_id']:
                teacher = Teacher.query.get(class_data['teacher_id'])
                if not teacher:
                    return None, "Teacher not found"
                if tenant_id is not None and hasattr(teacher, 'tenant_id') and teacher.tenant_id != tenant_id:
                    return None, "Teacher not found"
            
            for key, value in class_data.items():
                setattr(class_obj, key, value)
            
            class_obj.updated_at = datetime.utcnow()
            db.session.commit()
            cache_service.delete(f"class:dto:{class_id}")
            
            logger.info("Class updated", class_id=class_obj.id)
            return class_obj, None
        except SQLAlchemyError as e:
            db.session.rollback()
            logger.error("Error updating class", error=str(e), class_id=class_id)
            return None, str(e)
    
    @staticmethod
    def delete_class(class_id, force=False):
        """Delete a class."""
        try:
            class_obj = Class.query.get(class_id)
            if not class_obj:
                return False, "Class not found"
            
            # Log the class details before deletion
            logger.info("Attempting to delete class", 
                       class_id=class_id, 
                       class_name=class_obj.name,
                       grade_level=class_obj.grade_level)
            
            # Check for related records that might prevent deletion
            from app.models.student import Student
            from app.models.attendance import Attendance
            from app.models.exam import Exam
            from app.models.assignment import Assignment
            from app.models.grade import Grade
            
            # Count related records
            student_count = Student.query.filter_by(class_id=class_id).count()
            attendance_count = Attendance.query.filter_by(class_id=class_id).count()
            exam_count = Exam.query.filter_by(class_id=class_id).count()
            assignment_count = Assignment.query.filter_by(class_id=class_id).count()
            grade_count = Grade.query.filter_by(class_id=class_id).count()
            
            # If there are related records and not forcing deletion, provide a detailed error message
            if (student_count > 0 or attendance_count > 0 or exam_count > 0 or assignment_count > 0 or grade_count > 0) and not force:
                related_records = []
                if student_count > 0:
                    related_records.append(f"{student_count} student(s)")
                if attendance_count > 0:
                    related_records.append(f"{attendance_count} attendance record(s)")
                if exam_count > 0:
                    related_records.append(f"{exam_count} exam(s)")
                if assignment_count > 0:
                    related_records.append(f"{assignment_count} assignment(s)")
                if grade_count > 0:
                    related_records.append(f"{grade_count} grade(s)")
                
                return False, f"Cannot delete class '{class_obj.name}' because it has related records: {', '.join(related_records)}. Deleting this class will permanently remove all associated data. If you're sure you want to proceed, use force delete."
            
            # If force delete, handle related records appropriately
            if force:
                # Set student class_id to NULL instead of deleting students
                if student_count > 0:
                    Student.query.filter_by(class_id=class_id).update({'class_id': None})
                    logger.info(f"Unassigned {student_count} students from class {class_id}")
                
                # Delete related records that should be removed with the class
                if attendance_count > 0:
                    Attendance.query.filter_by(class_id=class_id).delete()
                    logger.info(f"Deleted {attendance_count} attendance records for class {class_id}")
                
                if exam_count > 0:
                    # First delete grades associated with these exams
                    exam_ids = [exam.id for exam in Exam.query.filter_by(class_id=class_id).all()]
                    for exam_id in exam_ids:
                        Grade.query.filter_by(exam_id=exam_id).delete()
                    Exam.query.filter_by(class_id=class_id).delete()
                    logger.info(f"Deleted {exam_count} exams and their grades for class {class_id}")
                
                if assignment_count > 0:
                    Assignment.query.filter_by(class_id=class_id).delete()
                    logger.info(f"Deleted {assignment_count} assignments for class {class_id}")
                
                if grade_count > 0:
                    Grade.query.filter_by(class_id=class_id).delete()
                    logger.info(f"Deleted {grade_count} grades for class {class_id}")
            
            db.session.delete(class_obj)
            db.session.commit()
            cache_service.delete(f"class:dto:{class_id}")
            
            logger.info("Class deleted successfully", class_id=class_id)
            return True, None
        except SQLAlchemyError as e:
            db.session.rollback()
            error_msg = str(e)
            logger.error("Error deleting class", 
                        error=error_msg, 
                        class_id=class_id,
                        error_type=type(e).__name__)
            
            # Provide more specific error messages
            if "foreign key constraint" in error_msg.lower() or "not null violation" in error_msg.lower():
                return False, f"Cannot delete class: it has related records that must be removed first. This class is still referenced by other records in the system."
            elif "does not exist" in error_msg.lower():
                return False, f"Class or related constraint not found: {error_msg}"
            else:
                return False, f"Database error: {error_msg}"
    
    @staticmethod
    def assign_teacher(class_id, teacher_id):
        """Assign a teacher to a class."""
        try:
            class_obj = Class.query.get(class_id)
            if not class_obj:
                return None, "Class not found"
            
            teacher = Teacher.query.get(teacher_id)
            if not teacher:
                return None, "Teacher not found"
            
            # Legacy pointer write
            class_obj.teacher_id = teacher_id
            class_obj.updated_at = datetime.utcnow()
            
            # Idempotent ClassTeacherMapping write
            from app.models.class_ import ClassTeacherMapping
            existing = ClassTeacherMapping.query.filter_by(
                class_id=class_id,
                teacher_id=teacher.user_id
            ).first()
            
            if not existing:
                mapping = ClassTeacherMapping(class_id=class_id, teacher_id=teacher.user_id)
                db.session.add(mapping)
                
            db.session.commit()
            
            logger.info("Teacher assigned to class (twin-write completed)", class_id=class_obj.id, teacher_id=teacher_id)
            return class_obj, None
        except SQLAlchemyError as e:
            db.session.rollback()
            logger.error("Error assigning teacher to class", error=str(e), class_id=class_id)
            return None, str(e)

    @staticmethod
    def unassign_teacher(class_id, teacher_id):
        """Unassign a teacher from a class."""
        try:
            class_obj = Class.query.get(class_id)
            if not class_obj:
                return False, "Class not found"
            
            teacher = Teacher.query.get(teacher_id)
            if not teacher:
                return False, "Teacher not found"
            
            # Legacy pointer revert
            if class_obj.teacher_id == teacher_id:
                class_obj.teacher_id = None
                class_obj.updated_at = datetime.utcnow()
            
            # Delete ClassTeacherMapping entries
            from app.models.class_ import ClassTeacherMapping
            ClassTeacherMapping.query.filter_by(
                class_id=class_id,
                teacher_id=teacher.user_id
            ).delete()
            
            db.session.commit()
            
            logger.info("Teacher unassigned from class (twin-write sweep completed)", class_id=class_obj.id, teacher_id=teacher_id)
            return True, None
        except SQLAlchemyError as e:
            db.session.rollback()
            logger.error("Error unassigning teacher from class", error=str(e), class_id=class_id)
            return False, str(e)
