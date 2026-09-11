export type TenantAuthority = {
  globalRole: string | null
  tenantRole: string | null
  primaryRole: string | null
  roles: string[]
  isPlatform: boolean
}

const PLATFORM_ROLES = new Set([
  'super_admin',
  'super_manager',
])

function normalizeRole(
  role: unknown
): string | null {
  if (typeof role !== 'string') return null

  const normalized = role
    .trim()
    .toLowerCase()

  return normalized || null
}

/**
 * Resolve the roles that may authorize the CURRENT browser context.
 *
 * Platform authority comes from the global identity.
 * School authority comes only from the selected tenant membership.
 */
export function resolveTenantAuthority(
  globalRoleValue: unknown,
  tenantRoleValue: unknown
): TenantAuthority {
  const globalRole =
    normalizeRole(globalRoleValue)

  const tenantRole =
    normalizeRole(tenantRoleValue)

  if (
    globalRole &&
    PLATFORM_ROLES.has(globalRole)
  ) {
    return {
      globalRole,
      tenantRole,
      primaryRole: globalRole,
      roles: [globalRole],
      isPlatform: true,
    }
  }

  if (!tenantRole) {
    return {
      globalRole,
      tenantRole: null,
      primaryRole: null,
      roles: [],
      isPlatform: false,
    }
  }

  const roles = new Set<string>([
    tenantRole,
  ])

  // Mirror backend compatibility aliases.
  if (tenantRole === 'school_admin') {
    roles.add('admin')
  }

  if (
    tenantRole ===
    'school_staff_readonly'
  ) {
    roles.add('staff')
  }

  const primaryRole =
    tenantRole === 'school_admin'
      ? 'admin'
      : tenantRole ===
          'school_staff_readonly'
        ? 'staff'
        : tenantRole

  return {
    globalRole,
    tenantRole,
    primaryRole,
    roles: [...roles],
    isPlatform: false,
  }
}

export function authorityHasRole(
  authority: TenantAuthority,
  requested: string | string[]
): boolean {
  const requestedRoles =
    Array.isArray(requested)
      ? requested
      : [requested]

  return requestedRoles.some((role) => {
    const normalized =
      normalizeRole(role)

    return Boolean(
      normalized &&
      authority.roles.includes(
        normalized
      )
    )
  })
}
