import { useEffect, useMemo, useState } from 'react'
import type { AxiosError } from 'axios'
import { useTranslation } from 'react-i18next'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { useToast } from '@/components/ui/use-toast'
import { invitationLinksService, InvitationEvent, InvitationLink, InviteeType, InviteStatus } from '@/services/invitationLinksService'

function formatDate(iso?: string | null) {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleString()
}

function StatusBadge({ status }: { status: InviteStatus }) {
  const { t } = useTranslation();
  if (status === 'active') return <Badge>{t('admin_invitations.active', 'Active')}</Badge>
  if (status === 'consumed') return <Badge variant="secondary">{t('admin_invitations.consumed', 'Consumed')}</Badge>
  if (status === 'expired') return <Badge variant="destructive">{t('admin_invitations.expired', 'Expired')}</Badge>
  return <Badge variant="destructive">{t('admin_invitations.revoked', 'Revoked')}</Badge>
}

export default function AdminInvitationsPage() {
  const { t } = useTranslation()
  const { toast } = useToast()
  const [inviteeType, setInviteeType] = useState<InviteeType>('parent')
  const [expiresInDays, setExpiresInDays] = useState<string>('7')
  const [creating, setCreating] = useState(false)
  const [lastUrl, setLastUrl] = useState<string | null>(null)

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [invites, setInvites] = useState<InvitationLink[]>([])

  const [selectedInvite, setSelectedInvite] = useState<InvitationLink | null>(null)
  const [eventsOpen, setEventsOpen] = useState(false)
  const [eventsLoading, setEventsLoading] = useState(false)
  const [events, setEvents] = useState<InvitationEvent[]>([])

  const [filterStatus, setFilterStatus] = useState<InviteStatus | 'all'>('all')
  const [filterType, setFilterType] = useState<InviteeType | 'all'>('all')

  const filtered = useMemo(() => {
    return invites.filter((i) => {
      if (filterStatus !== 'all' && i.status !== filterStatus) return false
      if (filterType !== 'all' && i.invitee_type !== filterType) return false
      return true
    })
  }, [invites, filterStatus, filterType])

  async function loadInvites() {
    setLoading(true)
    setError(null)
    try {
      const res = await invitationLinksService.adminListInvites()
      if (!res.success) {
        setError(res.message || t('admin_invitations.failed_load_invitations', 'Failed to load invitations'))
        setInvites([])
        return
      }
      setInvites(res.invites || [])
    } catch (err: unknown) {
      const e = err as AxiosError<{ message?: string }>
      setError(e.response?.data?.message || e.message || t('admin_invitations.failed_load_invitations', 'Failed to load invitations'))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadInvites()
  }, [])

  async function createInvite() {
    setCreating(true)
    try {
      const days = Math.max(1, Math.min(30, Number(expiresInDays || '7')))
      const res = await invitationLinksService.adminCreateInvite({ invitee_type: inviteeType, expires_in_days: days })
      if (!res.success) {
        toast({ variant: 'destructive', title: t('admin_invitations.create_failed', 'Failed to create invite'), description: res.message || t('common.try_again', 'Please try again') })
        return
      }
      if (res.signed_url) setLastUrl(res.signed_url)
      toast({ title: t('admin_invitations.link_created', 'Invitation link created'), description: t('admin_invitations.copy_share_desc', 'Copy and share the single-use link.') })
      await loadInvites()
    } catch (err: unknown) {
      const e = err as AxiosError<{ message?: string }>
      const msg = e.response?.data?.message || e.message
      toast({ variant: 'destructive', title: t('admin_invitations.create_failed_title', 'Create failed'), description: msg })
    } finally {
      setCreating(false)
    }
  }

  async function copyUrl() {
    if (!lastUrl) return
    try {
      await navigator.clipboard.writeText(lastUrl)
      toast({ title: t('common.copied', 'Copied'), description: t('admin_invitations.copied_desc', 'Invitation link copied to clipboard.') })
    } catch {
      toast({ variant: 'destructive', title: t('common.copy_failed', 'Copy failed'), description: t('admin_invitations.copy_manual', 'Please copy the link manually.') })
    }
  }

  async function revokeInvite(inviteId: string) {
    const ok = window.confirm(t('admin_invitations.revoke_confirm', 'Revoke this invitation link? This cannot be undone.'))
    if (!ok) return
    try {
      const res = await invitationLinksService.adminRevokeInvite(inviteId)
      if (!res.success) {
        toast({ variant: 'destructive', title: t('admin_invitations.revoke_failed', 'Revoke failed'), description: res.message || t('common.try_again', 'Please try again') })
        return
      }
      toast({ title: t('admin_invitations.invitation_revoked', 'Invitation revoked') })
      await loadInvites()
    } catch (err: unknown) {
      const e = err as AxiosError<{ message?: string }>
      toast({ variant: 'destructive', title: t('admin_invitations.revoke_failed', 'Revoke failed'), description: e.response?.data?.message || e.message })
    }
  }

  async function openEvents(inv: InvitationLink) {
    setSelectedInvite(inv)
    setEventsOpen(true)
    setEvents([])
    setEventsLoading(true)
    try {
      const res = await invitationLinksService.adminListEvents(inv.id)
      if (!res.success) {
        toast({ variant: 'destructive', title: t('admin_invitations.failed_load_audit', 'Failed to load audit'), description: res.message || t('common.try_again', 'Please try again') })
        return
      }
      setEvents(res.events || [])
    } catch (err: unknown) {
      const e = err as AxiosError<{ message?: string }>
      toast({ variant: 'destructive', title: t('admin_invitations.failed_load_audit', 'Failed to load audit'), description: e.response?.data?.message || e.message })
    } finally {
      setEventsLoading(false)
    }
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">{t('admin_invitations.title', 'User Invitations')}</h1>
        <p className="text-sm text-muted-foreground">{t('admin_invitations.description', 'Generate signed, single-use registration links for Parents, Teachers, and General users.')}</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t('admin_invitations.create_invite_link', 'Create invite link')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <div className="text-sm font-medium mb-1">{t('admin_invitations.invite_type', 'Invite type')}</div>
              <Select value={inviteeType} onValueChange={(v) => setInviteeType(v as InviteeType)}>
                <SelectTrigger>
                  <SelectValue placeholder={t('admin_invitations.select_type', 'Select type')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="parent">{t('admin_invitations.parent', 'Parent')}</SelectItem>
                  <SelectItem value="teacher">{t('admin_invitations.teacher', 'Teacher')}</SelectItem>
                  <SelectItem value="general">{t('admin_invitations.general', 'General')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <div className="text-sm font-medium mb-1">{t('admin_invitations.expiry_days', 'Expiry (days)')}</div>
              <Input value={expiresInDays} onChange={(e) => setExpiresInDays(e.target.value)} inputMode="numeric" />
              <div className="text-xs text-muted-foreground mt-1">{t('admin_invitations.expiry_hint', 'Default 7 days. Range 1–30.')}</div>
            </div>
            <div className="flex items-end">
              <Button onClick={createInvite} disabled={creating} className="w-full">
                {creating ? t('admin_invitations.generating', 'Generating…') : t('admin_invitations.generate_link', 'Generate link')}
              </Button>
            </div>
          </div>

          {lastUrl ? (
            <div className="rounded-lg border bg-background p-4 space-y-2">
              <div className="text-sm font-medium">{t('admin_invitations.signed_link', 'Signed invitation link')}</div>
              <div className="flex flex-col md:flex-row gap-2">
                <Input readOnly value={lastUrl} />
                <Button variant="secondary" onClick={copyUrl} className="md:w-40">{t('admin_invitations.copy_link', 'Copy link')}</Button>
              </div>
              <div className="text-xs text-muted-foreground">{t('admin_invitations.signed_link_hint', 'Single-use. The system invalidates it after signup or expiry.')}</div>
            </div>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-3">
          <CardTitle className="text-base">{t('admin_invitations.invites', 'Invites')}</CardTitle>
          <div className="flex items-center gap-2">
            <Select value={filterType} onValueChange={(v) => setFilterType(v as InviteeType | 'all')}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder={t('admin_invitations.type', 'Type')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('admin_invitations.all_types', 'All types')}</SelectItem>
                <SelectItem value="parent">{t('admin_invitations.parent', 'Parent')}</SelectItem>
                <SelectItem value="teacher">{t('admin_invitations.teacher', 'Teacher')}</SelectItem>
                <SelectItem value="general">{t('admin_invitations.general', 'General')}</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterStatus} onValueChange={(v) => setFilterStatus(v as InviteStatus | 'all')}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder={t('admin_invitations.status', 'Status')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('admin_invitations.all_statuses', 'All statuses')}</SelectItem>
                <SelectItem value="active">{t('admin_invitations.active', 'Active')}</SelectItem>
                <SelectItem value="consumed">{t('admin_invitations.consumed', 'Consumed')}</SelectItem>
                <SelectItem value="revoked">{t('admin_invitations.revoked', 'Revoked')}</SelectItem>
                <SelectItem value="expired">{t('admin_invitations.expired', 'Expired')}</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="secondary" onClick={loadInvites} disabled={loading}>{t('common.refresh', 'Refresh')}</Button>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="h-32 rounded-lg border bg-background animate-pulse" />
          ) : error ? (
            <div className="text-sm text-red-600">{error}</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('admin_invitations.type', 'Type')}</TableHead>
                  <TableHead>{t('admin_invitations.status', 'Status')}</TableHead>
                  <TableHead>{t('admin_invitations.created', 'Created')}</TableHead>
                  <TableHead>{t('admin_invitations.expires', 'Expires')}</TableHead>
                  <TableHead>{t('admin_invitations.consumed', 'Consumed')}</TableHead>
                  <TableHead className="text-right">{t('common.actions', 'Actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-sm text-muted-foreground">{t('admin_invitations.no_invitations', 'No invitations found.')}</TableCell>
                  </TableRow>
                ) : (
                  filtered.map((inv) => (
                    <TableRow key={inv.id}>
                      <TableCell className="capitalize">
                        {inv.invitee_type === 'parent' ? t('admin_invitations.parent', 'Parent') :
                         inv.invitee_type === 'teacher' ? t('admin_invitations.teacher', 'Teacher') :
                         t('admin_invitations.general', 'General')}
                      </TableCell>
                      <TableCell><StatusBadge status={inv.status} /></TableCell>
                      <TableCell>{formatDate(inv.created_at)}</TableCell>
                      <TableCell>{formatDate(inv.expires_at)}</TableCell>
                      <TableCell>{inv.consumed_at ? formatDate(inv.consumed_at) : '—'}</TableCell>
                      <TableCell className="text-right space-x-2">
                        <Button variant="secondary" size="sm" onClick={() => openEvents(inv)}>{t('admin_invitations.audit', 'Audit')}</Button>
                        <Button variant="destructive" size="sm" disabled={inv.status !== 'active'} onClick={() => revokeInvite(inv.id)}>
                          {t('admin_invitations.revoke', 'Revoke')}
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={eventsOpen} onOpenChange={setEventsOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('admin_invitations.invitation_audit', 'Invitation audit')}</DialogTitle>
            <DialogDescription>
              {selectedInvite ? `${selectedInvite.invitee_type === 'parent' ? t('admin_invitations.parent', 'Parent') : selectedInvite.invitee_type === 'teacher' ? t('admin_invitations.teacher', 'Teacher') : t('admin_invitations.general', 'General')} • ${selectedInvite.status} • ${selectedInvite.id}` : '—'}
            </DialogDescription>
          </DialogHeader>

          {eventsLoading ? (
            <div className="h-32 rounded-lg border bg-background animate-pulse" />
          ) : events.length === 0 ? (
            <div className="text-sm text-muted-foreground">{t('admin_invitations.no_events', 'No events recorded.')}</div>
          ) : (
            <div className="space-y-2">
              {events.map((ev) => (
                <div key={ev.id} className="rounded-lg border p-3">
                  <div className="flex items-center justify-between gap-3">
                    <div className="text-sm font-medium">{ev.event_type}</div>
                    <div className="text-xs text-muted-foreground">{formatDate(ev.created_at)}</div>
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">{t('admin_invitations.actor', 'Actor')}: {ev.actor_user_id ?? '—'}</div>
                </div>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
