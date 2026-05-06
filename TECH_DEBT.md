# ADMIPAEDIA Technical Debt Report

## 1. Architectural Debt

### 1.1 Incomplete "Enhanced" Migration
**Severity: High**
- **Issue**: The codebase contains parallel implementations for core modules (e.g., `students` vs `enhanced_students`, `dashboard` vs `enhanced_dashboard`).
- **Impact**: Code duplication, confusion for developers, potential for bugs where fixes are applied to one version but not the other.
- **Recommendation**: Prioritize the full migration to "Enhanced" versions and delete the legacy code.

### 1.2 Missing Multi-Tenancy Layer
**Severity: Critical**
- **Issue**: The application is architected as a single-tenant system, violating the `RULE.md` SaaS requirement.
- **Impact**: Cannot support multiple schools securely in a single deployment.
- **Recommendation**: Implement a strict tenant isolation strategy (Schema-per-tenant or Row-level security) immediately.

## 2. Code Quality Debt

### 2.1 Model Field Duplication
**Severity: Medium**
- **Issue**: Models contain both legacy and new fields for the same data.
  - `Student`: `name`/`surname` (legacy) vs `first_name`/`last_name` (new).
  - `User`: `role` (string) vs `roles` (relationship).
- **Impact**: Data inconsistency risk. Queries might use the wrong field.
- **Recommendation**: Run data migrations to populate new fields, then drop legacy columns.

### 2.2 Configuration Hardcoding
**Severity: Medium**
- **Issue**: `config.py` contains fallback values for sensitive credentials (e.g., `Barbie1983...`).
- **Impact**: Security risk if environment variables are missing.
- **Recommendation**: Remove hardcoded defaults for secrets. Fail fast if required env vars are missing.

## 3. Testing Debt

### 3.1 Test Suite Fragmentation
**Severity: Low**
- **Issue**: Tests are split between `tests/`, `tests/unit`, `tests/integration`, and `tests/test_api`.
- **Impact**: Harder to run targeted tests.
- **Recommendation**: Standardize on a clear directory structure (e.g., `tests/unit`, `tests/integration`, `tests/e2e`).

### 3.2 Lack of Multi-Tenant Tests
**Severity: High**
- **Issue**: Existing tests do not verify tenant isolation (because it doesn't exist yet).
- **Impact**: When multi-tenancy is added, the entire test suite will need updating to mock tenant context.
- **Recommendation**: Create a base test class that handles tenant context setup.

## 4. Documentation Debt

### 4.1 API Documentation Lag
**Severity: Medium**
- **Issue**: With the "Enhanced" endpoints being added, the OpenAPI/Swagger documentation likely lags behind.
- **Impact**: Frontend developers might use outdated endpoints.
- **Recommendation**: Auto-generate OpenAPI specs from the Flask routes to ensure accuracy.
