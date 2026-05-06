# ADMIPAEDIA Gap Analysis

## 1. Executive Summary
The codebase represents a robust, feature-rich **Single-Tenant** School Management System. However, it significantly deviates from the **SaaS / Multi-Tenant** requirements outlined in the project rules. The "Enhanced" refactoring effort is visible but incomplete, leading to a mix of legacy and modern patterns.

## 2. Critical Gaps (High Priority)

| Area | Gap Description | Risk | Remediation |
|------|-----------------|------|-------------|
| **Multi-Tenancy** | **MISSING**. No `tenant_id` in core models. No schema switching logic visible in core config. | **Critical**. Cannot deploy as SaaS. Data leakage risk between schools if deployed as is. | Implement `tenant_id` across all models OR implement schema-per-tenant architecture immediately. |
| **Data Model** | "Enhanced" models coexist with legacy models. Duplicate fields (`name` vs `first_name`). | **High**. Maintenance nightmare. Bugs due to using wrong fields. | Run data migration scripts to unify fields and drop legacy columns. |
| **API Consistency** | Mix of `/students` (standard) and `enhanced_students` endpoints. | **Medium**. Frontend confusion. | Deprecate standard endpoints and rename `enhanced_*` to standard names after full migration. |

## 3. Functional Gaps (Medium Priority)

| Area | Gap Description | Risk | Remediation |
|------|-----------------|------|-------------|
| **Localization** | GES modules exist but are separate. Need to ensure other regions (NG, KE, ZA) are supported as per SaaS rules. | **Medium**. Limited market reach. | Refactor localization into a configuration-driven engine rather than hardcoded blueprints per country. |
| **Testing** | Tests exist but status is unknown. | **Medium**. Regression risk. | Run full test suite and establish CI gates. |

## 4. Technical Debt

- **Frontend**: "Enhanced" components duplicate functionality of standard ones.
- **Backend**: `User` model mixes authentication, profile, and role logic.
- **Config**: Hardcoded fallbacks in `config.py` (e.g., `Barbie1983...` password) should be strictly env-var only for security.

## 5. Action Plan (Phase 2)

1. **SaaS Architecture Implementation**:
   - Decide on Tenant Strategy (Schema vs Row).
   - Apply to all models.
2. **Refactoring Drive**:
   - Merge "Enhanced" logic into core modules.
   - Remove "Enhanced" prefixes.
3. **Data Cleanup**:
   - Migrate legacy data.
   - Enforce constraints (NOT NULL) on new fields.
