import { useMemo } from 'react'

import { useSaasTenant } from '@/hooks/useSaasTenant'

export function useEntitlements() {
  const { current, isLoading } = useSaasTenant()

  const enabled = current?.tenant?.enabled_features || null

  const hasFeature = useMemo(() => {
    return (featureKey: string) => {
      if (!featureKey) return true
      if (!enabled || enabled.length === 0) return true
      return enabled.includes(featureKey)
    }
  }, [enabled])

  return { hasFeature, isLoading }
}

