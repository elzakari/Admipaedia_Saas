import React, { useEffect, useState } from 'react'
import type { AxiosError } from 'axios'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useToast } from '@/components/ui/use-toast'
import saasService, { PlatformTenantDetail, TenantServiceTokenSummary } from '@/services/saasService'
import { superAdminService } from '@/services/superAdminService'
import platformPlanContextService from '@/services/platformPlanContextService'

function formatMoney(amount: number, currency: string | null) {
  const code = (currency || 'USD').toUpperCase()
  try {
    return new Intl.NumberFormat(undefined, { style: 'currency', currency: code }).format(amount)
  } catch {
    return `${code} ${amount.toFixed(2)}`
  }
}

function formatIsoDate(iso: string | null | undefined) {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleString()
}

export function PlatformTenantDrawer({
  open,
  tenantId,
  planOptions,
  onOpenChange,
  onChanged
}: {
  open: boolean
  tenantId: string | null
  planOptions: Array<{ value: string; label: string }>
  onOpenChange: (next: boolean) => void
  onChanged: () => Promise<void>
}) {
  const { toast } = useToast()
  const [detail, setDetail] = useState<PlatformTenantDetail | null>(null)
  const [members, setMembers] = useState<Array<{ id: string; user: { id: number; email: string | null; username: string | null }; role: string; status: string; created_at: string | null }> | null>(null)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [nextStatus, setNextStatus] = useState<string>('')
  const [nextPlan, setNextPlan] = useState<string>('')
  const [membersLoading, setMembersLoading] = useState(false)
  const [addEmail, setAddEmail] = useState('')
  const [addRole, setAddRole] = useState('school_admin')
  const [addStatus, setAddStatus] = useState('active')
  const [deletingTenant, setDeletingTenant] = useState(false)
  const [purgeOpen, setPurgeOpen] = useState(false)
  const [purgeExpected, setPurgeExpected] = useState('')
  const [purgeConfirmText, setPurgeConfirmText] = useState('')
  const [purgingTenant, setPurgingTenant] = useState(false)
  const [purgeReasons, setPurgeReasons] = useState<string[]>([])
  const [serviceTokens, setServiceTokens] = useState<TenantServiceTokenSummary[] | null>(null)
  const [tokensLoading, setTokensLoading] = useState(false)
  const [planContext, setPlanContext] = useState<any | null>(null)
  const [planContextLoading, setPlanContextLoading] = useState(false)
  const [tab, setTab] = useState<string>('overview')

  async function load() {
    if (!tenantId) return
    setLoading(true)
    try {
      const res = await saasService.platformGetTenantDetail(tenantId)
      setDetail(res.detail)
      setNextStatus(res.detail.tenant.status || '')
      setNextPlan(res.detail.tenant.plan || '')
    } catch (err: unknown) {
      const e = err as AxiosError<{ message?: string }>
      toast({
        variant: 'destructive',
        title: 'Failed to load school detail',
        description: e.response?.data?.message || e.message || 'Please try again'
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (open) setTab('overview')
  }, [open, tenantId])

  async function loadMembers() {
    if (!tenantId) return
    setMembersLoading(true)
    try {
      const res = await saasService.platformListMembers(tenantId)
      setMembers(res.members)
    } catch (err: unknown) {
      const e = err as AxiosError<{ message?: string }>
      toast({
        variant: 'destructive',
        title: 'Failed to load members',
        description: e.response?.data?.message || e.message || 'Please try again'
      })
    } finally {
      setMembersLoading(false)
    }
  }

  async function loadTokens() {
    if (!tenantId) return
    setTokensLoading(true)
    try {
      const res = await saasService.platformListServiceTokens(tenantId)
      setServiceTokens(res.tokens)
    } catch (e) {
      void e
    } finally {
      setTokensLoading(false)
    }
  }

  async function loadPlanContext() {
    if (!tenantId) return
    setPlanContextLoading(true)
    try {
      const res = await platformPlanContextService.getTenantPlanContext(tenantId)
      setPlanContext(res)
    } catch (e) {
      void e
      setPlanContext(null)
    } finally {
      setPlanContextLoading(false)
    }
  }

  useEffect(() => {
    if (open) {
      load()
      loadMembers()
      loadTokens()
      loadPlanContext()
    } else {
      setDetail(null)
      setMembers(null)
      setServiceTokens(null)
      setNextStatus('')
      setNextPlan('')
      setAddEmail('')
      setAddRole('school_admin')
      setAddStatus('active')
      setPlanContext(null)
    }
  }, [open, tenantId])

  async function save() {
    if (!tenantId) return
    setSaving(true)
    try {
      await saasService.platformUpdateTenant(tenantId, {
        status: nextStatus || undefined,
        plan: nextPlan || undefined
      })
      toast({ title: 'Updated school settings' })
      await onChanged()
      await load()
    } catch (err: unknown) {
      const e = err as AxiosError<{ message?: string }>
      toast({
        variant: 'destructive',
        title: 'Update failed',
        description: e.response?.data?.message || e.message || 'Please try again'
      })
    } finally {
      setSaving(false)
    }
  }

  const tenant = detail?.tenant
  const planSlug = planContext?.plan?.slug || tenant?.plan || '—'
  const tenantSlugOrId = (tenant?.slug || tenantId || '').trim()
  const currentStatus = tenant?.status || ''
  const currentPlan = tenant?.plan || ''
  const hasChanges = Boolean(tenantId && ((nextStatus && nextStatus !== currentStatus) || (nextPlan && nextPlan !== currentPlan)))

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="h-[90vh] w-[calc(100%-2rem)] max-w-3xl overflow-hidden bg-white text-slate-900 p-0 sm:w-[48rem]">
        <Dialog
          open={purgeOpen}
          onOpenChange={(v) => {
            setPurgeOpen(v)
            if (!v) {
              setPurgeConfirmText('')
              setPurgeExpected('')
              setPurgeReasons([])
            }
          }}
        >
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Delete school</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <div className="text-sm text-slate-600">
                This is a permanent action. Type the confirmation text exactly to proceed.
              </div>
              {purgeReasons.length ? (
                <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
                  {purgeReasons.join(', ')}
                </div>
              ) : null}
              <div className="text-sm">
                Confirmation text: <span className="font-mono">{purgeExpected}</span>
              </div>
              <Input value={purgeConfirmText} onChange={(e) => setPurgeConfirmText(e.target.value)} />
              <div className="flex items-center justify-end gap-2 pt-2">
                <Button variant="outline" onClick={() => setPurgeOpen(false)} disabled={purgingTenant}>
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  disabled={!purgeExpected || purgingTenant || purgeConfirmText.trim() !== purgeExpected || purgeReasons.length > 0}
                  onClick={async () => {
                    if (!tenantId) return
                    try {
                      setPurgingTenant(true)
                      await superAdminService.purgeTenant(tenantId, purgeConfirmText.trim())
                      toast({ title: 'School deleted' })
                      setPurgeOpen(false)
                      onOpenChange(false)
                      await onChanged()
                    } catch (err: unknown) {
                      const e = err as AxiosError<any>
                      const data = e.response?.data
                      const expected = data?.expected
                      const status = data?.status
                      const statusReasons = Array.isArray(status?.reasons) ? status.reasons : []
                      const referenceReasons = Array.isArray(status?.references)
                        ? status.references.map((ref: { table?: string; count?: number }) => {
                            const table = ref?.table || 'unknown_table'
                            const count = typeof ref?.count === 'number' ? ref.count : null
                            return count !== null
                              ? `Still referenced by ${table} (${count})`
                              : `Still referenced by ${table}`
                          })
                        : []
                      const failedTableReason = status?.failed_table ? [`Failed while deleting ${status.failed_table}`] : []
                      const nextReasons = [...statusReasons, ...referenceReasons, ...failedTableReason]
                      if (nextReasons.length) {
                        setPurgeReasons(nextReasons)
                      }
                      if (expected) {
                        setPurgeExpected(expected)
                      }
                      toast({
                        variant: 'destructive',
                        title: 'Delete failed',
                        description: data?.error
                          || nextReasons.join(', ')
                          || (expected ? `Confirmation text: ${expected}` : null)
                          || data?.message
                          || e.message
                          || 'Please try again'
                      })
                    } finally {
                      setPurgingTenant(false)
                    }
                  }}
                >
                  {purgingTenant ? 'Deleting...' : 'Delete permanently'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        <div className="flex h-full flex-col">
          <div className="sticky top-0 z-10 border-b border-slate-200 bg-white px-6 pt-6 pb-4">
            <DialogHeader className="p-0">
              <DialogTitle className="text-lg font-black text-slate-900 truncate">
                {loading ? 'Loading…' : (tenant?.name || 'School detail')}
              </DialogTitle>
              <div className="flex items-center justify-between gap-3">
                <div className="text-xs text-slate-500 truncate min-w-0">
                  {tenant?.slug ? `${tenant.slug} • ` : ''}{tenant?.country_code || '—'} • {tenant?.id || '—'}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Badge variant="outline" className="border-slate-200">{tenant?.status || '—'}</Badge>
                  <Badge className="bg-slate-900 text-white hover:bg-slate-900">{planSlug}</Badge>
                </div>
              </div>
            </DialogHeader>
          </div>

          <div className="flex-1 overflow-auto px-6 pb-6">
            <Tabs value={tab} onValueChange={setTab} className="space-y-4">
              <div className="sticky top-0 z-10 bg-white pt-4">
                <TabsList className="w-full justify-start border border-slate-200 bg-white">
                  <TabsTrigger value="overview">Overview</TabsTrigger>
                  <TabsTrigger value="team">Team</TabsTrigger>
                  <TabsTrigger value="billing">Billing</TabsTrigger>
                  <TabsTrigger value="tokens">Tokens</TabsTrigger>
                  <TabsTrigger value="danger">Danger</TabsTrigger>
                </TabsList>
              </div>

              <TabsContent value="overview" className="space-y-6 mt-0">
                <Card className="border-slate-200 rounded-2xl">
                  <CardContent className="pt-6 space-y-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="text-xs text-slate-500">
                        Created: {formatIsoDate(tenant?.created_at)}
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          className="bg-white"
                          disabled={!tenant?.id}
                          onClick={async () => {
                            if (!tenant?.id) return
                            try {
                              await navigator.clipboard.writeText(String(tenant.id))
                              toast({ title: 'Copied school ID' })
                            } catch {
                              toast({ variant: 'destructive', title: 'Copy failed', description: 'Please copy manually' })
                            }
                          }}
                        >
                          Copy ID
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="bg-white"
                          disabled={!tenant?.slug}
                          onClick={async () => {
                            if (!tenant?.slug) return
                            try {
                              await navigator.clipboard.writeText(String(tenant.slug))
                              toast({ title: 'Copied slug' })
                            } catch {
                              toast({ variant: 'destructive', title: 'Copy failed', description: 'Please copy manually' })
                            }
                          }}
                        >
                          Copy slug
                        </Button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div className="rounded-xl border border-slate-200 p-3">
                        <div className="text-xs text-slate-500">Members</div>
                        <div className="text-lg font-black text-slate-900">{detail ? detail.members_count : '—'}</div>
                      </div>
                      <div className="rounded-xl border border-slate-200 p-3">
                        <div className="text-xs text-slate-500">Invoiced</div>
                        <div className="text-lg font-black text-slate-900">{detail ? formatMoney(detail.invoice_total, tenant?.currency || 'USD') : '—'}</div>
                      </div>
                      <div className="rounded-xl border border-slate-200 p-3">
                        <div className="text-xs text-slate-500">Outstanding</div>
                        <div className="text-lg font-black text-slate-900">{detail ? formatMoney(detail.outstanding_total, tenant?.currency || 'USD') : '—'}</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-slate-200 rounded-2xl">
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between gap-3">
                      <CardTitle className="text-sm font-semibold text-slate-800">Actions</CardTitle>
                      {hasChanges ? <Badge variant="outline" className="border-amber-200 text-amber-700">Unsaved changes</Badge> : null}
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="space-y-2">
                        <Label>Status</Label>
                        <Select value={nextStatus} onValueChange={setNextStatus}>
                          <SelectTrigger className="bg-white"><SelectValue placeholder="Select" /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="active">active</SelectItem>
                            <SelectItem value="trial">trial</SelectItem>
                            <SelectItem value="suspended">suspended</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Plan</Label>
                        <Select value={nextPlan} onValueChange={setNextPlan}>
                          <SelectTrigger className="bg-white"><SelectValue placeholder="Select" /></SelectTrigger>
                          <SelectContent>
                            {planOptions.map((plan) => (
                              <SelectItem key={plan.value} value={plan.value}>{plan.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <Button
                        variant="outline"
                        className="bg-white"
                        disabled={saving || !tenantId || nextStatus === 'active'}
                        onClick={() => setNextStatus('active')}
                      >
                        Activate school
                      </Button>
                      <Button
                        variant="outline"
                        className="bg-white"
                        disabled={saving || !tenantId || nextStatus === 'suspended'}
                        onClick={() => setNextStatus('suspended')}
                      >
                        Suspend
                      </Button>
                      <Button disabled={saving || loading || !hasChanges} onClick={save}>
                        {saving ? 'Saving…' : 'Save changes'}
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-slate-200 rounded-2xl">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-semibold text-slate-800">Plan context</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {planContextLoading ? (
                      <div className="text-sm text-slate-500 animate-pulse">Loading…</div>
                    ) : planContext ? (
                      <>
                        <div className="text-sm text-slate-700">
                          <span className="font-semibold text-slate-900">{planContext.plan?.name || '—'}</span>
                          <span className="text-slate-500"> ({planContext.plan?.slug || '—'})</span>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          {Object.entries(planContext.token_usage || {}).map(([k, v]: any) => (
                            <div key={k} className="rounded-xl border border-slate-200 p-3">
                              <div className="text-xs text-slate-500">{k}</div>
                              <div className="text-sm font-semibold text-slate-900 tabular-nums">
                                {v?.unlimited ? 'Unlimited' : `${v?.remaining ?? 0} left`}
                              </div>
                              <div className="text-xs text-slate-500">Used: {v?.used ?? 0}</div>
                            </div>
                          ))}
                        </div>
                      </>
                    ) : (
                      <div className="text-sm text-slate-500">No plan context available.</div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="team" className="space-y-6 mt-0">
                <Card className="border-slate-200 rounded-2xl">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-semibold text-slate-800">School admins & team</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-end">
                  <div className="flex-1 min-w-0 space-y-2">
                    <Label>Email</Label>
                    <Input
                      value={addEmail}
                      onChange={(e) => setAddEmail(e.target.value)}
                      placeholder="admin@school.com"
                      className="bg-white w-full"
                    />
                  </div>
                  <div className="w-full lg:w-52 space-y-2">
                    <Label>Role</Label>
                    <Select value={addRole} onValueChange={setAddRole}>
                      <SelectTrigger className="bg-white"><SelectValue placeholder="Select" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="school_admin">school_admin</SelectItem>
                        <SelectItem value="school_finance">school_finance</SelectItem>
                        <SelectItem value="school_staff_readonly">school_staff_readonly</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="w-full lg:w-52 space-y-2">
                    <Label>Status</Label>
                    <Select value={addStatus} onValueChange={setAddStatus}>
                      <SelectTrigger className="bg-white"><SelectValue placeholder="Select" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="active">active</SelectItem>
                        <SelectItem value="suspended">suspended</SelectItem>
                        <SelectItem value="revoked">revoked</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <Button
                    className="w-full lg:w-auto"
                    disabled={!tenantId || membersLoading || addEmail.trim().length === 0}
                    onClick={async () => {
                      if (!tenantId) return
                      try {
                        await saasService.platformUpsertMember(tenantId, {
                          email: addEmail.trim(),
                          role: addRole,
                          status: addStatus
                        })
                        toast({ title: 'Member updated' })
                        setAddEmail('')
                        await loadMembers()
                        await load()
                      } catch (err: unknown) {
                        const e = err as AxiosError<{ message?: string }>
                        toast({
                          variant: 'destructive',
                          title: 'Member update failed',
                          description: e.response?.data?.message || e.message || 'Please try again'
                        })
                      }
                    }}
                  >
                    Add / Update
                  </Button>
                </div>

                <div className="flex items-center justify-between">
                  <div className="text-xs text-slate-500">{membersLoading ? 'Loading members…' : `Members: ${members?.length ?? 0}`}</div>
                  <Button variant="outline" className="bg-white" onClick={loadMembers} disabled={membersLoading || !tenantId}>
                    Refresh
                  </Button>
                </div>

                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>User</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(members || []).map((m) => (
                      <TableRow key={m.id}>
                        <TableCell className="min-w-0">
                          <div className="font-medium text-slate-900 truncate">{m.user.email || m.user.username || `User #${m.user.id}`}</div>
                          <div className="text-xs text-slate-500 truncate">{m.user.username || '—'} • {m.user.id}</div>
                        </TableCell>
                        <TableCell className="w-[220px]">
                          <Select
                            value={m.role}
                            onValueChange={(v) => {
                              setMembers((prev) => (prev || []).map((x) => (x.id === m.id ? { ...x, role: v } : x)))
                            }}
                          >
                            <SelectTrigger className="bg-white"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="school_admin">school_admin</SelectItem>
                              <SelectItem value="school_finance">school_finance</SelectItem>
                              <SelectItem value="school_staff_readonly">school_staff_readonly</SelectItem>
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell className="w-[220px]">
                          <Select
                            value={m.status}
                            onValueChange={(v) => {
                              setMembers((prev) => (prev || []).map((x) => (x.id === m.id ? { ...x, status: v } : x)))
                            }}
                          >
                            <SelectTrigger className="bg-white"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="active">active</SelectItem>
                              <SelectItem value="suspended">suspended</SelectItem>
                              <SelectItem value="revoked">revoked</SelectItem>
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              variant="outline"
                              className="bg-white"
                              disabled={!tenantId || membersLoading}
                              onClick={async () => {
                                if (!tenantId) return
                                try {
                                  await saasService.platformUpdateMembership(tenantId, m.id, { role: m.role, status: m.status })
                                  toast({ title: 'Member saved' })
                                  await loadMembers()
                                  await load()
                                } catch (err: unknown) {
                                  const e = err as AxiosError<{ message?: string }>
                                  toast({
                                    variant: 'destructive',
                                    title: 'Save failed',
                                    description: e.response?.data?.message || e.message || 'Please try again'
                                  })
                                }
                              }}
                            >
                              Save
                            </Button>
                            <Button
                              variant="destructive"
                              disabled={!tenantId || membersLoading}
                              onClick={async () => {
                                if (!tenantId) return
                                try {
                                  await saasService.platformDeleteMembership(tenantId, m.id)
                                  toast({ title: 'Member removed' })
                                  await loadMembers()
                                  await load()
                                } catch (err: unknown) {
                                  const e = err as AxiosError<{ message?: string }>
                                  toast({
                                    variant: 'destructive',
                                    title: 'Remove failed',
                                    description: e.response?.data?.message || e.message || 'Please try again'
                                  })
                                }
                              }}
                            >
                              Remove
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                    {!membersLoading && (members || []).length === 0 && (
                      <TableRow>
                        <TableCell colSpan={4} className="text-sm text-slate-600">No members found.</TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
              </TabsContent>

              <TabsContent value="billing" className="space-y-6 mt-0">
                <Card className="border-slate-200 rounded-2xl">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-semibold text-slate-800">Recent invoices</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Invoice</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead className="text-right">Amount</TableHead>
                          <TableHead className="text-right">Issued</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {(detail?.recent_invoices || []).map((i) => (
                          <TableRow key={i.id}>
                            <TableCell className="font-medium text-slate-900">{i.invoice_number}</TableCell>
                            <TableCell><Badge variant="outline" className="border-slate-200">{i.status}</Badge></TableCell>
                            <TableCell className="text-right">{formatMoney(i.amount, i.currency)}</TableCell>
                            <TableCell className="text-right text-xs text-slate-600">{i.issued_on}</TableCell>
                          </TableRow>
                        ))}
                        {!loading && (detail?.recent_invoices || []).length === 0 && (
                          <TableRow>
                            <TableCell colSpan={4} className="text-sm text-slate-600">No invoices yet.</TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>

                <Card className="border-slate-200 rounded-2xl">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-semibold text-slate-800">Recent payments</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Paid on</TableHead>
                          <TableHead>Method</TableHead>
                          <TableHead className="text-right">Amount</TableHead>
                          <TableHead>Reference</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {(detail?.recent_payments || []).map((p) => (
                          <TableRow key={p.id}>
                            <TableCell className="text-xs text-slate-700">{p.paid_on}</TableCell>
                            <TableCell className="text-xs text-slate-700">{p.method || '—'}</TableCell>
                            <TableCell className="text-right">{formatMoney(p.amount, p.currency)}</TableCell>
                            <TableCell className="text-xs text-slate-600 truncate max-w-[12rem]">{p.reference || '—'}</TableCell>
                          </TableRow>
                        ))}
                        {!loading && (detail?.recent_payments || []).length === 0 && (
                          <TableRow>
                            <TableCell colSpan={4} className="text-sm text-slate-600">No payments yet.</TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>

                <Card className="border-slate-200 rounded-2xl">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-semibold text-slate-800">Billing totals</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600">
                      Totals below blend legacy platform billing with the active school subscription billing service. Recent invoice and payment tables remain legacy records for now.
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="rounded-xl border border-slate-200 p-3">
                        <div className="text-xs text-slate-500">Legacy platform invoiced</div>
                        <div className="text-lg font-black text-slate-900">{detail ? formatMoney(detail.legacy_invoice_total || 0, tenant?.currency || 'USD') : '—'}</div>
                      </div>
                      <div className="rounded-xl border border-slate-200 p-3">
                        <div className="text-xs text-slate-500">Legacy platform paid</div>
                        <div className="text-lg font-black text-slate-900">{detail ? formatMoney(detail.legacy_payment_total || 0, tenant?.currency || 'USD') : '—'}</div>
                      </div>
                      <div className="rounded-xl border border-slate-200 p-3">
                        <div className="text-xs text-slate-500">School subscription invoiced</div>
                        <div className="text-lg font-black text-slate-900">{detail ? formatMoney(detail.school_billing_invoice_total || 0, tenant?.currency || 'USD') : '—'}</div>
                      </div>
                      <div className="rounded-xl border border-slate-200 p-3">
                        <div className="text-xs text-slate-500">School subscription paid</div>
                        <div className="text-lg font-black text-slate-900">{detail ? formatMoney(detail.school_billing_payment_total || 0, tenant?.currency || 'USD') : '—'}</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="tokens" className="space-y-6 mt-0">
                <Card className="border-slate-200 rounded-2xl">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-semibold text-slate-800">Service tokens</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-center justify-between gap-3 flex-wrap">
                      <div className="text-xs text-slate-500">{tokensLoading ? 'Loading tokens…' : `Tokens: ${serviceTokens?.length ?? 0}`}</div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          className="bg-white"
                          onClick={loadTokens}
                          disabled={tokensLoading || !tenantId}
                        >
                          Refresh
                        </Button>
                        <Button
                          onClick={async () => {
                            if (!tenantId) return
                            try {
                              const res = await saasService.platformProvisionServiceTokens(tenantId)
                              toast({
                                title: 'Tokens provisioned',
                                description: Object.entries(res.issued || {})
                                  .filter(([, v]) => Boolean(v))
                                  .map(([k]) => k)
                                  .join(', ') || 'No new tokens created'
                              })
                              await loadTokens()
                            } catch (err: unknown) {
                              const e = err as AxiosError<{ message?: string }>
                              toast({
                                variant: 'destructive',
                                title: 'Provision failed',
                                description: e.response?.data?.message || e.message || 'Please try again'
                              })
                            }
                          }}
                          disabled={tokensLoading || !tenantId}
                        >
                          Provision
                        </Button>
                      </div>
                    </div>

                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Service</TableHead>
                          <TableHead>Allowance</TableHead>
                          <TableHead>Used</TableHead>
                          <TableHead>Remaining</TableHead>
                          <TableHead>Token</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {(serviceTokens || []).map((t) => (
                          <TableRow key={t.id}>
                            <TableCell className="font-medium">{t.service_type}</TableCell>
                            <TableCell>{t.unlimited ? 'unlimited' : (t.monthly_allowance || '0')}</TableCell>
                            <TableCell>{t.used}</TableCell>
                            <TableCell>{t.unlimited ? '—' : (t.remaining ?? 0)}</TableCell>
                            <TableCell className="text-xs text-slate-500">•••• {t.token_last4}</TableCell>
                            <TableCell className="text-right">
                              <Button
                                variant="outline"
                                className="bg-white"
                                onClick={async () => {
                                  if (!tenantId) return
                                  try {
                                    const res = await saasService.platformRotateServiceToken(tenantId, t.service_type)
                                    await navigator.clipboard.writeText(res.token)
                                    toast({ title: `Rotated ${t.service_type} token`, description: 'Copied new token to clipboard' })
                                    await loadTokens()
                                  } catch (err: unknown) {
                                    const e = err as AxiosError<{ message?: string }>
                                    toast({
                                      variant: 'destructive',
                                      title: 'Rotation failed',
                                      description: e.response?.data?.message || e.message || 'Please try again'
                                    })
                                  }
                                }}
                              >
                                Rotate & Copy
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                        {!tokensLoading && (serviceTokens || []).length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={6} className="text-sm text-slate-500">
                              No tokens found. Use Provision to generate plan-based service tokens.
                            </TableCell>
                          </TableRow>
                        ) : null}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="danger" className="space-y-6 mt-0">
                <Card className="border-red-200 rounded-2xl">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-semibold text-red-700">Danger zone</CardTitle>
                  </CardHeader>
                  <CardContent className="flex items-center justify-between gap-3 flex-wrap">
                    <div>
                      <div className="text-sm font-medium text-slate-900">Delete school permanently</div>
                      <div className="text-xs text-slate-600">Requires a secure typed confirmation. If the school has students, suspend it first.</div>
                    </div>
                    <Button
                      variant="destructive"
                      disabled={!tenantId || deletingTenant}
                      onClick={async () => {
                        if (!tenantId) return
                        try {
                          setDeletingTenant(true)
                          const statusRes = await superAdminService.getTenantPurgeStatus(tenantId)
                          const slug = statusRes.status.tenant?.slug || tenantSlugOrId || tenantId
                          const expected = `DELETE ${slug}`
                          setPurgeExpected(expected)
                          setPurgeConfirmText('')
                          setPurgeReasons(statusRes.status.can_delete ? [] : (statusRes.status.reasons || []))
                          setPurgeOpen(true)
                        } catch (err: unknown) {
                          const e = err as AxiosError<{ message?: string }>
                          toast({
                            variant: 'destructive',
                            title: 'Delete failed',
                            description: e.response?.data?.message || e.message || 'Please try again'
                          })
                        } finally {
                          setDeletingTenant(false)
                        }
                      }}
                    >
                      Delete
                    </Button>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
