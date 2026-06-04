from __future__ import annotations

from typing import Any, Dict, Optional, List

from app.extensions import db
from app.models import TenantAcademicSettings, GradeLevel, EducationalSystemConfig, GradingScheme, GradeBoundary, GradingStandard
from app.models.system_setting import SystemSetting
from app.models.academic_term import AcademicTerm


DEFAULT_ASSESSMENT_TYPES = [
    { 'id': '1', 'name': 'Exams', 'weight': 40, 'description': 'Major examinations', 'isActive': True },
    { 'id': '2', 'name': 'Assignments', 'weight': 20, 'description': 'Homework and assignments', 'isActive': True },
    { 'id': '3', 'name': 'Quizzes', 'weight': 15, 'description': 'Short tests and quizzes', 'isActive': True },
    { 'id': '4', 'name': 'Projects', 'weight': 15, 'description': 'Research and practical projects', 'isActive': True },
    { 'id': '5', 'name': 'Class Participation', 'weight': 10, 'description': 'Student participation in class', 'isActive': True }
]


class AcademicConfigurationService:
    @staticmethod
    def _defaults() -> Dict[str, Any]:
        return {
            'academicYear': '2024/2025',
            'currentTerm': 'First Term',
            'termStartDate': '',
            'termEndDate': '',
            'gradingSystem': 'GES',
            'passingGrade': 50,
            'maxGrade': 100,
            'gradeScale': [],
            'finalGradeWeights': {
                'class_score_weight': 40,
                'external_exam_weight': 60
            },
            'assessmentTypes': DEFAULT_ASSESSMENT_TYPES,
            'assessmentWeights': {
                'exams': 40,
                'assignments': 20,
                'quizzes': 15,
                'projects': 15,
                'classParticipation': 10,
                'attendance': 0
            },
            'maxStudentsPerClass': 40,
            'minStudentsPerClass': 15,
            'classDuration': 60,
            'breakDuration': 15,
            'coreSubjects': [],
            'electiveSubjects': [],
            'attendanceRequired': True,
            'minimumAttendance': 75,
            'onlineExamsEnabled': True,
            'gradeModeration': True,
            'parentPortalGrades': True,
            'transcriptGeneration': True
        }

    @staticmethod
    def get_tenant_settings(tenant_id) -> Dict[str, Any]:
        record = TenantAcademicSettings.query.filter_by(tenant_id=tenant_id).first()
        if record and isinstance(record.settings, dict):
            return dict(record.settings)

        legacy = SystemSetting.query.filter_by(key='academic.settings').first()
        if legacy and legacy.setting_type == 'json':
            try:
                import json
                decoded = json.loads(legacy.value or '{}')
                if isinstance(decoded, dict):
                    try:
                        db.session.add(TenantAcademicSettings(tenant_id=tenant_id, settings=decoded))
                        db.session.commit()
                    except Exception:
                        db.session.rollback()
                    return decoded
            except Exception:
                return {}
        school_key_map = {
            'school.academicYear': 'academicYear',
            'school.currentTerm': 'currentTerm',
            'school.gradingSystem': 'gradingSystem',
            'school.passingGrade': 'passingGrade',
            'school.maxGrade': 'maxGrade',
            'school.maxStudentsPerClass': 'maxStudentsPerClass',
        }
        out: Dict[str, Any] = {}
        for legacy_key, new_key in school_key_map.items():
            value = SystemSetting.get_value(legacy_key, None)
            if value is None:
                continue
            try:
                if new_key in {'passingGrade', 'maxGrade', 'maxStudentsPerClass'}:
                    value = int(value)
            except Exception:
                pass
            out[new_key] = value
        return out

    @staticmethod
    def upsert_tenant_settings(tenant_id, payload: Dict[str, Any]) -> None:
        if not isinstance(payload, dict):
            payload = {}

        sanitized = dict(payload)
        for computed_key in ('educationSystem', 'gradeLevels', 'academicTerms'):
            sanitized.pop(computed_key, None)

        record = TenantAcademicSettings.query.filter_by(tenant_id=tenant_id).first()
        if record:
            record.settings = sanitized or {}
        else:
            record = TenantAcademicSettings(tenant_id=tenant_id, settings=sanitized or {})
            db.session.add(record)

        # Update Tenant education system settings and EducationalSystemConfig on grading system update
        grading_system = payload.get('gradingSystem')
        if grading_system:
            from app.models.tenant import Tenant
            from app.models.educational_system import EducationalSystemConfig
            tenant = Tenant.query.get(tenant_id)
            if tenant:
                tenant_settings = dict(tenant.settings) if isinstance(tenant.settings, dict) else {}
                tenant_settings['education_system'] = grading_system
                tenant_settings['educational_system'] = grading_system
                tenant.settings = tenant_settings
                
                cfg = EducationalSystemConfig.query.filter_by(tenant_id=tenant_id, is_active=True).first()
                if cfg:
                    cfg.template_key = grading_system
                else:
                    cfg = EducationalSystemConfig(tenant_id=tenant_id, template_key=grading_system, is_active=True)
                    db.session.add(cfg)

        db.session.commit()

    @staticmethod
    def _education_system_defaults(tenant_id) -> Dict[str, Any]:
        cfg = EducationalSystemConfig.query.filter_by(tenant_id=tenant_id, is_active=True).first()
        if not cfg or not isinstance(cfg.config, dict):
            return {}

        grading = cfg.config.get('grading') if isinstance(cfg.config, dict) else None
        if not isinstance(grading, dict):
            return {}

        defaults: Dict[str, Any] = {}

        grade_scale: List[Dict[str, Any]] = []
        max_grade = 100
        passing = None

        schemes = grading.get('schemes')
        if isinstance(schemes, list):
            for s in schemes:
                if not isinstance(s, dict):
                    continue
                try:
                    min_v = float(s.get('min'))
                    max_v = float(s.get('max'))
                except Exception:
                    continue
                grade_scale.append(
                    {
                        'grade': s.get('name'),
                        'minScore': min_v,
                        'maxScore': max_v,
                        'description': s.get('description') or s.get('name'),
                        'gradePoint': s.get('point'),
                    }
                )

        bands = grading.get('bands')
        if isinstance(bands, list) and not grade_scale:
            try:
                max_grade = int(float((grading.get('scale') or '0-20').split('-')[-1]))
            except Exception:
                max_grade = 20
            try:
                passing = float(grading.get('pass_mark')) if grading.get('pass_mark') is not None else None
            except Exception:
                passing = None
            for b in bands:
                if not isinstance(b, dict):
                    continue
                try:
                    min_v = float(b.get('min'))
                    max_v = float(b.get('max'))
                except Exception:
                    continue
                grade_scale.append(
                    {
                        'grade': b.get('name'),
                        'minScore': min_v,
                        'maxScore': max_v,
                        'description': b.get('name'),
                        'gradePoint': None,
                    }
                )

        levels = grading.get('levels')
        if isinstance(levels, list) and not grade_scale:
            for l in levels:
                if not isinstance(l, dict):
                    continue
                try:
                    min_v = float(l.get('min'))
                    max_v = float(l.get('max'))
                except Exception:
                    try:
                        rng = str(l.get('range') or '')
                        parts = [p.strip() for p in rng.split('-', 1)]
                        min_v = float(parts[0])
                        max_v = float(parts[1])
                    except Exception:
                        continue
                grade_scale.append(
                    {
                        'grade': l.get('code') or l.get('name'),
                        'minScore': min_v,
                        'maxScore': max_v,
                        'description': l.get('name'),
                        'gradePoint': None,
                    }
                )

        if grade_scale:
            defaults['gradeScale'] = grade_scale

        if passing is not None:
            defaults['passingGrade'] = passing

        defaults['maxGrade'] = max_grade

        weights = cfg.config.get('assessments') if isinstance(cfg.config, dict) else None
        if isinstance(weights, dict):
            class_w = weights.get('class_score_weight', weights.get('continuous_assessment_weight', weights.get('ca_weight')))
            exam_w = weights.get('external_exam_weight', weights.get('exam_weight', weights.get('exam_score_weight')))
            try:
                class_w_val = float(class_w) if class_w is not None else None
                exam_w_val = float(exam_w) if exam_w is not None else None
                if class_w_val is not None and exam_w_val is not None:
                    defaults['finalGradeWeights'] = {
                        'class_score_weight': class_w_val,
                        'external_exam_weight': exam_w_val,
                    }
            except Exception:
                pass

        if cfg.template_key:
            defaults['gradingSystem'] = cfg.template_key

        return defaults

    @staticmethod
    def _grade_levels(tenant_id) -> List[Dict[str, Any]]:
        cfg = EducationalSystemConfig.query.filter_by(tenant_id=tenant_id, is_active=True).first()
        if not cfg:
            return []
        rows = GradeLevel.query.filter_by(tenant_id=tenant_id, educational_system_id=cfg.id).order_by(GradeLevel.order_index.asc()).all()
        return [
            {
                'id': str(r.id),
                'name': r.name,
                'order_index': r.order_index,
                'is_terminal': bool(r.is_terminal),
                'next_level_id': str(r.next_level_id) if r.next_level_id else None
            }
            for r in rows
        ]

    @staticmethod
    def _terms(tenant_id) -> List[Dict[str, Any]]:
        rows = AcademicTerm.query.filter_by(tenant_id=tenant_id).order_by(AcademicTerm.start_date.asc()).all()
        return [
            {
                'id': str(r.id),
                'name': r.name,
                'start_date': r.start_date.isoformat(),
                'end_date': r.end_date.isoformat(),
            }
            for r in rows
        ]

    @staticmethod
    def _education_system_meta(tenant_id) -> Dict[str, Any]:
        cfg = EducationalSystemConfig.query.filter_by(tenant_id=tenant_id, is_active=True).first()
        if not cfg:
            return {'enabled': False}
        meta = {
            'enabled': True,
            'template_key': cfg.template_key,
            'name': cfg.name,
        }
        try:
            cc = (cfg.template_key or '').split('_', 1)[0]
            meta['country_code'] = cc if cc else None
        except Exception:
            meta['country_code'] = None
        return meta

    @staticmethod
    def build_harmonized_config(tenant_id) -> Dict[str, Any]:
        defaults = AcademicConfigurationService._defaults()
        edu_defaults = AcademicConfigurationService._education_system_defaults(tenant_id)
        stored = AcademicConfigurationService.get_tenant_settings(tenant_id)

        config = {**defaults, **(edu_defaults or {}), **(stored or {})}

        grade_scale_fallback = stored.get('grade_scale') if isinstance(stored, dict) else None
        if not isinstance(config.get('gradeScale'), list):
            config['gradeScale'] = grade_scale_fallback if isinstance(grade_scale_fallback, list) else defaults['gradeScale']
        elif len(config.get('gradeScale') or []) == 0 and isinstance(grade_scale_fallback, list) and len(grade_scale_fallback) > 0:
            config['gradeScale'] = grade_scale_fallback

        config['educationSystem'] = AcademicConfigurationService._education_system_meta(tenant_id)
        config['gradeLevels'] = AcademicConfigurationService._grade_levels(tenant_id)
        config['academicTerms'] = AcademicConfigurationService._terms(tenant_id)

        return config

    @staticmethod
    def sync_grading_scheme_from_config(tenant_id, config: Dict[str, Any]) -> None:
        grade_scale = config.get('gradeScale')
        if not isinstance(grade_scale, list) or len(grade_scale) == 0:
            return

        passing_grade = config.get('passingGrade')
        try:
            passing_grade = float(passing_grade)
        except Exception:
            passing_grade = 50.0

        scheme = GradingScheme.query.filter_by(tenant_id=tenant_id, is_default=True).first()
        if not scheme:
            scheme = GradingScheme(
                tenant_id=tenant_id,
                name='Tenant Default',
                standard=GradingStandard.INTERNAL_EXAM,
                is_active=True,
                is_default=True,
                description='Tenant-scoped grading scheme (auto-synced from Academic Configuration)'
            )
            db.session.add(scheme)
            db.session.flush()
        else:
            scheme.is_active = True

        weights = config.get('finalGradeWeights')
        if isinstance(weights, dict):
            try:
                class_w = float(weights.get('class_score_weight'))
                external_w = float(weights.get('external_exam_weight'))
                scheme.class_score_weight = class_w
                scheme.external_exam_weight = external_w
            except Exception:
                pass

        GradeBoundary.query.filter_by(grading_scheme_id=scheme.id).delete()

        for idx, g in enumerate(grade_scale):
            if not isinstance(g, dict):
                continue
            symbol = g.get('grade') or g.get('grade_symbol') or g.get('symbol')
            if not symbol:
                continue
            try:
                min_score = float(g.get('minScore', g.get('min_score')))
                max_score = float(g.get('maxScore', g.get('max_score')))
            except Exception:
                continue
            name = g.get('description') or g.get('grade_name')
            gp = g.get('gradePoint', g.get('grade_points'))
            try:
                gp_val = float(gp) if gp is not None and gp != '' else None
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
                sequence_order=idx + 1
            )
            db.session.add(boundary)

        db.session.commit()
