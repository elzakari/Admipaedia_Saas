import React, { useEffect, useState } from 'react'
import { Download } from 'lucide-react'
import type { AxiosError } from 'axios'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { useToast } from '@/components/ui/use-toast'
import saasService, { Pagination, PlatformPayment } from '@/services/saasService'
import { downloadCsv } from './platformCsv'

export function PlatformFinancialPaymentsTab() {
  const { toast } = useToast()
  const [items, setItems] = useState<PlatformPayment[]>([])
  const [pagination, setPagination] = useState<Pagination | null>(null)
  const [page, setPage] = useState(1)
  const [method, setMethod] = useState('all')
  const [query, setQuery] = useState('')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')

  async function load(nextPage?: number) {
    const p = nextPage || page
    try {
      const res = await saasService.platformListPayments({
        method: method === 'all' ? undefined : method,
        q: query.trim() || undefined,
        from: from || undefined,
        to: to || undefined,
        page: p,
        per_page: 25
      })
      setItems(res.items)
      setPagination(res.pagination)
      setPage(res.pagination.current_page)
    } catch (err: unknown) {
      const e = err as AxiosError<{ message?: string }>
      toast({
        variant: 'destructive',
        title: 'Failed to load payments',
        description: e.response?.data?.message || e.message || 'Please try again'
      })
    }
  }

  useEffect(() => {
    load(1)
  }, [])

  return (
    <div>
      <div className="grid grid-cols-1 md:grid-cols-5 gap-3 pb-4">
        <div className="md:col-span-2 space-y-2">
          <Label>Search</Label>
          <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Reference or method" />
        </div>
        <div className="space-y-2">
          <Label>Method</Label>
          <Select value={method} onValueChange={setMethod}>
            <SelectTrigger><SelectValue placeholder="All" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="bank">bank</SelectItem>
              <SelectItem value="cash">cash</SelectItem>
              <SelectItem value="card">card</SelectItem>
              <SelectItem value="transfer">transfer</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>From</Label>
          <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label>To</Label>
          <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
        </div>
      </div>

      <div className="flex items-center justify-between pb-3 gap-2">
        <div className="text-xs text-muted-foreground">Showing {items.length} / {pagination?.total ?? '—'}</div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => load(1)}>Apply</Button>
          <Button
            variant="outline"
            onClick={() => {
              downloadCsv(
                'platform_payments.csv',
                items.map((p) => ({
                  tenant: p.tenant_name || p.tenant_id,
                  invoice_number: p.invoice_number || '',
                  amount: p.amount,
                  currency: p.currency,
                  method: p.method || '',
                  reference: p.reference || '',
                  paid_on: p.paid_on,
                  created_at: p.created_at || ''
                }))
              )
            }}
            disabled={items.length === 0}
          >
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
        </div>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>School</TableHead>
            <TableHead>Paid on</TableHead>
            <TableHead>Method</TableHead>
            <TableHead className="text-right">Amount</TableHead>
            <TableHead>Reference</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((p) => (
            <TableRow key={p.id}>
              <TableCell className="font-medium">{p.tenant_name || '—'}</TableCell>
              <TableCell className="text-xs">{p.paid_on}</TableCell>
              <TableCell className="text-xs">{p.method || '—'}</TableCell>
              <TableCell className="text-right">{p.amount.toFixed(2)} {p.currency}</TableCell>
              <TableCell className="text-xs text-muted-foreground truncate max-w-[16rem]">{p.reference || '—'}</TableCell>
            </TableRow>
          ))}
          {items.length === 0 && (
            <TableRow>
              <TableCell colSpan={5} className="text-sm text-muted-foreground">No payments found.</TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>

      <div className="flex items-center justify-between pt-3">
        <div className="text-xs text-muted-foreground">Page {pagination?.current_page ?? page} / {pagination?.total_pages ?? '—'}</div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            disabled={!(pagination && pagination.current_page > 1)}
            onClick={() => load((pagination?.current_page || 1) - 1)}
          >
            Prev
          </Button>
          <Button
            variant="outline"
            disabled={!(pagination && pagination.current_page < pagination.total_pages)}
            onClick={() => load((pagination?.current_page || 1) + 1)}
          >
            Next
          </Button>
        </div>
      </div>
    </div>
  )
}
