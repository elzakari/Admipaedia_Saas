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
import { Download, Eye, PlusCircle } from 'lucide-react'
import { toast } from 'sonner'
import api from '../../lib/api'
import { feesService, FeeRecord, FeeTemplateGroup } from '../../services/feesService'

const InvoiceDashboard: React.FC = () => {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [createOpen, setCreateOpen] = useState(false)
  const [paymentsOpen, setPaymentsOpen] = useState(false)
  const [selectedRecord, setSelectedRecord] = useState<FeeRecord | null>(null)
  const [selectedPayments, setSelectedPayments] = useState<any[]>([])

  const [createForm, setCreateForm] = useState({
    templateId: '',
    mode: 'class' as 'class' | 'student',
    studentId: ''
  })

  const { data: recordsResp, isLoading } = useQuery({
    queryKey: ['fees', 'records'],
    queryFn: () => feesService.getFeeRecords({ page: 1, per_page: 200 })
  })

  const { data: templatesResp } = useQuery({
    queryKey: ['fees', 'templates'],
    queryFn: () => feesService.getFeeTemplates({ page: 1, per_page: 200 })
  })

  const { data: studentsResp } = useQuery({
    queryKey: ['students', 'fees'],
    queryFn: async () => {
      const res = await api.get('/students', { params: { per_page: 100 } })
      return res.data as any
    }
  })

  const students = useMemo(() => {
    const items = studentsResp?.students
    return Array.isArray(items) ? items : []
  }, [studentsResp])

  const templates = useMemo(() => {
    const list = templatesResp?.fee_structures
    return Array.isArray(list) ? (list as FeeTemplateGroup[]) : []
  }, [templatesResp])

  const records = useMemo(() => {
    const list = recordsResp?.fee_records
    if (!Array.isArray(list)) return []
    const q = search.trim().toLowerCase()
    if (!q) return list
    return list.filter((r) => {
      const studentName = `${r.student?.first_name || ''} ${r.student?.last_name || ''}`.toLowerCase()
      const admission = (r.student?.admission_number || '').toLowerCase()
      const category = (r.structure?.fee_category || '').toLowerCase()
      return studentName.includes(q) || admission.includes(q) || category.includes(q) || String(r.id).includes(q)
    })
  }, [recordsResp?.fee_records, search])

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
      if (e?.detail?.tab !== 'invoices') return
      exportCsv('fee_invoices.csv', records.map((r) => ({
        id: r.id,
        student_id: r.student_id,
        student: `${r.student?.first_name || ''} ${r.student?.last_name || ''}`.trim(),
        admission_number: r.student?.admission_number || '',
        category: r.structure?.fee_category || '',
        amount: r.final_amount,
        paid: r.paid_amount,
        balance: r.balance,
        due_date: r.due_date || ''
      })))
      toast.success(t('admin_fees.exported_invoices', 'Exported invoices'))
    }
    window.addEventListener('fees:export', onExport)
    return () => window.removeEventListener('fees:export', onExport)
  }, [records])

  useEffect(() => {
    const onCreate = (e: any) => {
      if (e?.detail?.tab !== 'invoices') return
      setCreateForm({ templateId: '', mode: 'class', studentId: '' })
      setCreateOpen(true)
    }
    window.addEventListener('fees:create', onCreate)
    return () => window.removeEventListener('fees:create', onCreate)
  }, [])

  const assignMutation = useMutation({
    mutationFn: async () => {
      if (!createForm.templateId) throw new Error(t('admin_fees.select_template_error', 'Select a template'))
      if (createForm.mode === 'student') {
        if (!createForm.studentId) throw new Error(t('admin_fees.select_student_error', 'Select a student'))
        return feesService.assignFeeTemplate(createForm.templateId, { student_id: Number(createForm.studentId) })
      }
      return feesService.assignFeeTemplate(createForm.templateId)
    },
    onSuccess: (data) => {
      toast.success(t('admin_fees.created_records', 'Created {{count}} fee records', { count: data.created }))
      queryClient.invalidateQueries({ queryKey: ['fees', 'records'] })
      setCreateOpen(false)
    },
    onError: (e: any) => toast.error(e?.message || e?.response?.data?.message || t('admin_fees.failed_generate_invoices', 'Failed to generate invoices'))
  })

  const openPayments = async (record: FeeRecord) => {
    setSelectedRecord(record)
    setPaymentsOpen(true)
    try {
      const items = await feesService.getFeeRecordPayments(record.id)
      setSelectedPayments(items)
    } catch {
      setSelectedPayments([])
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-3">
          <CardTitle className="text-lg font-semibold">{t('admin_fees.invoices', 'Invoices')}</CardTitle>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              className="h-8"
              onClick={() => {
                exportCsv('fee_invoices.csv', records.map((r) => ({
                  id: r.id,
                  student_id: r.student_id,
                  student: `${r.student?.first_name || ''} ${r.student?.last_name || ''}`.trim(),
                  admission_number: r.student?.admission_number || '',
                  category: r.structure?.fee_category || '',
                  amount: r.final_amount,
                  paid: r.paid_amount,
                  balance: r.balance,
                  due_date: r.due_date || ''
                })))
                toast.success(t('admin_fees.exported_invoices', 'Exported invoices'))
              }}
            >
              <Download className="h-4 w-4 mr-2" />
              {t('common.export', 'Export')}
            </Button>
            <Button
              size="sm"
              className="h-8 bg-indigo-600 hover:bg-indigo-700"
              onClick={() => {
                setCreateForm({ templateId: '', mode: 'class', studentId: '' })
                setCreateOpen(true)
              }}
            >
              <PlusCircle className="h-4 w-4 mr-2" />
              {t('common.generate', 'Generate')}
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-2 mb-4">
          <Input placeholder={t('admin_fees.search_invoices', 'Search by student, admission #, category or invoice id')} value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>

        <div className="border rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-gray-600">{t('admin_fees.student', 'Student')}</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">{t('admin_fees.category', 'Category')}</th>
                <th className="px-4 py-3 text-right font-medium text-gray-600">{t('admin_fees.amount', 'Amount')}</th>
                <th className="px-4 py-3 text-right font-medium text-gray-600">{t('admin_fees.paid', 'Paid')}</th>
                <th className="px-4 py-3 text-right font-medium text-gray-600">{t('admin_fees.balance', 'Balance')}</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">{t('admin_fees.due', 'Due')}</th>
                <th className="px-4 py-3 text-right font-medium text-gray-600">{t('common.actions', 'Actions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {isLoading ? (
                <tr><td colSpan={7} className="px-4 py-6 text-center text-gray-500">{t('common.loading', 'Loading…')}</td></tr>
              ) : records.length === 0 ? (
                <tr><td colSpan={7} className="px-4 py-6 text-center text-gray-500">{t('admin_fees.no_invoices_found', 'No invoices found.')}</td></tr>
              ) : (
                records.map((r) => {
                  const name = `${r.student?.first_name || ''} ${r.student?.last_name || ''}`.trim() || `${t('admin_fees.student', 'Student')} ${r.student_id}`
                  const category = r.structure?.fee_category || '—'
                  const status = r.balance <= 0 ? 'paid' : r.paid_amount > 0 ? 'partial' : 'unpaid'
                  return (
                    <tr key={r.id}>
                      <td className="px-4 py-3">
                        <div className="font-medium">{name}</div>
                        <div className="text-xs text-gray-500">{r.student?.admission_number || `#${r.student_id}`} • {status}</div>
                      </td>
                      <td className="px-4 py-3">{category}</td>
                      <td className="px-4 py-3 text-right font-medium">{r.final_amount}</td>
                      <td className="px-4 py-3 text-right">{r.paid_amount}</td>
                      <td className="px-4 py-3 text-right">
                        <Badge className={r.balance <= 0 ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}>
                          {r.balance}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">{r.due_date || '—'}</td>
                      <td className="px-4 py-3 text-right">
                        <Button variant="ghost" size="sm" onClick={() => openPayments(r)}>
                          <Eye className="h-4 w-4 mr-2" /> {t('admin_fees.payments', 'Payments')}
                        </Button>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>

        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogContent className="max-w-xl">
            <DialogHeader>
              <DialogTitle>{t('admin_fees.generate_invoices', 'Generate invoices')}</DialogTitle>
              <DialogDescription>{t('admin_fees.generate_invoices_desc', 'Assign a fee template to a class or a student.')}</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>{t('admin_fees.fee_template', 'Fee template')}</Label>
                <Select value={createForm.templateId} onValueChange={(v) => setCreateForm((p) => ({ ...p, templateId: v }))}>
                  <SelectTrigger><SelectValue placeholder={t('admin_fees.select_template', 'Select template')} /></SelectTrigger>
                  <SelectContent>
                    {templates.map((t) => (
                      <SelectItem key={t.id} value={t.id}>{t.academic_year} • {t.term} • {t.class_id ? `Class ${t.class_id}` : 'All classes'}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>{t('common.mode', 'Mode')}</Label>
                  <Select value={createForm.mode} onValueChange={(v) => setCreateForm((p) => ({ ...p, mode: v as any }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="class">{t('admin_fees.assign_to_class', 'Assign to template class')}</SelectItem>
                      <SelectItem value="student">{t('admin_fees.assign_to_student', 'Assign to one student')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>{t('admin_fees.student', 'Student')}</Label>
                  <Select
                    value={createForm.studentId}
                    onValueChange={(v) => setCreateForm((p) => ({ ...p, studentId: v }))}
                    disabled={createForm.mode !== 'student'}
                  >
                    <SelectTrigger><SelectValue placeholder={t('admin_fees.select_student', 'Select student')} /></SelectTrigger>
                    <SelectContent>
                      {students.map((s: any) => (
                        <SelectItem key={s.id} value={String(s.id)}>
                          {`${s.first_name || ''} ${s.last_name || ''}`.trim() || `${t('admin_fees.student', 'Student')} ${s.id}`}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={() => setCreateOpen(false)}>{t('common.cancel', 'Cancel')}</Button>
              <Button className="bg-indigo-600 hover:bg-indigo-700" disabled={assignMutation.isPending} onClick={() => assignMutation.mutate()}>
                {t('common.generate', 'Generate')}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={paymentsOpen} onOpenChange={setPaymentsOpen}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>{t('admin_fees.payments', 'Payments')}</DialogTitle>
              <DialogDescription>{t('admin_fees.view_payments_desc', 'View payment allocations recorded for this invoice.')}</DialogDescription>
            </DialogHeader>
            <div className="space-y-2">
              {selectedRecord ? (
                <div className="text-sm text-gray-600">{t('admin_fees.invoice_balance', 'Invoice #{{id}} • Balance: {{balance}}', { id: selectedRecord.id, balance: selectedRecord.balance })}</div>
              ) : null}
              <div className="border rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-3 py-2 text-left font-medium text-gray-600">{t('admin_fees.date', 'Date')}</th>
                      <th className="px-3 py-2 text-left font-medium text-gray-600">{t('admin_fees.method', 'Method')}</th>
                      <th className="px-3 py-2 text-right font-medium text-gray-600">{t('admin_fees.amount', 'Amount')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {selectedPayments.map((p: any) => (
                      <tr key={p.id}>
                        <td className="px-3 py-2">{p.payment_date || '—'}</td>
                        <td className="px-3 py-2">{p.payment_method}</td>
                        <td className="px-3 py-2 text-right">{p.amount}</td>
                      </tr>
                    ))}
                    {selectedPayments.length === 0 ? (
                      <tr><td colSpan={3} className="px-3 py-4 text-center text-gray-500">{t('admin_fees.no_payments', 'No payments.')}</td></tr>
                    ) : null}
                  </tbody>
                </table>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setPaymentsOpen(false)}>{t('common.close', 'Close')}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  )
}

export default InvoiceDashboard
