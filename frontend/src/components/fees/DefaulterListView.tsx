import React, { useEffect, useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card'
import { Button } from '../ui/button'
import { Badge } from '../ui/badge'
import { Download } from 'lucide-react'
import { toast } from 'sonner'
import { feesService } from '../../services/feesService'

const DefaulterListView: React.FC = () => {
  const { t } = useTranslation();
  const [search, setSearch] = useState('')

  const { data, isLoading } = useQuery({
    queryKey: ['fees', 'overdue'],
    queryFn: () => feesService.getOverdueFees({ page: 1, per_page: 200 })
  })

  const items = useMemo(() => {
    const list = data?.overdue_fees
    if (!Array.isArray(list)) return []
    const q = search.trim().toLowerCase()
    if (!q) return list
    return list.filter((x: any) => {
      const name = (x.student_name || '').toLowerCase()
      const cls = (x.class_name || '').toLowerCase()
      return name.includes(q) || cls.includes(q) || String(x.student_id || '').includes(q)
    })
  }, [data?.overdue_fees, search])

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
      if (e?.detail?.tab !== 'defaulters') return
      exportCsv('fee_defaulters.csv', items.map((x: any) => ({
        student_id: x.student_id,
        student_name: x.student_name,
        class_name: x.class_name,
        balance: x.balance,
        due_date: x.due_date,
        days_overdue: x.days_overdue
      })))
      toast.success(t('admin_fees.exported_defaulters', 'Exported defaulters'))
    }
    window.addEventListener('fees:export', onExport)
    return () => window.removeEventListener('fees:export', onExport)
  }, [items, t])

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-3">
          <CardTitle className="text-lg font-semibold">{t('admin_fees.defaulters', 'Defaulters')}</CardTitle>
          <Button
            size="sm"
            variant="outline"
            className="h-8"
            onClick={() => {
              exportCsv('fee_defaulters.csv', items.map((x: any) => ({
                student_id: x.student_id,
                student_name: x.student_name,
                class_name: x.class_name,
                balance: x.balance,
                due_date: x.due_date,
                days_overdue: x.days_overdue
              })))
              toast.success(t('admin_fees.exported_defaulters', 'Exported defaulters'))
            }}
          >
            <Download className="h-4 w-4 mr-2" /> {t('common.export', 'Export')}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <InputLike value={search} onChange={setSearch} />

        <div className="border rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-gray-600">{t('admin_fees.student', 'Student')}</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">{t('admin_fees.class', 'Class')}</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">{t('admin_fees.due', 'Due')}</th>
                <th className="px-4 py-3 text-right font-medium text-gray-600">{t('admin_fees.balance', 'Balance')}</th>
                <th className="px-4 py-3 text-right font-medium text-gray-600">{t('admin_fees.days', 'Days')}</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {isLoading ? (
                <tr><td colSpan={5} className="px-4 py-6 text-center text-gray-500">{t('common.loading', 'Loading…')}</td></tr>
              ) : items.length === 0 ? (
                <tr><td colSpan={5} className="px-4 py-6 text-center text-gray-500">{t('admin_fees.no_defaulters_found', 'No defaulters found.')}</td></tr>
              ) : (
                items.map((x: any) => (
                  <tr key={x.id}>
                    <td className="px-4 py-3 font-medium">{x.student_name || `Student ${x.student_id}`}</td>
                    <td className="px-4 py-3">{x.class_name || '—'}</td>
                    <td className="px-4 py-3">{x.due_date}</td>
                    <td className="px-4 py-3 text-right"><Badge className="bg-amber-100 text-amber-800">{x.balance}</Badge></td>
                    <td className="px-4 py-3 text-right">{x.days_overdue}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  )
}

const InputLike = ({ value, onChange }: { value: string; onChange: (v: string) => void }) => {
  const { t } = useTranslation();
  return (
    <div className="mb-4">
      <input
        className="w-full h-10 rounded-md border border-input bg-background text-foreground px-3 text-sm"
        placeholder={t('admin_fees.search_defaulters', 'Search defaulters by name or class')}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  )
}

export default DefaulterListView
