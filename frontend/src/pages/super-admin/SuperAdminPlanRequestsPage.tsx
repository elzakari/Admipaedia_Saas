import React, { useEffect, useMemo, useState } from 'react'
import type { AxiosError } from 'axios'
import { Sparkles } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useToast } from '@/components/ui/use-toast'
import billingService, { SubscriptionChangeRequest } from '@/services/billingService'

export default function SuperAdminPlanRequestsPage() {
  const { t } = useTranslation()
  const { toast } = useToast()
  const [requests, setRequests] = useState<SubscriptionChangeRequest[] | null>(null)
  const [loading, setLoading] = useState(false)

  const [status, setStatus] = useState('pending')

  const [rejectOpen, setRejectOpen] = useState(false)
  const [rejectTarget, setRejectTarget] = useState<SubscriptionChangeRequest | null>(null)
  const [rejectNote, setRejectNote] = useState('')
  const [saving, setSaving] = useState(false)

  const statusVariant = (status?: string | null): 'success' | 'warning' | 'destructive' | 'secondary' | 'outline' => {
    const s = (status || '').toLowerCase()
    if (s === 'approved') return 'success'
    if (s === 'rejected' || s === 'cancelled') return 'destructive'
    if (s === 'pending') return 'warning'
    if (!s) return 'outline'
    return 'secondary'
  }

  async function load() {
    setLoading(true)
    try {
      const res = await billingService.listPlatformSubscriptionChangeRequests({ status: status === 'all' ? undefined : status })
      setRequests(res.requests)
    } catch (err: unknown) {
      const e = err as AxiosError<{ message?: string }>
      toast({ variant: 'destructive', title: t('super_admin.plan_requests.errors.load_failed', 'Failed to load requests'), description: e.response?.data?.message || e.message || t('super_admin.plan_requests.errors.try_again', 'Please try again') })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  const rows = useMemo(() => requests || [], [requests])

  async function onApprove(r: SubscriptionChangeRequest) {
    setSaving(true)
    try {
      await billingService.approveSubscriptionChangeRequest(r.id)
      toast({ title: t('common.approved', 'Approved') })
      await load()
    } catch (err: unknown) {
      const e = err as AxiosError<{ message?: string }>
      toast({ variant: 'destructive', title: t('super_admin.plan_requests.errors.approve_failed', 'Approve failed'), description: e.response?.data?.message || e.message || t('super_admin.plan_requests.errors.try_again', 'Please try again') })
    } finally {
      setSaving(false)
    }
  }

  const openReject = (r: SubscriptionChangeRequest) => {
    setRejectTarget(r)
    setRejectNote('')
    setRejectOpen(true)
  }

  async function onConfirmReject() {
    if (!rejectTarget) return
    setSaving(true)
    try {
      await billingService.rejectSubscriptionChangeRequest(rejectTarget.id, { note: rejectNote || undefined })
      toast({ title: t('common.rejected', 'Rejected') })
      setRejectOpen(false)
      await load()
    } catch (err: unknown) {
      const e = err as AxiosError<{ message?: string }>
      toast({ variant: 'destructive', title: t('super_admin.plan_requests.errors.reject_failed', 'Reject failed'), description: e.response?.data?.message || e.message || t('super_admin.plan_requests.errors.try_again', 'Please try again') })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold">{t('super_admin.plan_requests.title', 'Plan Requests')}</h1>
          <p className="text-sm text-muted-foreground">{t('super_admin.plan_requests.subtitle', 'Approve or reject school downgrade requests.')}</p>
        </div>
      </div>

      <Card className="rounded-2xl">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Sparkles className="h-5 w-5" />
            {t('super_admin.plan_requests.filters.title', 'Filters')}
          </CardTitle>
        </CardHeader>
        <CardContent className="flex items-end gap-3 flex-wrap">
          <div className="space-y-2">
            <Label>{t('super_admin.plan_requests.filters.status', 'Status')}</Label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder={t('super_admin.plan_requests.filters.select_status', 'Select status')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pending">{t('common.pending', 'Pending')}</SelectItem>
                <SelectItem value="approved">{t('common.approved', 'Approved')}</SelectItem>
                <SelectItem value="rejected">{t('common.rejected', 'Rejected')}</SelectItem>
                <SelectItem value="all">{t('common.all', 'All')}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button onClick={() => load()} disabled={loading}>{t('common.apply', 'Apply')}</Button>
        </CardContent>
      </Card>

      <Card className="rounded-2xl">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">{t('super_admin.plan_requests.table.title', 'Requests')}</CardTitle>
          <div className="text-sm text-muted-foreground">{loading ? t('common.loading', 'Loading...') : t('super_admin.plan_requests.table.results', '{{count}} results', { count: rows.length })}</div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('super_admin.plan_requests.table.created', 'Created')}</TableHead>
                <TableHead>{t('super_admin.plan_requests.table.tenant', 'Tenant')}</TableHead>
                <TableHead>{t('super_admin.plan_requests.table.type', 'Type')}</TableHead>
                <TableHead>{t('super_admin.plan_requests.table.plan', 'Plan')}</TableHead>
                <TableHead>{t('super_admin.plan_requests.table.effective', 'Effective')}</TableHead>
                <TableHead>{t('super_admin.plan_requests.table.status', 'Status')}</TableHead>
                <TableHead>{t('common.actions', 'Actions')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r) => (
                <TableRow key={r.id}>
                  <TableCell>{r.created_at ? new Date(r.created_at).toLocaleString() : '—'}</TableCell>
                  <TableCell className="max-w-[220px] truncate">{r.school_id}</TableCell>
                  <TableCell>{r.request_type}</TableCell>
                  <TableCell>{r.requested_plan?.name || r.requested_plan_id}</TableCell>
                  <TableCell>{r.effective_date || '—'}</TableCell>
                  <TableCell>
                    <Badge variant={statusVariant(r.status)}>{r.status}</Badge>
                  </TableCell>
                  <TableCell className="space-x-2">
                    {r.status === 'pending' && r.request_type === 'downgrade' ? (
                      <>
                        <Button size="sm" onClick={() => onApprove(r)} disabled={saving}>{t('common.approved', 'Approved')}</Button>
                        <Button size="sm" variant="destructive" onClick={() => openReject(r)} disabled={saving}>{t('common.rejected', 'Rejected')}</Button>
                      </>
                    ) : (
                      <span className="text-sm text-muted-foreground">—</span>
                    )}
                  </TableCell>
                </TableRow>
              ))}
              {!loading && rows.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-sm text-muted-foreground">{t('super_admin.plan_requests.empty', 'No requests found.')}</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={rejectOpen} onOpenChange={(v) => { setRejectOpen(v); if (!v) setRejectTarget(null) }}>
        <DialogContent className="sm:max-w-[560px]">
          <DialogHeader>
            <DialogTitle>{t('super_admin.plan_requests.reject.title', 'Reject request')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <Label>{t('super_admin.plan_requests.reject.note_optional', 'Note (optional)')}</Label>
            <Input value={rejectNote} onChange={(e) => setRejectNote(e.target.value)} placeholder={t('super_admin.plan_requests.reject.note_placeholder', 'Internal note')} />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setRejectOpen(false)}>{t('common.cancel', 'Cancel')}</Button>
            <Button type="button" variant="destructive" onClick={onConfirmReject} disabled={saving}>
              {saving ? t('super_admin.plan_requests.reject.saving', 'Saving...') : t('common.rejected', 'Rejected')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

