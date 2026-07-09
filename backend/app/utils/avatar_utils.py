import os

from flask import current_app
from werkzeug.utils import secure_filename


def get_upload_root() -> str:
    configured = str(current_app.config.get('UPLOAD_FOLDER') or 'uploads')
    if os.path.isabs(configured):
        return configured
    return os.path.join(os.path.dirname(current_app.root_path), configured)


def get_avatar_directory(prefer_legacy: bool = False) -> str:
    if prefer_legacy:
        return os.path.join(current_app.root_path, 'uploads', 'avatars')
    return os.path.join(get_upload_root(), 'avatars')


def resolve_avatar_file(filename: str):
    safe_name = secure_filename(filename)
    for avatar_dir in (get_avatar_directory(), get_avatar_directory(prefer_legacy=True)):
        candidate = os.path.join(avatar_dir, safe_name)
        if os.path.isfile(candidate):
            return avatar_dir, safe_name
    return None, safe_name


def normalize_avatar_url_for_response(value):
    if not value or not str(value).startswith('/api/v1/profile/avatar/'):
        return value

    filename = str(value).split('/api/v1/profile/avatar/', 1)[1]
    avatar_dir, safe_name = resolve_avatar_file(filename)
    if avatar_dir:
        return f"/api/v1/profile/avatar/{safe_name}"
    return None
