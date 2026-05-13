import api from '@/lib/api'

export type PlatformTokenUsageSummary = {
  total_used: number
  by_service: Record<string, number>
  by_tenant: Record<string, number>
}

async function getTenantPlanContext(tenantId: string) {
  const res = await api.get<{ success: boolean; data?: any; message?: string }>(`/platform/plan-context`, {
    headers: { 'X-Tenant-ID': tenantId }
  })
  if (!res.data?.success || !res.data?.data) {
    throw new Error(res.data?.message || 'Failed to load plan context')
  }
  return res.data.data
}

async function getTokenUsageSummary(year?: number, month?: number) {
  const params: Record<string, number> = {}
  if (year) params.year = year
  if (month) params.month = month

  const res = await api.get<{ success: boolean; summary?: PlatformTokenUsageSummary; message?: string }>(
    '/platform/token-usage/summary',
    { params }
  )
  if (!res.data?.success || !res.data?.summary) {
    throw new Error(res.data?.message || 'Failed to load token usage summary')
  }
  return res.data.summary
}

export default { getTenantPlanContext, getTokenUsageSummary }

