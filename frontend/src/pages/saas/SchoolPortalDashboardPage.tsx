import React, { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { AlertCircle, BarChart3, Receipt, CreditCard, UserPlus } from 'lucide-react'

import { SaasShell, schoolNav } from './SaasShell'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useSaasTenant } from '@/hooks/useSaasTenant'
import saasService, { PlatformInvoice, PlatformPayment } from '@/services/saasService'

export default function SchoolPortalDashboardPage() {
  const { currentTenantId, current, isLoading } = useSaasTenant()
  const [invoices, setInvoices] = useState<PlatformInvoice[] | null>(null)
  const [payments, setPayments] = useState<PlatformPayment[] | null>(null)
  const [loadingData, setLoadingData] = useState(false)

  useEffect(() => {
    let cancelled = false
    async function load() {
      if (!currentTenantId) return
      setLoadingData(true)
      try {
        const [invRes, payRes] = await Promise.all([
          saasService.listInvoices(currentTenantId),
          saasService.listPayments(currentTenantId)
        ])
        if (!cancelled) {
          setInvoices(invRes.invoices)
          setPayments(payRes.payments)
        }
      } finally {
        if (!cancelled) setLoadingData(false)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [currentTenantId])

  const totals = useMemo(() => {
    const invoiceTotal = (invoices || []).reduce((sum, i) => sum + (i.amount || 0), 0)
    const paymentTotal = (payments || []).reduce((sum, p) => sum + (p.amount || 0), 0)
    return {
      invoiceTotal,
      paymentTotal,
      outstanding: Math.max(0, invoiceTotal - paymentTotal)
    }
  }, [invoices, payments])

  const plan = (current?.tenant.plan || 'trial').toString()
  const status = (current?.tenant.status || 'active').toString()
  const statusVariant = status === 'active' ? 'success' : status === 'trial' ? 'warning' : 'secondary'

  return (
    <SaasShell title="School Portal" nav={schoolNav} showTenantSwitcher>
      {!isLoading && !currentTenantId ? (
        <Card className="rounded-2xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <AlertCircle className="h-5 w-5 text-amber-600" />
              No school selected
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-sm text-muted-foreground">A school workspace must be created by using a secure registration link.</div>
            <div className="mt-4">
              <Button variant="outline" onClick={() => window.location.assign('/login')}>
                Go to login
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="rounded-2xl">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <BarChart3 className="h-4 w-4" />
                  Tenant Status
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-lg font-semibold truncate">{current?.tenant.name || '—'}</div>
                <div className="mt-2 flex items-center gap-2">
                  <Badge variant="secondary">{plan}</Badge>
                  <Badge variant={statusVariant as any}>{status}</Badge>
                </div>
              </CardContent>
            </Card>

            <Card className="rounded-2xl">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <Receipt className="h-4 w-4" />
                  Invoices
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className={loadingData ? 'text-2xl font-semibold tabular-nums animate-pulse' : 'text-2xl font-semibold tabular-nums'}>
                  {loadingData ? 'Loading…' : totals.invoiceTotal.toFixed(2)}
                </div>
                <div className="text-xs text-muted-foreground">Total billed</div>
              </CardContent>
            </Card>

            <Card className="rounded-2xl">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <CreditCard className="h-4 w-4" />
                  Outstanding
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className={loadingData ? 'text-2xl font-semibold tabular-nums animate-pulse' : 'text-2xl font-semibold tabular-nums'}>
                  {loadingData ? 'Loading…' : totals.outstanding.toFixed(2)}
                </div>
                <div className="text-xs text-muted-foreground">Unpaid balance</div>
              </CardContent>
            </Card>
          </div>

          <Card className="rounded-2xl">
            <CardHeader>
              <CardTitle className="text-base">Quick actions</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col sm:flex-row gap-3">
              <Button asChild variant="outline" className="w-full sm:w-auto">
                <Link to="/app/team">
                  <UserPlus className="h-4 w-4" />
                  Invite team member
                </Link>
              </Button>
              <Button asChild className="w-full sm:w-auto">
                <Link to="/app/billing/invoices">
                  <Receipt className="h-4 w-4" />
                  Create invoice
                </Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      )}
    </SaasShell>
  )
}
