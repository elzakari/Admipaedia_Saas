# ADMIPAEDIA Refactoring Plan

## 1. Executive Summary
This document outlines the technical roadmap to transition ADMIPAEDIA from its current single-tenant, fragmented state to a robust, multi-tenant SaaS platform. The primary focus is implementing **Schema-per-Tenant** architecture and consolidating duplicate "Enhanced" modules.

## 2. Critical Refactoring (Phase 2 - Immediate)

### 2.1 Multi-Tenancy Implementation (Schema-per-Tenant)
**Priority: Critical**
**Est. Effort: 3 Days**

*   **Objective**: Enable data isolation for multiple schools using PostgreSQL schemas.
*   **Tasks**:
    1.  **Database Migration**:
        *   Create `public` schema tables: `tenants`, `educational_system_templates`, `supported_languages`, `subscriptions`.
        *   Move existing "school-specific" tables (`students`, `teachers`, `classes`, etc.) to a tenant schema migration script.
    2.  **Middleware**:
        *   Implement `TenantMiddleware` in Flask to resolve tenant from subdomain/header.
        *   Use SQLAlchemy `search_path` configuration to switch schemas dynamically per request.
    3.  **Context Management**:
        *   Update `celery_app.py` to handle tenant context for background tasks.
        *   Update Redis key generation to include `tenant_id` namespace (e.g., `tenant:{id}:key`).

### 2.2 Module Consolidation ("Enhanced" vs Standard)
**Priority: High**
**Est. Effort: 5 Days**

*   **Objective**: Remove code duplication and confusion by merging "Enhanced" modules into the core.
*   **Strategy**: "Enhanced" is the new Standard.
*   **Tasks**:
    1.  **Auth**: Merge `enhanced_auth` features (MFA, Device Trust) into `auth`. Deprecate old `auth` routes.
    2.  **Students**: Merge `enhanced_students` (bio-data, health) into `students`. Rename `enhanced_student_service.py` to `student_service.py`.
    3.  **Dashboard**: Promote `enhanced_dashboard` to `dashboard`.
    4.  **Cleanup**: Delete all files prefixed with `enhanced_` after verification.

### 2.3 Configuration & Security
**Priority: High**
**Est. Effort: 1 Day**

*   **Objective**: Secure credentials and standardize config.
*   **Tasks**:
    1.  Remove hardcoded secrets from `config.py`. Use `os.environ.get()` with strict failure if missing in production.
    2.  Standardize `pydantic` or `marshmallow` schemas for all env vars.

## 3. Secondary Refactoring (Phase 3)

### 3.1 Localization Engine
**Priority: Medium**
**Est. Effort: 3 Days**

*   **Objective**: Support dynamic language switching and RTL.
*   **Tasks**:
    1.  Backend: Configure `Flask-Babel` to read locale from User preference or Tenant default.
    2.  Frontend: Fully implement `react-i18next`. Extract hardcoded strings to `public/locales/en`.

### 3.2 Educational System Configurator
**Priority: Medium**
**Est. Effort: 4 Days**

*   **Objective**: Replace hardcoded grading logic with database-driven configuration.
*   **Tasks**:
    1.  Refactor `GradeService` to fetch `GradingScheme` from DB instead of using static constants.
    2.  Refactor `ReportCardService` to render based on `EducationalSystemTemplate`.

## 4. Low Priority (Phase 4+)

### 4.1 Testing Infrastructure
*   Unify test folders.
*   Create `TenantTestCase` base class for multi-tenant integration testing.

### 4.2 API Documentation
*   Auto-generate Swagger/OpenAPI specs from Flask routes.

## 5. Risk Assessment
*   **Data Migration**: Moving existing data to a new schema structure is risky. *Mitigation: comprehensive backup and dry-run scripts.*
*   **Breaking Changes**: API endpoints will change during consolidation. *Mitigation: Maintain v1 compatibility wrappers where possible, or cut a hard v2.*
