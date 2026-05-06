import React, { useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card'
import { Button } from '../ui/button'
import { Badge } from '../ui/badge'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../ui/dialog'
import { Input } from '../ui/input'
import { Label } from '../ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select'
import { Download, PlusCircle } from 'lucide-react'
import { toast } from 'sonner'
import { feesService, FeePayment } from '../../services/feesService'

const PaymentHistoryTable: React.FC = () => {
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [recordOpen, setRecordOpen] = useState(false)
  const [form, setForm] = useState({
    fee_record_id: '',
    amount: '',
    payment_method: 'cash',
    reference_number: '',
    payment_date: new Date().toISOString().slice(0, 10)
  })

  const { data: paymentsResp, isLoading } = useQuery({
    queryKey: ['fees', 'payments'],
    queryFn: () => feesService.getPayments({ page: 1, per_page: 200 })
  })

  const { data: recordsResp } = useQuery({
    queryKey: ['fees', 'records'],
    queryFn: () => feesService.getFeeRecords({ page: 1, per_page: 200 })
  })

  const payments = useMemo(() => {
    const list = paymentsResp?.payments
    if (!Array.isArray(list)) return []
    const q = search.trim().toLowerCase()
    if (!q) return list as FeePayment[]
    return (list as FeePayment[]).filter((p) => {
      const name = (p.student_name || '').toLowerCase()
      const ref = (p.reference_number || '').toLowerCase()
      return name.includes(q) || ref.includes(q) || String(p.id).includes(q)
    })
  }, [paymentsResp?.payments, search])

  const records = useMemo(() => {
    const list = recordsResp?.fee_records
    return Array.isArray(list) ? list : []
  }, [recordsResp?.fee_records])

  const exportCsv = (filename: string, rows: Array<Record<string, any>>) => {
    const headers = Array.from(new Set(rows.flatMap((r) => Object.keys(r))))
    const escape = (v: any) => {
      const s = v === null || v === undefined ? '' : String(v)
      const needs = /[",\n]/.test(s)
      const escaped = s.replace(/"/g, '""')
      return needs ? `"${escaped}"` : escaped
    }
    const csv = [headers.join(','), ...rows.map((r) => headers.map((h) => escape((r as any)[h])).join(','))].join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    a.click()
    URL.revokeObjectURL(url)
  }

  useEffect(() => {
    const onExport = (e: any) => {
      if (e?.detail?.tab !== 'payments') return
      exportCsv('fee_payments.csv', payments.map((p) => ({
        id: p.id,
        student: p.student_name || '',
        amount: p.amount,
        method: p.payment_method,
        reference: p.reference_number || '',
        date: p.payment_date || ''
      })))
      toast.success('Exported payments')
    }
    window.addEventListener('fees:export', onExport)
    return () => window.removeEventListener('fees:export', onExport)
  }, [payments])

  useEffect(() => {
    const onCreate = (e: any) => {
      if (e?.detail?.tab !== 'payments') return
      setForm({
        fee_record_id: '',
        amount: '',
        payment_method: 'cash',
        reference_number: '',
        payment_date: new Date().toISOString().slice(0, 10)
      })
      setRecordOpen(true)
    }
    window.addEventListener('fees:create', onCreate)
    return () => window.removeEventListener('fees:create', onCreate)
  }, [])

  const recordMutation = useMutation({
    mutationFn: async () => {
      const fee_record_id = Number(form.fee_record_id)
      const amount = Number(form.amount)
      if (!fee_record_id || !Number.isFinite(amount) || amount <= 0) throw new Error('Fee record and amount are required')
      return feesService.recordPayment({
        fee_record_id,
        amount,
        payment_method: form.payment_method,
        reference_number: form.reference_number || undefined,
        payment_date: form.payment_date
      })
    },
    onSuccess: () => {
      toast.success('Payment recorded')
      queryClient.invalidateQueries({ queryKey: ['fees', 'payments'] })
      queryClient.invalidateQueries({ queryKey: ['fees', 'records'] })
      setRecordOpen(false)
    },
    onError: (e: any) => toast.error(e?.message || e?.response?.data?.message || 'Failed to record payment')
  })

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-3">
          <CardTitle className="text-lg font-semibold">Payments</CardTitle>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              className="h-8"
              onClick={() => {
                exportCsv('fee_payments.csv', payments.map((p) => ({
                  id: p.id,
                  student: p.student_name || '',
                  amount: p.amount,
                  method: p.payment_method,
                  reference: p.reference_number || '',
                  date: p.payment_date || ''
                })))
                toast.success('Exported payments')
              }}
            >
              <Download className="h-4 w-4 mr-2" /> Export
            </Button>
            <Button size="sm" className="h-8 bg-indigo-600 hover:bg-indigo-700" onClick={() => { setRecordOpen(true) }}>
              <PlusCircle className="h-4 w-4 mr-2" /> Record
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="mb-4">
          <Input placeholder="Search by student or reference" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>

        <div className="border rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Student</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Method</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Reference</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Date</th>
                <th className="px-4 py-3 text-right font-medium text-gray-600">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {isLoading ? (
                <tr><td colSpan={5} className="px-4 py-6 text-center text-gray-500">Loading…</td></tr>
              ) : payments.length === 0 ? (
                <tr><td colSpan={5} className="px-4 py-6 text-center text-gray-500">No payments found.</td></tr>
              ) : (
                payments.map((p) => (
                  <tr key={p.id}>
                    <td className="px-4 py-3 font-medium">{p.student_name || `Student ${p.student_id || ''}`}</td>
                    <td className="px-4 py-3">{p.payment_method}</td>
                    <td className="px-4 py-3">{p.reference_number || '—'}</td>
                    <td className="px-4 py-3">{p.payment_date || '—'}</td>
                    <td className="px-4 py-3 text-right">
                      <Badge className="bg-emerald-100 text-emerald-800">{p.amount}</Badge>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <Dialog open={recordOpen} onOpenChange={setRecordOpen}>
          <DialogContent className="max-w-xl">
            <DialogHeader>
              <DialogTitle>Record payment</DialogTitle>
              <DialogDescription>Attach a payment to a specific fee record.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Fee record</Label>
                <Select value={form.fee_record_id} onValueChange={(v) => setForm((p) => ({ ...p, fee_record_id: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select fee record" /></SelectTrigger>
                  <SelectContent>
                    {records.map((r: any) => {
                      const name = `${r.student?.first_name || ''} ${r.student?.last_name || ''}`.trim() || `Student ${r.student_id}`
                      const label = `#${r.id} • ${name} • ${r.structure?.fee_category || ''} • Bal ${r.balance}`
                      return (
                        <SelectItem key={r.id} value={String(r.id)}>{label}</SelectItem>
                      )
                    })}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Amount</Label>
                  <Input type="number" value={form.amount} onChange={(e) => setForm((p) => ({ ...p, amount: e.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label>Date</Label>
                  <Input type="date" value={form.payment_date} onChange={(e) => setForm((p) => ({ ...p, payment_date: e.target.value }))} />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Method</Label>
                  <Select value={form.payment_method} onValueChange={(v) => setForm((p) => ({ ...p, payment_method: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cash">cash</SelectItem>
                      <SelectItem value="bank_transfer">bank_transfer</SelectItem>
                      <SelectItem value="card">card</SelectItem>
                      <SelectItem value="mobile_money">mobile_money</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Reference</Label>
                  <Input value={form.reference_number} onChange={(e) => setForm((p) => ({ ...p, reference_number: e.target.value }))} placeholder="Optional" />
                </div>
              </div>
            </div>
            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={() => setRecordOpen(false)}>Cancel</Button>
              <Button className="bg-indigo-600 hover:bg-indigo-700" disabled={recordMutation.isPending} onClick={() => recordMutation.mutate()}>
                Save
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  )
}

export default PaymentHistoryTable
