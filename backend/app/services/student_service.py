from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Query, Session
from flask_sqlalchemy.pagination import Pagination
from typing import Dict, Tuple, Optional, Union, Any, List
from app.models.student import Student
from app.models.user import User
from app.models.class_ import Class
from app.extensions import db
from datetime import datetime
from structlog import get_logger
from app.services.cache_service import get_cache_service
from app.schemas.student import StudentSchema
from app.services.academic_configuration_service import AcademicConfigurationService

logger = get_logger()
cache_service = get_cache_service()
student_schema = StudentSchema()

class StudentService:
    """Service class for student operations."""
    
    def __init__(self, db_session: Session):
        """Initialize the StudentService with a database session.
        
        Args:
            db_session: SQLAlchemy database session
        """
        self.db_session = db_session
    
    def get_all_students(
        self,
        page: int = 1,
        per_page: int = 20,
        tenant_id=None,
        class_id: Optional[int] = None,
        status: Optional[str] = None,
        search: Optional[str] = None
    ) -> Pagination:
        """Get all students with optional filtering and pagination.
        
        Args:
            page: Page number (1-indexed)
            per_page: Number of items per page
            class_id: Optional class ID to filter students by class
            
        Returns:
            Paginated list of students
        """
        from sqlalchemy.orm import joinedload
        from app.models.user import User

        query = Student.query.options(
            joinedload(Student.user),
            joinedload(Student.attendances),
            joinedload(Student.grades),
            joinedload(Student.parent),
            joinedload(Student.class_)
        )

        if tenant_id is not None and hasattr(Student, 'tenant_id'):
            resolved_tenant_id = tenant_id
            if isinstance(tenant_id, str):
                import uuid
                try:
                    resolved_tenant_id = uuid.UUID(tenant_id)
                except ValueError:
                    # Look up Tenant by slug
                    from app.models.tenant import Tenant
                    t = Tenant.query.filter_by(slug=tenant_id).first()
                    if t:
                        resolved_tenant_id = t.id
                    else:
                        # Fallback to a dummy UUID so that query executes successfully but returns zero results
                        resolved_tenant_id = uuid.uuid4()
            query = query.filter(Student.tenant_id == resolved_tenant_id)
        
        if class_id:
            query = query.filter(Student.class_id == class_id)

        if status:
            query = query.filter(Student.status == status)

        if search and str(search).strip():
            s = f"%{str(search).strip()}%"
            query = query.join(User, Student.user_id == User.id).filter(
                (Student.first_name.ilike(s)) |
                (Student.last_name.ilike(s)) |
                (Student.admission_number.ilike(s)) |
                (User.email.ilike(s))
            )
            
        return query.order_by(Student.admission_number).paginate(page=page, per_page=per_page, error_out=False)
    
    def get_student_by_id(self, student_id: int) -> Optional[Any]:
        """Get a student by ID. Always returns a Student model instance."""
        from sqlalchemy.orm import joinedload
        
        # Query database
        student = Student.query.options(
            joinedload(Student.user),
            joinedload(Student.class_),
            joinedload(Student.parent),
            joinedload(Student.attendances),
            joinedload(Student.grades)
        ).get(student_id)
        
        # Cache the result if found (as DTO)
        if student:
            cache_key = f"student:dto:{student_id}"
            cache_service.set(cache_key, student_schema.dump(student), ttl=cache_service.SHORT_TTL)
        
        return student

    def get_student_dto(self, student_id: int) -> Optional[Dict[str, Any]]:
        """Get a student DTO (dict) by ID, using cache if available."""
        cache_key = f"student:dto:{student_id}"
        cached_student = cache_service.get(cache_key)
        if cached_student:
            return cached_student
            
        student = self.get_student_by_id(student_id)
        if student:
            return student_schema.dump(student)
        return None
    
    def get_student_by_user_id(self, user_id: int) -> Optional[Student]:
        """Get a student by user ID.
        
        Args:
            user_id: The user ID associated with the student
            
        Returns:
            Student object if found, None otherwise
        """
        from sqlalchemy.orm import joinedload
        
        return Student.query.options(
            joinedload(Student.user),
            joinedload(Student.class_),
            joinedload(Student.parent),
            joinedload(Student.attendances),
            joinedload(Student.grades)
        ).filter_by(user_id=user_id).first()
    
    def get_student_by_admission_number(self, admission_number: str) -> Optional[Student]:
        """Get a student by admission number.
        
        Args:
            admission_number: The admission number of the student
            
        Returns:
            Student object if found, None otherwise
        """
        return Student.query.filter_by(admission_number=admission_number).first()
    
    def create_student(self, student_data: Dict[str, Any], tenant_id=None) -> Tuple[Optional[Student], Optional[str]]:
        """Create a new student.
        
        Args:
            student_data: Dictionary containing student data
            
        Returns:
            Tuple containing:
                - Student object if created successfully, None otherwise
                - Error message if there was an error, None otherwise
        """
        try:
            # Validate required fields
            if 'user_id' not in student_data:
                return None, "User ID is required"
                
            # Check if user exists
            user = User.query.get(student_data['user_id'])
            if not user:
                logger.warning("Attempted to create student with non-existent user", user_id=student_data['user_id'])
                return None, "User not found"
            
            # Generate admission number if not provided
            if 'admission_number' not in student_data or not student_data['admission_number']:
                student_data['admission_number'] = Student.generate_admission_number(tenant_id=tenant_id)
                logger.info("Generated admission number", admission_number=student_data['admission_number'])
            else:
                # Check if provided admission_number is unique within the tenant
                q = Student.query.filter_by(admission_number=student_data['admission_number'])
                if tenant_id is not None and hasattr(Student, 'tenant_id'):
                    q = q.filter(Student.tenant_id == tenant_id)
                existing_student = q.first()
                if existing_student:
                    logger.warning("Attempted to create student with existing admission number", 
                                  admission_number=student_data['admission_number'])
                    return None, "Admission number already exists"
            
            # Check if user already has a student profile
            existing_profile = Student.query.filter_by(user_id=student_data['user_id']).first()
            if existing_profile:
                logger.warning("Attempted to create duplicate student profile", 
                              user_id=student_data['user_id'], 
                              existing_student_id=existing_profile.id)
                return None, "User already has a student profile"
            
            # Create the student
            payload = dict(student_data)
            if tenant_id is not None and 'tenant_id' not in payload and hasattr(Student, 'tenant_id'):
                payload['tenant_id'] = tenant_id
            new_student = Student(**payload)
            self.db_session.add(new_student)
            try:
                from app.models.tenant import TenantMembership
                if tenant_id is not None:
                    existing = TenantMembership.query.filter_by(user_id=new_student.user_id, tenant_id=tenant_id).first()
                    if not existing:
                        self.db_session.add(TenantMembership(
                            tenant_id=tenant_id,
                            user_id=new_student.user_id,
                            role='student',
                            status='active'
                        ))
            except Exception:
                pass
            self.db_session.commit()
            cache_service.delete(f"student:dto:{new_student.id}")
            
            logger.info("Student created successfully", 
                       student_id=new_student.id, 
                       user_id=new_student.user_id, 
                       admission_number=new_student.admission_number)
            return new_student, None
            
        except SQLAlchemyError as e:
            self.db_session.rollback()
            error_msg = str(e)
            logger.error("Database error creating student", 
                        error=error_msg, 
                        user_id=student_data.get('user_id'))
            return None, f"Database error: {error_msg}"
            
        except Exception as e:
            self.db_session.rollback()
            error_msg = str(e)
            logger.error("Unexpected error creating student", 
                        error=error_msg, 
                        user_id=student_data.get('user_id'))
            return None, f"Unexpected error: {error_msg}"
    
    def update_student(self, student_id: int, student_data: Dict[str, Any], tenant_id=None) -> Tuple[Optional[Student], Optional[str]]:
        """Update a student.
        
        Args:
            student_id: ID of the student to update
            student_data: Dictionary containing updated student data
            
        Returns:
            Tuple containing:
                - Student object if updated successfully, None otherwise
                - Error message if there was an error, None otherwise
        """
        try:
            # Log the incoming data for debugging
            logger.debug("Updating student", student_id=student_id, data_keys=list(student_data.keys()))
            
            # Find the student
            student = Student.query.get(student_id)
            if not student:
                logger.warning("Attempted to update non-existent student", student_id=student_id)
                return None, "Student not found"
            
            # Check if admission_number is being changed and if it's unique
            if 'admission_number' in student_data and student_data['admission_number']:
                if student_data['admission_number'] != student.admission_number:
                    q = Student.query.filter_by(admission_number=student_data['admission_number'])
                    if tenant_id is not None and hasattr(Student, 'tenant_id'):
                        q = q.filter(Student.tenant_id == tenant_id)
                    existing_student = q.first()
                    if existing_student and existing_student.id != student_id:
                        logger.warning("Attempted to update student with existing admission number", 
                                      student_id=student_id, 
                                      admission_number=student_data['admission_number'])
                        return None, "Admission number already exists"
            
            # Handle empty strings for optional fields
            for key, value in student_data.items():
                if value == "":
                    student_data[key] = None
            
            # Update student attributes
            for key, value in student_data.items():
                if hasattr(student, key):
                    setattr(student, key, value)
                else:
                    logger.warning("Attempted to set unknown attribute on student", 
                                  student_id=student_id, 
                                  attribute=key)
            
            student.updated_at = datetime.utcnow()
            self.db_session.commit()
            cache_service.delete(f"student:dto:{student_id}")
            
            logger.info("Student updated successfully", 
                       student_id=student.id, 
                       admission_number=student.admission_number)
            return student, None
            
        except SQLAlchemyError as e:
            self.db_session.rollback()
            error_msg = str(e)
            logger.error("Database error updating student", 
                        error=error_msg, 
                        student_id=student_id)
            return None, f"Database error: {error_msg}"
            
        except Exception as e:
            self.db_session.rollback()
            error_msg = str(e)
            logger.error("Unexpected error updating student", 
                        error=error_msg, 
                        student_id=student_id, 
                        data_keys=list(student_data.keys()) if isinstance(student_data, dict) else None)
            return None, f"Unexpected error: {error_msg}"
    
    def delete_student(self, student_id: int) -> Tuple[bool, Optional[str]]:
        """Delete a student.
        
        Args:
            student_id: ID of the student to delete
            
        Returns:
            Tuple containing:
                - True if deleted successfully, False otherwise
                - Error message if there was an error, None otherwise
        """
        try:
            student = Student.query.get(student_id)
            if not student:
                logger.warning("Attempted to delete non-existent student", student_id=student_id)
                return False, "Student not found"
            
            # Store info for logging before deletion
            admission_number = student.admission_number
            user_id = student.user_id
            
            self.db_session.delete(student)
            self.db_session.commit()
            cache_service.delete(f"student:dto:{student_id}")
            
            logger.info("Student deleted successfully", 
                       student_id=student_id, 
                       admission_number=admission_number,
                       user_id=user_id)
            return True, None
            
        except SQLAlchemyError as e:
            self.db_session.rollback()
            error_msg = str(e)
            logger.error("Database error deleting student", 
                        error=error_msg, 
                        student_id=student_id)
            return False, f"Database error: {error_msg}"
            
        except Exception as e:
            self.db_session.rollback()
            error_msg = str(e)
            logger.error("Unexpected error deleting student", 
                        error=error_msg, 
                        student_id=student_id)
            return False, f"Unexpected error: {error_msg}"
    
    def assign_class(self, student_id: int, class_id: int) -> Tuple[Optional[Student], Optional[str]]:
        """Assign a student to a class.
        
        Args:
            student_id: ID of the student to assign
            class_id: ID of the class to assign the student to
            
        Returns:
            Tuple containing:
                - Student object if assigned successfully, None otherwise
                - Error message if there was an error, None otherwise
        """
        try:
            # Find the student
            student = Student.query.get(student_id)
            if not student:
                logger.warning("Attempted to assign non-existent student to class", 
                              student_id=student_id, 
                              class_id=class_id)
                return None, "Student not found"
            
            # Find the class
            class_obj = Class.query.get(class_id)
            if not class_obj:
                logger.warning("Attempted to assign student to non-existent class", 
                              student_id=student_id, 
                              class_id=class_id)
                return None, "Class not found"

            if getattr(student, 'tenant_id', None) and getattr(class_obj, 'tenant_id', None):
                if student.tenant_id != class_obj.tenant_id:
                    return None, "Tenant mismatch"

            max_capacity = class_obj.capacity
            if not max_capacity:
                try:
                    config = AcademicConfigurationService.build_harmonized_config(class_obj.tenant_id)
                    max_capacity = int(config.get('maxStudentsPerClass') or 0) or None
                except Exception:
                    max_capacity = None

            if max_capacity is not None:
                current_enrollment = class_obj.current_enrollment
                if student.class_id != class_obj.id and current_enrollment >= max_capacity:
                    return None, "Class is at maximum capacity"
            
            # Store previous class for logging
            previous_class_id = student.class_id
            
            # Assign the student to the class
            student.class_id = class_id
            student.updated_at = datetime.utcnow()
            self.db_session.commit()
            cache_service.delete(f"student:dto:{student_id}")
            
            logger.info("Student assigned to class successfully", 
                       student_id=student_id, 
                       class_id=class_id, 
                       previous_class_id=previous_class_id,
                       class_name=class_obj.name)
            return student, None
            
        except SQLAlchemyError as e:
            self.db_session.rollback()
            error_msg = str(e)
            logger.error("Database error assigning student to class", 
                        error=error_msg, 
                        student_id=student_id, 
                        class_id=class_id)
            return None, f"Database error: {error_msg}"
            
        except Exception as e:
            self.db_session.rollback()
            error_msg = str(e)
            logger.error("Unexpected error assigning student to class", 
                        error=error_msg, 
                        student_id=student_id, 
                        class_id=class_id)
            return None, f"Unexpected error: {error_msg}"
