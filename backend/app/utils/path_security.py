import os
from typing import Optional


def resolve_upload_path(app_root: str, relative_path: str) -> Optional[str]:
    """Return a canonical path only when it remains inside <app_root>/uploads."""
    if not relative_path or not isinstance(relative_path, str):
        return None

    uploads_root = os.path.realpath(os.path.join(app_root, "uploads"))
    candidate = os.path.realpath(os.path.join(app_root, relative_path))

    try:
        if os.path.commonpath([uploads_root, candidate]) != uploads_root:
            return None
    except (ValueError, OSError):
        return None

    return candidate
