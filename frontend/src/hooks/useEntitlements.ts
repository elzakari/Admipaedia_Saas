import { useMemo } from 'react'

import { usePlanContext } from '@/hooks/usePlanContext'

export function useEntitlements() {
  const { data, isLoading } = usePlanContext()

  const enabled = data?.features || null

  const hasFeature = useMemo(() => {
    return (featureKey: string) => {
      if (!featureKey) return true
      if (!enabled) return true
      return Boolean(enabled[featureKey])
    }
  }, [enabled])

  return { hasFeature, isLoading }
}

