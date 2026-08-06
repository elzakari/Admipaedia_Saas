from __future__ import annotations

from datetime import datetime
from hashlib import md5
from typing import Optional

from .base import DeleteFileResult, ListedItem, PutFileResult, StorageProvider


class MockStorageProvider(StorageProvider):
    def __init__(self) -> None:
        self._store: dict[str, bytes] = {}

    @property
    def name(self) -> str:
        return "mock"

    def put_file(
        self,
        *,
        key: str,
        data: bytes,
        content_type: Optional[str] = None,
        metadata: Optional[dict[str, str]] = None,
    ) -> PutFileResult:
        self._store[key] = bytes(data)
        size = len(data)
        return PutFileResult(
            success=True,
            key=key,
            size=size,
            raw={
                "size": size,
                "content_type": content_type,
                "metadata": metadata or {},
                "stored_at": datetime.utcnow().isoformat(),
            },
        )

    def get_signed_url(
        self,
        *,
        key: str,
        expires_in: int = 3600,
    ) -> Optional[str]:
        if key not in self._store:
            return None
        expires = int(datetime.utcnow().timestamp()) + expires_in
        signature_input = f"{key}:{expires}:mock"
        signature = md5(signature_input.encode("utf-8")).hexdigest()[:12]
        return f"https://mock-storage.test/_signed/{key}?expires={expires}&sig={signature}"

    def delete_file(
        self,
        *,
        key: str,
    ) -> DeleteFileResult:
        existed = key in self._store
        if existed:
            del self._store[key]
        return DeleteFileResult(
            success=True,
            raw={"existed": existed, "remaining_keys": len(self._store)},
        )

    def list_bucket(
        self,
        *,
        prefix: Optional[str] = None,
        max_items: Optional[int] = None,
    ) -> list[ListedItem]:
        keys = sorted(self._store.keys())
        if prefix:
            keys = [k for k in keys if k.startswith(prefix)]
        items: list[ListedItem] = []
        for key in keys:
            data = self._store[key]
            items.append(
                ListedItem(
                    key=key,
                    size=len(data),
                    last_modified=datetime.utcnow().isoformat(),
                    etag=md5(data).hexdigest()[:16],
                )
            )
            if max_items is not None and len(items) >= max_items:
                break
        return items
