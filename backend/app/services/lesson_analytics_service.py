import io
from collections import defaultdict
from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional, Tuple, Union

import structlog
from sqlalchemy import and_, func, or_

from app.extensions import db
from app.models.class_ import Class, ClassTeacherMapping
from app.models.department import Department
from app.models.lesson import Lesson
from app.models.lesson_acknowledgement import LessonAcknowledgement
from app.models.lesson_broadcast import LessonBroadcast
from app.models.student import Student
from app.models.subject import Subject
from app.models.teacher import Teacher
from app.models.user import User

logger = structlog.get_logger()


class LessonAnalyticsService:

    NON_COMPLIANCE_REASONS = {
        "NO_LESSON_LOGGED": "No lesson plan logged for scheduled day",
        "LESSON_PAST_DUE": "Lesson is past due date without completion",
        "LOW_ACK_RATE": "Acknowledgement rate below 60% threshold",
        "NO_BROADCAST": "Scheduled live lesson had no broadcast started",
        "MISSING_MATERIALS": "Lesson missing required objectives/materials",
    }

    @staticmethod
    def weekly_trends(
        class_id: Optional[int] = None,
        teacher_id: Optional[int] = None,
        department_id: Optional[int] = None,
        weeks: int = 4,
        tenant_id: Optional[Any] = None,
    ) -> Dict[str, Any]:
        today = datetime.utcnow().date()
        total_days = weeks * 7
        start_date = today - timedelta(days=total_days - 1)

        lessons_query = Lesson.query.join(Class, Lesson.class_id == Class.id)

        if tenant_id is not None:
            lessons_query = lessons_query.filter(Class.tenant_id == tenant_id)
        if class_id is not None:
            lessons_query = lessons_query.filter(Lesson.class_id == class_id)
        if teacher_id is not None:
            lessons_query = lessons_query.filter(Lesson.teacher_id == teacher_id)
        if department_id is not None:
            lessons_query = lessons_query.join(
                Teacher, Lesson.teacher_id == Teacher.id
            ).filter(Teacher.department_id == department_id)

        lessons_query = lessons_query.filter(
            Lesson.date >= start_date, Lesson.date <= today
        )

        lessons = lessons_query.options(
            db.joinedload(Lesson.teacher),
            db.joinedload(Lesson.class_),
        ).all()

        lesson_ids = [l.id for l in lessons]

        ack_counts = {}
        if lesson_ids:
            ack_rows = (
                db.session.query(
                    LessonAcknowledgement.lesson_id,
                    func.count(LessonAcknowledgement.id).label("ack_count"),
                )
                .filter(
                    LessonAcknowledgement.lesson_id.in_(lesson_ids),
                    LessonAcknowledgement.is_acknowledged == True,
                )
                .group_by(LessonAcknowledgement.lesson_id)
                .all()
            )
            ack_counts = {r[0]: r[1] for r in ack_rows}

        class_student_counts = {}
        class_ids_in_range = list({l.class_id for l in lessons})
        if class_ids_in_range:
            student_rows = (
                db.session.query(Student.class_id, func.count(Student.id))
                .filter(Student.class_id.in_(class_ids_in_range), Student.status == "active")
                .group_by(Student.class_id)
                .all()
            )
            class_student_counts = {r[0]: r[1] for r in student_rows}

        broadcast_viewer_data = {}
        if lesson_ids:
            bc_rows = (
                db.session.query(
                    LessonBroadcast.lesson_id,
                    LessonBroadcast.peak_viewers,
                    LessonBroadcast.viewer_count,
                )
                .filter(LessonBroadcast.lesson_id.in_(lesson_ids))
                .all()
            )
            for r in bc_rows:
                peak = int(r[1] or 0)
                curr = int(r[2] or 0)
                if r[0] not in broadcast_viewer_data:
                    broadcast_viewer_data[r[0]] = {"peaks": [], "counts": []}
                broadcast_viewer_data[r[0]]["peaks"].append(peak)
                broadcast_viewer_data[r[0]]["counts"].append(curr)

        per_day: Dict[str, Dict[str, Any]] = {}
        for i in range(total_days):
            d = start_date + timedelta(days=i)
            key = d.isoformat()
            per_day[key] = {
                "status_counts": defaultdict(int),
                "coverage_pct": 0.0,
                "ack_rate": 0.0,
                "avg_viewers": 0.0,
                "lesson_ids": [],
                "total_expected_classes": 0,
                "classes_with_lessons": 0,
                "ack_possible_total": 0,
                "ack_actual_total": 0,
                "viewer_sum": 0,
                "viewer_count_samples": 0,
            }

        all_class_ids_query = Class.query
        if tenant_id is not None:
            all_class_ids_query = all_class_ids_query.filter(Class.tenant_id == tenant_id)
        all_class_ids = {c.id for c in all_class_ids_query.with_entities(Class.id).all()}

        for l in lessons:
            day_key = l.date.isoformat() if l.date else None
            if not day_key or day_key not in per_day:
                continue
            bucket = per_day[day_key]
            status_val = l.status or "planned"
            bucket["status_counts"][status_val] += 1
            bucket["lesson_ids"].append(l.id)

            ack_actual = ack_counts.get(l.id, 0)
            ack_possible = max(class_student_counts.get(l.class_id, 0), 1)
            bucket["ack_actual_total"] += ack_actual
            bucket["ack_possible_total"] += ack_possible

            bc_entry = broadcast_viewer_data.get(l.id, {})
            peaks = bc_entry.get("peaks", [])
            counts = bc_entry.get("counts", [])
            if peaks:
                bucket["viewer_sum"] += sum(peaks)
                bucket["viewer_count_samples"] += len(peaks)
            elif counts:
                bucket["viewer_sum"] += sum(counts)
                bucket["viewer_count_samples"] += len(counts)

        scope_class_ids = set(all_class_ids)
        if class_id is not None:
            scope_class_ids = {class_id}
        elif teacher_id is not None:
            t_class_rows = (
                db.session.query(ClassTeacherMapping.class_id)
                .filter(ClassTeacherMapping.teacher_id == teacher_id)
                .all()
            )
            mapped = {r[0] for r in t_class_rows}
            t_primary = {
                c.id for c in Class.query.filter_by(teacher_id=teacher_id).all()
            }
            scope_class_ids = mapped | t_primary
        elif department_id is not None:
            dept_teacher_ids = {
                t.id for t in Teacher.query.filter_by(department_id=department_id).all()
            }
            if dept_teacher_ids:
                mapped_c = {
                    r[0]
                    for r in db.session.query(ClassTeacherMapping.class_id)
                    .filter(ClassTeacherMapping.teacher_id.in_(dept_teacher_ids))
                    .all()
                }
                primary_c = {
                    c.id for c in Class.query.filter(Class.teacher_id.in_(dept_teacher_ids)).all()
                }
                scope_class_ids = mapped_c | primary_c

        total_classes_in_scope = len(scope_class_ids) or 1

        for day_key, bucket in per_day.items():
            classes_logged_ids = set()
            for lid in bucket["lesson_ids"]:
                lesson_obj = next((l for l in lessons if l.id == lid), None)
                if lesson_obj and lesson_obj.class_id in scope_class_ids:
                    classes_logged_ids.add(lesson_obj.class_id)
            bucket["classes_with_lessons"] = len(classes_logged_ids)
            bucket["total_expected_classes"] = total_classes_in_scope
            bucket["coverage_pct"] = round(
                (bucket["classes_with_lessons"] / total_classes_in_scope) * 100, 2
            ) if total_classes_in_scope else 0.0
            bucket["ack_rate"] = round(
                (bucket["ack_actual_total"] / bucket["ack_possible_total"]) * 100, 2
            ) if bucket["ack_possible_total"] else 0.0
            bucket["avg_viewers"] = round(
                bucket["viewer_sum"] / bucket["viewer_count_samples"], 2
            ) if bucket["viewer_count_samples"] else 0.0
            bucket["status_counts"] = dict(bucket["status_counts"])

        return {
            "start_date": start_date.isoformat(),
            "end_date": today.isoformat(),
            "weeks": weeks,
            "filters": {
                "class_id": class_id,
                "teacher_id": teacher_id,
                "department_id": department_id,
            },
            "per_day": per_day,
            "lesson_ids": sorted(lesson_ids),
            "generated_at": datetime.utcnow().isoformat(),
        }

    @staticmethod
    def non_compliance(
        scope: Dict[str, Any],
        days: int = 3,
        tenant_id: Optional[Any] = None,
    ) -> List[Dict[str, Any]]:
        today = datetime.utcnow().date()
        start_date = today - timedelta(days=days - 1)
        ack_threshold_pct = 60.0

        scope_class_id = scope.get("class_id")
        scope_teacher_id = scope.get("teacher_id")
        scope_department_id = scope.get("department_id")

        base_class_query = Class.query
        base_teacher_query = Teacher.query
        base_lesson_query = Lesson.query.join(Class, Lesson.class_id == Class.id)

        if tenant_id is not None:
            base_class_query = base_class_query.filter(Class.tenant_id == tenant_id)
            base_teacher_query = base_teacher_query.filter(Teacher.tenant_id == tenant_id)
            base_lesson_query = base_lesson_query.filter(Class.tenant_id == tenant_id)

        scope_class_ids = None
        scope_teacher_ids = None

        if scope_class_id is not None:
            scope_class_ids = {scope_class_id}
        if scope_teacher_id is not None:
            scope_teacher_ids = {scope_teacher_id}
        if scope_department_id is not None:
            scope_teacher_ids = {
                t.id
                for t in base_teacher_query.filter_by(department_id=scope_department_id).all()
            }

        if scope_teacher_ids:
            teacher_ids_user = {
                t.user_id for t in Teacher.query.filter(Teacher.id.in_(scope_teacher_ids)).all()
            }
            mapped_class_rows = (
                db.session.query(ClassTeacherMapping.class_id)
                .filter(ClassTeacherMapping.teacher_id.in_(teacher_ids_user))
                .all()
            )
            mapped = {r[0] for r in mapped_class_rows}
            primary = {
                c.id for c in Class.query.filter(Class.teacher_id.in_(scope_teacher_ids)).all()
            }
            teacher_scoped_classes = mapped | primary
            if scope_class_ids:
                scope_class_ids = scope_class_ids & teacher_scoped_classes
            else:
                scope_class_ids = teacher_scoped_classes

        class_query = base_class_query
        if scope_class_ids is not None:
            class_query = class_query.filter(Class.id.in_(scope_class_ids))
        classes_in_scope = class_query.all()
        class_ids_in_scope = {c.id for c in classes_in_scope}

        lesson_query = base_lesson_query.filter(
            Lesson.date >= start_date, Lesson.date <= today
        )
        if scope_class_ids is not None:
            lesson_query = lesson_query.filter(Lesson.class_id.in_(scope_class_ids))
        if scope_teacher_ids is not None:
            lesson_query = lesson_query.filter(Lesson.teacher_id.in_(scope_teacher_ids))
        lessons_in_range = lesson_query.all()

        class_lessons_by_day: Dict[Tuple[int, str], List[Lesson]] = defaultdict(list)
        for l in lessons_in_range:
            if l.date:
                class_lessons_by_day[(l.class_id, l.date.isoformat())].append(l)

        all_lesson_ids_in_range = [l.id for l in lessons_in_range]
        ack_counts: Dict[int, int] = {}
        if all_lesson_ids_in_range:
            rows = (
                db.session.query(
                    LessonAcknowledgement.lesson_id,
                    func.count(LessonAcknowledgement.id),
                )
                .filter(
                    LessonAcknowledgement.lesson_id.in_(all_lesson_ids_in_range),
                    LessonAcknowledgement.is_acknowledged == True,
                )
                .group_by(LessonAcknowledgement.lesson_id)
                .all()
            )
            ack_counts = {r[0]: r[1] for r in rows}

        student_counts: Dict[int, int] = {}
        if class_ids_in_scope:
            srows = (
                db.session.query(Student.class_id, func.count(Student.id))
                .filter(Student.class_id.in_(class_ids_in_scope), Student.status == "active")
                .group_by(Student.class_id)
                .all()
            )
            student_counts = {r[0]: r[1] for r in srows}

        broadcast_by_lesson: Dict[int, List[LessonBroadcast]] = defaultdict(list)
        if all_lesson_ids_in_range:
            bc_list = LessonBroadcast.query.filter(
                LessonBroadcast.lesson_id.in_(all_lesson_ids_in_range)
            ).all()
            for bc in bc_list:
                broadcast_by_lesson[bc.lesson_id].append(bc)

        results: List[Dict[str, Any]] = []
        seen_keys: set = set()

        def _ensure_assigned_teachers(c: Class) -> List[Dict[str, Any]]:
            teachers: List[Dict[str, Any]] = []
            seen_tids: set = set()
            if c.teacher_id:
                t = Teacher.query.get(c.teacher_id)
                if t:
                    seen_tids.add(t.id)
                    teachers.append({
                        "teacher_id": t.id,
                        "user_id": t.user_id,
                        "name": t.full_name,
                        "email": getattr(t.user, "email", None),
                        "phone": t.phone_number,
                    })
            mappings = ClassTeacherMapping.query.filter_by(class_id=c.id).all()
            for m in mappings:
                t_profile = Teacher.query.filter_by(user_id=m.teacher_id).first()
                if t_profile and t_profile.id not in seen_tids:
                    seen_tids.add(t_profile.id)
                    teachers.append({
                        "teacher_id": t_profile.id,
                        "user_id": t_profile.user_id,
                        "name": t_profile.full_name,
                        "email": getattr(t_profile.user, "email", None),
                        "phone": t_profile.phone_number,
                    })
            return teachers

        def _push_result(c: Class, reason_code: str, lesson_ref: Optional[Lesson] = None, extra: Optional[Dict[str, Any]] = None):
            key = (c.id, reason_code, lesson_ref.id if lesson_ref else None)
            if key in seen_keys:
                return
            seen_keys.add(key)
            assigned = _ensure_assigned_teachers(c)
            entry = {
                "class_id": c.id,
                "class_name": c.name,
                "grade_level": c.grade_level,
                "section": c.section,
                "assigned_teachers": assigned,
                "reason_code": reason_code,
                "reason_description": LessonAnalyticsService.NON_COMPLIANCE_REASONS.get(
                    reason_code, reason_code
                ),
                "detected_at": datetime.utcnow().isoformat(),
                "window_days": days,
                "window_start": start_date.isoformat(),
                "window_end": today.isoformat(),
            }
            if lesson_ref is not None:
                entry["lesson_id"] = lesson_ref.id
                entry["lesson_title"] = lesson_ref.title
                entry["lesson_date"] = lesson_ref.date.isoformat() if lesson_ref.date else None
                entry["lesson_status"] = lesson_ref.status
            if extra:
                entry.update(extra)
            results.append(entry)

        for class_obj in classes_in_scope:
            for i in range(days):
                d = start_date + timedelta(days=i)
                if d.weekday() >= 5:
                    continue
                day_lessons = class_lessons_by_day.get((class_obj.id, d.isoformat()), [])
                if not day_lessons:
                    _push_result(
                        class_obj,
                        "NO_LESSON_LOGGED",
                        extra={"missing_date": d.isoformat()},
                    )

        for lesson in lessons_in_range:
            reasons: List[Tuple[str, Dict[str, Any]]] = []

            if lesson.date and lesson.date < today and (lesson.status or "planned") in {"planned", "in-progress"}:
                reasons.append((
                    "LESSON_PAST_DUE",
                    {"due_date": lesson.date.isoformat(), "current_status": lesson.status},
                ))

            possible_acks = max(student_counts.get(lesson.class_id, 0), 1)
            actual_acks = ack_counts.get(lesson.id, 0) or int(lesson.engagement_ack_count or 0)
            rate_pct = (actual_acks / possible_acks) * 100 if possible_acks else 0.0
            if possible_acks >= 3 and rate_pct < ack_threshold_pct:
                reasons.append((
                    "LOW_ACK_RATE",
                    {
                        "ack_rate_pct": round(rate_pct, 2),
                        "acknowledged_count": actual_acks,
                        "expected_count": possible_acks,
                        "threshold_pct": ack_threshold_pct,
                    },
                ))

            materials = getattr(lesson, "materials", None) or []
            objectives = getattr(lesson, "objectives", None) or []
            has_obj = bool(objectives) or any(
                isinstance(m, dict) and m.get("type") == "objectives" for m in materials
            )
            if not has_obj:
                reasons.append((
                    "MISSING_MATERIALS",
                    {"has_objectives": False, "has_materials_list": bool(materials)},
                ))

            visibility = getattr(lesson, "visibility", "class_only")
            broadcast_list = broadcast_by_lesson.get(lesson.id, [])
            if visibility in {"school_wide", "public"} and lesson.date and lesson.date <= today:
                if not broadcast_list:
                    reasons.append((
                        "NO_BROADCAST",
                        {"visibility": visibility, "lesson_date": lesson.date.isoformat()},
                    ))

            class_obj = next((c for c in classes_in_scope if c.id == lesson.class_id), None)
            if class_obj is None:
                class_obj = Class.query.get(lesson.class_id)
            if class_obj:
                for code, extra in reasons:
                    _push_result(class_obj, code, lesson_ref=lesson, extra=extra)

        results.sort(key=lambda r: (r["class_id"], r.get("lesson_date") or "", r["reason_code"]))
        return results

    @staticmethod
    def class_weekly_report_pdf_bytes(
        class_id: int,
        week_start_date: datetime,
        tenant_id: Optional[Any] = None,
    ) -> Union[bytes, str]:
        try:
            from reportlab.lib import colors
            from reportlab.lib.pagesizes import A4
            from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
            from reportlab.lib.units import cm
            from reportlab.platypus import (Paragraph, SimpleDocTemplate, Spacer,
                                            Table, TableStyle)
            reportlab_available = True
        except Exception:
            reportlab_available = False

        if isinstance(week_start_date, datetime):
            ws_date = week_start_date.date()
        else:
            ws_date = week_start_date
        week_end_date = ws_date + timedelta(days=6)

        class_obj = Class.query.get(class_id)
        if not class_obj:
            raise ValueError(f"Class with ID {class_id} not found")
        if tenant_id is not None and getattr(class_obj, "tenant_id", None) != tenant_id:
            raise ValueError("Class tenant mismatch")

        lessons = (
            Lesson.query.options(
                db.joinedload(Lesson.teacher),
                db.joinedload(Lesson.subject),
            )
            .filter_by(class_id=class_id)
            .filter(Lesson.date >= ws_date, Lesson.date <= week_end_date)
            .order_by(Lesson.date.asc(), Lesson.period_number.asc().nullslast())
            .all()
        )

        lesson_ids = [l.id for l in lessons]
        ack_counts: Dict[int, int] = {}
        seen_counts: Dict[int, int] = {}
        if lesson_ids:
            rows = (
                db.session.query(
                    LessonAcknowledgement.lesson_id,
                    func.sum(db.cast(LessonAcknowledgement.is_acknowledged, db.Integer)).label("ackc"),
                    func.sum(db.cast(LessonAcknowledgement.is_seen, db.Integer)).label("seenc"),
                )
                .filter(LessonAcknowledgement.lesson_id.in_(lesson_ids))
                .group_by(LessonAcknowledgement.lesson_id)
                .all()
            )
            for r in rows:
                ack_counts[r[0]] = int(r[1] or 0)
                seen_counts[r[0]] = int(r[2] or 0)

        total_students = Student.query.filter_by(class_id=class_id, status="active").count()

        summary = {
            "total_lessons": len(lessons),
            "completed": sum(1 for l in lessons if l.status == "completed"),
            "in_progress": sum(1 for l in lessons if l.status == "in-progress"),
            "planned": sum(1 for l in lessons if l.status == "planned"),
            "total_students": total_students,
            "avg_ack_rate": 0.0,
            "coverage_pct": 0.0,
        }
        possible = 0
        actual = 0
        for l in lessons:
            possible += max(total_students, 1)
            actual += ack_counts.get(l.id, 0) or int(l.engagement_ack_count or 0)
        if possible:
            summary["avg_ack_rate"] = round((actual / possible) * 100, 2)
        unique_days = {l.date for l in lessons if l.date}
        expected_days = 5
        summary["coverage_pct"] = round((len(unique_days) / expected_days) * 100, 2) if expected_days else 0.0

        class_obj = Class.query.get(class_id)
        class_name = getattr(class_obj, "name", f"Class {class_id}")
        grade_level = getattr(class_obj, "grade_level", "")
        section = getattr(class_obj, "section", "") or ""
        teacher_name = ""
        t = getattr(class_obj, "teacher", None)
        if t:
            teacher_name = t.full_name

        school_name = "ADMIPAEDIA"
        try:
            from app.models.system_setting import SystemSetting
            setting = SystemSetting.query.filter_by(key="school_name").first()
            if setting and setting.value:
                school_name = setting.value
        except Exception:
            pass

        if not reportlab_available:
            rows_html = []
            for l in lessons:
                subject_name = getattr(getattr(l, "subject", None), "name", "General")
                t_name = getattr(getattr(l, "teacher", None), "full_name", "—")
                ac = ack_counts.get(l.id, 0) or int(l.engagement_ack_count or 0)
                sc = seen_counts.get(l.id, 0) or int(l.engagement_seen_count or 0)
                ack_rate_row = round((ac / max(total_students, 1)) * 100, 1) if total_students else 0.0
                rows_html.append(f"""
                    <tr>
                      <td>{l.date.isoformat() if l.date else ''}</td>
                      <td>{getattr(l, 'period_number', '') or ''}</td>
                      <td>{l.title}</td>
                      <td>{subject_name}</td>
                      <td>{t_name}</td>
                      <td>{l.status or 'planned'}</td>
                      <td>{sc}</td>
                      <td>{ac}</td>
                      <td>{ack_rate_row}%</td>
                    </tr>
                """)
            html = f"""<!doctype html>
<html><head><meta charset="utf-8"><title>Weekly Lesson Report - {class_name}</title>
<style>
body{{font-family:Arial,Helvetica,sans-serif;margin:24px;color:#17202a}}
h1{{color:#0b1e35;margin:0 0 4px}}
h2{{color:#27774a;margin-top:24px}}
.meta{{color:#52626f;margin-bottom:16px}}
table{{border-collapse:collapse;width:100%;margin-top:12px}}
th,td{{border:1px solid #b8dece;padding:8px;text-align:left;font-size:13px}}
th{{background:#eaf6f1;color:#0b1e35}}
.kpi-grid{{display:grid;grid-template-columns:repeat(5,1fr);gap:12px;margin-top:16px}}
.kpi{{background:#f3faf7;padding:12px;border-radius:8px;border:1px solid #b8dece}}
.kpi .label{{font-size:12px;color:#52626f}}
.kpi .value{{font-size:22px;font-weight:700;color:#0b1e35;margin-top:4px}}
.warn{{background:#fff7ed;border:1px dashed #c97a0a;color:#c97a0a;padding:10px;border-radius:6px;margin-bottom:16px}}
</style></head><body>
<div class="warn">WARNING: reportlab is not installed. Rendered HTML returned for browser print instead of binary PDF.</div>
<h1>{school_name}</h1>
<div class="meta">Weekly Lesson Report &mdash; Week of {ws_date.isoformat()} to {week_end_date.isoformat()}</div>
<div style="display:flex;gap:24px;flex-wrap:wrap;margin-top:8px">
  <div><strong>Class:</strong> {class_name} {section}</div>
  <div><strong>Grade:</strong> {grade_level}</div>
  <div><strong>Teacher:</strong> {teacher_name}</div>
  <div><strong>Students:</strong> {total_students}</div>
</div>
<div class="kpi-grid">
  <div class="kpi"><div class="label">Lessons Planned</div><div class="value">{summary['total_lessons']}</div></div>
  <div class="kpi"><div class="label">Completed</div><div class="value">{summary['completed']}</div></div>
  <div class="kpi"><div class="label">Coverage</div><div class="value">{summary['coverage_pct']}%</div></div>
  <div class="kpi"><div class="label">Avg Ack Rate</div><div class="value">{summary['avg_ack_rate']}%</div></div>
  <div class="kpi"><div class="label">Students</div><div class="value">{summary['total_students']}</div></div>
</div>
<h2>Lesson Log</h2>
<table>
<thead><tr>
  <th>Date</th><th>Period</th><th>Title</th><th>Subject</th><th>Teacher</th><th>Status</th><th>Seen</th><th>Ack'd</th><th>Ack %</th>
</tr></thead>
<tbody>
{''.join(rows_html) if rows_html else '<tr><td colspan="9" style="text-align:center;color:#52626f;padding:24px">No lessons logged this week.</td></tr>'}
</tbody></table>
<div style="margin-top:28px;color:#52626f;font-size:12px">Generated {datetime.utcnow().isoformat()} by ADMIPAEDIA</div>
</body></html>"""
            return html

        buffer = io.BytesIO()
        doc = SimpleDocTemplate(
            buffer,
            pagesize=A4,
            leftMargin=2 * cm,
            rightMargin=2 * cm,
            topMargin=1.8 * cm,
            bottomMargin=1.8 * cm,
            title=f"Weekly Lesson Report - {class_name}",
            author="ADMIPAEDIA",
        )
        styles = getSampleStyleSheet()
        NAVY = colors.HexColor("#0b1e35")
        GREEN = colors.HexColor("#27774a")
        GREEN_LIGHT = colors.HexColor("#eaf6f1")
        BORDER = colors.HexColor("#b8dece")
        MUTED = colors.HexColor("#52626f")

        title_style = ParagraphStyle(
            "ReportTitle", parent=styles["Title"], textColor=NAVY, fontSize=20, spaceAfter=4
        )
        subtitle_style = ParagraphStyle(
            "ReportSubtitle", parent=styles["Normal"], textColor=MUTED, fontSize=11, spaceAfter=14
        )
        h2 = ParagraphStyle(
            "SectionH2", parent=styles["Heading2"], textColor=GREEN, fontSize=14, spaceBefore=14, spaceAfter=8
        )
        cell = ParagraphStyle(
            "Cell", parent=styles["Normal"], fontSize=9, leading=11
        )

        story = []
        story.append(Paragraph(school_name, title_style))
        story.append(Paragraph(
            f"Weekly Lesson Report &mdash; Week of {ws_date.isoformat()} to {week_end_date.isoformat()}",
            subtitle_style,
        ))

        meta_data = [
            ["Class:", f"{class_name} {section}".strip(), "Grade:", grade_level],
            ["Teacher:", teacher_name or "—", "Students:", f"{total_students} active"],
        ]
        meta_table = Table(meta_data, colWidths=[2.2 * cm, 6.2 * cm, 2.2 * cm, 5.4 * cm])
        meta_table.setStyle(TableStyle([
            ("FONTNAME", (0, 0), (-1, -1), "Helvetica"),
            ("FONTSIZE", (0, 0), (-1, -1), 10),
            ("TEXTCOLOR", (0, 0), (0, -1), NAVY),
            ("TEXTCOLOR", (2, 0), (2, -1), NAVY),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
        ]))
        story.append(meta_table)
        story.append(Spacer(1, 0.4 * cm))

        kpi_header = ["Lessons", "Completed", "Coverage", "Avg Ack Rate", "Students"]
        kpi_values = [
            str(summary["total_lessons"]),
            str(summary["completed"]),
            f"{summary['coverage_pct']}%",
            f"{summary['avg_ack_rate']}%",
            str(summary["total_students"]),
        ]
        kpi_table = Table(
            [kpi_header, kpi_values],
            colWidths=[3.3 * cm, 3.3 * cm, 3.3 * cm, 3.3 * cm, 3.3 * cm],
        )
        kpi_table.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, 0), GREEN_LIGHT),
            ("TEXTCOLOR", (0, 0), (-1, 0), NAVY),
            ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
            ("FONTSIZE", (0, 0), (-1, -1), 10),
            ("ALIGN", (0, 0), (-1, -1), "CENTER"),
            ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
            ("GRID", (0, 0), (-1, -1), 0.5, BORDER),
            ("TOPPADDING", (0, 0), (-1, -1), 8),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
            ("FONTSIZE", (0, 1), (-1, 1), 14),
            ("FONTNAME", (0, 1), (-1, 1), "Helvetica-Bold"),
        ]))
        story.append(kpi_table)

        story.append(Paragraph("Lesson Log", h2))

        table_header = ["Date", "Period", "Title", "Subject", "Teacher", "Status", "Seen", "Ack'd", "Ack %"]
        table_rows = [table_header]
        for l in lessons:
            subject_name = getattr(getattr(l, "subject", None), "name", "General")
            t_name = getattr(getattr(l, "teacher", None), "full_name", "—")
            ac = ack_counts.get(l.id, 0) or int(l.engagement_ack_count or 0)
            sc = seen_counts.get(l.id, 0) or int(l.engagement_seen_count or 0)
            ack_rate_row = round((ac / max(total_students, 1)) * 100, 1) if total_students else 0.0
            table_rows.append([
                l.date.isoformat() if l.date else "",
                str(getattr(l, "period_number", "") or ""),
                Paragraph(l.title or "", cell),
                subject_name,
                t_name,
                (l.status or "planned").title(),
                str(sc),
                str(ac),
                f"{ack_rate_row}%",
            ])
        if len(table_rows) == 1:
            table_rows.append(["—", "—", Paragraph("No lessons logged this week.", cell), "—", "—", "—", "—", "—", "—"])

        lesson_table = Table(
            table_rows,
            colWidths=[1.9 * cm, 1.2 * cm, 4.6 * cm, 2.2 * cm, 2.6 * cm, 1.7 * cm, 1.2 * cm, 1.2 * cm, 1.4 * cm],
            repeatRows=1,
        )
        lesson_table.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, 0), GREEN_LIGHT),
            ("TEXTCOLOR", (0, 0), (-1, 0), NAVY),
            ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
            ("FONTSIZE", (0, 0), (-1, 0), 9),
            ("FONTSIZE", (0, 1), (-1, -1), 8.5),
            ("FONTNAME", (0, 1), (-1, -1), "Helvetica"),
            ("GRID", (0, 0), (-1, -1), 0.4, BORDER),
            ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
            ("TOPPADDING", (0, 0), (-1, -1), 5),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
            ("ALIGN", (0, 0), (1, -1), "CENTER"),
            ("ALIGN", (5, 0), (-1, -1), "CENTER"),
        ]))
        story.append(lesson_table)

        footer_style = ParagraphStyle(
            "Footer", parent=styles["Normal"], textColor=MUTED, fontSize=8, alignment=1
        )
        story.append(Spacer(1, 0.8 * cm))
        story.append(Paragraph(
            f"Generated {datetime.utcnow().isoformat()} by ADMIPAEDIA",
            footer_style,
        ))

        doc.build(story)
        return buffer.getvalue()
