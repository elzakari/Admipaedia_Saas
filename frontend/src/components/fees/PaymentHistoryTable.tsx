import React, { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
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
  const { t } = useTranslation()
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
      toast.success(t('admin_fees.exported_payments', 'Exported payments'))
    }
    window.addEventListener('fees:export', onExport)
    return () => window.removeEventListener('fees:export', onExport)
  }, [payments, t])

  useEffect(() => {
    const onCreate = (e: any) => {
      if (e?.detail?.tab !== 'payments') return
      setForm({
        fee_record_id: e?.detail?.feeRecordId ? String(e.detail.feeRecordId) : '',
        amount: e?.detail?.amount ? String(e.detail.amount) : '',
        payment_method: 'cash',
        reference_number: '',
        payment_date: new Date().toISOString().slice(0, 10)
      })
      setRecordOpen(true)
    }
    window.addEventListener('fees:create', onCreate)
    return () => window.removeEventListener('fees:create', onCreate)
  }, [])

  useEffect(() => {
    const onNavigate = (e: any) => {
      if (e?.detail?.tab !== 'payments') return
      if (!e?.detail?.feeRecordId && !e?.detail?.type) return
      setForm({
        fee_record_id: e?.detail?.feeRecordId ? String(e.detail.feeRecordId) : '',
        amount: e?.detail?.amount ? String(e.detail.amount) : '',
        payment_method: 'cash',
        reference_number: '',
        payment_date: new Date().toISOString().slice(0, 10)
      })
      if (e?.detail?.type === 'create' || e?.detail?.feeRecordId) {
        setRecordOpen(true)
      }
    }
    window.addEventListener('fees:navigate', onNavigate)
    return () => window.removeEventListener('fees:navigate', onNavigate)
  }, [])

  const recordMutation = useMutation({
    mutationFn: async () => {
      const fee_record_id = Number(form.fee_record_id)
      const amount = Number(form.amount)
      if (!fee_record_id || !Number.isFinite(amount) || amount <= 0) throw new Error(t('admin_fees.record_amount_required', 'Fee record and amount are required'))
      return feesService.recordPayment({
        fee_record_id,
        amount,
        payment_method: form.payment_method,
        reference_number: form.reference_number || undefined,
        payment_date: form.payment_date
      })
    },
    onSuccess: () => {
      toast.success(t('admin_fees.payment_recorded', 'Payment recorded'))
      queryClient.invalidateQueries({ queryKey: ['fees', 'payments'] })
      queryClient.invalidateQueries({ queryKey: ['fees', 'records'] })
      setRecordOpen(false)
    },
    onError: (e: any) => toast.error(e?.message || e?.response?.data?.message || t('admin_fees.failed_record_payment', 'Failed to record payment'))
  })

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-3">
          <CardTitle className="text-lg font-semibold">{t('admin_fees.payments', 'Payments')}</CardTitle>
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
                toast.success(t('admin_fees.exported_payments', 'Exported payments'))
              }}
            >
              <Download className="h-4 w-4 mr-2" /> {t('common.export', 'Export')}
            </Button>
            <Button size="sm" className="h-8 bg-indigo-600 hover:bg-indigo-700" onClick={() => { setRecordOpen(true) }}>
              <PlusCircle className="h-4 w-4 mr-2" /> {t('common.record', 'Record')}
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="mb-4">
          <Input placeholder={t('admin_fees.search_payments', 'Search by student or reference')} value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>

        <div className="border rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-gray-600">{t('admin_fees.student', 'Student')}</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">{t('admin_fees.method', 'Method')}</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">{t('admin_fees.reference', 'Reference')}</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">{t('admin_fees.date', 'Date')}</th>
                <th className="px-4 py-3 text-right font-medium text-gray-600">{t('admin_fees.amount', 'Amount')}</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {isLoading ? (
                <tr><td colSpan={5} className="px-4 py-6 text-center text-gray-500">{t('common.loading', 'Loading…')}</td></tr>
              ) : payments.length === 0 ? (
                <tr><td colSpan={5} className="px-4 py-6 text-center text-gray-500">{t('admin_fees.no_payments_found', 'No payments found.')}</td></tr>
              ) : (
                payments.map((p) => (
                  <tr key={p.id}>
                    <td className="px-4 py-3 font-medium">{p.student_name || `${t('admin_fees.student', 'Student')} ${p.student_id || ''}`}</td>
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
              <DialogTitle>{t('admin_fees.record_payment', 'Record payment')}</DialogTitle>
              <DialogDescription>{t('admin_fees.record_payment_desc', 'Attach a payment to a specific fee record.')}</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>{t('admin_fees.fee_record', 'Fee record')}</Label>
                <Select value={form.fee_record_id} onValueChange={(v) => setForm((p) => ({ ...p, fee_record_id: v }))}>
                  <SelectTrigger><SelectValue placeholder={t('admin_fees.select_fee_record', 'Select fee record')} /></SelectTrigger>
                  <SelectContent>
                    {records.map((r: any) => {
                      const name = `${r.student?.first_name || ''} ${r.student?.last_name || ''}`.trim() || `${t('admin_fees.student', 'Student')} ${r.student_id}`
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
                  <Label>{t('admin_fees.amount', 'Amount')}</Label>
                  <Input type="number" value={form.amount} onChange={(e) => setForm((p) => ({ ...p, amount: e.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label>{t('admin_fees.date', 'Date')}</Label>
                  <Input type="date" value={form.payment_date} onChange={(e) => setForm((p) => ({ ...p, payment_date: e.target.value }))} />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>{t('admin_fees.method', 'Method')}</Label>
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
                  <Label>{t('admin_fees.reference', 'Reference')}</Label>
                  <Input value={form.reference_number} onChange={(e) => setForm((p) => ({ ...p, reference_number: e.target.value }))} placeholder={t('common.optional', 'Optional')} />
                </div>
              </div>
            </div>
            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={() => setRecordOpen(false)}>{t('common.cancel', 'Cancel')}</Button>
              <Button className="bg-indigo-600 hover:bg-indigo-700" disabled={recordMutation.isPending} onClick={() => recordMutation.mutate()}>
                {t('common.save', 'Save')}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  )
}

export default PaymentHistoryTable
