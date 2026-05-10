from __future__ import annotations

import json
import uuid
from dataclasses import dataclass
from datetime import date, datetime
from typing import Any, Dict, Optional, Tuple

from sqlalchemy import and_

from app.extensions import db
from app.models.billing import Plan, PlanFeature, PlanLimit, SchoolFeatureOverride, SchoolLimitOverride, SchoolPlanSubscription, StudentTermRegistration
from app.models.tenant import TenantMembership
from app.models.message import Message
from app.models.student import Student


class EntitlementError(Exception):
    def __init__(self, message: str, status_code: int = 403):
        super().__init__(message)
        self.message = message
        self.status_code = status_code


@dataclass
class ActivePlan:
    subscription: SchoolPlanSubscription
    plan: Plan


def _as_uuid(value: str | uuid.UUID) -> uuid.UUID:
    return value if isinstance(value, uuid.UUID) else uuid.UUID(str(value))


def _parse_bool(value: Any) -> bool:
    if isinstance(value, bool):
        return value
    if value is None:
        return False
    s = str(value).strip().lower()
    return s in ('1', 'true', 'yes', 'y', 'on')


def _parse_number(value: Any) -> Optional[float]:
    if value is None or value == '':
        return None
    try:
        return float(value)
    except Exception:
        return None


def _parse_json(value: Any) -> Any:
    if value is None or value == '':
        return None
    if isinstance(value, (dict, list)):
        return value
    try:
        return json.loads(str(value))
    except Exception:
        return None


def _parse_limit(value: Any, value_type: str) -> Any:
    vt = (value_type or 'string').strip().lower()
    if vt == 'boolean':
        return _parse_bool(value)
    if vt == 'number':
        return _parse_number(value)
    if vt == 'json':
        return _parse_json(value)
    return None if value is None else str(value)


class EntitlementService:
    @staticmethod
    def getSchoolActivePlan(schoolId) -> Tuple[Optional[ActivePlan], Optional[str]]:
        try:
            sid = _as_uuid(schoolId)
        except Exception:
            return None, 'School not found'

        today = date.today()
        q = SchoolPlanSubscription.query.filter_by(school_id=sid, status='active')
        q = q.filter(SchoolPlanSubscription.starts_at <= today)
        q = q.filter((SchoolPlanSubscription.ends_at.is_(None)) | (SchoolPlanSubscription.ends_at >= today))
        sub = q.order_by(SchoolPlanSubscription.starts_at.desc()).first()
        if not sub:
            return None, 'School has no active plan'

        plan = Plan.query.get(sub.plan_id)
        if not plan:
            return None, 'Active plan not found'
        return ActivePlan(subscription=sub, plan=plan), None

    @staticmethod
    def getSchoolFeatures(schoolId) -> Tuple[Optional[Dict[str, bool]], Optional[str]]:
        active, err = EntitlementService.getSchoolActivePlan(schoolId)
        if err or not active:
            return None, err

        base: Dict[str, bool] = {}
        snap = getattr(active.subscription, 'features_snapshot', None)
        if isinstance(snap, dict):
            for k, v in snap.items():
                base[str(k)] = bool(v)
        else:
            rows = PlanFeature.query.filter_by(plan_id=active.plan.id).all()
            for r in rows:
                base[r.feature_key] = bool(r.is_enabled)

        overrides = SchoolFeatureOverride.query.filter_by(school_id=_as_uuid(schoolId)).all()
        for o in overrides:
            base[o.feature_key] = bool(o.is_enabled)
        return base, None

    @staticmethod
    def getSchoolLimits(schoolId) -> Tuple[Optional[Dict[str, Any]], Optional[str]]:
        active, err = EntitlementService.getSchoolActivePlan(schoolId)
        if err or not active:
            return None, err

        base: Dict[str, Any] = {}
        snap = getattr(active.subscription, 'limits_snapshot', None)
        if isinstance(snap, dict):
            base.update(snap)
        else:
            rows = PlanLimit.query.filter_by(plan_id=active.plan.id).all()
            for r in rows:
                base[r.limit_key] = _parse_limit(r.limit_value, r.value_type)

        overrides = SchoolLimitOverride.query.filter_by(school_id=_as_uuid(schoolId)).all()
        for o in overrides:
            base[o.limit_key] = _parse_limit(o.limit_value, o.value_type)
        return base, None

    @staticmethod
    def hasFeature(schoolId, featureKey: str) -> bool:
        features, err = EntitlementService.getSchoolFeatures(schoolId)
        if err or not features:
            return False
        return bool(features.get(featureKey))

    @staticmethod
    def getLimit(schoolId, limitKey: str) -> Any:
        limits, err = EntitlementService.getSchoolLimits(schoolId)
        if err or not limits:
            return None
        return limits.get(limitKey)

    @staticmethod
    def enforceFeature(schoolId, featureKey: str):
        if not EntitlementService.hasFeature(schoolId, featureKey):
            raise EntitlementError('This feature is not available on your current plan.')

    @staticmethod
    def enforceLimit(schoolId, limitKey: str, currentUsage: float):
        value = EntitlementService.getLimit(schoolId, limitKey)
        if value is None:
            return
        if isinstance(value, str) and value.strip().lower() in ('unlimited', 'contracted'):
            return
        if isinstance(value, bool):
            return
        try:
            limit_num = float(value)
        except Exception:
            return
        if currentUsage > limit_num:
            raise EntitlementError(f'This action exceeds your plan limit for {limitKey}.')

    @staticmethod
    def count_active_school_admins(schoolId) -> int:
        sid = _as_uuid(schoolId)
        return TenantMembership.query.filter_by(tenant_id=sid, role='school_admin', status='active').count()

    @staticmethod
    def count_active_teachers(schoolId) -> int:
        sid = _as_uuid(schoolId)
        return TenantMembership.query.filter_by(tenant_id=sid, role='teacher', status='active').count()

    @staticmethod
    def count_active_registered_students_for_term(schoolId, academic_term_id: int) -> int:
        sid = _as_uuid(schoolId)
        q = StudentTermRegistration.query.filter_by(tenant_id=sid, academic_term_id=int(academic_term_id))
        q = q.filter(StudentTermRegistration.registration_status == 'registered')
        q = q.filter(StudentTermRegistration.student_status == 'active')
        q = q.join(Student, Student.id == StudentTermRegistration.student_id)
        q = q.filter(Student.status == 'active')
        return q.count()

    @staticmethod
    def count_messages_this_month(schoolId) -> int:
        sid = _as_uuid(schoolId)
        now = datetime.utcnow()
        start = datetime(now.year, now.month, 1)
        return Message.query.filter(and_(Message.tenant_id == sid, Message.created_at >= start)).count()

