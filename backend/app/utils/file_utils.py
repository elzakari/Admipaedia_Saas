import mimetypes
import os
import uuid

import structlog
from flask import current_app
from werkzeug.utils import secure_filename

logger = structlog.get_logger()


class FileUtils:
    """Utility class for file operations."""

    ALLOWED_RESOURCE_EXTENSIONS = {
        "pdf",
        "doc",
        "docx",
        "ppt",
        "pptx",
        "xls",
        "xlsx",
        "txt",
        "png",
        "jpg",
        "jpeg",
        "gif",
        "mp4",
        "mp3",
        "csv",
        "zip",
        "rar",
        "heic",
        "webp",
    }

    CONTENT_TYPE_WHITELIST = {
        "application/pdf",
        "application/msword",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "application/vnd.ms-powerpoint",
        "application/vnd.openxmlformats-officedocument.presentationml.presentation",
        "application/vnd.ms-excel",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "text/plain",
        "text/csv",
        "image/png",
        "image/jpeg",
        "image/jpg",
        "image/gif",
        "image/webp",
        "image/heic",
        "image/heif",
        "video/mp4",
        "video/quicktime",
        "audio/mpeg",
        "audio/mp3",
        "application/zip",
        "application/x-rar-compressed",
        "application/vnd.rar",
        "application/octet-stream",
    }

    DEFAULT_MAX_UPLOAD_SIZE_BYTES = 25 * 1024 * 1024  # 25 MB

    RESOURCE_UPLOAD_FOLDER = "uploads/resources"
    PAYMENT_PROOF_UPLOAD_FOLDER = "uploads/payments"

    @staticmethod
    def get_max_upload_size():
        """Resolve the configured max upload size, defaulting to 25 MB."""
        try:
            configured = current_app.config.get("MAX_UPLOAD_SIZE_BYTES")
            if configured is not None:
                return int(configured)
        except Exception:
            pass
        return FileUtils.DEFAULT_MAX_UPLOAD_SIZE_BYTES

    @staticmethod
    def allowed_resource_file(filename):
        """Check if resource file extension is allowed."""
        return (
            "." in filename
            and filename.rsplit(".", 1)[1].lower()
            in FileUtils.ALLOWED_RESOURCE_EXTENSIONS
        )

    @staticmethod
    def validate_content_type(file, expected_filename=None):
        """Validate content-type against the whitelist.

        Falls back to extension-based MIME guess when the upload has no
        explicit mimetype or declares application/octet-stream.

        Returns (is_valid, normalized_mime_type, error_message).
        """
        filename = expected_filename or getattr(file, "filename", None) or ""
        declared_mime = (getattr(file, "mimetype", None) or "").strip().lower()

        if not declared_mime or declared_mime == "application/octet-stream":
            guessed, _ = mimetypes.guess_type(filename)
            declared_mime = (guessed or declared_mime or "").strip().lower()

        if not declared_mime:
            return False, None, "Unable to determine content type"

        if declared_mime not in FileUtils.CONTENT_TYPE_WHITELIST:
            return (
                False,
                declared_mime,
                f"Content type '{declared_mime}' is not allowed",
            )

        return True, declared_mime, None

    @staticmethod
    def validate_upload_size(file):
        """Validate upload size against the configured max.

        Returns (is_valid, actual_size_bytes, error_message).
        """
        max_size = FileUtils.get_max_upload_size()

        size_hint = getattr(file, "content_length", None)
        if size_hint is None and hasattr(file, "stream"):
            try:
                stream = file.stream
                pos_before = stream.tell()
                stream.seek(0, os.SEEK_END)
                size_hint = stream.tell()
                stream.seek(pos_before)
            except Exception:
                size_hint = None

        if size_hint and int(size_hint) > max_size:
            mb = max_size / (1024 * 1024)
            return (
                False,
                int(size_hint),
                f"File exceeds maximum allowed size of {mb:.0f} MB",
            )

        return True, size_hint, None

    @staticmethod
    def validate_upload(file, *, allow_empty=False):
        """Run the full validation chain: presence, extension, size, content-type.

        Returns (is_valid, info_dict, error_message) where info_dict contains
        the normalized mimetype and size.
        """
        if not file or not getattr(file, "filename", None):
            if allow_empty:
                return True, {"mime_type": None, "size": None}, None
            return False, None, "No file provided"

        if not FileUtils.allowed_resource_file(file.filename):
            return False, None, "File extension is not allowed"

        size_ok, size_bytes, size_err = FileUtils.validate_upload_size(file)
        if not size_ok:
            return False, {"size": size_bytes}, size_err

        mime_ok, mime_type, mime_err = FileUtils.validate_content_type(file)
        if not mime_ok:
            return False, {"mime_type": mime_type}, mime_err

        return True, {"mime_type": mime_type, "size": size_bytes}, None

    @staticmethod
    def upload_resource_file(file, resource_id=None):
        """Upload and save resource file."""
        try:
            if file and FileUtils.allowed_resource_file(file.filename):
                ok, _info, err = FileUtils.validate_upload(file)
                if not ok:
                    return None, err or "Validation failed"

                filename = secure_filename(file.filename)
                unique_filename = (
                    f"resource_{resource_id or uuid.uuid4().hex}_{filename}"
                )

                upload_path = os.path.join(
                    current_app.root_path, FileUtils.RESOURCE_UPLOAD_FOLDER
                )
                os.makedirs(upload_path, exist_ok=True)

                file_path = os.path.join(upload_path, unique_filename)
                file.save(file_path)

                logger.info(
                    "Resource file uploaded",
                    resource_id=resource_id,
                    filename=unique_filename,
                )
                return f"{FileUtils.RESOURCE_UPLOAD_FOLDER}/{unique_filename}", None

            return None, "Invalid file type or no file provided."

        except Exception as e:
            logger.error("Error uploading resource file", error=str(e))
            return None, f"Failed to upload resource file: {str(e)}"

    @staticmethod
    def upload_payment_proof(file, payment_reference: str | None = None):
        try:
            if not file or not file.filename:
                return None, "No file provided."
            if not FileUtils.allowed_resource_file(file.filename):
                return None, "Invalid file type."

            ok, _info, err = FileUtils.validate_upload(file)
            if not ok:
                return None, err or "Validation failed"

            filename = secure_filename(file.filename)
            unique_filename = (
                f"payment_{payment_reference or uuid.uuid4().hex}_{filename}"
            )

            upload_path = os.path.join(
                current_app.root_path, FileUtils.PAYMENT_PROOF_UPLOAD_FOLDER
            )
            os.makedirs(upload_path, exist_ok=True)

            file_path = os.path.join(upload_path, unique_filename)
            file.save(file_path)

            return f"{FileUtils.PAYMENT_PROOF_UPLOAD_FOLDER}/{unique_filename}", None
        except Exception as e:
            logger.error("Error uploading payment proof", error=str(e))
            return None, f"Failed to upload payment proof: {str(e)}"
