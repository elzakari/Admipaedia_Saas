import React, { useEffect, useMemo, useState } from 'react'
import type { AxiosError } from 'axios'
import { BarChart3, RefreshCcw } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useToast } from '@/components/ui/use-toast'
import saasService, { PlatformFinancialSummary } from '@/services/saasService'
import { PlatformFinancialBySchoolTab } from '@/pages/saas/PlatformFinancialBySchoolTab'
import { PlatformFinancialInvoicesTab } from '@/pages/saas/PlatformFinancialInvoicesTab'
import { PlatformFinancialPaymentsTab } from '@/pages/saas/PlatformFinancialPaymentsTab'

export default function SuperAdminFinancialInsightsPage() {
  const { t } = useTranslation()
  const { toast } = useToast()
  const [summary, setSummary] = useState<PlatformFinancialSummary | null>(null)
  const [loading, setLoading] = useState(false)

  const byTenant = useMemo(() => summary?.by_tenant || [], [summary])

  async function load() {
    setLoading(true)
    try {
      const res = await saasService.platformFinancialSummary()
      setSummary(res.summary)
    } catch (err: unknown) {
      const e = err as AxiosError<{ message?: string }>
      toast({
        variant: 'destructive',
        title: t('super_admin.financial.errors.load_failed', 'Failed to load financial summary'),
        description: e.response?.data?.message || e.message || t('super_admin.financial.errors.try_again', 'Please try again')
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold">{t('super_admin.financial.title', 'Financial Insights')}</h1>
          <p className="text-sm text-muted-foreground">{t('super_admin.financial.subtitle', 'Platform-wide invoicing, payments, and outstanding balances.')}</p>
        </div>
        <Button variant="outline" onClick={load} disabled={loading}>
          <RefreshCcw className="h-4 w-4 mr-2" />
          {t('common.refresh', 'Refresh')}
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
              {t('super_admin.financial.cards.total_invoiced', 'Total Invoiced')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold">{loading || !summary ? '—' : summary.invoice_total.toFixed(2)}</div>
            <div className="text-xs text-muted-foreground">{t('super_admin.financial.cards.across_all_schools', 'Across all schools')}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
              {t('super_admin.financial.cards.total_paid', 'Total Paid')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold">{loading || !summary ? '—' : summary.payment_total.toFixed(2)}</div>
            <div className="text-xs text-muted-foreground">{t('super_admin.financial.cards.across_all_schools', 'Across all schools')}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
              {t('super_admin.financial.cards.outstanding', 'Outstanding')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold">{loading || !summary ? '—' : summary.outstanding_total.toFixed(2)}</div>
            <div className="text-xs text-muted-foreground">{t('super_admin.financial.cards.outstanding_hint', 'Invoice total minus payments')}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t('super_admin.financial.sections.overview', 'Financial overview')}</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="schools">
            <TabsList>
              <TabsTrigger value="schools">{t('super_admin.financial.tabs.by_school', 'By school')}</TabsTrigger>
              <TabsTrigger value="invoices">{t('super_admin.financial.tabs.invoices', 'Invoices')}</TabsTrigger>
              <TabsTrigger value="payments">{t('super_admin.financial.tabs.payments', 'Payments')}</TabsTrigger>
            </TabsList>

            <TabsContent value="schools">
              <PlatformFinancialBySchoolTab items={byTenant} loading={loading} />
            </TabsContent>
            <TabsContent value="invoices">
              <PlatformFinancialInvoicesTab />
            </TabsContent>
            <TabsContent value="payments">
              <PlatformFinancialPaymentsTab />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  )
}

