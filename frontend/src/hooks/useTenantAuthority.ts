import {
  useCallback,
  useMemo,
} from 'react'

import { useAuth } from '@/contexts/AuthContext'
import { useSaasTenant } from '@/hooks/useSaasTenant'
import {
  authorityHasRole,
  resolveTenantAuthority,
} from '@/lib/tenantAuthority'

export function useTenantAuthority() {
  const {
    user,
    isAuthenticated,
  } = useAuth()

  const {
    current,
    isLoading: tenantLoading,
  } = useSaasTenant()

  const authority = useMemo(
    () =>
      resolveTenantAuthority(
        user?.role,
        current?.membership?.role
      ),
    [
      user?.role,
      current?.membership?.role,
    ]
  )

  const hasRole = useCallback(
    (roles: string | string[]) =>
      authorityHasRole(
        authority,
        roles
      ),
    [authority]
  )

  return {
    ...authority,
    hasRole,

    // Platform identities do not require a
    // tenant membership before platform routes
    // can be authorized.
    isLoading:
      Boolean(isAuthenticated) &&
      !authority.isPlatform &&
      tenantLoading,
  }
}
