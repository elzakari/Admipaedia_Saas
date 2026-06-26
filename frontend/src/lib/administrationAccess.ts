type AdministrationAccessInput = {
  role?: string | null
  planSlug?: string | null
  enabledFeatures?: string[] | null
  featureFlags?: Record<string, boolean> | null
}

const ADMINISTRATION_FEATURE_KEYS = ['roles.basic', 'administration.basic', 'settings.manage']
const ADMINISTRATION_DIRECT_FEATURES = ['administration', 'roles', 'settings']
const ADMINISTRATION_FALLBACK_PLANS = ['pro', 'enterprise', 'ultimate']

export function canAccessAdministration({
  role,
  planSlug,
  enabledFeatures,
  featureFlags,
}: AdministrationAccessInput): boolean {
  if (role === 'super_admin' || role === 'super_manager') {
    return true
  }

  if (role !== 'admin' && role !== 'school_admin') {
    return false
  }

  const normalizedFeatures = Array.isArray(enabledFeatures) ? enabledFeatures : []
  if (normalizedFeatures.some((feature) => ADMINISTRATION_DIRECT_FEATURES.includes(String(feature)))) {
    return true
  }

  if (featureFlags && Object.keys(featureFlags).length > 0) {
    return ADMINISTRATION_FEATURE_KEYS.some((featureKey) => Boolean(featureFlags[featureKey]))
  }

  if (planSlug && ADMINISTRATION_FALLBACK_PLANS.includes(String(planSlug).toLowerCase())) {
    return true
  }

  // Preserve access for valid admin roles when feature context is temporarily unavailable.
  return true
}
