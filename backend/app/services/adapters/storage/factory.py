from __future__ import annotations

import os

from flask import current_app

from .base import StorageProvider
from .local_filesystem import LocalFileSystemStorageProvider
from .minio import MinIOStorageProvider
from .mock import MockStorageProvider
from .s3 import S3StorageProvider


class StorageProviderFactory:
    @staticmethod
    def adapter_for(name: str | None = None) -> StorageProvider:
        resolved = (name or "").strip().lower()
        if not resolved:
            try:
                if current_app:
                    resolved = (
                        current_app.config.get("STORAGE_PROVIDER") or ""
                    ).strip().lower()
            except RuntimeError:
                pass
        if not resolved:
            resolved = (os.environ.get("STORAGE_PROVIDER") or "").strip().lower()
        try:
            if current_app and current_app.config.get("TESTING"):
                return MockStorageProvider()
        except RuntimeError:
            pass
        if resolved == "s3":
            return S3StorageProvider()
        if resolved == "minio":
            return MinIOStorageProvider()
        if resolved == "mock":
            return MockStorageProvider()
        return LocalFileSystemStorageProvider()

    @staticmethod
    def default() -> StorageProvider:
        return StorageProviderFactory.adapter_for()
