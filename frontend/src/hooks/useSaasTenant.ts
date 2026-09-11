import { useCallback, useEffect, useMemo, useState } from 'react'
import type { AxiosError } from 'axios'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import saasService, { SaaSTenantItem, SaaSTenant } from '@/services/saasService'
import { useAuth } from '@/contexts/AuthContext'
import { purgeTenantScopedBrowserState } from '@/lib/tenantIsolation'

const STORAGE_KEY = 'saas_current_tenant_id'
const COUNTRY_KEY = 'saas_current_tenant_country_code'

function isActiveMembership(item: SaaSTenantItem): boolean {
  return String(item.membership?.status ?? '')
    .trim()
    .toLowerCase() === 'active'
}

function isPlatformRole(role: unknown): boolean {
  const normalized = String(role ?? '')
    .trim()
    .toLowerCase()

  return (
    normalized === 'super_admin' ||
    normalized === 'super_manager'
  )
}

function asPlatformTenantItem(
  tenant: SaaSTenant
): SaaSTenantItem {
  return {
    tenant,
    membership: {
      // Browser-only neutral membership shape.
      // Platform authority remains global.
      role: null,
      status: 'active',
    },
  }
}

async function listAllPlatformTenantItems(): Promise<SaaSTenantItem[]> {
  const first =
    await saasService.platformListTenants({
      page: 1,
      per_page: 200,
      sort: 'name_asc',
    })

  const tenants = [
    ...(first.items || []),
  ]

  const totalPages = Math.max(
    1,
    Number(
      first.pagination?.total_pages || 1
    )
  )

  for (
    let page = 2;
    page <= totalPages;
    page += 1
  ) {
    const response =
      await saasService.platformListTenants({
        page,
        per_page: 200,
        sort: 'name_asc',
      })

    tenants.push(
      ...(response.items || [])
    )
  }

  return tenants.map(
    asPlatformTenantItem
  )
}

export function useSaasTenant() {
  const [token, setToken] = useState(() => localStorage.getItem('token'))
  const [currentTenantId, setCurrentTenantId] = useState<string | null>(() => {
    return localStorage.getItem(STORAGE_KEY)
  })
  const queryClient = useQueryClient()
  const { user } = useAuth()

  const platformIdentity =
    isPlatformRole(user?.role)

  const tenantsQueryEnabled =
    Boolean(token && user?.id)

  useEffect(() => {
    const handleStorageChange = () => {
      const currentToken = localStorage.getItem('token')
      const currentTenant = localStorage.getItem(STORAGE_KEY)
      if (currentToken !== token) {
        setToken(currentToken)
      }
      if (currentTenant !== currentTenantId) {
        setCurrentTenantId(currentTenant)
      }
    }

    window.addEventListener('local-storage-change', handleStorageChange)
    window.addEventListener('storage', handleStorageChange)

    return () => {
      window.removeEventListener('local-storage-change', handleStorageChange)
      window.removeEventListener('storage', handleStorageChange)
    }
  }, [token, currentTenantId])
  const tenantsQuery = useQuery({
    queryKey: [
      'saas',
      'tenants',
      platformIdentity
        ? 'platform'
        : 'membership',
      token,
    ],
    queryFn: async () => {
      if (platformIdentity) {
        return listAllPlatformTenantItems()
      }

      const res =
        await saasService.listMyTenants()

      return res.items
    },
    enabled: tenantsQueryEnabled,
    staleTime: 2 * 60 * 1000,
  })

  const items = tenantsQueryEnabled
    ? (tenantsQuery.data ?? null)
    : null
  const activeItems = useMemo(
    () => (items ? items.filter(isActiveMembership) : null),
    [items]
  )
  const isLoading =
    tenantsQueryEnabled &&
    tenantsQuery.isLoading
  const error = useMemo(() => {
    if (!tenantsQuery.error) return null
    const e = tenantsQuery.error as AxiosError<{ message?: string }>
    return e.response?.data?.message || e.message || 'Failed to load schools'
  }, [tenantsQuery.error])

  const refresh = useCallback(async () => {
    if (
      !localStorage.getItem('token') ||
      !user?.id
    ) {
      queryClient.removeQueries({
        queryKey: ['saas', 'tenants'],
      })
      return
    }

    await tenantsQuery.refetch()
  }, [
    queryClient,
    tenantsQuery,
    user?.id,
  ])

  useEffect(() => {
    if (!token) {
      setCurrentTenantId(null)
      return
    }

    // Do not invalidate a legitimate stored tenant while the membership
    // list is still loading/refetching after a tenant cache boundary reset.
    if (activeItems === null) {
      return
    }

    const stored = localStorage.getItem(STORAGE_KEY)
    const first = activeItems[0]?.tenant?.id || null
    const next =
      stored && activeItems.some((i) => i.tenant.id === stored)
        ? stored
        : first
    if (next && stored !== next) {
      localStorage.setItem(STORAGE_KEY, next)
    } else if (!next && stored) {
      localStorage.removeItem(STORAGE_KEY)
    }
    setCurrentTenantId(next)
  }, [activeItems, token])

  const current = useMemo(() => {
    if (!activeItems || !currentTenantId) return null
    return activeItems.find((i) => i.tenant.id === currentTenantId) || null
  }, [activeItems, currentTenantId])

  useEffect(() => {
    const cc = current?.tenant?.country_code
    if (cc) localStorage.setItem(COUNTRY_KEY, cc)
    else localStorage.removeItem(COUNTRY_KEY)
  }, [current?.tenant?.country_code])

  const setCurrentTenant = useCallback((tenantId: string) => {
    const normalizedTenantId = tenantId.trim()

    if (!normalizedTenantId || normalizedTenantId === currentTenantId) {
      return
    }

    if (
      !activeItems ||
      !activeItems.some((item) => item.tenant.id === normalizedTenantId)
    ) {
      console.warn(
        '[Tenant] Refusing to select a tenant without an active membership.'
      )
      return
    }

    // Clear tenant/branch-scoped browser state BEFORE components react to
    // the new tenant identifier.
    purgeTenantScopedBrowserState()
    queryClient.clear()

    localStorage.setItem(STORAGE_KEY, normalizedTenantId)
    setCurrentTenantId(normalizedTenantId)
  }, [currentTenantId, activeItems, queryClient])

  const tenants: SaaSTenant[] = useMemo(
    () => (activeItems ? activeItems.map((i) => i.tenant) : []),
    [activeItems]
  )

  return {
    items: activeItems,
    tenants,
    current,
    currentTenantId,
    setCurrentTenant,
    isLoading,
    error,
    refresh
  }
}
