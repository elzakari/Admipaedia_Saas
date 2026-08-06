from datetime import datetime

from sqlalchemy.dialects.postgresql import UUID

from app.extensions import db


class LessonAttachment(db.Model):
    """Model for lesson attachments."""

    __tablename__ = "lesson_attachments"

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

    storage_key = db.Column(db.String(512), nullable=True)
    filename = db.Column(db.String(255), nullable=False)
    mime_type = db.Column(db.String(100), nullable=True)
    size = db.Column(db.Integer, nullable=True)
    link_url = db.Column(db.String(512), nullable=True)
    attachment_type = db.Column(
        db.String(50), nullable=False, default="file"
    )
    display_order = db.Column(db.Integer, nullable=False, default=0)
    uploader_id = db.Column(
        db.Integer, db.ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    attachment_metadata = db.Column(db.JSON, default=dict)

    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(
        db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow
    )

    lesson = db.relationship(
        "Lesson",
        backref=db.backref("attachments", lazy="dynamic", cascade="all, delete-orphan"),
    )
    tenant = db.relationship(
        "Tenant", backref=db.backref("lesson_attachments", lazy="dynamic")
    )
    uploader = db.relationship("User", backref=db.backref("lesson_attachments", lazy="dynamic"))

    def __repr__(self):
        return f"<LessonAttachment {self.id}: lesson={self.lesson_id} file={self.filename}>"
