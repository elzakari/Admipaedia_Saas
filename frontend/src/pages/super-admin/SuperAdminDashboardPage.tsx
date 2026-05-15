import React, { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { BarChart3, Building2, ClipboardList, CreditCard, RefreshCcw, Settings, ShieldCheck, Users } from 'lucide-react'

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
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <KpiCard
              title={t('super_admin.dashboard.cards.total_users', 'Total Users')}
              value={overview.total_users}
              href="/super-admin/users"
              icon={<Users className="h-4 w-4" />}
            />
            <KpiCard
              title={t('common.active', 'Active')}
              value={overview.by_status.active}
              href="/super-admin/users?status=active"
              icon={<ShieldCheck className="h-4 w-4" />}
            />
            <KpiCard
              title={t('common.inactive', 'Inactive')}
              value={overview.by_status.inactive}
              href="/super-admin/users?status=inactive"
              icon={<Users className="h-4 w-4" />}
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
            <KpiCard
              title={t('super_admin.dashboard.cards.schools_total', 'Schools')}
              value={kpis?.tenants_total ?? '—'}
              href="/super-admin/schools"
              icon={<Building2 className="h-4 w-4" />}
            />
            <KpiCard
              title={t('super_admin.dashboard.cards.schools_new_30d', 'New schools (30d)')}
              value={kpis?.tenants_new_last_30d ?? '—'}
              href="/super-admin/schools"
              icon={<Building2 className="h-4 w-4" />}
            />
            <KpiCard
              title={t('super_admin.dashboard.cards.invoices_count', 'Invoices')}
              value={kpis?.invoices_count ?? '—'}
              href="/super-admin/financial"
              icon={<ClipboardList className="h-4 w-4" />}
            />
            <KpiCard
              title={t('super_admin.dashboard.cards.outstanding_total', 'Outstanding')}
              value={typeof kpis?.outstanding_total === 'number' ? kpis.outstanding_total.toFixed(2) : '—'}
              href="/super-admin/financial"
              hint={t('super_admin.dashboard.cards.outstanding_hint', 'Sum across all schools')}
              icon={<BarChart3 className="h-4 w-4" />}
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">{t('super_admin.dashboard.sections.quick_actions', 'Quick actions')}</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-wrap gap-2">
                <Link to="/super-admin/users">
                  <Button variant="outline">
                    <Users className="h-4 w-4 mr-2" />
                    {t('super_admin.dashboard.actions.manage_users', 'Users')}
                  </Button>
                </Link>
                <Link to="/super-admin/schools">
                  <Button variant="outline">
                    <Building2 className="h-4 w-4 mr-2" />
                    {t('super_admin.dashboard.actions.manage_schools', 'Schools')}
                  </Button>
                </Link>
                <Link to="/super-admin/financial">
                  <Button variant="outline">
                    <BarChart3 className="h-4 w-4 mr-2" />
                    {t('super_admin.dashboard.actions.financial', 'Financial')}
                  </Button>
                </Link>
                <Link to="/super-admin/payments">
                  <Button variant="outline">
                    <CreditCard className="h-4 w-4 mr-2" />
                    {t('super_admin.dashboard.actions.payments', 'Payments')}
                  </Button>
                </Link>
                <Link to="/super-admin/plan-requests">
                  <Button variant="outline">
                    <ClipboardList className="h-4 w-4 mr-2" />
                    {t('super_admin.dashboard.actions.plan_requests', 'Plan requests')}
                  </Button>
                </Link>
                <Link to="/super-admin/audit-logs">
                  <Button variant="outline">
                    <ShieldCheck className="h-4 w-4 mr-2" />
                    {t('super_admin.dashboard.actions.audit_logs', 'Audit logs')}
                  </Button>
                </Link>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">{t('super_admin.dashboard.sections.financial_snapshot', 'Financial snapshot')}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">{t('super_admin.financial.cards.total_invoiced', 'Total Invoiced')}</span>
                  <span className="font-semibold">{financial ? financial.invoice_total.toFixed(2) : '—'}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">{t('super_admin.financial.cards.total_paid', 'Total Paid')}</span>
                  <span className="font-semibold">{financial ? financial.payment_total.toFixed(2) : '—'}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">{t('super_admin.financial.cards.outstanding', 'Outstanding')}</span>
                  <span className="font-semibold">{financial ? financial.outstanding_total.toFixed(2) : '—'}</span>
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
                <CardTitle className="text-base">{t('super_admin.dashboard.sections.users_by_role', 'Users by role')}</CardTitle>
              </CardHeader>
              <CardContent>
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
