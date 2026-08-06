from datetime import datetime

from sqlalchemy import JSON
from sqlalchemy.dialects.postgresql import UUID

from app.extensions import db


COMMENT_VISIBILITY_CHOICES = ("private", "teachers_only", "class", "school_wide")


class LessonComment(db.Model):
    """Model for lesson comments with soft-delete and approval workflow."""

    __tablename__ = "lesson_comments"

    id = db.Column(db.Integer, primary_key=True)

    lesson_id = db.Column(
        db.Integer,
        db.ForeignKey("lessons.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    author_id = db.Column(
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
    parent_comment_id = db.Column(
        db.Integer,
        db.ForeignKey("lesson_comments.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )

    content = db.Column(db.Text, nullable=False)
    visibility = db.Column(
        db.String(30), nullable=False, default="class"
    )
    requires_approval = db.Column(db.Boolean, nullable=False, default=True)
    is_approved = db.Column(db.Boolean, nullable=False, default=False)
    approved_by_id = db.Column(
        db.Integer, db.ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    approved_at = db.Column(db.DateTime, nullable=True)

    is_deleted = db.Column(db.Boolean, nullable=False, default=False)
    deleted_by_id = db.Column(
        db.Integer, db.ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    deleted_at = db.Column(db.DateTime, nullable=True)

    edited_at = db.Column(db.DateTime, nullable=True)
    edit_count = db.Column(db.Integer, nullable=False, default=0)

    created_by_ip = db.Column(db.String(45), nullable=True)
    created_by_user_agent = db.Column(db.Text, nullable=True)
    comment_metadata = db.Column(JSON, default=dict)

    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(
        db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow
    )

    lesson = db.relationship(
        "Lesson",
        backref=db.backref("comments", lazy="dynamic", cascade="all, delete-orphan"),
    )
    author = db.relationship(
        "User",
        foreign_keys=[author_id],
        backref=db.backref("lesson_comments_authored", lazy="dynamic"),
    )
    tenant = db.relationship(
        "Tenant", backref=db.backref("lesson_comments", lazy="dynamic")
    )
    approved_by = db.relationship(
        "User", foreign_keys=[approved_by_id], backref="lesson_comments_approved"
    )
    deleted_by = db.relationship(
        "User", foreign_keys=[deleted_by_id], backref="lesson_comments_deleted"
    )
    parent_comment = db.relationship(
        "LessonComment",
        remote_side=[id],
        backref=db.backref("replies", lazy="dynamic"),
    )

    def __repr__(self):
        return f"<LessonComment {self.id}: lesson={self.lesson_id} author={self.author_id}>"
