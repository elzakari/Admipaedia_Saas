import React, { useEffect, useMemo, useState } from 'react'
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
      toast.success('Exported invoices')
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
      if (!createForm.templateId) throw new Error('Select a template')
      if (createForm.mode === 'student') {
        if (!createForm.studentId) throw new Error('Select a student')
        return feesService.assignFeeTemplate(createForm.templateId, { student_id: Number(createForm.studentId) })
      }
      return feesService.assignFeeTemplate(createForm.templateId)
    },
    onSuccess: (data) => {
      toast.success(`Created ${data.created} fee records`)
      queryClient.invalidateQueries({ queryKey: ['fees', 'records'] })
      setCreateOpen(false)
    },
    onError: (e: any) => toast.error(e?.message || e?.response?.data?.message || 'Failed to generate invoices')
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
          <CardTitle className="text-lg font-semibold">Invoices</CardTitle>
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
                toast.success('Exported invoices')
              }}
            >
              <Download className="h-4 w-4 mr-2" />
              Export
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
              Generate
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-2 mb-4">
          <Input placeholder="Search by student, admission #, category or invoice id" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>

        <div className="border rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Student</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Category</th>
                <th className="px-4 py-3 text-right font-medium text-gray-600">Amount</th>
                <th className="px-4 py-3 text-right font-medium text-gray-600">Paid</th>
                <th className="px-4 py-3 text-right font-medium text-gray-600">Balance</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Due</th>
                <th className="px-4 py-3 text-right font-medium text-gray-600">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {isLoading ? (
                <tr><td colSpan={7} className="px-4 py-6 text-center text-gray-500">Loading…</td></tr>
              ) : records.length === 0 ? (
                <tr><td colSpan={7} className="px-4 py-6 text-center text-gray-500">No invoices found.</td></tr>
              ) : (
                records.map((r) => {
                  const name = `${r.student?.first_name || ''} ${r.student?.last_name || ''}`.trim() || `Student ${r.student_id}`
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
                          <Eye className="h-4 w-4 mr-2" /> Payments
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
              <DialogTitle>Generate invoices</DialogTitle>
              <DialogDescription>Assign a fee template to a class or a student.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Fee template</Label>
                <Select value={createForm.templateId} onValueChange={(v) => setCreateForm((p) => ({ ...p, templateId: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select template" /></SelectTrigger>
                  <SelectContent>
                    {templates.map((t) => (
                      <SelectItem key={t.id} value={t.id}>{t.academic_year} • {t.term} • {t.class_id ? `Class ${t.class_id}` : 'All classes'}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Mode</Label>
                  <Select value={createForm.mode} onValueChange={(v) => setCreateForm((p) => ({ ...p, mode: v as any }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="class">Assign to template class</SelectItem>
                      <SelectItem value="student">Assign to one student</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Student</Label>
                  <Select
                    value={createForm.studentId}
                    onValueChange={(v) => setCreateForm((p) => ({ ...p, studentId: v }))}
                    disabled={createForm.mode !== 'student'}
                  >
                    <SelectTrigger><SelectValue placeholder="Select student" /></SelectTrigger>
                    <SelectContent>
                      {students.map((s: any) => (
                        <SelectItem key={s.id} value={String(s.id)}>
                          {`${s.first_name || ''} ${s.last_name || ''}`.trim() || `Student ${s.id}`}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
              <Button className="bg-indigo-600 hover:bg-indigo-700" disabled={assignMutation.isPending} onClick={() => assignMutation.mutate()}>
                Generate
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={paymentsOpen} onOpenChange={setPaymentsOpen}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Payments</DialogTitle>
              <DialogDescription>View payment allocations recorded for this invoice.</DialogDescription>
            </DialogHeader>
            <div className="space-y-2">
              {selectedRecord ? (
                <div className="text-sm text-gray-600">Invoice #{selectedRecord.id} • Balance: {selectedRecord.balance}</div>
              ) : null}
              <div className="border rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-3 py-2 text-left font-medium text-gray-600">Date</th>
                      <th className="px-3 py-2 text-left font-medium text-gray-600">Method</th>
                      <th className="px-3 py-2 text-right font-medium text-gray-600">Amount</th>
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
                      <tr><td colSpan={3} className="px-3 py-4 text-center text-gray-500">No payments.</td></tr>
                    ) : null}
                  </tbody>
                </table>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setPaymentsOpen(false)}>Close</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  )
}

export default InvoiceDashboard
