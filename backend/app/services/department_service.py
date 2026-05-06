import logging
from typing import List, Optional, Dict, Any

from sqlalchemy.exc import SQLAlchemyError
from app.extensions import db
from app.models.department import Department

logger = logging.getLogger(__name__)

class DepartmentService:
    @staticmethod
    def get_all_departments(is_active: Optional[bool] = None, tenant_id=None) -> List[Department]:
        """Get all departments with optional filtering by active status."""
        try:
            query = Department.query
            if tenant_id is not None and hasattr(Department, 'tenant_id'):
                query = query.filter(Department.tenant_id == tenant_id)
            if is_active is not None:
                query = query.filter(Department.is_active == is_active)
            return query.all()
        except SQLAlchemyError as e:
            logger.error(f"Error retrieving departments: {str(e)}")
            return []

    @staticmethod
    def get_department_by_id(department_id: int, tenant_id=None) -> Optional[Department]:
        """Get a department by ID."""
        try:
            q = Department.query.filter(Department.id == department_id)
            if tenant_id is not None and hasattr(Department, 'tenant_id'):
                q = q.filter(Department.tenant_id == tenant_id)
            return q.first()
        except SQLAlchemyError as e:
            logger.error(f"Error retrieving department {department_id}: {str(e)}")
            return None

    @staticmethod
    def get_department_by_code(code: str, tenant_id=None) -> Optional[Department]:
        """Get a department by code."""
        try:
            q = Department.query.filter(Department.code == code)
            if tenant_id is not None and hasattr(Department, 'tenant_id'):
                q = q.filter(Department.tenant_id == tenant_id)
            return q.first()
        except SQLAlchemyError as e:
            logger.error(f"Error retrieving department with code {code}: {str(e)}")
            return None

    @staticmethod
    def create_department(department_data: Dict[str, Any], tenant_id=None) -> Optional[Department]:
        """Create a new department."""
        try:
            if tenant_id is None:
                return None

            # Check if department with same code already exists
            existing_department = DepartmentService.get_department_by_code(department_data.get('code'), tenant_id=tenant_id)
            if existing_department:
                logger.warning(f"Department with code {department_data.get('code')} already exists")
                return None

            payload = dict(department_data or {})
            if 'tenant_id' not in payload and hasattr(Department, 'tenant_id'):
                payload['tenant_id'] = tenant_id
            department = Department(**payload)
            db.session.add(department)
            db.session.commit()
            return department
        except SQLAlchemyError as e:
            db.session.rollback()
            logger.error(f"Error creating department: {str(e)}")
            return None

    @staticmethod
    def update_department(department_id: int, department_data: Dict[str, Any], tenant_id=None) -> Optional[Department]:
        """Update an existing department."""
        try:
            department = DepartmentService.get_department_by_id(department_id, tenant_id=tenant_id)
            if not department:
                logger.warning(f"Department with ID {department_id} not found")
                return None

            # Check code uniqueness if code is being updated
            if 'code' in department_data and department_data['code'] != department.code:
                existing_department = DepartmentService.get_department_by_code(department_data['code'], tenant_id=tenant_id)
                if existing_department:
                    logger.warning(f"Department with code {department_data['code']} already exists")
                    return None

            for key, value in department_data.items():
                setattr(department, key, value)

            db.session.commit()
            return department
        except SQLAlchemyError as e:
            db.session.rollback()
            logger.error(f"Error updating department {department_id}: {str(e)}")
            return None

    @staticmethod
    def delete_department(department_id: int, tenant_id=None) -> bool:
        """Delete a department by ID."""
        try:
            department = DepartmentService.get_department_by_id(department_id, tenant_id=tenant_id)
            if not department:
                logger.warning(f"Department with ID {department_id} not found")
                return False

            db.session.delete(department)
            db.session.commit()
            return True
        except SQLAlchemyError as e:
            db.session.rollback()
            logger.error(f"Error deleting department {department_id}: {str(e)}")
            return False

    @staticmethod
    def add_staff_to_department(department_id: int, user_id: int, role: Optional[str] = None, tenant_id=None) -> bool:
        """Add a staff member to a department."""
        try:
            from app.models.department import department_staff, Department
            from app.models.user import User

            dept = Department.query.get(department_id)
            user = User.query.get(user_id)
            if not dept or not user:
                return False
            if tenant_id is not None and getattr(dept, 'tenant_id', None) != tenant_id:
                return False

            # Check if already assigned
            existing = db.session.execute(
                department_staff.select().where(
                    (department_staff.c.department_id == department_id) &
                    (department_staff.c.user_id == user_id)
                )
            ).first()
            if existing:
                return True  # already assigned; treat as success

            db.session.execute(
                department_staff.insert().values(
                    department_id=department_id,
                    user_id=user_id,
                    role=role
                )
            )
            db.session.commit()
            return True
        except SQLAlchemyError as e:
            db.session.rollback()
            logger.error(f"Error adding staff {user_id} to department {department_id}: {str(e)}")
            return False
