from flask import g, jsonify, request
from flask_jwt_extended import get_jwt_identity, jwt_required

from app.extensions import db
from app.models.stem_curriculum import (
    STEMDomain,
    STEMLearningModule,
    STEMProject,
    STEMSubject,
)
from app.models.subject import Subject
from app.utils.rbac_decorators import require_role

from . import stem_bp


@stem_bp.route("/domains", methods=["GET"])
@jwt_required()
def get_stem_domains():
    """Return active global STEM-domain lookup values."""
    try:
        domains = STEMDomain.query.filter_by(is_active=True).all()
        return (
            jsonify(
                {
                    "success": True,
                    "data": [
                        {
                            "id": domain.id,
                            "name": domain.name,
                            "code": domain.code,
                            "description": domain.description,
                            "color_code": domain.color_code,
                        }
                        for domain in domains
                    ],
                }
            ),
            200,
        )
    except Exception as exc:
        return jsonify({"success": False, "message": str(exc)}), 500


@stem_bp.route("/subjects/<int:educational_level_id>", methods=["GET"])
@jwt_required()
def get_stem_subjects(educational_level_id):
    """Return STEM subjects belonging to the active tenant."""
    try:
        tenant_id = getattr(g, "tenant_id", None)
        if not tenant_id:
            return (
                jsonify({"success": False, "message": "Tenant context required"}),
                403,
            )

        subjects = (
            STEMSubject.query.join(
                Subject,
                STEMSubject.subject_id == Subject.id,
            )
            .filter(
                STEMSubject.educational_level_id == educational_level_id,
                STEMSubject.is_active.is_(True),
                Subject.tenant_id == tenant_id,
            )
            .all()
        )

        return (
            jsonify(
                {
                    "success": True,
                    "data": [
                        {
                            "id": stem_subject.id,
                            "subject_name": stem_subject.subject.name,
                            "stem_domain": (
                                stem_subject.stem_domain_ref.name
                                if stem_subject.stem_domain_ref
                                else None
                            ),
                            "integration_level": stem_subject.integration_level,
                            "practical_hours_per_week": (
                                stem_subject.practical_hours_per_week
                            ),
                            "theory_hours_per_week": (
                                stem_subject.theory_hours_per_week
                            ),
                        }
                        for stem_subject in subjects
                    ],
                }
            ),
            200,
        )
    except Exception as exc:
        return jsonify({"success": False, "message": str(exc)}), 500


@stem_bp.route("/projects", methods=["POST"])
@jwt_required()
@require_role(["admin", "school_admin", "super_admin", "teacher"])
def create_stem_project():
    """Create a tenant-owned STEM project for an existing learning module."""
    try:
        data = request.get_json() or {}

        required_fields = [
            "learning_module_id",
            "title",
            "description",
            "problem_statement",
            "duration_days",
        ]
        missing = [
            field
            for field in required_fields
            if data.get(field) is None or data.get(field) == ""
        ]
        if missing:
            return (
                jsonify(
                    {
                        "success": False,
                        "message": "Missing required fields",
                        "errors": missing,
                    }
                ),
                400,
            )

        tenant_id = getattr(g, "tenant_id", None)
        if not tenant_id:
            return (
                jsonify({"success": False, "message": "Tenant context required"}),
                403,
            )

        module = STEMLearningModule.query.get(data["learning_module_id"])
        if not module or not module.is_active:
            return (
                jsonify({"success": False, "message": "STEM learning module not found"}),
                404,
            )

        stem_subject = module.stem_subject
        subject = stem_subject.subject if stem_subject else None
        if (
            not subject
            or not subject.tenant_id
            or str(subject.tenant_id) != str(tenant_id)
        ):
            # Fail closed without revealing foreign-tenant module existence.
            return (
                jsonify({"success": False, "message": "STEM learning module not found"}),
                404,
            )

        try:
            duration_days = int(data["duration_days"])
            max_group_size = int(data.get("max_group_size", 4))
        except (TypeError, ValueError):
            return (
                jsonify(
                    {
                        "success": False,
                        "message": "duration_days and max_group_size must be integers",
                    }
                ),
                400,
            )

        if duration_days <= 0 or max_group_size <= 0:
            return (
                jsonify(
                    {
                        "success": False,
                        "message": "duration_days and max_group_size must be positive",
                    }
                ),
                400,
            )

        project = STEMProject(
            learning_module_id=module.id,
            title=str(data["title"]).strip(),
            description=str(data["description"]).strip(),
            problem_statement=str(data["problem_statement"]).strip(),
            is_individual=bool(data.get("is_individual", False)),
            is_group=bool(data.get("is_group", True)),
            max_group_size=max_group_size,
            duration_days=duration_days,
            milestones=data.get("milestones"),
            required_resources=data.get("required_resources"),
            expected_deliverables=data.get("expected_deliverables"),
            evaluation_criteria=data.get("evaluation_criteria"),
            industry_connections=data.get("industry_connections"),
            community_impact=data.get("community_impact"),
            sustainability_focus=bool(
                data.get("sustainability_focus", False)
            ),
            difficulty_level=data.get("difficulty_level", "Intermediate"),
            created_by=int(get_jwt_identity()),
        )

        db.session.add(project)
        db.session.commit()

        return (
            jsonify(
                {
                    "success": True,
                    "message": "STEM project created successfully",
                    "data": {"id": project.id},
                }
            ),
            201,
        )

    except Exception as exc:
        db.session.rollback()
        return jsonify({"success": False, "message": str(exc)}), 500
