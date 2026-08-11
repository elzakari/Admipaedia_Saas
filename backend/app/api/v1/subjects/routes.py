from flask import g, jsonify, request
from flask_jwt_extended import get_jwt_identity, jwt_required
from marshmallow import ValidationError

from app.api.v1.subjects import subjects_bp
from app.schemas.subject import (SubjectCreateSchema, SubjectListSchema,
                                 SubjectSchema, SubjectUpdateSchema)
from app.services.bulk_subject_service import BulkSubjectService
from app.services.subject_service import SubjectService
from app.utils.auth_utils import admin_required
from app.utils.rbac_decorators import require_permission
from app.utils.tenant_context import tenant_required

# Initialize schemas
subject_schema = SubjectSchema()
subject_create_schema = SubjectCreateSchema()
subject_update_schema = SubjectUpdateSchema()
subjects_schema = SubjectListSchema(many=True)


@subjects_bp.route("", methods=["GET"])
@subjects_bp.route("/", methods=["GET"])
@jwt_required()
@tenant_required
@require_permission("subject.read")
def get_subjects():
    """Get all subjects with pagination and filtering."""
    class_id = request.args.get("class_id", type=int)
    page = request.args.get("page", 1, type=int)
    per_page = request.args.get("per_page", 20, type=int)
    department = request.args.get("department", type=str)
    search = request.args.get("search", type=str)
    is_active = request.args.get(
        "is_active", type=lambda v: v.lower() == "true" if v else None
    )

    if class_id:
        try:
            from app.models.associations import class_subjects
            from app.models.subject import Subject

            # Query class_subjects table to find subjects explicitly mapped to class_id
            query = Subject.query.join(class_subjects).filter(
                class_subjects.c.class_id == class_id
            )
            if g.tenant_id is not None:
                query = query.filter(Subject.tenant_id == g.tenant_id)

            subjects_list = query.order_by(Subject.name).all()

            if subjects_list:
                return (
                    jsonify(
                        {
                            "success": True,
                            "subjects": subjects_schema.dump(subjects_list),
                            "pagination": {
                                "total": len(subjects_list),
                                "pages": 1,
                                "page": 1,
                                "per_page": len(subjects_list),
                                "next": None,
                                "prev": None,
                            },
                        }
                    ),
                    200,
                )
        except Exception:
            pass

    # Fallback to returning all active subjects if class_id query came back empty (or not provided but class_id was queried)
    if class_id:
        from app.models.subject import Subject

        query = Subject.query.filter_by(is_active=True)
        if g.tenant_id is not None:
            query = query.filter(Subject.tenant_id == g.tenant_id)
        if search:
            search_term = f"%{search.strip()}%"
            query = query.filter(
                (Subject.name.ilike(search_term))
                | (Subject.code.ilike(search_term))
                | (Subject.description.ilike(search_term))
            )
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
                        "per_page": len(subjects_list),
                        "next": None,
                        "prev": None,
                    },
                }
            ),
            200,
        )

    paginated_subjects = SubjectService.get_all_subjects(
        page,
        per_page,
        department,
        is_active,
        tenant_id=g.tenant_id,
        search=search,
    )

    return (
        jsonify(
            {
                "success": True,
                "subjects": subjects_schema.dump(paginated_subjects.items),
                "pagination": {
                    "total": paginated_subjects.total,
                    "pages": paginated_subjects.pages,
                    "page": paginated_subjects.page,
                    "per_page": paginated_subjects.per_page,
                    "next": paginated_subjects.next_num,
                    "prev": paginated_subjects.prev_num,
                },
            }
        ),
        200,
    )


@subjects_bp.route("/<int:subject_id>", methods=["GET"])
@jwt_required()
@tenant_required
@require_permission("subject.read")
def get_subject(subject_id):
    """Get a specific subject by ID."""
    subject = SubjectService.get_subject_by_id(subject_id, tenant_id=g.tenant_id)

    if not subject:
        return jsonify({"success": False, "message": "Subject not found"}), 404

    return jsonify({"success": True, "subject": subject_schema.dump(subject)}), 200


@subjects_bp.route("", methods=["POST"])
@subjects_bp.route("/", methods=["POST"])
@jwt_required()
@tenant_required
@require_permission("subject.create")
def create_subject():
    """Create a new subject.

    Robust flow:
      1. Validate the JSON payload with SubjectCreateSchema (code optional,
         unknown fields rejected via marshmallow unknown=RAISE on unknown=EXCLUDE
         via marshmallow defaults then overwritten to EXCLUDE to keep payloads
         ergonomic from rich UIs).
      2. Strip assigned_* arrays from the ORM payload; they are applied in a
         follow-up transactional pass AFTER the subject row is committed.
      3. Delegate creation + code auto-generation to SubjectService.
      4. If caller provided assigned_class_ids / assigned_teacher_ids:
         atomically apply them using SubjectService helpers (which internally
         perform tenant-scoped FK existence checks).
      5. Return a 400 with field-level ``errors`` on ValidationError, or a
         human ``message`` + optional ``assignments_report`` on service-level
         failures.
    """
    try:
        raw_payload = request.json or {}
        data = subject_create_schema.load(raw_payload)
    except ValidationError as err:
        return jsonify({"success": False, "errors": err.messages}), 400

    class_ids = list(data.pop("assigned_class_ids") or [])
    teacher_ids = list(data.pop("assigned_teacher_ids") or [])

    try:
        subject, error = SubjectService.create_subject(data, tenant_id=g.tenant_id)
        if error or subject is None:
            return jsonify({"success": False, "message": error or "Failed to create subject"}), 400

        assignments_report = None
        if class_ids or teacher_ids:
            assignments_report = {"classes": {"added": 0, "failed": []}, "teachers": {"added": 0, "failed": []}}
            for class_id in class_ids:
                try:
                    _sub, assign_err = SubjectService.assign_class(subject.id, class_id, tenant_id=g.tenant_id)
                    if assign_err:
                        assignments_report["classes"]["failed"].append(
                            {"id": class_id, "message": assign_err}
                        )
                    else:
                        assignments_report["classes"]["added"] += 1
                except Exception as exc:  # noqa: BLE001
                    assignments_report["classes"]["failed"].append(
                        {"id": class_id, "message": str(exc)}
                    )
            for teacher_id in teacher_ids:
                try:
                    _sub, assign_err = SubjectService.assign_teacher(
                        subject.id, teacher_id, is_primary=False, tenant_id=g.tenant_id
                    )
                    if assign_err:
                        assignments_report["teachers"]["failed"].append(
                            {"id": teacher_id, "message": assign_err}
                        )
                    else:
                        assignments_report["teachers"]["added"] += 1
                except Exception as exc:  # noqa: BLE001
                    assignments_report["teachers"]["failed"].append(
                        {"id": teacher_id, "message": str(exc)}
                    )
            # refresh subject once to pick up any newly-linked relations on dump
            subject = SubjectService.get_subject_by_id(subject.id, tenant_id=g.tenant_id) or subject

        payload = {
            "success": True,
            "message": "Subject created successfully",
            "subject": subject_schema.dump(subject),
        }
        if assignments_report is not None:
            payload["assignments_report"] = assignments_report
        return jsonify(payload), 201
    except ValidationError as err:
        return jsonify({"success": False, "errors": err.messages}), 400


@subjects_bp.route("/<int:subject_id>", methods=["PUT"])
@subjects_bp.route("/<int:subject_id>/", methods=["PUT"])
@jwt_required()
@tenant_required
@require_permission("subject.update")
def update_subject(subject_id):
    """Update an existing subject.

    Accepts ``assigned_class_ids`` / ``assigned_teacher_ids`` in the payload
    and applies them atomically against the existing linked sets using the
    service helpers, returning a summary report so UIs know exactly which
    links were added/failed (e.g. stale teacher IDs or archived classes).
    """
    try:
        raw_payload = request.json or {}
        data = subject_update_schema.load(raw_payload, partial=True)
    except ValidationError as err:
        return jsonify({"success": False, "errors": err.messages}), 400

    class_ids = list(data.pop("assigned_class_ids") or [])
    teacher_ids = list(data.pop("assigned_teacher_ids") or [])

    try:
        subject, error = SubjectService.update_subject(
            subject_id, data, tenant_id=g.tenant_id
        )
        if error or subject is None:
            return jsonify({"success": False, "message": error or "Failed to update subject"}), 400

        assignments_report = None
        if class_ids or teacher_ids:
            assignments_report = {"classes": {"added": 0, "removed": 0, "failed": []}, "teachers": {"added": 0, "removed": 0, "failed": []}}
            try:
                current = SubjectService.get_subject_by_id(subject.id, tenant_id=g.tenant_id) or subject
                existing_class_ids = {row.id for row in (getattr(current, "classes", None) or [])}
                existing_teacher_ids = {row.id for row in (getattr(current, "teachers", None) or [])}
                desired_class_ids = set(class_ids)
                desired_teacher_ids = set(teacher_ids)
                for class_id in desired_class_ids - existing_class_ids:
                    _sub, assign_err = SubjectService.assign_class(subject.id, class_id, tenant_id=g.tenant_id)
                    if assign_err:
                        assignments_report["classes"]["failed"].append({"id": class_id, "message": assign_err})
                    else:
                        assignments_report["classes"]["added"] += 1
                for class_id in existing_class_ids - desired_class_ids:
                    _sub, remove_err = SubjectService.remove_class(subject.id, class_id, tenant_id=g.tenant_id)
                    if remove_err:
                        assignments_report["classes"]["failed"].append({"id": class_id, "message": remove_err})
                    else:
                        assignments_report["classes"]["removed"] += 1
                for teacher_id in desired_teacher_ids - existing_teacher_ids:
                    _sub, assign_err = SubjectService.assign_teacher(
                        subject.id, teacher_id, is_primary=False, tenant_id=g.tenant_id
                    )
                    if assign_err:
                        assignments_report["teachers"]["failed"].append({"id": teacher_id, "message": assign_err})
                    else:
                        assignments_report["teachers"]["added"] += 1
                for teacher_id in existing_teacher_ids - desired_teacher_ids:
                    _sub, remove_err = SubjectService.remove_teacher(subject.id, teacher_id, tenant_id=g.tenant_id)
                    if remove_err:
                        assignments_report["teachers"]["failed"].append({"id": teacher_id, "message": remove_err})
                    else:
                        assignments_report["teachers"]["removed"] += 1
            except Exception as exc:  # noqa: BLE001
                assignments_report["classes"]["failed"].append({"message": str(exc)})
            subject = SubjectService.get_subject_by_id(subject.id, tenant_id=g.tenant_id) or subject

        payload = {
            "success": True,
            "message": "Subject updated successfully",
            "subject": subject_schema.dump(subject),
        }
        if assignments_report is not None:
            payload["assignments_report"] = assignments_report
        return jsonify(payload), 200
    except ValidationError as err:
        return jsonify({"success": False, "errors": err.messages}), 400


@subjects_bp.route("/<int:subject_id>", methods=["DELETE"])
@jwt_required()
@tenant_required
@admin_required
def delete_subject(subject_id):
    """Delete a subject."""
    # Check for force parameter
    force = request.args.get("force", "false").lower() == "true"

    if force:
        success, error = SubjectService.force_delete_subject(
            subject_id, tenant_id=g.tenant_id
        )
    else:
        success, error = SubjectService.delete_subject(
            subject_id, tenant_id=g.tenant_id
        )

    if error:
        return jsonify({"success": False, "message": error}), 400

    return jsonify({"success": True, "message": "Subject deleted successfully"}), 200


@subjects_bp.route("/<int:subject_id>/assign-teacher", methods=["PUT"])
@jwt_required()
@tenant_required
@admin_required
def assign_teacher(subject_id):
    """Assign a teacher to a subject."""
    try:
        teacher_id = request.json.get("teacher_id")
        is_primary = request.json.get("is_primary", False)

        if teacher_id is None:
            return jsonify({"success": False, "message": "Teacher ID is required"}), 400

        subject, error = SubjectService.assign_teacher(
            subject_id, teacher_id, is_primary, tenant_id=g.tenant_id
        )

        if error:
            return jsonify({"success": False, "message": error}), 400

        return (
            jsonify(
                {
                    "success": True,
                    "message": "Teacher assigned to subject successfully",
                    "subject": subject_schema.dump(subject),
                }
            ),
            200,
        )
    except ValidationError as err:
        return jsonify({"success": False, "errors": err.messages}), 400


@subjects_bp.route("/<int:subject_id>/remove-teacher", methods=["PUT"])
@jwt_required()
@tenant_required
@admin_required
def remove_teacher(subject_id):
    """Remove a teacher from a subject."""
    try:
        teacher_id = request.json.get("teacher_id")

        if teacher_id is None:
            return jsonify({"success": False, "message": "Teacher ID is required"}), 400

        subject, error = SubjectService.remove_teacher(
            subject_id, teacher_id, tenant_id=g.tenant_id
        )

        if error:
            return jsonify({"success": False, "message": error}), 400

        return (
            jsonify(
                {
                    "success": True,
                    "message": "Teacher removed from subject successfully",
                    "subject": subject_schema.dump(subject),
                }
            ),
            200,
        )
    except ValidationError as err:
        return jsonify({"success": False, "errors": err.messages}), 400


@subjects_bp.route("/<int:subject_id>/assign-class", methods=["PUT"])
@jwt_required()
@tenant_required
@admin_required
def assign_class(subject_id):
    """Assign a class to a subject."""
    try:
        class_id = request.json.get("class_id")
        if class_id is None:
            return jsonify({"success": False, "message": "Class ID is required"}), 400

        subject, error = SubjectService.assign_class(
            subject_id, class_id, tenant_id=g.tenant_id
        )

        if error:
            return jsonify({"success": False, "message": error}), 400

        return (
            jsonify(
                {
                    "success": True,
                    "message": "Class assigned to subject successfully",
                    "subject": subject_schema.dump(subject),
                }
            ),
            200,
        )
    except ValidationError as err:
        return jsonify({"success": False, "errors": err.messages}), 400


@subjects_bp.route("/<int:subject_id>/remove-class", methods=["PUT"])
@jwt_required()
@tenant_required
@admin_required
def remove_class(subject_id):
    """Remove a class from a subject."""
    try:
        class_id = request.json.get("class_id")
        if class_id is None:
            return jsonify({"success": False, "message": "Class ID is required"}), 400

        subject, error = SubjectService.remove_class(
            subject_id, class_id, tenant_id=g.tenant_id
        )

        if error:
            return jsonify({"success": False, "message": error}), 400

        return (
            jsonify(
                {
                    "success": True,
                    "message": "Class removed from subject successfully",
                    "subject": subject_schema.dump(subject),
                }
            ),
            200,
        )
    except ValidationError as err:
        return jsonify({"success": False, "errors": err.messages}), 400


@subjects_bp.route("/teacher/<int:teacher_id>", methods=["GET"])
@jwt_required()
@tenant_required
@require_permission("subject.read")
def get_subjects_by_teacher(teacher_id):
    """Get subjects taught by a specific teacher."""
    page = request.args.get("page", 1, type=int)
    per_page = request.args.get("per_page", 20, type=int)

    paginated_subjects = SubjectService.get_subjects_by_teacher(
        teacher_id, page, per_page, tenant_id=g.tenant_id
    )

    if paginated_subjects is None:
        return jsonify({"success": False, "message": "Teacher not found"}), 404

    return (
        jsonify(
            {
                "success": True,
                "subjects": subjects_schema.dump(paginated_subjects.items),
                "pagination": {
                    "total": paginated_subjects.total,
                    "pages": paginated_subjects.pages,
                    "page": paginated_subjects.page,
                    "per_page": paginated_subjects.per_page,
                    "next": paginated_subjects.next_num,
                    "prev": paginated_subjects.prev_num,
                },
            }
        ),
        200,
    )


@subjects_bp.route("/class/<int:class_id>", methods=["GET"])
@jwt_required()
@tenant_required
@require_permission("subject.read")
def get_subjects_by_class(class_id):
    """Get subjects taught in a specific class."""
    page = request.args.get("page", 1, type=int)
    per_page = request.args.get("per_page", 20, type=int)

    paginated_subjects = SubjectService.get_subjects_by_class(
        class_id, page, per_page, tenant_id=g.tenant_id
    )

    if paginated_subjects is None:
        return jsonify({"success": False, "message": "Class not found"}), 404

    return (
        jsonify(
            {
                "success": True,
                "subjects": subjects_schema.dump(paginated_subjects.items),
                "pagination": {
                    "total": paginated_subjects.total,
                    "pages": paginated_subjects.pages,
                    "page": paginated_subjects.page,
                    "per_page": paginated_subjects.per_page,
                    "next": paginated_subjects.next_num,
                    "prev": paginated_subjects.prev_num,
                },
            }
        ),
        200,
    )


@subjects_bp.route("/bulk-delete", methods=["POST"])
@jwt_required()
@tenant_required
@admin_required
def bulk_delete_subjects():
    """Delete multiple subjects in bulk."""
    try:
        data = request.get_json()
        subject_ids = data.get("subject_ids", [])

        if not subject_ids:
            return (
                jsonify({"success": False, "message": "No subject IDs provided"}),
                400,
            )

        if not isinstance(subject_ids, list):
            return (
                jsonify({"success": False, "message": "subject_ids must be a list"}),
                400,
            )

        user_id = get_jwt_identity()
        success, results = BulkSubjectService.bulk_delete_subjects(
            subject_ids, user_id, tenant_id=g.tenant_id
        )

        if success:
            successful_deletes = [r for r in results if r["success"]]
            failed_deletes = [r for r in results if not r["success"]]

            return (
                jsonify(
                    {
                        "success": True,
                        "message": f"Successfully deleted {len(successful_deletes)} subjects",
                        "results": {
                            "successful": len(successful_deletes),
                            "failed": len(failed_deletes),
                            "details": results,
                        },
                    }
                ),
                200,
            )
        else:
            return (
                jsonify(
                    {"success": False, "message": f"Bulk deletion failed: {results}"}
                ),
                500,
            )

    except Exception as e:
        return (
            jsonify(
                {"success": False, "message": f"Error processing bulk delete: {str(e)}"}
            ),
            500,
        )


@subjects_bp.route("", methods=["OPTIONS"])
@subjects_bp.route("/", methods=["OPTIONS"])
def handle_options():
    """Handle preflight OPTIONS requests."""
    return "", 200
