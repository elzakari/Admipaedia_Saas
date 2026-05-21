import { useCallback, useEffect, useMemo, useState } from 'react'
import type { AxiosError } from 'axios'
import saasService, { SaaSTenantItem, SaaSTenant } from '@/services/saasService'

const STORAGE_KEY = 'saas_current_tenant_id'
const COUNTRY_KEY = 'saas_current_tenant_country_code'

export function useSaasTenant() {
  const [items, setItems] = useState<SaaSTenantItem[] | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  const [token, setToken] = useState(() => localStorage.getItem('token'))
  const [currentTenantId, setCurrentTenantId] = useState<string | null>(() => {
    return localStorage.getItem(STORAGE_KEY)
  })

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

    const interval = setInterval(handleStorageChange, 1000)

    return () => {
      window.removeEventListener('local-storage-change', handleStorageChange)
      window.removeEventListener('storage', handleStorageChange)
      clearInterval(interval)
    }
  }, [token, currentTenantId])

  const refresh = useCallback(async () => {
    const currentToken = localStorage.getItem('token')
    if (!currentToken) {
      setItems(null)
      setError(null)
      setIsLoading(false)
      return
    }
    setIsLoading(true)
    setError(null)
    try {
      const res = await saasService.listMyTenants()
      setItems(res.items)

      const stored = localStorage.getItem(STORAGE_KEY)
      const first = res.items[0]?.tenant?.id
      const next = stored && res.items.some((i) => i.tenant.id === stored) ? stored : first || null
      if (next) {
        localStorage.setItem(STORAGE_KEY, next)
      } else {
        localStorage.removeItem(STORAGE_KEY)
      }
      setCurrentTenantId(next)
    } catch (err: unknown) {
      const e = err as AxiosError<{ message?: string }>
      setError(e.response?.data?.message || e.message || 'Failed to load schools')
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    refresh()
  }, [refresh, token])

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
