import api from '@/lib/api'

export type ProviderConfig = {
  id: number
  scope: 'platform' | 'tenant'
  tenant_id?: string
  service_type: string
  provider_key: string
  display_name?: string | null
  priority: number
  is_active: boolean
  source?: string
  config: Record<string, any>
}

export type PlanTokenLimits = {
  id: number
  slug: string
  name: string
  token_limits: Record<string, { value: string; value_type: string }>
}

const platformIntegrationsService = {
  async listProviders(params?: { service_type?: string; tenant_id?: string; include_overrides?: boolean }) {
    const res = await api.get('/platform/integrations/providers', { params })
    return res.data as { success: boolean; providers: ProviderConfig[]; overrides: ProviderConfig[] }
  },

  async upsertProvider(input: {
    scope?: 'platform' | 'tenant'
    tenant_id?: string
    service_type: string
    provider_key: string
    display_name?: string | null
    priority?: number
    is_active?: boolean
    source?: string
    config: Record<string, any>
  }) {
    const res = await api.post('/platform/integrations/providers', input)
    return res.data as { success: boolean; id: number }
  },

  async listPlanTokenLimits() {
    const res = await api.get('/platform/integrations/plans/token-limits')
    return res.data as { success: boolean; plans: PlanTokenLimits[] }
  },

  async updatePlanTokenLimits(planId: number, limits: Record<string, string | number>) {
    const res = await api.post(`/platform/integrations/plans/${planId}/token-limits`, { limits })
    return res.data as { success: boolean }
  }
}

export default platformIntegrationsService

