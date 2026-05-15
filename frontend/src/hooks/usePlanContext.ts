import { useCallback, useEffect, useState } from 'react'

import planContextService, { PlanContext } from '@/services/planContextService'

export function usePlanContext() {
  const [data, setData] = useState<PlanContext | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    if (!localStorage.getItem('token')) {
      setData(null)
      setError(null)
      setIsLoading(false)
      return
    }
    if (!localStorage.getItem('saas_current_tenant_id')) {
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
  }, [refresh])

  return { data, isLoading, error, refresh }
}

