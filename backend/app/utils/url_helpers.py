from __future__ import annotations

from typing import Optional
from urllib.parse import urlparse

from flask import current_app, request


CANONICAL_FRONTEND_URL = "https://admipaedia.easymsdigit.com"
LOCAL_HOST_MARKERS = ("localhost", "127.0.0.1", "0.0.0.0", "::1")


def _is_local_host(hostname: str) -> bool:
    host = (hostname or "").strip().lower()
    return any(marker in host for marker in LOCAL_HOST_MARKERS)


def _normalize_base_url(raw_url: Optional[str], *, allow_local: bool = False) -> Optional[str]:
    value = (raw_url or "").strip().rstrip("/")
    if not value:
        return None

    if value.startswith("//"):
        value = f"https:{value}"

    parsed = urlparse(value if "://" in value else f"https://{value}")
    scheme = (parsed.scheme or "https").lower()
    netloc = (parsed.netloc or parsed.path or "").strip()
    hostname = (parsed.hostname or "").strip().lower()

    if scheme not in ("http", "https") or not netloc:
        return None
    if not allow_local and _is_local_host(hostname):
        return None

    return f"{scheme}://{netloc}".rstrip("/")


def get_frontend_base_url(preferred_url: Optional[str] = None) -> str:
    allow_local = bool(current_app.config.get("DEBUG") or current_app.config.get("TESTING"))

    candidates: list[Optional[str]] = [preferred_url, request.headers.get("Origin")]

    host = (request.headers.get("X-Forwarded-Host") or request.host or "").strip()
    proto = (request.headers.get("X-Forwarded-Proto") or request.scheme or "https").strip().lower()
    if host:
        candidates.append(f"{proto}://{host}")

    candidates.append(current_app.config.get("FRONTEND_URL"))

    for candidate in candidates:
        normalized = _normalize_base_url(candidate, allow_local=allow_local)
        if normalized:
            return normalized

    return CANONICAL_FRONTEND_URL
