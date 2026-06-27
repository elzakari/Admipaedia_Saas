import { useCallback, useEffect, useMemo, useState } from 'react'
import type { AxiosError } from 'axios'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import saasService, { SaaSTenantItem, SaaSTenant } from '@/services/saasService'

const STORAGE_KEY = 'saas_current_tenant_id'
const COUNTRY_KEY = 'saas_current_tenant_country_code'

export function useSaasTenant() {
  const [token, setToken] = useState(() => localStorage.getItem('token'))
  const [currentTenantId, setCurrentTenantId] = useState<string | null>(() => {
    return localStorage.getItem(STORAGE_KEY)
  })
  const queryClient = useQueryClient()

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
    queryKey: ['saas', 'tenants', token],
    queryFn: async () => {
      const res = await saasService.listMyTenants()
      return res.items
    },
    enabled: !!token,
    staleTime: 2 * 60 * 1000,
  })

  const items = token ? (tenantsQuery.data ?? null) : null
  const isLoading = !!token && tenantsQuery.isLoading
  const error = useMemo(() => {
    if (!tenantsQuery.error) return null
    const e = tenantsQuery.error as AxiosError<{ message?: string }>
    return e.response?.data?.message || e.message || 'Failed to load schools'
  }, [tenantsQuery.error])

  const refresh = useCallback(async () => {
    if (!localStorage.getItem('token')) {
      queryClient.removeQueries({ queryKey: ['saas', 'tenants'] })
      return
    }
    await tenantsQuery.refetch()
  }, [queryClient, tenantsQuery])

  useEffect(() => {
    if (!token) {
      setCurrentTenantId(null)
      return
    }

    const stored = localStorage.getItem(STORAGE_KEY)
    const first = items?.[0]?.tenant?.id || null
    const next = stored && items?.some((i) => i.tenant.id === stored) ? stored : first
    if (next && stored !== next) {
      localStorage.setItem(STORAGE_KEY, next)
    } else if (!next && stored) {
      localStorage.removeItem(STORAGE_KEY)
    }
    setCurrentTenantId(next)
  }, [items, token])

  const current = useMemo(() => {
    if (!items || !currentTenantId) return null
    return items.find((i) => i.tenant.id === currentTenantId) || null
  }, [items, currentTenantId])

  useEffect(() => {
    const cc = current?.tenant?.country_code
    if (cc) localStorage.setItem(COUNTRY_KEY, cc)
    else localStorage.removeItem(COUNTRY_KEY)
  }, [current?.tenant?.country_code])

  const setCurrentTenant = useCallback((tenantId: string) => {
    localStorage.setItem(STORAGE_KEY, tenantId)
    setCurrentTenantId(tenantId)
  }, [])

  const tenants: SaaSTenant[] = useMemo(() => (items ? items.map((i) => i.tenant) : []), [items])

  return {
    items,
    tenants,
    current,
    currentTenantId,
    setCurrentTenant,
    isLoading,
    error,
    refresh
  }
}
