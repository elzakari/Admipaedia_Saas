import React, { useEffect, useMemo, useState } from 'react'
import type { AxiosError } from 'axios'
import { CreditCard } from 'lucide-react'

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
      toast({ variant: 'destructive', title: 'Failed to load payments', description: e.response?.data?.message || e.message || 'Please try again' })
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
      toast({ title: 'Verified', description: res.payment.status })
      await load()
    } catch (err: unknown) {
      const e = err as AxiosError<{ message?: string }>
      toast({ variant: 'destructive', title: 'Verify failed', description: e.response?.data?.message || e.message || 'Please try again' })
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
      toast({ title: reviewApprove ? 'Approved' : 'Rejected', description: res.payment.status })
      setReviewOpen(false)
      await load()
    } catch (err: unknown) {
      const e = err as AxiosError<{ message?: string }>
      toast({ variant: 'destructive', title: 'Review failed', description: e.response?.data?.message || e.message || 'Please try again' })
    } finally {
      setReviewSaving(false)
    }
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold">Payments</h1>
          <p className="text-sm text-muted-foreground">Monitor gateway payments and approve manual submissions.</p>
        </div>
      </div>

      <Card className="rounded-2xl">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-6 gap-3 items-end">
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger>
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">all</SelectItem>
                  <SelectItem value="pending">pending</SelectItem>
                  <SelectItem value="successful">successful</SelectItem>
                  <SelectItem value="failed">failed</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Gateway</Label>
              <Select value={gateway} onValueChange={setGateway}>
                <SelectTrigger>
                  <SelectValue placeholder="Gateway" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">all</SelectItem>
                  <SelectItem value="paystack">paystack</SelectItem>
                  <SelectItem value="cinetpay">cinetpay</SelectItem>
                  <SelectItem value="flutterwave">flutterwave</SelectItem>
                  <SelectItem value="manual">manual</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Country</Label>
              <Input value={countryCode} onChange={(e) => setCountryCode(e.target.value.toUpperCase())} placeholder="GH" maxLength={2} />
            </div>
            <div className="space-y-2">
              <Label>Tenant ID</Label>
              <Input value={tenantId} onChange={(e) => setTenantId(e.target.value)} placeholder="UUID" />
            </div>
            <div className="space-y-2">
              <Label>Date from</Label>
              <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Date to</Label>
              <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
            </div>
            <div className="md:col-span-6 flex justify-end">
              <Button onClick={() => load()} disabled={loading}>Apply</Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="rounded-2xl">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Payments</CardTitle>
          <div className="text-sm text-muted-foreground">{loading ? 'Loading…' : `${rows.length} results`}</div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Created</TableHead>
                <TableHead>Tenant</TableHead>
                <TableHead>Invoice</TableHead>
                <TableHead>Gateway</TableHead>
                <TableHead>Channel</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead>Action</TableHead>
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
                      <Button size="sm" variant="outline" onClick={() => onVerify(p)}>Verify</Button>
                    )}
                    {String(p.status).toLowerCase() === 'pending' && p.gateway_name === 'manual' && (
                      <>
                        <Button size="sm" onClick={() => openReview(p, true)}>Approve</Button>
                        <Button size="sm" variant="destructive" onClick={() => openReview(p, false)}>Reject</Button>
                      </>
                    )}
                  </TableCell>
                </TableRow>
              ))}
              {!loading && rows.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} className="text-sm text-muted-foreground">No payments found.</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={reviewOpen} onOpenChange={(v) => { setReviewOpen(v); if (!v) setReviewPayment(null) }}>
        <DialogContent className="sm:max-w-[560px]">
          <DialogHeader>
            <DialogTitle>{reviewApprove ? 'Approve manual payment' : 'Reject manual payment'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <Label>Note (optional)</Label>
            <Input value={reviewNote} onChange={(e) => setReviewNote(e.target.value)} placeholder="Internal note" />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setReviewOpen(false)}>Cancel</Button>
            <Button type="button" variant={reviewApprove ? 'default' : 'destructive'} disabled={reviewSaving} onClick={onSaveReview}>
              {reviewSaving ? 'Saving…' : reviewApprove ? 'Approve' : 'Reject'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

