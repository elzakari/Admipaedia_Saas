import { useCallback, useEffect, useMemo, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'

import planContextService, { PlanContext } from '@/services/planContextService'

export function usePlanContext() {
  const [token, setToken] = useState(() => localStorage.getItem('token'))
  const [tenantId, setTenantId] = useState(() => localStorage.getItem('saas_current_tenant_id'))
  const queryClient = useQueryClient()

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

    return () => {
      window.removeEventListener('local-storage-change', handleStorageChange)
      window.removeEventListener('storage', handleStorageChange)
    }
  }, [token, tenantId])
  const planContextQuery = useQuery({
    queryKey: ['plan-context', token, tenantId],
    queryFn: () => planContextService.getPlanContext(),
    enabled: !!token && !!tenantId,
    staleTime: 2 * 60 * 1000,
  })

  const refresh = useCallback(async () => {
    if (!localStorage.getItem('token') || !localStorage.getItem('saas_current_tenant_id')) {
      queryClient.removeQueries({ queryKey: ['plan-context'] })
      return
    }
    await planContextQuery.refetch()
  }, [planContextQuery, queryClient])

  const error = useMemo(() => {
    if (!planContextQuery.error) return null
    const e = planContextQuery.error as Error
    return e.message || 'Failed to load plan context'
  }, [planContextQuery.error])

  return {
    data: planContextQuery.data ?? null,
    isLoading: !!token && !!tenantId && planContextQuery.isLoading,
    error,
    refresh
  }
}
