# Education System Country Templates

This project supports country-specific education system templates (e.g., Ghana, Togo, Benin) that can be applied per tenant (school).

## Data Model

- Platform templates: `EducationalSystemTemplate`
  - Shared across all tenants
  - Identified by `system_key` and `country_code`
- Tenant configuration: `EducationalSystemConfig`
  - Scoped by `tenant_id`
  - Only one `is_active=true` config per tenant
- Derived grade levels: `GradeLevel`
  - Scoped by `tenant_id`
  - Generated when applying a template

## Template Format (Minimum Required)

Templates are stored in `educational_system_templates.config` (JSON).

Required keys:
- `phases`: array of phases
  - each phase requires:
    - `name`: string
    - `levels`: non-empty array of strings

Optional keys:
- `grading`: object (recommended)
- `assessments`: object
- `locales`: object (e.g., `{ "default": "fr", "supported": ["fr", "en"] }`)

Example:

```json
{
  "phases": [
    { "name": "Primary", "levels": ["P1", "P2", "P3"] },
    { "name": "Secondary", "levels": ["S1", "S2", "S3"] }
  ],
  "grading": { "type": "percentage", "scale": "0-100" }
}
```

## Adding a New Country

1) Create one or more templates
   - Add an Alembic migration that inserts rows into `educational_system_templates`
   - Use a unique `system_key` naming convention: `{country}_education_{variant}` (e.g., `sn_education_standard`)
2) Ensure templates validate
   - `phases` must be present and well-formed or applying will fail
3) Frontend support
   - Add the country option to the country selector UI
   - Add language default mapping (EN/FR) if needed

