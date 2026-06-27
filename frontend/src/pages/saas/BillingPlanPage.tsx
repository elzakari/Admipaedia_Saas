import React, { useEffect, useMemo, useState } from 'react'
import type { AxiosError } from 'axios'
import { ArrowRight, CreditCard, Sparkles } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'

import { SaasShell, schoolNav } from './SaasShell'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { useToast } from '@/components/ui/use-toast'
import { usePlanContext } from '@/hooks/usePlanContext'
import billingService, { AcademicTerm, BillingPlan, SubscriptionChangeRequest } from '@/services/billingService'
import { SAAS_BILLING_INVOICES_ROUTE, SAAS_BILLING_PAYMENTS_ROUTE, buildSaasReturnUrl } from '@/lib/saasRoutes'

export default function BillingPlanPage() {
  const { toast } = useToast()
  const navigate = useNavigate()
  const { data: planContext, refresh: refreshPlanContext, isLoading: planContextLoading } = usePlanContext()

  const [plans, setPlans] = useState<BillingPlan[] | null>(null)
  const [terms, setTerms] = useState<AcademicTerm[] | null>(null)
  const [requests, setRequests] = useState<SubscriptionChangeRequest[] | null>(null)
  const [channels, setChannels] = useState<string[] | null>(null)
  const [loading, setLoading] = useState(false)

  const [upgradeOpen, setUpgradeOpen] = useState(false)
  const [upgradePlanSlug, setUpgradePlanSlug] = useState<string | null>(null)
  const [upgradeTermId, setUpgradeTermId] = useState<string>('none')
  const [upgradeChannel, setUpgradeChannel] = useState<string>('mobile_money')
  const [upgrading, setUpgrading] = useState(false)

  const [downgradeOpen, setDowngradeOpen] = useState(false)
  const [downgradePlanSlug, setDowngradePlanSlug] = useState<string | null>(null)
  const [downgradeTermId, setDowngradeTermId] = useState<string>('none')
  const [downgrading, setDowngrading] = useState(false)

  async function load() {
    setLoading(true)
    try {
      const [plansRes, termsRes, reqRes] = await Promise.all([
        billingService.listSchoolPlans(),
        billingService.listSchoolAcademicTerms(),
        billingService.listSchoolSubscriptionChangeRequests()
      ])
      setPlans(plansRes.plans)
      setTerms(termsRes.terms)
      setRequests(reqRes.requests)
    } catch (err: unknown) {
      const e = err as AxiosError<{ message?: string }>
      toast({ variant: 'destructive', title: 'Failed to load billing plan', description: e.response?.data?.message || e.message || 'Please try again' })
    } finally {
      setLoading(false)
    }
  }

  async function loadChannels() {
    try {
      const res = await billingService.getSchoolPaymentOptions()
      const supported = (res.supported_channels || []).map((c) => c.toLowerCase())
      const withManual = Array.from(new Set([...supported, 'manual']))
      setChannels(withManual)
      setUpgradeChannel(withManual[0] || 'mobile_money')
    } catch (e) {
      void e
    }
  }

  useEffect(() => {
    load()
    loadChannels()
  }, [])

  const now = useMemo(() => new Date(), [])

  const termOptions = useMemo(() => terms || [], [terms])

  const currentTerm = useMemo(() => {
    const candidates = (terms || []).filter((t) => {
      if (!t.start_date || !t.end_date) return false
      const s = new Date(t.start_date)
      const e = new Date(t.end_date)
      return s <= now && now <= e
    })
    if (candidates.length) return candidates[0]
    return (terms || [])[0] || null
  }, [terms, now])

  useEffect(() => {
    if (currentTerm) {
      setUpgradeTermId(String(currentTerm.id))
    }
  }, [currentTerm?.id])

  const futureTerms = useMemo(() => {
    return (terms || []).filter((t) => {
      if (!t.start_date) return false
      return new Date(t.start_date) > now
    })
  }, [terms, now])

  useEffect(() => {
    if (futureTerms.length) setDowngradeTermId(String(futureTerms[0].id))
  }, [futureTerms.length])

  const currentPlanSlug = planContext?.plan?.slug || null
  const currentPlanIndex = useMemo(() => (plans || []).findIndex((plan) => plan.slug === currentPlanSlug), [currentPlanSlug, plans])
  const pendingUpgradeRequest = useMemo(
    () => (requests || []).find((request) => request.request_type === 'upgrade' && ['pending', 'payment_pending'].includes(String(request.status || '').toLowerCase())),
    [requests]
  )
  const pendingDowngradeRequest = useMemo(
    () => (requests || []).find((request) => request.request_type === 'downgrade' && String(request.status || '').toLowerCase() === 'pending'),
    [requests]
  )

  const openUpgrade = (slug: string) => {
    setUpgradePlanSlug(slug)
    setUpgradeOpen(true)
  }

  const openDowngrade = (slug: string) => {
    setDowngradePlanSlug(slug)
    setDowngradeOpen(true)
  }

  const statusVariant = (status?: string | null): 'success' | 'warning' | 'destructive' | 'secondary' | 'outline' => {
    const s = (status || '').toLowerCase()
    if (s === 'approved') return 'success'
    if (s === 'rejected' || s === 'cancelled') return 'destructive'
    if (s === 'payment_pending') return 'warning'
    if (s === 'pending') return 'warning'
    if (!s) return 'outline'
    return 'secondary'
  }

  async function onConfirmUpgrade() {
    if (!upgradePlanSlug) return
    const parsedTerm = Number(upgradeTermId)
    const termValue = Number.isFinite(parsedTerm) && parsedTerm > 0 ? parsedTerm : upgradeTermId
    if (!termValue || termValue === 'none') {
      toast({ variant: 'destructive', title: 'Select a term', description: 'Choose an academic term for billing.' })
      return
    }
    setUpgrading(true)
    try {
      const selectedChannel = upgradeChannel.toLowerCase()
      const res = await billingService.upgradeSubscription({
        plan_slug: upgradePlanSlug,
        plan: upgradePlanSlug,
        academic_term_id: termValue,
        term_id: termValue,
        payment_channel: selectedChannel === 'manual' ? undefined : selectedChannel,
        channel: selectedChannel === 'manual' ? undefined : selectedChannel,
        return_url: buildSaasReturnUrl(SAAS_BILLING_INVOICES_ROUTE)
      })
      toast({
        title: 'Upgrade started',
        description: res.payment?.payment_link
          ? `Complete payment to activate ${res.plan.name}.`
          : `${res.plan.name} will activate after invoice payment is confirmed.`,
      })
      setUpgradeOpen(false)
      await load()
      if (res.payment?.payment_link) {
        window.open(res.payment.payment_link, '_blank', 'noopener,noreferrer')
      } else if (selectedChannel === 'manual') {
        navigate(`${SAAS_BILLING_PAYMENTS_ROUTE}?invoiceId=${res.invoice.id}`)
      }
      await refreshPlanContext()
    } catch (err: unknown) {
      const e = err as AxiosError<{ message?: string }>
      toast({ variant: 'destructive', title: 'Upgrade failed', description: e.response?.data?.message || e.message || 'Please try again' })
    } finally {
      setUpgrading(false)
    }
  }

  async function onConfirmDowngrade() {
    if (!downgradePlanSlug) return
    const parsedTerm = Number(downgradeTermId)
    const termValue = Number.isFinite(parsedTerm) && parsedTerm > 0 ? parsedTerm : downgradeTermId
    if (!termValue || termValue === 'none') {
      toast({ variant: 'destructive', title: 'Select a future term', description: 'Choose the term the downgrade should start.' })
      return
    }
    setDowngrading(true)
    try {
      const res = await billingService.requestDowngrade({
        plan_slug: downgradePlanSlug,
        plan: downgradePlanSlug,
        effective_academic_term_id: termValue,
        effective_term_id: termValue,
        term_id: termValue
      })
      toast({ title: 'Downgrade requested', description: res.request.status })
      setDowngradeOpen(false)
      await load()
    } catch (err: unknown) {
      const e = err as AxiosError<{ message?: string }>
      toast({ variant: 'destructive', title: 'Request failed', description: e.response?.data?.message || e.message || 'Please try again' })
    } finally {
      setDowngrading(false)
    }
  }

  return (
    <SaasShell title="Plan & Subscription" nav={schoolNav} showTenantSwitcher>
      <div className="space-y-6">
        <Card className="rounded-2xl">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <Sparkles className="h-5 w-5" />
              Current plan
            </CardTitle>
            <Button variant="outline" onClick={() => refreshPlanContext()} disabled={planContextLoading}>
              Refresh
            </Button>
          </CardHeader>
          <CardContent className="flex items-center gap-3 flex-wrap">
            <Badge variant="secondary">{planContext?.plan?.name || '—'}</Badge>
            <span className="text-sm text-muted-foreground">Slug: {planContext?.plan?.slug || '—'}</span>
            <span className="text-sm text-muted-foreground">Valid: {planContext?.subscription?.starts_at || '—'} → {planContext?.subscription?.ends_at || '—'}</span>
          </CardContent>
        </Card>

        {(pendingUpgradeRequest || pendingDowngradeRequest) && (
          <Card className="rounded-2xl border-primary/20 bg-primary/5">
            <CardContent className="flex flex-col gap-3 py-5 md:flex-row md:items-center md:justify-between">
              <div className="space-y-1">
                <div className="text-sm font-semibold text-foreground">Subscription change in progress</div>
                <div className="text-sm text-muted-foreground">
                  {pendingUpgradeRequest
                    ? 'Your upgrade has been started. Complete or verify invoice payment to activate the new plan.'
                    : 'A downgrade request is pending review and will take effect from the selected future term.'}
                </div>
              </div>
              {pendingUpgradeRequest && (
                <Button asChild>
                  <Link to={SAAS_BILLING_INVOICES_ROUTE}>
                    <CreditCard className="h-4 w-4" />
                    Review invoices
                  </Link>
                </Button>
              )}
            </CardContent>
          </Card>
        )}

        <Card className="rounded-2xl">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Available plans</CardTitle>
            <div className="text-sm text-muted-foreground">{loading ? 'Loading…' : `${(plans || []).length} plans`}</div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {(plans || []).map((p) => {
                const isCurrent = currentPlanSlug && p.slug === currentPlanSlug
                const planIndex = (plans || []).findIndex((plan) => plan.slug === p.slug)
                const isUpgrade = currentPlanIndex >= 0 ? planIndex > currentPlanIndex : !isCurrent
                const isDowngrade = currentPlanIndex >= 0 ? planIndex < currentPlanIndex : false
                const actionDisabled = isCurrent || (isUpgrade && !!pendingUpgradeRequest) || (isDowngrade && !!pendingDowngradeRequest)
                return (
                  <div key={p.id} className="border border-border rounded-2xl p-4 space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <div className="font-semibold truncate">{p.name}</div>
                      {isCurrent && <Badge variant="success">current</Badge>}
                    </div>
                    <div className="text-sm text-muted-foreground">{p.description || '—'}</div>
                    <div className="text-sm">
                      <span className="font-medium tabular-nums">{p.price_per_student.toFixed(2)}</span> {p.currency} / student / month
                    </div>
                    {typeof p.active_student_count === 'number' && typeof p.total_per_month === 'number' && (
                      <div className="text-xs text-muted-foreground">
                        Approx. monthly total for {p.active_student_count} active students: {p.total_per_month.toFixed(2)} {p.currency}
                      </div>
                    )}
                    <div className="text-xs text-muted-foreground">Minimum payment period: {p.billing_min_months || 3} months</div>
                    <div className="flex items-center gap-2 pt-1">
                      {isCurrent ? (
                        <Button size="sm" variant="outline" disabled>
                          Current plan
                        </Button>
                      ) : isUpgrade ? (
                        <Button size="sm" onClick={() => openUpgrade(p.slug)} disabled={actionDisabled}>
                          Upgrade
                          <ArrowRight className="h-4 w-4" />
                        </Button>
                      ) : (
                        <Button size="sm" variant="outline" onClick={() => openDowngrade(p.slug)} disabled={actionDisabled}>
                          Request downgrade
                        </Button>
                      )}
                      {actionDisabled && !isCurrent && (
                        <span className="text-xs text-muted-foreground">
                          {isUpgrade ? 'Pending upgrade already exists' : 'Pending downgrade already exists'}
                        </span>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Change requests</CardTitle>
            <div className="text-sm text-muted-foreground">{loading ? 'Loading…' : `${(requests || []).length} total`}</div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Type</TableHead>
                  <TableHead>Plan</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Effective</TableHead>
                  <TableHead>Created</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(requests || []).map((r) => (
                  <TableRow key={r.id}>
                    <TableCell>{r.request_type}</TableCell>
                    <TableCell>{r.requested_plan?.name || r.requested_plan_id}</TableCell>
                    <TableCell>
                      <Badge variant={statusVariant(r.status)}>{r.status}</Badge>
                    </TableCell>
                    <TableCell>{r.effective_date || '—'}</TableCell>
                    <TableCell>{r.created_at ? new Date(r.created_at).toLocaleString() : '—'}</TableCell>
                  </TableRow>
                ))}
                {!loading && (requests || []).length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-sm text-muted-foreground">No change requests yet.</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      <Dialog open={upgradeOpen} onOpenChange={(v) => { setUpgradeOpen(v); if (!v) setUpgradePlanSlug(null) }}>
        <DialogContent className="sm:max-w-[560px]">
          <DialogHeader>
            <DialogTitle>Upgrade plan</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Bill for academic term</Label>
              <Select value={upgradeTermId} onValueChange={setUpgradeTermId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select term" />
                </SelectTrigger>
                <SelectContent>
                  {termOptions.map((t) => (
                    <SelectItem key={t.id} value={String(t.id)}>
                      {t.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Payment channel</Label>
              <Select value={upgradeChannel} onValueChange={setUpgradeChannel}>
                <SelectTrigger>
                  <SelectValue placeholder="Select channel" />
                </SelectTrigger>
                <SelectContent>
                  {(channels || ['mobile_money', 'card', 'manual']).map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setUpgradeOpen(false)}>Cancel</Button>
            <Button type="button" onClick={onConfirmUpgrade} disabled={upgrading}>{upgrading ? 'Processing…' : 'Confirm'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={downgradeOpen} onOpenChange={(v) => { setDowngradeOpen(v); if (!v) setDowngradePlanSlug(null) }}>
        <DialogContent className="sm:max-w-[560px]">
          <DialogHeader>
            <DialogTitle>Request downgrade</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <Label>Effective academic term (future)</Label>
            <Select value={downgradeTermId} onValueChange={setDowngradeTermId}>
              <SelectTrigger>
                <SelectValue placeholder="Select term" />
              </SelectTrigger>
              <SelectContent>
                {futureTerms.map((t) => (
                  <SelectItem key={t.id} value={String(t.id)}>
                    {t.name} ({t.start_date})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setDowngradeOpen(false)}>Cancel</Button>
            <Button type="button" variant="destructive" onClick={onConfirmDowngrade} disabled={downgrading}>
              {downgrading ? 'Submitting…' : 'Submit request'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </SaasShell>
  )
}
