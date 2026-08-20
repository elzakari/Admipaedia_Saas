from datetime import datetime

from flask import g, jsonify, request
from flask_jwt_extended import jwt_required
from marshmallow import ValidationError

from app.api.v1.academics import academics_bp
from app.extensions import db, logger
from app.models.academic_calendar import AcademicYear, Term
from app.models.educational_level import CoreCompetency, EducationalLevel
from app.schemas.curriculum import (CurriculumCreateSchema,
                                    CurriculumListSchema, CurriculumSchema,
                                    CurriculumUpdateSchema)
from app.schemas.curriculum_unit import (CurriculumUnitCreateSchema,
                                         CurriculumUnitSchema,
                                         CurriculumUnitUpdateSchema)
from app.schemas.educational_level import (CoreCompetencySchema,
                                           EducationalLevelSchema,
                                           GradeLevelCreateSchema,
                                           GradeLevelUpdateSchema,
                                           GradeLevelMinimalSchema)
from app.services.academic_configuration_service import \
    AcademicConfigurationService
from app.services.curriculum_service import CurriculumService
from app.utils.auth_utils import admin_required, teacher_required
from app.utils.tenant_context import tenant_required

# Initialize schemas
curriculum_schema = CurriculumSchema()
curricula_schema = CurriculumListSchema(many=True)
curriculum_create_schema = CurriculumCreateSchema()
curriculum_update_schema = CurriculumUpdateSchema()

curriculum_unit_schema = CurriculumUnitSchema()
curriculum_units_schema = CurriculumUnitSchema(many=True)
curriculum_unit_create_schema = CurriculumUnitCreateSchema()
curriculum_unit_update_schema = CurriculumUnitUpdateSchema()

educational_level_schema = EducationalLevelSchema()
educational_levels_schema = EducationalLevelSchema(many=True)
core_competency_schema = CoreCompetencySchema()
core_competencies_schema = CoreCompetencySchema(many=True)
grade_level_create_schema = GradeLevelCreateSchema()
grade_level_update_schema = GradeLevelUpdateSchema()
grade_level_minimal_schema = GradeLevelMinimalSchema(many=True)


def _serialize_academic_year(y: AcademicYear) -> dict:
    return {
        "id": int(y.id),
        "name": y.name,
        "start_date": y.start_date.isoformat() if y.start_date else None,
        "end_date": y.end_date.isoformat() if y.end_date else None,
        "is_current": bool(y.is_current),
        "created_at": y.created_at.isoformat() if y.created_at else None,
        "updated_at": y.updated_at.isoformat() if y.updated_at else None,
    }


def _serialize_term(t: Term) -> dict:
    return {
        "id": int(t.id),
        "name": t.name,
        "academic_year_id": int(t.academic_year_id),
        "start_date": t.start_date.isoformat() if t.start_date else None,
        "end_date": t.end_date.isoformat() if t.end_date else None,
        "is_current": bool(t.is_current),
        "created_at": t.created_at.isoformat() if t.created_at else None,
        "updated_at": t.updated_at.isoformat() if t.updated_at else None,
    }


@academics_bp.route("/setup", methods=["GET"])
@jwt_required()
@tenant_required
def get_academic_setup():
    return jsonify(AcademicConfigurationService.get_canonical_setup(g.tenant_id)), 200


@academics_bp.route("/academic-years", methods=["GET"])
@jwt_required()
def list_academic_years():
    """Return all AcademicYear rows ordered by start_date desc."""
    try:
        tenant_id = getattr(g, "tenant_id", None)
        branch_id = getattr(g, "branch_id", None)
        query = AcademicYear.query
        if tenant_id is not None and hasattr(AcademicYear, 'tenant_id'):
            query = query.filter((AcademicYear.tenant_id == tenant_id) | (AcademicYear.tenant_id.is_(None)))
        if branch_id is not None and hasattr(AcademicYear, 'branch_id'):
            query = query.filter((AcademicYear.branch_id == branch_id) | (AcademicYear.branch_id.is_(None)))
        rows = query.order_by(AcademicYear.start_date.desc()).all()
        return (
            jsonify({"success": True, "data": [_serialize_academic_year(y) for y in rows]}),
            200,
        )
    except Exception as e:
        logger.error("Error listing academic years", error=str(e))
        return jsonify({"success": False, "message": str(e)}), 500


@academics_bp.route("/academic-years/current", methods=["GET"])
@jwt_required()
def get_current_academic_year():
    """Return the AcademicYear marked is_current=True, or the most recent one."""
    try:
        tenant_id = getattr(g, "tenant_id", None)
        branch_id = getattr(g, "branch_id", None)
        query = AcademicYear.query.filter_by(is_current=True)
        if tenant_id is not None and hasattr(AcademicYear, 'tenant_id'):
            query = query.filter((AcademicYear.tenant_id == tenant_id) | (AcademicYear.tenant_id.is_(None)))
        if branch_id is not None and hasattr(AcademicYear, 'branch_id'):
            query = query.filter((AcademicYear.branch_id == branch_id) | (AcademicYear.branch_id.is_(None)))
        current = query.order_by(AcademicYear.start_date.desc()).first()
        if current is None:
            fallback_query = AcademicYear.query
            if tenant_id is not None and hasattr(AcademicYear, 'tenant_id'):
                fallback_query = fallback_query.filter((AcademicYear.tenant_id == tenant_id) | (AcademicYear.tenant_id.is_(None)))
            if branch_id is not None and hasattr(AcademicYear, 'branch_id'):
                fallback_query = fallback_query.filter((AcademicYear.branch_id == branch_id) | (AcademicYear.branch_id.is_(None)))
            current = fallback_query.order_by(AcademicYear.start_date.desc()).first()
        if current is None:
            return (
                jsonify({"success": False, "message": "No academic years configured"}),
                404,
            )
        return jsonify({"success": True, "data": _serialize_academic_year(current)}), 200
    except Exception as e:
        logger.error("Error fetching current academic year", error=str(e))
        return jsonify({"success": False, "message": str(e)}), 500


@academics_bp.route("/terms/current", methods=["GET"])
@jwt_required()
def get_current_term():
    """Return the Term marked is_current=True, or the most recent."""
    try:
        tenant_id = getattr(g, "tenant_id", None)
        branch_id = getattr(g, "branch_id", None)
        query = Term.query.filter_by(is_current=True)
        if tenant_id is not None and hasattr(Term, 'tenant_id'):
            query = query.filter((Term.tenant_id == tenant_id) | (Term.tenant_id.is_(None)))
        if branch_id is not None and hasattr(Term, 'branch_id'):
            query = query.filter((Term.branch_id == branch_id) | (Term.branch_id.is_(None)))
        current = query.order_by(Term.start_date.desc()).first()
        if current is None:
            fallback_query = Term.query
            if tenant_id is not None and hasattr(Term, 'tenant_id'):
                fallback_query = fallback_query.filter((Term.tenant_id == tenant_id) | (Term.tenant_id.is_(None)))
            if branch_id is not None and hasattr(Term, 'branch_id'):
                fallback_query = fallback_query.filter((Term.branch_id == branch_id) | (Term.branch_id.is_(None)))
            current = fallback_query.order_by(Term.start_date.desc()).first()
        if current is None:
            return (
                jsonify({"success": False, "message": "No terms configured"}),
                404,
            )
        return jsonify({"success": True, "data": _serialize_term(current)}), 200
    except Exception as e:
        logger.error("Error fetching current term", error=str(e))
        return jsonify({"success": False, "message": str(e)}), 500


@academics_bp.route("/academic-years", methods=["POST"])
@jwt_required()
@admin_required
@tenant_required
def create_academic_year():
    """Create a new AcademicYear."""
    try:
        payload = request.get_json(silent=True) or {}
        name = (payload.get("name") or "").strip()
        if not name:
            return jsonify({"success": False, "message": "name is required"}), 422

        start_date = payload.get("start_date")
        end_date = payload.get("end_date")
        is_current = bool(payload.get("is_current", False))

        if isinstance(start_date, str) and start_date:
            start_date = datetime.strptime(start_date[:10], "%Y-%m-%d").date()
        if isinstance(end_date, str) and end_date:
            end_date = datetime.strptime(end_date[:10], "%Y-%m-%d").date()

        year = AcademicYear(
            name=name,
            start_date=start_date,
            end_date=end_date,
            is_current=is_current,
        )
        if hasattr(AcademicYear, "tenant_id"):
            year.tenant_id = getattr(g, "tenant_id", None)
        if hasattr(AcademicYear, "branch_id"):
            year.branch_id = getattr(g, "branch_id", None)

        if is_current:
            for y in AcademicYear.query.all():
                y.is_current = False

        db.session.add(year)
        db.session.commit()

        db.session.refresh(year)
        if year.is_current:
            try:
                AcademicConfigurationService.sync_settings_from_current_entities(
                    g.tenant_id, academic_year=year
                )
                db.session.commit()
            except Exception:
                db.session.rollback()

        return (
            jsonify({"success": True, "data": _serialize_academic_year(year)}),
            201,
        )
    except Exception as e:
        logger.error(f"Error creating academic year: {str(e)}")
        db.session.rollback()
        return jsonify({"success": False, "message": str(e)}), 500


@academics_bp.route("/academic-years/<int:year_id>", methods=["PUT"])
@jwt_required()
@admin_required
@tenant_required
def update_academic_year(year_id):
    """Update an existing AcademicYear."""
    try:
        data = request.get_json(silent=True) or {}
        year = AcademicYear.query.get(year_id)
        if year is None:
            return jsonify({"success": False, "message": "Academic year not found"}), 404

        if "name" in data and data["name"]:
            year.name = str(data["name"]).strip()
        if "start_date" in data:
            sd = data["start_date"]
            if isinstance(sd, str) and sd:
                sd = datetime.strptime(sd[:10], "%Y-%m-%d").date()
            year.start_date = sd
        if "end_date" in data:
            ed = data["end_date"]
            if isinstance(ed, str) and ed:
                ed = datetime.strptime(ed[:10], "%Y-%m-%d").date()
            year.end_date = ed
        if "is_current" in data:
            new_is_current = bool(data["is_current"])
            if new_is_current:
                for y in AcademicYear.query.all():
                    y.is_current = False
            year.is_current = new_is_current

        db.session.commit()

        db.session.refresh(year)
        if year.is_current or ("is_current" in data and data["is_current"]):
            try:
                AcademicConfigurationService.sync_settings_from_current_entities(
                    g.tenant_id, academic_year=year
                )
                db.session.commit()
            except Exception:
                db.session.rollback()

        return (
            jsonify({"success": True, "data": _serialize_academic_year(year)}),
            200,
        )
    except Exception as e:
        logger.error(f"Error updating academic year: {str(e)}")
        db.session.rollback()
        return jsonify({"success": False, "message": str(e)}), 500


@academics_bp.route("/terms", methods=["POST"])
@jwt_required()
@admin_required
@tenant_required
def create_term():
    """Create a new Term."""
    try:
        payload = request.get_json(silent=True) or {}
        name = (payload.get("name") or "").strip()
        academic_year_id = payload.get("academic_year_id")
        if not name or not academic_year_id:
            return (
                jsonify(
                    {"success": False, "message": "name and academic_year_id are required"}
                ),
                422,
            )

        year = AcademicYear.query.get(academic_year_id)
        if year is None:
            return jsonify({"success": False, "message": "Academic year not found"}), 404

        start_date = payload.get("start_date") or year.start_date
        end_date = payload.get("end_date") or year.end_date
        is_current = bool(payload.get("is_current", False))

        if isinstance(start_date, str) and start_date:
            start_date = datetime.strptime(start_date[:10], "%Y-%m-%d").date()
        if isinstance(end_date, str) and end_date:
            end_date = datetime.strptime(end_date[:10], "%Y-%m-%d").date()

        term = Term(
            name=name,
            academic_year_id=year.id,
            start_date=start_date,
            end_date=end_date,
            is_current=is_current,
        )
        if hasattr(Term, "tenant_id"):
            term.tenant_id = getattr(g, "tenant_id", None)
        if hasattr(Term, "branch_id"):
            term.branch_id = getattr(g, "branch_id", None)

        if is_current:
            for t in Term.query.all():
                t.is_current = False

        db.session.add(term)
        db.session.commit()

        db.session.refresh(term)
        if term.is_current:
            try:
                AcademicConfigurationService.sync_settings_from_current_entities(
                    g.tenant_id, term=term
                )
                db.session.commit()
            except Exception:
                db.session.rollback()

        return jsonify({"success": True, "data": _serialize_term(term)}), 201
    except Exception as e:
        logger.error(f"Error creating term: {str(e)}")
        db.session.rollback()
        return jsonify({"success": False, "message": str(e)}), 500


@academics_bp.route("/terms/<int:term_id>", methods=["PUT"])
@jwt_required()
@admin_required
@tenant_required
def update_term(term_id):
    """Update an existing Term."""
    try:
        data = request.get_json(silent=True) or {}
        term = Term.query.get(term_id)
        if term is None:
            return jsonify({"success": False, "message": "Term not found"}), 404

        if "name" in data and data["name"]:
            term.name = str(data["name"]).strip()
        if "academic_year_id" in data and data["academic_year_id"]:
            term.academic_year_id = int(data["academic_year_id"])
        if "start_date" in data:
            sd = data["start_date"]
            if isinstance(sd, str) and sd:
                sd = datetime.strptime(sd[:10], "%Y-%m-%d").date()
            term.start_date = sd
        if "end_date" in data:
            ed = data["end_date"]
            if isinstance(ed, str) and ed:
                ed = datetime.strptime(ed[:10], "%Y-%m-%d").date()
            term.end_date = ed
        if "is_current" in data:
            new_is_current = bool(data["is_current"])
            if new_is_current:
                for t in Term.query.all():
                    t.is_current = False
            term.is_current = new_is_current

        db.session.commit()

        db.session.refresh(term)
        if term.is_current or ("is_current" in data and data["is_current"]):
            try:
                AcademicConfigurationService.sync_settings_from_current_entities(
                    g.tenant_id, term=term
                )
                db.session.commit()
            except Exception:
                db.session.rollback()

        return jsonify({"success": True, "data": _serialize_term(term)}), 200
    except Exception as e:
        logger.error(f"Error updating term: {str(e)}")
        db.session.rollback()
        return jsonify({"success": False, "message": str(e)}), 500


@academics_bp.route("/terms/<int:term_id>", methods=["DELETE"])
@jwt_required()
@admin_required
@tenant_required
def delete_term(term_id):
    """Delete a Term and sync the new current Term if any."""
    try:
        term = Term.query.get(term_id)
        if term is None:
            return jsonify({"success": False, "message": "Term not found"}), 404

        db.session.delete(term)
        db.session.commit()

        new_current = Term.query.filter_by(is_current=True).first()
        if new_current is not None:
            try:
                AcademicConfigurationService.sync_settings_from_current_entities(
                    g.tenant_id, term=new_current
                )
                db.session.commit()
            except Exception:
                db.session.rollback()

        return jsonify({"success": True, "message": "Term deleted successfully"}), 200
    except Exception as e:
        logger.error(f"Error deleting term: {str(e)}")
        db.session.rollback()
        return jsonify({"success": False, "message": str(e)}), 500


@academics_bp.route("/educational-levels", methods=["GET"])
@jwt_required()
def get_educational_levels():
    """Get all educational levels."""
    try:
        tenant_id = getattr(g, "tenant_id", None)
        query = EducationalLevel.query.filter_by(is_active=True)
        if tenant_id is not None and hasattr(EducationalLevel, 'tenant_id'):
            query = query.filter(EducationalLevel.tenant_id == tenant_id)
        levels = query.all()
        return (
            jsonify(
                {"success": True, "levels": educational_levels_schema.dump(levels)}
            ),
            200,
        )
    except Exception as e:
        logger.error(f"Error retrieving educational levels: {str(e)}")
        return jsonify({"success": False, "message": str(e)}), 500


@academics_bp.route("/standard-grade-levels", methods=["GET"])
@jwt_required()
@tenant_required
def get_standard_grade_levels():
    """Get all standardized grade levels scoped to the tenant's educational system configuration.

    Response is guaranteed free of duplicate display labels — duplicate rows in the
    DB (e.g. same grade name across multiple tracks) are annotated with (#2), (#3)
    suffixes so admins can always distinguish them in the dropdown.
    """
    try:
        import sqlalchemy.exc

        from app.extensions import db
        from app.models.educational_system import GradeLevel

        # Audit and handle missing parameter context gracefully
        tenant_id = getattr(g, "tenant_id", None)
        levels = []
        if not tenant_id:
            logger.warning(
                "get_standard_grade_levels: tenant_id context is missing. Falling back to defaults."
            )
        else:
            try:
                # Query scoped grade levels safely
                order_col = GradeLevel.order_index if hasattr(GradeLevel, "order_index") else GradeLevel.id
                levels = (
                    GradeLevel.query_scoped()
                    .filter(GradeLevel.is_active == True)
                    .order_by(order_col.asc())
                    .all()
                )
            except sqlalchemy.exc.SQLAlchemyError as db_err:
                logger.error(f"Database exception querying GradeLevel: {str(db_err)}")
                # Handled database exceptions gracefully with fallback list to avoid modal crashes
                levels = []

        if not levels:
            # Fallback sequence to match the attendance module
            levels_data = [
                {"id": f"default-grade-{i}", "name": f"Grade {i}", "display_name": f"Grade {i}", "order_index": i, "code": None, "is_custom": False}
                for i in range(1, 13)
            ]
        else:
            name_counts: dict = {}
            rows: list[dict] = []
            for idx, level in enumerate(levels, start=1):
                level_id = getattr(level, "id", f"grade-{idx}")
                level_name = getattr(level, "name", None)
                if not level_name:
                    numeric_value = getattr(level, "numeric_value", idx)
                    level_name = f"Grade {numeric_value}"
                code = getattr(level, "code", None)
                order_index = getattr(level, "order_index", idx)
                try:
                    id_serializable = str(level_id) if level_id is not None else f"grade-{idx}"
                except (TypeError, ValueError, AttributeError):
                    id_serializable = f"grade-{idx}"
                normalized_name = str(level_name).strip()
                occ = name_counts.get(normalized_name, 0) + 1
                name_counts[normalized_name] = occ
                rows.append({
                    "id": id_serializable,
                    "name": normalized_name,
                    "code": code,
                    "order_index": order_index if isinstance(order_index, int) else idx,
                    "occurrence": occ,
                    "educational_system_id": str(getattr(level, "educational_system_id")) if getattr(level, "educational_system_id", None) is not None else None,
                    "is_custom": True,
                })
            levels_data = []
            for r in rows:
                occ = r.pop("occurrence")
                total = name_counts.get(r["name"], 1)
                if total > 1:
                    r["display_name"] = f"{r['name']} (#{occ})"
                    r["note"] = f"Shared name — {total} grade-level rows exist with this label"
                else:
                    r["display_name"] = r["name"]
                levels_data.append(r)

        return jsonify({"success": True, "levels": levels_data}), 200
    except Exception as e:
        logger.error(f"Error retrieving standard grade levels: {str(e)}")
        return jsonify({"success": False, "message": str(e)}), 500


@academics_bp.route("/standard-grade-levels", methods=["POST"])
@jwt_required()
@admin_required
@tenant_required
def create_standard_grade_level():
    """Flexible inline creation of a new custom Grade Level, e.g. from the Class modal."""
    try:
        payload = request.get_json(silent=True) or {}
        try:
            data = grade_level_create_schema.load(payload)
        except ValidationError as err:
            return jsonify({"success": False, "errors": err.messages}), 422

        from app.models.educational_system import GradeLevel

        tenant_id = getattr(g, "tenant_id", None)
        if not tenant_id:
            return jsonify({"success": False, "message": "Tenant context is required"}), 400

        name = (data.get("name") or "").strip()
        if not name:
            return jsonify({"success": False, "message": "Grade level name is required"}), 422

        # Optional educational_system binding — if provided and invalid, just fall back to None
        educational_system_id = data.get("educational_system_id")
        if educational_system_id:
            try:
                import uuid as _uuid
                educational_system_id = _uuid.UUID(str(educational_system_id).strip())
            except (ValueError, AttributeError, TypeError):
                educational_system_id = None

        # Auto-assign a sensible order_index (append after the tenant's current max)
        order_index = data.get("order_index")
        if order_index is None:
            try:
                order_col = getattr(GradeLevel, "order_index", None)
                if order_col is not None:
                    last = (
                        db.session.query(db.func.max(order_col))
                        .select_from(GradeLevel)
                        .filter(GradeLevel.tenant_id == tenant_id)
                        .scalar()
                    )
                    order_index = int(last) + 1 if (last is not None) else 1
                else:
                    order_index = 1
            except Exception as _order_err:
                logger.warning(f"Failed to calculate grade_level order_index: {_order_err}")
                order_index = 1

        new_level = GradeLevel(
            tenant_id=tenant_id,
            educational_system_id=educational_system_id,
            name=name,
            order_index=int(order_index),
            is_terminal=bool(data.get("is_terminal", False)),
        )
        db.session.add(new_level)
        db.session.flush()
        level_id = str(new_level.id) if new_level.id is not None else None
        db.session.commit()

        return jsonify({
            "success": True,
            "message": "Grade level created successfully",
            "level": {
                "id": level_id,
                "name": name,
                "code": data.get("code"),
                "order_index": order_index,
                "display_name": name,
                "is_custom": True,
            },
        }), 201
    except Exception as e:
        logger.error(f"Error creating grade level: {str(e)}")
        db.session.rollback()
        return jsonify({"success": False, "message": str(e)}), 500


@academics_bp.route("/standard-grade-levels/<string:level_id>", methods=["PUT"])
@jwt_required()
@admin_required
@tenant_required
def update_standard_grade_level(level_id):
    """Rename, reorder, or mark terminal an existing Grade Level."""
    try:
        payload = request.get_json(silent=True) or {}
        try:
            data = grade_level_update_schema.load(payload)
        except ValidationError as err:
            return jsonify({"success": False, "errors": err.messages}), 422

        import uuid as _uuid

        from app.models.educational_system import GradeLevel

        try:
            level_uuid = _uuid.UUID(str(level_id).strip())
        except (ValueError, AttributeError, TypeError):
            return jsonify({"success": False, "message": "Invalid grade level id"}), 422

        level = GradeLevel.query_scoped().filter(GradeLevel.id == level_uuid).first()
        if not level:
            return jsonify({"success": False, "message": "Grade level not found"}), 404

        if "name" in data and data["name"]:
            level.name = str(data["name"]).strip()
        if "code" in data:
            level.code = data["code"] if data["code"] else None
        if "order_index" in data and data["order_index"] is not None:
            level.order_index = int(data["order_index"])
        if "is_terminal" in data and data["is_terminal"] is not None:
            level.is_terminal = bool(data["is_terminal"])

        db.session.commit()
        return jsonify({
            "success": True,
            "message": "Grade level updated successfully",
            "level": {
                "id": str(level.id),
                "name": level.name,
                "order_index": getattr(level, "order_index", None),
                "is_terminal": getattr(level, "is_terminal", False),
                "display_name": level.name,
                "is_custom": True,
            },
        }), 200
    except Exception as e:
        logger.error(f"Error updating grade level: {str(e)}")
        db.session.rollback()
        return jsonify({"success": False, "message": str(e)}), 500


@academics_bp.route("/standard-grade-levels/<string:level_id>", methods=["DELETE"])
@jwt_required()
@admin_required
@tenant_required
def delete_standard_grade_level(level_id):
    """Delete a custom Grade Level created inline.

    If the row is still referenced by any Class, Student, GradeBoundary,
    GradeTrack, GradeLevel.next_level_id FK, or similar, the delete will be
    rejected with a 409 so the admin can reassign those rows first.  We
    never silently cascade user data out of caution.
    """
    try:
        import sqlalchemy.exc
        import uuid as _uuid

        from app.models.educational_system import GradeLevel
        from app.models.grade_track import GradeTrack
        from app.models.grading_system import GradeBoundary
        from app.models.student import Student as StudentModel

        try:
            level_uuid = _uuid.UUID(str(level_id).strip())
        except (ValueError, AttributeError, TypeError):
            return jsonify({"success": False, "message": "Invalid grade level id"}), 422

        level = GradeLevel.query_scoped().filter(GradeLevel.id == level_uuid).first()
        if not level:
            return jsonify({"success": False, "message": "Grade level not found"}), 404

        # ----- Usage / FK guard ---------------------------------------------------
        # Classes reference grade_level as a VARCHAR(20) string.  The dropdown
        # stores UUID strings there, so count any matches.
        class_count = 0
        student_count = 0
        boundary_count = 0
        track_count = 0
        next_ref_count = 0

        try:
            from app.models.class_ import Class as ClassModel

            class_filters = [db.cast(ClassModel.grade_level, db.String) == str(level.id)]
            tenant_attr = getattr(ClassModel, "tenant_id", None)
            if tenant_attr is not None and getattr(level, "tenant_id", None) is not None:
                class_filters.append(tenant_attr == level.tenant_id)
            class_count = (
                db.session.query(db.func.count())
                .select_from(ClassModel)
                .filter(*class_filters)
                .scalar()
            ) or 0
        except Exception:
            class_count = 0

        try:
            student_grade_attr = getattr(StudentModel, "grade_level_id", None)
            if student_grade_attr is not None:
                student_filters = [db.cast(student_grade_attr, db.String) == str(level.id)]
                student_tenant = getattr(StudentModel, "tenant_id", None)
                if student_tenant is not None and getattr(level, "tenant_id", None) is not None:
                    student_filters.append(student_tenant == level.tenant_id)
                student_count = (
                    db.session.query(db.func.count())
                    .select_from(StudentModel)
                    .filter(*student_filters)
                    .scalar()
                ) or 0
        except Exception:
            student_count = 0

        try:
            boundary_grade_attr = getattr(GradeBoundary, "grade_level_id", None)
            if boundary_grade_attr is not None:
                boundary_count = (
                    db.session.query(db.func.count())
                    .select_from(GradeBoundary)
                    .filter(db.cast(boundary_grade_attr, db.String) == str(level.id))
                    .scalar()
                ) or 0
        except Exception:
            boundary_count = 0

        try:
            if hasattr(GradeTrack, "grade_levels"):
                # GradeLevel may have no grade_track relationship at all on
                # older schema revisions.  Count indirectly via GradeTrack.id.
                try:
                    track_gs_attr = getattr(GradeTrack, "grade_levels", None)
                    if track_gs_attr is not None:
                        track_rows = (
                            GradeTrack.query.join(track_gs_attr)
                            .filter(GradeLevel.id == level.id)
                            .all()
                        )
                        track_count = len(track_rows or [])
                except Exception:
                    track_count = 0
        except Exception:
            track_count = 0

        try:
            next_level_attr = getattr(GradeLevel, "next_level_id", None)
            if next_level_attr is not None:
                next_ref_count = (
                    db.session.query(db.func.count())
                    .select_from(GradeLevel)
                    .filter(next_level_attr == level.id)
                    .scalar()
                ) or 0
        except Exception:
            next_ref_count = 0

        total_refs = int(class_count) + int(student_count) + int(boundary_count) + int(track_count) + int(next_ref_count)
        if total_refs > 0:
            parts: list[str] = []
            if class_count:
                parts.append(f"{class_count} classe(s)")
            if student_count:
                parts.append(f"{student_count} student(s)")
            if boundary_count:
                parts.append(f"{boundary_count} grading boundar(y/ies)")
            if track_count:
                parts.append(f"{track_count} track(s)")
            if next_ref_count:
                parts.append(f"{next_ref_count} progression link(s)")
            usage = ", ".join(parts) or f"{total_refs} related record(s)"
            return (
                jsonify(
                    {
                        "success": False,
                        "message": (
                            "Cannot delete grade level because it is still in use: "
                            f"{usage}. Reassign those records first, then retry."
                        ),
                        "usage": {
                            "classes": int(class_count),
                            "students": int(student_count),
                            "boundaries": int(boundary_count),
                            "tracks": int(track_count),
                            "next_level_refs": int(next_ref_count),
                            "total": int(total_refs),
                        },
                    }
                ),
                409,
            )
        # ----- End usage guard ---------------------------------------------------

        db.session.delete(level)
        db.session.commit()
        return jsonify({"success": True, "message": "Grade level deleted successfully"}), 200
    except sqlalchemy.exc.IntegrityError as integ_err:
        logger.error(f"Integrity error deleting grade level: {str(integ_err)}")
        db.session.rollback()
        detail = "Cannot delete grade level because other records still reference it. Reassign those records first, then retry."
        lower = str(integ_err.orig or integ_err).lower()
        if "grade_level" in lower and "class" in lower:
            detail = "Cannot delete grade level: one or more classes are still assigned to it. Reassign those classes first, then retry."
        elif "student" in lower:
            detail = "Cannot delete grade level: one or more students are still assigned to it. Reassign those students first, then retry."
        elif "grade_boundary" in lower or "grading" in lower:
            detail = "Cannot delete grade level: grading boundaries are configured against it. Remove or reassign them first, then retry."
        return (
            jsonify({"success": False, "message": detail}),
            409,
        )
    except Exception as e:
        logger.error(f"Error deleting grade level: {str(e)}")
        db.session.rollback()
        return jsonify({"success": False, "message": str(e)}), 500


@academics_bp.route("/core-competencies", methods=["GET"])
@jwt_required()
def get_core_competencies():
    """Get all core competencies."""
    try:
        tenant_id = getattr(g, "tenant_id", None)
        query = CoreCompetency.query.filter_by(is_active=True)
        if tenant_id is not None and hasattr(CoreCompetency, 'tenant_id'):
            query = query.filter(CoreCompetency.tenant_id == tenant_id)
        competencies = query.all()
        return (
            jsonify(
                {
                    "success": True,
                    "competencies": core_competencies_schema.dump(competencies),
                }
            ),
            200,
        )
    except Exception as e:
        logger.error(f"Error retrieving core competencies: {str(e)}")
        return jsonify({"success": False, "message": str(e)}), 500


from app.models.grading_system import GradeBoundary, GradingScheme
from app.schemas.grading import GradeBoundarySchema, GradingSchemeSchema

# Initialize schemas
grading_scheme_schema = GradingSchemeSchema()
grading_schemes_schema = GradingSchemeSchema(many=True)


@academics_bp.route("/grading-scheme", methods=["GET"])
@academics_bp.route("/grading-system", methods=["GET"])
@jwt_required()
@tenant_required
def get_grading_scheme():
    """Get the active grading scheme configuration."""
    try:
        from flask_jwt_extended import current_user, get_jwt_identity

        from app.models.tenant import Tenant
        from app.models.user import User

        School = Tenant

        # Dynamic query parameter check for template boundaries
        system_param = request.args.get("system")
        if system_param:
            sys_upper = system_param.upper()
            boundaries = []
            if sys_upper in ("GES", "WAEC"):
                boundaries = [
                    {
                        "grade": "A1",
                        "description": "Excellent",
                        "minScore": 80,
                        "maxScore": 100,
                        "gradePoint": 4.0,
                    },
                    {
                        "grade": "B2",
                        "description": "Very Good",
                        "minScore": 75,
                        "maxScore": 79,
                        "gradePoint": 3.5,
                    },
                    {
                        "grade": "B3",
                        "description": "Good",
                        "minScore": 70,
                        "maxScore": 74,
                        "gradePoint": 3.0,
                    },
                    {
                        "grade": "C4",
                        "description": "Credit",
                        "minScore": 65,
                        "maxScore": 69,
                        "gradePoint": 2.5,
                    },
                    {
                        "grade": "C5",
                        "description": "Credit",
                        "minScore": 60,
                        "maxScore": 64,
                        "gradePoint": 2.0,
                    },
                    {
                        "grade": "C6",
                        "description": "Credit",
                        "minScore": 55,
                        "maxScore": 59,
                        "gradePoint": 1.5,
                    },
                    {
                        "grade": "D7",
                        "description": "Pass",
                        "minScore": 50,
                        "maxScore": 54,
                        "gradePoint": 1.0,
                    },
                    {
                        "grade": "E8",
                        "description": "Pass",
                        "minScore": 45,
                        "maxScore": 49,
                        "gradePoint": 0.5,
                    },
                    {
                        "grade": "F9",
                        "description": "Fail",
                        "minScore": 0,
                        "maxScore": 44,
                        "gradePoint": 0.0,
                    },
                ]
            elif sys_upper == "IB":
                boundaries = [
                    {
                        "grade": "7",
                        "description": "Excellent",
                        "minScore": 90,
                        "maxScore": 100,
                        "gradePoint": 7.0,
                    },
                    {
                        "grade": "6",
                        "description": "Very Good",
                        "minScore": 80,
                        "maxScore": 89,
                        "gradePoint": 6.0,
                    },
                    {
                        "grade": "5",
                        "description": "Good",
                        "minScore": 70,
                        "maxScore": 79,
                        "gradePoint": 5.0,
                    },
                    {
                        "grade": "4",
                        "description": "Satisfactory",
                        "minScore": 60,
                        "maxScore": 69,
                        "gradePoint": 4.0,
                    },
                    {
                        "grade": "3",
                        "description": "Mediocre",
                        "minScore": 50,
                        "maxScore": 59,
                        "gradePoint": 3.0,
                    },
                    {
                        "grade": "2",
                        "description": "Poor",
                        "minScore": 40,
                        "maxScore": 49,
                        "gradePoint": 2.0,
                    },
                    {
                        "grade": "1",
                        "description": "Very Poor",
                        "minScore": 0,
                        "maxScore": 39,
                        "gradePoint": 1.0,
                    },
                ]
            elif sys_upper == "CAMBRIDGE":
                boundaries = [
                    {
                        "grade": "A*",
                        "description": "Excellent",
                        "minScore": 90,
                        "maxScore": 100,
                        "gradePoint": 4.0,
                    },
                    {
                        "grade": "A",
                        "description": "Very Good",
                        "minScore": 80,
                        "maxScore": 89,
                        "gradePoint": 3.8,
                    },
                    {
                        "grade": "B",
                        "description": "Good",
                        "minScore": 70,
                        "maxScore": 79,
                        "gradePoint": 3.5,
                    },
                    {
                        "grade": "C",
                        "description": "Satisfactory",
                        "minScore": 60,
                        "maxScore": 69,
                        "gradePoint": 3.0,
                    },
                    {
                        "grade": "D",
                        "description": "Minimum Pass",
                        "minScore": 50,
                        "maxScore": 59,
                        "gradePoint": 2.0,
                    },
                    {
                        "grade": "E",
                        "description": "Unsatisfactory Pass",
                        "minScore": 40,
                        "maxScore": 49,
                        "gradePoint": 1.0,
                    },
                    {
                        "grade": "U",
                        "description": "Ungraded",
                        "minScore": 0,
                        "maxScore": 39,
                        "gradePoint": 0.0,
                    },
                ]
            elif sys_upper == "APC":
                boundaries = [
                    {
                        "grade": "M",
                        "description": "Maîtrisé",
                        "minScore": 16,
                        "maxScore": 20,
                        "gradePoint": 16.0,
                    },
                    {
                        "grade": "A",
                        "description": "Acquis",
                        "minScore": 14,
                        "maxScore": 15.99,
                        "gradePoint": 14.0,
                    },
                    {
                        "grade": "EA",
                        "description": "En cours d’Acquisition",
                        "minScore": 10,
                        "maxScore": 13.99,
                        "gradePoint": 10.0,
                    },
                    {
                        "grade": "NA",
                        "description": "Non Acquis",
                        "minScore": 0,
                        "maxScore": 9.99,
                        "gradePoint": 0.0,
                    },
                ]
            else:
                boundaries = [
                    {
                        "grade": "A",
                        "description": "Excellent",
                        "minScore": 80,
                        "maxScore": 100,
                        "gradePoint": 4.0,
                    },
                    {
                        "grade": "B",
                        "description": "Very Good",
                        "minScore": 70,
                        "maxScore": 79,
                        "gradePoint": 3.5,
                    },
                    {
                        "grade": "C",
                        "description": "Good",
                        "minScore": 60,
                        "maxScore": 69,
                        "gradePoint": 3.0,
                    },
                    {
                        "grade": "D",
                        "description": "Satisfactory",
                        "minScore": 50,
                        "maxScore": 59,
                        "gradePoint": 2.5,
                    },
                    {
                        "grade": "E",
                        "description": "Pass",
                        "minScore": 40,
                        "maxScore": 49,
                        "gradePoint": 2.0,
                    },
                    {
                        "grade": "F",
                        "description": "Fail",
                        "minScore": 0,
                        "maxScore": 39,
                        "gradePoint": 0.0,
                    },
                ]
            return jsonify({"success": True, "gradingScheme": boundaries}), 200

        # Helper: check if tenant has grading scales
        def tenant_has_grading_scales(school_id):
            return (
                GradingScheme.query.filter_by(
                    tenant_id=school_id, is_active=True
                ).count()
                > 0
            )

        def seed_default_scale_for_system(school_id, system_template):
            from app.extensions import db
            from app.models.educational_system import (
                EducationalSystemConfig, EducationalSystemTemplate)
            from app.services.academic_configuration_service import \
                AcademicConfigurationService
            from app.services.education_initializer import \
                TenantEducationInitializer
            from app.services.educational_system.service import \
                EducationalSystemService

            # Ensure EducationalSystemTemplate exists for APC
            if system_template == "APC":
                tpl = EducationalSystemTemplate.query.filter_by(
                    system_key="APC"
                ).first()
                if not tpl:
                    try:
                        tpl = EducationalSystemTemplate(
                            country_code="TG",
                            system_key="APC",
                            name="Togo APC (Approche Par Compétence)",
                            description="Francophone structure utilizing APC rubric evaluation and 0-20 numeric aliasing",
                            config={
                                "phases": [
                                    {
                                        "name": "Primaire",
                                        "levels": [
                                            "CP1",
                                            "CP2",
                                            "CE1",
                                            "CE2",
                                            "CM1",
                                            "CM2",
                                        ],
                                    },
                                    {
                                        "name": "Secondaire - Collège",
                                        "levels": ["6e", "5e", "4e", "3e"],
                                    },
                                    {
                                        "name": "Secondaire - Lycée",
                                        "levels": ["Seconde", "Première", "Terminale"],
                                    },
                                ],
                                "grading": {
                                    "type": "rubric",
                                    "scale": "0-20",
                                    "pass_mark": 10,
                                    "schemes": [
                                        {
                                            "name": "M",
                                            "min": 16.00,
                                            "max": 20.00,
                                            "point": 16.00,
                                            "description": "Maîtrisé",
                                        },
                                        {
                                            "name": "A",
                                            "min": 14.00,
                                            "max": 15.99,
                                            "point": 14.00,
                                            "description": "Acquis",
                                        },
                                        {
                                            "name": "EA",
                                            "min": 10.00,
                                            "max": 13.99,
                                            "point": 10.00,
                                            "description": "En cours d’Acquisition",
                                        },
                                        {
                                            "name": "NA",
                                            "min": 0.00,
                                            "max": 9.99,
                                            "point": 0.00,
                                            "description": "Non Acquis",
                                        },
                                    ],
                                },
                                "assessments": {
                                    "continuous_assessment_weight": 40,
                                    "exam_weight": 60,
                                },
                                "locales": {"default": "fr", "supported": ["fr", "en"]},
                            },
                        )
                        db.session.add(tpl)
                        db.session.commit()
                    except Exception:
                        db.session.rollback()

            # Ensure EducationalSystemConfig and structural layers are set up
            cfg = EducationalSystemConfig.query.filter_by(
                tenant_id=school_id, is_active=True
            ).first()
            if not cfg and system_template:
                try:
                    EducationalSystemService.apply_template_to_tenant(
                        system_template, school_id
                    )
                    TenantEducationInitializer.run_setup(school_id, system_template)
                except Exception:
                    pass

            # Run the harmonized config sync
            config = AcademicConfigurationService.build_harmonized_config(school_id)
            AcademicConfigurationService.sync_grading_scheme_from_config(
                school_id, config
            )

        # Resolve active school/tenant ID
        user_identity = get_jwt_identity()
        user_obj = User.query.get(user_identity) if user_identity else None

        school_id = g.tenant_id
        if not school_id and user_obj:
            school_id = user_obj.school_id
        elif not school_id and current_user and hasattr(current_user, "school_id"):
            school_id = current_user.school_id

        if school_id:
            # Backend defensive fallback pattern
            from app.models.educational_system import EducationalSystemConfig

            school_profile = School.query.get(school_id)
            if school_profile:
                system_template = school_profile.education_system
                cfg = EducationalSystemConfig.query.filter_by(
                    tenant_id=school_id, is_active=True
                ).first()
                if system_template and (
                    not tenant_has_grading_scales(school_id)
                    or not cfg
                    or cfg.template_key != system_template
                ):
                    seed_default_scale_for_system(school_id, system_template)

        scheme = GradingScheme.query.filter_by(
            tenant_id=g.tenant_id, is_active=True, is_default=True
        ).first()

        # Fallback to first active scheme if no default
        if not scheme:
            scheme = GradingScheme.query.filter_by(
                tenant_id=g.tenant_id, is_active=True
            ).first()

        if not scheme:
            scheme = GradingScheme.query.filter_by(
                tenant_id=None, is_active=True, is_default=True
            ).first()

        if not scheme:
            scheme = GradingScheme.query.filter_by(
                tenant_id=None, is_active=True
            ).first()

        if not scheme:
            # If no scheme in DB, return a default static one (same as before but structured)
            default_scheme = {
                "id": 0,
                "name": "Default GES Grading Scheme",
                "standard": "continuous_assessment",
                "description": "System default grading scheme",
                "is_active": True,
                "grade_boundaries": [
                    {
                        "grade_symbol": "A1",
                        "grade_name": "Excellent",
                        "min_score": 80,
                        "max_score": 100,
                        "is_passing": True,
                        "sequence_order": 1,
                    },
                    {
                        "grade_symbol": "B2",
                        "grade_name": "Very Good",
                        "min_score": 70,
                        "max_score": 79,
                        "is_passing": True,
                        "sequence_order": 2,
                    },
                    {
                        "grade_symbol": "B3",
                        "grade_name": "Good",
                        "min_score": 60,
                        "max_score": 69,
                        "is_passing": True,
                        "sequence_order": 3,
                    },
                    {
                        "grade_symbol": "C4",
                        "grade_name": "Credit",
                        "min_score": 55,
                        "max_score": 59,
                        "is_passing": True,
                        "sequence_order": 4,
                    },
                    {
                        "grade_symbol": "C5",
                        "grade_name": "Credit",
                        "min_score": 50,
                        "max_score": 54,
                        "is_passing": True,
                        "sequence_order": 5,
                    },
                    {
                        "grade_symbol": "C6",
                        "grade_name": "Credit",
                        "min_score": 45,
                        "max_score": 49,
                        "is_passing": True,
                        "sequence_order": 6,
                    },
                    {
                        "grade_symbol": "D7",
                        "grade_name": "Pass",
                        "min_score": 40,
                        "max_score": 44,
                        "is_passing": True,
                        "sequence_order": 7,
                    },
                    {
                        "grade_symbol": "E8",
                        "grade_name": "Pass",
                        "min_score": 35,
                        "max_score": 39,
                        "is_passing": True,
                        "sequence_order": 8,
                    },
                    {
                        "grade_symbol": "F9",
                        "grade_name": "Fail",
                        "min_score": 0,
                        "max_score": 34,
                        "is_passing": False,
                        "sequence_order": 9,
                    },
                ],
            }
            return (
                jsonify(
                    {
                        "success": True,
                        "gradingScheme": default_scheme[
                            "grade_boundaries"
                        ],  # Maintain backward compatibility with frontend
                        "full_scheme": default_scheme,
                    }
                ),
                200,
            )

        return (
            jsonify(
                {
                    "success": True,
                    "gradingScheme": [
                        {
                            "grade": b.grade_symbol,
                            "minScore": b.min_score,
                            "maxScore": b.max_score,
                            "description": b.grade_name,
                        }
                        for b in sorted(
                            scheme.grade_boundaries, key=lambda x: x.sequence_order
                        )
                    ],
                    "full_scheme": grading_scheme_schema.dump(scheme),
                }
            ),
            200,
        )
    except Exception as e:
        logger.error(f"Error retrieving grading scheme: {str(e)}")
        return (
            jsonify(
                {
                    "success": True,
                    "maximum_grade": 100,
                    "passing_grade": 50,
                    "boundaries": [],
                    "gradingScheme": [],
                    "full_scheme": {
                        "id": 0,
                        "name": "Fallback Grading Scheme",
                        "grade_boundaries": [],
                    },
                }
            ),
            200,
        )


# Curriculum routes
@academics_bp.route("/curricula", methods=["GET"])
@jwt_required()
def get_curricula():
    """Get all curricula with optional filtering."""
    try:
        page = request.args.get("page", 1, type=int)
        per_page = request.args.get("per_page", 20, type=int)
        subject_id = request.args.get("subject_id", type=int)
        grade_level = request.args.get("grade_level")
        academic_year = request.args.get("academic_year")

        paginated_curricula = CurriculumService.get_all_curricula(
            page, per_page, subject_id, grade_level, academic_year
        )

        # Add subject names to the curricula
        curricula_with_subjects = []
        for curriculum in paginated_curricula.items:
            curriculum_dict = curriculum_schema.dump(curriculum)
            if curriculum.subject:
                curriculum_dict["subject_name"] = curriculum.subject.name
            curricula_with_subjects.append(curriculum_dict)

        return (
            jsonify(
                {
                    "success": True,
                    "curricula": curricula_with_subjects,
                    "pagination": {
                        "total": paginated_curricula.total,
                        "pages": paginated_curricula.pages,
                        "page": paginated_curricula.page,
                        "per_page": paginated_curricula.per_page,
                        "next": paginated_curricula.next_num,
                        "prev": paginated_curricula.prev_num,
                    },
                }
            ),
            200,
        )
    except Exception as e:
        logger.error(f"Error retrieving curricula: {str(e)}")
        return (
            jsonify(
                {"success": False, "message": f"Failed to retrieve curricula: {str(e)}"}
            ),
            500,
        )


@academics_bp.route("/curricula/<int:curriculum_id>", methods=["GET"])
@jwt_required()
def get_curriculum(curriculum_id):
    """Get a specific curriculum by ID."""
    try:
        curriculum = CurriculumService.get_curriculum_by_id(curriculum_id)

        if not curriculum:
            return jsonify({"success": False, "message": "Curriculum not found"}), 404

        curriculum_dict = curriculum_schema.dump(curriculum)
        if curriculum.subject:
            curriculum_dict["subject_name"] = curriculum.subject.name

        return jsonify({"success": True, "curriculum": curriculum_dict}), 200
    except Exception as e:
        logger.error(f"Error retrieving curriculum {curriculum_id}: {str(e)}")
        return (
            jsonify(
                {
                    "success": False,
                    "message": f"Failed to retrieve curriculum: {str(e)}",
                }
            ),
            500,
        )


@academics_bp.route("/curricula", methods=["POST"])
@jwt_required()
@teacher_required
def create_curriculum():
    """Create a new curriculum."""
    try:
        data = curriculum_create_schema.load(request.json)
        from flask_jwt_extended import get_jwt_identity

        # Add the current user as the creator
        data["created_by"] = get_jwt_identity()

        curriculum, error = CurriculumService.create_curriculum(data)

        if error:
            return jsonify({"success": False, "message": error}), 400

        curriculum_dict = curriculum_schema.dump(curriculum)
        if curriculum.subject:
            curriculum_dict["subject_name"] = curriculum.subject.name

        return (
            jsonify(
                {
                    "success": True,
                    "message": "Curriculum created successfully",
                    "curriculum": curriculum_dict,
                }
            ),
            201,
        )
    except ValidationError as err:
        return jsonify({"success": False, "errors": err.messages}), 400
    except Exception as e:
        logger.error(f"Error creating curriculum: {str(e)}")
        return (
            jsonify(
                {"success": False, "message": f"Failed to create curriculum: {str(e)}"}
            ),
            500,
        )


@academics_bp.route("/curricula/<int:curriculum_id>", methods=["PUT"])
@jwt_required()
@teacher_required
def update_curriculum(curriculum_id):
    """Update a curriculum."""
    try:
        data = curriculum_update_schema.load(request.json)

        curriculum, error = CurriculumService.update_curriculum(curriculum_id, data)

        if error:
            return jsonify({"success": False, "message": error}), 400

        curriculum_dict = curriculum_schema.dump(curriculum)
        if curriculum.subject:
            curriculum_dict["subject_name"] = curriculum.subject.name

        return (
            jsonify(
                {
                    "success": True,
                    "message": "Curriculum updated successfully",
                    "curriculum": curriculum_dict,
                }
            ),
            200,
        )
    except ValidationError as err:
        return jsonify({"success": False, "errors": err.messages}), 400
    except Exception as e:
        logger.error(f"Error updating curriculum {curriculum_id}: {str(e)}")
        return (
            jsonify(
                {"success": False, "message": f"Failed to update curriculum: {str(e)}"}
            ),
            500,
        )


@academics_bp.route("/curricula/<int:curriculum_id>", methods=["DELETE"])
@jwt_required()
@admin_required
def delete_curriculum(curriculum_id):
    """Delete a curriculum."""
    try:
        success, error = CurriculumService.delete_curriculum(curriculum_id)

        if error:
            return jsonify({"success": False, "message": error}), 400

        return (
            jsonify({"success": True, "message": "Curriculum deleted successfully"}),
            200,
        )
    except Exception as e:
        logger.error(f"Error deleting curriculum {curriculum_id}: {str(e)}")
        return (
            jsonify(
                {"success": False, "message": f"Failed to delete curriculum: {str(e)}"}
            ),
            500,
        )


# Curriculum Unit routes
@academics_bp.route("/curricula/<int:curriculum_id>/units", methods=["GET"])
@jwt_required()
def get_curriculum_units(curriculum_id):
    """Get all units for a specific curriculum."""
    try:
        # First check if the curriculum exists
        curriculum = CurriculumService.get_curriculum_by_id(curriculum_id)
        if not curriculum:
            return jsonify({"success": False, "message": "Curriculum not found"}), 404

        units = CurriculumService.get_curriculum_units(curriculum_id)

        return (
            jsonify({"success": True, "units": curriculum_units_schema.dump(units)}),
            200,
        )
    except Exception as e:
        logger.error(f"Error retrieving units for curriculum {curriculum_id}: {str(e)}")
        return (
            jsonify(
                {
                    "success": False,
                    "message": f"Failed to retrieve curriculum units: {str(e)}",
                }
            ),
            500,
        )


@academics_bp.route("/curriculum-units", methods=["POST"])
@jwt_required()
@teacher_required
def create_curriculum_unit():
    """Create a new curriculum unit."""
    try:
        data = curriculum_unit_create_schema.load(request.json)

        # Check if the curriculum exists
        curriculum = CurriculumService.get_curriculum_by_id(data["curriculum_id"])
        if not curriculum:
            return jsonify({"success": False, "message": "Curriculum not found"}), 404

        unit, error = CurriculumService.add_curriculum_unit(data)

        if error:
            return jsonify({"success": False, "message": error}), 400

        return (
            jsonify(
                {
                    "success": True,
                    "message": "Curriculum unit created successfully",
                    "unit": curriculum_unit_schema.dump(unit),
                }
            ),
            201,
        )
    except ValidationError as err:
        return jsonify({"success": False, "errors": err.messages}), 400
    except Exception as e:
        logger.error(f"Error creating curriculum unit: {str(e)}")
        return (
            jsonify(
                {
                    "success": False,
                    "message": f"Failed to create curriculum unit: {str(e)}",
                }
            ),
            500,
        )


@academics_bp.route("/curriculum-units/<int:unit_id>", methods=["PUT"])
@jwt_required()
@teacher_required
def update_curriculum_unit(unit_id):
    """Update a curriculum unit."""
    try:
        data = curriculum_unit_update_schema.load(request.json)

        unit, error = CurriculumService.update_curriculum_unit(unit_id, data)

        if error:
            return jsonify({"success": False, "message": error}), 400

        return (
            jsonify(
                {
                    "success": True,
                    "message": "Curriculum unit updated successfully",
                    "unit": curriculum_unit_schema.dump(unit),
                }
            ),
            200,
        )
    except ValidationError as err:
        return jsonify({"success": False, "errors": err.messages}), 400
    except Exception as e:
        logger.error(f"Error updating curriculum unit {unit_id}: {str(e)}")
        return (
            jsonify(
                {
                    "success": False,
                    "message": f"Failed to update curriculum unit: {str(e)}",
                }
            ),
            500,
        )


@academics_bp.route("/curriculum-units/<int:unit_id>", methods=["DELETE"])
@jwt_required()
@teacher_required
def delete_curriculum_unit(unit_id):
    """Delete a curriculum unit."""
    try:
        success, error = CurriculumService.delete_curriculum_unit(unit_id)

        if error:
            return jsonify({"success": False, "message": error}), 400

        return (
            jsonify(
                {"success": True, "message": "Curriculum unit deleted successfully"}
            ),
            200,
        )
    except Exception as e:
        logger.error(f"Error deleting curriculum unit {unit_id}: {str(e)}")
        return (
            jsonify(
                {
                    "success": False,
                    "message": f"Failed to delete curriculum unit: {str(e)}",
                }
            ),
            500,
        )


@academics_bp.route("/subjects", methods=["GET"])
@jwt_required()
@tenant_required
def get_academics_subjects():
    """Get all subjects with optional class_id filtering and fallback to active subjects."""
    class_id = request.args.get("class_id", type=int)

    from app.models.associations import class_subjects
    from app.models.subject import Subject
    from app.schemas.subject import SubjectListSchema

    subjects_schema = SubjectListSchema(many=True)
    subjects_list = []

    if class_id:
        try:
            # Query class_subjects table to find subjects explicitly mapped to class_id
            query = Subject.query.join(class_subjects).filter(
                class_subjects.c.class_id == class_id
            )
            if g.tenant_id is not None:
                query = query.filter(Subject.tenant_id == g.tenant_id)

            subjects_list = query.order_by(Subject.name).all()
        except Exception as e:
            logger.error(
                "Error querying subjects by class_id in academics BP",
                error=str(e),
                class_id=class_id,
            )

    # Fallback to returning all active subjects if class_id query came back empty (or not class_id)
    if not class_id or not subjects_list:
        query = Subject.query.filter_by(is_active=True)
        if g.tenant_id is not None:
            query = query.filter(Subject.tenant_id == g.tenant_id)
        subjects_list = query.order_by(Subject.name).all()

    return (
        jsonify(
            {
                "success": True,
                "subjects": subjects_schema.dump(subjects_list),
                "pagination": {
                    "total": len(subjects_list),
                    "pages": 1,
                    "page": 1,
                    "per_page": max(1, len(subjects_list)),
                    "next": None,
                    "prev": None,
                },
            }
        ),
        200,
    )


@academics_bp.route("/class-performance", methods=["GET"])
@jwt_required()
@tenant_required
def academics_class_performance():
    """Proxy to EnhancedAcademicAnalyticsService comprehensive dashboard analytics."""
    try:
        from flask_jwt_extended import get_jwt_identity

        from app.models.user import User
        from app.services.enhanced_academic_analytics_service import \
            EnhancedAcademicAnalyticsService

        user_id = get_jwt_identity()
        tenant_id = getattr(g, "tenant_id", None)
        branch_id = getattr(g, "branch_id", None)

        if user_id is not None and hasattr(User, 'tenant_id'):
            user_obj = (
                User.query
                .filter(User.id == user_id)
                .filter(
                    (User.tenant_id == tenant_id) | (User.tenant_id.is_(None))
                    if tenant_id is not None else True
                )
                .first()
            ) if tenant_id is not None else User.query.filter(User.id == user_id).first()
        else:
            user_obj = User.query.filter(User.id == user_id).first() if user_id else None

        if not user_obj:
            return jsonify({"success": False, "message": "User not found"}), 404

        user_role = (
            user_obj.roles[0].name
            if getattr(user_obj, "roles", None) and len(user_obj.roles) > 0
            else (getattr(user_obj, "role", None) or "admin")
        )

        date_from = request.args.get("date_from")
        date_to = request.args.get("date_to")
        class_id = request.args.get("class_id", type=int)
        subject_id = request.args.get("subject_id", type=int)

        result = EnhancedAcademicAnalyticsService.get_comprehensive_dashboard_analytics(
            user_id=user_id,
            user_role=user_role,
            date_from=date_from,
            date_to=date_to,
            class_id=class_id,
            subject_id=subject_id,
            tenant_id=tenant_id,
            branch_id=branch_id,
        )
        return jsonify({"success": True, "data": result}), 200
    except Exception as e:
        logger.error(f"Error in academics class-performance route: {str(e)}")
        return jsonify({"success": False, "message": str(e)}), 500


@academics_bp.route("/performance-trends", methods=["GET"])
@jwt_required()
@tenant_required
def academics_performance_trends():
    """Proxy to EnhancedAcademicAnalyticsService performance trends calculation."""
    try:
        from datetime import datetime, timedelta

        from app.models.grade import Grade
        from app.services.enhanced_academic_analytics_service import \
            EnhancedAcademicAnalyticsService

        tenant_id = getattr(g, "tenant_id", None)
        branch_id = getattr(g, "branch_id", None)

        date_from_str = request.args.get("date_from")
        date_to_str = request.args.get("date_to")
        class_id = request.args.get("class_id", type=int)
        student_id = request.args.get("student_id", type=int)

        if date_from_str:
            date_from = datetime.fromisoformat(date_from_str.replace("Z", "+00:00"))
        else:
            date_from = datetime.now() - timedelta(days=90)
        if date_to_str:
            date_to = datetime.fromisoformat(date_to_str.replace("Z", "+00:00"))
        else:
            date_to = datetime.now()

        query = db.session.query(Grade).filter(
            Grade.created_at.between(date_from, date_to)
        )
        if tenant_id is not None and hasattr(Grade, 'tenant_id'):
            query = query.filter((Grade.tenant_id == tenant_id) | (Grade.tenant_id.is_(None)))
        if branch_id is not None and hasattr(Grade, 'branch_id'):
            query = query.filter((Grade.branch_id == branch_id) | (Grade.branch_id.is_(None)))
        if class_id:
            query = query.filter(Grade.class_id == class_id)
        if student_id:
            query = query.filter(Grade.student_id == student_id)

        grades = query.all()
        trends = EnhancedAcademicAnalyticsService._calculate_performance_trends(
            grades, date_from, date_to
        )
        return jsonify({"success": True, "data": trends}), 200
    except Exception as e:
        logger.error(f"Error in academics performance-trends route: {str(e)}")
        return jsonify({"success": False, "message": str(e)}), 500


@academics_bp.route("/ai-insights", methods=["GET"])
@jwt_required()
@tenant_required
def academics_ai_insights():
    """Generate rule-based AI insights from class performance data."""
    try:
        from datetime import datetime, timedelta

        from app.models.grade import Grade

        tenant_id = getattr(g, "tenant_id", None)
        branch_id = getattr(g, "branch_id", None)
        class_id = request.args.get("class_id", type=int)

        date_to = datetime.now()
        date_from = date_to - timedelta(days=90)

        query = db.session.query(Grade).filter(
            Grade.created_at.between(date_from, date_to)
        )
        if tenant_id is not None and hasattr(Grade, 'tenant_id'):
            query = query.filter((Grade.tenant_id == tenant_id) | (Grade.tenant_id.is_(None)))
        if branch_id is not None and hasattr(Grade, 'branch_id'):
            query = query.filter((Grade.branch_id == branch_id) | (Grade.branch_id.is_(None)))
        if class_id:
            query = query.filter(Grade.class_id == class_id)

        grades = query.all()
        insights = []

        if not grades:
            insights.append({
                "id": 1,
                "type": "info",
                "severity": "low",
                "title": "Insufficient Data",
                "message": "No performance data available for the selected period and class.",
                "category": "data_availability",
                "actionable": False,
                "created_at": datetime.now().isoformat(),
            })
        else:
            scores = []
            for g_ in grades:
                s = getattr(g_, "score", None)
                if s is None:
                    s = getattr(g_, "marks_obtained", None)
                if s is None:
                    s = getattr(g_, "percentage", None)
                if s is not None:
                    scores.append(s)

            if scores:
                avg_score = sum(scores) / len(scores)
                pass_count = len([s for s in scores if s >= 40])
                pass_rate = (pass_count / len(scores) * 100) if scores else 0

                if pass_rate < 50:
                    insights.append({
                        "id": len(insights) + 1,
                        "type": "warning",
                        "severity": "high",
                        "title": "Low Class Pass Rate",
                        "message": f"Class pass rate is {pass_rate:.1f}% which is below the 50% threshold. Consider remedial interventions.",
                        "category": "performance",
                        "actionable": True,
                        "suggestion": "Schedule remedial classes and review teaching methods for underperforming topics.",
                        "created_at": datetime.now().isoformat(),
                    })

                if avg_score < 50:
                    insights.append({
                        "id": len(insights) + 1,
                        "type": "warning",
                        "severity": "medium",
                        "title": "Below Average Performance",
                        "message": f"Average score of {avg_score:.1f}% is below the satisfactory threshold.",
                        "category": "performance",
                        "actionable": True,
                        "suggestion": "Break down performance by subject to identify weak areas and targeted support.",
                        "created_at": datetime.now().isoformat(),
                    })

                fail_count = len([s for s in scores if s < 40])
                fail_rate = (fail_count / len(scores) * 100) if scores else 0
                if fail_rate > 20:
                    insights.append({
                        "id": len(insights) + 1,
                        "type": "alert",
                        "severity": "high",
                        "title": "High Failure Rate",
                        "message": f"{fail_rate:.1f}% of assessments resulted in failing grades (below 40%).",
                        "category": "risk",
                        "actionable": True,
                        "suggestion": "Identify at-risk students and implement one-on-one support or tutoring.",
                        "created_at": datetime.now().isoformat(),
                    })

                excellent_count = len([s for s in scores if s >= 80])
                excellent_rate = (excellent_count / len(scores) * 100) if scores else 0
                if excellent_rate >= 30:
                    insights.append({
                        "id": len(insights) + 1,
                        "type": "positive",
                        "severity": "low",
                        "title": "Strong Excellence Rate",
                        "message": f"{excellent_rate:.1f}% of assessments scored 80% or above - excellent performance!",
                        "category": "achievement",
                        "actionable": False,
                        "created_at": datetime.now().isoformat(),
                    })

                total_students = len(set(g_.student_id for g_ in grades))
                insights.append({
                    "id": len(insights) + 1,
                    "type": "info",
                    "severity": "low",
                    "title": "Performance Summary",
                    "message": f"Analyzed {len(grades)} assessments across {total_students} students. Average: {avg_score:.1f}%, Pass rate: {pass_rate:.1f}%.",
                    "category": "summary",
                    "actionable": False,
                    "created_at": datetime.now().isoformat(),
                })

        return jsonify({"success": True, "data": insights}), 200
    except Exception as e:
        logger.error(f"Error in academics ai-insights route: {str(e)}")
        return jsonify({"success": False, "message": str(e)}), 500


@academics_bp.route("/subject-comparison/<int:student_id>", methods=["GET"])
@jwt_required()
@tenant_required
def academics_subject_comparison(student_id):
    """Get subject comparison data for a student with averages, pass rates, and trends."""
    try:
        from datetime import datetime, timedelta

        from app.models.grade import Grade
        from app.models.subject import Subject

        tenant_id = getattr(g, "tenant_id", None)
        branch_id = getattr(g, "branch_id", None)

        date_to = datetime.now()
        date_from = date_to - timedelta(days=180)

        query = db.session.query(Grade).filter(Grade.student_id == student_id)
        if tenant_id is not None and hasattr(Grade, 'tenant_id'):
            query = query.filter((Grade.tenant_id == tenant_id) | (Grade.tenant_id.is_(None)))
        if branch_id is not None and hasattr(Grade, 'branch_id'):
            query = query.filter((Grade.branch_id == branch_id) | (Grade.branch_id.is_(None)))

        grades = query.order_by(Grade.created_at.asc()).all()

        subject_grades = {}
        for g_ in grades:
            sid = g_.subject_id
            if sid is None:
                continue
            if sid not in subject_grades:
                subject_grades[sid] = []
            subject_grades[sid].append(g_)

        result = []
        for subject_id, s_grades in subject_grades.items():
            scores = []
            for sg in s_grades:
                s = getattr(sg, "score", None)
                if s is None:
                    s = getattr(sg, "marks_obtained", None)
                if s is None:
                    s = getattr(sg, "percentage", None)
                if s is not None:
                    scores.append(s)

            if not scores:
                continue

            avg_score = round(sum(scores) / len(scores), 2)
            pass_count = len([s for s in scores if s >= 40])
            pass_rate = round((pass_count / len(scores) * 100) if scores else 0, 2)

            trend = "stable"
            if len(scores) >= 3:
                first_half = scores[:len(scores) // 2]
                second_half = scores[len(scores) // 2:]
                if first_half and second_half:
                    first_avg = sum(first_half) / len(first_half)
                    second_avg = sum(second_half) / len(second_half)
                    diff = second_avg - first_avg
                    if diff >= 5:
                        trend = "improving"
                    elif diff <= -5:
                        trend = "declining"

            subject_q = db.session.query(Subject).filter(Subject.id == subject_id)
            if tenant_id is not None and hasattr(Subject, 'tenant_id'):
                subject_q = subject_q.filter((Subject.tenant_id == tenant_id) | (Subject.tenant_id.is_(None)))
            subject = subject_q.first()
            subject_name = subject.name if subject else f"Subject {subject_id}"

            result.append({
                "subject_id": subject_id,
                "subject": subject_name,
                "avg_score": avg_score,
                "pass_rate": pass_rate,
                "trend": trend,
                "total_assessments": len(scores),
            })

        return jsonify({"success": True, "data": result}), 200
    except Exception as e:
        logger.error(f"Error in academics subject-comparison route: {str(e)}")
        return jsonify({"success": False, "message": str(e)}), 500
