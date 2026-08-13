import calendar
from datetime import date, datetime
from typing import Any, Dict, List, Optional, Tuple

import structlog
from sqlalchemy import or_
from sqlalchemy.exc import SQLAlchemyError

from app.extensions import db
from app.models.department import Department, department_staff
from app.models.invitation import InvitationLink
from app.models.rbac import RBACRole, UserRoleAssignment
from app.models.staff import Staff
from app.models.staff_enhanced import StaffAttendance
from app.models.teacher import Teacher
from app.models.teacher_attendance import TeacherAttendance
from app.models.user import User
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
        if tenant_id is not None and hasattr(Department, "tenant_id"):
            rows = rows.filter(Department.tenant_id == tenant_id)
        rows = rows.order_by(Department.name.asc()).all()

        lookup = {}
        for user_id, department_id, department_name in rows:
            lookup.setdefault(
                user_id,
                {
                    "department_id": department_id,
                    "department_name": department_name,
                },
            )
        return lookup

    @staticmethod
    def list_staff(
        page: int = 1, per_page: int = 20, search: Optional[str] = None, tenant_id=None
    ):
        query = (
            Staff.query.filter(Staff.tenant_id == tenant_id)
            if tenant_id is not None
            else Staff.query
        )

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

        return query.order_by(Staff.created_at.desc()).paginate(
            page=page, per_page=per_page, error_out=False
        )

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
    def create_staff(
        data: Dict[str, Any], tenant_id=None
    ) -> Tuple[Optional[Staff], Optional[str]]:
        """
        Create a new staff profile. Auto-generates employee_id if missing/blank.
        Ensures employee_id is unique across Staff and Teacher within a tenant.
        """
        try:
            if tenant_id is None:
                return None, "Tenant context required"

            user_id = data.get("user_id")
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
            employee_id = data.get("employee_id")
            if not employee_id:
                employee_id = Staff.generate_employee_id(tenant_id=tenant_id)
            else:
                if (
                    Staff.query.filter_by(
                        employee_id=employee_id, tenant_id=tenant_id
                    ).first()
                    or Teacher.query.filter_by(
                        employee_id=employee_id, tenant_id=tenant_id
                    ).first()
                ):
                    return None, "Employee ID already exists"

            staff = Staff(
                tenant_id=tenant_id,
                user_id=user_id,
                employee_id=employee_id,
                first_name=data.get("first_name"),
                last_name=data.get("last_name"),
                job_title=data.get("job_title"),
                date_of_birth=data.get("date_of_birth"),
                gender=data.get("gender"),
                address=data.get("address"),
                phone_number=data.get("phone_number"),
                joining_date=data.get("joining_date"),
            )

            db.session.add(staff)
            try:
                from app.models.tenant import TenantMembership

                existing = TenantMembership.query.filter_by(
                    user_id=user_id, tenant_id=tenant_id
                ).first()
                if not existing:
                    db.session.add(
                        TenantMembership(
                            tenant_id=tenant_id,
                            user_id=user_id,
                            role="staff",
                            status="active",
                        )
                    )
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
    def update_staff(
        staff_id: int, data: Dict[str, Any], tenant_id=None
    ) -> Tuple[Optional[Staff], Optional[str]]:
        try:
            staff = StaffService.get_staff_by_id(staff_id, tenant_id=tenant_id)
            if not staff:
                return None, "Staff not found"

            updatable_fields = {
                "first_name",
                "last_name",
                "job_title",
                "date_of_birth",
                "gender",
                "address",
                "phone_number",
                "joining_date",
                "status",
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
    def assign_department(
        staff_id: int, department_id: int, role: Optional[str] = None, tenant_id=None
    ) -> Tuple[bool, Optional[str]]:
        """Assign a staff member (by staff_id) to a department via department_staff association."""
        try:
            staff = Staff.query.get(staff_id)
            if not staff:
                return False, "Staff not found"
            if tenant_id is not None and getattr(staff, "tenant_id", None) != tenant_id:
                return False, "Unauthorized"

            ok = DepartmentService.add_staff_to_department(
                department_id=department_id,
                user_id=staff.user_id,
                role=role,
                tenant_id=tenant_id,
            )
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
    def get_staff_directory(
        tenant_id=None,
        search: Optional[str] = None,
        entity_type: Optional[str] = None,
        has_role: Optional[bool] = None,
    ):
        teacher_query = Teacher.query
        if tenant_id is not None and hasattr(Teacher, "tenant_id"):
            teacher_query = teacher_query.filter(Teacher.tenant_id == tenant_id)
        teacher_rows: List[Teacher] = teacher_query.all()

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
        staff_rows: List[Staff] = staff_query.all()
        staff_departments = StaffService._get_department_lookup(
            [staff.user_id for staff in staff_rows if getattr(staff, "user_id", None)],
            tenant_id=tenant_id,
        )

        all_user_ids: List[int] = []
        for t in teacher_rows:
            if getattr(t, "user_id", None):
                all_user_ids.append(int(t.user_id))
        for s in staff_rows:
            if getattr(s, "user_id", None):
                all_user_ids.append(int(s.user_id))

        roles_by_user: Dict[int, List[str]] = {}
        if all_user_ids:
            assignment_rows = (
                UserRoleAssignment.query
                .filter(
                    UserRoleAssignment.user_id.in_(all_user_ids),
                    UserRoleAssignment.is_active.is_(True),
                )
                .join(RBACRole, UserRoleAssignment.role_id == RBACRole.id)
                .add_columns(UserRoleAssignment.user_id, RBACRole.name)
                .all()
            )
            for _assignment, uid, rname in assignment_rows:
                roles_by_user.setdefault(int(uid), [])
                if rname:
                    roles_by_user[int(uid)].append(str(rname))

        origins_by_user: Dict[int, str] = {}
        if all_user_ids:
            invite_rows = (
                InvitationLink.query
                .filter(InvitationLink.consumed_by_user_id.in_(all_user_ids))
                .add_columns(
                    InvitationLink.consumed_by_user_id,
                    InvitationLink.invitee_type,
                )
                .all()
            )
            for _inv, uid, itype in invite_rows:
                if not uid:
                    continue
                itype_s = str(itype or "")
                if itype_s == "general":
                    origins_by_user[int(uid)] = "general_invitation"
                elif itype_s == "teacher":
                    origins_by_user[int(uid)] = "teacher_invitation"
                elif itype_s == "parent":
                    origins_by_user[int(uid)] = "parent_invitation"

        def _origin_for(entity_type_row: str, user_id_val) -> str:
            if user_id_val and int(user_id_val) in origins_by_user:
                return origins_by_user[int(user_id_val)]
            return "manual_teacher" if entity_type_row == "teacher" else "manual_staff"

        directory = []
        for teacher in teacher_rows:
            full_name = f"{getattr(teacher, 'first_name', '')} {getattr(teacher, 'last_name', '')}".strip()
            email = getattr(getattr(teacher, "user", None), "email", None)
            if search:
                haystack = " ".join(
                    [
                        full_name,
                        email or "",
                        getattr(teacher, "employee_id", "") or "",
                        getattr(teacher, "specialization", "") or "",
                        getattr(getattr(teacher, "department", None), "name", "") or "",
                    ]
                ).lower()
                if search.strip().lower() not in haystack:
                    continue
            user_id_val = getattr(teacher, "user_id", None)
            role_names = roles_by_user.get(int(user_id_val), []) if user_id_val else []
            entry_origin = _origin_for("teacher", user_id_val)
            entry = {
                "id": teacher.id,
                "entity_type": "teacher",
                "entity_key": f"teacher-{teacher.id}",
                "name": full_name or f"Teacher {teacher.id}",
                "position": getattr(teacher, "specialization", None) or "Teacher",
                "department_name": getattr(
                    getattr(teacher, "department", None), "name", None
                ),
                "email": email,
                "phone": getattr(teacher, "phone_number", None),
                "join_date": (
                    teacher.joining_date.isoformat()
                    if getattr(teacher, "joining_date", None)
                    else (
                        teacher.hire_date.isoformat()
                        if getattr(teacher, "hire_date", None)
                        else None
                    )
                ),
                "status": getattr(teacher, "status", "active"),
                "employee_id": getattr(teacher, "employee_id", None),
                "user_id": user_id_val,
                "role_names": role_names,
                "has_role": bool(role_names),
                "origin": entry_origin,
                "has_login": bool(
                    user_id_val and getattr(getattr(teacher, "user", None), "is_active", True)
                ),
            }
            directory.append(entry)

        for staff in staff_rows:
            department_info = staff_departments.get(getattr(staff, "user_id", None), {})
            user_id_val = getattr(staff, "user_id", None)
            role_names = roles_by_user.get(int(user_id_val), []) if user_id_val else []
            entry_origin = _origin_for("staff", user_id_val)
            position = staff.job_title or "Staff"
            if entry_origin == "general_invitation" and not staff.job_title:
                position = "General Staff (Invited)"
            directory.append(
                {
                    "id": staff.id,
                    "entity_type": "staff",
                    "entity_key": f"staff-{staff.id}",
                    "name": staff.full_name,
                    "position": position,
                    "department_id": department_info.get("department_id"),
                    "department_name": department_info.get("department_name"),
                    "email": getattr(getattr(staff, "user", None), "email", None),
                    "phone": staff.phone_number,
                    "join_date": (
                        staff.joining_date.isoformat() if staff.joining_date else None
                    ),
                    "status": staff.status or "active",
                    "employee_id": staff.employee_id,
                    "user_id": user_id_val,
                    "role_names": role_names,
                    "has_role": bool(role_names),
                    "origin": entry_origin,
                    "has_login": bool(
                        user_id_val and getattr(getattr(staff, "user", None), "is_active", True)
                    ),
                }
            )

        def _row_passes_filters(row) -> bool:
            if entity_type and entity_type != "all":
                if entity_type == "general":
                    if row.get("origin") != "general_invitation":
                        return False
                elif row.get("entity_type") != entity_type:
                    return False
            if has_role is not None:
                if bool(row.get("has_role")) != bool(has_role):
                    return False
            return True

        directory = [row for row in directory if _row_passes_filters(row)]

        return sorted(
            directory,
            key=lambda item: (
                (item.get("name") or "").lower(),
                item.get("entity_type") or "",
            ),
        )

    @staticmethod
    def get_attendance_summary(month: str, tenant_id=None):
        year, month_num = [int(part) for part in month.split("-", 1)]
        _, last_day = calendar.monthrange(year, month_num)
        start_date = date(year, month_num, 1)
        end_date = date(year, month_num, last_day)

        teacher_query = Teacher.query
        if tenant_id is not None and hasattr(Teacher, "tenant_id"):
            teacher_query = teacher_query.filter(Teacher.tenant_id == tenant_id)
        teachers = teacher_query.all()

        staff_query = Staff.query
        if tenant_id is not None:
            staff_query = staff_query.filter(Staff.tenant_id == tenant_id)
        staff_rows = staff_query.all()

        teacher_ids = [t.id for t in teachers] or [-1]
        staff_ids = [s.id for s in staff_rows] or [-1]

        # Pull attendance rows (we still need them for by_entity detail)
        teacher_attendance = TeacherAttendance.query.filter(
            TeacherAttendance.date >= start_date,
            TeacherAttendance.date <= end_date,
            TeacherAttendance.teacher_id.in_(teacher_ids),
        ).all()
        staff_attendance = StaffAttendance.query.filter(
            StaffAttendance.date >= start_date,
            StaffAttendance.date <= end_date,
            StaffAttendance.staff_id.in_(staff_ids),
        ).all()

        # ── Dict-group attendance rows in ONE pass (O(n) instead of O(n*m)) ──
        ta_by_teacher: Dict[int, List[TeacherAttendance]] = {}
        for rec in teacher_attendance:
            ta_by_teacher.setdefault(int(rec.teacher_id), []).append(rec)

        sa_by_staff: Dict[int, List[StaffAttendance]] = {}
        for rec in staff_attendance:
            sa_by_staff.setdefault(int(rec.staff_id), []).append(rec)

        # Stats counts (single-pass tally per record instead of repeated sum())
        ta_stats = {}
        for _tid, recs in ta_by_teacher.items():
            p = a = l_ = 0
            for r in recs:
                s = r.status
                if s == "present":
                    p += 1
                elif s == "absent":
                    a += 1
                elif s == "late":
                    l_ += 1
            tot = p + a + l_
            ta_stats[_tid] = (p, a, l_, round(((p + l_) / tot) * 100) if tot > 0 else 0)

        sa_stats = {}
        for _sid, recs in sa_by_staff.items():
            p = a = l_ = 0
            for r in recs:
                s = r.status
                if s == "present":
                    p += 1
                elif s == "absent":
                    a += 1
                elif s == "late":
                    l_ += 1
            tot = p + a + l_
            sa_stats[_sid] = (p, a, l_, round(((p + l_) / tot) * 100) if tot > 0 else 0)

        by_entity: Dict[str, List[Dict[str, Any]]] = {}
        summary: List[Dict[str, Any]] = []

        for teacher in teachers:
            key = f"teacher-{teacher.id}"
            _tid = int(teacher.id)
            recs = ta_by_teacher.get(_tid, [])
            items = [
                {
                    "id": record.id,
                    "entity_type": "teacher",
                    "entity_id": _tid,
                    "entity_key": key,
                    "date": record.date.isoformat(),
                    "status": record.status,
                    "note": getattr(record, "note", None),
                }
                for record in recs
            ]
            by_entity[key] = items
            p, a, l_, rate = ta_stats.get(_tid, (0, 0, 0, 0))
            summary.append(
                {
                    "entity_type": "teacher",
                    "entity_id": _tid,
                    "entity_key": key,
                    "name": f"{getattr(teacher, 'first_name', '')} {getattr(teacher, 'last_name', '')}".strip()
                    or f"Teacher {_tid}",
                    "position": getattr(teacher, "specialization", None) or "Teacher",
                    "present": p,
                    "absent": a,
                    "late": l_,
                    "attendanceRate": rate,
                }
            )

        for staff in staff_rows:
            key = f"staff-{staff.id}"
            _sid = int(staff.id)
            recs = sa_by_staff.get(_sid, [])
            items = [
                {
                    "id": record.id,
                    "entity_type": "staff",
                    "entity_id": _sid,
                    "entity_key": key,
                    "date": record.date.isoformat(),
                    "status": record.status,
                    "note": None,
                }
                for record in recs
            ]
            by_entity[key] = items
            p, a, l_, rate = sa_stats.get(_sid, (0, 0, 0, 0))
            summary.append(
                {
                    "entity_type": "staff",
                    "entity_id": _sid,
                    "entity_key": key,
                    "name": staff.full_name,
                    "position": staff.job_title or "Staff",
                    "present": p,
                    "absent": a,
                    "late": l_,
                    "attendanceRate": rate,
                }
            )

        return {
            "month": month,
            "summary": summary,
            "by_entity": by_entity,
        }

    @staticmethod
    def get_staff_attendance(
        staff_id: int, start_date: date, end_date: date, tenant_id=None
    ):
        staff = StaffService.get_staff_by_id(staff_id, tenant_id=tenant_id)
        if not staff:
            return None, "Staff not found"
        records = (
            StaffAttendance.query.filter(
                StaffAttendance.staff_id == staff_id,
                StaffAttendance.date >= start_date,
                StaffAttendance.date <= end_date,
            )
            .order_by(StaffAttendance.date.desc())
            .all()
        )
        return records, None

    @staticmethod
    def mark_staff_attendance(
        staff_id: int,
        attendance_date: date,
        status: str,
        note: Optional[str] = None,
        tenant_id=None,
    ):
        staff = StaffService.get_staff_by_id(staff_id, tenant_id=tenant_id)
        if not staff:
            return None, "Staff not found"

        record = StaffAttendance.query.filter_by(
            staff_id=staff_id, date=attendance_date
        ).first()
        if record is None:
            record = StaffAttendance(staff_id=staff_id, date=attendance_date)
            db.session.add(record)

        record.status = status
        if status == "present" and record.check_in_time is None:
            record.check_in_time = datetime.now().time()
        if status != "present":
            record.check_out_time = None
        db.session.commit()
        return record, None
