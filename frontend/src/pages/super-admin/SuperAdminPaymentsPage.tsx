import React, { useEffect, useMemo, useState } from 'react'
import type { AxiosError } from 'axios'
import { CreditCard } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { useToast } from '@/components/ui/use-toast'
import billingService, { Payment } from '@/services/billingService'

export default function SuperAdminPaymentsPage() {
  const { t } = useTranslation()
  const { toast } = useToast()
  const [payments, setPayments] = useState<Payment[] | null>(null)
  const [loading, setLoading] = useState(false)

  const [status, setStatus] = useState('all')
  const [gateway, setGateway] = useState('all')
  const [countryCode, setCountryCode] = useState('')
  const [tenantId, setTenantId] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')

  const [reviewOpen, setReviewOpen] = useState(false)
  const [reviewPayment, setReviewPayment] = useState<Payment | null>(null)
  const [reviewApprove, setReviewApprove] = useState(true)
  const [reviewNote, setReviewNote] = useState('')
  const [reviewSaving, setReviewSaving] = useState(false)

  const statusVariant = (status?: string | null): 'success' | 'warning' | 'destructive' | 'secondary' | 'outline' => {
    const s = (status || '').toLowerCase()
    if (s === 'successful') return 'success'
    if (s === 'failed' || s === 'cancelled' || s === 'refunded') return 'destructive'
    if (s === 'pending') return 'warning'
    if (!s) return 'outline'
    return 'secondary'
  }

  async function load() {
    setLoading(true)
    try {
      const res = await billingService.listPlatformPayments({
        status: status === 'all' ? undefined : status,
        gateway: gateway === 'all' ? undefined : gateway,
        country_code: countryCode.trim() || undefined,
        tenant_id: tenantId.trim() || undefined,
        date_from: dateFrom || undefined,
        date_to: dateTo || undefined
      })
      setPayments(res.payments)
    } catch (err: unknown) {
      const e = err as AxiosError<{ message?: string }>
      toast({ variant: 'destructive', title: t('super_admin.payments.errors.load_failed', 'Failed to load payments'), description: e.response?.data?.message || e.message || t('super_admin.payments.errors.try_again', 'Please try again') })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  const rows = useMemo(() => payments || [], [payments])

  async function onVerify(p: Payment) {
    try {
      const res = await billingService.verifyPlatformPayment(p.id)
      toast({ title: t('super_admin.payments.toasts.verified', 'Verified'), description: res.payment.status })
      await load()
    } catch (err: unknown) {
      const e = err as AxiosError<{ message?: string }>
      toast({ variant: 'destructive', title: t('super_admin.payments.errors.verify_failed', 'Verify failed'), description: e.response?.data?.message || e.message || t('super_admin.payments.errors.try_again', 'Please try again') })
    }
  }

  const openReview = (p: Payment, approve: boolean) => {
    setReviewPayment(p)
    setReviewApprove(approve)
    setReviewNote('')
    setReviewOpen(true)
  }

  async function onSaveReview() {
    if (!reviewPayment) return
    setReviewSaving(true)
    try {
      const res = await billingService.reviewManualPayment(reviewPayment.id, { approve: reviewApprove, note: reviewNote || undefined })
      toast({ title: reviewApprove ? t('common.approved', 'Approved') : t('common.rejected', 'Rejected'), description: res.payment.status })
      setReviewOpen(false)
      await load()
    } catch (err: unknown) {
      const e = err as AxiosError<{ message?: string }>
      toast({ variant: 'destructive', title: t('super_admin.payments.errors.review_failed', 'Review failed'), description: e.response?.data?.message || e.message || t('super_admin.payments.errors.try_again', 'Please try again') })
    } finally {
      setReviewSaving(false)
    }
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold">{t('super_admin.payments.title', 'Payments')}</h1>
          <p className="text-sm text-muted-foreground">{t('super_admin.payments.subtitle', 'Monitor gateway payments and approve manual submissions.')}</p>
        </div>
      </div>

      <Card className="rounded-2xl">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            {t('super_admin.payments.filters.title', 'Filters')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3 items-end">
            <div className="space-y-2">
              <Label>{t('super_admin.payments.filters.status', 'Status')}</Label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger>
                  <SelectValue placeholder={t('super_admin.payments.filters.status', 'Status')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('common.all', 'All')}</SelectItem>
                  <SelectItem value="pending">{t('common.pending', 'Pending')}</SelectItem>
                  <SelectItem value="successful">{t('super_admin.payments.status.successful', 'Successful')}</SelectItem>
                  <SelectItem value="failed">{t('super_admin.payments.status.failed', 'Failed')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>{t('super_admin.payments.filters.gateway', 'Gateway')}</Label>
              <Select value={gateway} onValueChange={setGateway}>
                <SelectTrigger>
                  <SelectValue placeholder={t('super_admin.payments.filters.gateway', 'Gateway')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('common.all', 'All')}</SelectItem>
                  <SelectItem value="paystack">paystack</SelectItem>
                  <SelectItem value="cinetpay">cinetpay</SelectItem>
                  <SelectItem value="flutterwave">flutterwave</SelectItem>
                  <SelectItem value="manual">manual</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>{t('super_admin.payments.filters.country', 'Country')}</Label>
              <Input value={countryCode} onChange={(e) => setCountryCode(e.target.value.toUpperCase())} placeholder="GH" maxLength={2} />
            </div>
            <div className="space-y-2">
              <Label>{t('super_admin.payments.filters.tenant_id', 'Tenant ID')}</Label>
              <Input value={tenantId} onChange={(e) => setTenantId(e.target.value)} placeholder={t('super_admin.payments.filters.tenant_id_placeholder', 'UUID')} />
            </div>
            <div className="space-y-2">
              <Label>{t('super_admin.payments.filters.date_from', 'Date from')}</Label>
              <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>{t('super_admin.payments.filters.date_to', 'Date to')}</Label>
              <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
            </div>
            <div className="sm:col-span-2 lg:col-span-3 xl:col-span-6 flex justify-end">
              <Button onClick={() => load()} disabled={loading}>{t('common.apply', 'Apply')}</Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="rounded-2xl">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">{t('super_admin.payments.table.title', 'Payments')}</CardTitle>
          <div className="text-sm text-muted-foreground">{loading ? t('common.loading', 'Loading...') : t('super_admin.payments.table.results', '{{count}} results', { count: rows.length })}</div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('super_admin.payments.table.created', 'Created')}</TableHead>
                <TableHead>{t('super_admin.payments.table.tenant', 'Tenant')}</TableHead>
                <TableHead>{t('super_admin.payments.table.invoice', 'Invoice')}</TableHead>
                <TableHead>{t('super_admin.payments.table.gateway', 'Gateway')}</TableHead>
                <TableHead>{t('super_admin.payments.table.channel', 'Channel')}</TableHead>
                <TableHead>{t('super_admin.payments.table.status', 'Status')}</TableHead>
                <TableHead className="text-right">{t('super_admin.payments.table.amount', 'Amount')}</TableHead>
                <TableHead>{t('common.actions', 'Actions')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((p) => (
                <TableRow key={p.id}>
                  <TableCell>{p.created_at ? new Date(p.created_at).toLocaleString() : '—'}</TableCell>
                  <TableCell className="max-w-[220px] truncate">{p.school_id}</TableCell>
                  <TableCell>{p.invoice_id}</TableCell>
                  <TableCell>{p.gateway_name}</TableCell>
                  <TableCell>{p.payment_channel}</TableCell>
                  <TableCell>
                    <Badge variant={statusVariant(p.status)}>{p.status}</Badge>
                  </TableCell>
                  <TableCell className="text-right tabular-nums">{p.amount.toFixed(2)} {p.currency}</TableCell>
                  <TableCell className="space-x-2">
                    {String(p.status).toLowerCase() === 'pending' && p.gateway_name !== 'manual' && (
                      <Button size="sm" variant="outline" onClick={() => onVerify(p)}>{t('super_admin.payments.actions.verify', 'Verify')}</Button>
                    )}
                    {String(p.status).toLowerCase() === 'pending' && p.gateway_name === 'manual' && (
                      <>
                        <Button size="sm" onClick={() => openReview(p, true)}>{t('common.approved', 'Approved')}</Button>
                        <Button size="sm" variant="destructive" onClick={() => openReview(p, false)}>{t('common.rejected', 'Rejected')}</Button>
                      </>
                    )}
                  </TableCell>
                </TableRow>
              ))}
              {!loading && rows.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} className="text-sm text-muted-foreground">{t('super_admin.payments.empty', 'No payments found.')}</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={reviewOpen} onOpenChange={(v) => { setReviewOpen(v); if (!v) setReviewPayment(null) }}>
        <DialogContent className="sm:max-w-[560px]">
          <DialogHeader>
            <DialogTitle>{reviewApprove ? t('super_admin.payments.review.approve_title', 'Approve manual payment') : t('super_admin.payments.review.reject_title', 'Reject manual payment')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <Label>{t('super_admin.payments.review.note_optional', 'Note (optional)')}</Label>
            <Input value={reviewNote} onChange={(e) => setReviewNote(e.target.value)} placeholder={t('super_admin.payments.review.note_placeholder', 'Internal note')} />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setReviewOpen(false)}>{t('common.cancel', 'Cancel')}</Button>
            <Button type="button" variant={reviewApprove ? 'default' : 'destructive'} disabled={reviewSaving} onClick={onSaveReview}>
              {reviewSaving ? t('super_admin.payments.review.saving', 'Saving...') : reviewApprove ? t('common.approved', 'Approved') : t('common.rejected', 'Rejected')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

