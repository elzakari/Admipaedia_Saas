import React, { useEffect, useMemo, useState } from 'react'
import { CreditCard } from 'lucide-react'
import type { AxiosError } from 'axios'
import { useLocation } from 'react-router-dom'

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
import billingService, { BillingInvoice, Payment } from '@/services/billingService'

export default function BillingPaymentsPage() {
  const { toast } = useToast()
  const { currentTenantId } = useSaasTenant()
  const location = useLocation()

  const [payments, setPayments] = useState<Payment[] | null>(null)
  const [invoices, setInvoices] = useState<BillingInvoice[] | null>(null)
  const [loading, setLoading] = useState(false)

  const [invoiceId, setInvoiceId] = useState<string>('none')
  const [amount, setAmount] = useState('')
  const [method, setMethod] = useState('bank_deposit')
  const [reference, setReference] = useState('')
  const [paidOn, setPaidOn] = useState(() => new Date().toISOString().slice(0, 10))
  const [proof, setProof] = useState<File | null>(null)
  const [submitting, setSubmitting] = useState(false)

  async function loadData() {
    if (!currentTenantId) return
    setLoading(true)
    try {
      const [payRes, invRes] = await Promise.all([billingService.listSchoolPayments(), billingService.listSchoolInvoices()])
      setPayments(payRes.payments)
      setInvoices(invRes.invoices)
    } catch (err: unknown) {
      const e = err as AxiosError<{ message?: string }>
      toast({
        variant: 'destructive',
        title: 'Failed to load billing',
        description: e.response?.data?.message || e.message || 'Please try again'
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [currentTenantId])

  useEffect(() => {
    const params = new URLSearchParams(location.search)
    const fromInvoice = params.get('invoiceId')
    if (fromInvoice) setInvoiceId(fromInvoice)
  }, [location.search])

  const total = useMemo(() => (payments || []).reduce((sum, p) => sum + (p.amount || 0), 0), [payments])

  const statusVariant = (status?: string | null): 'success' | 'warning' | 'destructive' | 'secondary' | 'outline' => {
    const s = (status || '').toLowerCase()
    if (s === 'successful' || s === 'paid') return 'success'
    if (s === 'failed' || s === 'cancelled') return 'destructive'
    if (s === 'pending') return 'warning'
    if (!s) return 'outline'
    return 'secondary'
  }

  async function onSubmitManual(e: React.FormEvent) {
    e.preventDefault()
    if (!currentTenantId) return
    if (!invoiceId || invoiceId === 'none') {
      toast({ variant: 'destructive', title: 'Select an invoice', description: 'Manual payments must be linked to an invoice.' })
      return
    }
    setSubmitting(true)
    try {
      const parsed = Number(amount)
      if (!Number.isFinite(parsed) || parsed <= 0) {
        toast({ variant: 'destructive', title: 'Invalid amount', description: 'Enter a positive number.' })
        return
      }

      const inv = (invoices || []).find((i) => String(i.id) === String(invoiceId))
      const fd = new FormData()
      fd.append('amount', String(parsed))
      fd.append('currency', inv?.currency || 'USD')
      fd.append('method', method)
      if (reference) fd.append('reference', reference)
      if (paidOn) fd.append('paid_at', paidOn)
      if (proof) fd.append('proof', proof)

      await billingService.submitManualPayment(Number(invoiceId), fd)
      setAmount('')
      setMethod('bank_deposit')
      setReference('')
      setProof(null)
      toast({ title: 'Payment submitted', description: 'Awaiting approval.' })
      await loadData()
    } catch (err: unknown) {
      const e = err as AxiosError<{ message?: string }>
      toast({
        variant: 'destructive',
        title: 'Submit payment failed',
        description: e.response?.data?.message || e.message || 'Please try again'
      })
    } finally {
      setSubmitting(false)
    }
  }

  async function onVerify(paymentId: number) {
    if (!currentTenantId) return
    try {
      const res = await billingService.verifySchoolPayment(paymentId)
      toast({ title: 'Verification complete', description: res.payment.status })
      await loadData()
    } catch (err: unknown) {
      const e = err as AxiosError<{ message?: string }>
      toast({ variant: 'destructive', title: 'Verify failed', description: e.response?.data?.message || e.message || 'Please try again' })
    }
  }

  return (
    <SaasShell title="Payments" nav={schoolNav} showTenantSwitcher>
      <div className="space-y-6">
        <Card className="rounded-2xl">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              Manual payment submission
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={onSubmitManual} className="grid grid-cols-1 md:grid-cols-[260px_140px_200px_1fr_170px_240px_140px] gap-3 items-end">
              <div className="space-y-2">
                <Label>Invoice</Label>
                <Select value={invoiceId} onValueChange={setInvoiceId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select invoice" />
                  </SelectTrigger>
                  <SelectContent>
                    {(invoices || []).map((i) => (
                      <SelectItem key={i.id} value={String(i.id)}>
                        {i.invoice_number} ({(i.balance_due || 0).toFixed(2)} {i.currency})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="amount">Amount</Label>
                <Input id="amount" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="1500" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="method">Method</Label>
                <Select value={method} onValueChange={setMethod}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select method" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="bank_deposit">bank_deposit</SelectItem>
                    <SelectItem value="mobile_money_transfer">mobile_money_transfer</SelectItem>
                    <SelectItem value="cash">cash</SelectItem>
                    <SelectItem value="other">other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="ref">Reference</Label>
                <Input id="ref" value={reference} onChange={(e) => setReference(e.target.value)} placeholder="TXN-123" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="paidOn">Paid on</Label>
                <Input id="paidOn" type="date" value={paidOn} onChange={(e) => setPaidOn(e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="proof">Proof (optional)</Label>
                <Input id="proof" type="file" onChange={(e) => setProof(e.target.files?.[0] || null)} />
              </div>
              <Button type="submit" disabled={!currentTenantId || submitting}>
                {submitting ? 'Submitting…' : 'Submit'}
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card className="rounded-2xl">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Payments</CardTitle>
            <div className="text-sm text-muted-foreground tabular-nums">Total: {loading ? 'Loading…' : total.toFixed(2)}</div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Created</TableHead>
                  <TableHead>Invoice</TableHead>
                  <TableHead>Gateway</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Reference</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead>Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(payments || []).map((p) => (
                  <TableRow key={p.id}>
                    <TableCell>{p.created_at ? new Date(p.created_at).toLocaleString() : '—'}</TableCell>
                    <TableCell>{(invoices || []).find((i) => i.id === p.invoice_id)?.invoice_number || String(p.invoice_id)}</TableCell>
                    <TableCell>{p.gateway_name}</TableCell>
                    <TableCell>
                      <Badge variant={statusVariant(p.status)}>{p.status}</Badge>
                    </TableCell>
                    <TableCell className="max-w-[240px] truncate">{p.payment_reference || '—'}</TableCell>
                    <TableCell className="text-right tabular-nums">{p.amount.toFixed(2)} {p.currency}</TableCell>
                    <TableCell>
                      {String(p.status).toLowerCase() === 'pending' && p.gateway_name !== 'manual' ? (
                        <Button size="sm" variant="outline" onClick={() => onVerify(p.id)}>Verify</Button>
                      ) : p.payment_link ? (
                        <Button size="sm" variant="outline" onClick={() => window.open(p.payment_link || '', '_blank', 'noopener,noreferrer')}>Open</Button>
                      ) : (
                        <span className="text-sm text-muted-foreground">—</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
                {!loading && (payments || []).length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-sm text-muted-foreground">No payments yet.</TableCell>
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
