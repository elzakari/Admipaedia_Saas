import React, { useEffect, useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { Calendar, Download } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs'
import { Button } from '../../components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select'
import parentService from '../../services/parentService'
import timetableService from '../../services/timetableService'
import examService from '../../services/examService'
import calendarService from '../../services/calendarService'

const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']

const toCsv = (rows: Array<Record<string, any>>) => {
  const headers = Array.from(new Set(rows.flatMap((r) => Object.keys(r))))
  const escape = (v: any) => {
    const s = v === null || v === undefined ? '' : String(v)
    const needs = /[",\n]/.test(s)
    const escaped = s.replace(/"/g, '""')
    return needs ? `"${escaped}"` : escaped
  }
  return [headers.join(','), ...rows.map((r) => headers.map((h) => escape((r as any)[h])).join(','))].join('\n')
}

const downloadBlob = (filename: string, data: Blob) => {
  const url = URL.createObjectURL(data)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

const ymd = (d: Date) => d.toISOString().slice(0, 10)
const startOfMonth = (d: Date) => new Date(d.getFullYear(), d.getMonth(), 1)
const endOfMonth = (d: Date) => new Date(d.getFullYear(), d.getMonth() + 1, 0)

const ParentSchedulePage: React.FC = () => {
  const { t, i18n } = useTranslation()
  const [activeTab, setActiveTab] = useState<'timetable' | 'exams' | 'events'>('timetable')
  const [academicYear, setAcademicYear] = useState('2024/2025')
  const [term, setTerm] = useState<'Term 1' | 'Term 2' | 'Term 3'>('Term 1')
  const [selectedChildId, setSelectedChildId] = useState<number | null>(null)
  const [calendarMonth] = useState(() => new Date())

  const { data: children, isLoading: childrenLoading } = useQuery({
    queryKey: ['parent-children'],
    queryFn: () => parentService.getMyChildren(),
    staleTime: 30_000
  })

  useEffect(() => {
    if (selectedChildId) return
    const first = (children || [])[0]
    if (first?.id) setSelectedChildId(Number(first.id))
  }, [children, selectedChildId])

  const selectedChild = useMemo(() => {
    if (!selectedChildId) return null
    return (children || []).find((c: any) => Number(c.id) === selectedChildId) || null
  }, [children, selectedChildId])

  const classId = Number((selectedChild as any)?.class_id)

  const { data: timetable, isLoading: timetableLoading } = useQuery({
    queryKey: ['parent-schedule', 'timetable', classId, academicYear, term],
    queryFn: () => timetableService.getClassTimetable(classId, academicYear, term),
    enabled: Number.isFinite(classId) && classId > 0,
    staleTime: 30_000
  })

  const { data: examsResp, isLoading: examsLoading } = useQuery({
    queryKey: ['parent-schedule', 'exams', classId],
    queryFn: () => examService.getExams({ page: 1, per_page: 50, class_id: classId }),
    enabled: Number.isFinite(classId) && classId > 0,
    staleTime: 30_000
  })

  const exams = useMemo(() => {
    const list = (examsResp as any)?.exams
    return Array.isArray(list) ? list : []
  }, [examsResp])

  const monthStart = startOfMonth(calendarMonth)
  const monthEnd = endOfMonth(calendarMonth)

  const { data: eventsResp, isLoading: eventsLoading } = useQuery({
    queryKey: ['parent-schedule', 'events', ymd(monthStart), ymd(monthEnd)],
    queryFn: () => calendarService.getEvents({ start_date: ymd(monthStart), end_date: ymd(monthEnd) }),
    staleTime: 30_000
  })

  const events = Array.isArray(eventsResp) ? eventsResp : []
  const upcomingEvents = useMemo(() => {
    const now = new Date()
    return [...events]
      .filter((e: any) => {
        const d = new Date(e.date)
        return d >= new Date(now.toISOString().slice(0, 10))
      })
      .sort((a: any, b: any) => String(a.date).localeCompare(String(b.date)))
      .slice(0, 4)
  }, [events])

  const exportTimetable = () => {
    const rows: Array<Record<string, any>> = []
    const t = timetable || {}
    for (const day of days) {
      const entries = (t as any)[day] || []
      for (const e of entries) {
        rows.push({
          day,
          start_time: e.start_time,
          end_time: e.end_time,
          subject: e.subject_name,
          teacher: e.teacher_name,
          room: e.room_number
        })
      }
    }
    const csv = toCsv(rows)
    downloadBlob('timetable.csv', new Blob([csv], { type: 'text/csv;charset=utf-8;' }))
  }

  return (
    <div className="p-6 space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>{t('schedule.upcoming_events', 'Upcoming Events')}</CardTitle>
            <CardDescription>{t('schedule.events_description', 'School events and activities')}</CardDescription>
          </CardHeader>
          <CardContent>
            {eventsLoading ? (
              <div className="text-sm text-slate-600">{t('common.loading', 'Loading…')}</div>
            ) : upcomingEvents.length ? (
              <div className="space-y-3">
                {upcomingEvents.map((e: any) => (
                  <div key={e.id} className="rounded-lg border border-slate-200 p-3">
                    <div className="text-sm font-semibold text-slate-900">{e.title}</div>
                    <div className="text-xs text-slate-600">{e.date ? new Date(e.date).toLocaleString(i18n.language) : ''}</div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-sm text-slate-600">{t('schedule.no_events', 'No upcoming events this month.')}</div>
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle>{t('schedule.title', 'Schedule')}</CardTitle>
              <CardDescription>{t('schedule.subtitle', 'Timetable, exams, and events')}</CardDescription>
            </div>
            <div className="flex gap-2 items-center">
              <Select
                value={selectedChildId ? String(selectedChildId) : ''}
                onValueChange={(v) => setSelectedChildId(v ? Number(v) : null)}
                disabled={childrenLoading}
              >
                <SelectTrigger className="w-[220px]">
                  <SelectValue placeholder={t('schedule.select_child', 'Select child')} />
                </SelectTrigger>
                <SelectContent>
                  {(children || []).map((c: any) => (
                    <SelectItem key={c.id} value={String(c.id)}>
                      {(c.full_name || `${c.first_name || ''} ${c.last_name || ''}`.trim() || 'Student')} - {c.class_name || (c.class_id ? `Class ${c.class_id}` : 'Class')}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={term} onValueChange={(v) => setTerm(v as any)}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder={t('schedule.term', 'Term')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Term 1">{t('schedule.terms.term_1', 'Term 1')}</SelectItem>
                  <SelectItem value="Term 2">{t('schedule.terms.term_2', 'Term 2')}</SelectItem>
                  <SelectItem value="Term 3">{t('schedule.terms.term_3', 'Term 3')}</SelectItem>
                </SelectContent>
              </Select>
              <Select value={academicYear} onValueChange={setAcademicYear}>
                <SelectTrigger className="w-[160px]">
                  <SelectValue placeholder={t('schedule.academic_year', 'Academic year')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="2024/2025">2024/2025</SelectItem>
                  <SelectItem value="2025/2026">2025/2026</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardHeader>

          <CardContent className="space-y-4">
            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
              <TabsList>
                <TabsTrigger value="timetable">{t('schedule.tabs.timetable', 'Timetable')}</TabsTrigger>
                <TabsTrigger value="exams">{t('schedule.tabs.exams', 'Exams')}</TabsTrigger>
                <TabsTrigger value="events">{t('schedule.tabs.events', 'Events')}</TabsTrigger>
              </TabsList>

              <TabsContent value="timetable" className="space-y-3">
                {timetableLoading ? (
                  <div className="text-sm text-slate-600">{t('common.loading', 'Loading…')}</div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {days.map((d) => (
                      <Card key={d}>
                        <CardHeader>
                          <CardTitle className="text-base flex items-center gap-2">
                            <Calendar className="h-4 w-4" /> {t(`schedule.days.${d.toLowerCase()}`, d)}
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-2">
                          {Array.isArray((timetable as any)?.[d]) && (timetable as any)[d].length ? (
                            (timetable as any)[d].map((e: any) => (
                              <div key={e.id} className="rounded-lg border border-slate-200 p-3">
                                <div className="text-sm font-semibold text-slate-900">{e.subject_name}</div>
                                <div className="text-xs text-slate-600">{e.start_time}–{e.end_time}{e.room_number ? ` • ${e.room_number}` : ''}</div>
                                <div className="text-xs text-slate-600">{e.teacher_name}</div>
                              </div>
                            ))
                          ) : (
                            <div className="text-sm text-slate-600">{t('schedule.no_periods', 'No periods configured yet.')}</div>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}

                <div className="flex justify-end">
                  <Button variant="outline" onClick={exportTimetable} disabled={timetableLoading}>
                    <Download className="h-4 w-4" />
                    {t('schedule.export', 'Export')}
                  </Button>
                </div>
              </TabsContent>

              <TabsContent value="exams" className="space-y-3">
                {examsLoading ? (
                  <div className="text-sm text-slate-600">{t('common.loading', 'Loading…')}</div>
                ) : exams.length ? (
                  <div className="space-y-2">
                    {exams.map((ex: any) => (
                      <div key={ex.id} className="rounded-lg border border-slate-200 p-3">
                        <div className="text-sm font-semibold text-slate-900">{ex.title}</div>
                        <div className="text-xs text-slate-600">{ex.exam_date ? new Date(ex.exam_date).toLocaleString(i18n.language) : ''}</div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-sm text-slate-600">{t('schedule.no_exams', 'No exams found.')}</div>
                )}
              </TabsContent>

              <TabsContent value="events" className="space-y-3">
                {eventsLoading ? (
                  <div className="text-sm text-slate-600">{t('common.loading', 'Loading…')}</div>
                ) : events.length ? (
                  <div className="space-y-2">
                    {events.slice(0, 20).map((e: any) => (
                      <div key={e.id} className="rounded-lg border border-slate-200 p-3">
                        <div className="text-sm font-semibold text-slate-900">{e.title}</div>
                        <div className="text-xs text-slate-600">{e.date ? new Date(e.date).toLocaleString(i18n.language) : ''}</div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-sm text-slate-600">{t('schedule.no_events_found', 'No events found.')}</div>
                )}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default ParentSchedulePage

