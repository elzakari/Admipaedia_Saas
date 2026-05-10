# Settings Architecture Update (Tenant vs Platform)

## Why this change
The app has two distinct configuration domains:

- **Tenant (School) settings**: configuration that must be isolated per school (to avoid cross-school leakage).
- **Platform (Super Admin) settings**: global configuration that applies to the entire system.

Previously, several screens under “Settings” were backed by globally-shared storage, which caused schools to see placeholder values or overwrite one another.

## New structure

### 1) School Admin Settings (Tenant-scoped)
Visible to School Admins only (tenant membership role: `school_admin`).

- UI: `/settings?tab=...` (admin portal)
- API (tenant): `/api/v1/settings/*`
- Storage: `Tenant.settings` JSON + select `Tenant` columns (`name`, `currency`, `timezone`, `default_language`)

Examples:
- Admissions configuration (admission form price, submission rules)
- General school info and defaults
- Notifications, security, integrations, backup configuration
- Tenant key/value settings used by modules like Fees and Admissions

### 2) Platform Settings (Super-Admin-only)
Visible to `super_admin` users only.

- UI: `/super-admin/settings`
- API (platform): `/api/v1/platform/settings` and `/api/v1/platform/settings/update`
- Storage: `SystemSetting` table (global)

Examples:
- Global system parameters
- Global defaults and system-wide operational toggles
- Tenant creation defaults (new school country/timezone/language/currency)
- Licensing defaults (trial duration, default plan)

## Role-based access control

### UI layer
- Admin sidebar no longer shows “System Settings”.
- Super Admin sidebar shows “Platform/System Settings”.
- `/administration/settings` redirects non-super-admin users to `/settings`.
- Super Admin settings page does not include school-level admissions configuration.

### API layer
- Tenant settings endpoints require a valid `X-Tenant-ID` and enforce membership role `school_admin` for configuration writes/reads where appropriate.
- Platform settings endpoints require `super_admin`.
- Public registration can be toggled by Super Admin using `platform_allow_public_registration`.

## Data correctness (why values were stale)
The Settings UI used React Query v5 with `onSuccess` inside `useQuery` (query callbacks are not reliable in v5). This prevented state from being hydrated from API data, leaving hardcoded placeholders visible.

The UI now hydrates local form state from the query `data` using `useEffect`.

## Testing

- Added backend tests validating segregation between tenant settings and platform settings.

