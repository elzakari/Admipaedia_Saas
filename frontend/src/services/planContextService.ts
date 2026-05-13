import api from '@/lib/api'

export type TokenUsage = {
  service_type: 'email' | 'sms' | 'whatsapp' | 'ai'
  used: number
  allowance: number | null
  unlimited: boolean
  remaining: number | null
}

export type PlanContext = {
  tenant_id: string
  plan: { id: number; slug: string; name: string }
  subscription: { id: number; status: string; starts_at: string | null; ends_at: string | null }
  features: Record<string, boolean>
  limits: Record<string, unknown>
  token_usage: Record<'email' | 'sms' | 'whatsapp' | 'ai', TokenUsage>
  errors?: { features?: string | null; limits?: string | null }
}

async function getPlanContext() {
  const res = await api.get<{ success: boolean; data?: PlanContext; message?: string }>('/plan-context')
  if (!res.data?.success || !res.data?.data) {
    throw new Error(res.data?.message || 'Failed to load plan context')
  }
  return res.data.data
}

export default { getPlanContext }

