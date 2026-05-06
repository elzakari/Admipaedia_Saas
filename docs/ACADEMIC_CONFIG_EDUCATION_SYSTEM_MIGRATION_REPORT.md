## Academic Configuration ↔ Education Systems Harmonization (Migration Report)

### Scope
This migration standardizes all “academic parameter” configuration so the system has one tenant-scoped source of truth that is aligned with the tenant’s selected Education System (country template + customizations).

In-scope academic parameters:
- Grading scales/boundaries and pass marks
- Final grade weight model (class score vs exam/external exam weights)
- Grade levels (education system structure)
- Academic terms (calendar)
- Enrollment rule: maximum class capacity
- Transcript/report generation configuration inputs and their payload formats

Out of scope (not present as first-class entities in the current codebase):
- Higher-ed degree types (diploma/bachelor/master) and program types
- Course category taxonomy beyond existing Subject/Department modeling

---

## Inventory (Touchpoints)

### Backend — Database Tables / Models
- `tenant_academic_settings` ([tenant_academic_settings.py](file:///c:/Users/elzak/Downloads/ADMIPAEDIA%20STANDARD/ADMIPAEDIA%20Beta/backend/app/models/tenant_academic_settings.py))
  - Tenant-scoped canonical storage for academic configuration JSON.
- `educational_system_templates` / `educational_system_config` / `grade_levels` ([educational_system.py](file:///c:/Users/elzak/Downloads/ADMIPAEDIA%20STANDARD/ADMIPAEDIA%20Beta/backend/app/models/educational_system.py))
  - Country templates + tenant active educational system instance + derived grade levels.
- `academic_terms` ([academic_term.py](file:///c:/Users/elzak/Downloads/ADMIPAEDIA%20STANDARD/ADMIPAEDIA%20Beta/backend/app/models/academic_term.py))
  - Tenant-scoped term ranges used across reporting and harmonized config.
- `grading_schemes` / `grade_boundaries` / `enhanced_grades` / `final_grades` ([grading_system.py](file:///c:/Users/elzak/Downloads/ADMIPAEDIA%20STANDARD/ADMIPAEDIA%20Beta/backend/app/models/grading_system.py))
  - Grade boundary definitions and computed grade records.
- `system_settings` ([system_setting.py](file:///c:/Users/elzak/Downloads/ADMIPAEDIA%20STANDARD/ADMIPAEDIA%20Beta/backend/app/models/system_setting.py))
  - Legacy global configuration storage (includes `academic.settings` and `school.*` academic keys).

### Backend — API Endpoints
- Academic configuration (canonical view)
  - `GET /api/v1/settings/academic` ([settings/routes.py](file:///c:/Users/elzak/Downloads/ADMIPAEDIA%20STANDARD/ADMIPAEDIA%20Beta/backend/app/api/v1/settings/routes.py))
  - `PUT /api/v1/settings/academic` ([settings/routes.py](file:///c:/Users/elzak/Downloads/ADMIPAEDIA%20STANDARD/ADMIPAEDIA%20Beta/backend/app/api/v1/settings/routes.py))
- Education System templates/config apply
  - Under `/api/v1/educational-system/...` ([educational_system/routes.py](file:///c:/Users/elzak/Downloads/ADMIPAEDIA%20STANDARD/ADMIPAEDIA%20Beta/backend/app/api/v1/educational_system/routes.py))
- Calendar terms
  - `GET/POST/PUT/DELETE /api/v1/calendar/terms...` ([calendar/routes.py](file:///c:/Users/elzak/Downloads/ADMIPAEDIA%20STANDARD/ADMIPAEDIA%20Beta/backend/app/api/v1/calendar/routes.py))
- Grading scheme selection (tenant-aware)
  - `GET /api/v1/academics/grading-scheme` ([academics/routes.py](file:///c:/Users/elzak/Downloads/ADMIPAEDIA%20STANDARD/ADMIPAEDIA%20Beta/backend/app/api/v1/academics/routes.py))
- Reports/transcripts
  - `GET /api/v1/reports/student/<id>/report-card`
  - `GET /api/v1/reports/student/<id>/transcript`
  - `POST /api/v1/reports/export`
  - ([reports/routes.py](file:///c:/Users/elzak/Downloads/ADMIPAEDIA%20STANDARD/ADMIPAEDIA%20Beta/backend/app/api/v1/reports/routes.py))

### Frontend — UI Components / Services
- Academic config UI
  - [AcademicConfiguration.tsx](file:///c:/Users/elzak/Downloads/ADMIPAEDIA%20STANDARD/ADMIPAEDIA%20Beta/frontend/src/components/settings/AcademicConfiguration.tsx)
  - [SchoolSettings.tsx](file:///c:/Users/elzak/Downloads/ADMIPAEDIA%20STANDARD/ADMIPAEDIA%20Beta/frontend/src/components/settings/SchoolSettings.tsx)
- Education System selector/apply UI
  - [EducationSystemConfiguration.tsx](file:///c:/Users/elzak/Downloads/ADMIPAEDIA%20STANDARD/ADMIPAEDIA%20Beta/frontend/src/components/administration/EducationSystemConfiguration.tsx)
- Academic calendar terms UI
  - [AcademicCalendar.tsx](file:///c:/Users/elzak/Downloads/ADMIPAEDIA%20STANDARD/ADMIPAEDIA%20Beta/frontend/src/components/administration/AcademicCalendar.tsx)
- Reports UI + services
  - [GESReportCard.tsx](file:///c:/Users/elzak/Downloads/ADMIPAEDIA%20STANDARD/ADMIPAEDIA%20Beta/frontend/src/components/reports/GESReportCard.tsx)
  - [enhancedReportsService.ts](file:///c:/Users/elzak/Downloads/ADMIPAEDIA%20STANDARD/ADMIPAEDIA%20Beta/frontend/src/services/enhancedReportsService.ts)

---

## Canonical Schema (New Source of Truth)

### Canonical Storage
`tenant_academic_settings.settings` is the canonical tenant-scoped store for the majority of academic configuration.

### Canonical Read Model (GET /settings/academic)
Returned response is a merge of:
1) Base defaults (always available)
2) Defaults derived from tenant active `educational_system_config.config` (grading + weights)
3) Tenant overrides stored in `tenant_academic_settings.settings`
4) Enrichments derived from Education Systems tables:
   - `educationSystem` meta from `educational_system_config`
   - `gradeLevels` from `grade_levels`
   - `academicTerms` from `academic_terms`

Implementation: [AcademicConfigurationService](file:///c:/Users/elzak/Downloads/ADMIPAEDIA%20STANDARD/ADMIPAEDIA%20Beta/backend/app/services/academic_configuration_service.py)

---

## Legacy → Education Systems Mapping

### Academic Settings
- `system_settings.key = academic.settings` (JSON blob) → `tenant_academic_settings.settings`
  - Runtime backfill: on first GET for a tenant without a row, legacy blob is copied into the tenant record.
  - Migration backfill: inserts tenant rows for all tenants missing a row using legacy values as defaults.
- `system_settings.key = school.*` → `tenant_academic_settings.settings.*` (fallback)
  - `school.academicYear` → `academicYear`
  - `school.currentTerm` → `currentTerm`
  - `school.gradingSystem` → `gradingSystem`
  - `school.passingGrade` → `passingGrade`
  - `school.maxGrade` → `maxGrade`
  - `school.maxStudentsPerClass` → `maxStudentsPerClass`

### Grading Scales / Schemes
- `educational_system_config.config.grading.*` → `tenant academic config` defaults
  - `grading.schemes[]` (WAEC-style min/max + point) → `gradeScale[]`
  - `grading.bands[]` (scale_20) → `gradeScale[]`, `maxGrade=20`, `passingGrade=pass_mark`
  - `grading.levels[]` (code/name + min/max or range) → `gradeScale[]`
- `tenant academic config.gradeScale[]` → `grading_schemes (tenant default) + grade_boundaries`
  - Synced on `PUT /settings/academic` via `sync_grading_scheme_from_config()`.
  - `finalGradeWeights` → `grading_schemes.class_score_weight` / `grading_schemes.external_exam_weight`.

### Education Structure
- `educational_system_config` + `grade_levels` remain the canonical source of grade level structure.
- `GET /settings/academic` returns these as `gradeLevels` for UI and downstream flows.

### Calendar / Terms
- `academic_terms` is canonical for tenant term ranges.
- `GET /settings/academic` returns these as `academicTerms`.
- Reports prefer tenant terms for date ranges; fallback to legacy global `Term` if not found.

---

## Refactors Delivered

### Backend
- Canonical, tenant-scoped academic configuration service:
  - Education System-derived defaults (grading + weights) and enrichment fields.
  - Safe fallback support for legacy `school.*` keys and `academic.settings` blob.
  - Sanitized updates (computed fields are not persisted).
  - Passing logic standardized to `max_score >= passingGrade`.
  - [academic_configuration_service.py](file:///c:/Users/elzak/Downloads/ADMIPAEDIA%20STANDARD/ADMIPAEDIA%20Beta/backend/app/services/academic_configuration_service.py)

- Grading calculation aligned to grading scheme boundaries + scheme weights:
  - Enhanced grade creation and final grade computation now respect `GradingScheme` weights/boundaries rather than hardcoded GES constants.
  - [enhanced_grading_service.py](file:///c:/Users/elzak/Downloads/ADMIPAEDIA%20STANDARD/ADMIPAEDIA%20Beta/backend/app/services/enhanced_grading_service.py)

- Test-suite stability fix:
  - Password hashing falls back to Werkzeug when Flask-Bcrypt/bcrypt cannot import in the runtime environment.
  - [extensions.py](file:///c:/Users/elzak/Downloads/ADMIPAEDIA%20STANDARD/ADMIPAEDIA%20Beta/backend/app/extensions.py)

### Database Migration
- Backfill migration to seed `tenant_academic_settings` for all tenants that lack a row using legacy values (where available):
  - [20260506_backfill_tenant_academic_settings.py](file:///c:/Users/elzak/Downloads/ADMIPAEDIA%20STANDARD/ADMIPAEDIA%20Beta/backend/migrations/versions/20260506_backfill_tenant_academic_settings.py)

---

## Validation (Tests)

Backend integration coverage includes:
- Harmonized config payload contains `educationSystem`, `gradeLevels`, `academicTerms`.
- Education-system-derived grading defaults (scale_20) are applied.
- Academic settings update persists to tenant storage and syncs grading scheme + boundaries.
- Grade boundary passing logic and grading scheme weights are applied.
- Enrollment class capacity rule enforced.
- Legacy settings fallback paths are safe and do not crash on invalid legacy JSON.

Tests: [test_academic_config_education_system_harmonization.py](file:///c:/Users/elzak/Downloads/ADMIPAEDIA%20STANDARD/ADMIPAEDIA%20Beta/backend/tests/integration/test_academic_config_education_system_harmonization.py)

---

## Rollback Procedure

If rollback is required:
- Application rollback:
  - Revert backend service changes in:
    - `backend/app/services/academic_configuration_service.py`
    - `backend/app/services/enhanced_grading_service.py`
    - `backend/app/extensions.py`
- Data rollback:
  - If `20260506_backfill_acad_settings_001` has been applied, delete only rows that were inserted by the migration (tenants that previously had no row). If you cannot reliably determine the inserted set, do not delete; leave the seeded rows and revert application code only.
  - Re-enable reliance on legacy `system_settings` keys if necessary.

---

## Known Gaps / Follow-ups
- Transcript PDF generation is currently a placeholder in backend report routes; JSON transcript is supported.
- Academic Year/Term global tables exist (`academic_years`, `terms`) but are not tenant-scoped nor actively used; the canonical calendar in this harmonization is `academic_terms`.

