import React, { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { Badge } from '../ui/badge'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../ui/dialog'
import { Label } from '../ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select'
import { Copy, Download, Edit, Eye, Plus, Search, Trash2, Users } from 'lucide-react'
import { toast } from 'sonner'
import api from '../../lib/api'
import { feesService, FeeTemplateGroup } from '../../services/feesService'
import { formatCurrency } from '../../lib/utils'
import { getClassDisplayName } from '../../utils/formatters'

const FeeTemplateManager: React.FC = () => {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const [searchTerm, setSearchTerm] = useState('')
  const [selected, setSelected] = useState<FeeTemplateGroup | null>(null)

  const [editorOpen, setEditorOpen] = useState(false)
  const [assignOpen, setAssignOpen] = useState(false)
  const [viewerOpen, setViewerOpen] = useState(false)

  const [form, setForm] = useState({
    class_id: '0',
    academic_year: '2024/2025',
    term: 'Term 1',
    due_date: '',
    items: [
      { category: 'Tuition', amount: 0 },
      { category: 'Books', amount: 0 },
      { category: 'PTA', amount: 0 }
    ] as Array<{ category: string; amount: number }>
  })

  const { data: templatesResp, isLoading } = useQuery({
    queryKey: ['fees', 'templates'],
    queryFn: () => feesService.getFeeTemplates({ page: 1, per_page: 200 })
  })

  const { data: classesResp } = useQuery({
    queryKey: ['classes', 'fees'],
    queryFn: async () => {
      const res = await api.get('/classes', { params: { per_page: 200 } })
      return res.data as any
    }
  })

  const classes = useMemo(() => {
    const items = classesResp?.classes
    return Array.isArray(items) ? items : []
  }, [classesResp])

  const classNameById = useMemo(() => {
    const map = new Map<number, string>()
    for (const c of classes) map.set(c.id, getClassDisplayName(c))
    return map
  }, [classes])

  const templates = useMemo(() => {
    const list = templatesResp?.fee_structures
    if (!Array.isArray(list)) return []
    const q = searchTerm.trim().toLowerCase()
    if (!q) return list
    return list.filter((t) => {
      const header = `${t.academic_year} ${t.term} ${t.class_id || ''}`.toLowerCase()
      return header.includes(q) || (t.items || []).some((i) => (i.category || '').toLowerCase().includes(q))
    })
  }, [templatesResp?.fee_structures, searchTerm])

  const openTemplateEditor = (template?: FeeTemplateGroup | null, mode: 'create' | 'edit' | 'duplicate' = 'create') => {
    if (!template || mode === 'create') {
      setSelected(null)
      setForm({
        class_id: '0',
        academic_year: '2024/2025',
        term: 'Term 1',
        due_date: '',
        items: [
          { category: 'Tuition', amount: 0 },
          { category: 'Books', amount: 0 },
          { category: 'PTA', amount: 0 }
        ]
      })
      setEditorOpen(true)
      return
    }

    setSelected(mode === 'edit' ? template : null)
    setForm({
      class_id: String(template.class_id || 0),
      academic_year: template.academic_year,
      term: template.term,
      due_date: (template.due_date || '').slice(0, 10),
      items: (template.items || []).map((x) => ({ category: x.category, amount: x.amount }))
    })
    setEditorOpen(true)
  }

  const createMutation = useMutation({
    mutationFn: async () => {
      const classId = form.class_id === '0' ? null : Number(form.class_id)
      const payload = {
        class_id: classId,
        academic_year: form.academic_year,
        term: form.term,
        due_date: form.due_date || null,
        items: form.items
          .filter((i) => i.category.trim())
          .map((i) => ({ category: i.category.trim(), amount: Number(i.amount || 0) }))
      }

      if (selected) return feesService.updateFeeTemplate(selected.id, payload)
      return feesService.createFeeTemplate(payload)
    },
    onSuccess: () => {
      toast.success(t('admin_fees.template_saved', 'Fee template saved'))
      queryClient.invalidateQueries({ queryKey: ['fees', 'templates'] })
      setEditorOpen(false)
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || t('admin_fees.failed_save_template', 'Failed to save template'))
  })

  const deleteMutation = useMutation({
    mutationFn: (groupId: string) => feesService.deleteFeeTemplate(groupId),
    onSuccess: () => {
      toast.success(t('admin_fees.template_deleted', 'Fee template deleted'))
      queryClient.invalidateQueries({ queryKey: ['fees', 'templates'] })
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || t('admin_fees.failed_delete_template', 'Failed to delete template'))
  })

  const assignMutation = useMutation({
    mutationFn: (groupId: string) => feesService.assignFeeTemplate(groupId),
    onSuccess: (data) => {
      toast.success(t('admin_fees.assigned_fees_records', 'Assigned fees ({{count}} records)', { count: data.created })) 
      queryClient.invalidateQueries({ queryKey: ['fees', 'records'] })
      setAssignOpen(false)
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || t('admin_fees.failed_assign_fees', 'Failed to assign fees'))
  })

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
    const onCreate = (e: any) => {
      if (e?.detail?.tab !== 'templates') return
      openTemplateEditor(null, 'create')
    }

    const onExport = (e: any) => {
      if (e?.detail?.tab !== 'templates') return
      exportCsv('fee_templates.csv', templates.map((t) => ({
        id: t.id,
        academic_year: t.academic_year,
        term: t.term,
        class_id: t.class_id ?? '',
        due_date: t.due_date ?? '',
        total_amount: t.total_amount,
        currency: t.currency
      })))
      toast.success(t('admin_fees.exported_templates', 'Exported templates'))
    }

    window.addEventListener('fees:create', onCreate)
    window.addEventListener('fees:export', onExport)
    return () => {
      window.removeEventListener('fees:create', onCreate)
      window.removeEventListener('fees:export', onExport)
    }
  }, [templates])

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle className="text-lg font-semibold">{t('admin_fees.fee_templates', 'Fee Templates')}</CardTitle>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              className="h-8"
              onClick={() => {
                exportCsv('fee_templates.csv', templates.map((t) => ({
                  id: t.id,
                  academic_year: t.academic_year,
                  term: t.term,
                  class_id: t.class_id ?? '',
                  due_date: t.due_date ?? '',
                  total_amount: t.total_amount,
                  currency: t.currency
                })))
                toast.success(t('admin_fees.exported_templates', 'Exported templates'))
              }}
            >
              <Download className="h-4 w-4 mr-1" /> {t('common.export', 'Export')}
            </Button>
            <Button
              size="sm"
              className="h-8 bg-indigo-600 hover:bg-indigo-700"
              onClick={() => {
                openTemplateEditor(null, 'create')
              }}
            >
              <Plus className="h-4 w-4 mr-1" /> {t('admin_fees.new_template', 'New Template')}
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="relative mb-4">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
          <Input placeholder={t('admin_fees.search_templates', 'Search templates...')} value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-9" />
        </div>

        <div className="space-y-3">
          {isLoading ? (
            <div className="text-sm text-gray-500">{t('admin_fees.loading_templates', 'Loading templates…')}</div>
          ) : templates.length === 0 ? (
            <div className="text-sm text-gray-500">{t('admin_fees.no_templates_found', 'No templates found.')}</div>
          ) : (
            templates.map((tpl) => (
              <div key={tpl.id} className="p-4 border rounded-lg hover:bg-gray-50 transition-colors">
                <div className="flex justify-between items-start gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-medium truncate">{tpl.academic_year} • {tpl.term}</h3>
                      <Badge className="bg-indigo-100 text-indigo-800">{tpl.class_id ? classNameById.get(tpl.class_id) || `Class ${tpl.class_id}` : t('admin_fees.all_classes', 'All classes')}</Badge>
                      <Badge className="bg-slate-100 text-slate-700">{tpl.currency}</Badge>
                      <Badge className="bg-emerald-100 text-emerald-800">{t('admin_fees.total_amount', 'Total: {{amount}}', { amount: formatCurrency(Number(tpl.total_amount || 0), tpl.currency) })}</Badge>
                    </div>
                  {(() => {
                    const usage = tpl.usage
                    const assignedCount = usage?.assigned_fee_records || 0
                    const hasPaymentActivity = Boolean(usage?.has_payment_activity)
                    return (
                      <>
                        {assignedCount > 0 ? (
                          <Badge className="bg-amber-100 text-amber-800">
                            {t('admin_fees.assigned_count', '{{count}} assigned', { count: assignedCount })}
                          </Badge>
                        ) : null}
                        {hasPaymentActivity ? (
                          <Badge className="bg-rose-100 text-rose-800">{t('admin_fees.payment_activity', 'Payment activity')}</Badge>
                        ) : null}
                      </>
                    )
                  })()}
                    <div className="text-sm text-gray-600 mt-2">
                      {(tpl.items || []).slice(0, 4).map((i) => (
                        <span key={i.fee_structure_id} className="inline-block mr-3">{i.category}: <span className="font-medium">{formatCurrency(Number(i.amount || 0), i.currency || tpl.currency)}</span></span>
                      ))}
                      {(tpl.items || []).length > 4 ? <span className="text-gray-500">{t('admin_fees.more_items', '+{{count}} more', { count: (tpl.items || []).length - 4 })}</span> : null}
                    </div>
                    <div className="text-xs text-gray-500 mt-2">{t('admin_fees.due_date', 'Due: {{date}}', { date: tpl.due_date || '—' })}</div>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => { setSelected(tpl); setAssignOpen(true) }}>
                      <Users className="h-4 w-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8"
                      disabled={tpl.usage?.can_edit === false}
                      title={tpl.usage?.can_edit === false ? t('admin_fees.template_locked_desc', 'This template is already in use. Editing is locked to protect existing fee records. Duplicate it to create a revised version.') : t('admin_fees.edit_template', 'Edit template')}
                      onClick={() => {
                        openTemplateEditor(tpl, 'edit')
                      }}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8"
                      title={t('admin_fees.duplicate_template', 'Duplicate as new template')}
                      onClick={() => openTemplateEditor(tpl, 'duplicate')}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                    <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => { setSelected(tpl); setViewerOpen(true) }}>
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8 text-red-500 hover:text-red-600 hover:bg-red-50"
                      disabled={tpl.usage?.can_delete === false}
                      title={tpl.usage?.can_delete === false ? t('admin_fees.delete_template_disabled', 'Templates with payment activity cannot be deleted.') : t('admin_fees.delete_template', 'Delete template')}
                      onClick={() => {
                        if (!confirm(t('admin_fees.confirm_delete_template', 'Delete this fee template?'))) return
                        deleteMutation.mutate(tpl.id)
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        <Dialog open={viewerOpen} onOpenChange={setViewerOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{t('admin_fees.template_details', 'Template details')}</DialogTitle>
              <DialogDescription>{t('admin_fees.template_details_desc', 'Review items and totals for this fee template.')}</DialogDescription>
            </DialogHeader>
            {selected ? (
              <div className="space-y-4">
                <div className="flex gap-2 flex-wrap">
                  <Badge className="bg-indigo-100 text-indigo-800">{selected.academic_year}</Badge>
                  <Badge className="bg-indigo-100 text-indigo-800">{selected.term}</Badge>
                  <Badge className="bg-slate-100 text-slate-800">{selected.class_id ? classNameById.get(selected.class_id) || `Class ${selected.class_id}` : t('admin_fees.all_classes', 'All classes')}</Badge>
                  <Badge className="bg-slate-100 text-slate-700">{selected.currency}</Badge>
                  <Badge className="bg-emerald-100 text-emerald-800">{t('admin_fees.total_amount', 'Total: {{amount}}', { amount: formatCurrency(Number(selected.total_amount || 0), selected.currency) })}</Badge>
                </div>
                <div className="text-sm text-gray-600">{t('admin_fees.due_date_label', 'Due date: {{date}}', { date: selected.due_date || '—' })}</div>
                <div className="border rounded-lg overflow-hidden">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">{t('admin_fees.category', 'Category')}</th>
                        <th className="px-4 py-3 text-right text-sm font-medium text-gray-500">{t('admin_fees.amount', 'Amount')}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {(selected.items || []).map((it) => (
                        <tr key={it.fee_structure_id}>
                          <td className="px-4 py-3 text-sm">{it.category}</td>
                          <td className="px-4 py-3 text-sm text-right font-medium">{formatCurrency(Number(it.amount || 0), it.currency || selected.currency)}</td>
                        </tr>
                      ))}
                      <tr className="bg-gray-50">
                        <td className="px-4 py-3 text-sm font-medium">{t('admin_fees.total', 'Total')}</td>
                        <td className="px-4 py-3 text-sm text-right font-bold">{formatCurrency(Number(selected.total_amount || 0), selected.currency)}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            ) : null}
            <DialogFooter>
              <Button variant="outline" onClick={() => setViewerOpen(false)}>{t('common.close', 'Close')}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={editorOpen} onOpenChange={setEditorOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{selected ? t('admin_fees.edit_fee_template', 'Edit fee template') : t('admin_fees.create_fee_template', 'Create fee template')}</DialogTitle>
              <DialogDescription>{t('admin_fees.create_fee_template_desc', 'Define categories and amounts, then save and assign to students.')}</DialogDescription>
            </DialogHeader>
            {selected?.usage?.can_edit === false ? (
              <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
                {t('admin_fees.template_locked_warning', 'This template is already in use. Editing is locked to protect existing fee records. Duplicate it to create a revised version.')}
              </div>
            ) : null}
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>{t('admin_fees.academic_year', 'Academic year')}</Label>
                  <Input value={form.academic_year} onChange={(e) => setForm((p) => ({ ...p, academic_year: e.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label>{t('admin_fees.term', 'Term')}</Label>
                  <Select value={form.term} onValueChange={(v) => setForm((p) => ({ ...p, term: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Term 1">Term 1</SelectItem>
                      <SelectItem value="Term 2">Term 2</SelectItem>
                      <SelectItem value="Term 3">Term 3</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>{t('admin_fees.class', 'Class')}</Label>
                  <Select value={form.class_id} onValueChange={(v) => setForm((p) => ({ ...p, class_id: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="0">{t('admin_fees.all_classes', 'All classes')}</SelectItem>
                      {classes.map((c: any) => (
                        <SelectItem key={c.id} value={String(c.id)}>{getClassDisplayName(c)}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>{t('admin_fees.due_date_form', 'Due date')}</Label>
                  <Input type="date" value={form.due_date} onChange={(e) => setForm((p) => ({ ...p, due_date: e.target.value }))} />
                </div>
              </div>

              <div className="space-y-2">
                <Label>{t('admin_fees.items', 'Items')}</Label>
                <div className="space-y-2">
                  {form.items.map((it, idx) => (
                    <div key={idx} className="grid grid-cols-1 md:grid-cols-3 gap-2">
                      <Input
                        value={it.category}
                        onChange={(e) => setForm((p) => {
                          const items = [...p.items]
                          items[idx] = { ...items[idx], category: e.target.value }
                          return { ...p, items }
                        })}
                        placeholder={t('admin_fees.category', 'Category')}
                      />
                      <Input
                        type="number"
                        value={String(it.amount)}
                        onChange={(e) => setForm((p) => {
                          const items = [...p.items]
                          items[idx] = { ...items[idx], amount: Number(e.target.value || 0) }
                          return { ...p, items }
                        })}
                        placeholder={t('admin_fees.amount', 'Amount')}
                      />
                      <Button
                        variant="outline"
                        className="bg-white"
                        disabled={form.items.length <= 1}
                        onClick={() => setForm((p) => ({ ...p, items: p.items.filter((_, i) => i !== idx) }))}
                      >
                        {t('common.remove', 'Remove')}
                      </Button>
                    </div>
                  ))}
                  <Button variant="outline" onClick={() => setForm((p) => ({ ...p, items: [...p.items, { category: '', amount: 0 }] }))}>
                    <Plus className="h-4 w-4 mr-2" />
                    {t('admin_fees.add_item', 'Add item')}
                  </Button>
                </div>
              </div>
            </div>
            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={() => setEditorOpen(false)}>{t('common.cancel', 'Cancel')}</Button>
              <Button className="bg-indigo-600 hover:bg-indigo-700" disabled={createMutation.isPending} onClick={() => createMutation.mutate()}>
                {t('common.save', 'Save')}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={assignOpen} onOpenChange={setAssignOpen}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>{t('admin_fees.assign_fees', 'Assign fees')}</DialogTitle>
              <DialogDescription>{t('admin_fees.assign_fees_desc', 'Create student fee records from this template.')}</DialogDescription>
            </DialogHeader>
            <div className="text-sm text-gray-600">
              {t('admin_fees.assign_fees_note', 'This will create fee records for students in the template class (or all students if template is global).')}
            </div>
            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={() => setAssignOpen(false)}>{t('common.cancel', 'Cancel')}</Button>
              <Button
                className="bg-indigo-600 hover:bg-indigo-700"
                disabled={!selected || assignMutation.isPending}
                onClick={() => {
                  if (!selected) return
                  assignMutation.mutate(selected.id)
                }}
              >
                {t('admin_fees.assign_btn', 'Assign')}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  )
}

export default FeeTemplateManager
