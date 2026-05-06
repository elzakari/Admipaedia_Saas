import React, { useMemo } from 'react'
import { RefreshCcw } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import type { PlatformFinancialSummary } from '@/services/saasService'

import { PlatformFinancialBySchoolTab } from './PlatformFinancialBySchoolTab'
import { PlatformFinancialInvoicesTab } from './PlatformFinancialInvoicesTab'
import { PlatformFinancialPaymentsTab } from './PlatformFinancialPaymentsTab'

export function PlatformFinancialTabs({
  summary,
  loading,
  onRefresh
}: {
  summary: PlatformFinancialSummary | null
  loading: boolean
  onRefresh: () => Promise<void>
}) {
  const byTenant = useMemo(() => summary?.by_tenant || [], [summary])

  return (
    <Card className="border-slate-200 rounded-2xl">
      <CardHeader>
        <div className="flex items-center justify-between gap-3">
          <CardTitle className="text-slate-900">Financial overview</CardTitle>
          <Button variant="outline" className="bg-white" onClick={onRefresh} disabled={loading}>
            <RefreshCcw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="schools">
          <TabsList>
            <TabsTrigger value="schools">By school</TabsTrigger>
            <TabsTrigger value="invoices">Invoices</TabsTrigger>
            <TabsTrigger value="payments">Payments</TabsTrigger>
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
  )
}
