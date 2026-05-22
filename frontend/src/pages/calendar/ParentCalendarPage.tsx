import React, { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { Calendar } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card'
import calendarService from '../../services/calendarService'

const ymd = (d: Date) => d.toISOString().slice(0, 10)
const startOfMonth = (d: Date) => new Date(d.getFullYear(), d.getMonth(), 1)
const endOfMonth = (d: Date) => new Date(d.getFullYear(), d.getMonth() + 1, 0)

export default function ParentCalendarPage() {
  const { t, i18n } = useTranslation()
  const [month] = useState(() => new Date())
  const from = startOfMonth(month)
  const to = endOfMonth(month)

  const { data: events, isLoading } = useQuery({
    queryKey: ['parent-calendar', ymd(from), ymd(to)],
    queryFn: () => calendarService.getEvents({ start_date: ymd(from), end_date: ymd(to) }),
    staleTime: 30_000
  })

  const list = useMemo(() => {
    const arr = Array.isArray(events) ? events : []
    return [...arr].sort((a: any, b: any) => String(a.date).localeCompare(String(b.date)))
  }, [events])

  return (
    <div className="p-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" /> {t('calendar.title', 'Calendar')}
          </CardTitle>
          <CardDescription>{t('calendar.description', 'Read-only school calendar')}</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-sm text-slate-600">{t('common.loading', 'Loading…')}</div>
          ) : !list.length ? (
            <div className="text-sm text-slate-600">{t('calendar.no_events_current_month', 'No events this month.')}</div>
          ) : (
            <div className="space-y-2">
              {list.map((e: any) => (
                <div key={e.id} className="rounded-lg border border-slate-200 p-3">
                  <div className="text-sm font-semibold text-slate-900">{e.title}</div>
                  <div className="text-xs text-slate-600">
                    {e.date ? new Date(e.date).toLocaleString(i18n.language) : ''}
                    {e.location ? ` • ${e.location}` : ''}
                  </div>
                  {e.description ? <div className="text-xs text-slate-600 mt-1">{e.description}</div> : null}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

