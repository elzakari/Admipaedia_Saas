/**
 * Browser-side cleanup that must happen whenever the active tenant changes.
 *
 * Authentication/session keys are intentionally preserved.
 * Only tenant/branch-scoped transient state is removed.
 */

const TENANT_SCOPED_EXACT_KEYS = [
  'active_branch_id',
  'active_branch_name',
  'saas_current_branch_id',
  'saas_current_tenant_country_code',
  'cached_calendar_events',
  'cached_shared_calendar_events',
] as const;

const TENANT_SCOPED_PREFIXES = [
  'api_cache_',
  'student_draft_',
  'admipaedia.teacher.assignments.v1.',
] as const;

export function purgeTenantScopedBrowserState(): void {
  if (typeof window === 'undefined') return;

  try {
    for (const key of TENANT_SCOPED_EXACT_KEYS) {
      window.localStorage.removeItem(key);
    }

    const keysToRemove: string[] = [];

    for (let i = 0; i < window.localStorage.length; i += 1) {
      const key = window.localStorage.key(i);
      if (!key) continue;

      if (
        TENANT_SCOPED_PREFIXES.some((prefix) =>
          key.startsWith(prefix)
        )
      ) {
        keysToRemove.push(key);
      }
    }

    for (const key of keysToRemove) {
      window.localStorage.removeItem(key);
    }
  } catch (error) {
    console.warn(
      '[TenantIsolation] Failed to purge tenant-scoped local storage:',
      error
    );
  }

  try {
    window.sessionStorage.removeItem('fees:navigation-intent');
  } catch (error) {
    console.warn(
      '[TenantIsolation] Failed to purge tenant-scoped session storage:',
      error
    );
  }
}
