from __future__ import annotations

import hashlib
import json
import math
import random
from datetime import datetime
from typing import Any, Optional

from .base import (
    AIModelProvider,
    EmbeddingResult,
    JsonGenerationResult,
    TextGenerationResult,
)


class MockAIModelProvider(AIModelProvider):
    DEFAULT_MODEL = "mock-model-v1"
    DEFAULT_EMBEDDING_DIM = 1536

    def __init__(self) -> None:
        self._rng = random.Random(0xC0FFEE)

    @property
    def name(self) -> str:
        return "mock"

    def _stable_tokens(self, text: str, fallback: int = 16) -> int:
        if not text:
            return fallback
        base = max(fallback, int(math.ceil(len(text) / 4)))
        return base + (hash(text) % 8)

    def generate_text(
        self,
        *,
        prompt: str,
        system_prompt: Optional[str] = None,
        model: Optional[str] = None,
        max_tokens: Optional[int] = None,
        temperature: Optional[float] = None,
    ) -> TextGenerationResult:
        resolved_model = model or self.DEFAULT_MODEL
        trimmed = (prompt or "").strip()
        prefix = trimmed[:120]
        content = (
            f"[mock] response for: {prefix} — "
            f"system_present={bool(system_prompt)} "
            f"max_tokens={max_tokens} "
            f"temp={temperature} "
            f"generated_at={datetime.utcnow().isoformat()}"
        )
        return TextGenerationResult(
            content=content,
            model=resolved_model,
            tokens_used=self._stable_tokens(content + (system_prompt or "")),
            raw={"provider": "mock", "prompt_length": len(prompt or "")},
        )

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
        resolved_model = model or self.DEFAULT_MODEL
        trimmed = (prompt or "").strip()
        summary = hashlib.md5(trimmed.encode("utf-8")).hexdigest()[:10]
        data: dict[str, Any] = {
            "result": "ok",
            "query_hash": summary,
            "items": [
                {"id": 1, "label": f"sample-{summary}-1"},
                {"id": 2, "label": f"sample-{summary}-2"},
            ],
            "meta": {
                "system_prompt_provided": bool(system_prompt),
                "schema_provided": bool(schema),
                "generated_at": datetime.utcnow().isoformat(),
            },
        }
        serialized = json.dumps(data, sort_keys=True)
        return JsonGenerationResult(
            data=data,
            model=resolved_model,
            tokens_used=self._stable_tokens(serialized + (system_prompt or ""), fallback=48),
            raw={"provider": "mock", "prompt_length": len(prompt or "")},
        )

    def embed(
        self,
        *,
        text: str,
        model: Optional[str] = None,
        dimensions: Optional[int] = None,
    ) -> EmbeddingResult:
        resolved_model = model or f"mock-embed-{self.DEFAULT_EMBEDDING_DIM}"
        dims = dimensions or self.DEFAULT_EMBEDDING_DIM
        normalized = (text or "").encode("utf-8")
        seed = int.from_bytes(hashlib.sha256(normalized).digest()[:8], "big")
        rng = random.Random(seed)
        raw = [rng.uniform(-1.0, 1.0) for _ in range(dims)]
        norm = math.sqrt(sum(x * x for x in raw)) or 1.0
        vector = [x / norm for x in raw]
        return EmbeddingResult(
            vector=vector,
            model=resolved_model,
            dimensions=dims,
            raw={"provider": "mock", "text_length": len(text or "")},
        )
