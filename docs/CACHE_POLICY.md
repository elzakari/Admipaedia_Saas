# Cache Policy

## Goals
- Improve performance of hot reads while maintaining security and consistency.

## Layers
- Client-side: React Query cache and service worker GET response cache for offline fallback.
- Server-side: Redis via `CacheService` for domain data with tiered TTLs.

## Serialization
- Cache only JSON-serializable DTOs (plain objects, arrays, primitives).
- Avoid caching ORM model instances directly; convert to dict/DTO first.
- Do not use pickled payloads for data crossing trust boundaries.

## Keys and TTLs
-- Prefixes per domain (user, teacher, student, class, subject, analytics).
-- Default TTL 1h; short TTL 5m for dynamic views; long TTL 24h for reference data.

## Invalidation
- Invalidate on mutations affecting cached entities (create/update/delete).
- Use pattern-based invalidation for related scopes (e.g., `teacher:*`, `class:*`).

## Security
- Treat cache as an optimization layer; never as source of truth.
- Avoid deserializing untrusted content; prefer JSON with schema validation.

## Usage Guidelines
- Services should expose `to_dict()` helpers or DTO builders for cached entries.
- Document cache keys and invalidation logic alongside service methods.
