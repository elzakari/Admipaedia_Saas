"""
Service layer for the unified AcademicStructure / Department model.

All methods accept an optional `structure_type` parameter.  When omitted they
operate across all types (to preserve backward compatibility with callers that
do not know about the polymorphic layout).

A `generate_subject_code` helper centralises the code-generation logic so that
both the backend API and any future CLI seed commands share the same algorithm.
"""

import logging
from typing import Any, Dict, List, Optional

from sqlalchemy import func
from sqlalchemy.exc import SQLAlchemyError

from app.extensions import db
from app.models.department import (AcademicStructure, AcademicStructureType,
                                   Department, department_staff)
from app.models.subject import Subject
from app.models.user import User

logger = logging.getLogger(__name__)

# ── Whitelist of AcademicStructure column names (ORM-safe payload filter) ───
_ACADEMIC_STRUCTURE_COLUMNS = {
    "tenant_id",
    "structure_type",
    "name",
    "code",
    "description",
    "head_id",
    "parent_id",
    "display_order",
    "allocated_budget",
    "is_active",
}


def _whitelist_payload(payload: Dict[str, Any]) -> Dict[str, Any]:
    """Return a copy of *payload* keeping only real AcademicStructure columns.

    Extra keys (e.g. the frontend's subjects_count/staff_count/staff, or any
    drift from newer client fields) are silently dropped.  This prevents the
    ``AcademicStructure(**payload)`` constructor from raising ``TypeError``
    when the client sends extra keys.
    """
    if not isinstance(payload, dict):
        return {}
    return {k: v for k, v in payload.items() if k in _ACADEMIC_STRUCTURE_COLUMNS}


def _attach_batch_counts(structures: List[AcademicStructure]) -> None:
    """Patch each structure in-place with precomputed subjects_count/staff_count.

    Avoids the N+1 ``obj.subjects.count()`` / ``len(obj.staff)`` calls that used
    to happen inside ``AcademicStructureListSchema`` / ``AcademicStructureSchema``
    for every row of the list endpoint.  Batches all counts in 2 SQL queries
    regardless of list size.
    """
    if not structures:
        return
    ids = [s.id for s in structures if getattr(s, "id", None) is not None]
    if not ids:
        for s in structures:
            setattr(s, "subjects_count", 0)
            setattr(s, "staff_count", 0)
        return

    try:
        subj_rows = (
            db.session.query(
                Subject.department_id.label("dept_id"),
                func.count(Subject.id).label("cnt"),
            )
            .filter(Subject.department_id.in_(ids))
            .group_by(Subject.department_id)
            .all()
        )
        subj_counts = {}
        for dept_id, cnt in subj_rows:
            if dept_id is None:
                continue
            try:
                subj_counts[int(dept_id)] = int(cnt) if cnt is not None else 0
            except (TypeError, ValueError):
                continue

        staff_counts: Dict[int, int] = {}
        try:
            staff_rows = (
                db.session.query(
                    department_staff.c.department_id.label("dept_id"),
                    func.count(department_staff.c.user_id).label("cnt"),
                )
                .filter(department_staff.c.department_id.in_(ids))
                .group_by(department_staff.c.department_id)
                .all()
            )
            for dept_id, cnt in staff_rows:
                if dept_id is None:
                    continue
                try:
                    staff_counts[int(dept_id)] = int(cnt) if cnt is not None else 0
                except (TypeError, ValueError):
                    continue
        except Exception as staff_err:
            logger.warning("_attach_batch_counts staff query failed: %s", staff_err)
            staff_counts = {}

        for s in structures:
            sid = getattr(s, "id", None)
            try:
                sid_int = int(sid) if sid is not None else None
            except (TypeError, ValueError):
                sid_int = None
            setattr(s, "subjects_count", subj_counts.get(sid_int, 0))
            setattr(s, "staff_count", staff_counts.get(sid_int, 0))
    except Exception as exc:
        logger.warning("_attach_batch_counts fallback to 0s: %s", exc)
        for s in structures:
            setattr(s, "subjects_count", 0)
            setattr(s, "staff_count", 0)


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
            items = q.order_by(
                AcademicStructure.display_order, AcademicStructure.name).all()
            _attach_batch_counts(items)
            return items
        except Exception as exc:
            logger.error("get_all error: %s", exc, exc_info=True)
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
            item = q.first()
            if item is not None:
                _attach_batch_counts([item])
            return item
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
    def _strip_junk(s: str) -> str:
        """Strip leading/trailing punctuation & whitespace from user input."""
        if s is None:
            return ""
        return str(s).strip().lstrip(" :：-—_·•.,;|·").rstrip(" :：-—_·•.,;|·").strip()

    @staticmethod
    def _classify_db_commit_error(exc, name, code, type_label) -> Dict[str, Any]:
        """Best-effort classification of a SQL commit error.

        Returns a detail dict ready for the route handler to return. Handles
        psycopg2/psycopg3 IntegrityErrors (SQLSTATE-aware) as well as whatever
        other drivers surface through string matching. Also scans PostgreSQL
        Diagnostic.message and DETAIL for the actual columns/constraint name,
        because different drivers expose these through different attrs.
        """
        raw_parts: list[str] = []
        for attr in ("orig", "args", "detail", "diag", "message"):
            val = getattr(exc, attr, None)
            if val is None:
                continue
            if isinstance(val, (list, tuple)):
                raw_parts.extend(str(x) for x in val if x)
            else:
                # psycopg2 IntegrityError.diag has .message_detail / .constraint_name
                if attr == "diag":
                    try:
                        if hasattr(val, "constraint_name"):
                            raw_parts.append(str(val.constraint_name or ""))
                        if hasattr(val, "message_detail"):
                            raw_parts.append(str(val.message_detail or ""))
                        if hasattr(val, "message_primary"):
                            raw_parts.append(str(val.message_primary or ""))
                        if hasattr(val, "schema_name"):
                            raw_parts.append(str(val.schema_name or ""))
                        if hasattr(val, "table_name"):
                            raw_parts.append(str(val.table_name or ""))
                        if hasattr(val, "column_name"):
                            raw_parts.append(str(val.column_name or ""))
                    except Exception:  # noqa: BLE001
                        raw_parts.append(str(val))
                else:
                    raw_parts.append(str(val))
        # Exception class name often includes useful info (e.g. UniqueViolation)
        raw_parts.append(exc.__class__.__name__)
        # sqlstate: psycopg2 exc.orig.pgcode; others keep it inline
        pgcode = None
        for attr in ("pgcode", "sqlstate", "sqlcode"):
            cand = getattr(exc, attr, None) or getattr(getattr(exc, "orig", None), attr, None)
            if cand:
                pgcode = str(cand)
                raw_parts.append(pgcode)
                break

        haystack = " \u0001 ".join(raw_parts).lower()

        # ── SQLSTATE 23505 = unique_violation ─────────────────────────────────
        is_unique = (
            pgcode == "23505"
            or "unique_violation" in haystack
            or "unique constraint" in haystack
            or "duplicate key value violates" in haystack
        )
        # ── SQLSTATE 23503 = foreign_key_violation ─────────────────────────────
        is_fk = (
            pgcode == "23503"
            or "foreign_key_violation" in haystack
            or "foreign key constraint" in haystack
            or "violates foreign key" in haystack
        )

        def _has(*toks: str) -> bool:
            return all(tok in haystack for tok in toks)

        def _hasany(*toks: str) -> bool:
            return any(tok in haystack for tok in toks)

        if is_unique:
            if _hasany(
                "uq_departments_tenant_name_type",
                "uq_academic_structures_tenant_name_type",
            ) or _has("name", "structure_type") or _has("name, structure_type") or _has("key (tenant_id, name, structure_type)"):
                return {
                    "error": "duplicate",
                    "field": "name",
                    "message": (
                        f"A {type_label} named '{name}' already exists for this school. "
                        "Pick a different name."
                    ),
                }
            if _hasany(
                "uq_departments_tenant_code",
                "uq_academic_structures_tenant_code",
            ) or _hasany("code"):
                return {
                    "error": "duplicate",
                    "field": "code",
                    "message": (
                        f"Code '{code}' already exists for this school. "
                        "Pick a different code or leave blank to auto-generate."
                    ),
                }
            # Generic unique but unknown which field: assume name+code collision
            return {
                "error": "duplicate",
                "message": (
                    "A conflicting record already exists for this school. "
                    "Pick a different name or code."
                ),
            }

        if is_fk:
            if _hasany("head_id", "head_of_department", "users_id", "users.id") or _hasany("head"):
                return {
                    "error": "validation",
                    "field": "head_id",
                    "message": "Selected Head of Department user no longer exists.",
                }
            if _hasany("parent_id"):
                return {
                    "error": "validation",
                    "field": "parent_id",
                    "message": "Parent department no longer exists.",
                }
            if _hasany("tenant_id", "tenant"):
                return {
                    "error": "tenant_missing",
                    "message": "Tenant context missing — please refresh the page.",
                }
            return {
                "error": "validation",
                "message": "One or more linked records no longer exist.",
            }

        return {
            "error": "integrity",
            "message": (
                "Could not save due to a data constraint. "
                "Check that all fields are valid and try again."
            ),
        }

    @staticmethod
    def create(
        data: Dict[str, Any],
        tenant_id=None,
    ):
        """
        Create a new AcademicStructure record.

        Returns a tuple ``(structure or None, error_detail_dict or None)``::

            None, {"error": "tenant_missing"}
            None, {"error": "duplicate", "field": "code", "message": "..."}
            None, {"error": "duplicate", "field": "name", "message": "..."}
            None, {"error": "integrity", "field": "head_id", "message": "..."}
            struct, None

        Callers should use the detail dict to build user-facing error messages
        instead of returning a generic "could not create" on all failure paths.
        """
        try:
            if tenant_id is None:
                logger.warning("create called without tenant_id")
                return None, {
                    "error": "tenant_missing",
                    "message": "Tenant context missing. Please refresh and try again.",
                }

            payload = _whitelist_payload(data or {})

            # Coerce structure_type string → enum
            st_raw = payload.get(
                "structure_type", AcademicStructureType.DISCIPLINE.value
            )
            if isinstance(st_raw, str):
                try:
                    payload["structure_type"] = AcademicStructureType(st_raw)
                except ValueError:
                    payload["structure_type"] = AcademicStructureType.DISCIPLINE
            elif st_raw is None:
                payload["structure_type"] = AcademicStructureType.DISCIPLINE
            resolved_type = payload["structure_type"]
            type_label = (
                resolved_type.value
                if isinstance(resolved_type, AcademicStructureType)
                else str(resolved_type)
            )

            # Normalize head_id / parent_id None (for empty string / 0 passed)
            for _k in ("head_id", "parent_id"):
                if payload.get(_k) in (None, "", 0, "0", "none"):
                    payload[_k] = None

            # Validate head_id refers to a real User FK (users.id, NOT teacher.id)
            head_id = payload.get("head_id")
            if head_id is not None:
                try:
                    head_int = int(head_id)
                except (TypeError, ValueError):
                    return None, {
                        "error": "validation",
                        "field": "head_id",
                        "message": "Head of Department must be a valid user.",
                    }
                head_user = db.session.get(User, head_int)
                if head_user is None:
                    return None, {
                        "error": "validation",
                        "field": "head_id",
                        "message": "Selected Head of Department user no longer exists.",
                    }
                payload["head_id"] = head_int

            # Basic field validation + strip junk punctuation that users accidentally
            # paste (e.g. the leading colon ":Primary" seen in bug reports).
            raw_name = AcademicStructureService._strip_junk(payload.get("name") or "")
            raw_code = AcademicStructureService._strip_junk(payload.get("code") or "")
            if len(raw_name) < 2:
                return None, {
                    "error": "validation",
                    "field": "name",
                    "message": "Name must be at least 2 characters.",
                }
            name = raw_name
            code = raw_code
            if not code:
                payload["code"] = AcademicStructureService._auto_code_for_name(
                    name, resolved_type, tenant_id
                )
                code = payload["code"]
            elif len(code) > 20:
                return None, {
                    "error": "validation",
                    "field": "code",
                    "message": "Code must be 20 characters or fewer.",
                }
            payload["name"] = name
            payload["code"] = code.upper()

            # Uniqueness check: (tenant, code)
            if AcademicStructureService.get_by_code(
                payload["code"],
                tenant_id=tenant_id,
            ):
                return None, {
                    "error": "duplicate",
                    "field": "code",
                    "message": (
                        f"Code '{payload['code']}' already exists for this school. "
                        "Pick a different code or leave blank to auto-generate."
                    ),
                }

            # Uniqueness check: (tenant, name, structure_type)
            dup_name_q = AcademicStructure.query.filter(
                AcademicStructure.tenant_id == tenant_id,
                db.func.lower(AcademicStructure.name) == name.lower(),
                AcademicStructure.structure_type == resolved_type,
            )
            if dup_name_q.first():
                existing = dup_name_q.first()
                return None, {
                    "error": "duplicate",
                    "field": "name",
                    "message": (
                        f"A {type_label} named '{name}' already exists for this school "
                        f"(existing code: {getattr(existing, 'code', 'N/A')})."
                    ),
                }

            payload.setdefault("tenant_id", tenant_id)
            payload.setdefault("is_active", True)
            if payload.get("display_order") in (None, ""):
                payload["display_order"] = AcademicStructureService._next_display_order(
                    tenant_id, resolved_type
                )

            struct = AcademicStructure(**payload)
            db.session.add(struct)
            try:
                db.session.commit()
            except Exception as commit_err:
                db.session.rollback()
                detail = AcademicStructureService._classify_db_commit_error(
                    commit_err, name=name, code=payload["code"], type_label=type_label
                )
                logger.warning(
                    "create commit classified: %s | orig=%r | pgcode=%r",
                    detail,
                    getattr(commit_err, "orig", commit_err),
                    getattr(getattr(commit_err, "orig", None), "pgcode", None),
                )
                return None, detail
            _attach_batch_counts([struct])
            return struct, None
        except SQLAlchemyError as exc:
            db.session.rollback()
            try:
                fallback = AcademicStructureService._classify_db_commit_error(
                    exc,
                    name=AcademicStructureService._strip_junk(payload.get("name") if "payload" in locals() else ""),
                    code=(payload["code"] if "payload" in locals() and payload.get("code") else ""),
                    type_label=(
                        resolved_type.value
                        if "resolved_type" in locals() and isinstance(resolved_type, AcademicStructureType)
                        else "Structure"
                    ),
                )
            except Exception:  # noqa: BLE001
                fallback = {
                    "error": "integrity",
                    "message": (
                        "Could not create due to a database error. "
                        "Check for duplicates and try again."
                    ),
                }
            logger.error("create sqlalchemy error: %s", exc, exc_info=True)
            return None, fallback
        except TypeError as exc:
            db.session.rollback()
            logger.error("create TypeError (payload mismatch): %s", exc, exc_info=True)
            return None, {
                "error": "validation",
                "message": "Invalid fields provided: " + str(exc),
            }

    @staticmethod
    def _auto_code_for_name(
        name: str,
        structure_type: "AcademicStructureType",
        tenant_id,
    ) -> str:
        """Generate a deterministic collision-safe code for a new structure."""
        alpha = "".join(c for c in name.upper() if c.isalpha()) or "X"
        base = alpha[:4].ljust(3, "X")
        type_prefix = {
            AcademicStructureType.DISCIPLINE: "DIS",
            AcademicStructureType.CYCLE: "CYC",
            AcademicStructureType.OPERATIONAL: "OPS",
        }.get(structure_type, "STR")
        prefix = f"{type_prefix}-{base}"
        # Count existing codes matching this tenant + prefix for uniqueness suffix
        existing = (
            AcademicStructure.query.filter(
                AcademicStructure.tenant_id == tenant_id,
                AcademicStructure.code.ilike(f"{prefix}%"),
            ).count()
        )
        suffix = str(existing + 1).zfill(3)
        return f"{prefix}{suffix}"

    @staticmethod
    def _next_display_order(tenant_id, structure_type) -> int:
        max_order = (
            db.session.query(func.max(AcademicStructure.display_order))
            .filter(
                AcademicStructure.tenant_id == tenant_id,
                AcademicStructure.structure_type == structure_type,
            )
            .scalar()
        ) or 0
        return int(max_order) + 10

    @staticmethod
    def update(
        structure_id: int,
        data: Dict[str, Any],
        tenant_id=None,
    ) -> Optional[AcademicStructure]:
        try:
            struct = AcademicStructureService.get_by_id(
                structure_id, tenant_id=tenant_id
            )
            if not struct:
                return None

            payload = _whitelist_payload(data or {})

            # Coerce structure_type if present
            if "structure_type" in payload and isinstance(
                payload["structure_type"], str
            ):
                try:
                    payload["structure_type"] = AcademicStructureType(
                        payload["structure_type"]
                    )
                except ValueError:
                    del payload["structure_type"]

            # Normalize head_id / parent_id empty → None
            for _k in ("head_id", "parent_id"):
                if _k in payload and payload.get(_k) in (None, "", 0, "0", "none"):
                    payload[_k] = None

            # Validate head_id references users.id (NOT teacher.id)
            if "head_id" in payload and payload.get("head_id") is not None:
                head_user = db.session.get(User, int(payload["head_id"]))
                if head_user is None:
                    logger.warning(
                        "update(%s): head_id=%s does not exist in users.id",
                        structure_id,
                        payload["head_id"],
                    )
                    return None
                payload["head_id"] = int(payload["head_id"])

            # Code uniqueness (if changing)
            new_code = payload.get("code")
            if new_code and str(new_code) != str(struct.code):
                existing = AcademicStructureService.get_by_code(
                    new_code, tenant_id=tenant_id
                )
                if existing and existing.id != structure_id:
                    logger.warning("Code '%s' already taken", new_code)
                    return None

            for key, value in payload.items():
                setattr(struct, key, value)

            db.session.commit()
            _attach_batch_counts([struct])
            return struct
        except SQLAlchemyError as exc:
            db.session.rollback()
            logger.error("update(%s) error: %s", structure_id, exc, exc_info=True)
            return None
        except TypeError as exc:
            db.session.rollback()
            logger.error(
                "update(%s) TypeError (payload mismatch): %s",
                structure_id,
                exc,
                exc_info=True,
            )
            return None

    @staticmethod
    def delete(structure_id: int, tenant_id=None) -> bool:
        try:
            struct = AcademicStructureService.get_by_id(
                structure_id, tenant_id=tenant_id
            )
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
            from app.models.user import User

            struct = AcademicStructureService.get_by_id(
                structure_id, tenant_id=tenant_id
            )
            user = db.session.get(User, int(user_id)) if user_id else None
            if not struct or not user:
                return False

            existing = db.session.execute(
                department_staff.select().where(
                    (department_staff.c.department_id == structure_id)
                    & (department_staff.c.user_id == int(user_id))
                )
            ).first()
            if existing:
                return True

            db.session.execute(
                department_staff.insert().values(
                    department_id=structure_id,
                    user_id=int(user_id),
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
        dept_bin = AcademicStructure.binary_prefix_for_name(dept_name)

        # Base without serial
        base = f"{prefix}-{dept_bin}"

        # Sequential suffix: count existing codes starting with base in this tenant
        q = Subject.query.filter(Subject.code.like(f"{base}-%"))
        if tenant_id:
            q = q.filter(Subject.tenant_id == tenant_id)
        count = q.count()
        serial = str(count + 1).zfill(3)

        return f"{base}-{serial}"


# ── Backward-compat alias ──────────────────────────────────────────────────────
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
        struct, detail = AcademicStructureService.create(
            payload, tenant_id=tenant_id
        )
        # Backward compat shim: return only the struct on success.
        # Callers that want error detail should call AcademicStructureService.create directly.
        return struct

    @staticmethod
    def update_department(department_id, data, tenant_id=None):
        return AcademicStructureService.update(department_id, data, tenant_id=tenant_id)

    @staticmethod
    def delete_department(department_id, tenant_id=None):
        return AcademicStructureService.delete(department_id, tenant_id=tenant_id)

    @staticmethod
    def add_staff_to_department(department_id, user_id, role=None, tenant_id=None):
        return AcademicStructureService.add_staff(
            department_id, user_id, role, tenant_id
        )
