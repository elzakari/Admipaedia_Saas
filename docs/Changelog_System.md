# ADMIPAEDIA Changelog System

## Purpose
A standardized, auditable system to track code and documentation changes, maintain version history with timestamps, document bug fixes and features, and cross-reference issues/tickets. Adheres to Semantic Versioning and Conventional Commits.

## Versioning
- Scheme: `MAJOR.MINOR.PATCH`
- Rules
  - Breaking changes → MAJOR
  - `feat` without breaking changes → MINOR
  - `fix` and non-breaking changes → PATCH

## Entry Structure
Each release entry includes date, version, summary, categorized changes, and references.

```markdown
## [x.y.z] - YYYY-MM-DD

### Summary
- Short description of the release impact

### Added
- ...

### Changed
- ...

### Fixed
- ...

### Deprecated
- ...

### Removed
- ...

### Security
- ...

### Docs
- ...

### Tests
- ...

### References
- Issues: #
- PRs: #
```

## Workflow
- Pull requests use Conventional Commits and include issue references
- On merge to `main`
  - Update `CHANGELOG.md` with new entry
  - Tag release `vX.Y.Z` and publish release notes

## Automation (Planned)
- GitHub Action to parse commits and draft release notes
- Validation of changelog format and timestamps

## Cross-Referencing
- Include file paths for significant changes (example: `backend/app/api/v1/__init__.py:44`)
- Reference related docs: `docs/Technical_Roadmap.md`, `PRODUCT_REQUIREMENTS_DOCUMENT.md`, `TASKS.md`

## Example Entry
```markdown
## [v2.1.0] - 2025-01-15

### Added
- RBAC enforcement for attendance and grades endpoints (`backend/app/api/v1/attendances/routes.py`, `backend/app/api/v1/grades/routes.py`)

### Changed
- Standardized API error formats across v1 endpoints

### Fixed
- Competency trends response logic (`backend/app/api/v1/competencies/routes.py:286`)

### Security
- Rate limiting for login and administrative operations

### Docs
- Expanded API documentation; linked modules to endpoints

### References
- Issues: #102, #118
- PRs: #220, #225
```

## Governance
- Maintainers review entries for clarity and traceability
- Keep `CHANGELOG.md` aligned with roadmap phases and tasks

---

## Templates
See `docs/CHANGELOG_TEMPLATE.md` and `docs/RELEASE_NOTES_TEMPLATE.md`.
