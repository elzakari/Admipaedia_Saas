import calendar
import structlog
from datetime import date, datetime
from typing import Optional, Tuple, Dict, Any
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy import or_

from app.extensions import db
from app.models.staff import Staff
from app.models.user import User
from app.models.teacher import Teacher
from app.models.teacher_attendance import TeacherAttendance
from app.models.staff_enhanced import StaffAttendance
from app.models.department import Department, department_staff
from app.services.department_service import DepartmentService

logger = structlog.get_logger()

class StaffService:
    @staticmethod
    def _get_department_lookup(user_ids, tenant_id=None):
        if not user_ids:
            return {}

        rows = (
            db.session.query(
                department_staff.c.user_id,
                Department.id,
                Department.name,
            )
            .join(Department, Department.id == department_staff.c.department_id)
            .filter(department_staff.c.user_id.in_(user_ids))
        )
        if tenant_id is not None and hasattr(Department, 'tenant_id'):
            rows = rows.filter(Department.tenant_id == tenant_id)
        rows = rows.order_by(Department.name.asc()).all()

        lookup = {}
        for user_id, department_id, department_name in rows:
            lookup.setdefault(user_id, {
                'department_id': department_id,
                'department_name': department_name,
            })
        return lookup

    @staticmethod
    def list_staff(page: int = 1, per_page: int = 20, search: Optional[str] = None, tenant_id=None):
        query = Staff.query.filter(Staff.tenant_id == tenant_id) if tenant_id is not None else Staff.query

        if search:
            search_term = f"%{search.strip()}%"
            query = query.join(User, Staff.user_id == User.id).filter(
                or_(
                    Staff.first_name.ilike(search_term),
                    Staff.last_name.ilike(search_term),
                    Staff.employee_id.ilike(search_term),
                    Staff.job_title.ilike(search_term),
                    User.email.ilike(search_term),
                )
            )

        return query.order_by(Staff.created_at.desc()).paginate(page=page, per_page=per_page, error_out=False)

    @staticmethod
    def get_staff_by_employee_id(employee_id: str) -> Optional[Staff]:
        return Staff.query.filter_by(employee_id=employee_id).first()

    @staticmethod
    def get_staff_by_id(staff_id: int, tenant_id=None) -> Optional[Staff]:
        query = Staff.query.filter(Staff.id == staff_id)
        if tenant_id is not None:
            query = query.filter(Staff.tenant_id == tenant_id)
        return query.first()

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
    def update_staff(staff_id: int, data: Dict[str, Any], tenant_id=None) -> Tuple[Optional[Staff], Optional[str]]:
        try:
            staff = StaffService.get_staff_by_id(staff_id, tenant_id=tenant_id)
            if not staff:
                return None, "Staff not found"

            updatable_fields = {
                'first_name', 'last_name', 'job_title', 'date_of_birth', 'gender',
                'address', 'phone_number', 'joining_date', 'status'
            }
            for key, value in data.items():
                if key in updatable_fields:
                    setattr(staff, key, value)

            db.session.commit()
            return staff, None
        except SQLAlchemyError as e:
            db.session.rollback()
            logger.error(f"Database error updating staff: {str(e)}")
            return None, "Database error"
        except Exception as e:
            db.session.rollback()
            logger.error(f"Unexpected error updating staff: {str(e)}")
            return None, "Unexpected error"

    @staticmethod
    def delete_staff(staff_id: int, tenant_id=None) -> Tuple[bool, Optional[str]]:
        try:
            staff = StaffService.get_staff_by_id(staff_id, tenant_id=tenant_id)
            if not staff:
                return False, "Staff not found"

            db.session.delete(staff)
            db.session.commit()
            return True, None
        except SQLAlchemyError as e:
            db.session.rollback()
            logger.error(f"Database error deleting staff: {str(e)}")
            return False, "Database error"
        except Exception as e:
            db.session.rollback()
            logger.error(f"Unexpected error deleting staff: {str(e)}")
            return False, "Unexpected error"

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

    @staticmethod
    def get_staff_directory(tenant_id=None, search: Optional[str] = None):
        teacher_query = Teacher.query
        if tenant_id is not None and hasattr(Teacher, 'tenant_id'):
            teacher_query = teacher_query.filter(Teacher.tenant_id == tenant_id)
        teacher_rows = teacher_query.all()

        staff_query = Staff.query
        if tenant_id is not None:
            staff_query = staff_query.filter(Staff.tenant_id == tenant_id)
        if search:
            search_term = f"%{search.strip()}%"
            staff_query = staff_query.join(User, Staff.user_id == User.id).filter(
                or_(
                    Staff.first_name.ilike(search_term),
                    Staff.last_name.ilike(search_term),
                    Staff.employee_id.ilike(search_term),
                    Staff.job_title.ilike(search_term),
                    User.email.ilike(search_term),
                )
            )
        staff_rows = staff_query.all()
        staff_departments = StaffService._get_department_lookup(
            [staff.user_id for staff in staff_rows if getattr(staff, 'user_id', None)],
            tenant_id=tenant_id
        )

        directory = []
        for teacher in teacher_rows:
            full_name = f"{getattr(teacher, 'first_name', '')} {getattr(teacher, 'last_name', '')}".strip()
            email = getattr(getattr(teacher, 'user', None), 'email', None)
            if search:
                haystack = " ".join([
                    full_name,
                    email or '',
                    getattr(teacher, 'employee_id', '') or '',
                    getattr(teacher, 'specialization', '') or '',
                    getattr(getattr(teacher, 'department', None), 'name', '') or ''
                ]).lower()
                if search.strip().lower() not in haystack:
                    continue
            directory.append({
                'id': teacher.id,
                'entity_type': 'teacher',
                'entity_key': f"teacher-{teacher.id}",
                'name': full_name or f"Teacher {teacher.id}",
                'position': getattr(teacher, 'specialization', None) or 'Teacher',
                'department_name': getattr(getattr(teacher, 'department', None), 'name', None),
                'email': email,
                'phone': getattr(teacher, 'phone_number', None),
                'join_date': (
                    teacher.joining_date.isoformat()
                    if getattr(teacher, 'joining_date', None)
                    else (teacher.hire_date.isoformat() if getattr(teacher, 'hire_date', None) else None)
                ),
                'status': getattr(teacher, 'status', 'active'),
                'employee_id': getattr(teacher, 'employee_id', None),
            })

        for staff in staff_rows:
            department_info = staff_departments.get(getattr(staff, 'user_id', None), {})
            directory.append({
                'id': staff.id,
                'entity_type': 'staff',
                'entity_key': f"staff-{staff.id}",
                'name': staff.full_name,
                'position': staff.job_title or 'Staff',
                'department_id': department_info.get('department_id'),
                'department_name': department_info.get('department_name'),
                'email': getattr(getattr(staff, 'user', None), 'email', None),
                'phone': staff.phone_number,
                'join_date': staff.joining_date.isoformat() if staff.joining_date else None,
                'status': staff.status or 'active',
                'employee_id': staff.employee_id,
            })

        return sorted(directory, key=lambda item: ((item.get('name') or '').lower(), item.get('entity_type') or ''))

    @staticmethod
    def get_attendance_summary(month: str, tenant_id=None):
        year, month_num = [int(part) for part in month.split('-', 1)]
        _, last_day = calendar.monthrange(year, month_num)
        start_date = date(year, month_num, 1)
        end_date = date(year, month_num, last_day)

        teacher_query = Teacher.query
        if tenant_id is not None and hasattr(Teacher, 'tenant_id'):
            teacher_query = teacher_query.filter(Teacher.tenant_id == tenant_id)
        teachers = teacher_query.all()

        staff_query = Staff.query
        if tenant_id is not None:
            staff_query = staff_query.filter(Staff.tenant_id == tenant_id)
        staff_rows = staff_query.all()

        teacher_attendance = TeacherAttendance.query.filter(
            TeacherAttendance.date >= start_date,
            TeacherAttendance.date <= end_date,
            TeacherAttendance.teacher_id.in_([teacher.id for teacher in teachers] or [-1])
        ).all()
        staff_attendance = StaffAttendance.query.filter(
            StaffAttendance.date >= start_date,
            StaffAttendance.date <= end_date,
            StaffAttendance.staff_id.in_([staff.id for staff in staff_rows] or [-1])
        ).all()

        by_entity = {}
        summary = []

        def _build_stats(records):
            present = sum(1 for record in records if record['status'] == 'present')
            absent = sum(1 for record in records if record['status'] == 'absent')
            late = sum(1 for record in records if record['status'] == 'late')
            total = present + absent + late
            return present, absent, late, (round(((present + late) / total) * 100) if total > 0 else 0)

        for teacher in teachers:
            key = f"teacher-{teacher.id}"
            items = [{
                'id': record.id,
                'entity_type': 'teacher',
                'entity_id': teacher.id,
                'entity_key': key,
                'date': record.date.isoformat(),
                'status': record.status,
                'note': record.note,
            } for record in teacher_attendance if record.teacher_id == teacher.id]
            by_entity[key] = items
            present, absent, late, rate = _build_stats(items)
            summary.append({
                'entity_type': 'teacher',
                'entity_id': teacher.id,
                'entity_key': key,
                'name': f"{getattr(teacher, 'first_name', '')} {getattr(teacher, 'last_name', '')}".strip() or f"Teacher {teacher.id}",
                'position': getattr(teacher, 'specialization', None) or 'Teacher',
                'present': present,
                'absent': absent,
                'late': late,
                'attendanceRate': rate,
            })

        for staff in staff_rows:
            key = f"staff-{staff.id}"
            items = [{
                'id': record.id,
                'entity_type': 'staff',
                'entity_id': staff.id,
                'entity_key': key,
                'date': record.date.isoformat(),
                'status': record.status,
                'note': None,
            } for record in staff_attendance if record.staff_id == staff.id]
            by_entity[key] = items
            present, absent, late, rate = _build_stats(items)
            summary.append({
                'entity_type': 'staff',
                'entity_id': staff.id,
                'entity_key': key,
                'name': staff.full_name,
                'position': staff.job_title or 'Staff',
                'present': present,
                'absent': absent,
                'late': late,
                'attendanceRate': rate,
            })

        return {
            'month': month,
            'summary': summary,
            'by_entity': by_entity,
        }

    @staticmethod
    def get_staff_attendance(staff_id: int, start_date: date, end_date: date, tenant_id=None):
        staff = StaffService.get_staff_by_id(staff_id, tenant_id=tenant_id)
        if not staff:
            return None, "Staff not found"
        records = StaffAttendance.query.filter(
            StaffAttendance.staff_id == staff_id,
            StaffAttendance.date >= start_date,
            StaffAttendance.date <= end_date
        ).order_by(StaffAttendance.date.desc()).all()
        return records, None

    @staticmethod
    def mark_staff_attendance(staff_id: int, attendance_date: date, status: str, note: Optional[str] = None, tenant_id=None):
        staff = StaffService.get_staff_by_id(staff_id, tenant_id=tenant_id)
        if not staff:
            return None, "Staff not found"

        record = StaffAttendance.query.filter_by(staff_id=staff_id, date=attendance_date).first()
        if record is None:
            record = StaffAttendance(staff_id=staff_id, date=attendance_date)
            db.session.add(record)

        record.status = status
        if status == 'present' and record.check_in_time is None:
            record.check_in_time = datetime.now().time()
        if status != 'present':
            record.check_out_time = None
        db.session.commit()
        return record, None
