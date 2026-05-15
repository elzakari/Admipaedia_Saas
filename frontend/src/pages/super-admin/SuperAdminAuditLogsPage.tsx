import React, { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { superAdminService, SuperAdminAuditLog } from '@/services/superAdminService'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Copy, Eye, RefreshCcw } from 'lucide-react'
import { toast } from 'sonner'

const eventOptions = [
  'super_admin.user_created',
  'super_admin.user_updated',
  'super_admin.user_deactivated',
  'super_admin.user_reactivated',
  'super_admin.user_reset_sent',
]

function formatIso(iso: string | null) {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleString()
}

function severityVariant(sev: string | null | undefined) {
  const s = (sev || '').toLowerCase()
  if (s === 'critical' || s === 'error') return 'destructive'
  if (s === 'warning') return 'outline'
  return 'secondary'
}

function formatDetailValue(v: unknown) {
  if (v == null) return ''
  if (typeof v === 'string') return v
  if (typeof v === 'number' || typeof v === 'boolean') return String(v)
  if (Array.isArray(v)) return `List (${v.length})`
  if (typeof v === 'object') return 'Object'
  return String(v)
}

function pickDetailsSummary(details: Record<string, any> | null | undefined) {
  const d = details || {}
  const pairs: Array<{ k: string; v: string }> = []
  const push = (k: string, v: unknown) => {
    const vv = formatDetailValue(v)
    if (!vv) return
    pairs.push({ k, v: vv })
  }

  push('target_user_id', d.target_user_id)
  push('user_id', d.user_id)
  push('tenant_id', d.tenant_id)
  push('school', d.school_name || d.tenant_name)
  push('email_sent', d.email_sent)

  if (pairs.length === 0) {
    const keys = Object.keys(d)
    if (keys.length) pairs.push({ k: 'fields', v: String(keys.length) })
  }

  return pairs.slice(0, 3)
}

const SuperAdminAuditLogsPage: React.FC = () => {
  const { t } = useTranslation()
  const [items, setItems] = useState<SuperAdminAuditLog[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [q, setQ] = useState('')
  const [eventType, setEventType] = useState('')
  const [page, setPage] = useState(1)
  const [pages, setPages] = useState(1)
  const [selected, setSelected] = useState<SuperAdminAuditLog | null>(null)
  const [detailsOpen, setDetailsOpen] = useState(false)
  const [refreshNonce, setRefreshNonce] = useState(0)

  const queryKey = useMemo(() => ({ q, eventType, page, refreshNonce }), [q, eventType, page, refreshNonce])

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
      <Dialog
        open={detailsOpen}
        onOpenChange={(v) => {
          setDetailsOpen(v)
          if (!v) setSelected(null)
        }}
      >
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>{t('super_admin.audit_logs.details.title', 'Audit log')}</DialogTitle>
          </DialogHeader>
          {selected ? (
            <div className="space-y-4">
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div className="space-y-1">
                  <div className="text-xs text-muted-foreground">{t('super_admin.audit_logs.table.time', 'Time')}</div>
                  <div className="text-sm font-medium text-slate-900">{formatIso(selected.created_at || null)}</div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={severityVariant(selected.severity)}>{selected.severity || 'info'}</Badge>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={async () => {
                      const raw = JSON.stringify(selected, null, 2)
                      try {
                        await navigator.clipboard.writeText(raw)
                        toast.success(t('common.copied', 'Copied'))
                      } catch {
                        toast.error(t('common.error', 'Error'), {
                          description: t('common.copy_failed', 'Copy failed')
                        })
                      }
                    }}
                  >
                    <Copy className="h-4 w-4 mr-1.5" />
                    {t('common.copy', 'Copy')}
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="rounded-lg border border-slate-200 bg-white p-3">
                  <div className="text-xs text-slate-500">{t('super_admin.audit_logs.table.event', 'Event')}</div>
                  <div className="text-sm font-semibold text-slate-900 break-words">{selected.event_type}</div>
                </div>
                <div className="rounded-lg border border-slate-200 bg-white p-3">
                  <div className="text-xs text-slate-500">{t('super_admin.audit_logs.details.actor', 'Actor user')}</div>
                  <div className="text-sm font-semibold text-slate-900">{selected.actor_user_id ?? '—'}</div>
                </div>
                <div className="rounded-lg border border-slate-200 bg-white p-3">
                  <div className="text-xs text-slate-500">{t('super_admin.audit_logs.details.endpoint', 'Endpoint')}</div>
                  <div className="text-sm font-mono text-slate-900 break-words">{selected.method ? `${selected.method.toUpperCase()} ` : ''}{selected.endpoint || '—'}</div>
                </div>
                <div className="rounded-lg border border-slate-200 bg-white p-3">
                  <div className="text-xs text-slate-500">{t('super_admin.audit_logs.details.ip', 'IP')}</div>
                  <div className="text-sm font-semibold text-slate-900">{selected.ip_address || '—'}</div>
                </div>
              </div>

              <div className="rounded-lg border border-slate-200 bg-white p-3">
                <div className="text-xs text-slate-500 mb-2">{t('super_admin.audit_logs.table.details', 'Details')}</div>
                {selected.details && Object.keys(selected.details).length ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {Object.entries(selected.details).map(([k, v]) => (
                      <div key={k} className="flex items-start justify-between gap-2 rounded-md border border-slate-200 px-2.5 py-2">
                        <div className="text-xs font-medium text-slate-700 break-all">{k}</div>
                        <div className="text-xs text-slate-900 text-right break-all">{formatDetailValue(v)}</div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-sm text-muted-foreground">—</div>
                )}
              </div>
            </div>
          ) : (
            <div className="text-sm text-muted-foreground">{t('super_admin.audit_logs.details.empty', 'Select a log entry to view details.')}</div>
          )}
        </DialogContent>
      </Dialog>

      <div>
        <h1 className="text-2xl font-semibold">{t('super_admin.audit_logs.title', 'Audit logs')}</h1>
        <p className="text-sm text-muted-foreground">{t('super_admin.audit_logs.subtitle', 'Immutable record of Super Admin actions.')}</p>
      </div>

      <Card className="border-slate-200">
        <CardContent className="p-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-end">
            <div className="flex-1 min-w-0">
              <div className="text-xs font-medium text-slate-700 mb-1">{t('common.search', 'Search')}</div>
              <Input
                placeholder={t('super_admin.audit_logs.search_placeholder', 'Search event, endpoint, details')}
                value={q}
                onChange={(e) => { setQ(e.target.value); setPage(1) }}
              />
            </div>
            <div className="w-full lg:w-80">
              <div className="text-xs font-medium text-slate-700 mb-1">{t('super_admin.audit_logs.filters.event_type', 'Event type')}</div>
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
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setRefreshNonce((n) => n + 1)}>
                <RefreshCcw className="h-4 w-4 mr-1.5" />
                {t('common.refresh', 'Refresh')}
              </Button>
              <Button variant="outline" onClick={() => { setQ(''); setEventType(''); setPage(1) }}>
                {t('common.clear', 'Clear')}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

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
                  <th className="text-left px-4 py-3 font-medium">{t('super_admin.audit_logs.details.endpoint', 'Endpoint')}</th>
                  <th className="text-left px-4 py-3 font-medium">{t('super_admin.audit_logs.table.details', 'Details')}</th>
                  <th className="text-right px-4 py-3 font-medium">{t('common.actions', 'Actions')}</th>
                </tr>
              </thead>
              <tbody>
                {items.length === 0 ? (
                  <tr><td colSpan={7} className="px-4 py-10 text-center text-muted-foreground">{t('super_admin.audit_logs.empty', 'No logs found')}</td></tr>
                ) : (
                  items.map((l) => (
                    <tr key={l.id} className="border-t">
                      <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">{formatIso(l.created_at || null)}</td>
                      <td className="px-4 py-3 font-medium">
                        <div className="min-w-0">
                          <div className="truncate">{l.event_type}</div>
                          {l.actor_user_id != null ? (
                            <div className="text-xs text-muted-foreground truncate">
                              {t('super_admin.audit_logs.details.actor', 'Actor user')}: {l.actor_user_id}
                            </div>
                          ) : null}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={severityVariant(l.severity)}>{l.severity || 'info'}</Badge>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">
                        {typeof l.details?.target_user_id === 'number'
                          ? `user:${l.details.target_user_id}`
                          : typeof l.details?.tenant_id === 'string'
                            ? `tenant:${l.details.tenant_id}`
                            : ''}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground font-mono max-w-[320px] truncate">
                        {(l.method ? `${l.method.toUpperCase()} ` : '') + (l.endpoint || '')}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground max-w-[420px]">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {pickDetailsSummary(l.details as any).map((p) => (
                            <Badge key={p.k} variant="outline" className="border-slate-200 bg-white text-slate-700">
                              {p.k}: {p.v}
                            </Badge>
                          ))}
                          {(!l.details || Object.keys(l.details).length === 0) && (
                            <span className="text-xs text-muted-foreground">—</span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setSelected(l)
                              setDetailsOpen(true)
                            }}
                          >
                            <Eye className="h-4 w-4 mr-1.5" />
                            {t('common.view', 'View')}
                          </Button>
                        </div>
                      </td>
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

