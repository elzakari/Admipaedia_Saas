import api from '@/lib/api'

export type InviteeType = 'parent' | 'teacher' | 'general'
export type InviteStatus = 'active' | 'expired' | 'revoked' | 'consumed'

export type InvitationLink = {
  id: string
  tenant_id: string
  invitee_type: InviteeType
  status: InviteStatus
  expires_at: string | null
  created_at: string | null
  created_by_user_id?: number
  consumed_at?: string | null
  consumed_by_user_id?: number | null
  revoked_at?: string | null
  revoked_by_user_id?: number | null
}

export type InvitationEvent = {
  id: string
  event_type: string
  actor_user_id: number | null
  created_at: string | null
  ip_address?: string | null
  user_agent?: string | null
  metadata?: Record<string, any>
}

export const invitationLinksService = {
  async adminCreateInvite(params: { invitee_type: InviteeType; expires_in_days?: number }) {
    const res = await api.post('/admin/invitations', params)
    return res.data as { success: boolean; invite?: InvitationLink; signed_url?: string; message?: string; retry_after?: number }
  },

  async adminListInvites(params?: { status?: InviteStatus; invitee_type?: InviteeType }) {
    const res = await api.get('/admin/invitations', { params })
    return res.data as { success: boolean; invites: InvitationLink[]; message?: string }
  },

  async adminRevokeInvite(inviteId: string) {
    const res = await api.post(`/admin/invitations/${inviteId}/revoke`)
    return res.data as { success: boolean; message?: string }
  },

  async adminListEvents(inviteId: string) {
    const res = await api.get(`/admin/invitations/${inviteId}/events`)
    return res.data as { success: boolean; events: InvitationEvent[]; message?: string }
  },

  async validateInvite(inviteId: string, params: { exp: string; sig: string }) {
    const res = await api.get(`/invitations/${inviteId}/validate`, { params })
    return res.data as {
      success: boolean
      invite?: Pick<InvitationLink, 'id' | 'tenant_id' | 'invitee_type' | 'expires_at' | 'status'>
      status?: InviteStatus
      message?: string
    }
  },

  async registerWithInvite(inviteId: string, params: { exp: string; sig: string }, payload: any) {
    const res = await api.post(`/invitations/${inviteId}/register`, payload, { params })
    return res.data as {
      success: boolean
      message?: string
      user?: { id: number; username: string; email: string; role: string }
      access_token?: string
      refresh_token?: string
      tenant?: { id: string }
      status?: InviteStatus
      errors?: string[]
    }
  }
}

