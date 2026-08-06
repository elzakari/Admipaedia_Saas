from datetime import datetime

from sqlalchemy.dialects.postgresql import UUID

from app.extensions import db


ACKNOWLEDGEMENT_ROLE_CHOICES = (
    "student",
    "parent",
    "teacher",
    "admin",
    "staff",
)


class LessonAcknowledgement(db.Model):
    """Source of truth for lesson acknowledgements per user+role."""

    __tablename__ = "lesson_acknowledgements"
    __table_args__ = (
        db.UniqueConstraint(
            "lesson_id",
            "user_id",
            "role",
            "tenant_id",
            name="uq_lesson_ack_lesson_user_role_tenant",
        ),
    )

    id = db.Column(db.Integer, primary_key=True)

    lesson_id = db.Column(
        db.Integer,
        db.ForeignKey("lessons.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    user_id = db.Column(
        db.Integer,
        db.ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    tenant_id = db.Column(
        UUID(as_uuid=True),
        db.ForeignKey("tenants.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    role = db.Column(db.String(30), nullable=False)
    acknowledged_at = db.Column(db.DateTime, nullable=True)
    seen_at = db.Column(db.DateTime, nullable=True)
    is_acknowledged = db.Column(db.Boolean, nullable=False, default=False)
    is_seen = db.Column(db.Boolean, nullable=False, default=False)
    acknowledgement_note = db.Column(db.Text, nullable=True)
    ack_metadata = db.Column(db.JSON, default=dict)

    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(
        db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow
    )

    lesson = db.relationship(
        "Lesson",
        backref=db.backref("acknowledgements", lazy="dynamic", cascade="all, delete-orphan"),
    )
    user = db.relationship(
        "User",
        backref=db.backref("lesson_acknowledgements", lazy="dynamic", cascade="all, delete-orphan"),
    )
    tenant = db.relationship(
        "Tenant", backref=db.backref("lesson_acknowledgements", lazy="dynamic")
    )

    def __repr__(self):
        return (
            f"<LessonAcknowledgement {self.id}: "
            f"lesson={self.lesson_id} user={self.user_id} role={self.role}>"
        )
