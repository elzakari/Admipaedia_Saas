import React, { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { superAdminService, SuperAdminAuditLog } from '@/services/superAdminService'

const eventOptions = [
  'super_admin.user_created',
  'super_admin.user_updated',
  'super_admin.user_deactivated',
  'super_admin.user_reactivated',
  'super_admin.user_reset_sent',
]

const SuperAdminAuditLogsPage: React.FC = () => {
  const { t } = useTranslation()
  const [items, setItems] = useState<SuperAdminAuditLog[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [q, setQ] = useState('')
  const [eventType, setEventType] = useState('')
  const [page, setPage] = useState(1)
  const [pages, setPages] = useState(1)

  const queryKey = useMemo(() => ({ q, eventType, page }), [q, eventType, page])

  useEffect(() => {
    let mounted = true
    const run = async () => {
      setLoading(true)
      setError(null)
      try {
        const res = await superAdminService.listAuditLogs({
          page: queryKey.page,
          per_page: 25,
          q: queryKey.q || undefined,
          event_type: queryKey.eventType || undefined,
        })
        if (!mounted) return
        setItems(res.logs)
        setPages(res.pagination.pages || 1)
      } catch (e) {
        void e
        if (!mounted) return
        setError(t('super_admin.audit_logs.errors.load_failed', 'Failed to load audit logs'))
      } finally {
        if (!mounted) return
        setLoading(false)
      }
    }
    run()
    return () => {
      mounted = false
    }
  }, [queryKey])

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">{t('super_admin.audit_logs.title', 'Audit logs')}</h1>
        <p className="text-sm text-muted-foreground">{t('super_admin.audit_logs.subtitle', 'Immutable record of Super Admin actions.')}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <Input placeholder={t('super_admin.audit_logs.search_placeholder', 'Search event, endpoint, details')} value={q} onChange={(e) => { setQ(e.target.value); setPage(1) }} />
        <Select value={eventType || 'all'} onValueChange={(v) => { setEventType(v === 'all' ? '' : v); setPage(1) }}>
          <SelectTrigger>
            <SelectValue placeholder={t('super_admin.audit_logs.filters.event_type', 'Event type')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('super_admin.audit_logs.filters.all_events', 'All events')}</SelectItem>
            {eventOptions.map((ev) => (
              <SelectItem key={ev} value={ev}>{ev}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => { setQ(''); setEventType(''); setPage(1) }} className="w-full">{t('common.clear', 'Clear')}</Button>
        </div>
      </div>

      {loading ? (
        <div className="h-72 rounded-lg border bg-background animate-pulse" />
      ) : error ? (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>
      ) : (
        <div className="rounded-lg border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="text-left px-4 py-3 font-medium">{t('super_admin.audit_logs.table.time', 'Time')}</th>
                  <th className="text-left px-4 py-3 font-medium">{t('super_admin.audit_logs.table.event', 'Event')}</th>
                  <th className="text-left px-4 py-3 font-medium">{t('super_admin.audit_logs.table.severity', 'Severity')}</th>
                  <th className="text-left px-4 py-3 font-medium">{t('super_admin.audit_logs.table.target', 'Target')}</th>
                  <th className="text-left px-4 py-3 font-medium">{t('super_admin.audit_logs.table.details', 'Details')}</th>
                </tr>
              </thead>
              <tbody>
                {items.length === 0 ? (
                  <tr><td colSpan={5} className="px-4 py-10 text-center text-muted-foreground">{t('super_admin.audit_logs.empty', 'No logs found')}</td></tr>
                ) : (
                  items.map((l) => (
                    <tr key={l.id} className="border-t">
                      <td className="px-4 py-3 text-muted-foreground">{l.created_at || ''}</td>
                      <td className="px-4 py-3 font-medium">{l.event_type}</td>
                      <td className="px-4 py-3">{l.severity}</td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {typeof l.details?.target_user_id === 'number' ? l.details.target_user_id : ''}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground max-w-[520px] truncate">{JSON.stringify(l.details)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          <div className="flex items-center justify-between px-4 py-3 border-t bg-background">
            <div className="text-xs text-muted-foreground">{t('super_admin.audit_logs.pagination.page_of', 'Page {{page}} of {{pages}}', { page, pages })}</div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>{t('common.prev', 'Prev')}</Button>
              <Button variant="outline" size="sm" disabled={page >= pages} onClick={() => setPage((p) => Math.min(pages, p + 1))}>{t('common.next', 'Next')}</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default SuperAdminAuditLogsPage

