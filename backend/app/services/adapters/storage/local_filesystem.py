from __future__ import annotations

import os
from datetime import datetime
from hashlib import md5
from typing import Optional
from urllib.parse import quote

from flask import current_app

from .base import DeleteFileResult, ListedItem, PutFileResult, StorageProvider


class LocalFileSystemStorageProvider(StorageProvider):
    def __init__(self) -> None:
        root = None
        try:
            if current_app:
                root = current_app.config.get("STORAGE_LOCAL_ROOT")
        except RuntimeError:
            pass
        if not root:
            root = os.environ.get("STORAGE_LOCAL_ROOT", "./storage")
        self._root = os.path.abspath(root)
        os.makedirs(self._root, exist_ok=True)

    @property
    def name(self) -> str:
        return "local"

    @property
    def root(self) -> str:
        return self._root

    def _full_path(self, key: str) -> str:
        normalized = key.lstrip("/\\")
        return os.path.join(self._root, normalized)

    def put_file(
        self,
        *,
        key: str,
        data: bytes,
        content_type: Optional[str] = None,
        metadata: Optional[dict[str, str]] = None,
    ) -> PutFileResult:
        path = self._full_path(key)
        parent = os.path.dirname(path)
        if parent:
            os.makedirs(parent, exist_ok=True)
        with open(path, "wb") as f:
            f.write(data)
        size = len(data)
        return PutFileResult(
            success=True,
            key=key,
            size=size,
            raw={
                "path": path,
                "size": size,
                "content_type": content_type,
                "metadata": metadata or {},
            },
        )

    def get_signed_url(
        self,
        *,
        key: str,
        expires_in: int = 3600,
    ) -> Optional[str]:
        path = self._full_path(key)
        if not os.path.exists(path):
            return None
        try:
            base_url = None
            if current_app:
                base_url = current_app.config.get("CANONICAL_FRONTEND_URL")
        except RuntimeError:
            pass
        if not base_url:
            base_url = os.environ.get("CANONICAL_FRONTEND_URL", "http://localhost:5000")
        encoded_key = quote(key, safe="")
        expires = int(datetime.utcnow().timestamp()) + expires_in
        signature_input = f"{key}:{expires}:local"
        signature = md5(signature_input.encode("utf-8")).hexdigest()[:12]
        return f"{base_url}/_storage/local/{encoded_key}?expires={expires}&sig={signature}"

    def delete_file(
        self,
        *,
        key: str,
    ) -> DeleteFileResult:
        path = self._full_path(key)
        existed = os.path.exists(path)
        if existed:
            try:
                os.remove(path)
            except OSError:
                return DeleteFileResult(success=False, raw={"path": path, "existed": True, "error": "remove_failed"})
        return DeleteFileResult(
            success=True,
            raw={"path": path, "existed": existed},
        )

    def list_bucket(
        self,
        *,
        prefix: Optional[str] = None,
        max_items: Optional[int] = None,
    ) -> list[ListedItem]:
        base = self._root
        search_root = base
        if prefix:
            normalized_prefix = prefix.lstrip("/\\")
            search_root = os.path.join(base, normalized_prefix)
        items: list[ListedItem] = []
        if not os.path.isdir(base):
            return items
        for dirpath, _dirnames, filenames in os.walk(search_root):
            for filename in filenames:
                full = os.path.join(dirpath, filename)
                try:
                    rel = os.path.relpath(full, base)
                except ValueError:
                    continue
                rel = rel.replace(os.sep, "/")
                try:
                    stat = os.stat(full)
                    size = stat.st_size
                    last_modified = datetime.utcfromtimestamp(stat.st_mtime).isoformat()
                except OSError:
                    size = None
                    last_modified = None
                etag = None
                try:
                    with open(full, "rb") as f:
                        head = f.read(8192)
                    etag = md5(head).hexdigest()[:16]
                except OSError:
                    pass
                items.append(
                    ListedItem(
                        key=rel,
                        size=size,
                        last_modified=last_modified,
                        etag=etag,
                    )
                )
                if max_items is not None and len(items) >= max_items:
                    return items
        return items
