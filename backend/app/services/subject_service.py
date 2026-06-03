import structlog
from app.extensions import db
from app.models.subject import Subject
from app.services.cache_service import get_cache_service
from app.schemas.subject import SubjectSchema
from app.models.class_ import Class
from app.models.teacher import Teacher
from app.models.associations import teacher_subjects, class_subjects
from datetime import datetime
from sqlalchemy.exc import SQLAlchemyError

logger = structlog.get_logger()
cache_service = get_cache_service()
subject_schema = SubjectSchema()

class SubjectService:
    """Service for subject-related operations."""
    
    @staticmethod
    def get_all_subjects(page=1, per_page=20, department=None, is_active=None, tenant_id=None):
        """Get all subjects with optional filtering and pagination."""
        query = Subject.query
        if tenant_id is not None and hasattr(Subject, 'tenant_id'):
            query = query.filter(Subject.tenant_id == tenant_id)
        
        if department:
            try:
                department_id = int(str(department))
                query = query.filter(Subject.department_id == department_id)
            except Exception:
                pass
            
        if is_active is not None:
            query = query.filter(Subject.is_active == is_active)
            
        return query.order_by(Subject.name).paginate(page=page, per_page=per_page)
    
    @staticmethod
    def get_subject_by_id(subject_id, tenant_id=None):
        """Get a subject by ID. Always returns a Subject model instance."""
        q = Subject.query.filter(Subject.id == subject_id)
        if tenant_id is not None and hasattr(Subject, 'tenant_id'):
            q = q.filter(Subject.tenant_id == tenant_id)
        obj = q.first()
        if obj:
            # Cache the DTO for other uses
            key = f"subject:dto:{subject_id}"
            cache_service.set(key, subject_schema.dump(obj), ttl=cache_service.LONG_TTL)
        return obj
    
    @staticmethod
    def get_subject_dto(subject_id, tenant_id=None):
        """Get a subject DTO (dict) by ID, using cache if available."""
        key = f"subject:dto:{subject_id}"
        dto = cache_service.get(key)
        if dto:
            return dto
        q = Subject.query.filter(Subject.id == subject_id)
        if tenant_id is not None and hasattr(Subject, 'tenant_id'):
            q = q.filter(Subject.tenant_id == tenant_id)
        obj = q.first()
        if obj:
            dto = subject_schema.dump(obj)
            cache_service.set(key, dto, ttl=cache_service.LONG_TTL)
            return dto
        return None
    
    @staticmethod
    def get_subject_by_code(code, tenant_id=None):
        """Get a subject by code."""
        q = Subject.query.filter_by(code=code)
        if tenant_id is not None and hasattr(Subject, 'tenant_id'):
            q = q.filter(Subject.tenant_id == tenant_id)
        return q.first()
    
    @staticmethod
    def create_subject(subject_data, tenant_id=None):
        """Create a new subject."""
        try:
            if tenant_id is None:
                return None, "Tenant context required"

            # Check if code is unique
            if Subject.query.filter_by(code=subject_data['code'], tenant_id=tenant_id).first():
                return None, "Subject code already exists"

            payload = dict(subject_data or {})
            
            # Resolve department string to department_id if needed
            department_str = payload.pop('department', None)
            if department_str and 'department_id' not in payload:
                from app.models.department import Department
                clean_dept_str = department_str.replace('_', ' ').strip().lower()
                dept = Department.query.filter(
                    db.func.lower(Department.name) == clean_dept_str,
                    Department.tenant_id == tenant_id
                ).first()
                if dept:
                    payload['department_id'] = dept.id
                else:
                    dept = Department.query.filter(
                        db.func.lower(Department.code) == clean_dept_str,
                        Department.tenant_id == tenant_id
                    ).first()
                    if dept:
                        payload['department_id'] = dept.id

            if payload.get('department_id'):
                from app.models.department import Department
                dept = Department.query.filter(Department.id == payload['department_id'], Department.tenant_id == tenant_id).first()
                if not dept:
                    return None, "Department not found"

            # Cast credit_hours safely
            if 'credit_hours' in payload and payload['credit_hours'] is not None:
                try:
                    payload['credit_hours'] = float(payload['credit_hours'])
                except (ValueError, TypeError):
                    payload['credit_hours'] = 0.0
            
            if 'tenant_id' not in payload and hasattr(Subject, 'tenant_id'):
                payload['tenant_id'] = tenant_id
            
            new_subject = Subject(**payload)
            db.session.add(new_subject)
            db.session.commit()
            cache_service.delete(f"subject:dto:{new_subject.id}")
            
            logger.info("Subject created", subject_id=new_subject.id, code=new_subject.code)
            return new_subject, None
        except SQLAlchemyError as e:
            db.session.rollback()
            logger.error("Error creating subject", error=str(e))
            return None, str(e)
    
    @staticmethod
    def update_subject(subject_id, subject_data, tenant_id=None):
        """Update an existing subject."""
        try:
            if tenant_id is None:
                return None, "Tenant context required"

            subject = Subject.query.filter(Subject.id == subject_id, Subject.tenant_id == tenant_id).first()
            if not subject:
                return None, "Subject not found"
            
            # Check if code is being changed and is unique
            if 'code' in subject_data and subject_data['code'] != subject.code:
                if Subject.query.filter_by(code=subject_data['code'], tenant_id=tenant_id).first():
                    return None, "Subject code already exists"

            payload = dict(subject_data or {})
            
            # Resolve department string to department_id if needed
            department_str = payload.pop('department', None)
            if department_str and 'department_id' not in payload:
                from app.models.department import Department
                clean_dept_str = department_str.replace('_', ' ').strip().lower()
                dept = Department.query.filter(
                    db.func.lower(Department.name) == clean_dept_str,
                    Department.tenant_id == tenant_id
                ).first()
                if dept:
                    payload['department_id'] = dept.id
                else:
                    dept = Department.query.filter(
                        db.func.lower(Department.code) == clean_dept_str,
                        Department.tenant_id == tenant_id
                    ).first()
                    if dept:
                        payload['department_id'] = dept.id

            if payload.get('department_id'):
                from app.models.department import Department
                dept = Department.query.filter(Department.id == payload['department_id'], Department.tenant_id == tenant_id).first()
                if not dept:
                    return None, "Department not found"

            # Cast credit_hours safely
            if 'credit_hours' in payload and payload['credit_hours'] is not None:
                try:
                    payload['credit_hours'] = float(payload['credit_hours'])
                except (ValueError, TypeError):
                    payload['credit_hours'] = 0.0
            
            for key, value in payload.items():
                setattr(subject, key, value)
            
            subject.updated_at = datetime.utcnow()
            db.session.commit()
            cache_service.delete(f"subject:dto:{subject_id}")
            
            logger.info("Subject updated", subject_id=subject.id)
            return subject, None
        except SQLAlchemyError as e:
            db.session.rollback()
            logger.error("Error updating subject", error=str(e), subject_id=subject_id)
            return None, str(e)
    
    @staticmethod
    def delete_subject(subject_id, tenant_id=None):
        """Delete a subject."""
        try:
            if tenant_id is None:
                return False, "Tenant context required"

            subject = Subject.query.filter(Subject.id == subject_id, Subject.tenant_id == tenant_id).first()
            if not subject:
                return False, "Subject not found"
            
            # Check for related records that would prevent deletion
            from app.models.grade import Grade
            from app.models.exam import Exam
            from app.models.external_exams import ExternalExamResult
            
            # Count related records
            grade_count = Grade.query.filter_by(subject_id=subject_id).count()
            exam_count = Exam.query.filter_by(subject_id=subject_id).count()
            external_result_count = ExternalExamResult.query.filter_by(subject_id=subject_id).count()
            
            if grade_count > 0 or exam_count > 0 or external_result_count > 0:
                error_msg = f"Cannot delete subject: it has {grade_count} grades, {exam_count} exams, and {external_result_count} external exam results"
                logger.warning("Subject deletion blocked due to related records", 
                             subject_id=subject_id, 
                             grades=grade_count, 
                             exams=exam_count, 
                             external_results=external_result_count)
                return False, error_msg
            
            db.session.delete(subject)
            db.session.commit()
            cache_service.delete(f"subject:dto:{subject_id}")
            
            logger.info("Subject deleted", subject_id=subject_id)
            return True, None
        except SQLAlchemyError as e:
            db.session.rollback()
            logger.error("Error deleting subject", error=str(e), subject_id=subject_id)
            return False, str(e)
    
    @staticmethod
    def assign_teacher(subject_id, teacher_id, is_primary=False, tenant_id=None):
        """Assign a teacher to a subject."""
        try:
            if tenant_id is None:
                return None, "Tenant context required"

            subject = Subject.query.filter(Subject.id == subject_id, Subject.tenant_id == tenant_id).first()
            if not subject:
                return None, "Subject not found"
            
            teacher = Teacher.query.filter(Teacher.id == teacher_id, Teacher.tenant_id == tenant_id).first()
            if not teacher:
                return None, "Teacher not found"
            
            # Check if the teacher is already assigned to this subject
            if teacher in subject.teachers:
                return subject, "Teacher already assigned to this subject"
            
            # Add the teacher to the subject's teachers
            subject.teachers.append(teacher)
            
            # If this is the primary teacher, update the association
            if is_primary:
                # This would require custom logic to set is_primary in the association table
                pass
            
            db.session.commit()
            cache_service.delete(f"subject:dto:{subject_id}")
            
            logger.info("Teacher assigned to subject", subject_id=subject.id, teacher_id=teacher_id)
            return subject, None
        except SQLAlchemyError as e:
            db.session.rollback()
            logger.error("Error assigning teacher to subject", error=str(e), subject_id=subject_id)
            return None, str(e)
    
    @staticmethod
    def remove_teacher(subject_id, teacher_id, tenant_id=None):
        """Remove a teacher from a subject."""
        try:
            if tenant_id is None:
                return None, "Tenant context required"

            subject = Subject.query.filter(Subject.id == subject_id, Subject.tenant_id == tenant_id).first()
            if not subject:
                return None, "Subject not found"
            
            teacher = Teacher.query.filter(Teacher.id == teacher_id, Teacher.tenant_id == tenant_id).first()
            if not teacher:
                return None, "Teacher not found"
            
            # Check if the teacher is assigned to this subject
            if teacher not in subject.teachers:
                return subject, "Teacher not assigned to this subject"
            
            # Remove the teacher from the subject's teachers
            subject.teachers.remove(teacher)
            db.session.commit()
            
            logger.info("Teacher removed from subject", subject_id=subject.id, teacher_id=teacher_id)
            return subject, None
        except SQLAlchemyError as e:
            db.session.rollback()
            logger.error("Error removing teacher from subject", error=str(e), subject_id=subject_id)
            return None, str(e)

    # Add these methods to your SubjectService class
    
    @staticmethod
    def get_subjects_by_teacher(teacher_id, page=1, per_page=20, tenant_id=None):
        """Get subjects taught by a specific teacher with optimized query."""
        try:
            from sqlalchemy.orm import joinedload
            
            q = Teacher.query.filter(Teacher.id == teacher_id)
            if tenant_id is not None and hasattr(Teacher, 'tenant_id'):
                q = q.filter(Teacher.tenant_id == tenant_id)
            teacher = q.first()
            if not teacher:
                return None
            
            # Query subjects associated with this teacher through the association table
            # Use joinedload to prevent N+1 queries when accessing related data
            query = Subject.query.options(
                joinedload(Subject.teachers),
                joinedload(Subject.classes)
            ).join(teacher_subjects).filter(teacher_subjects.c.teacher_id == teacher_id)
            if tenant_id is not None and hasattr(Subject, 'tenant_id'):
                query = query.filter(Subject.tenant_id == tenant_id)
            return query.paginate(page=page, per_page=per_page)
        except SQLAlchemyError as e:
            logger.error("Error getting subjects by teacher", error=str(e), teacher_id=teacher_id)
            return None
    
    @staticmethod
    def get_subjects_by_class(class_id, page=1, per_page=20, tenant_id=None):
        """Get subjects taught in a specific class with optimized query."""
        try:
            from sqlalchemy.orm import joinedload
            
            q = Class.query.filter(Class.id == class_id)
            if tenant_id is not None and hasattr(Class, 'tenant_id'):
                q = q.filter(Class.tenant_id == tenant_id)
            class_obj = q.first()
            if not class_obj:
                return None
            
            # Query subjects associated with this class through the association table
            # Use joinedload to prevent N+1 queries when accessing related data
            query = Subject.query.options(
                joinedload(Subject.teachers),
                joinedload(Subject.classes)
            ).join(class_subjects).filter(class_subjects.c.class_id == class_id)
            if tenant_id is not None and hasattr(Subject, 'tenant_id'):
                query = query.filter(Subject.tenant_id == tenant_id)
            return query.paginate(page=page, per_page=per_page)
        except SQLAlchemyError as e:
            logger.error("Error getting subjects by class", error=str(e), class_id=class_id)
            return None
    
    @staticmethod
    def assign_class(subject_id, class_id, tenant_id=None):
        """Assign a class to a subject."""
        try:
            if tenant_id is None:
                return None, "Tenant context required"

            subject = Subject.query.filter(Subject.id == subject_id, Subject.tenant_id == tenant_id).first()
            if not subject:
                return None, "Subject not found"
            
            class_obj = Class.query.filter(Class.id == class_id, Class.tenant_id == tenant_id).first()
            if not class_obj:
                return None, "Class not found"
            
            # Check if the class is already assigned to this subject
            stmt = db.select(class_subjects).where(
                class_subjects.c.subject_id == subject_id,
                class_subjects.c.class_id == class_id
            )
            existing = db.session.execute(stmt).first()
            if existing:
                return subject, "Class already assigned to this subject"
            
            # Insert a new row in the association table
            stmt = class_subjects.insert().values(
                subject_id=subject_id,
                class_id=class_id,
                assigned_date=datetime.utcnow()
            )
            db.session.execute(stmt)
            db.session.commit()
            
            logger.info("Class assigned to subject", subject_id=subject_id, class_id=class_id)
            return subject, None
        except SQLAlchemyError as e:
            db.session.rollback()
            logger.error("Error assigning class to subject", error=str(e), subject_id=subject_id)
            return None, str(e)
    
    @staticmethod
    def remove_class(subject_id, class_id, tenant_id=None):
        """Remove a class from a subject."""
        try:
            if tenant_id is None:
                return None, "Tenant context required"

            subject = Subject.query.filter(Subject.id == subject_id, Subject.tenant_id == tenant_id).first()
            if not subject:
                return None, "Subject not found"
            
            class_obj = Class.query.filter(Class.id == class_id, Class.tenant_id == tenant_id).first()
            if not class_obj:
                return None, "Class not found"
            
            # Check if the class is assigned to this subject
            stmt = db.select(class_subjects).where(
                class_subjects.c.subject_id == subject_id,
                class_subjects.c.class_id == class_id
            )
            existing = db.session.execute(stmt).first()
            if not existing:
                return subject, "Class not assigned to this subject"
            
            # Delete the row from the association table
            stmt = class_subjects.delete().where(
                class_subjects.c.subject_id == subject_id,
                class_subjects.c.class_id == class_id
            )
            db.session.execute(stmt)
            db.session.commit()
            
            logger.info("Class removed from subject", subject_id=subject_id, class_id=class_id)
            return subject, None
        except SQLAlchemyError as e:
            db.session.rollback()
            logger.error("Error removing class from subject", error=str(e), subject_id=subject_id)
            return None, str(e)

    @staticmethod
    def force_delete_subject(subject_id, cleanup_related=True, tenant_id=None):
        """Force delete a subject with optional cleanup of related records."""
        try:
            if tenant_id is None:
                return False, "Tenant context required"

            subject = Subject.query.filter(Subject.id == subject_id, Subject.tenant_id == tenant_id).first()
            if not subject:
                return False, "Subject not found"
            
            if cleanup_related:
                # Import models
                from app.models.grade import Grade
                from app.models.exam import Exam
                from app.models.external_exams import ExternalExamResult
                
                # Count related records before cleanup
                grade_count = Grade.query.filter_by(subject_id=subject_id).count()
                exam_count = Exam.query.filter_by(subject_id=subject_id).count()
                external_result_count = ExternalExamResult.query.filter_by(subject_id=subject_id).count()
                
                logger.info("Cleaning up related records before subject deletion",
                           subject_id=subject_id,
                           grades=grade_count,
                           exams=exam_count,
                           external_results=external_result_count)
                
                # Delete related records
                Grade.query.filter_by(subject_id=subject_id).delete()
                Exam.query.filter_by(subject_id=subject_id).delete()
                ExternalExamResult.query.filter_by(subject_id=subject_id).delete()
                
                logger.info("Related records cleaned up", subject_id=subject_id)
            
            # Now delete the subject
            db.session.delete(subject)
            db.session.commit()
            
            logger.info("Subject force deleted successfully", subject_id=subject_id)
            return True, None
            
        except SQLAlchemyError as e:
            db.session.rollback()
            logger.error("Error force deleting subject", error=str(e), subject_id=subject_id)
            return False, str(e)
