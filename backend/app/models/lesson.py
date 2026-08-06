from datetime import datetime

from sqlalchemy import JSON
from sqlalchemy.dialects.postgresql import UUID

from app.extensions import db


LESSON_VISIBILITY_CHOICES = ("private", "class_only", "school_wide", "public")


class Lesson(db.Model):
    """Model for class lessons."""

    __tablename__ = "lessons"

    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(255), nullable=False)
    description = db.Column(db.Text, nullable=True)
    date = db.Column(db.Date, nullable=False)
    status = db.Column(
        db.String(50), default="planned"
    )
    materials = db.Column(JSON, default=list)

    period_number = db.Column(db.Integer, nullable=True)
    start_time = db.Column(db.Time, nullable=True)
    end_time = db.Column(db.Time, nullable=True)
    visibility = db.Column(
        db.String(30), nullable=False, default="class_only"
    )
    homework_due_date = db.Column(db.Date, nullable=True)

    strand = db.Column(JSON, default=list)
    objectives = db.Column(JSON, default=list)
    classwork = db.Column(JSON, default=dict)
    homework = db.Column(JSON, default=dict)
    assessment = db.Column(JSON, default=dict)

    engagement_seen_count = db.Column(db.Integer, nullable=False, default=0)
    engagement_ack_count = db.Column(db.Integer, nullable=False, default=0)

    tenant_id = db.Column(
        UUID(as_uuid=True), db.ForeignKey("tenants.id"), nullable=True, index=True
    )
    subject_id = db.Column(
        db.Integer, db.ForeignKey("subjects.id", ondelete="SET NULL"), nullable=True
    )
    class_id = db.Column(
        db.Integer, db.ForeignKey("classes.id", ondelete="CASCADE"), nullable=False
    )
    teacher_id = db.Column(db.Integer, db.ForeignKey("teachers.id"), nullable=True)

    class_ = db.relationship("Class", backref=db.backref("lessons", lazy="dynamic"))
    teacher = db.relationship("Teacher", backref=db.backref("lessons", lazy="dynamic"))
    subject = db.relationship(
        "Subject", backref=db.backref("lessons", lazy="dynamic")
    )
    tenant = db.relationship(
        "Tenant", backref=db.backref("lessons", lazy="dynamic")
    )

    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(
        db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow
    )

    def __repr__(self):
        return f"<Lesson {self.id}: {self.title}>"
