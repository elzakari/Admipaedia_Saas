from __future__ import annotations

import os

from flask import current_app

from .base import AIModelProvider
from .mock import MockAIModelProvider


class AIModelProviderFactory:
    @staticmethod
    def adapter_for(name: str | None = None) -> AIModelProvider:
        resolved = (name or "").strip().lower()
        if not resolved:
            try:
                if current_app:
                    resolved = (
                        current_app.config.get("AI_MODEL_PROVIDER") or ""
                    ).strip().lower()
            except RuntimeError:
                pass
        if not resolved:
            resolved = (os.environ.get("AI_MODEL_PROVIDER") or "").strip().lower()
        try:
            if current_app and current_app.config.get("TESTING"):
                return MockAIModelProvider()
        except RuntimeError:
            pass
        if resolved in ("mock", "", None):
            return MockAIModelProvider()
        return MockAIModelProvider()

    @staticmethod
    def default() -> AIModelProvider:
        return AIModelProviderFactory.adapter_for()
