import logging
import os

from flask import Blueprint, current_app, g, jsonify, request, send_file
from flask_jwt_extended import get_jwt_identity, jwt_required

from app.models.announcement import Announcement
from app.models.assignment import Assignment
from app.models.assignment_submission import AssignmentSubmission
from app.models.attachment import Attachment
from app.models.dashboard import Notification
from app.models.message import Message
from app.models.parent import Parent
from app.models.student import Student
from app.models.teacher import Teacher
from app.models.tenant import TenantMembership
from app.models.user import User
from app.utils.file_utils import FileUtils
from app.utils.response import error_response

logger = logging.getLogger(__name__)

attachments_bp = Blueprint("attachments", __name__)


def _authorize_attachment_access(attachment, current_user_id):
    """Return True if current_user_id is authorized to access the attachment."""
    if attachment.uploader_id == current_user_id:
        return True

    if attachment.tenant_id:
        membership = TenantMembership.query.filter_by(
            user_id=current_user_id, tenant_id=attachment.tenant_id
        ).first()
        if membership and membership.role in (
            "admin",
            "school_admin",
            "super_admin",
            "super_manager",
        ):
            return True

    entity_type = attachment.entity_type
    entity_id = attachment.entity_id

    if entity_type == "message":
        msg = Message.query.get(entity_id)
        if msg and (
            msg.sender_id == current_user_id or msg.recipient_id == current_user_id
        ):
            return True

    elif entity_type == "notification":
        notif = Notification.query.get(entity_id)
        if notif and notif.recipient_id == current_user_id:
            return True

    elif entity_type == "assignment":
        assignment = Assignment.query.get(entity_id)
        if assignment:
            teacher_profile = Teacher.query.filter_by(user_id=current_user_id).first()
            if teacher_profile and assignment.teacher_id == teacher_profile.id:
                return True
            student_profile = Student.query.filter_by(user_id=current_user_id).first()
            if student_profile and student_profile.class_id == assignment.class_id:
                return True
            parent_profile = Parent.query.filter_by(user_id=current_user_id).first()
            if parent_profile:
                children = Student.query.filter_by(parent_id=parent_profile.id).all()
                if any(c.class_id == assignment.class_id for c in children):
                    return True

    elif entity_type == "assignment_submission":
        submission = AssignmentSubmission.query.get(entity_id)
        if submission and submission.assignment:
            teacher_profile = Teacher.query.filter_by(user_id=current_user_id).first()
            if (
                teacher_profile
                and submission.assignment.teacher_id == teacher_profile.id
            ):
                return True
            student_profile = Student.query.filter_by(user_id=current_user_id).first()
            if student_profile and submission.student_id == student_profile.id:
                return True
            parent_profile = Parent.query.filter_by(user_id=current_user_id).first()
            if parent_profile:
                children = Student.query.filter_by(parent_id=parent_profile.id).all()
                if any(c.id == submission.student_id for c in children):
                    return True

    elif entity_type == "announcement":
        announcement = Announcement.query.get(entity_id)
        if announcement:
            teacher_profile = Teacher.query.filter_by(user_id=current_user_id).first()
            if teacher_profile and announcement.teacher_id == teacher_profile.id:
                return True
            student_profile = Student.query.filter_by(user_id=current_user_id).first()
            if student_profile and student_profile.class_id == announcement.class_id:
                return True
            parent_profile = Parent.query.filter_by(user_id=current_user_id).first()
            if parent_profile:
                children = Student.query.filter_by(parent_id=parent_profile.id).all()
                if any(c.class_id == announcement.class_id for c in children):
                    return True

    elif entity_type == "lesson_attachment":
        from app.models.lesson import Lesson

        try:
            lesson_id_int = int(entity_id)
        except (TypeError, ValueError):
            lesson_id_int = None
        if lesson_id_int:
            lesson = Lesson.query.get(lesson_id_int)
            if lesson:
                teacher_profile = Teacher.query.filter_by(
                    user_id=current_user_id
                ).first()
                if teacher_profile and lesson.teacher_id == teacher_profile.id:
                    return True
                from app.services.identity_resolver import IdentityResolver

                if IdentityResolver.can_user_access_class(
                    current_user_id, lesson.class_id
                ):
                    return True

    elif entity_type == "homework_submission":
        from app.models.lesson_homework_submission import LessonHomeworkSubmission

        try:
            sub_id_int = int(entity_id)
        except (TypeError, ValueError):
            sub_id_int = None
        if sub_id_int:
            hw = LessonHomeworkSubmission.query.get(sub_id_int)
            if hw and hw.lesson:
                teacher_profile = Teacher.query.filter_by(
                    user_id=current_user_id
                ).first()
                if teacher_profile and hw.lesson.teacher_id == teacher_profile.id:
                    return True
                student_profile = Student.query.filter_by(user_id=current_user_id).first()
                if student_profile and hw.student_id == student_profile.id:
                    return True
                parent_profile = Parent.query.filter_by(user_id=current_user_id).first()
                if parent_profile:
                    children = Student.query.filter_by(parent_id=parent_profile.id).all()
                    if any(c.id == hw.student_id for c in children):
                        return True

    return False


def _refresh_signed_url_via_adapter(storage_key, *, expires_in=3600):
    """Generate a signed download URL ONLY through the StorageProvider adapter.

    This is the single entry point for signed URL refreshes — callers MUST
    NOT use boto3 / minio SDKs directly.
    """
    if not storage_key:
        return None
    try:
        from app.services.adapters.storage.factory import StorageProviderFactory

        storage = StorageProviderFactory.default()
        return storage.get_signed_url(key=storage_key, expires_in=int(expires_in))
    except Exception as exc:
        logger.warning(
            "signed_url_refresh_failed",
            storage_key=storage_key,
            error=str(exc),
        )
        return None


@attachments_bp.route("/signed-url", methods=["POST"])
@jwt_required()
def refresh_signed_url():
    """Refresh a signed URL for a storage-managed file through the adapter.

    Body: {"storage_key": "path/to/blob", "expires_in": 3600}

    Never calls cloud SDKs directly — the StorageProvider adapter is the
    sole integration surface.
    """
    current_user_id = int(get_jwt_identity())
    payload = request.get_json(silent=True) or {}

    storage_key = payload.get("storage_key")
    if not storage_key or not isinstance(storage_key, str) or not storage_key.strip():
        return error_response(message="storage_key is required", status_code=400)

    attachment_id = payload.get("attachment_id")
    if attachment_id:
        att = Attachment.query.get(attachment_id)
        if not att:
            return error_response(message="Attachment not found", status_code=404)
        if not _authorize_attachment_access(att, current_user_id):
            return error_response(
                message="You are not authorized to access this attachment",
                status_code=403,
            )

    try:
        expires_in = int(payload.get("expires_in", 3600))
    except (TypeError, ValueError):
        expires_in = 3600
    expires_in = max(60, min(expires_in, 86400))

    signed_url = _refresh_signed_url_via_adapter(storage_key, expires_in=expires_in)
    if not signed_url:
        return error_response(
            message="Unable to generate signed URL for this resource",
            status_code=500,
        )

    return (
        jsonify(
            {
                "success": True,
                "storage_key": storage_key,
                "signed_url": signed_url,
                "expires_in": expires_in,
            }
        ),
        200,
    )


@attachments_bp.route("/validation/limits", methods=["GET"])
@jwt_required()
def get_upload_limits():
    """Return the configured upload size limit and content-type whitelist."""
    max_bytes = FileUtils.get_max_upload_size()
    return (
        jsonify(
            {
                "success": True,
                "max_upload_size_bytes": max_bytes,
                "max_upload_size_mb": round(max_bytes / (1024 * 1024), 2),
                "allowed_extensions": sorted(FileUtils.ALLOWED_RESOURCE_EXTENSIONS),
                "content_type_whitelist": sorted(FileUtils.CONTENT_TYPE_WHITELIST),
            }
        ),
        200,
    )


@attachments_bp.route("/validate", methods=["POST"])
@jwt_required()
def validate_upload_prospect():
    """Pre-validate a filename / size / content-type before actual upload.

    Useful for UIs that want to surface validation errors early.

    Body: {"filename": "notes.pdf", "size_bytes": 123456, "content_type": "application/pdf"}
    """
    payload = request.get_json(silent=True) or {}
    filename = (payload.get("filename") or "").strip()
    content_type = (payload.get("content_type") or "").strip().lower() or None
    try:
        size_bytes = int(payload.get("size_bytes") or 0)
    except (TypeError, ValueError):
        size_bytes = 0

    issues = []
    if not filename:
        issues.append("filename is required")
    elif not FileUtils.allowed_resource_file(filename):
        issues.append("File extension is not allowed")

    max_size = FileUtils.get_max_upload_size()
    if size_bytes and size_bytes > max_size:
        issues.append(
            f"File exceeds maximum allowed size of {round(max_size / (1024 * 1024), 1)} MB"
        )

    if content_type and content_type not in FileUtils.CONTENT_TYPE_WHITELIST:
        issues.append(f"Content type '{content_type}' is not allowed")

    return (
        jsonify(
            {
                "success": True,
                "valid": len(issues) == 0,
                "issues": issues,
                "limits": {
                    "max_upload_size_bytes": max_size,
                    "allowed_extensions": sorted(FileUtils.ALLOWED_RESOURCE_EXTENSIONS),
                    "content_type_whitelist": sorted(FileUtils.CONTENT_TYPE_WHITELIST),
                },
            }
        ),
        200,
    )


@attachments_bp.route("/<id>/download", methods=["GET"])
@jwt_required()
def download_attachment(id):
    current_user_id = int(get_jwt_identity())

    attachment = Attachment.query.get(id)
    if not attachment:
        if id.startswith("legacy_"):
            parts = id.split("_", 2)
            if len(parts) >= 3:
                msg_id = int(parts[1])
                filename = parts[2]
                from app.services.message_service import MessageService

                message = MessageService.get_message_by_id(msg_id, current_user_id)
                if not message:
                    return error_response(
                        message="Access denied to legacy attachment", status_code=403
                    )

                file_path = MessageService.get_attachment_path(msg_id, filename)
                if not file_path or not os.path.exists(file_path):
                    return error_response(
                        message="Legacy attachment file not found", status_code=404
                    )
                from flask import make_response

                response = make_response(send_file(file_path, download_name=filename))
                response.headers["Content-Disposition"] = (
                    f'attachment; filename="{filename}"'
                )
                return response
        return error_response(message="Attachment not found", status_code=404)

    if not _authorize_attachment_access(attachment, current_user_id):
        return error_response(
            message="You are not authorized to download this attachment",
            status_code=403,
        )

    storage_key = getattr(attachment, "storage_key", None)
    if storage_key and str(storage_key).strip():
        redirect_to = request.args.get("redirect", "0").lower() in (
            "1",
            "true",
            "yes",
        )
        signed_url = _refresh_signed_url_via_adapter(
            storage_key, expires_in=3600
        )
        if signed_url:
            if redirect_to:
                from flask import redirect as flask_redirect

                return flask_redirect(signed_url, code=302)
            return (
                jsonify(
                    {
                        "success": True,
                        "download_via": "signed_url",
                        "signed_url": signed_url,
                        "attachment": {
                            "id": attachment.id,
                            "filename": attachment.filename,
                            "mime_type": getattr(attachment, "mime_type", None),
                            "size": getattr(attachment, "size", None),
                        },
                    }
                ),
                200,
            )

    full_path = os.path.join(current_app.root_path, attachment.file_path)
    if not os.path.exists(full_path):
        return error_response(message="File not found on server", status_code=404)

    from flask import make_response

    response = make_response(send_file(full_path, download_name=attachment.filename))
    response.headers["Content-Disposition"] = (
        f'attachment; filename="{attachment.filename}"'
    )
    return response
