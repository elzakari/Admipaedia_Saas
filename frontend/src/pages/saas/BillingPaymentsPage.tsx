import React, { useEffect, useMemo, useState } from 'react'
import { Plus, CreditCard } from 'lucide-react'
import type { AxiosError } from 'axios'

import { SaasShell, schoolNav } from './SaasShell'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { useToast } from '@/components/ui/use-toast'
import { useSaasTenant } from '@/hooks/useSaasTenant'
import saasService, { PlatformInvoice, PlatformPayment } from '@/services/saasService'

export default function BillingPaymentsPage() {
  const { toast } = useToast()
  const { currentTenantId } = useSaasTenant()

  const [payments, setPayments] = useState<PlatformPayment[] | null>(null)
  const [invoices, setInvoices] = useState<PlatformInvoice[] | null>(null)
  const [loading, setLoading] = useState(false)

  const [invoiceId, setInvoiceId] = useState<string>('none')
  const [amount, setAmount] = useState('')
  const [method, setMethod] = useState('manual')
  const [reference, setReference] = useState('')
  const [paidOn, setPaidOn] = useState(() => new Date().toISOString().slice(0, 10))
  const [creating, setCreating] = useState(false)

  async function loadData() {
    if (!currentTenantId) return
    setLoading(true)
    try {
      const [payRes, invRes] = await Promise.all([
        saasService.listPayments(currentTenantId),
        saasService.listInvoices(currentTenantId)
      ])
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

  const total = useMemo(() => (payments || []).reduce((sum, p) => sum + (p.amount || 0), 0), [payments])

  async function onCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!currentTenantId) return
    setCreating(true)
    try {
      const parsed = Number(amount)
      if (!Number.isFinite(parsed) || parsed <= 0) {
        toast({ variant: 'destructive', title: 'Invalid amount', description: 'Enter a positive number.' })
        return
      }
      await saasService.recordPayment(currentTenantId, {
        invoice_id: invoiceId === 'none' ? undefined : invoiceId,
        amount: parsed,
        method,
        reference: reference || undefined,
        paid_on: paidOn
      })
      setInvoiceId('none')
      setAmount('')
      setReference('')
      toast({ title: 'Payment recorded' })
      await loadData()
    } catch (err: unknown) {
      const e = err as AxiosError<{ message?: string }>
      toast({
        variant: 'destructive',
        title: 'Record payment failed',
        description: e.response?.data?.message || e.message || 'Please try again'
      })
    } finally {
      setCreating(false)
    }
  }

  return (
    <SaasShell title="Payments" nav={schoolNav} showTenantSwitcher>
      <div className="space-y-6">
        <Card className="rounded-2xl">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              Record payment
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={onCreate} className="grid grid-cols-1 md:grid-cols-[240px_160px_160px_1fr_180px_140px] gap-3 items-end">
              <div className="space-y-2">
                <Label>Invoice (optional)</Label>
                <Select value={invoiceId} onValueChange={setInvoiceId}>
                  <SelectTrigger>
                    <SelectValue placeholder="No invoice" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No invoice</SelectItem>
                    {(invoices || []).map((i) => (
                      <SelectItem key={i.id} value={i.id}>
                        {i.invoice_number}
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
                <Input id="method" value={method} onChange={(e) => setMethod(e.target.value)} placeholder="manual" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ref">Reference</Label>
                <Input id="ref" value={reference} onChange={(e) => setReference(e.target.value)} placeholder="TXN-123" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="paidOn">Paid on</Label>
                <Input id="paidOn" type="date" value={paidOn} onChange={(e) => setPaidOn(e.target.value)} required />
              </div>
              <Button type="submit" disabled={!currentTenantId || creating}>
                <Plus className="h-4 w-4 mr-2" />
                {creating ? 'Saving…' : 'Record'}
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
                  <TableHead>Paid on</TableHead>
                  <TableHead>Invoice</TableHead>
                  <TableHead>Method</TableHead>
                  <TableHead>Reference</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(payments || []).map((p) => (
                  <TableRow key={p.id}>
                    <TableCell>{p.paid_on}</TableCell>
                    <TableCell>{p.invoice_id ? (invoices || []).find((i) => i.id === p.invoice_id)?.invoice_number || '—' : '—'}</TableCell>
                    <TableCell>{p.method || '—'}</TableCell>
                    <TableCell className="max-w-[240px] truncate">{p.reference || '—'}</TableCell>
                    <TableCell className="text-right tabular-nums">{p.amount.toFixed(2)} {p.currency}</TableCell>
                  </TableRow>
                ))}
                {!loading && (payments || []).length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-sm text-muted-foreground">No payments yet.</TableCell>
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
