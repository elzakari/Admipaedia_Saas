from datetime import datetime
from decimal import Decimal

import structlog
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import joinedload

from app.extensions import db
from app.models.class_ import Class
from app.models.lesson import Lesson
from app.models.lesson_homework_submission import (
    LessonHomeworkSubmission,
    SUBMISSION_TYPE_CHOICES,
)
from app.models.student import Student
from app.services.adapters.storage.base import StorageProvider

logger = structlog.get_logger()


class LessonHomeworkService:
    """Service for lesson homework submission and grading operations."""

    VALID_SUBMISSION_TYPES = set(SUBMISSION_TYPE_CHOICES)

    @staticmethod
    def _resolve_signed_url(storage, storage_key):
        if not storage or not storage_key:
            return None
        try:
            return storage.get_signed_url(key=storage_key, expires_in=3600)
        except Exception as exc:
            logger.debug(
                "homework_signed_url_failed",
                storage_key=storage_key,
                error=str(exc),
            )
            return None

    @staticmethod
    def _serialize_submission(submission, storage=None):
        if submission is None:
            return None

        storage_key = getattr(submission, "storage_key", None)
        signed_url = LessonHomeworkService._resolve_signed_url(storage, storage_key)

        student = getattr(submission, "student", None)
        student_name = None
        if student:
            student_name = (
                f"{getattr(student, 'first_name', '')} {getattr(student, 'last_name', '')}".strip()
                or getattr(student, "name", None)
                or f"Student #{student.id}"
            )

        grader = getattr(submission, "grader", None)
        grader_name = None
        if grader:
            grader_name = (
                f"{getattr(grader, 'first_name', '')} {getattr(grader, 'last_name', '')}".strip()
                or getattr(grader, "username", None)
                or f"User #{grader.id}"
            )

        return {
            "id": submission.id,
            "lesson_id": submission.lesson_id,
            "student_id": submission.student_id,
            "student_name": student_name,
            "tenant_id": str(submission.tenant_id) if submission.tenant_id else None,
            "submission_type": submission.submission_type,
            "submission_text": submission.submission_text,
            "storage_key": storage_key,
            "signed_url": signed_url,
            "link_url": submission.link_url,
            "submitted_at": (
                submission.submitted_at.isoformat() if submission.submitted_at else None
            ),
            "graded_by_user_id": submission.graded_by_user_id,
            "graded_by_name": grader_name,
            "grade_number": (
                float(submission.grade_number)
                if isinstance(submission.grade_number, Decimal)
                else submission.grade_number
            ),
            "feedback": submission.feedback,
            "created_at": (
                submission.created_at.isoformat() if submission.created_at else None
            ),
            "updated_at": (
                submission.updated_at.isoformat() if submission.updated_at else None
            ),
        }

    @staticmethod
    def _validate_payload(payload, submission_type):
        errors = []
        if submission_type not in LessonHomeworkService.VALID_SUBMISSION_TYPES:
            errors.append(
                f"submission_type must be one of: {sorted(LessonHomeworkService.VALID_SUBMISSION_TYPES)}"
            )
            return errors

        if submission_type == "text":
            text = (payload.get("submission_text") or "").strip()
            if not text:
                errors.append("submission_text is required for text submissions")
            elif len(text) > 50000:
                errors.append("submission_text exceeds maximum length of 50000 chars")

        elif submission_type == "file":
            storage_key = (payload.get("storage_key") or "").strip()
            file_payload = payload.get("file")
            if not storage_key and file_payload is None:
                errors.append(
                    "Either storage_key (pre-uploaded) or file payload is required for file submissions"
                )

        elif submission_type == "link":
            link_url = (payload.get("link_url") or "").strip()
            if not link_url:
                errors.append("link_url is required for link submissions")
            elif len(link_url) > 1024:
                errors.append("link_url exceeds maximum length of 1024 chars")
            elif not (link_url.startswith("http://") or link_url.startswith("https://")):
                errors.append("link_url must be a valid http(s) URL")

        return errors

    @staticmethod
    def submit_homework(
        lesson_id,
        student_id,
        payload,
        storage_adapter=None,
    ):
        """Submit homework for a lesson on behalf of a student.

        Args:
            lesson_id: The lesson the homework submission is for
            student_id: Student making the submission
            payload: Dict with submission_type and the payload (text/storage_key/link)
            storage_adapter: Optional StorageProvider used to validate storage keys
                and refresh signed URLs on serialization.

        Returns:
            Tuple of (submission_obj, error_message)
        """
        try:
            lesson = Lesson.query.get(int(lesson_id))
            if not lesson:
                return None, "Lesson not found"

            class_ = getattr(lesson, "class_", None) or Class.query.get(
                getattr(lesson, "class_id", None)
            )
            if class_ and getattr(lesson, "class_", None) is None:
                lesson.class_ = class_

            tenant_id = getattr(class_, "tenant_id", None) or getattr(
                lesson, "tenant_id", None
            )

            student = Student.query.get(int(student_id))
            if not student:
                return None, "Student not found"

            if tenant_id is None:
                tenant_id = getattr(student, "tenant_id", None)

            if getattr(student, "class_id", None) and lesson.class_id:
                if int(student.class_id) != int(lesson.class_id):
                    from app.services.identity_resolver import IdentityResolver
                    from app.models.user import User

                    user_linked = User.query.filter_by(
                        id=getattr(student, "user_id", 0) or 0
                    ).first()
                    if not IdentityResolver.can_user_access_class(
                        getattr(user_linked, "id", None) or 0, lesson.class_id
                    ):
                        return None, (
                            "Student does not belong to the class associated with this lesson"
                        )

            payload = dict(payload or {})
            submission_type = str(payload.get("submission_type") or "text").strip().lower()
            if submission_type not in LessonHomeworkService.VALID_SUBMISSION_TYPES:
                submission_type = "text"
                payload.setdefault("submission_text", payload.get("content") or "")

            errors = LessonHomeworkService._validate_payload(payload, submission_type)
            if errors:
                return None, "; ".join(errors)

            file_upload = payload.get("file")
            storage_key = (payload.get("storage_key") or "").strip() or None
            if submission_type == "file" and file_upload is not None and storage_adapter is not None:
                filename = getattr(file_upload, "filename", None)
                if not filename:
                    return None, "File upload missing filename"

                from app.utils.file_utils import FileUtils

                ok, _info, err = FileUtils.validate_upload(file_upload)
                if not ok:
                    return None, err or "File failed validation"

                safe_key = (
                    f"homework/lesson_{lesson.id}/student_{student.id}/"
                    f"{datetime.utcnow().strftime('%Y%m%d%H%M%S')}_{filename}"
                )

                data_bytes = file_upload.read()
                result = storage_adapter.put_file(
                    key=safe_key,
                    data=data_bytes,
                    content_type=getattr(file_upload, "mimetype", None),
                    metadata={
                        "lesson_id": str(lesson.id),
                        "student_id": str(student.id),
                        "uploaded_by": f"student:{student.id}",
                    },
                )
                if not result or not result.success:
                    return None, "Failed to persist file to storage"
                storage_key = result.key or safe_key

            existing = LessonHomeworkSubmission.query.filter_by(
                lesson_id=lesson.id,
                student_id=student.id,
            ).first()

            now = datetime.utcnow()
            if existing is None:
                submission = LessonHomeworkSubmission(
                    lesson_id=lesson.id,
                    student_id=student.id,
                    tenant_id=tenant_id,
                    submission_type=submission_type,
                    submission_text=(
                        (payload.get("submission_text") or "").strip() or None
                    ),
                    storage_key=storage_key,
                    link_url=(
                        (payload.get("link_url") or "").strip() or None
                    ),
                    submitted_at=now,
                    created_at=now,
                    updated_at=now,
                )
                db.session.add(submission)
            else:
                existing.submission_type = submission_type
                existing.submission_text = (
                    (payload.get("submission_text") or "").strip() or None
                )
                if storage_key:
                    existing.storage_key = storage_key
                link_in_payload = (payload.get("link_url") or "").strip()
                if link_in_payload:
                    existing.link_url = link_in_payload
                existing.submitted_at = now
                existing.updated_at = now
                submission = existing

            db.session.flush()
            db.session.commit()

            storage_to_use = storage_adapter
            if storage_to_use is None and getattr(submission, "storage_key", None):
                try:
                    from app.services.adapters.storage.factory import StorageProviderFactory
                    storage_to_use = StorageProviderFactory.default()
                except Exception:
                    storage_to_use = None

            logger.info(
                "homework_submitted",
                submission_id=submission.id,
                lesson_id=lesson.id,
                student_id=student.id,
                submission_type=submission_type,
            )
            return submission, None

        except SQLAlchemyError as e:
            db.session.rollback()
            logger.error(
                "submit_homework_db_error",
                lesson_id=lesson_id,
                student_id=student_id,
                error=str(e),
            )
            return None, f"Database error: {str(e)}"
        except Exception as e:
            db.session.rollback()
            logger.error(
                "submit_homework_error",
                lesson_id=lesson_id,
                student_id=student_id,
                error=str(e),
            )
            return None, str(e)

    @staticmethod
    def grade_submission(
        submission_id,
        grader_id,
        grade,
        feedback=None,
    ):
        """Grade a homework submission.

        Args:
            submission_id: ID of the submission to grade
            grader_id: User ID of the teacher/admin grading
            grade: Numeric grade (int, float, or Decimal). Pass None to clear.
            feedback: Optional text feedback.

        Returns:
            Tuple of (updated_submission, error_message)
        """
        try:
            submission = LessonHomeworkSubmission.query.options(
                joinedload(LessonHomeworkSubmission.lesson),
                joinedload(LessonHomeworkSubmission.student),
            ).get(int(submission_id))
            if not submission:
                return None, "Submission not found"

            lesson = getattr(submission, "lesson", None)
            if lesson is None:
                lesson = Lesson.query.get(submission.lesson_id)

            if lesson is not None:
                from app.models.teacher import Teacher
                from app.services.identity_resolver import IdentityResolver

                grader_teacher = Teacher.query.filter_by(user_id=int(grader_id)).first()
                if grader_teacher is not None:
                    if (
                        getattr(lesson, "teacher_id", None)
                        and int(lesson.teacher_id) != int(grader_teacher.id)
                    ):
                        if not IdentityResolver.can_user_access_class(
                            int(grader_id), lesson.class_id
                        ):
                            return (
                                None,
                                "You are not authorized to grade submissions for this lesson",
                            )
                elif not IdentityResolver.can_user_access_class(
                    int(grader_id), lesson.class_id
                ):
                    return (
                        None,
                        "You are not authorized to grade submissions for this lesson",
                    )

            if grade is not None:
                try:
                    normalized_grade = Decimal(str(grade))
                except Exception:
                    return None, "grade must be a valid number"
                if normalized_grade < 0:
                    return None, "grade must be non-negative"
            else:
                normalized_grade = None

            submission.graded_by_user_id = int(grader_id)
            submission.grade_number = normalized_grade
            if feedback is not None:
                submission.feedback = (
                    str(feedback).strip() or None
                )
            submission.updated_at = datetime.utcnow()

            db.session.commit()

            logger.info(
                "homework_graded",
                submission_id=submission.id,
                grader_id=grader_id,
                grade=str(normalized_grade) if normalized_grade is not None else None,
            )
            return submission, None

        except SQLAlchemyError as e:
            db.session.rollback()
            logger.error(
                "grade_submission_db_error",
                submission_id=submission_id,
                grader_id=grader_id,
                error=str(e),
            )
            return None, f"Database error: {str(e)}"
        except Exception as e:
            db.session.rollback()
            logger.error(
                "grade_submission_error",
                submission_id=submission_id,
                grader_id=grader_id,
                error=str(e),
            )
            return None, str(e)

    @staticmethod
    def list_submissions_for_lesson(
        lesson_id,
        *,
        storage_adapter=None,
        student_id=None,
        include_graded_only=None,
    ):
        """List all homework submissions for a lesson.

        Args:
            lesson_id: Lesson whose submissions to fetch
            storage_adapter: Optional StorageProvider used for signed URL refresh
            student_id: Optional filter for a single student
            include_graded_only: True -> graded, False -> ungraded, None -> all

        Returns:
            Tuple of (lesson, submissions_list, error_message)
        """
        try:
            lesson = Lesson.query.options(
                joinedload(Lesson.class_),
                joinedload(Lesson.teacher),
            ).get(int(lesson_id))
            if not lesson:
                return None, None, "Lesson not found"

            query = LessonHomeworkSubmission.query.options(
                joinedload(LessonHomeworkSubmission.student),
                joinedload(LessonHomeworkSubmission.grader),
            ).filter(LessonHomeworkSubmission.lesson_id == lesson.id)

            if student_id is not None:
                query = query.filter(
                    LessonHomeworkSubmission.student_id == int(student_id)
                )

            if include_graded_only is True:
                query = query.filter(
                    LessonHomeworkSubmission.grade_number.isnot(None)
                )
            elif include_graded_only is False:
                query = query.filter(
                    LessonHomeworkSubmission.grade_number.is_(None)
                )

            submissions = query.order_by(
                LessonHomeworkSubmission.submitted_at.desc().nullslast(),
                LessonHomeworkSubmission.created_at.desc(),
            ).all()

            storage = storage_adapter
            if storage is None:
                try:
                    from app.services.adapters.storage.factory import StorageProviderFactory
                    storage = StorageProviderFactory.default()
                except Exception:
                    storage = None

            serialized = [
                LessonHomeworkService._serialize_submission(s, storage=storage)
                for s in submissions
            ]

            return lesson, serialized, None

        except SQLAlchemyError as e:
            logger.error(
                "list_submissions_db_error",
                lesson_id=lesson_id,
                error=str(e),
            )
            return None, None, f"Database error: {str(e)}"
        except Exception as e:
            logger.error(
                "list_submissions_error",
                lesson_id=lesson_id,
                error=str(e),
            )
            return None, None, str(e)

    @staticmethod
    def summarize_homework_for_parent(parent_profile, student_ids=None):
        """Return a per-student summary of recent homework for a parent's children."""
        if parent_profile is None:
            return [], "Parent profile not found"

        try:
            if student_ids is None:
                student_q = Student.query.filter_by(
                    parent_id=int(parent_profile.id)
                )
            else:
                student_q = Student.query.filter(
                    Student.parent_id == int(parent_profile.id),
                    Student.id.in_([int(x) for x in student_ids]),
                )
            students = student_q.all()
            if not students:
                return [], None

            id_to_student = {s.id: s for s in students}
            student_ids_int = [s.id for s in students]

            rows = (
                LessonHomeworkSubmission.query.options(
                    joinedload(LessonHomeworkSubmission.lesson),
                    joinedload(LessonHomeworkSubmission.lesson).joinedload(Lesson.class_),
                )
                .filter(LessonHomeworkSubmission.student_id.in_(student_ids_int))
                .order_by(
                    LessonHomeworkSubmission.submitted_at.desc().nullslast(),
                    LessonHomeworkSubmission.created_at.desc(),
                )
                .limit(200)
                .all()
            )

            summary_by_student = {}
            for s in students:
                student_name = (
                    f"{getattr(s, 'first_name', '')} {getattr(s, 'last_name', '')}".strip()
                    or getattr(s, "name", None)
                    or f"Student #{s.id}"
                )
                summary_by_student[s.id] = {
                    "student_id": s.id,
                    "student_name": student_name,
                    "class_id": getattr(s, "class_id", None),
                    "class_name": getattr(getattr(s, "class_", None), "name", None),
                    "total_submissions": 0,
                    "graded_count": 0,
                    "pending_count": 0,
                    "average_grade": None,
                    "latest_submissions": [],
                }

            total_by_id = {s.id: Decimal(0) for s in students}
            graded_by_id = {s.id: 0 for s in students}

            for row in rows:
                sid = row.student_id
                bucket = summary_by_student.get(sid)
                if bucket is None:
                    continue

                bucket["total_submissions"] += 1
                is_graded = row.grade_number is not None
                if is_graded:
                    bucket["graded_count"] += 1
                    graded_by_id[sid] += 1
                    total_by_id[sid] += Decimal(row.grade_number)
                else:
                    bucket["pending_count"] += 1

                lesson = getattr(row, "lesson", None)
                bucket["latest_submissions"].append(
                    {
                        "submission_id": row.id,
                        "lesson_id": row.lesson_id,
                        "lesson_title": getattr(lesson, "title", None),
                        "lesson_date": (
                            lesson.date.isoformat()
                            if getattr(lesson, "date", None)
                            else None
                        ),
                        "class_id": getattr(lesson, "class_id", None),
                        "class_name": getattr(
                            getattr(lesson, "class_", None), "name", None
                        ),
                        "submission_type": row.submission_type,
                        "submitted_at": (
                            row.submitted_at.isoformat()
                            if row.submitted_at
                            else None
                        ),
                        "grade_number": (
                            float(row.grade_number)
                            if isinstance(row.grade_number, Decimal)
                            else row.grade_number
                        ),
                        "feedback": row.feedback,
                    }
                )

            for sid, agg in summary_by_student.items():
                if graded_by_id[sid] > 0:
                    avg = total_by_id[sid] / Decimal(graded_by_id[sid])
                    agg["average_grade"] = float(avg)
                latest = agg["latest_submissions"]
                agg["latest_submissions"] = latest[:10]

            return list(summary_by_student.values()), None

        except SQLAlchemyError as e:
            logger.error(
                "summarize_homework_parent_db_error",
                parent_id=getattr(parent_profile, "id", None),
                error=str(e),
            )
            return [], f"Database error: {str(e)}"
        except Exception as e:
            logger.error(
                "summarize_homework_parent_error",
                parent_id=getattr(parent_profile, "id", None),
                error=str(e),
            )
            return [], str(e)
