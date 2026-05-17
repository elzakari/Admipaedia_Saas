import api from '@/lib/api'

export type PaymentGateway = {
  id: number
  name: string
  display_name: string | null
  country_code: string | null
  currency: string | null
  public_key: string | null
  is_active: boolean
  is_default: boolean
  supported_channels: string[]
  environment: 'sandbox' | 'live' | string
  secret_key_set: boolean
  webhook_secret_set: boolean
  created_at: string | null
  updated_at: string | null
}

export type BillingInvoice = {
  id: number
  invoice_number: string
  tenant_id: string
  plan_id: number
  academic_term_id: number
  active_student_count: number
  price_per_student_snapshot: number
  billing_months: number
  subtotal: number
  discount_amount: number
  tax_amount: number
  total_amount: number
  currency: string
  status: string
  due_date: string | null
  paid_at: string | null
  payment_status: string
  payment_link: string | null
  payment_reference: string | null
  gateway_name: string | null
  amount_paid: number
  balance_due: number
  created_at: string | null
  updated_at: string | null
}

export type Payment = {
  id: number
  invoice_id: number
  school_id: string
  payment_gateway_id: number | null
  gateway_name: string
  payment_reference: string
  gateway_transaction_id: string | null
  amount: number
  currency: string
  payment_channel: string
  status: string
  payment_link: string | null
  paid_at: string | null
  verified_at: string | null
  submitted_by_user_id: number | null
  reviewed_by_user_id: number | null
  review_note: string | null
  reviewed_at: string | null
  proof_path: string | null
  manual_method: string | null
  manual_reference: string | null
  manual_paid_at: string | null
  created_at: string | null
}

export type PaymentOptionsResponse = {
  success: boolean
  gateway: PaymentGateway
  supported_channels: string[]
}

export type BillingPlan = {
  id: number
  name: string
  slug: string
  description: string | null
  price_per_student: number
  currency: string
  is_active: boolean
  billing_min_months: number
}

export type AcademicTerm = {
  id: number
  name: string
  start_date: string | null
  end_date: string | null
}

export type SubscriptionChangeRequest = {
  id: number
  school_id: string
  requested_plan_id: number
  request_type: 'upgrade' | 'downgrade' | string
  status: 'pending' | 'approved' | 'rejected' | string
  effective_academic_term_id: number | null
  effective_date: string | null
  created_by_user_id: number | null
  approved_by_user_id: number | null
  decision_note: string | null
  decided_at: string | null
  created_at: string | null
  updated_at: string | null
  requested_plan: BillingPlan | null
}

export type PlanPricingTier = {
  id: number
  plan_id: number
  country_code: string | null
  currency: string
  min_students: number
  max_students: number | null
  price_per_student_month: number
  is_active: boolean
  created_at: string | null
  updated_at: string | null
}

const billingService = {
  listGateways: async () => {
    const res = await api.get('/billing/gateways')
    return res.data as { success: boolean; gateways: PaymentGateway[] }
  },
  createGateway: async (payload: any) => {
    const res = await api.post('/billing/gateways', payload)
    return res.data as { success: boolean; gateway: PaymentGateway }
  },
  updateGateway: async (id: number, payload: any) => {
    const res = await api.put(`/billing/gateways/${id}`, payload)
    return res.data as { success: boolean; gateway: PaymentGateway }
  },
  listPlatformPayments: async (params?: {
    status?: string
    gateway?: string
    country_code?: string
    tenant_id?: string
    date_from?: string
    date_to?: string
  }) => {
    const res = await api.get('/billing/payments', { params })
    return res.data as { success: boolean; payments: Payment[] }
  },
  verifyPlatformPayment: async (paymentId: number) => {
    const res = await api.post(`/billing/payments/${paymentId}/verify`)
    return res.data as { success: boolean; payment: Payment }
  },
  reviewManualPayment: async (paymentId: number, payload: { approve: boolean; note?: string }) => {
    const res = await api.post(`/billing/payments/${paymentId}/manual-review`, payload)
    return res.data as { success: boolean; payment: Payment }
  },
  listSchoolInvoices: async () => {
    const res = await api.get('/billing/school/invoices')
    return res.data as { success: boolean; invoices: BillingInvoice[] }
  },
  listSchoolPayments: async () => {
    const res = await api.get('/billing/school/payments')
    return res.data as { success: boolean; payments: Payment[] }
  },
  getSchoolPaymentOptions: async () => {
    const res = await api.get('/billing/school/payment-options')
    return res.data as PaymentOptionsResponse
  },
  initializeInvoicePayment: async (invoiceId: number, payload: { payment_channel: string; return_url?: string; notify_url?: string }) => {
    const res = await api.post(`/billing/school/invoices/${invoiceId}/initialize-payment`, payload)
    return res.data as { success: boolean; payment: Payment; invoice: BillingInvoice }
  },
  verifySchoolPayment: async (paymentId: number) => {
    const res = await api.post(`/billing/school/payments/${paymentId}/verify`)
    return res.data as { success: boolean; payment: Payment; invoice: BillingInvoice | null }
  },
  submitManualPayment: async (invoiceId: number, formData: FormData) => {
    const res = await api.post(`/billing/school/invoices/${invoiceId}/manual-payment`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    })
    return res.data as { success: boolean; payment: Payment }
  },
  listSchoolPlans: async () => {
    const res = await api.get('/billing/school/plans')
    return res.data as { success: boolean; plans: BillingPlan[] }
  },
  listPlatformPlans: async () => {
    const res = await api.get('/billing/plans')
    return res.data as { success: boolean; plans: BillingPlan[] }
  },
  seedDefaultPlans: async () => {
    const res = await api.post('/billing/plans/seed-defaults')
    return res.data as { success: boolean; plans: BillingPlan[] }
  },
  listSchoolAcademicTerms: async () => {
    const res = await api.get('/billing/school/academic-terms')
    return res.data as { success: boolean; terms: AcademicTerm[] }
  },
  listSchoolSubscriptionChangeRequests: async () => {
    const res = await api.get('/billing/school/subscription-change-requests')
    return res.data as { success: boolean; requests: SubscriptionChangeRequest[] }
  },
  upgradeSubscription: async (payload: { plan_slug: string; academic_term_id: number; payment_channel?: string; return_url?: string; notify_url?: string }) => {
    const res = await api.post('/billing/school/subscription/upgrade', {
      plan_slug: payload.plan_slug,
      plan: payload.plan_slug,
      academic_term_id: payload.academic_term_id,
      term_id: payload.academic_term_id,
      payment_channel: payload.payment_channel,
      channel: payload.payment_channel,
      return_url: payload.return_url,
      notify_url: payload.notify_url
    })
    return res.data as {
      success: boolean
      subscription_id: number
      plan: BillingPlan
      invoice: BillingInvoice
      payment: Payment | null
      change_request: SubscriptionChangeRequest
    }
  },
  requestDowngrade: async (payload: { plan_slug: string; effective_academic_term_id: number }) => {
    const res = await api.post('/billing/school/subscription/downgrade-request', {
      plan_slug: payload.plan_slug,
      plan: payload.plan_slug,
      effective_academic_term_id: payload.effective_academic_term_id,
      effective_term_id: payload.effective_academic_term_id,
      term_id: payload.effective_academic_term_id
    })
    return res.data as { success: boolean; request: SubscriptionChangeRequest }
  },
  listPlatformSubscriptionChangeRequests: async (params?: { status?: string }) => {
    const res = await api.get('/billing/subscription-change-requests', { params })
    return res.data as { success: boolean; requests: SubscriptionChangeRequest[] }
  },
  approveSubscriptionChangeRequest: async (requestId: number) => {
    const res = await api.post(`/billing/subscription-change-requests/${requestId}/approve`)
    return res.data as { success: boolean; request: SubscriptionChangeRequest }
  },
  rejectSubscriptionChangeRequest: async (requestId: number, payload: { note?: string }) => {
    const res = await api.post(`/billing/subscription-change-requests/${requestId}/reject`, payload)
    return res.data as { success: boolean; request: SubscriptionChangeRequest }
  },
  updatePlanBillingSettings: async (planId: number, payload: { billing_min_months: number }) => {
    const res = await api.patch(`/billing/plans/${planId}/billing-settings`, payload)
    return res.data as { success: boolean; plan: BillingPlan }
  },
  listPlanPricingTiers: async (planId: number) => {
    const res = await api.get(`/billing/plans/${planId}/pricing-tiers`)
    return res.data as { success: boolean; tiers: PlanPricingTier[] }
  },
  createPlanPricingTier: async (planId: number, payload: Omit<PlanPricingTier, 'id' | 'plan_id' | 'created_at' | 'updated_at'>) => {
    const res = await api.post(`/billing/plans/${planId}/pricing-tiers`, payload)
    return res.data as { success: boolean; tier: PlanPricingTier }
  },
  updatePlanPricingTier: async (tierId: number, payload: Partial<PlanPricingTier> & { plan_id: number }) => {
    const res = await api.put(`/billing/pricing-tiers/${tierId}`, payload)
    return res.data as { success: boolean; tier: PlanPricingTier }
  },
  deletePlanPricingTier: async (tierId: number) => {
    const res = await api.delete(`/billing/pricing-tiers/${tierId}`)
    return res.data as { success: boolean }
  }
}

export default billingService
