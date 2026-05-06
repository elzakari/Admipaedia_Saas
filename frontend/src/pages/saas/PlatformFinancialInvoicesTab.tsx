import React, { useEffect, useState } from 'react'
import { Download } from 'lucide-react'
import type { AxiosError } from 'axios'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { useToast } from '@/components/ui/use-toast'
import saasService, { Pagination, PlatformInvoice } from '@/services/saasService'
import { downloadCsv } from './platformCsv'

export function PlatformFinancialInvoicesTab() {
  const { toast } = useToast()
  const [items, setItems] = useState<PlatformInvoice[]>([])
  const [pagination, setPagination] = useState<Pagination | null>(null)
  const [page, setPage] = useState(1)
  const [status, setStatus] = useState('all')
  const [query, setQuery] = useState('')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')

  async function load(nextPage?: number) {
    const p = nextPage || page
    try {
      const res = await saasService.platformListInvoices({
        status: status === 'all' ? undefined : status,
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
        title: 'Failed to load invoices',
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
          <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Invoice number" />
        </div>
        <div className="space-y-2">
          <Label>Status</Label>
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger><SelectValue placeholder="All" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="draft">draft</SelectItem>
              <SelectItem value="sent">sent</SelectItem>
              <SelectItem value="paid">paid</SelectItem>
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
                'platform_invoices.csv',
                items.map((i) => ({
                  tenant: i.tenant_name || i.tenant_id,
                  invoice_number: i.invoice_number,
                  status: i.status,
                  amount: i.amount,
                  currency: i.currency,
                  issued_on: i.issued_on,
                  due_on: i.due_on || '',
                  created_at: i.created_at || ''
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
            <TableHead>Invoice</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Amount</TableHead>
            <TableHead className="text-right">Issued</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((i) => (
            <TableRow key={i.id}>
              <TableCell className="font-medium">{i.tenant_name || '—'}</TableCell>
              <TableCell>{i.invoice_number}</TableCell>
              <TableCell className="text-xs">{i.status}</TableCell>
              <TableCell className="text-right">{i.amount.toFixed(2)} {i.currency}</TableCell>
              <TableCell className="text-right text-xs text-muted-foreground">{i.issued_on}</TableCell>
            </TableRow>
          ))}
          {items.length === 0 && (
            <TableRow>
              <TableCell colSpan={5} className="text-sm text-muted-foreground">No invoices found.</TableCell>
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
