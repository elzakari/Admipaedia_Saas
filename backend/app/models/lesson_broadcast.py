from datetime import datetime

from sqlalchemy.dialects.postgresql import UUID

from app.extensions import db


BROADCAST_STATUS_CHOICES = (
    "scheduled",
    "live",
    "paused",
    "ended",
    "cancelled",
    "rebroadcasting",
)


class LessonBroadcast(db.Model):
    """Model for lesson broadcasts with re-broadcast support."""

    __tablename__ = "lesson_broadcasts"

    id = db.Column(db.Integer, primary_key=True)

    lesson_id = db.Column(
        db.Integer,
        db.ForeignKey("lessons.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    tenant_id = db.Column(
        UUID(as_uuid=True),
        db.ForeignKey("tenants.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    parent_broadcast_id = db.Column(
        db.Integer,
        db.ForeignKey("lesson_broadcasts.id", ondelete="SET NULL"),
        nullable=True,
    )

    status = db.Column(
        db.String(30), nullable=False, default="scheduled", index=True
    )
    started_at = db.Column(db.DateTime, nullable=True)
    ended_at = db.Column(db.DateTime, nullable=True)
    peak_viewers = db.Column(db.Integer, nullable=False, default=0)
    scheduled_start = db.Column(db.DateTime, nullable=True)
    scheduled_end = db.Column(db.DateTime, nullable=True)
    stream_url = db.Column(db.String(512), nullable=True)
    recording_url = db.Column(db.String(512), nullable=True)
    viewer_count = db.Column(db.Integer, nullable=False, default=0)
    is_rebroadcast = db.Column(db.Boolean, nullable=False, default=False)
    rebroadcast_count = db.Column(db.Integer, nullable=False, default=0)
    broadcast_metadata = db.Column(db.JSON, default=dict)

    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(
        db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow
    )

    lesson = db.relationship(
        "Lesson", backref=db.backref("broadcasts", lazy="dynamic", cascade="all, delete-orphan")
    )
    tenant = db.relationship(
        "Tenant", backref=db.backref("lesson_broadcasts", lazy="dynamic")
    )
    parent_broadcast = db.relationship(
        "LessonBroadcast",
        remote_side=[id],
        backref=db.backref("rebroadcasts", lazy="dynamic"),
    )

    def __repr__(self):
        return f"<LessonBroadcast {self.id}: lesson={self.lesson_id} status={self.status}>"
