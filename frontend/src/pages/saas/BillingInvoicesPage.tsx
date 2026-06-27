import React, { useEffect, useMemo, useState } from 'react'
import { Receipt } from 'lucide-react'
import type { AxiosError } from 'axios'
import { Link, useNavigate } from 'react-router-dom'

import { SaasShell, schoolNav } from './SaasShell'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/components/ui/use-toast'
import { useSaasTenant } from '@/hooks/useSaasTenant'
import billingService, { BillingInvoice } from '@/services/billingService'
import {
  SAAS_BILLING_INVOICES_ROUTE,
  SAAS_BILLING_PAYMENTS_ROUTE,
  SAAS_BILLING_PLAN_ROUTE,
  buildSaasReturnUrl,
} from '@/lib/saasRoutes'

export default function BillingInvoicesPage() {
  const { toast } = useToast()
  const { currentTenantId } = useSaasTenant()
  const navigate = useNavigate()

  const [invoices, setInvoices] = useState<BillingInvoice[] | null>(null)
  const [loading, setLoading] = useState(false)
  const [channels, setChannels] = useState<string[] | null>(null)
  const [channelByInvoice, setChannelByInvoice] = useState<Record<number, string>>({})

  async function loadInvoices() {
    if (!currentTenantId) return
    setLoading(true)
    try {
      const res = await billingService.listSchoolInvoices()
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

  async function loadOptions() {
    if (!currentTenantId) return
    try {
      const res = await billingService.getSchoolPaymentOptions()
      const supported = (res.supported_channels || []).map((c) => c.toLowerCase())
      const withManual = Array.from(new Set([...supported, 'manual']))
      setChannels(withManual)
    } catch (err: unknown) {
      void err
    }
  }

  useEffect(() => {
    loadInvoices()
    loadOptions()
  }, [currentTenantId])

  const total = useMemo(() => (invoices || []).reduce((sum, i) => sum + (i.total_amount || 0), 0), [invoices])
  const outstanding = useMemo(() => (invoices || []).reduce((sum, i) => sum + (i.balance_due || 0), 0), [invoices])
  const unpaidCount = useMemo(
    () => (invoices || []).filter((invoice) => String(invoice.payment_status || '').toLowerCase() !== 'paid' && (invoice.balance_due || 0) > 0).length,
    [invoices]
  )

  const statusVariant = (status?: string | null): 'success' | 'warning' | 'destructive' | 'secondary' | 'outline' => {
    const s = (status || '').toLowerCase()
    if (s === 'paid' || s === 'success') return 'success'
    if (s === 'overdue' || s === 'failed') return 'destructive'
    if (s === 'unpaid' || s === 'pending') return 'warning'
    if (!s) return 'outline'
    return 'secondary'
  }

  async function onPayNow(invoice: BillingInvoice) {
    if (!currentTenantId) return
    try {
      const selected = (channelByInvoice[invoice.id] || channels?.[0] || 'mobile_money').toLowerCase()
      if (selected === 'manual') {
        navigate(`${SAAS_BILLING_PAYMENTS_ROUTE}?invoiceId=${invoice.id}`)
        return
      }
      const res = await billingService.initializeInvoicePayment(invoice.id, {
        payment_channel: selected,
        return_url: buildSaasReturnUrl(SAAS_BILLING_INVOICES_ROUTE)
      })
      toast({ title: 'Payment initialized', description: res.payment.gateway_name })
      if (res.payment.payment_link) {
        window.open(res.payment.payment_link, '_blank', 'noopener,noreferrer')
      }
      await loadInvoices()
    } catch (err: unknown) {
      const e = err as AxiosError<{ message?: string }>
      toast({
        variant: 'destructive',
        title: 'Payment failed',
        description: e.response?.data?.message || e.message || 'Please try again'
      })
    }
  }

  return (
    <SaasShell title="Invoices" nav={schoolNav} showTenantSwitcher>
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-3">
          <Card className="rounded-2xl">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground">Total billed</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-semibold tabular-nums">{loading ? 'Loading…' : total.toFixed(2)}</div>
            </CardContent>
          </Card>
          <Card className="rounded-2xl">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground">Outstanding balance</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-semibold tabular-nums">{loading ? 'Loading…' : outstanding.toFixed(2)}</div>
            </CardContent>
          </Card>
          <Card className="rounded-2xl">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground">Invoices awaiting payment</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-semibold tabular-nums">{loading ? 'Loading…' : unpaidCount}</div>
            </CardContent>
          </Card>
        </div>

        <Card className="rounded-2xl border-primary/20 bg-primary/5">
          <CardContent className="flex flex-col gap-3 py-5 md:flex-row md:items-center md:justify-between">
            <div className="space-y-1">
              <div className="text-sm font-semibold text-foreground">Billing workflow</div>
              <div className="text-sm text-muted-foreground">
                Pay online from an invoice, or switch to manual payment to upload proof and continue from the payments page.
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" asChild>
                <Link to={SAAS_BILLING_PLAN_ROUTE}>Review plans</Link>
              </Button>
              <Button asChild>
                <Link to={SAAS_BILLING_PAYMENTS_ROUTE}>Manual payments</Link>
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Invoices</CardTitle>
            <div className="text-sm text-muted-foreground tabular-nums">Outstanding: {loading ? 'Loading…' : outstanding.toFixed(2)}</div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Invoice</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Months</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead className="text-right">Balance</TableHead>
                  <TableHead>Due</TableHead>
                  <TableHead>Pay</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(invoices || []).map((i) => (
                  <TableRow key={i.id}>
                    <TableCell className="font-medium">{i.invoice_number}</TableCell>
                    <TableCell>
                      <Badge variant={statusVariant(i.payment_status)}>{i.payment_status}</Badge>
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{(i.billing_months || 0) || '—'}</TableCell>
                    <TableCell className="text-right tabular-nums">{(i.total_amount || 0).toFixed(2)} {i.currency}</TableCell>
                    <TableCell className="text-right tabular-nums">{(i.balance_due || 0).toFixed(2)} {i.currency}</TableCell>
                    <TableCell>{i.due_date || '—'}</TableCell>
                    <TableCell>
                      {String(i.payment_status || '').toLowerCase() === 'paid' || (i.balance_due || 0) <= 0 ? (
                        <span className="text-sm text-muted-foreground">Paid</span>
                      ) : (
                        <div className="flex items-center gap-2">
                          <Select
                            value={channelByInvoice[i.id] || channels?.[0] || 'mobile_money'}
                            onValueChange={(v) => setChannelByInvoice((prev) => ({ ...prev, [i.id]: v }))}
                          >
                            <SelectTrigger className="w-[160px]">
                              <SelectValue placeholder="Channel" />
                            </SelectTrigger>
                            <SelectContent>
                              {(channels || ['mobile_money', 'card', 'manual']).map((c) => (
                                <SelectItem key={c} value={c}>
                                  {c}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <Button size="sm" onClick={() => onPayNow(i)} disabled={!currentTenantId}>
                            Pay now
                          </Button>
                          {i.payment_link && (
                            <Button size="sm" variant="outline" onClick={() => window.open(i.payment_link || '', '_blank', 'noopener,noreferrer')}>
                              Open
                            </Button>
                          )}
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
                {!loading && (invoices || []).length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-sm text-muted-foreground">No invoices yet.</TableCell>
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
