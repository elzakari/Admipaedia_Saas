import React, { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import {
  ArrowRight,
  BarChart3,
  BellRing,
  Building2,
  ClipboardList,
  CreditCard,
  Landmark,
  RefreshCcw,
  Settings,
  ShieldCheck,
  Sparkles,
  UserCog,
  Users
} from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import saasService, { PlatformFinancialSummary, PlatformKPIs } from '@/services/saasService'
import { superAdminService, SuperAdminOverview } from '@/services/superAdminService'

function formatIso(iso: string | null | undefined) {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleString()
}

function formatDetailValue(v: unknown) {
  if (v == null) return ''
  if (typeof v === 'string') return v
  if (typeof v === 'number' || typeof v === 'boolean') return String(v)
  if (Array.isArray(v)) return `List (${v.length})`
  if (typeof v === 'object') return 'Object'
  return String(v)
}

function pickDetailsSummary(details: Record<string, any> | null | undefined) {
  const d = details || {}
  const pairs: Array<{ k: string; v: string }> = []
  const push = (k: string, v: unknown) => {
    const vv = formatDetailValue(v)
    if (!vv) return
    pairs.push({ k, v: vv })
  }

  push('target_user_id', d.target_user_id)
  push('tenant_id', d.tenant_id)
  push('user_id', d.user_id)
  push('email_sent', d.email_sent)
  push('plan', d.plan_slug || d.plan)

  if (pairs.length === 0) {
    const keys = Object.keys(d)
    if (keys.length) pairs.push({ k: 'fields', v: String(keys.length) })
  }

  return pairs.slice(0, 3)
}

function formatNumber(value: number | null | undefined) {
  if (typeof value !== 'number' || Number.isNaN(value)) return '—'
  return new Intl.NumberFormat().format(value)
}

function formatAmount(value: number | null | undefined) {
  if (typeof value !== 'number' || Number.isNaN(value)) return '—'
  return value.toFixed(2)
}

const KpiCard: React.FC<{
  title: string
  value: React.ReactNode
  href: string
  hint?: string
  icon?: React.ReactNode
}> = ({ title, value, href, hint, icon }) => {
  return (
    <Link to={href} className="block">
      <Card className="transition-shadow hover:shadow-md">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
            {icon ? <span className="text-muted-foreground">{icon}</span> : null}
            <span>{title}</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-semibold">{value}</div>
          {hint ? <div className="text-xs text-muted-foreground mt-1">{hint}</div> : null}
        </CardContent>
      </Card>
    </Link>
  )
}

const SuperAdminDashboardPage: React.FC = () => {
  const { t } = useTranslation()
  const [overview, setOverview] = useState<SuperAdminOverview | null>(null)
  const [kpis, setKpis] = useState<PlatformKPIs | null>(null)
  const [financial, setFinancial] = useState<PlatformFinancialSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const roleEntries = useMemo(() => Object.entries(overview?.by_role || {}), [overview])
  const countryEntries = useMemo(
    () => Object.entries(kpis?.tenants_by_country || {}).sort((a, b) => Number(b[1]) - Number(a[1])).slice(0, 4),
    [kpis]
  )
  const planEntries = useMemo(
    () => Object.entries(kpis?.tenants_by_plan || {}).sort((a, b) => Number(b[1]) - Number(a[1])).slice(0, 4),
    [kpis]
  )
  const recentAudit = overview?.recent_audit || []
  const activeSchools = Number(kpis?.tenants_by_status?.active || 0)
  const trialSchools = Number(kpis?.tenants_by_status?.trial || 0)
  const suspendedSchools = Number(kpis?.tenants_by_status?.suspended || 0)
  const inactiveUsers = Number(overview?.by_status?.inactive || 0)
  const financialSourceCards = useMemo(() => ([
    {
      key: 'legacy',
      title: t('super_admin.financial.source.platform', 'Legacy platform billing'),
      invoice: financial?.platform_invoice_total,
      payment: financial?.platform_payment_total,
      href: '/super-admin/financial',
    },
    {
      key: 'school',
      title: t('super_admin.financial.source.school', 'School subscription billing'),
      invoice: financial?.school_billing_invoice_total,
      payment: financial?.school_billing_payment_total,
      href: '/super-admin/financial',
    }
  ]), [financial, t])

  async function load() {
    setLoading(true)
    setError(null)
    try {
      const [ovRes, kpisRes, finRes] = await Promise.all([
        superAdminService.getOverview(),
        saasService.platformKpis(),
        saasService.platformFinancialSummary()
      ])
      setOverview(ovRes.overview)
      setKpis(kpisRes.kpis)
      setFinancial(finRes.summary)
    } catch (e) {
      void e
      setError(t('super_admin.dashboard.errors.load_failed', 'Failed to load overview'))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold">{t('super_admin.dashboard.title', 'Super Admin')}</h1>
          <p className="text-sm text-muted-foreground">
            {t('super_admin.dashboard.subtitle', 'Manage users, schools, billing, and platform operations.')}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Button variant="outline" onClick={load} disabled={loading}>
            <RefreshCcw className="h-4 w-4 mr-2" />
            {t('common.refresh', 'Refresh')}
          </Button>
          <Link to="/super-admin/settings">
            <Button variant="outline">
              <Settings className="h-4 w-4 mr-2" />
              {t('common.settings', 'Settings')}
            </Button>
          </Link>
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-24 rounded-lg border bg-background animate-pulse" />
          ))}
        </div>
      ) : error ? (
        <Card>
          <CardContent className="p-6 text-sm text-red-600">{error}</CardContent>
        </Card>
      ) : overview ? (
        <>
          <Card className="overflow-hidden border-primary/15 bg-gradient-to-br from-background via-background to-primary/5">
            <CardContent className="p-6">
              <div className="flex flex-col gap-6 xl:flex-row xl:items-start xl:justify-between">
                <div className="space-y-4">
                  <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
                    <Sparkles className="h-3.5 w-3.5" />
                    {t('super_admin.dashboard.hero.badge', 'Platform operations')}
                  </div>
                  <div className="space-y-2">
                    <h2 className="text-xl font-semibold tracking-tight">
                      {t('super_admin.dashboard.hero.title', 'Run user access, school onboarding, payments, and audit workflows from one place.')}
                    </h2>
                    <p className="max-w-3xl text-sm text-muted-foreground">
                      {t(
                        'super_admin.dashboard.hero.subtitle',
                        'The dashboard combines account health, tenant growth, school billing exposure, and recent privileged actions so Super Admins can act quickly without leaving the portal.'
                      )}
                    </p>
                  </div>
                </div>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:min-w-[420px]">
                  <Link to="/super-admin/users">
                    <Card className="border-border/70 transition-colors hover:border-primary/40">
                      <CardContent className="flex items-center justify-between p-4">
                        <div>
                          <div className="text-sm font-semibold">{t('super_admin.dashboard.hero.users_title', 'User lifecycle')}</div>
                          <div className="text-xs text-muted-foreground">{t('super_admin.dashboard.hero.users_subtitle', 'Reset, deactivate, and sort users by school')}</div>
                        </div>
                        <UserCog className="h-5 w-5 text-primary" />
                      </CardContent>
                    </Card>
                  </Link>
                  <Link to="/super-admin/e-registration-billing">
                    <Card className="border-border/70 transition-colors hover:border-primary/40">
                      <CardContent className="flex items-center justify-between p-4">
                        <div>
                          <div className="text-sm font-semibold">{t('super_admin.dashboard.hero.onboarding_title', 'School onboarding')}</div>
                          <div className="text-xs text-muted-foreground">{t('super_admin.dashboard.hero.onboarding_subtitle', 'Issue secure e-registration links')}</div>
                        </div>
                        <Building2 className="h-5 w-5 text-primary" />
                      </CardContent>
                    </Card>
                  </Link>
                  <Link to="/super-admin/payments">
                    <Card className="border-border/70 transition-colors hover:border-primary/40">
                      <CardContent className="flex items-center justify-between p-4">
                        <div>
                          <div className="text-sm font-semibold">{t('super_admin.dashboard.hero.payments_title', 'Payment operations')}</div>
                          <div className="text-xs text-muted-foreground">{t('super_admin.dashboard.hero.payments_subtitle', 'Verify and review manual payments')}</div>
                        </div>
                        <CreditCard className="h-5 w-5 text-primary" />
                      </CardContent>
                    </Card>
                  </Link>
                  <Link to="/super-admin/audit-logs">
                    <Card className="border-border/70 transition-colors hover:border-primary/40">
                      <CardContent className="flex items-center justify-between p-4">
                        <div>
                          <div className="text-sm font-semibold">{t('super_admin.dashboard.hero.audit_title', 'Audit review')}</div>
                          <div className="text-xs text-muted-foreground">{t('super_admin.dashboard.hero.audit_subtitle', 'Inspect privileged admin activity')}</div>
                        </div>
                        <ShieldCheck className="h-5 w-5 text-primary" />
                      </CardContent>
                    </Card>
                  </Link>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <KpiCard
              title={t('super_admin.dashboard.cards.total_users', 'Total Users')}
              value={formatNumber(overview.total_users)}
              href="/super-admin/users"
              hint={t('super_admin.dashboard.cards.users_hint', 'All platform accounts')}
              icon={<Users className="h-4 w-4" />}
            />
            <KpiCard
              title={t('common.active', 'Active')}
              value={formatNumber(overview.by_status.active)}
              href="/super-admin/users?status=active"
              hint={t('super_admin.dashboard.cards.active_hint', 'Users currently allowed to sign in')}
              icon={<ShieldCheck className="h-4 w-4" />}
            />
            <KpiCard
              title={t('common.inactive', 'Inactive')}
              value={formatNumber(overview.by_status.inactive)}
              href="/super-admin/users?status=inactive"
              hint={t('super_admin.dashboard.cards.inactive_hint', 'Accounts needing review or reactivation')}
              icon={<BellRing className="h-4 w-4" />}
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
            <KpiCard
              title={t('super_admin.dashboard.cards.schools_total', 'Schools')}
              value={formatNumber(kpis?.tenants_total)}
              href="/super-admin/schools"
              icon={<Building2 className="h-4 w-4" />}
            />
            <KpiCard
              title={t('super_admin.dashboard.cards.students_total', 'Students')}
              value={formatNumber(kpis?.students_total)}
              href="/super-admin/schools"
              hint={t('super_admin.dashboard.cards.students_hint', 'Registered across all school workspaces')}
              icon={<Users className="h-4 w-4" />}
            />
            <KpiCard
              title={t('super_admin.dashboard.cards.schools_new_30d', 'New schools (30d)')}
              value={formatNumber(kpis?.tenants_new_last_30d)}
              href="/super-admin/schools"
              icon={<Building2 className="h-4 w-4" />}
            />
            <KpiCard
              title={t('super_admin.dashboard.cards.outstanding_total', 'Outstanding')}
              value={formatAmount(kpis?.outstanding_total)}
              href="/super-admin/financial"
              hint={t('super_admin.dashboard.cards.outstanding_hint', 'Sum across all schools')}
              icon={<BarChart3 className="h-4 w-4" />}
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">{t('super_admin.dashboard.sections.platform_watch', 'Platform watch')}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 gap-3">
                  <div className="rounded-xl border bg-muted/20 p-4">
                    <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{t('super_admin.dashboard.watch.accounts', 'Accounts needing attention')}</div>
                    <div className="mt-2 flex items-end justify-between gap-3">
                      <div>
                        <div className="text-2xl font-semibold">{formatNumber(inactiveUsers)}</div>
                        <div className="text-sm text-muted-foreground">{t('super_admin.dashboard.watch.accounts_hint', 'Inactive or deactivated users')}</div>
                      </div>
                      <Button variant="outline" asChild>
                        <Link to="/super-admin/users?status=inactive">{t('super_admin.dashboard.actions.review_users', 'Review users')}</Link>
                      </Button>
                    </div>
                  </div>
                  <div className="rounded-xl border bg-muted/20 p-4">
                    <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{t('super_admin.dashboard.watch.school_health', 'School portfolio')}</div>
                    <div className="mt-2 grid grid-cols-3 gap-3 text-sm">
                      <div>
                        <div className="font-semibold">{formatNumber(activeSchools)}</div>
                        <div className="text-muted-foreground">{t('common.active', 'Active')}</div>
                      </div>
                      <div>
                        <div className="font-semibold">{formatNumber(trialSchools)}</div>
                        <div className="text-muted-foreground">{t('common.trial', 'Trial')}</div>
                      </div>
                      <div>
                        <div className="font-semibold">{formatNumber(suspendedSchools)}</div>
                        <div className="text-muted-foreground">{t('common.suspended', 'Suspended')}</div>
                      </div>
                    </div>
                  </div>
                  <div className="rounded-xl border bg-muted/20 p-4">
                    <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{t('super_admin.dashboard.watch.activity', 'Recent privileged actions')}</div>
                    <div className="mt-2 flex items-end justify-between gap-3">
                      <div>
                        <div className="text-2xl font-semibold">{formatNumber(recentAudit.length)}</div>
                        <div className="text-sm text-muted-foreground">{t('super_admin.dashboard.watch.activity_hint', 'Most recent Super Admin audit entries')}</div>
                      </div>
                      <Button variant="outline" asChild>
                        <Link to="/super-admin/audit-logs">{t('super_admin.dashboard.actions.audit_logs', 'Audit logs')}</Link>
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">{t('super_admin.dashboard.sections.financial_snapshot', 'Financial snapshot')}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="rounded-xl border border-primary/20 bg-primary/5 p-3 text-xs text-muted-foreground">
                  {t(
                    'super_admin.dashboard.financial_note',
                    'Blended totals combine legacy platform billing and school subscription billing so platform finance exposure is visible from one dashboard.'
                  )}
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">{t('super_admin.financial.cards.total_invoiced', 'Total Invoiced')}</span>
                  <span className="font-semibold">{formatAmount(financial?.invoice_total)}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">{t('super_admin.financial.cards.total_paid', 'Total Paid')}</span>
                  <span className="font-semibold">{formatAmount(financial?.payment_total)}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">{t('super_admin.financial.cards.outstanding', 'Outstanding')}</span>
                  <span className="font-semibold">{formatAmount(financial?.outstanding_total)}</span>
                </div>
                <div className="grid grid-cols-1 gap-2 pt-1">
                  {financialSourceCards.map((item) => (
                    <Link key={item.key} to={item.href} className="rounded-xl border p-3 transition-colors hover:border-primary/40">
                      <div className="flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <div className="text-sm font-medium">{item.title}</div>
                          <div className="text-xs text-muted-foreground">
                            {t('super_admin.dashboard.financial_item', 'Invoiced {{invoice}} • Paid {{payment}}', {
                              invoice: formatAmount(item.invoice),
                              payment: formatAmount(item.payment),
                            })}
                          </div>
                        </div>
                        <ArrowRight className="h-4 w-4 text-muted-foreground" />
                      </div>
                    </Link>
                  ))}
                </div>
                <div className="pt-2">
                  <Link to="/super-admin/financial" className="text-sm text-blue-600 hover:underline">
                    {t('super_admin.dashboard.actions.view_financial_details', 'View financial details')}
                  </Link>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">{t('super_admin.dashboard.sections.growth_mix', 'Growth mix')}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <div className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">{t('super_admin.dashboard.sections.top_plans', 'Top plans')}</div>
                  <div className="flex flex-wrap gap-2">
                    {planEntries.length === 0 ? (
                      <div className="text-sm text-muted-foreground">—</div>
                    ) : (
                      planEntries.map(([plan, count]) => (
                        <Badge key={plan} variant="secondary">{plan}: {count}</Badge>
                      ))
                    )}
                  </div>
                </div>
                <div>
                  <div className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">{t('super_admin.dashboard.sections.top_countries', 'Top countries')}</div>
                  <div className="flex flex-wrap gap-2">
                    {countryEntries.length === 0 ? (
                      <div className="text-sm text-muted-foreground">—</div>
                    ) : (
                      countryEntries.map(([country, count]) => (
                        <Badge key={country} variant="outline">{country}: {count}</Badge>
                      ))
                    )}
                  </div>
                </div>
                <div>
                  <div className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">{t('super_admin.dashboard.sections.users_by_role', 'Users by role')}</div>
                  <div className="space-y-2">
                    {roleEntries.length === 0 ? (
                      <div className="text-sm text-muted-foreground">—</div>
                    ) : (
                      roleEntries.map(([role, count]) => (
                        <div key={role} className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">{role}</span>
                          <span className="font-medium">{count}</span>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="lg:col-span-2">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-base">{t('super_admin.dashboard.sections.management_shortcuts', 'Management shortcuts')}</CardTitle>
                <Link to="/super-admin/schools" className="text-sm text-blue-600 hover:underline">
                  {t('super_admin.dashboard.actions.manage_schools', 'Manage schools')}
                </Link>
              </CardHeader>
              <CardContent className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <Link to="/super-admin/users" className="rounded-xl border p-4 transition-colors hover:border-primary/40">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-sm font-semibold">{t('super_admin.dashboard.actions.manage_users', 'Users')}</div>
                      <div className="mt-1 text-xs text-muted-foreground">{t('super_admin.dashboard.shortcuts.users', 'Manage accounts by role, status, and school workspace.')}</div>
                    </div>
                    <UserCog className="h-5 w-5 text-primary" />
                  </div>
                </Link>
                <Link to="/super-admin/e-registration-billing" className="rounded-xl border p-4 transition-colors hover:border-primary/40">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-sm font-semibold">{t('super_admin.dashboard.actions.registration_links', 'E-registration')}</div>
                      <div className="mt-1 text-xs text-muted-foreground">{t('super_admin.dashboard.shortcuts.registration', 'Issue secure onboarding links for new schools and admin owners.')}</div>
                    </div>
                    <Building2 className="h-5 w-5 text-primary" />
                  </div>
                </Link>
                <Link to="/super-admin/payments" className="rounded-xl border p-4 transition-colors hover:border-primary/40">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-sm font-semibold">{t('super_admin.dashboard.actions.payments', 'Payments')}</div>
                      <div className="mt-1 text-xs text-muted-foreground">{t('super_admin.dashboard.shortcuts.payments', 'Review pending payment operations and verification queues.')}</div>
                    </div>
                    <Landmark className="h-5 w-5 text-primary" />
                  </div>
                </Link>
                <Link to="/super-admin/plan-requests" className="rounded-xl border p-4 transition-colors hover:border-primary/40">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-sm font-semibold">{t('super_admin.dashboard.actions.plan_requests', 'Plan requests')}</div>
                      <div className="mt-1 text-xs text-muted-foreground">{t('super_admin.dashboard.shortcuts.plan_requests', 'Review downgrade requests and pricing-impact decisions.')}</div>
                    </div>
                    <ClipboardList className="h-5 w-5 text-primary" />
                  </div>
                </Link>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-base">{t('super_admin.dashboard.sections.billing_health', 'Billing health')}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="rounded-xl border bg-muted/20 p-4">
                  <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{t('super_admin.dashboard.billing_health.invoices', 'Invoices tracked')}</div>
                  <div className="mt-2 text-2xl font-semibold">{formatNumber(kpis?.invoices_count)}</div>
                </div>
                <div className="rounded-xl border bg-muted/20 p-4">
                  <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{t('super_admin.dashboard.billing_health.paid', 'Paid invoices')}</div>
                  <div className="mt-2 text-2xl font-semibold">{formatNumber(kpis?.invoices_paid_count)}</div>
                </div>
                <div className="rounded-xl border bg-muted/20 p-4">
                  <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{t('super_admin.dashboard.billing_health.sent', 'Sent invoices')}</div>
                  <div className="mt-2 text-2xl font-semibold">{formatNumber(kpis?.invoices_sent_count)}</div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base">{t('super_admin.dashboard.sections.recent_activity', 'Recent activity')}</CardTitle>
              <Link to="/super-admin/audit-logs" className="text-sm text-blue-600 hover:underline">
                {t('super_admin.dashboard.actions.view_all_audit_logs', 'View all audit logs')}
              </Link>
            </CardHeader>
            <CardContent>
              {overview.recent_audit.length === 0 ? (
                <div className="text-sm text-muted-foreground">{t('super_admin.dashboard.empty.recent_activity', 'No Super Admin events yet.')}</div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {overview.recent_audit.map((ev) => (
                    <div key={ev.id} className="rounded-md border p-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="text-sm font-medium truncate">{ev.event_type}</div>
                          <div className="text-xs text-muted-foreground">{formatIso(ev.created_at || null)}</div>
                        </div>
                        {typeof ev.actor_user_id === 'number' ? (
                          <Badge variant="outline" className="border-slate-200 bg-white text-slate-700">
                            actor:{ev.actor_user_id}
                          </Badge>
                        ) : null}
                      </div>
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {pickDetailsSummary(ev.details as any).map((p) => (
                          <Badge key={p.k} variant="secondary">
                            {p.k}: {p.v}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </>
      ) : null}
    </div>
  )
}

export default SuperAdminDashboardPage
