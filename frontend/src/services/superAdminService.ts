import api from '@/lib/api'

export type SuperAdminUserRole = 'super_admin' | 'admin' | 'teacher' | 'student' | 'parent' | 'user'
export type SuperAdminUserStatus = 'active' | 'inactive'

export type SuperAdminUser = {
  id: number
  username: string
  email: string
  role: SuperAdminUserRole
  status: SuperAdminUserStatus
  created_at?: string | null
  updated_at?: string | null
  last_login?: string | null
}

export type SuperAdminUsersResponse = {
  success: boolean
  users: SuperAdminUser[]
  pagination: {
    total: number
    pages: number
    page: number
    per_page: number
    has_next: boolean
    has_prev: boolean
  }
}

export type SuperAdminOverview = {
  total_users: number
  by_role: Record<string, number>
  by_status: {
    active: number
    inactive: number
  }
  recent_audit: Array<{
    id: number
    event_type: string
    actor_user_id: number | null
    created_at: string | null
    details: Record<string, unknown>
  }>
}

export type SuperAdminOverviewResponse = {
  success: boolean
  overview: SuperAdminOverview
}

export type SuperAdminAuditLog = {
  id: number
  event_type: string
  actor_user_id: number | null
  severity: string
  endpoint: string | null
  method: string | null
  ip_address: string | null
  created_at: string | null
  details: Record<string, unknown>
}

export type SuperAdminAuditLogsResponse = {
  success: boolean
  logs: SuperAdminAuditLog[]
  pagination: {
    total: number
    pages: number
    page: number
    per_page: number
    has_next: boolean
    has_prev: boolean
  }
}

export type SchoolRegistrationLink = {
  id: number
  school_name: string
  school_slug: string
  country_code: string
  currency: string
  admin_email: string
  expires_at?: string | null
  created_at?: string | null
}

export type SchoolRegistrationLinkResponse = {
  success: boolean
  registration: SchoolRegistrationLink
  registration_url: string
}

export type OrphanTenantStatus = {
  exists: boolean
  tenant_id: string
  can_delete: boolean
  reasons: string[]
  counts: Record<string, number>
  tenant?: {
    id: string
    name: string
    slug: string
    country_code: string
    status: string
    plan: string
    created_at?: string | null
  }
}

export type OrphanUserStatus = {
  exists: boolean
  user_id: number
  can_delete: boolean
  reasons: string[]
  counts: Record<string, number>
  user?: SuperAdminUser
}

export const superAdminService = {
  getOverview: async (): Promise<SuperAdminOverviewResponse> => {
    const res = await api.get('/super-admin/overview')
    return res.data
  },

  listUsers: async (params: {
    page?: number
    per_page?: number
    q?: string
    role?: string
    status?: string
  }): Promise<SuperAdminUsersResponse> => {
    const res = await api.get('/super-admin/users', { params })
    return res.data
  },

  createUser: async (payload: {
    email: string
    username?: string
    role: SuperAdminUserRole | 'general'
    status?: 'active' | 'inactive' | 'deactivated'
    password?: string
    send_reset?: boolean
  }): Promise<{ success: boolean; user: SuperAdminUser; email_sent?: boolean } > => {
    const res = await api.post('/super-admin/users', payload)
    return res.data
  },

  getUser: async (id: number): Promise<{ success: boolean; user: SuperAdminUser } > => {
    const res = await api.get(`/super-admin/users/${id}`)
    return res.data
  },

  updateUser: async (id: number, patch: Partial<{
    email: string
    username: string
    role: SuperAdminUserRole | 'general'
    status: 'active' | 'inactive' | 'deactivated'
  }>): Promise<{ success: boolean; user: SuperAdminUser } > => {
    const res = await api.patch(`/super-admin/users/${id}`, patch)
    return res.data
  },

  deactivateUser: async (id: number): Promise<{ success: boolean; user: SuperAdminUser } > => {
    const res = await api.post(`/super-admin/users/${id}/deactivate`)
    return res.data
  },

  reactivateUser: async (id: number): Promise<{ success: boolean; user: SuperAdminUser } > => {
    const res = await api.post(`/super-admin/users/${id}/reactivate`)
    return res.data
  },

  sendReset: async (id: number): Promise<{ success: boolean; email_sent: boolean } > => {
    const res = await api.post(`/super-admin/users/${id}/send-reset`)
    return res.data
  },

  listAuditLogs: async (params: {
    page?: number
    per_page?: number
    q?: string
    event_type?: string
    actor_user_id?: number
    target_user_id?: number
    from?: string
    to?: string
  }): Promise<SuperAdminAuditLogsResponse> => {
    const res = await api.get('/super-admin/audit-logs', { params })
    return res.data
  },

  createSchoolRegistrationLink: async (payload: {
    school_name: string
    school_slug?: string
    country_code: string
    currency?: string
    admin_email: string
  }): Promise<SchoolRegistrationLinkResponse> => {
    const res = await api.post('/super-admin/school-registration-links', payload)
    return res.data
  },

  getOrphanTenantStatus: async (tenantId: string): Promise<{ success: boolean; status: OrphanTenantStatus }> => {
    const res = await api.get(`/super-admin/orphans/tenants/${tenantId}`)
    return res.data
  },

  deleteOrphanTenant: async (tenantId: string): Promise<{ success: boolean }> => {
    const res = await api.delete(`/super-admin/orphans/tenants/${tenantId}`, { params: { confirm: true } })
    return res.data
  },

  getOrphanUserStatus: async (id: number): Promise<{ success: boolean; status: OrphanUserStatus }> => {
    const res = await api.get(`/super-admin/orphans/users/${id}`)
    return res.data
  },

  deleteOrphanUser: async (id: number): Promise<{ success: boolean }> => {
    const res = await api.delete(`/super-admin/orphans/users/${id}`, { params: { confirm: true } })
    return res.data
  },
}
