from __future__ import annotations

import abc
from dataclasses import dataclass
from typing import Any, Optional


@dataclass
class PutFileResult:
    success: bool
    key: Optional[str] = None
    size: Optional[int] = None
    raw: Optional[dict[str, Any]] = None


@dataclass
class DeleteFileResult:
    success: bool
    raw: Optional[dict[str, Any]] = None


@dataclass
class ListedItem:
    key: str
    size: Optional[int] = None
    last_modified: Optional[str] = None
    etag: Optional[str] = None


class StorageProvider(abc.ABC):
    @property
    @abc.abstractmethod
    def name(self) -> str:
        raise NotImplementedError

    @abc.abstractmethod
    def put_file(
        self,
        *,
        key: str,
        data: bytes,
        content_type: Optional[str] = None,
        metadata: Optional[dict[str, str]] = None,
    ) -> PutFileResult:
        raise NotImplementedError

    @abc.abstractmethod
    def get_signed_url(
        self,
        *,
        key: str,
        expires_in: int = 3600,
    ) -> Optional[str]:
        raise NotImplementedError

    @abc.abstractmethod
    def delete_file(
        self,
        *,
        key: str,
    ) -> DeleteFileResult:
        raise NotImplementedError

    @abc.abstractmethod
    def list_bucket(
        self,
        *,
        prefix: Optional[str] = None,
        max_items: Optional[int] = None,
    ) -> list[ListedItem]:
        raise NotImplementedError
