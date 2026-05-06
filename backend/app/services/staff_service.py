import structlog
from typing import Optional, Tuple, Dict, Any
from sqlalchemy.exc import SQLAlchemyError

from app.extensions import db
from app.models.staff import Staff
from app.models.user import User
from app.models.teacher import Teacher
from app.services.department_service import DepartmentService

logger = structlog.get_logger()

class StaffService:
    @staticmethod
    def get_staff_by_employee_id(employee_id: str) -> Optional[Staff]:
        return Staff.query.filter_by(employee_id=employee_id).first()

    @staticmethod
    def create_staff(data: Dict[str, Any], tenant_id=None) -> Tuple[Optional[Staff], Optional[str]]:
        """
        Create a new staff profile. Auto-generates employee_id if missing/blank.
        Ensures employee_id is unique across Staff and Teacher within a tenant.
        """
        try:
            if tenant_id is None:
                return None, "Tenant context required"

            user_id = data.get('user_id')
            if not user_id:
                return None, "user_id is required"

            # Validate user exists
            user = User.query.get(user_id)
            if not user:
                return None, "User not found"

            # Ensure user does not already have a staff profile
            existing_profile = Staff.query.filter_by(user_id=user_id).first()
            if existing_profile:
                return None, "User already has a staff profile"

            # Employee ID handling
            employee_id = data.get('employee_id')
            if not employee_id:
                employee_id = Staff.generate_employee_id(tenant_id=tenant_id)
            else:
                if Staff.query.filter_by(employee_id=employee_id, tenant_id=tenant_id).first() or \
                   Teacher.query.filter_by(employee_id=employee_id, tenant_id=tenant_id).first():
                    return None, "Employee ID already exists"

            staff = Staff(
                tenant_id=tenant_id,
                user_id=user_id,
                employee_id=employee_id,
                first_name=data.get('first_name'),
                last_name=data.get('last_name'),
                job_title=data.get('job_title'),
                date_of_birth=data.get('date_of_birth'),
                gender=data.get('gender'),
                address=data.get('address'),
                phone_number=data.get('phone_number'),
                joining_date=data.get('joining_date')
            )

            db.session.add(staff)
            try:
                from app.models.tenant import TenantMembership
                existing = TenantMembership.query.filter_by(user_id=user_id, tenant_id=tenant_id).first()
                if not existing:
                    db.session.add(TenantMembership(
                        tenant_id=tenant_id,
                        user_id=user_id,
                        role='staff',
                        status='active'
                    ))
            except Exception:
                pass
            db.session.commit()

            logger.info("Staff profile created", staff_id=staff.id, user_id=user_id)
            return staff, None

        except SQLAlchemyError as e:
            db.session.rollback()
            logger.error(f"Database error creating staff: {str(e)}")
            return None, "Database error"
        except Exception as e:
            db.session.rollback()
            logger.error(f"Unexpected error creating staff: {str(e)}")
            return None, "Unexpected error"

    @staticmethod
    def assign_department(staff_id: int, department_id: int, role: Optional[str] = None, tenant_id=None) -> Tuple[bool, Optional[str]]:
        """Assign a staff member (by staff_id) to a department via department_staff association."""
        try:
            staff = Staff.query.get(staff_id)
            if not staff:
                return False, "Staff not found"
            if tenant_id is not None and getattr(staff, 'tenant_id', None) != tenant_id:
                return False, "Unauthorized"

            ok = DepartmentService.add_staff_to_department(department_id=department_id, user_id=staff.user_id, role=role, tenant_id=tenant_id)
            if not ok:
                return False, "Failed to assign staff to department"

            return True, None
        except SQLAlchemyError as e:
            db.session.rollback()
            logger.error(f"Database error assigning staff to department: {str(e)}")
            return False, "Database error"
        except Exception as e:
            db.session.rollback()
            logger.error(f"Unexpected error assigning staff to department: {str(e)}")
            return False, "Unexpected error"
