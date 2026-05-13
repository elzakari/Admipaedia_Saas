import React, { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { AlertCircle, BarChart3, Receipt, CreditCard, UserPlus, Mail, MessageSquare, Bot, MessageCircle } from 'lucide-react'

import { SaasShell, schoolNav } from './SaasShell'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useSaasTenant } from '@/hooks/useSaasTenant'
import { usePlanContext } from '@/hooks/usePlanContext'
import saasService, { PlatformInvoice, PlatformPayment } from '@/services/saasService'

export default function SchoolPortalDashboardPage() {
  const { currentTenantId, current, isLoading } = useSaasTenant()
  const { data: planContext, isLoading: isLoadingPlanContext } = usePlanContext()
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

  const tokenUsage = planContext?.token_usage || null
  const anyLoadingUsage = isLoadingPlanContext || !tokenUsage

  const usageSummary = useMemo(() => {
    if (!tokenUsage) return null
    const items = [
      { key: 'email' as const, label: 'Email', icon: Mail },
      { key: 'sms' as const, label: 'SMS', icon: MessageSquare },
      { key: 'whatsapp' as const, label: 'WhatsApp', icon: MessageCircle },
      { key: 'ai' as const, label: 'AI', icon: Bot },
    ]
    return items.map((i) => {
      const u = tokenUsage[i.key]
      return {
        ...i,
        used: u?.used ?? 0,
        allowance: u?.allowance ?? null,
        remaining: u?.remaining ?? null,
        unlimited: Boolean(u?.unlimited),
      }
    })
  }, [tokenUsage])

  const needsUpgrade = useMemo(() => {
    if (!usageSummary) return false
    for (const u of usageSummary) {
      if (u.unlimited) continue
      const allowance = typeof u.allowance === 'number' ? u.allowance : null
      const remaining = typeof u.remaining === 'number' ? u.remaining : null
      if (allowance === 0) return true
      if (allowance && remaining !== null) {
        const pct = allowance <= 0 ? 0 : remaining / allowance
        if (pct <= 0.2) return true
      }
    }
    return false
  }, [usageSummary])

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
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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
                  <BarChart3 className="h-4 w-4" />
                  Token usage
                </CardTitle>
              </CardHeader>
              <CardContent>
                {anyLoadingUsage ? (
                  <div className="text-sm text-muted-foreground animate-pulse">Loading…</div>
                ) : !usageSummary ? (
                  <div className="text-sm text-muted-foreground">—</div>
                ) : (
                  <div className="space-y-3">
                    <div className="space-y-2">
                      {usageSummary.map((u) => (
                        <div key={u.key} className="flex items-center justify-between text-sm">
                          <div className="flex items-center gap-2">
                            <u.icon className="h-4 w-4 text-muted-foreground" />
                            <span>{u.label}</span>
                          </div>
                          <div className="tabular-nums text-muted-foreground">
                            {u.unlimited ? 'Unlimited' : u.allowance === 0 ? 'Not included' : u.remaining === null ? '0' : `${u.remaining} left`}
                          </div>
                        </div>
                      ))}
                    </div>
                    {needsUpgrade ? (
                      <Button asChild className="w-full">
                        <Link to="/app/billing/invoices">View billing & upgrade</Link>
                      </Button>
                    ) : (
                      <Button asChild variant="outline" className="w-full">
                        <Link to="/app/billing/invoices">View billing</Link>
                      </Button>
                    )}
                  </div>
                )}
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
