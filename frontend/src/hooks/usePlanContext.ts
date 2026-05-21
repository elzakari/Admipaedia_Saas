import { useCallback, useEffect, useState } from 'react'

import planContextService, { PlanContext } from '@/services/planContextService'

export function usePlanContext() {
  const [data, setData] = useState<PlanContext | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [token, setToken] = useState(() => localStorage.getItem('token'))
  const [tenantId, setTenantId] = useState(() => localStorage.getItem('saas_current_tenant_id'))

  useEffect(() => {
    const handleStorageChange = () => {
      const currentToken = localStorage.getItem('token')
      const currentTenant = localStorage.getItem('saas_current_tenant_id')
      if (currentToken !== token) {
        setToken(currentToken)
      }
      if (currentTenant !== tenantId) {
        setTenantId(currentTenant)
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
  }, [token, tenantId])

  const refresh = useCallback(async () => {
    const currentToken = localStorage.getItem('token')
    const currentTenant = localStorage.getItem('saas_current_tenant_id')
    if (!currentToken) {
      setData(null)
      setError(null)
      setIsLoading(false)
      return
    }
    if (!currentTenant) {
      setData(null)
      setError(null)
      setIsLoading(false)
      return
    }
    setIsLoading(true)
    setError(null)
    try {
      const ctx = await planContextService.getPlanContext()
      setData(ctx)
    } catch (err: unknown) {
      const e = err as Error
      setError(e.message || 'Failed to load plan context')
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    refresh()
  }, [refresh, token, tenantId])

  return { data, isLoading, error, refresh }
}
