from datetime import datetime
from decimal import Decimal

from sqlalchemy.dialects.postgresql import UUID

from app.extensions import db


SUBMISSION_TYPE_CHOICES = ("text", "file", "link")


class LessonHomeworkSubmission(db.Model):
    """Model for lesson homework submissions by students."""

    __tablename__ = "homework_submissions"

    id = db.Column(db.Integer, primary_key=True)

    lesson_id = db.Column(
        db.Integer,
        db.ForeignKey("lessons.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    student_id = db.Column(
        db.Integer,
        db.ForeignKey("students.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    tenant_id = db.Column(
        UUID(as_uuid=True),
        db.ForeignKey("tenants.id", ondelete="CASCADE"),
        nullable=True,
        index=True,
    )

    submission_type = db.Column(
        db.String(20), nullable=False, default="text"
    )
    submission_text = db.Column(db.Text, nullable=True)
    storage_key = db.Column(db.String(512), nullable=True)
    link_url = db.Column(db.String(1024), nullable=True)

    submitted_at = db.Column(db.DateTime, default=datetime.utcnow)

    graded_by_user_id = db.Column(
        db.Integer,
        db.ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    grade_number = db.Column(db.Numeric(10, 2), nullable=True)
    feedback = db.Column(db.Text, nullable=True)

    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(
        db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow
    )

    lesson = db.relationship(
        "Lesson",
        backref=db.backref("homework_submissions", lazy="dynamic", cascade="all, delete-orphan"),
    )
    student = db.relationship(
        "Student", backref=db.backref("homework_submissions", lazy="dynamic")
    )
    tenant = db.relationship(
        "Tenant", backref=db.backref("homework_submissions", lazy="dynamic")
    )
    grader = db.relationship(
        "User", backref=db.backref("graded_homework_submissions", lazy="dynamic")
    )

    def __repr__(self):
        return (
            f"<LessonHomeworkSubmission {self.id}: "
            f"lesson={self.lesson_id} student={self.student_id} "
            f"type={self.submission_type}>"
        )
