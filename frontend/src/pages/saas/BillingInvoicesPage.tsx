import React, { useEffect, useMemo, useState } from 'react'
import { Receipt } from 'lucide-react'
import type { AxiosError } from 'axios'
import { useNavigate } from 'react-router-dom'

import { SaasShell, schoolNav } from './SaasShell'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/components/ui/use-toast'
import { useSaasTenant } from '@/hooks/useSaasTenant'
import billingService, { BillingInvoice } from '@/services/billingService'

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
        navigate(`/app/billing/payments?invoiceId=${invoice.id}`)
        return
      }
      const res = await billingService.initializeInvoicePayment(invoice.id, {
        payment_channel: selected,
        return_url: window.location.origin + '/app/billing/invoices'
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
