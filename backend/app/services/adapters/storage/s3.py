from __future__ import annotations

from typing import Optional

from .base import DeleteFileResult, ListedItem, PutFileResult, StorageProvider


class S3StorageProvider(StorageProvider):
    def __init__(self) -> None:
        self._client = None
        self._bucket = None

    @property
    def name(self) -> str:
        return "s3"

    def _ensure_client(self):
        if self._client is None:
            raise NotImplementedError(
                "S3StorageProvider is a stub. Implement boto3 client initialization when AWS SDK integration is required."
            )

    def put_file(
        self,
        *,
        key: str,
        data: bytes,
        content_type: Optional[str] = None,
        metadata: Optional[dict[str, str]] = None,
    ) -> PutFileResult:
        self._ensure_client()
        return PutFileResult(success=False)

    def get_signed_url(
        self,
        *,
        key: str,
        expires_in: int = 3600,
    ) -> Optional[str]:
        self._ensure_client()
        return None

    def delete_file(
        self,
        *,
        key: str,
    ) -> DeleteFileResult:
        self._ensure_client()
        return DeleteFileResult(success=False)

    def list_bucket(
        self,
        *,
        prefix: Optional[str] = None,
        max_items: Optional[int] = None,
    ) -> list[ListedItem]:
        self._ensure_client()
        return []
