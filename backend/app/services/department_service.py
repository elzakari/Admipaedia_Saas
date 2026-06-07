"""
Service layer for the unified AcademicStructure / Department model.

All methods accept an optional `structure_type` parameter.  When omitted they
operate across all types (to preserve backward compatibility with callers that
do not know about the polymorphic layout).

A `generate_subject_code` helper centralises the code-generation logic so that
both the backend API and any future CLI seed commands share the same algorithm.
"""
import logging
from typing import List, Optional, Dict, Any

from sqlalchemy.exc import SQLAlchemyError

from app.extensions import db
from app.models.department import AcademicStructure, AcademicStructureType, Department

logger = logging.getLogger(__name__)


class AcademicStructureService:
    """Unified service for AcademicStructure (disciplines, cycles, operational)."""

    # ── Read ───────────────────────────────────────────────────────────────────

    @staticmethod
    def get_all(
        is_active: Optional[bool] = None,
        structure_type: Optional[AcademicStructureType] = None,
        tenant_id=None,
    ) -> List[AcademicStructure]:
        """Return all structures, optionally filtered by type, active status, tenant."""
        try:
            q = AcademicStructure.query
            if tenant_id is not None:
                q = q.filter(AcademicStructure.tenant_id == tenant_id)
            if structure_type is not None:
                q = q.filter(AcademicStructure.structure_type == structure_type)
            if is_active is not None:
                q = q.filter(AcademicStructure.is_active == is_active)
            return q.order_by(
                AcademicStructure.display_order,
                AcademicStructure.name,
            ).all()
        except SQLAlchemyError as exc:
            logger.error("get_all error: %s", exc)
            return []

    @staticmethod
    def get_by_id(
        structure_id: int,
        tenant_id=None,
    ) -> Optional[AcademicStructure]:
        try:
            q = AcademicStructure.query.filter(AcademicStructure.id == structure_id)
            if tenant_id is not None:
                q = q.filter(AcademicStructure.tenant_id == tenant_id)
            return q.first()
        except SQLAlchemyError as exc:
            logger.error("get_by_id(%s) error: %s", structure_id, exc)
            return None

    @staticmethod
    def get_by_code(
        code: str,
        tenant_id=None,
        structure_type: Optional[AcademicStructureType] = None,
    ) -> Optional[AcademicStructure]:
        try:
            q = AcademicStructure.query.filter(AcademicStructure.code == code)
            if tenant_id is not None:
                q = q.filter(AcademicStructure.tenant_id == tenant_id)
            if structure_type is not None:
                q = q.filter(AcademicStructure.structure_type == structure_type)
            return q.first()
        except SQLAlchemyError as exc:
            logger.error("get_by_code(%s) error: %s", code, exc)
            return None

    # ── Write ──────────────────────────────────────────────────────────────────

    @staticmethod
    def create(
        data: Dict[str, Any],
        tenant_id=None,
    ) -> Optional[AcademicStructure]:
        """
        Create a new AcademicStructure record.
        Requires `tenant_id` – will return None if missing.
        """
        try:
            if tenant_id is None:
                logger.warning("create called without tenant_id")
                return None

            payload = dict(data or {})

            # Coerce structure_type string → enum
            st_raw = payload.get("structure_type", AcademicStructureType.DISCIPLINE.value)
            if isinstance(st_raw, str):
                try:
                    payload["structure_type"] = AcademicStructureType(st_raw)
                except ValueError:
                    payload["structure_type"] = AcademicStructureType.DISCIPLINE

            # Uniqueness check: (tenant, code)
            if AcademicStructureService.get_by_code(
                payload.get("code", ""),
                tenant_id=tenant_id,
            ):
                logger.warning("Duplicate code '%s' for tenant %s", payload.get("code"), tenant_id)
                return None

            payload.setdefault("tenant_id", tenant_id)

            struct = AcademicStructure(**payload)
            db.session.add(struct)
            db.session.commit()
            return struct
        except SQLAlchemyError as exc:
            db.session.rollback()
            logger.error("create error: %s", exc)
            return None

    @staticmethod
    def update(
        structure_id: int,
        data: Dict[str, Any],
        tenant_id=None,
    ) -> Optional[AcademicStructure]:
        try:
            struct = AcademicStructureService.get_by_id(structure_id, tenant_id=tenant_id)
            if not struct:
                return None

            payload = dict(data or {})

            # Coerce structure_type if present
            if "structure_type" in payload and isinstance(payload["structure_type"], str):
                try:
                    payload["structure_type"] = AcademicStructureType(payload["structure_type"])
                except ValueError:
                    del payload["structure_type"]  # ignore unknown values

            # Code uniqueness (if changing)
            new_code = payload.get("code")
            if new_code and new_code != struct.code:
                existing = AcademicStructureService.get_by_code(new_code, tenant_id=tenant_id)
                if existing and existing.id != structure_id:
                    logger.warning("Code '%s' already taken", new_code)
                    return None

            for key, value in payload.items():
                setattr(struct, key, value)

            db.session.commit()
            return struct
        except SQLAlchemyError as exc:
            db.session.rollback()
            logger.error("update(%s) error: %s", structure_id, exc)
            return None

    @staticmethod
    def delete(structure_id: int, tenant_id=None) -> bool:
        try:
            struct = AcademicStructureService.get_by_id(structure_id, tenant_id=tenant_id)
            if not struct:
                return False
            db.session.delete(struct)
            db.session.commit()
            return True
        except SQLAlchemyError as exc:
            db.session.rollback()
            logger.error("delete(%s) error: %s", structure_id, exc)
            return False

    # ── Staff association ──────────────────────────────────────────────────────

    @staticmethod
    def add_staff(
        structure_id: int,
        user_id: int,
        role: Optional[str] = None,
        tenant_id=None,
    ) -> bool:
        try:
            from app.models.department import department_staff
            from app.models.user import User

            struct = AcademicStructureService.get_by_id(structure_id, tenant_id=tenant_id)
            user   = User.query.get(user_id)
            if not struct or not user:
                return False

            existing = db.session.execute(
                department_staff.select().where(
                    (department_staff.c.department_id == structure_id)
                    & (department_staff.c.user_id == user_id)
                )
            ).first()
            if existing:
                return True  # idempotent

            db.session.execute(
                department_staff.insert().values(
                    department_id=structure_id,
                    user_id=user_id,
                    role=role,
                )
            )
            db.session.commit()
            return True
        except SQLAlchemyError as exc:
            db.session.rollback()
            logger.error("add_staff error: %s", exc)
            return False

    # ── Subject code generation ────────────────────────────────────────────────

    @staticmethod
    def generate_subject_code(
        subject_name: str,
        department: Optional[AcademicStructure],
        tenant_id=None,
    ) -> str:
        """
        Generate a deterministic, sequential subject code:
          PREFIX-DEPTBINARY-NNN
          - PREFIX       : first 3 chars of subject name, uppercased, alpha only
          - DEPTBINARY   : 5-bit binary of first letter of department name (00000 if none)
          - NNN          : zero-padded sequential suffix (001, 002 …)

        Example: subject='Mathematics', dept='Sciences' (S=19 → 10011)
                 → 'MAT-10011-001' (first occurrence)
        """
        # PREFIX
        alpha_only = "".join(c for c in subject_name.upper() if c.isalpha())
        prefix = alpha_only[:3].ljust(3, "X")

        # DEPTBINARY
        dept_name = department.name if department else ""
        dept_bin  = AcademicStructure.binary_prefix_for_name(dept_name)

        # Base without serial
        base = f"{prefix}-{dept_bin}"

        # Sequential suffix: count existing codes starting with base in this tenant
        from app.models.subject import Subject
        q = Subject.query.filter(Subject.code.like(f"{base}-%"))
        if tenant_id:
            q = q.filter(Subject.tenant_id == tenant_id)
        count = q.count()
        serial = str(count + 1).zfill(3)

        return f"{base}-{serial}"


# ── Backward-compat alias ──────────────────────────────────────────────────────
# Existing code that imports DepartmentService keeps working.
class DepartmentService(AcademicStructureService):
    """
    Backward-compat shim.  All old method names are mapped to
    AcademicStructureService methods via the aliases below.
    """

    @staticmethod
    def get_all_departments(is_active=None, tenant_id=None):
        return AcademicStructureService.get_all(
            is_active=is_active,
            structure_type=AcademicStructureType.DISCIPLINE,
            tenant_id=tenant_id,
        )

    @staticmethod
    def get_department_by_id(department_id, tenant_id=None):
        return AcademicStructureService.get_by_id(department_id, tenant_id=tenant_id)

    @staticmethod
    def get_department_by_code(code, tenant_id=None):
        return AcademicStructureService.get_by_code(code, tenant_id=tenant_id)

    @staticmethod
    def create_department(data, tenant_id=None):
        payload = dict(data or {})
        payload.setdefault("structure_type", AcademicStructureType.DISCIPLINE.value)
        return AcademicStructureService.create(payload, tenant_id=tenant_id)

    @staticmethod
    def update_department(department_id, data, tenant_id=None):
        return AcademicStructureService.update(department_id, data, tenant_id=tenant_id)

    @staticmethod
    def delete_department(department_id, tenant_id=None):
        return AcademicStructureService.delete(department_id, tenant_id=tenant_id)

    @staticmethod
    def add_staff_to_department(department_id, user_id, role=None, tenant_id=None):
        return AcademicStructureService.add_staff(department_id, user_id, role, tenant_id)
