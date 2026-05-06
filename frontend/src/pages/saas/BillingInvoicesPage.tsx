import React, { useEffect, useMemo, useState } from 'react'
import { Plus, Receipt } from 'lucide-react'
import type { AxiosError } from 'axios'

import { SaasShell, schoolNav } from './SaasShell'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/components/ui/use-toast'
import { useSaasTenant } from '@/hooks/useSaasTenant'
import saasService, { PlatformInvoice } from '@/services/saasService'

export default function BillingInvoicesPage() {
  const { toast } = useToast()
  const { currentTenantId } = useSaasTenant()

  const [invoices, setInvoices] = useState<PlatformInvoice[] | null>(null)
  const [loading, setLoading] = useState(false)

  const [invoiceNumber, setInvoiceNumber] = useState('')
  const [amount, setAmount] = useState('')
  const [issuedOn, setIssuedOn] = useState(() => new Date().toISOString().slice(0, 10))
  const [dueOn, setDueOn] = useState('')
  const [creating, setCreating] = useState(false)

  async function loadInvoices() {
    if (!currentTenantId) return
    setLoading(true)
    try {
      const res = await saasService.listInvoices(currentTenantId)
      setInvoices(res.invoices)
    } catch (err: unknown) {
      const e = err as AxiosError<{ message?: string }>
      toast({
        variant: 'destructive',
        title: 'Failed to load invoices',
        description: e.response?.data?.message || e.message || 'Please try again'
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadInvoices()
  }, [currentTenantId])

  const total = useMemo(() => (invoices || []).reduce((sum, i) => sum + (i.amount || 0), 0), [invoices])

  const statusVariant = (status?: string | null): 'success' | 'warning' | 'destructive' | 'secondary' | 'outline' => {
    const s = (status || '').toLowerCase()
    if (s === 'paid' || s === 'success') return 'success'
    if (s === 'overdue' || s === 'failed') return 'destructive'
    if (s === 'unpaid' || s === 'pending') return 'warning'
    if (!s) return 'outline'
    return 'secondary'
  }

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
      await saasService.createInvoice(currentTenantId, {
        invoice_number: invoiceNumber,
        amount: parsed,
        issued_on: issuedOn,
        due_on: dueOn || undefined
      })
      setInvoiceNumber('')
      setAmount('')
      setDueOn('')
      toast({ title: 'Invoice created' })
      await loadInvoices()
    } catch (err: unknown) {
      const e = err as AxiosError<{ message?: string }>
      toast({
        variant: 'destructive',
        title: 'Create invoice failed',
        description: e.response?.data?.message || e.message || 'Please try again'
      })
    } finally {
      setCreating(false)
    }
  }

  return (
    <SaasShell title="Invoices" nav={schoolNav} showTenantSwitcher>
      <div className="space-y-6">
        <Card className="rounded-2xl">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Receipt className="h-5 w-5" />
              Create invoice
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={onCreate} className="grid grid-cols-1 md:grid-cols-[1fr_180px_180px_180px_140px] gap-3 items-end">
              <div className="space-y-2">
                <Label htmlFor="inv">Invoice #</Label>
                <Input id="inv" value={invoiceNumber} onChange={(e) => setInvoiceNumber(e.target.value)} placeholder="INV-0001" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="amount">Amount</Label>
                <Input id="amount" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="1500" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="issued">Issued on</Label>
                <Input id="issued" type="date" value={issuedOn} onChange={(e) => setIssuedOn(e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="due">Due on</Label>
                <Input id="due" type="date" value={dueOn} onChange={(e) => setDueOn(e.target.value)} />
              </div>
              <Button type="submit" disabled={!currentTenantId || creating}>
                <Plus className="h-4 w-4 mr-2" />
                {creating ? 'Creating…' : 'Create'}
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card className="rounded-2xl">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Invoices</CardTitle>
            <div className="text-sm text-muted-foreground tabular-nums">Total: {loading ? 'Loading…' : total.toFixed(2)}</div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Invoice</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead>Issued</TableHead>
                  <TableHead>Due</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(invoices || []).map((i) => (
                  <TableRow key={i.id}>
                    <TableCell className="font-medium">{i.invoice_number}</TableCell>
                    <TableCell>
                      <Badge variant={statusVariant(i.status)}>{i.status}</Badge>
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{i.amount.toFixed(2)} {i.currency}</TableCell>
                    <TableCell>{i.issued_on}</TableCell>
                    <TableCell>{i.due_on || '—'}</TableCell>
                  </TableRow>
                ))}
                {!loading && (invoices || []).length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-sm text-muted-foreground">No invoices yet.</TableCell>
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
