from datetime import date, datetime

import structlog
from sqlalchemy import func

from app.extensions import db
from app.models.class_ import Class
from app.models.grading_system import EnhancedGrade, FinalGrade, GradingScheme
from app.models.student import Student
from app.models.subject import Subject

logger = structlog.get_logger()


class GradingService:
    @staticmethod
    def _prepare_grade_data(data):
        """Validate and normalize an EnhancedGrade payload."""
        if not isinstance(data, dict):
            return None, "Grade payload must be an object"

        payload = dict(data)

        required_fields = [
            "student_id",
            "subject_id",
            "class_id",
            "grading_scheme_id",
            "assessment_type_id",
            "assessment_name",
            "assessment_date",
            "term",
            "academic_year",
            "raw_score",
            "total_marks",
        ]

        missing = [
            field
            for field in required_fields
            if payload.get(field) in (None, "")
        ]

        if missing:
            return (
                None,
                f"Missing required fields: {', '.join(missing)}",
            )

        try:
            raw_score = float(payload["raw_score"])
            total_marks = float(payload["total_marks"])
        except (TypeError, ValueError):
            return None, "raw_score and total_marks must be numeric"

        if total_marks <= 0:
            return None, "total_marks must be greater than zero"

        if raw_score < 0 or raw_score > total_marks:
            return None, "raw_score must be between 0 and total_marks"

        assessment_date = payload["assessment_date"]

        if isinstance(assessment_date, datetime):
            assessment_date = assessment_date.date()
        elif isinstance(assessment_date, str):
            try:
                assessment_date = date.fromisoformat(
                    assessment_date.strip()
                )
            except ValueError:
                return (
                    None,
                    "assessment_date must be a valid ISO date "
                    "in YYYY-MM-DD format",
                )
        elif not isinstance(assessment_date, date):
            return (
                None,
                "assessment_date must be a valid date",
            )

        payload["assessment_date"] = assessment_date
        payload["raw_score"] = raw_score
        payload["total_marks"] = total_marks
        payload["percentage"] = round(
            (raw_score / total_marks) * 100,
            2,
        )

        return payload, None

    @staticmethod
    def enter_grade(data, tenant_id, commit=True):
        """Enter a grade for a single student assessment."""
        if not tenant_id:
            return None, "Tenant context is required"

        try:
            payload, error = GradingService._prepare_grade_data(data)
            if error:
                return None, error

            # All resource identifiers originate from caller input.
            # Establish their tenant ownership before touching an
            # ownership-less EnhancedGrade row.
            class_obj = Class.query.without_tenant_filter().filter_by(
                id=payload["class_id"],
                tenant_id=tenant_id,
            ).first()

            if not class_obj:
                return None, "Class not found"

            student = Student.query.without_tenant_filter().filter_by(
                id=payload["student_id"],
                tenant_id=tenant_id,
                class_id=payload["class_id"],
            ).first()

            if not student:
                return (
                    None,
                    "Student not found or does not belong to the specified class",
                )

            subject = Subject.query.without_tenant_filter().filter_by(
                id=payload["subject_id"],
                tenant_id=tenant_id,
            ).first()

            if not subject:
                return None, "Subject not found"

            # A grading scheme may belong to this tenant or may be an
            # intentional system/global scheme (tenant_id IS NULL).
            # A scheme belonging to any other tenant is never accepted.
            scheme = GradingScheme.query.without_tenant_filter().filter(
                GradingScheme.id == payload["grading_scheme_id"],
                GradingScheme.is_active.is_(True),
                (
                    (GradingScheme.tenant_id == tenant_id)
                    | GradingScheme.tenant_id.is_(None)
                ),
            ).first()

            if not scheme:
                return None, "Grading scheme not found"

            existing_grade = EnhancedGrade.query.filter_by(
                student_id=payload["student_id"],
                subject_id=payload["subject_id"],
                class_id=payload["class_id"],
                assessment_type_id=payload["assessment_type_id"],
                term=payload["term"],
                academic_year=payload["academic_year"],
                assessment_name=payload["assessment_name"],
            ).first()

            if existing_grade:
                for key, value in payload.items():
                    setattr(existing_grade, key, value)
                grade = existing_grade
            else:
                grade = EnhancedGrade(**payload)
                db.session.add(grade)

            # Rebind even existing rows to the already-authorized scheme.
            grade.grading_scheme = scheme
            grade.grading_scheme_id = scheme.id

            grade.calculate_grade()

            if commit:
                db.session.commit()
            else:
                db.session.flush()

            return grade, None

        except Exception as exc:
            db.session.rollback()
            logger.error(
                "Error entering grade",
                error=str(exc),
            )
            return None, str(exc)

    @staticmethod
    def bulk_enter_grades(grades_data, tenant_id):
        """
        Enter a batch atomically inside one explicit tenant.

        A batch must not report success when one or more rows failed.
        """
        if not tenant_id:
            return None, "Tenant context is required"

        if not isinstance(grades_data, list) or not grades_data:
            return None, "grades_data must be a non-empty list"

        try:
            results = []

            for index, grade_data in enumerate(grades_data, start=1):
                grade, error = GradingService.enter_grade(
                    grade_data,
                    tenant_id=tenant_id,
                    commit=False,
                )

                if error:
                    db.session.rollback()
                    logger.error(
                        "Bulk grade entry failed",
                        item=index,
                        error=error,
                    )
                    return (
                        None,
                        f"Bulk grade entry failed at item "
                        f"{index}: {error}",
                    )

                results.append(grade)

            db.session.commit()
            return results, None

        except Exception as exc:
            db.session.rollback()
            logger.error(
                "Bulk grade entry failed",
                error=str(exc),
            )
            return None, str(exc)


    @staticmethod
    def get_gradebook(
        class_id,
        subject_id,
        term,
        academic_year,
        tenant_id,
    ):
        """Fetch a tenant-scoped gradebook for one class and subject."""
        if not tenant_id:
            return None, "Tenant context is required"

        class_obj = Class.query.without_tenant_filter().filter_by(
            id=class_id,
            tenant_id=tenant_id,
        ).first()

        if not class_obj:
            return None, "Class not found"

        subject_obj = Subject.query.without_tenant_filter().filter_by(
            id=subject_id,
            tenant_id=tenant_id,
        ).first()

        if not subject_obj:
            return None, "Subject not found"

        grades = EnhancedGrade.query.filter_by(
            class_id=class_id,
            subject_id=subject_id,
            term=term,
            academic_year=academic_year,
        ).all()

        # EnhancedGrade has no tenant_id. Resolve all referenced students
        # through tenant + class ownership before exposing any grade row.
        student_ids = {
            grade.student_id
            for grade in grades
        }

        students = (
            Student.query.without_tenant_filter().filter(
                Student.id.in_(student_ids),
                Student.tenant_id == tenant_id,
                Student.class_id == class_id,
            ).all()
            if student_ids
            else []
        )

        students_by_id = {
            student.id: student
            for student in students
        }

        # Structure for frontend: preserve the existing response shape and
        # stable assessment identity.
        gradebook = {}
        assessments = {}

        for grade in grades:
            student = students_by_id.get(grade.student_id)

            # Fail closed for stale/corrupt cross-tenant references.
            if not student:
                continue

            if grade.student_id not in gradebook:
                gradebook[grade.student_id] = {
                    "student_name": (
                        f"{student.first_name} {student.last_name}"
                    ),
                    "admission_number": student.admission_number,
                    "grades": {},
                }

            assessment_key = (
                f"{grade.assessment_type_id}:"
                f"{grade.assessment_name}"
            )

            assessments[assessment_key] = {
                "assessment_key": assessment_key,
                "assessment_name": grade.assessment_name,
                "assessment_type_id": grade.assessment_type_id,
                "total_marks": grade.total_marks,
                "assessment_date": (
                    grade.assessment_date.isoformat()
                    if grade.assessment_date
                    else None
                ),
            }

            gradebook[grade.student_id]["grades"][assessment_key] = {
                "score": grade.raw_score,
                "total": grade.total_marks,
                "percentage": grade.percentage,
                "grade": grade.grade_symbol,
                "remark": grade.teacher_comments,
                "assessment_name": grade.assessment_name,
                "assessment_type_id": grade.assessment_type_id,
                "assessment_date": (
                    grade.assessment_date.isoformat()
                    if grade.assessment_date
                    else None
                ),
            }

        return {
            "students": gradebook,
            "assessments": sorted(
                assessments.values(),
                key=lambda item: (
                    item.get("assessment_date") or "",
                    item.get("assessment_name") or "",
                    item.get("assessment_type_id") or 0,
                ),
            ),
        }, None

    @staticmethod
    def calculate_final_grades(
        class_id,
        subject_id,
        term,
        academic_year,
        tenant_id,
        computed_by,
    ):
        """Compute final grades for a class/subject dynamically based on active categories."""
        from app.models.exam import Exam
        from app.models.grade import Grade
        from app.services.academic_configuration_service import \
            AcademicConfigurationService

        if not tenant_id:
            return False, "Tenant context is required"

        if not computed_by:
            return False, "Authenticated grade computation actor is required"

        class_obj = Class.query.without_tenant_filter().filter_by(
            id=class_id,
            tenant_id=tenant_id,
        ).first()

        if not class_obj:
            return False, "Class not found in tenant"

        subject_obj = Subject.query.without_tenant_filter().filter_by(
            id=subject_id,
            tenant_id=tenant_id,
        ).first()

        if not subject_obj:
            return False, "Subject not found in tenant"

        config = AcademicConfigurationService.build_harmonized_config(tenant_id)
        assessment_types = config.get("assessmentTypes") or []
        active_categories = {
            str(t["id"]): t
            for t in assessment_types
            if isinstance(t, dict) and t.get("isActive", True)
        }
        active_categories_by_name = {
            t["name"].strip().lower(): t
            for t in assessment_types
            if isinstance(t, dict) and t.get("isActive", True)
        }

        is_apc = False
        from app.models.tenant import Tenant

        tenant_obj = Tenant.query.get(tenant_id) if tenant_id else None
        if tenant_obj and tenant_obj.education_system == "APC":
            is_apc = True

        # Get all students in class
        students = Student.query.without_tenant_filter().filter_by(
            class_id=class_id,
            tenant_id=tenant_id,
        ).all()

        for student in students:
            category_scores = {}

            # 1. Fetch EnhancedGrade records
            enhanced_grades = EnhancedGrade.query.filter_by(
                student_id=student.id,
                class_id=class_id,
                subject_id=subject_id,
                term=term,
                academic_year=academic_year,
            ).all()

            for eg in enhanced_grades:
                cat_id = str(eg.assessment_type_id)
                matched_cat = None
                if cat_id in active_categories:
                    matched_cat = active_categories[cat_id]
                else:
                    for c_id, c in active_categories.items():
                        if (
                            c["name"].strip().lower()
                            == str(eg.assessment_type_id).strip().lower()
                        ):
                            matched_cat = c
                            break

                if matched_cat:
                    cat_key = matched_cat["id"]
                    if cat_key not in category_scores:
                        category_scores[cat_key] = []
                    category_scores[cat_key].append(eg.percentage)

            # 2. Fetch regular Grade records
            regular_grades = Grade.query.filter_by(
                student_id=student.id,
                class_id=class_id,
                subject_id=subject_id,
                term=term,
                academic_year=academic_year,
            ).all()

            for rg in regular_grades:
                exam_obj = rg.exam
                exam_type = (
                    exam_obj.assessment_type or rg.assessment_type
                    if exam_obj
                    else rg.assessment_type
                )

                if exam_type:
                    exam_type_str = str(exam_type).strip().lower()
                    matched_cat = None
                    if exam_type_str in active_categories:
                        matched_cat = active_categories[exam_type_str]
                    elif exam_type_str in active_categories_by_name:
                        matched_cat = active_categories_by_name[exam_type_str]

                    if matched_cat:
                        cat_key = matched_cat["id"]
                        if cat_key not in category_scores:
                            category_scores[cat_key] = []
                        category_scores[cat_key].append(rg.percentage)

            if not category_scores:
                continue

            if is_apc:
                all_scores = []
                for cat_id, scores in category_scores.items():
                    for s in scores:
                        if s > 20.0:
                            all_scores.append(s * 0.20)
                        else:
                            all_scores.append(s)
                if all_scores:
                    final_percentage = sum(all_scores) / len(all_scores)
                else:
                    final_percentage = 0.0
            else:
                final_percentage = 0.0
                for cat_id, cat in active_categories.items():
                    scores = category_scores.get(cat_id, [])
                    if scores:
                        category_avg = sum(scores) / len(scores)
                    else:
                        category_avg = 0.0
                    weight = float(cat.get("weight", 0))
                    final_percentage += category_avg * (weight / 100.0)

            # Create/Update FinalGrade
            grading_scheme = GradingScheme.query.without_tenant_filter().filter_by(
                tenant_id=tenant_id,
                is_active=True,
                is_default=True,
            ).first()

            if not grading_scheme:
                grading_scheme = GradingScheme.query.without_tenant_filter().filter_by(
                    tenant_id=tenant_id,
                    is_active=True,
                ).first()

            # Intentional system/global grading schemes are represented by
            # tenant_id IS NULL. Never fall through to another tenant.
            if not grading_scheme:
                grading_scheme = GradingScheme.query.filter_by(
                    tenant_id=None,
                    is_active=True,
                    is_default=True,
                ).first()

            if not grading_scheme:
                grading_scheme = GradingScheme.query.filter_by(
                    tenant_id=None,
                    is_active=True,
                ).first()

            if not grading_scheme:
                db.session.rollback()
                return False, "No active grading scheme is configured"

            final_grade = FinalGrade.query.filter_by(
                student_id=student.id,
                subject_id=subject_id,
                class_id=class_id,
                term=term,
                academic_year=academic_year,
            ).first()

            is_new_grade = False
            if not final_grade:
                is_new_grade = True
                final_grade = FinalGrade(
                    student_id=student.id,
                    subject_id=subject_id,
                    class_id=class_id,
                    grading_scheme_id=grading_scheme.id,
                    term=term,
                    academic_year=academic_year,
                    computed_by=computed_by,
                )

            # Rebind existing rows as well so stale or legacy foreign-key
            # references cannot retain a grading scheme from another tenant.
            final_grade.grading_scheme = grading_scheme
            final_grade.grading_scheme_id = grading_scheme.id

            final_grade.final_percentage = final_percentage
            final_grade.class_score_average = final_percentage  # Map final percentage

            # Determine final grade symbol
            scheme_to_use = grading_scheme or final_grade.grading_scheme
            if scheme_to_use:
                for boundary in sorted(
                    scheme_to_use.grade_boundaries, key=lambda x: x.sequence_order
                ):
                    if boundary.min_score <= final_percentage <= boundary.max_score:
                        final_grade.final_grade_symbol = boundary.grade_symbol
                        final_grade.final_grade_points = boundary.grade_points
                        final_grade.is_passing = boundary.is_passing
                        break
            else:
                # Simple fallback grading scale
                if final_percentage >= 80:
                    final_grade.final_grade_symbol, final_grade.is_passing = "A", True
                elif final_percentage >= 70:
                    final_grade.final_grade_symbol, final_grade.is_passing = "B", True
                elif final_percentage >= 60:
                    final_grade.final_grade_symbol, final_grade.is_passing = "C", True
                elif final_percentage >= 50:
                    final_grade.final_grade_symbol, final_grade.is_passing = "D", True
                elif final_percentage >= 40:
                    final_grade.final_grade_symbol, final_grade.is_passing = "E", True
                else:
                    final_grade.final_grade_symbol, final_grade.is_passing = "F", False

            if is_new_grade:
                db.session.add(final_grade)

        db.session.commit()
        return True, None

    @staticmethod
    def generate_broadsheet(
        class_id,
        term,
        academic_year,
        tenant_id,
    ):
        """Generate a tenant-scoped broadsheet for the class."""
        if not tenant_id:
            return None, "Tenant context is required"

        class_obj = Class.query.without_tenant_filter().filter_by(
            id=class_id,
            tenant_id=tenant_id,
        ).first()

        if not class_obj:
            return None, "Class not found"

        final_grades = FinalGrade.query.filter_by(
            class_id=class_id,
            term=term,
            academic_year=academic_year,
        ).all()

        student_ids = {
            fg.student_id
            for fg in final_grades
        }

        subject_ids = {
            fg.subject_id
            for fg in final_grades
        }

        students = (
            Student.query.filter(
                Student.id.in_(student_ids),
                Student.tenant_id == tenant_id,
                Student.class_id == class_id,
            ).all()
            if student_ids
            else []
        )

        subjects_for_tenant = (
            Subject.query.filter(
                Subject.id.in_(subject_ids),
                Subject.tenant_id == tenant_id,
            ).all()
            if subject_ids
            else []
        )

        students_by_id = {
            student.id: student
            for student in students
        }

        subjects_by_id = {
            subject.id: subject
            for subject in subjects_for_tenant
        }

        # Preserve current API contract:
        # Rows=Students, Columns=Subjects.
        broadsheet = {}
        subjects = set()

        for fg in final_grades:
            student = students_by_id.get(fg.student_id)
            subject = subjects_by_id.get(fg.subject_id)

            # FinalGrade itself has no tenant_id. Both parent resources must
            # independently resolve inside the authorized tenant.
            if not student or not subject:
                continue

            if fg.student_id not in broadsheet:
                broadsheet[fg.student_id] = {
                    "student_info": {
                        "name": (
                            f"{student.first_name} "
                            f"{student.last_name}"
                        ),
                        "admission_number": student.admission_number,
                    },
                    "results": {},
                }

            subjects.add(subject.name)

            broadsheet[fg.student_id]["results"][subject.name] = {
                "score": fg.final_percentage,
                "grade": fg.final_grade_symbol,
                "position": fg.class_rank,
            }

        return {
            "broadsheet": broadsheet,
            "subjects": sorted(list(subjects)),
        }, None
