import api from '@/lib/api'

export type SaaSTenant = {
  id: string
  slug: string
  name: string
  country_code: string
  logo_url?: string | null
  default_language?: string | null
  enabled_features?: string[] | null
  plan: string | null
  plan_expires_at?: string | null
  trial_ends_at?: string | null
  status: string | null
  currency: string | null
  custom_domain?: string | null
  schema_name?: string | null
  is_setup_completed?: boolean
  created_at: string | null
}

export type SaaSMembership = {
  role: string | null
  status: string | null
}

export type SaaSTenantItem = {
  tenant: SaaSTenant
  membership: SaaSMembership
}

export type TenantMember = {
  id: string
  user: { id: number; email: string | null; username: string | null }
  role: string
  status: string
  created_at: string | null
}

export type Invitation = {
  id: string
  tenant_id: string
  email: string
  role: string
  token: string
  status: string
  expires_at: string | null
}

export type PlatformInvoice = {
  id: string
  tenant_id: string
  tenant_name?: string | null
  invoice_number: string
  status: string
  amount: number
  currency: string
  issued_on: string
  due_on: string | null
  created_at: string | null
}

export type PlatformPayment = {
  id: string
  tenant_id: string
  tenant_name?: string | null
  invoice_id: string | null
  invoice_number?: string | null
  amount: number
  currency: string
  method: string | null
  reference: string | null
  paid_on: string
  created_at: string | null
}

export type Pagination = {
  total: number
  total_pages: number
  current_page: number
  per_page: number
}

export type PlatformKPIs = {
  tenants_total: number
  tenants_new_last_30d: number
  tenants_by_status: Record<string, number>
  tenants_by_plan: Record<string, number>
  tenants_by_country: Record<string, number>
  invoice_total: number
  payment_total: number
  outstanding_total: number
  invoices_count: number
  invoices_sent_count: number
  invoices_paid_count: number
  students_total?: number
}

export interface AdminDashboardMetrics {
  average_grade: number
  pass_rate: number
  attendance_rate: number
  assignment_completion_rate: number
  active_parents_students: number
  online_staff_count: number
  grade_distribution: Array<{
    grade: string
    count: number
    percentage: number
  }>
  monthly_trends: Array<{
    month: string
    performance: number
    attendance: number
    assignments: number
  }>
  currency: string
  active_sessions_total?: number
  departments?: Array<{
    department: string
    performance: number
    teachers: number
    students: number
    budget: number
  }>
}

export type PlatformTenantDetail = {
  tenant: SaaSTenant
  members_count: number
  legacy_invoice_total?: number
  legacy_payment_total?: number
  school_billing_invoice_total?: number
  school_billing_payment_total?: number
  invoice_total: number
  payment_total: number
  outstanding_total: number
  recent_invoices: PlatformInvoice[]
  recent_payments: PlatformPayment[]
}

export type TenantServiceTokenSummary = {
  id: string
  service_type: 'email' | 'sms' | 'whatsapp' | 'ai'
  status: string
  token_last4: string
  monthly_allowance: string | null
  unlimited: boolean
  used: number
  remaining: number | null
  last_used_at: string | null
  created_at: string | null
  rotated_at: string | null
}

export type TenantServiceTokenEvent = {
  id: string
  tenant_id: string | null
  token_id: string | null
  service_type: string
  event_type: string
  actor_user_id: number | null
  ip_address: string | null
  created_at: string | null
  details: any
}

export type PlatformFinancialSummary = {
  invoice_total: number
  payment_total: number
  outstanding_total: number
  platform_invoice_total?: number
  platform_payment_total?: number
  school_billing_invoice_total?: number
  school_billing_payment_total?: number
  by_tenant: Array<{
    tenant_id: string
    tenant_name: string
    invoice_total: number
    payment_total: number
    outstanding_total?: number
  }>
}

export type SchoolRegistrationPreview = {
  school_name: string
  school_slug: string
  country_code: string
  currency: string
  admin_email: string
  expires_at: string | null
}

const saasService = {
  async createTenant(input: { name: string; slug: string; country_code: string; currency?: string }) {
    const res = await api.post('/saas/tenants', input)
    return res.data as { success: boolean; tenant: SaaSTenant }
  },

  async listMyTenants() {
    const res = await api.get('/saas/tenants')
    return res.data as { success: boolean; items: SaaSTenantItem[] }
  },

  async getTenant(tenantId: string) {
    const res = await api.get(`/saas/tenants/${tenantId}`)
    return res.data as { success: boolean; tenant: SaaSTenant; membership: SaaSMembership }
  },

  async updateTenant(tenantId: string, updates: Partial<Pick<SaaSTenant, 'name' | 'country_code' | 'currency'>>) {
    const res = await api.patch(`/saas/tenants/${tenantId}`, updates)
    return res.data as { success: boolean; tenant: SaaSTenant }
  },

  async listMembers(tenantId: string) {
    const res = await api.get(`/saas/tenants/${tenantId}/members`)
    return res.data as { success: boolean; members: TenantMember[] }
  },

  async createInvitation(tenantId: string, input: { email: string; role: string }) {
    const res = await api.post(`/saas/tenants/${tenantId}/invitations`, input)
    return res.data as { success: boolean; invitation: Invitation }
  },

  async acceptInvitation(token: string) {
    const res = await api.post('/saas/invitations/accept', { token })
    return res.data as { success: boolean; membership: { tenant_id: string; role: string } }
  },

  async listInvoices(tenantId: string) {
    const res = await api.get(`/saas/tenants/${tenantId}/billing/invoices`)
    return res.data as { success: boolean; invoices: PlatformInvoice[] }
  },

  async createInvoice(
    tenantId: string,
    input: { invoice_number: string; amount: number; currency?: string; issued_on: string; due_on?: string }
  ) {
    const res = await api.post(`/saas/tenants/${tenantId}/billing/invoices`, input)
    return res.data as { success: boolean; invoice: PlatformInvoice }
  },

  async listPayments(tenantId: string) {
    const res = await api.get(`/saas/tenants/${tenantId}/billing/payments`)
    return res.data as { success: boolean; payments: PlatformPayment[] }
  },

  async recordPayment(
    tenantId: string,
    input: { invoice_id?: string; amount: number; method?: string; reference?: string; paid_on: string }
  ) {
    const res = await api.post(`/saas/tenants/${tenantId}/billing/payments`, input)
    return res.data as { success: boolean; payment: PlatformPayment }
  },

  async previewRegistrationLink(token: string) {
    const res = await api.post('/saas/registration-links/preview', { token })
    return res.data as { success: boolean; registration: SchoolRegistrationPreview }
  },

  async completeRegistrationLink(input: { token: string; admin_name?: string; password: string; confirm_password: string }) {
    const res = await api.post('/saas/registration-links/complete', input)
    return res.data as {
      success: boolean
      access_token?: string
      refresh_token?: string
      csrf_token?: string
      user?: { id: number; email: string; username: string; role: string }
      tenant?: SaaSTenant
      message?: string
      error?: string
      errors?: unknown
    }
  },

  async platformListTenants(params?: {
    q?: string
    status?: string
    plan?: string
    country_code?: string
    sort?: string
    page?: number
    per_page?: number
  }) {
    const res = await api.get('/saas/platform/tenants', { params })
    return res.data as { success: boolean; items: SaaSTenant[]; pagination: Pagination }
  },

  async platformKpis() {
    const res = await api.get('/saas/platform/kpis')
    return res.data as { success: boolean; kpis: PlatformKPIs }
  },

  async platformGetTenantDetail(tenantId: string) {
    const res = await api.get(`/saas/platform/tenants/${tenantId}`)
    return res.data as { success: boolean; detail: PlatformTenantDetail }
  },

  async platformUpdateTenant(tenantId: string, updates: { status?: string; plan?: string }) {
    const res = await api.patch(`/saas/platform/tenants/${tenantId}`, updates)
    return res.data as { success: boolean; tenant: SaaSTenant }
  },

  async platformListServiceTokens(tenantId: string) {
    const res = await api.get(`/saas/platform/tenants/${tenantId}/service-tokens`)
    return res.data as { success: boolean; tokens: TenantServiceTokenSummary[]; period: { year: number; month: number } }
  },

  async platformProvisionServiceTokens(tenantId: string) {
    const res = await api.post(`/saas/platform/tenants/${tenantId}/service-tokens/provision`, {})
    return res.data as { success: boolean; issued: Record<string, string | null> }
  },

  async platformRotateServiceToken(tenantId: string, serviceType: string) {
    const res = await api.post(`/saas/platform/tenants/${tenantId}/service-tokens/${serviceType}/rotate`, {})
    return res.data as { success: boolean; token: string }
  },

  async platformListServiceTokenEvents(tenantId: string, params?: { service_type?: string; limit?: number }) {
    const res = await api.get(`/saas/platform/tenants/${tenantId}/service-tokens/events`, { params })
    return res.data as { success: boolean; events: TenantServiceTokenEvent[] }
  },

  async platformListMembers(tenantId: string) {
    const res = await api.get(`/saas/platform/tenants/${tenantId}/members`)
    return res.data as { success: boolean; members: TenantMember[] }
  },

  async platformUpsertMember(tenantId: string, input: { email: string; role: string; status?: string }) {
    const res = await api.post(`/saas/platform/tenants/${tenantId}/members`, input)
    return res.data as { success: boolean; membership: { id: string; tenant_id: string; user_id: number; role: string; status: string } }
  },

  async platformUpdateMembership(
    tenantId: string,
    membershipId: string,
    updates: { role?: string; status?: string }
  ) {
    const res = await api.patch(`/saas/platform/tenants/${tenantId}/members/${membershipId}`, updates)
    return res.data as { success: boolean; membership: { id: string; tenant_id: string; user_id: number; role: string; status: string } }
  },

  async platformDeleteMembership(tenantId: string, membershipId: string) {
    const res = await api.delete(`/saas/platform/tenants/${tenantId}/members/${membershipId}`)
    return res.data as { success: boolean }
  },

  async platformFinancialSummary() {
    const res = await api.get('/saas/platform/financial/summary')
    return res.data as { success: boolean; summary: PlatformFinancialSummary }
  },

  async platformListInvoices(params?: {
    tenant_id?: string
    status?: string
    q?: string
    from?: string
    to?: string
    page?: number
    per_page?: number
  }) {
    const res = await api.get('/saas/platform/financial/invoices', { params })
    return res.data as { success: boolean; items: PlatformInvoice[]; pagination: Pagination }
  },

  async platformListPayments(params?: {
    tenant_id?: string
    method?: string
    q?: string
    from?: string
    to?: string
    page?: number
    per_page?: number
  }) {
    const res = await api.get('/saas/platform/financial/payments', { params })
    return res.data as { success: boolean; items: PlatformPayment[]; pagination: Pagination }
  },

  async getAdminDashboardMetrics(tenantId?: string) {
    const res = await api.get('/admin/dashboard-metrics', { params: { tenantId } })
    return res.data as { success: boolean; data: AdminDashboardMetrics }
  },

  async getAdminDashboardAnalytics(tenantId?: string) {
    const res = await api.get('/admin/dashboard/analytics', { params: { tenantId } })
    return res.data as {
      success: boolean;
      data: {
        subject_performance: Array<{
          subject: string;
          average_score: number;
          student_count: number;
          teacher_count: number;
          improvement: number;
          difficulty: 'Easy' | 'Medium' | 'Hard';
        }>;
        skills_assessment: Record<string, { current: number; target: number }>;
        system_monitor: {
          cpu_usage: number;
          memory_usage: number;
          disk_usage: number;
          network_latency: number;
        };
      }
    }
  },

  async getDashboardTelemetry(tenantId?: string) {
    const res = await api.get('/saas/dashboard/telemetry', {
      params: tenantId ? { tenant_id: tenantId } : undefined,
      headers: tenantId ? { 'X-Tenant-ID': tenantId } : undefined
    })
    return res.data as {
      success: boolean;
      data: {
        academic_metrics: {
          average_grade: number;
          pass_rate: number;
          attendance_rate: number;
          assignment_completion_rate: number;
          students_count: number;
          teachers_count: number;
          classes_count: number;
          active_parents_students: number;
        };
        system_monitor: {
          cpu_usage: number;
          memory_usage: number;
          disk_usage: number;
          network_latency: number;
          database_connections: number;
          online_teachers: number;
          active_users: number;
        };
        subject_performance: Array<{
          subject: string;
          average_score: number;
          student_count: number;
          teacher_count: number;
          improvement: number;
          difficulty: 'Easy' | 'Medium' | 'Hard';
        }>;
        skills_assessment: Record<string, { current: number; target: number }>;
      }
    }
  }
};

export default saasService
