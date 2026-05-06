import React from 'react'
import { Download } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { downloadCsv } from './platformCsv'

export function PlatformFinancialBySchoolTab({
  items,
  loading
}: {
  items: Array<{ tenant_id: string; tenant_name: string; invoice_total: number; payment_total: number }>
  loading: boolean
}) {
  return (
    <div>
      <div className="flex items-center justify-end pb-3">
        <Button
          variant="outline"
          onClick={() => {
            downloadCsv(
              'platform_by_school.csv',
              items.map((t) => ({
                school: t.tenant_name,
                invoiced: t.invoice_total,
                paid: t.payment_total
              }))
            )
          }}
          disabled={items.length === 0}
        >
          <Download className="h-4 w-4 mr-2" />
          Export CSV
        </Button>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>School</TableHead>
            <TableHead className="text-right">Invoiced</TableHead>
            <TableHead className="text-right">Paid</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((t) => (
            <TableRow key={t.tenant_id}>
              <TableCell className="font-medium">{t.tenant_name}</TableCell>
              <TableCell className="text-right">{t.invoice_total.toFixed(2)}</TableCell>
              <TableCell className="text-right">{t.payment_total.toFixed(2)}</TableCell>
            </TableRow>
          ))}
          {!loading && items.length === 0 && (
            <TableRow>
              <TableCell colSpan={3} className="text-sm text-muted-foreground">No data yet.</TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  )
}
