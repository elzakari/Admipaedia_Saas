import React, { useEffect, useState } from 'react'
import { BarChart3 } from 'lucide-react'
import type { AxiosError } from 'axios'

import { SaasShell, platformNav } from './SaasShell'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useToast } from '@/components/ui/use-toast'
import saasService, { PlatformFinancialSummary } from '@/services/saasService'
import { PlatformFinancialTabs } from './PlatformFinancialTabs'

export default function PlatformFinancialPage() {
  const { toast } = useToast()
  const [summary, setSummary] = useState<PlatformFinancialSummary | null>(null)
  const [loading, setLoading] = useState(false)

  async function load() {
    setLoading(true)
    try {
      const res = await saasService.platformFinancialSummary()
      setSummary(res.summary)
    } catch (err: unknown) {
      const e = err as AxiosError<{ message?: string }>
      toast({
        variant: 'destructive',
        title: 'Failed to load financial summary',
        description: e.response?.data?.message || e.message || 'Please try again'
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  return (
    <SaasShell title="Financial Oversight" nav={platformNav} showTenantSwitcher={false}>
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="border-slate-200 rounded-2xl">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-slate-500" />
                Total Invoiced
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-black text-slate-900">{loading || !summary ? '—' : summary.invoice_total.toFixed(2)}</div>
              <div className="text-xs text-slate-500">Across all schools</div>
            </CardContent>
          </Card>

          <Card className="border-slate-200 rounded-2xl">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-slate-500" />
                Total Paid
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-black text-slate-900">{loading || !summary ? '—' : summary.payment_total.toFixed(2)}</div>
              <div className="text-xs text-slate-500">Across all schools</div>
            </CardContent>
          </Card>

          <Card className="border-slate-200 rounded-2xl">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-slate-500" />
                Outstanding
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-black text-slate-900">{loading || !summary ? '—' : summary.outstanding_total.toFixed(2)}</div>
              <div className="text-xs text-slate-500">Invoice total minus payments</div>
            </CardContent>
          </Card>
        </div>

        <PlatformFinancialTabs summary={summary} loading={loading} onRefresh={load} />
      </div>
    </SaasShell>
  )
}
