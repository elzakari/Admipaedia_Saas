import { useEffect, useMemo, useState } from 'react'
import type { AxiosError } from 'axios'
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

function statusBadge(status: InviteStatus) {
  if (status === 'active') return <Badge>Active</Badge>
  if (status === 'consumed') return <Badge variant="secondary">Consumed</Badge>
  if (status === 'expired') return <Badge variant="destructive">Expired</Badge>
  return <Badge variant="destructive">Revoked</Badge>
}

export default function AdminInvitationsPage() {
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
        setError(res.message || 'Failed to load invitations')
        setInvites([])
        return
      }
      setInvites(res.invites || [])
    } catch (err: unknown) {
      const e = err as AxiosError<{ message?: string }>
      setError(e.response?.data?.message || e.message || 'Failed to load invitations')
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
        toast({ variant: 'destructive', title: 'Failed to create invite', description: res.message || 'Please try again' })
        return
      }
      if (res.signed_url) setLastUrl(res.signed_url)
      toast({ title: 'Invitation link created', description: 'Copy and share the single-use link.' })
      await loadInvites()
    } catch (err: unknown) {
      const e = err as AxiosError<{ message?: string }>
      const msg = e.response?.data?.message || e.message
      toast({ variant: 'destructive', title: 'Create failed', description: msg })
    } finally {
      setCreating(false)
    }
  }

  async function copyUrl() {
    if (!lastUrl) return
    try {
      await navigator.clipboard.writeText(lastUrl)
      toast({ title: 'Copied', description: 'Invitation link copied to clipboard.' })
    } catch {
      toast({ variant: 'destructive', title: 'Copy failed', description: 'Please copy the link manually.' })
    }
  }

  async function revokeInvite(inviteId: string) {
    const ok = window.confirm('Revoke this invitation link? This cannot be undone.')
    if (!ok) return
    try {
      const res = await invitationLinksService.adminRevokeInvite(inviteId)
      if (!res.success) {
        toast({ variant: 'destructive', title: 'Revoke failed', description: res.message || 'Please try again' })
        return
      }
      toast({ title: 'Invitation revoked' })
      await loadInvites()
    } catch (err: unknown) {
      const e = err as AxiosError<{ message?: string }>
      toast({ variant: 'destructive', title: 'Revoke failed', description: e.response?.data?.message || e.message })
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
        toast({ variant: 'destructive', title: 'Failed to load audit', description: res.message || 'Please try again' })
        return
      }
      setEvents(res.events || [])
    } catch (err: unknown) {
      const e = err as AxiosError<{ message?: string }>
      toast({ variant: 'destructive', title: 'Failed to load audit', description: e.response?.data?.message || e.message })
    } finally {
      setEventsLoading(false)
    }
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Invitations</h1>
        <p className="text-sm text-muted-foreground">Generate signed, single-use registration links for Parents, Teachers, and General users.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Create invite link</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <div className="text-sm font-medium mb-1">Invite type</div>
              <Select value={inviteeType} onValueChange={(v) => setInviteeType(v as InviteeType)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="parent">Parent</SelectItem>
                  <SelectItem value="teacher">Teacher</SelectItem>
                  <SelectItem value="general">General</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <div className="text-sm font-medium mb-1">Expiry (days)</div>
              <Input value={expiresInDays} onChange={(e) => setExpiresInDays(e.target.value)} inputMode="numeric" />
              <div className="text-xs text-muted-foreground mt-1">Default 7 days. Range 1–30.</div>
            </div>
            <div className="flex items-end">
              <Button onClick={createInvite} disabled={creating} className="w-full">
                {creating ? 'Generating…' : 'Generate link'}
              </Button>
            </div>
          </div>

          {lastUrl ? (
            <div className="rounded-lg border bg-background p-4 space-y-2">
              <div className="text-sm font-medium">Signed invitation link</div>
              <div className="flex flex-col md:flex-row gap-2">
                <Input readOnly value={lastUrl} />
                <Button variant="secondary" onClick={copyUrl} className="md:w-40">Copy link</Button>
              </div>
              <div className="text-xs text-muted-foreground">Single-use. The system invalidates it after signup or expiry.</div>
            </div>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-3">
          <CardTitle className="text-base">Invites</CardTitle>
          <div className="flex items-center gap-2">
            <Select value={filterType} onValueChange={(v) => setFilterType(v as InviteeType | 'all')}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All types</SelectItem>
                <SelectItem value="parent">Parent</SelectItem>
                <SelectItem value="teacher">Teacher</SelectItem>
                <SelectItem value="general">General</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterStatus} onValueChange={(v) => setFilterStatus(v as InviteStatus | 'all')}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="consumed">Consumed</SelectItem>
                <SelectItem value="revoked">Revoked</SelectItem>
                <SelectItem value="expired">Expired</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="secondary" onClick={loadInvites} disabled={loading}>Refresh</Button>
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
                  <TableHead>Type</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Expires</TableHead>
                  <TableHead>Consumed</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-sm text-muted-foreground">No invitations found.</TableCell>
                  </TableRow>
                ) : (
                  filtered.map((inv) => (
                    <TableRow key={inv.id}>
                      <TableCell className="capitalize">{inv.invitee_type}</TableCell>
                      <TableCell>{statusBadge(inv.status)}</TableCell>
                      <TableCell>{formatDate(inv.created_at)}</TableCell>
                      <TableCell>{formatDate(inv.expires_at)}</TableCell>
                      <TableCell>{inv.consumed_at ? formatDate(inv.consumed_at) : '—'}</TableCell>
                      <TableCell className="text-right space-x-2">
                        <Button variant="secondary" size="sm" onClick={() => openEvents(inv)}>Audit</Button>
                        <Button variant="destructive" size="sm" disabled={inv.status !== 'active'} onClick={() => revokeInvite(inv.id)}>
                          Revoke
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
            <DialogTitle>Invitation audit</DialogTitle>
            <DialogDescription>
              {selectedInvite ? `${selectedInvite.invitee_type} • ${selectedInvite.status} • ${selectedInvite.id}` : '—'}
            </DialogDescription>
          </DialogHeader>

          {eventsLoading ? (
            <div className="h-32 rounded-lg border bg-background animate-pulse" />
          ) : events.length === 0 ? (
            <div className="text-sm text-muted-foreground">No events recorded.</div>
          ) : (
            <div className="space-y-2">
              {events.map((ev) => (
                <div key={ev.id} className="rounded-lg border p-3">
                  <div className="flex items-center justify-between gap-3">
                    <div className="text-sm font-medium">{ev.event_type}</div>
                    <div className="text-xs text-muted-foreground">{formatDate(ev.created_at)}</div>
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">Actor: {ev.actor_user_id ?? '—'}</div>
                </div>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
