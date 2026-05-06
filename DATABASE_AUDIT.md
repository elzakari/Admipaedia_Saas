# ADMIPAEDIA Database Audit

## 1. Overview
This audit compares the current SQLAlchemy models with the requirements defined in `RULE.md` and the implied SaaS architecture.

## 2. Schema Analysis

### 2.1 Core Entities
| Model | Status | Tenant Isolated? | Notes |
|-------|--------|------------------|-------|
| `User` | ✅ Exists | ❌ **NO** | Core user record. Uses `username`, `email`. Linked to `roles`. |
| `Student` | ✅ Exists | ❌ **NO** | Linked to `User`. Contains extensive bio-data. No `school_id` or `tenant_id`. |
| `Role` | ✅ Exists | ❌ **NO** | Standard RBAC roles. |

### 2.2 Enhanced Authentication
| Model | Status | Tenant Isolated? | Notes |
|-------|--------|------------------|-------|
| `MFADevice` | ✅ Exists | ❌ **NO** | Supports TOTP, SMS, Email. |
| `TrustedDevice` | ✅ Exists | ❌ **NO** | Device fingerprinting. |
| `AuthenticationAttempt`| ✅ Exists | ❌ **NO** | Security logging. |
| `SecurityAuditLog` | ✅ Exists | ❌ **NO** | Comprehensive audit trail. |

## 3. Critical Findings

### 3.1 Missing Multi-Tenancy (`tenant_id`)
**Severity: CRITICAL**
The `RULE.md` explicitly states:
> "Every database operation in the application MUST execute within the correct tenant schema... All Redis keys MUST be prefixed... All S3 uploads MUST use the tenant prefix."

**Current State:**
- The inspected models (`User`, `Student`, `MFADevice`) **DO NOT** have a `tenant_id` column.
- There is no visible mechanism in the models for row-level security or schema separation based on tenants.
- The application currently functions as a **Single-Tenant** system.

### 3.2 Legacy vs Enhanced Fields
- `Student` model contains both `name`/`surname` (legacy) and `first_name`/`last_name` (new).
- `User` model has a `role` string (legacy) and a `roles` many-to-many relationship (new).

## 4. Recommendations
1. **Implement Tenant Isolation**:
   - **Option A (Schema-per-Tenant)**: Requires middleware to switch Postgres schemas. Models don't strictly need `tenant_id` if schemas are used, but `public` tables (like `User` if shared) need careful handling.
   - **Option B (Row-Level Security)**: Add `tenant_id` to **EVERY** table. Update all queries to filter by `tenant_id`.
   - **Recommendation**: Given the SaaS requirement, Option A is often cleaner for strict isolation, but Option B is easier to migrate to from a single-tenant app. **Consult `ADMIPAEDIA_AFRICAN_SAAS_ADDENDUM.md` for the chosen strategy.**

2. **Cleanup Legacy Fields**:
   - Create migration scripts to populate new fields from legacy ones.
   - Remove legacy columns (`name`, `surname`, `role` string) after verification.
