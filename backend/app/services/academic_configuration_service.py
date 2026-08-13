from __future__ import annotations

from datetime import date, datetime
from typing import Any, Dict, List, Optional, Tuple

from app.extensions import db, logger
from app.models import (EducationalSystemConfig, GradeBoundary, GradeLevel,
                        GradingScheme, GradingStandard, TenantAcademicSettings)
from app.models.academic_calendar import AcademicYear, Term
from app.models.academic_term import AcademicTerm
from app.models.system_setting import SystemSetting
from app.services.academic_term_service import AcademicTermService

DEFAULT_ASSESSMENT_TYPES = [
    {
        "id": "1",
        "name": "Exams",
        "weight": 40,
        "description": "Major examinations",
        "isActive": True,
    },
    {
        "id": "2",
        "name": "Assignments",
        "weight": 20,
        "description": "Homework and assignments",
        "isActive": True,
    },
    {
        "id": "3",
        "name": "Quizzes",
        "weight": 15,
        "description": "Short tests and quizzes",
        "isActive": True,
    },
    {
        "id": "4",
        "name": "Projects",
        "weight": 15,
        "description": "Research and practical projects",
        "isActive": True,
    },
    {
        "id": "5",
        "name": "Class Participation",
        "weight": 10,
        "description": "Student participation in class",
        "isActive": True,
    },
]


class AcademicConfigurationService:
    @staticmethod
    def _defaults() -> Dict[str, Any]:
        return {
            "academicYear": "2024/2025",
            "currentTerm": "First Term",
            "termStartDate": "",
            "termEndDate": "",
            "gradingSystem": "GES",
            "passingGrade": 50,
            "maxGrade": 100,
            "gradeScale": [],
            "finalGradeWeights": {"class_score_weight": 40, "external_exam_weight": 60},
            "assessmentTypes": DEFAULT_ASSESSMENT_TYPES,
            "assessmentWeights": {
                "exams": 40,
                "assignments": 20,
                "quizzes": 15,
                "projects": 15,
                "classParticipation": 10,
                "attendance": 0,
            },
            "maxStudentsPerClass": 40,
            "minStudentsPerClass": 15,
            "classDuration": 60,
            "breakDuration": 15,
            "coreSubjects": [],
            "electiveSubjects": [],
            "attendanceRequired": True,
            "minimumAttendance": 75,
            "onlineExamsEnabled": True,
            "gradeModeration": True,
            "parentPortalGrades": True,
            "transcriptGeneration": True,
        }

    @staticmethod
    def get_tenant_settings(tenant_id) -> Dict[str, Any]:
        record = TenantAcademicSettings.query.filter_by(tenant_id=tenant_id).first()
        if record and isinstance(record.settings, dict):
            return dict(record.settings)

        legacy = SystemSetting.query.filter_by(key="academic.settings").first()
        if legacy and legacy.setting_type == "json":
            try:
                import json

                decoded = json.loads(legacy.value or "{}")
                if isinstance(decoded, dict):
                    try:
                        db.session.add(
                            TenantAcademicSettings(
                                tenant_id=tenant_id, settings=decoded
                            )
                        )
                        db.session.commit()
                    except Exception:
                        db.session.rollback()
                    return decoded
            except Exception:
                return {}
        school_key_map = {
            "school.academicYear": "academicYear",
            "school.currentTerm": "currentTerm",
            "school.gradingSystem": "gradingSystem",
            "school.passingGrade": "passingGrade",
            "school.maxGrade": "maxGrade",
            "school.maxStudentsPerClass": "maxStudentsPerClass",
        }
        out: Dict[str, Any] = {}
        for legacy_key, new_key in school_key_map.items():
            value = SystemSetting.get_value(legacy_key, None)
            if value is None:
                continue
            try:
                if new_key in {"passingGrade", "maxGrade", "maxStudentsPerClass"}:
                    value = int(value)
            except Exception:
                pass
            out[new_key] = value
        return out

    @staticmethod
    def sync_academic_entities_from_settings(
        tenant_id, payload: dict
    ) -> Tuple[Optional[AcademicYear], Optional[Term], Optional[AcademicTerm]]:
        try:
            stored = AcademicConfigurationService.get_tenant_settings(tenant_id) or {}
            merged = {**stored, **(payload or {})}

            academic_year_name = str(merged.get("academicYear") or "").strip()
            current_term_name = str(merged.get("currentTerm") or "").strip()
            term_start_raw = merged.get("termStartDate") or ""
            term_end_raw = merged.get("termEndDate") or ""

            term_start_date = None
            term_end_date = None
            if isinstance(term_start_raw, str) and term_start_raw:
                try:
                    term_start_date = datetime.strptime(term_start_raw, "%Y-%m-%d").date()
                except Exception:
                    term_start_date = None
            if isinstance(term_end_raw, str) and term_end_raw:
                try:
                    term_end_date = datetime.strptime(term_end_raw, "%Y-%m-%d").date()
                except Exception:
                    term_end_date = None

            start_year = None
            end_year = None
            if academic_year_name and "/" in academic_year_name:
                parts = academic_year_name.split("/", 1)
                try:
                    start_year = int(parts[0].strip())
                    end_year = int(parts[1].strip())
                except Exception:
                    start_year = None
                    end_year = None
            if start_year is None or end_year is None:
                today_y = date.today().year
                start_year = today_y
                end_year = today_y + 1

            default_year_start = date(start_year, 9, 1)
            default_year_end = date(end_year, 8, 31)
            default_term_start = default_year_start
            default_term_end = date(start_year, 12, 31)

            if term_start_date is None:
                term_start_date = default_term_start
            if term_end_date is None:
                term_end_date = default_term_end

            academic_year_obj = None
            if academic_year_name:
                existing_ay = None
                for ay in AcademicYear.query.all():
                    if ay.name and ay.name.lower() == academic_year_name.lower():
                        existing_ay = ay
                        break
                if existing_ay is None:
                    academic_year_obj = AcademicYear(
                        name=academic_year_name,
                        start_date=default_year_start,
                        end_date=default_year_end,
                        is_current=True,
                    )
                    db.session.add(academic_year_obj)
                    db.session.flush()
                else:
                    academic_year_obj = existing_ay
                    needs_update = False
                    if term_start_date and term_end_date:
                        if (
                            academic_year_obj.start_date is None
                            or academic_year_obj.end_date is None
                            or academic_year_obj.start_date != term_start_date
                            or academic_year_obj.end_date != term_end_date
                        ):
                            if term_start_date and term_end_date and term_start_date < term_end_date:
                                if (
                                    academic_year_obj.start_date is None
                                    or academic_year_obj.end_date is None
                                ):
                                    academic_year_obj.start_date = (
                                        academic_year_obj.start_date or default_year_start
                                    )
                                    academic_year_obj.end_date = (
                                        academic_year_obj.end_date or default_year_end
                                    )
                                    needs_update = True
                                else:
                                    if (
                                        academic_year_obj.start_date != term_start_date
                                        and academic_year_obj.start_date == default_year_start
                                    ):
                                        academic_year_obj.start_date = term_start_date
                                        needs_update = True
                                    if (
                                        academic_year_obj.end_date != term_end_date
                                        and academic_year_obj.end_date == default_year_end
                                    ):
                                        academic_year_obj.end_date = term_end_date
                                        needs_update = True
                                    if (
                                        academic_year_obj.start_date != term_start_date
                                        or academic_year_obj.end_date != term_end_date
                                    ):
                                        span_start = min(
                                            academic_year_obj.start_date, term_start_date
                                        )
                                        span_end = max(
                                            academic_year_obj.end_date, term_end_date
                                        )
                                        if span_start != academic_year_obj.start_date:
                                            academic_year_obj.start_date = span_start
                                            needs_update = True
                                        if span_end != academic_year_obj.end_date:
                                            academic_year_obj.end_date = span_end
                                            needs_update = True

                for ay in AcademicYear.query.all():
                    ay.is_current = False
                if academic_year_obj is not None:
                    academic_year_obj.is_current = True

            term_obj = None
            if academic_year_obj is not None and current_term_name:
                normalized_term = current_term_name.strip()
                existing_term = None
                for t in Term.query.filter_by(
                    academic_year_id=academic_year_obj.id
                ).all():
                    if t.name and t.name.strip() == normalized_term:
                        existing_term = t
                        break
                if existing_term is None:
                    term_obj = Term(
                        name=normalized_term,
                        academic_year_id=academic_year_obj.id,
                        start_date=term_start_date,
                        end_date=term_end_date,
                        is_current=True,
                    )
                    db.session.add(term_obj)
                    db.session.flush()
                else:
                    term_obj = existing_term
                    t_needs_update = False
                    if (
                        term_obj.start_date is None
                        or term_obj.start_date != term_start_date
                    ):
                        term_obj.start_date = term_start_date
                        t_needs_update = True
                    if (
                        term_obj.end_date is None
                        or term_obj.end_date != term_end_date
                    ):
                        term_obj.end_date = term_end_date
                        t_needs_update = True

                for t in Term.query.all():
                    t.is_current = False
                if term_obj is not None:
                    term_obj.is_current = True

            db.session.flush()

            academic_term_obj = None
            try:
                calendar_terms = AcademicTermService.list_terms(tenant_id) or []
                found_ct = None
                for ct in calendar_terms:
                    if ct.name and ct.name.strip() == (current_term_name or "").strip():
                        found_ct = ct
                        break
                if found_ct is None:
                    if current_term_name:
                        academic_term_obj = AcademicTermService.create_term(
                            tenant_id,
                            current_term_name.strip(),
                            term_start_date,
                            term_end_date,
                        )
                else:
                    needs_ct_update = False
                    if found_ct.start_date != term_start_date:
                        needs_ct_update = True
                    if found_ct.end_date != term_end_date:
                        needs_ct_update = True
                    if needs_ct_update:
                        academic_term_obj = AcademicTermService.update_term(
                            found_ct.id,
                            tenant_id,
                            start_date=term_start_date,
                            end_date=term_end_date,
                        )
                    else:
                        academic_term_obj = found_ct
            except Exception as ct_err:
                logger.exception(
                    f"sync_academic_entities_from_settings: academic_terms sync failed: {ct_err}"
                )

            db.session.commit()
            return (academic_year_obj, term_obj, academic_term_obj)
        except Exception as e:
            logger.exception(
                f"sync_academic_entities_from_settings failed: {e}"
            )
            try:
                db.session.rollback()
            except Exception:
                pass
            return (None, None, None)

    @staticmethod
    def upsert_tenant_settings(tenant_id, payload: Dict[str, Any]) -> None:
        if not isinstance(payload, dict):
            payload = {}

        AcademicConfigurationService.sync_academic_entities_from_settings(tenant_id, payload)

        sanitized = dict(payload)
        for computed_key in ("educationSystem", "gradeLevels", "academicTerms"):
            sanitized.pop(computed_key, None)

        record = TenantAcademicSettings.query.filter_by(tenant_id=tenant_id).first()
        if record:
            record.settings = sanitized or {}
        else:
            record = TenantAcademicSettings(
                tenant_id=tenant_id, settings=sanitized or {}
            )
            db.session.add(record)

        # Update Tenant education system settings and EducationalSystemConfig on grading system update
        grading_system = payload.get("gradingSystem")
        if grading_system:
            from app.models.educational_system import EducationalSystemConfig
            from app.models.tenant import Tenant

            tenant = Tenant.query.get(tenant_id)
            if tenant:
                tenant_settings = (
                    dict(tenant.settings) if isinstance(tenant.settings, dict) else {}
                )
                tenant_settings["education_system"] = grading_system
                tenant_settings["educational_system"] = grading_system
                tenant.settings = tenant_settings

                cfg = EducationalSystemConfig.query.filter_by(
                    tenant_id=tenant_id, is_active=True
                ).first()
                if cfg:
                    cfg.template_key = grading_system
                else:
                    cfg = EducationalSystemConfig(
                        tenant_id=tenant_id, template_key=grading_system, is_active=True
                    )
                    db.session.add(cfg)

        db.session.commit()

    @staticmethod
    def _education_system_defaults(tenant_id) -> Dict[str, Any]:
        cfg = EducationalSystemConfig.query.filter_by(
            tenant_id=tenant_id, is_active=True
        ).first()
        if not cfg or not isinstance(cfg.config, dict):
            return {}

        grading = cfg.config.get("grading") if isinstance(cfg.config, dict) else None
        if not isinstance(grading, dict):
            return {}

        defaults: Dict[str, Any] = {}

        grade_scale: List[Dict[str, Any]] = []
        max_grade = 100
        passing = None

        schemes = grading.get("schemes")
        if isinstance(schemes, list):
            for s in schemes:
                if not isinstance(s, dict):
                    continue
                try:
                    min_v = float(s.get("min"))
                    max_v = float(s.get("max"))
                except Exception:
                    continue
                grade_scale.append(
                    {
                        "grade": s.get("name"),
                        "minScore": min_v,
                        "maxScore": max_v,
                        "description": s.get("description") or s.get("name"),
                        "gradePoint": s.get("point"),
                    }
                )

        bands = grading.get("bands")
        if isinstance(bands, list) and not grade_scale:
            try:
                max_grade = int(float((grading.get("scale") or "0-20").split("-")[-1]))
            except Exception:
                max_grade = 20
            try:
                passing = (
                    float(grading.get("pass_mark"))
                    if grading.get("pass_mark") is not None
                    else None
                )
            except Exception:
                passing = None
            for b in bands:
                if not isinstance(b, dict):
                    continue
                try:
                    min_v = float(b.get("min"))
                    max_v = float(b.get("max"))
                except Exception:
                    continue
                grade_scale.append(
                    {
                        "grade": b.get("name"),
                        "minScore": min_v,
                        "maxScore": max_v,
                        "description": b.get("name"),
                        "gradePoint": None,
                    }
                )

        levels = grading.get("levels")
        if isinstance(levels, list) and not grade_scale:
            for l in levels:
                if not isinstance(l, dict):
                    continue
                try:
                    min_v = float(l.get("min"))
                    max_v = float(l.get("max"))
                except Exception:
                    try:
                        rng = str(l.get("range") or "")
                        parts = [p.strip() for p in rng.split("-", 1)]
                        min_v = float(parts[0])
                        max_v = float(parts[1])
                    except Exception:
                        continue
                grade_scale.append(
                    {
                        "grade": l.get("code") or l.get("name"),
                        "minScore": min_v,
                        "maxScore": max_v,
                        "description": l.get("name"),
                        "gradePoint": None,
                    }
                )

        if grade_scale:
            defaults["gradeScale"] = grade_scale

        if passing is not None:
            defaults["passingGrade"] = passing

        defaults["maxGrade"] = max_grade

        weights = (
            cfg.config.get("assessments") if isinstance(cfg.config, dict) else None
        )
        if isinstance(weights, dict):
            class_w = weights.get(
                "class_score_weight",
                weights.get("continuous_assessment_weight", weights.get("ca_weight")),
            )
            exam_w = weights.get(
                "external_exam_weight",
                weights.get("exam_weight", weights.get("exam_score_weight")),
            )
            try:
                class_w_val = float(class_w) if class_w is not None else None
                exam_w_val = float(exam_w) if exam_w is not None else None
                if class_w_val is not None and exam_w_val is not None:
                    defaults["finalGradeWeights"] = {
                        "class_score_weight": class_w_val,
                        "external_exam_weight": exam_w_val,
                    }
            except Exception:
                pass

        if cfg.template_key:
            defaults["gradingSystem"] = cfg.template_key

        return defaults

    @staticmethod
    def _grade_levels(tenant_id) -> List[Dict[str, Any]]:
        cfg = EducationalSystemConfig.query.filter_by(
            tenant_id=tenant_id, is_active=True
        ).first()
        if not cfg:
            return []
        rows = (
            GradeLevel.query.filter_by(
                tenant_id=tenant_id, educational_system_id=cfg.id
            )
            .order_by(GradeLevel.order_index.asc())
            .all()
        )
        return [
            {
                "id": str(r.id),
                "name": r.name,
                "order_index": r.order_index,
                "is_terminal": bool(r.is_terminal),
                "next_level_id": str(r.next_level_id) if r.next_level_id else None,
            }
            for r in rows
        ]

    @staticmethod
    def _terms(tenant_id) -> List[Dict[str, Any]]:
        rows = (
            AcademicTerm.query.filter_by(tenant_id=tenant_id)
            .order_by(AcademicTerm.start_date.asc())
            .all()
        )
        return [
            {
                "id": str(r.id),
                "name": r.name,
                "start_date": r.start_date.isoformat(),
                "end_date": r.end_date.isoformat(),
            }
            for r in rows
        ]

    @staticmethod
    def _education_system_meta(tenant_id) -> Dict[str, Any]:
        cfg = EducationalSystemConfig.query.filter_by(
            tenant_id=tenant_id, is_active=True
        ).first()
        if not cfg:
            return {"enabled": False}
        meta = {
            "enabled": True,
            "template_key": cfg.template_key,
            "name": cfg.name,
        }
        try:
            cc = (cfg.template_key or "").split("_", 1)[0]
            meta["country_code"] = cc if cc else None
        except Exception:
            meta["country_code"] = None
        return meta

    @staticmethod
    def build_harmonized_config(tenant_id) -> Dict[str, Any]:
        defaults = AcademicConfigurationService._defaults()
        edu_defaults = AcademicConfigurationService._education_system_defaults(
            tenant_id
        )
        stored = AcademicConfigurationService.get_tenant_settings(tenant_id)

        config = {**defaults, **(edu_defaults or {}), **(stored or {})}

        grade_scale_fallback = (
            stored.get("grade_scale") if isinstance(stored, dict) else None
        )
        if not isinstance(config.get("gradeScale"), list):
            config["gradeScale"] = (
                grade_scale_fallback
                if isinstance(grade_scale_fallback, list)
                else defaults["gradeScale"]
            )
        elif (
            len(config.get("gradeScale") or []) == 0
            and isinstance(grade_scale_fallback, list)
            and len(grade_scale_fallback) > 0
        ):
            config["gradeScale"] = grade_scale_fallback

        config["educationSystem"] = AcademicConfigurationService._education_system_meta(
            tenant_id
        )
        config["gradeLevels"] = AcademicConfigurationService._grade_levels(tenant_id)
        config["academicTerms"] = AcademicConfigurationService._terms(tenant_id)

        return config

    @staticmethod
    def sync_grading_scheme_from_config(tenant_id, config: Dict[str, Any]) -> None:
        grade_scale = config.get("gradeScale")
        if not isinstance(grade_scale, list) or len(grade_scale) == 0:
            return

        passing_grade = config.get("passingGrade")
        try:
            passing_grade = float(passing_grade)
        except Exception:
            passing_grade = 50.0

        scheme = GradingScheme.query.filter_by(
            tenant_id=tenant_id, is_default=True
        ).first()
        if not scheme:
            scheme = GradingScheme(
                tenant_id=tenant_id,
                name="Tenant Default",
                standard=GradingStandard.INTERNAL_EXAM,
                is_active=True,
                is_default=True,
                description="Tenant-scoped grading scheme (auto-synced from Academic Configuration)",
            )
            db.session.add(scheme)
            db.session.flush()
        else:
            scheme.is_active = True

        weights = config.get("finalGradeWeights")
        if isinstance(weights, dict):
            try:
                class_w = float(weights.get("class_score_weight"))
                external_w = float(weights.get("external_exam_weight"))
                scheme.class_score_weight = class_w
                scheme.external_exam_weight = external_w
            except Exception:
                pass

        GradeBoundary.query.filter_by(grading_scheme_id=scheme.id).delete(
            synchronize_session="fetch"
        )

        for idx, g in enumerate(grade_scale):
            if not isinstance(g, dict):
                continue
            symbol = g.get("grade") or g.get("grade_symbol") or g.get("symbol")
            if not symbol:
                continue
            try:
                min_score = float(g.get("minScore", g.get("min_score")))
                max_score = float(g.get("maxScore", g.get("max_score")))
            except Exception:
                continue
            name = g.get("description") or g.get("grade_name")
            gp = g.get("gradePoint", g.get("grade_points"))
            try:
                gp_val = float(gp) if gp is not None and gp != "" else None
            except Exception:
                gp_val = None

            boundary = GradeBoundary(
                grading_scheme_id=scheme.id,
                grade_symbol=str(symbol),
                grade_name=str(name) if name is not None else None,
                min_score=min_score,
                max_score=max_score,
                is_passing=max_score >= passing_grade,
                grade_points=gp_val,
                sequence_order=idx + 1,
            )
            db.session.add(boundary)

        db.session.commit()
        db.session.expire(scheme)

    @staticmethod
    def get_canonical_setup(tenant_id) -> dict:
        settings_dict = AcademicConfigurationService.build_harmonized_config(tenant_id)

        s_academicYear = settings_dict.get("academicYear")
        s_currentTerm = settings_dict.get("currentTerm")
        s_termStartDate = settings_dict.get("termStartDate")
        s_termEndDate = settings_dict.get("termEndDate")

        academic_year = None
        if s_academicYear:
            for ay in AcademicYear.query.all():
                if ay.name and ay.name.lower() == s_academicYear.lower():
                    academic_year = ay
                    break
        if academic_year is None:
            academic_year = AcademicYear.query.filter_by(is_current=True).first()
        if academic_year is None:
            academic_year = AcademicYear.query.order_by(
                AcademicYear.start_date.desc()
            ).first()

        current_term = Term.query.filter_by(is_current=True).first()
        if current_term is None and academic_year is not None:
            current_term = (
                academic_year.terms.order_by(Term.start_date.asc()).first()
            )
        if current_term is None:
            current_term = Term.query.order_by(Term.end_date.desc()).first()

        academic_years = [
            ay for ay in AcademicYear.query.order_by(AcademicYear.start_date.desc()).all()
        ]

        terms = []
        if academic_year is not None:
            terms = list(academic_year.terms.order_by(Term.start_date.asc()).all())

        calendar_terms_raw = AcademicTermService.list_terms(tenant_id) or []
        calendar_terms = []
        for t in calendar_terms_raw:
            status = AcademicTermService.compute_status(t)
            calendar_terms.append(
                {
                    "id": int(t.id) if t.id is not None else None,
                    "name": t.name,
                    "start_date": t.start_date.isoformat() if t.start_date else None,
                    "end_date": t.end_date.isoformat() if t.end_date else None,
                    "status": status,
                }
            )

        calendar_current = None
        for ct in calendar_terms:
            if ct.get("status") == "Current":
                calendar_current = ct
                break
        if calendar_current is None and current_term is not None:
            for ct in calendar_terms:
                if ct.get("name") == current_term.name:
                    calendar_current = ct
                    break

        today = date.today()
        daysIntoTerm = None
        daysRemainingInTerm = None
        weeksRemaining = None
        progressPercent = 0.0
        if current_term is not None and current_term.start_date and current_term.end_date:
            total_days = (current_term.end_date - current_term.start_date).days
            if current_term.start_date <= today <= current_term.end_date:
                daysIntoTerm = (today - current_term.start_date).days + 1
                daysRemainingInTerm = (current_term.end_date - today).days
                weeksRemaining = daysRemainingInTerm // 7
                if total_days > 0:
                    progressPercent = round((daysIntoTerm / total_days) * 100, 2)
            elif today < current_term.start_date:
                daysIntoTerm = 0
                daysRemainingInTerm = (current_term.end_date - current_term.start_date).days
                weeksRemaining = daysRemainingInTerm // 7
                progressPercent = 0.0
            else:
                daysIntoTerm = total_days + 1 if total_days >= 0 else 0
                daysRemainingInTerm = 0
                weeksRemaining = 0
                progressPercent = 100.0

        canonical_ay_name = academic_year.name if academic_year else None
        canonical_term_name = current_term.name if current_term else None
        canonical_term_start = (
            current_term.start_date.isoformat()
            if current_term and current_term.start_date
            else ""
        )
        canonical_term_end = (
            current_term.end_date.isoformat()
            if current_term and current_term.end_date
            else ""
        )

        mismatchDetected = False
        suggestedSettingsPatch = {}

        stored_ay = (s_academicYear or "").strip() if isinstance(s_academicYear, str) else ""
        canonical_ay_str = (canonical_ay_name or "").strip() if isinstance(canonical_ay_name, str) else ""
        if stored_ay and canonical_ay_str and stored_ay != canonical_ay_str:
            mismatchDetected = True
            suggestedSettingsPatch["academicYear"] = canonical_ay_str

        stored_ct = (s_currentTerm or "").strip() if isinstance(s_currentTerm, str) else ""
        canonical_ct_str = (canonical_term_name or "").strip() if isinstance(canonical_term_name, str) else ""
        if stored_ct and canonical_ct_str and stored_ct != canonical_ct_str:
            mismatchDetected = True
            suggestedSettingsPatch["currentTerm"] = canonical_ct_str

        stored_ts = s_termStartDate if isinstance(s_termStartDate, str) else ""
        if canonical_term_start and stored_ts and stored_ts != canonical_term_start:
            mismatchDetected = True
            suggestedSettingsPatch["termStartDate"] = canonical_term_start

        stored_te = s_termEndDate if isinstance(s_termEndDate, str) else ""
        if canonical_term_end and stored_te and stored_te != canonical_term_end:
            mismatchDetected = True
            suggestedSettingsPatch["termEndDate"] = canonical_term_end

        result_academic_year = None
        if academic_year is not None:
            result_academic_year = {
                "id": int(academic_year.id) if academic_year.id is not None else None,
                "name": academic_year.name,
                "start_date": academic_year.start_date.isoformat()
                if academic_year.start_date
                else None,
                "end_date": academic_year.end_date.isoformat()
                if academic_year.end_date
                else None,
                "is_current": bool(academic_year.is_current),
            }

        result_academic_years = []
        for ay in academic_years:
            result_academic_years.append(
                {
                    "id": int(ay.id) if ay.id is not None else None,
                    "name": ay.name,
                    "start_date": ay.start_date.isoformat() if ay.start_date else None,
                    "end_date": ay.end_date.isoformat() if ay.end_date else None,
                    "is_current": bool(ay.is_current),
                }
            )

        result_current_term = None
        if current_term is not None:
            result_current_term = {
                "id": int(current_term.id) if current_term.id is not None else None,
                "name": current_term.name,
                "academic_year_id": int(current_term.academic_year_id)
                if current_term.academic_year_id is not None
                else None,
                "start_date": current_term.start_date.isoformat()
                if current_term.start_date
                else None,
                "end_date": current_term.end_date.isoformat()
                if current_term.end_date
                else None,
                "is_current": bool(current_term.is_current),
            }

        result_terms = []
        for t in terms:
            result_terms.append(
                {
                    "id": int(t.id) if t.id is not None else None,
                    "name": t.name,
                    "academic_year_id": int(t.academic_year_id)
                    if t.academic_year_id is not None
                    else None,
                    "start_date": t.start_date.isoformat() if t.start_date else None,
                    "end_date": t.end_date.isoformat() if t.end_date else None,
                    "is_current": bool(t.is_current),
                }
            )

        return {
            "settings": settings_dict,
            "mismatchDetected": mismatchDetected,
            "suggestedSettingsPatch": suggestedSettingsPatch,
            "academicYear": result_academic_year,
            "academicYears": result_academic_years,
            "currentTerm": result_current_term,
            "terms": result_terms,
            "calendarTerms": calendar_terms,
            "calendarCurrentTerm": calendar_current,
            "progress": {
                "daysIntoTerm": daysIntoTerm,
                "daysRemainingInTerm": daysRemainingInTerm,
                "weeksRemaining": weeksRemaining,
                "progressPercent": progressPercent,
                "todayISO": today.isoformat(),
            },
        }

    @staticmethod
    def _persist_settings_patch(tenant_id, patch: Dict[str, Any]) -> None:
        record = TenantAcademicSettings.query.filter_by(tenant_id=tenant_id).first()
        if record is None:
            record = TenantAcademicSettings(tenant_id=tenant_id, settings={})
            db.session.add(record)

        existing = record.settings if isinstance(record.settings, dict) else {}
        merged = {**existing, **(patch or {})}
        record.settings = merged

    @staticmethod
    def sync_settings_from_current_entities(
        tenant_id,
        *,
        academic_year=None,
        term=None,
        calendar_term=None,
    ) -> None:
        try:
            patch: Dict[str, Any] = {}

            ay_name = None
            if academic_year is not None and getattr(academic_year, "name", None):
                ay_name = academic_year.name
            elif term is not None:
                try:
                    ay_rel = getattr(term, "academic_year", None)
                    if ay_rel is not None and getattr(ay_rel, "name", None):
                        ay_name = ay_rel.name
                except Exception:
                    pass
            if ay_name is None and calendar_term is not None:
                try:
                    today = date.today()
                    ay_name = f"{today.year}/{(today.year + 1) % 100:02d}"
                except Exception:
                    pass
            if ay_name:
                patch["academicYear"] = str(ay_name)

            ct_name = None
            if term is not None and getattr(term, "name", None):
                ct_name = term.name
            elif calendar_term is not None and getattr(calendar_term, "name", None):
                ct_name = calendar_term.name
            elif academic_year is not None:
                try:
                    from app.models.academic_calendar import Term as _Term

                    terms_rel = getattr(academic_year, "terms", None)
                    if terms_rel is not None:
                        first_term = terms_rel.order_by(_Term.start_date.asc()).first()
                        if first_term is not None and getattr(first_term, "name", None):
                            ct_name = first_term.name
                except Exception:
                    pass
            if ct_name:
                patch["currentTerm"] = str(ct_name)

            start_date = None
            end_date = None
            if term is not None:
                start_date = getattr(term, "start_date", None)
                end_date = getattr(term, "end_date", None)
            elif calendar_term is not None:
                start_date = getattr(calendar_term, "start_date", None)
                end_date = getattr(calendar_term, "end_date", None)
            elif academic_year is not None:
                start_date = getattr(academic_year, "start_date", None)
                end_date = getattr(academic_year, "end_date", None)

            if start_date is not None:
                try:
                    patch["termStartDate"] = start_date.isoformat()
                except Exception:
                    pass
            if end_date is not None:
                try:
                    patch["termEndDate"] = end_date.isoformat()
                except Exception:
                    pass

            clean_patch = {k: v for k, v in patch.items() if v not in (None, "")}
            if clean_patch:
                AcademicConfigurationService._persist_settings_patch(
                    tenant_id, clean_patch
                )
        except Exception:
            logger.exception("sync_settings_from_current_entities failed")
            try:
                db.session.rollback()
            except Exception:
                pass
            raise
