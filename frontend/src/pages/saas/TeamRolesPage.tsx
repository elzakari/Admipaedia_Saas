import React, { useEffect, useMemo, useState } from 'react'
import { Copy, MailPlus } from 'lucide-react'
import type { AxiosError } from 'axios'

import { SaasShell, schoolNav } from './SaasShell'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/components/ui/use-toast'
import { useSaasTenant } from '@/hooks/useSaasTenant'
import saasService, { Invitation, TenantMember } from '@/services/saasService'

export default function TeamRolesPage() {
  const { toast } = useToast()
  const { currentTenantId } = useSaasTenant()
  const [members, setMembers] = useState<TenantMember[] | null>(null)
  const [loading, setLoading] = useState(false)

  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState('school_staff_readonly')
  const [creatingInvite, setCreatingInvite] = useState(false)
  const [lastInvite, setLastInvite] = useState<Invitation | null>(null)

  async function loadMembers() {
    if (!currentTenantId) return
    setLoading(true)
    try {
      const res = await saasService.listMembers(currentTenantId)
      setMembers(res.members)
    } catch (err: unknown) {
      const e = err as AxiosError<{ message?: string }>
      toast({
        variant: 'destructive',
        title: 'Failed to load team',
        description: e.response?.data?.message || e.message || 'Please try again'
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadMembers()
  }, [currentTenantId])

  const canInvite = useMemo(() => !!currentTenantId && !!inviteEmail.trim(), [currentTenantId, inviteEmail])

  async function onInvite(e: React.FormEvent) {
    e.preventDefault()
    if (!currentTenantId) return
    setCreatingInvite(true)
    try {
      const res = await saasService.createInvitation(currentTenantId, { email: inviteEmail, role: inviteRole })
      setLastInvite(res.invitation)
      setInviteEmail('')
      toast({ title: 'Invitation created', description: 'Copy the invite token and share it.' })
    } catch (err: unknown) {
      const e = err as AxiosError<{ message?: string }>
      toast({
        variant: 'destructive',
        title: 'Invite failed',
        description: e.response?.data?.message || e.message || 'Please try again'
      })
    } finally {
      setCreatingInvite(false)
      loadMembers()
    }
  }

  async function copyToken() {
    if (!lastInvite?.token) return
    try {
      await navigator.clipboard.writeText(lastInvite.token)
      toast({ title: 'Copied', description: 'Invite token copied to clipboard.' })
    } catch {
      toast({ variant: 'destructive', title: 'Copy failed', description: 'Please copy manually.' })
    }
  }

  return (
    <SaasShell title="Team & Roles" nav={schoolNav} showTenantSwitcher>
      <div className="space-y-6">
        <Card className="rounded-2xl">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <MailPlus className="h-5 w-5" />
              Invite a team member
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={onInvite} className="grid grid-cols-1 md:grid-cols-[1fr_220px_140px] gap-3 items-end">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} placeholder="user@school.com" />
              </div>
              <div className="space-y-2">
                <Label>Role</Label>
                <Select value={inviteRole} onValueChange={setInviteRole}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="school_admin">School Admin</SelectItem>
                    <SelectItem value="school_finance">School Finance</SelectItem>
                    <SelectItem value="school_staff_readonly">Staff (Read-only)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button type="submit" disabled={!canInvite || creatingInvite}>
                {creatingInvite ? 'Creating…' : 'Create invite'}
              </Button>
            </form>

            {lastInvite && (
              <div className="mt-4 rounded-xl border border-border bg-muted/40 p-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-sm font-medium">Invite token</div>
                  <div className="text-xs text-muted-foreground truncate">{lastInvite.token}</div>
                </div>
                <Button type="button" variant="outline" onClick={copyToken}>
                  <Copy className="h-4 w-4 mr-2" />
                  Copy
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="rounded-2xl">
          <CardHeader>
            <CardTitle className="text-base">Members</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(members || []).map((m) => (
                  <TableRow key={m.id}>
                    <TableCell className="min-w-0">
                      <div className="font-medium truncate">{m.user.email || m.user.username || `User #${m.user.id}`}</div>
                      <div className="text-xs text-muted-foreground">ID {m.user.id}</div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{m.role}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={m.status === 'active' ? 'success' : 'secondary'}>{m.status}</Badge>
                    </TableCell>
                  </TableRow>
                ))}
                {!loading && (members || []).length === 0 && (
                  <TableRow>
                    <TableCell colSpan={3} className="text-sm text-muted-foreground">No members found.</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </SaasShell>
  )
}
