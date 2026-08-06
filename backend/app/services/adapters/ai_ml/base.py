from __future__ import annotations

import abc
from dataclasses import dataclass
from typing import Any, Optional


@dataclass
class TextGenerationResult:
    content: str
    model: Optional[str] = None
    tokens_used: Optional[int] = None
    raw: Optional[dict[str, Any]] = None


@dataclass
class JsonGenerationResult:
    data: dict[str, Any]
    model: Optional[str] = None
    tokens_used: Optional[int] = None
    raw: Optional[dict[str, Any]] = None


@dataclass
class EmbeddingResult:
    vector: list[float]
    model: Optional[str] = None
    dimensions: Optional[int] = None
    raw: Optional[dict[str, Any]] = None


class AIModelProvider(abc.ABC):
    @property
    @abc.abstractmethod
    def name(self) -> str:
        raise NotImplementedError

    @abc.abstractmethod
    def generate_text(
        self,
        *,
        prompt: str,
        system_prompt: Optional[str] = None,
        model: Optional[str] = None,
        max_tokens: Optional[int] = None,
        temperature: Optional[float] = None,
    ) -> TextGenerationResult:
        raise NotImplementedError

    @abc.abstractmethod
    def generate_json(
        self,
        *,
        prompt: str,
        system_prompt: Optional[str] = None,
        model: Optional[str] = None,
        max_tokens: Optional[int] = None,
        temperature: Optional[float] = None,
        schema: Optional[dict[str, Any]] = None,
    ) -> JsonGenerationResult:
        raise NotImplementedError

    @abc.abstractmethod
    def embed(
        self,
        *,
        text: str,
        model: Optional[str] = None,
        dimensions: Optional[int] = None,
    ) -> EmbeddingResult:
        raise NotImplementedError
