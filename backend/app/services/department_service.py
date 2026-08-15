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
from uuid import UUID

from sqlalchemy import func
from sqlalchemy.exc import SQLAlchemyError

from app.extensions import db
from app.models.department import (AcademicStructure, AcademicStructureType,
                                   Department, canonicalize_structure_type,
                                   department_staff)
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


def _safe_uuid(val, *, field: str):
    """Return a UUID instance or ``None`` for null-ish values.

    Raises ``ValueError`` with a user-facing message when *val* looks
    intentional (non-empty) but is not a valid UUID literal.
    """
    if val is None:
        return None
    if isinstance(val, UUID):
        return val
    s = str(val).strip()
    if not s or s.lower() in {"none", "null", "undefined", "0", "false", "nan", "[]", "{}"}:
        return None
    try:
        return UUID(s)
    except (ValueError, AttributeError):
        raise ValueError(
            f"{field} value '{val}' is not a valid id. "
            f"Refresh the page and select {field} from the menu again."
        )


def _safe_int(val, *, field: str, default=None, nullable: bool = True):
    """Return an int or ``None``/``default`` for null-ish values.

    Raises ``ValueError`` with a user-facing message when *val* is non-empty
    and cannot be coerced to an integer.
    """
    if val is None:
        return None if nullable else default
    if isinstance(val, bool):
        return 1 if val else 0
    if isinstance(val, int):
        return val
    s = str(val).strip()
    if not s or s.lower() in {"none", "null", "undefined", "nan", "[]", "{}"}:
        return None if nullable else default
    # Allow numeric strings that look like ints (or floats ending in .0)
    try:
        f = float(s)
    except ValueError:
        raise ValueError(
            f"{field} value '{val}' is not a valid number. "
            f"Clear the field and try again, or refresh the page."
        )
    i = int(round(f))
    if abs(f - i) > 1e-6:
        raise ValueError(f"{field} must be a whole number (got '{val}').")
    return i


def _safe_bool(val, *, field: str):
    """Strict but tolerant boolean coercion.

    Accepts Python bools / ints and the usual JS/JSON string sentinels
    ("true"/"false"/"on"/"off"/"yes"/"no"/1/0).  Returns ``None`` if the
    value is empty/null-ish so the caller can apply its own default.
    """
    if val is None:
        return None
    if isinstance(val, bool):
        return val
    if isinstance(val, (int, float)):
        return bool(val)
    s = str(val).strip().lower()
    if not s or s in {"none", "null", "undefined", "nan"}:
        return None
    if s in {"true", "1", "yes", "y", "on", "active", "enabled"}:
        return True
    if s in {"false", "0", "no", "n", "off", "inactive", "disabled"}:
        return False
    raise ValueError(
        f"{field} value '{val}' is not valid. Use 'true'/'false' or 'Active'/'Inactive'."
    )


def _coerce_payload(payload: Dict[str, Any]) -> Dict[str, Any]:
    """Coerce each AcademicStructure column to its SQLAlchemy column type.

    Raises :class:`ValueError` with a user-facing message for any un-coercible
    value; the :meth:`AcademicStructureService.create` wrapper catches these
    and returns a ``validation`` detail dict instead of letting a 22P02
    ``invalid_text_representation`` bubble all the way up from PostgreSQL.
    """
    out: Dict[str, Any] = dict(payload)

    # UUID: tenant_id
    if "tenant_id" in out:
        out["tenant_id"] = _safe_uuid(out["tenant_id"], field="Tenant")

    # Integers: head_id, parent_id, display_order, allocated_budget (cast-as-int), id
    for fld in ("head_id", "parent_id", "display_order", "id"):
        if fld in out:
            out[fld] = _safe_int(out[fld], field=fld.replace("_", " ").title())
    if "allocated_budget" in out:
        if out["allocated_budget"] is None or (
            isinstance(out["allocated_budget"], str) and not out["allocated_budget"].strip()
        ):
            out["allocated_budget"] = None
        else:
            try:
                v = float(out["allocated_budget"])
            except (ValueError, TypeError):
                raise ValueError(
                    f"Allocated Budget value '{out['allocated_budget']}' is not valid. "
                    "Clear the field or enter a numeric amount."
                )
            out["allocated_budget"] = v

    # Boolean: is_active
    if "is_active" in out:
        b = _safe_bool(out["is_active"], field="Status (is_active)")
        if b is None:
            del out["is_active"]  # let .create apply its own default later
        else:
            out["is_active"] = b

    # Enum: structure_type
    if "structure_type" in out:
        raw = out["structure_type"]
        if raw is None or (isinstance(raw, str) and not raw.strip()):
            del out["structure_type"]
        else:
            try:
                out["structure_type"] = canonicalize_structure_type(raw, default=AcademicStructureType.DISCIPLINE)
            except ValueError as exc:
                raise ValueError(
                    f"Structure Type: {exc}. Valid values: discipline / cycle / operational (or aliases accepted). Try a different spelling, refresh the dropdown if it is stale, or leave it blank to default to Discipline."
                ) from exc

    # Strings: strip junk punctuation (name/code got _strip_junk already; here
    # we just ensure empty literals map to None for nullable description/short_name)
    for fld in ("description", "short_name", "email", "phone", "location"):
        if fld in out:
            if out[fld] is None:
                continue
            s = str(out[fld]).strip()
            out[fld] = s or None

    return out


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

        Scans both the SQLAlchemy wrapper ``exc`` and its driver ``exc.orig``
        (since psycopg exposes ``pgcode`` and ``diag`` on the driver exception
        only, not on the SQLAlchemy IntegrityError wrapper).
        """
        raw_parts: list[str] = []
        pgcode: str | None = None
        constraint_name: str | None = None
        message_detail: str | None = None
        message_primary: str | None = None
        column_name: str | None = None
        table_name: str | None = None
        schema_name: str | None = None

        # ── Attribute walk: SQLAlchemy wrapper + driver orig ───────────────
        for root in (exc, getattr(exc, "orig", None)):
            if root is None:
                continue
            for attr in ("orig", "args", "detail", "message", "__class__"):
                if attr == "__class__":
                    try:
                        raw_parts.append(root.__class__.__name__)
                    except Exception:  # noqa: BLE001
                        pass
                    continue
                val = getattr(root, attr, None)
                if val is None:
                    continue
                if isinstance(val, (list, tuple)):
                    raw_parts.extend(str(x) for x in val if x)
                else:
                    raw_parts.append(str(val))
            # Diagnostic struct (psycopg2 IntegrityError.diag or psycopg3 conn.info)
            diag = getattr(root, "diag", None)
            if diag is not None:
                try:
                    for d_attr in (
                        "constraint_name",
                        "message_detail",
                        "message_primary",
                        "schema_name",
                        "table_name",
                        "column_name",
                        "message_hint",
                        "sqlstate",
                    ):
                        v = getattr(diag, d_attr, None)
                        if not v:
                            continue
                        sv = str(v)
                        raw_parts.append(sv)
                        if d_attr == "constraint_name":
                            constraint_name = sv
                        elif d_attr == "message_detail":
                            message_detail = sv
                        elif d_attr == "message_primary":
                            message_primary = sv
                        elif d_attr == "schema_name":
                            schema_name = sv
                        elif d_attr == "table_name":
                            table_name = sv
                        elif d_attr == "column_name":
                            column_name = sv
                        elif d_attr == "sqlstate":
                            pgcode = sv
                except Exception:  # noqa: BLE001
                    raw_parts.append(str(diag))
            # pgcode / sqlstate shortcuts
            for code_attr in ("pgcode", "sqlstate", "sqlcode"):
                v = getattr(root, code_attr, None)
                if v:
                    pgcode = str(v)
                    raw_parts.append(pgcode)

        # Exception class name as a final signal
        raw_parts.append(exc.__class__.__name__)

        # ── Last-ditch regex scan: look for SQLSTATE anywhere in text ──────
        import re as _re

        joined = " \u0001 ".join(raw_parts)
        if not pgcode:
            m = _re.search(r"sqlstate[^\w]{0,3}([0-9A-Za-z]{5})", joined, re.IGNORECASE)
            if not m:
                m = _re.search(r"\b([0-9A-Z]{5})\b.*(?:constraint|violation)", joined, re.IGNORECASE)
            if m:
                pgcode = m.group(1).upper()
                raw_parts.append(pgcode)

        haystack = joined.lower()

        # ── Integrity category (SQLSTATE 23) resolution ─────────────────────
        code_category: str | None = None
        pgcode_cat = (pgcode or "")[:2]
        if pgcode_cat == "23":
            code_category = {
                "23000": "integrity",
                "23001": "restrict",
                "23502": "not_null",
                "23503": "foreign_key",
                "23505": "unique",
                "23514": "check",
                "23P01": "exclusion",
            }.get(pgcode or "", "integrity")
        elif pgcode_cat == "22":
            # SQLSTATE 22 — Data Exception (subtypes: invalid repr, string data
            # right truncation, numeric value out of range, null value not
            # allowed, invalid datetime format, division by zero, etc.)
            code_category = {
                "22000": "data_exception",
                "22001": "string_truncation",
                "22003": "numeric_out_of_range",
                "22004": "null_no_data",
                "22005": "assignment_error",
                "22007": "invalid_datetime",
                "22008": "datetime_overflow",
                "2201G": "invalid_argument_for_logarithm",
                "2201H": "invalid_argument_for_power",
                "2201W": "invalid_row_count_in_limit_clause",
                "22021": "character_not_in_repertoire",
                "22023": "invalid_parameter_value",
                "22025": "invalid_escape_character",
                "22026": "string_data_length_mismatch",
                "2202E": "array_subscript_error",
                "22P01": "floating_point_exception",
                "22P02": "invalid_text_representation",
                "22P03": "invalid_binary_representation",
                "22P04": "bad_copy_file_format",
                "22P05": "untranslatable_character",
                "22P06": "nonstandard_use_of_escape_character",
            }.get(pgcode or "", "data_exception")
        else:
            # Fallback string heuristics for non-pgcode drivers
            if any(s in haystack for s in ("unique_violation", "unique constraint", "duplicate key value violates")):
                code_category = "unique"
                pgcode = pgcode or "23505"
            elif any(s in haystack for s in ("foreign_key_violation", "foreign key constraint", "violates foreign key")):
                code_category = "foreign_key"
                pgcode = pgcode or "23503"
            elif any(s in haystack for s in ("not_null_violation", "null value in column", "cannot be null")):
                code_category = "not_null"
                pgcode = pgcode or "23502"
            elif any(s in haystack for s in ("check_violation", "check constraint", "violates check constraint")):
                code_category = "check"
                pgcode = pgcode or "23514"
            elif any(s in haystack for s in ("exclusion_violation", "exclusion constraint")):
                code_category = "exclusion"
                pgcode = pgcode or "23P01"
            elif any(s in haystack for s in ("invalid input syntax", "invalid value", "invalid text representation", "invalid representation for type")):
                code_category = "invalid_text_representation"
                pgcode = pgcode or "22P02"
            elif any(s in haystack for s in ("value too long", "right truncation", "too long for type", "varying")):
                code_category = "string_truncation"
                pgcode = pgcode or "22001"
            elif any(s in haystack for s in ("out of range", "out of range for type", "numeric overflow")):
                code_category = "numeric_out_of_range"
                pgcode = pgcode or "22003"
            elif any(s in haystack for s in ("invalid timestamp", "invalid date", "invalid time")):
                code_category = "invalid_datetime"
                pgcode = pgcode or "22007"

        def _has(*toks: str) -> bool:
            return all(tok in haystack for tok in toks)

        def _hasany(*toks: str) -> bool:
            return any(tok in haystack for tok in toks)

        def _extract_column_from_message(hay: str) -> str | None:
            patterns = [
                r"column[^\w]{1,5}(\w+)[^\w]{1,10}of relation",
                r"column[^\w]{1,5}(\w+)[^\w]{1,10}contains null values",
                r"null value in column[^\w]{1,5}(\w+)",
                r"new row for relation[^\w]{1,5}\w+[^\w]{1,5}violates check constraint[^\w]{1,5}(\w+)",
                r"violates not-null constraint[^\w]{1,5}(\w+)",
            ]
            for pat in patterns:
                m = _re.search(pat, hay, re.IGNORECASE)
                if m:
                    return m.group(1)
            # Column name from diagnostic struct beats regex
            return column_name or None

        # ── 23505 UNIQUE ────────────────────────────────────────────────────
        if code_category == "unique":
            field = None
            detail_msg = None
            if constraint_name:
                if _hasany(
                    "uq_departments_tenant_name_type",
                    "uq_academic_structures_tenant_name_type",
                ) or "tenant_name_type" in constraint_name.lower():
                    field = "name"
                    detail_msg = (
                        f"A {type_label} named '{name}' already exists for this school. "
                        "Pick a different name."
                    )
                elif _hasany(
                    "uq_departments_tenant_code",
                    "uq_academic_structures_tenant_code",
                ) or "tenant_code" in constraint_name.lower():
                    field = "code"
                    detail_msg = (
                        f"Code '{code}' already exists for this school. "
                        "Pick a different code or leave blank to auto-generate."
                    )
            # Fallback: detail text / column scans
            if detail_msg is None:
                combined = (message_detail or "") + " " + haystack
                if _has("name") and (_has("structure_type") or _has("tenant_id")):
                    field = "name"
                    detail_msg = (
                        f"A {type_label} named '{name}' already exists for this school. "
                        "Pick a different name."
                    )
                elif _hasany("code"):
                    field = "code"
                    detail_msg = (
                        f"Code '{code}' already exists for this school. "
                        "Pick a different code or leave blank to auto-generate."
                    )
            if detail_msg is None:
                detail_msg = (
                    "A conflicting record already exists for this school. "
                    "Pick a different name or code."
                )
            out: Dict[str, Any] = {"error": "duplicate", "message": detail_msg}
            if field:
                out["field"] = field
            if pgcode:
                out["pgcode"] = pgcode
            if constraint_name:
                out["constraint"] = constraint_name
            return out

        # ── 23503 FOREIGN KEY ──────────────────────────────────────────────
        if code_category == "foreign_key":
            field = None
            msg = "One or more linked records no longer exist."
            combined = (constraint_name or "") + " " + (message_detail or "") + " " + haystack
            if _hasany("head_id", "head_of_department", "users_id", "users.id") or _hasany("head"):
                field = "head_id"
                msg = "Selected Head of Department user no longer exists."
            elif _hasany("parent_id"):
                field = "parent_id"
                msg = "Parent department no longer exists."
            elif _hasany("tenant_id", "tenant"):
                field = "tenant_id"
                out = {"error": "tenant_missing", "message": "Tenant context missing — please refresh the page."}
                if pgcode:
                    out["pgcode"] = pgcode
                if constraint_name:
                    out["constraint"] = constraint_name
                return out
            out = {"error": "validation", "message": msg}
            if field:
                out["field"] = field
            if pgcode:
                out["pgcode"] = pgcode
            if constraint_name:
                out["constraint"] = constraint_name
            return out

        # ── 23502 NOT NULL ──────────────────────────────────────────────────
        if code_category == "not_null":
            col = _extract_column_from_message(haystack) or column_name
            msg_map = {
                "name": "Name is required and cannot be empty.",
                "code": "Code is required and cannot be empty.",
                "structure_type": "Department structure type is invalid — please refresh.",
                "tenant_id": "Tenant context missing — please refresh the page.",
                "is_active": "Status must be Active or Inactive.",
                "display_order": "Sort order value could not be computed. Please retry.",
                "head_id": "Invalid Head of Department selection.",
                "parent_id": "Invalid Parent department.",
            }
            if col and col in msg_map:
                out = {"error": "validation", "field": col, "message": msg_map[col]}
                if pgcode:
                    out["pgcode"] = pgcode
                if constraint_name:
                    out["constraint"] = constraint_name
                return out
            message = (
                "A required field was empty. "
                + (f" Missing field: {col}." if col else " Check Name, Code, and Status and try again.")
            )
            out = {"error": "validation", "message": message}
            if col:
                out["field"] = col
            if pgcode:
                out["pgcode"] = pgcode
            if constraint_name:
                out["constraint"] = constraint_name
            return out

        # ── 23514 CHECK / 23001 RESTRICT / 23P01 EXCLUSION / 23000 INTEGRITY ─
        if code_category in {"check", "restrict", "exclusion", "integrity"}:
            col = _extract_column_from_message(haystack) or column_name
            human_cat = {"check": "check", "restrict": "restrict", "exclusion": "exclusion", "integrity": "integrity"}.get(
                code_category or "integrity", "integrity"
            )
            # If we can tell the check is on a known enum/column, field-specify it
            field = None
            suggestion = "Check that all fields contain valid values and try again."
            if constraint_name:
                cn = constraint_name.lower()
                if "structure_type" in cn or "structure" in cn:
                    field = "structure_type"
                    suggestion = "Select a valid Type (Cycle / Discipline / Operational) and try again."
                elif "is_active" in cn:
                    field = "status"
                    suggestion = "Status must be Active or Inactive."
                elif "credit" in cn or "display" in cn or "order" in cn:
                    field = "display_order"
                    suggestion = "Sort order value is invalid — please clear and retry."
                elif "code" in cn:
                    field = "code"
                    suggestion = "Code is in an invalid format. Leave it blank to auto-generate."
                elif "name" in cn:
                    field = "name"
                    suggestion = "Name is in an invalid format — remove any special characters."
            message = (
                f"Could not save — the server rejected this entry ({human_cat} constraint"
                + (f", {constraint_name}" if constraint_name else "")
                + (f", column {col}" if col else "")
                + "). "
                + suggestion
            )
            out = {"error": "integrity", "message": message, "suggestion": suggestion}
            if field:
                out["field"] = field
            if pgcode:
                out["pgcode"] = pgcode
            if constraint_name:
                out["constraint"] = constraint_name
            if col:
                out["column"] = col
            return out

        # ── Class 22 — DATA EXCEPTION branches ───────────────────────────────────
        if pgcode_cat == "22" or code_category in {
            "data_exception",
            "invalid_text_representation",
            "invalid_binary_representation",
            "bad_copy_file_format",
            "untranslatable_character",
            "nonstandard_use_of_escape_character",
            "character_not_in_repertoire",
            "string_truncation",
            "numeric_out_of_range",
            "null_no_data",
            "assignment_error",
            "invalid_datetime",
            "datetime_overflow",
            "invalid_parameter_value",
            "invalid_escape_character",
            "string_data_length_mismatch",
            "invalid_argument_for_logarithm",
            "invalid_argument_for_power",
            "invalid_row_count_in_limit_clause",
            "array_subscript_error",
            "floating_point_exception",
        }:
            col = _extract_column_from_message(haystack) or column_name
            field = col or None
            suggestion = "Clear the field and enter a valid value, or refresh the page to reload options."
            category = code_category or (pgcode or "data_exception")

            # ── ENUM-specific short-circuit: 22P02 invalid input value for enum
            #    academic_structure_type: "X"  → match enum name + value
            import re as _re_inner
            enum_matches: list[tuple[str, str]] = []
            combined_text = (
                (message_detail or "")
                + "\n"
                + (message_primary or "")
                + "\n"
                + joined
            )
            for _m in _re_inner.finditer(
                r"invalid input value for enum[^\w]{0,3}[\"']{0,1}(\w+)[\"']{0,1}[^\w]{0,3}[:]{0,1}[^\w\"']{0,3}[\"']([^\"']+)[\"']",
                combined_text,
                _re_inner.IGNORECASE,
            ):
                enum_matches.append((_m.group(1), _m.group(2)))
            if not enum_matches:
                for _m in _re_inner.finditer(
                    r"invalid input syntax for enum[^\w]{0,3}[\"']{0,1}(\w+)[\"']{0,1}[^\w]{0,3}[:]{0,1}[^\w\"']{0,3}[\"']{0,1}([^\"',\s]+)",
                    combined_text,
                    _re_inner.IGNORECASE,
                ):
                    enum_matches.append((_m.group(1), _m.group(2)))
            if enum_matches:
                enum_name, enum_value = enum_matches[0]
                if "academic_structure_type" in enum_name.lower() or "academic_structure_type" in (constraint_name or "").lower():
                    allowed = ", ".join(e.value for e in AcademicStructureType)
                    suggestion = (
                        f"Department Type value '{enum_value}' is not yet known by the "
                        f"Postgres enum ({enum_name}). Allowed: {allowed}. Refresh the page, "
                        "select from the dropdown (Cycle / Discipline / Operational), or leave "
                        "the field blank and it will default to Discipline."
                    )
                    out = {
                        "error": "validation",
                        "field": "structure_type",
                        "message": (
                            f"Department Type value '{enum_value}' is not currently "
                            f"registered in the server type catalog. Server currently accepts: "
                            f"{allowed}. Select one of those options or leave the field empty."
                        ),
                        "suggestion": suggestion,
                        "pgcode": pgcode,
                        "enum_type_name": enum_name,
                        "offending_value": enum_value,
                    }
                    if constraint_name:
                        out["constraint"] = constraint_name
                    return out
                # Fallback for any other enum in this schema
                suggestion = (
                    f"Value '{enum_value}' is invalid for field type ({enum_name}). "
                    "Clear the field and select a valid option from the dropdown."
                )
                out = {
                    "error": "validation",
                    "message": (
                        f"Invalid value '{enum_value}' provided for type '{enum_name}'."
                    ),
                    "suggestion": suggestion,
                    "pgcode": pgcode,
                    "enum_type_name": enum_name,
                    "offending_value": enum_value,
                }
                if col:
                    out["field"] = col
                return out

            # Map data-type detection: UUID / integer / enum / date by column_name or message
            looks_like_uuid = any(s in haystack for s in ("type\"uuid\"", "type 'uuid'", "invalid input syntax for type uuid"))
            looks_like_int  = any(s in haystack for s in ("invalid input syntax for type integer", "invalid input syntax for integer", "type integer"))
            looks_like_enum = any(s in haystack for s in ("invalid input value for enum", "type academic_structure_type", "enum academic_structure_type", "invalid input syntax for enum"))
            looks_like_bool = any(s in haystack for s in ("type boolean", "invalid input syntax for type boolean"))
            looks_like_date = any(s in haystack for s in ("type timestamp", "type date", "invalid input syntax for type date", "invalid timestamp", "invalid datetime"))
            looks_like_varchar = category == "string_truncation" or any(s in haystack for s in ("varying", "varying("))

            # Best-effort field match to a known column
            if field is None:
                if looks_like_uuid or (col and "tenant" in col.lower()):
                    field = "tenant_id"
                    suggestion = "Tenant context is invalid — refresh the page and try again."
                elif looks_like_enum or "structure_type" in (constraint_name or "").lower():
                    field = "structure_type"
                    suggestion = "Department Type is invalid. Select Cycle / Discipline / Operational and try again."
                elif looks_like_bool or "is_active" in (constraint_name or "").lower():
                    field = "is_active"
                    suggestion = "Status is invalid. Choose Active or Inactive and try again."
                elif looks_like_date:
                    field = "created_at"
                    suggestion = "Date / timestamp value is invalid — clear and retry."
                elif looks_like_int or (col and col.lower() in {"head_id", "parent_id", "display_order", "id"}):
                    if col and col.lower() in {"head_id", "parent_id", "display_order", "id"}:
                        field = col.lower()
                        suggestion = f"{field.replace('_', ' ').title()} value is invalid. Clear the field or select from the dropdown."
                elif looks_like_varchar or (col and col.lower() in {"name", "code", "description", "short_name"}):
                    if col and col.lower() in {"name", "code", "description", "short_name"}:
                        field = col.lower()
                        if field == "name":
                            suggestion = "Name is too long or in an invalid format."
                        elif field == "code":
                            suggestion = "Code is too long or in an invalid format. Leave it blank to auto-generate."
                        elif "string_truncation" == category:
                            suggestion = "One of the text fields (Name, Code, Description) value is too long."
            # Build user message
            user_issue_type = {
                "invalid_text_representation": "in an invalid format",
                "invalid_binary_representation": "in an invalid binary format",
                "bad_copy_file_format": "in an unrecognized format",
                "untranslatable_character": "contains characters we can't store",
                "nonstandard_use_of_escape_character": "contains an invalid escape sequence",
                "character_not_in_repertoire": "contains unsupported characters",
                "string_truncation": "was too long and got truncated",
                "numeric_out_of_range": "number is outside the allowed range",
                "null_no_data": "was unexpectedly empty",
                "assignment_error": "couldn't be applied to this field",
                "invalid_datetime": "date / timestamp is invalid",
                "datetime_overflow": "date/time is out of range",
                "invalid_parameter_value": "contains an invalid value",
                "invalid_escape_character": "contains an invalid escape character",
                "string_data_length_mismatch": "length doesn't match the allowed length",
                "invalid_argument_for_logarithm": "invalid",
                "invalid_argument_for_power": "invalid",
                "invalid_row_count_in_limit_clause": "invalid",
                "array_subscript_error": "invalid array reference",
                "floating_point_exception": "caused a floating-point error",
                "data_exception": "contains an invalid value",
            }.get(category, "contains an invalid value")

            field_label = {
                "tenant_id": "Tenant context",
                "structure_type": "Department Type",
                "is_active": "Status",
                "head_id": "Head of Department",
                "parent_id": "Parent Department",
                "display_order": "Sort order",
                "name": "Name",
                "code": "Code",
                "description": "Description",
            }.get(field or "?", "Field")

            if col and not field:
                field = col

            message = (
                f"{field_label} {user_issue_type}"
                + (f" (column: {col})" if col and field != col else "")
                + (f". {suggestion}" if suggestion else ".")
            )
            out = {"error": "validation", "message": message}
            if suggestion:
                out["suggestion"] = suggestion
            if field:
                out["field"] = field
            if pgcode:
                out["pgcode"] = pgcode
            if col:
                out["column"] = col
            if constraint_name:
                out["constraint"] = constraint_name
            return out

        # ── Catch-all: we still attach pgcode / constraint so support can trace it
        message = (
            "Could not save due to a data constraint. "
            "Check that all fields are valid and try again."
        )
        out = {"error": "integrity", "message": message}
        if pgcode:
            out["pgcode"] = pgcode
        if constraint_name:
            out["constraint"] = constraint_name
        if column_name:
            out["column"] = column_name
        if message_detail:
            out["db_detail"] = message_detail[:200]
        return out

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
            None, {"error": "validation", "field": "head_id", "message": "..."}
            None, {"error": "integrity", "pgcode": "23514", "constraint": "...", ...}
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

            # Whitelist + type-coerce EVERY value BEFORE any validation or DB
            # access.  The whitelist strips extraneous keys; the coerce step
            # converts JSON string sentinels ("None"/"undefined"/empty UUIDs,
            # bool strings like "Active", structure_type typos, etc.) into the
            # Python types SQLAlchemy and PostgreSQL expect.  Without this
            # step, Postgres throws SQLSTATE 22P02 "invalid_text_representation"
            # for the exact values we handle here — and that 22P02 would
            # otherwise surface as a generic "integrity" error to the user.
            payload = _coerce_payload(_whitelist_payload(data or {}))
        except ValueError as exc:
            # _coerce_payload raises ValueError(msg) with a human message already.
            # Extract a best-effort field name by scanning prefixes.
            msg = str(exc) or "A value could not be read."
            field = None
            for fld in (
                "tenant_id", "tenant", "name", "code", "structure_type", "type",
                "head_id", "head", "parent_id", "parent", "display_order", "sort",
                "is_active", "status", "allocated_budget", "budget",
            ):
                if fld in msg.lower():
                    # Normalise a couple of friendly aliases to canonical field names
                    field = {
                        "type": "structure_type",
                        "sort": "display_order",
                        "budget": "allocated_budget",
                        "status": "is_active",
                        "head": "head_id",
                        "parent": "parent_id",
                        "tenant": "tenant_id",
                    }.get(fld, fld)
                    break
            logger.warning("create payload coerce error: %s", exc)
            detail = {"error": "validation", "message": msg}
            if field:
                detail["field"] = field
            return None, detail
        try:

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

            payload.setdefault("is_active", True)
            if payload.get("display_order") in (None, ""):
                payload["display_order"] = AcademicStructureService._next_display_order(
                    tenant_id, resolved_type
                )
            # SECURITY/FIX: tenant_id MUST ALWAYS come from the @tenant_required
            # session g.tenant_id passed in as function parameter. Never trust the
            # JSON body's tenant_id field (frontend may send "null"/empty string
            # or, worse, a forged UUID for another tenant). Overwrite unconditionally.
            payload["tenant_id"] = tenant_id
            # Ensure the UUID is actually a UUID instance if it came in as string
            # from the function parameter (belt-and-suspenders).
            if payload["tenant_id"] is not None and not isinstance(payload["tenant_id"], UUID):
                try:
                    payload["tenant_id"] = UUID(str(payload["tenant_id"]))
                except (ValueError, AttributeError, TypeError):
                    return None, {
                        "error": "tenant_missing",
                        "message": (
                            "Tenant context has an invalid id. "
                            "Please refresh the page and sign in again."
                        ),
                    }

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
