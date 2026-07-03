import React, { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  Download,
  Filter,
  MapPin,
  Plus,
  Save,
  X
} from 'lucide-react'
import { toast } from 'sonner'
import api from '../../lib/api'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import { Label } from '../../components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select'
import { Badge } from '../../components/ui/badge'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../../components/ui/dialog'
import { Textarea } from '../../components/ui/textarea'
import calendarService from '../../services/calendarService'
import examService, { DEFAULT_EXAM_VALUES, extractExamRows } from '../../services/examService'

type Period = {
  id: number
  name: string
  start: string
  end: string
}

type ClassItem = {
  id: number
  name: string
}

type SubjectItem = {
  id: number
  name: string
  teachers?: Array<{ id: number; name?: string }>
}

type TeacherItem = {
  id: number
  first_name?: string
  last_name?: string
  user?: { first_name?: string; last_name?: string }
}

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

const monthLabel = (d: Date) => d.toLocaleString(undefined, { month: 'long', year: 'numeric' })
const ymd = (d: Date) => d.toISOString().slice(0, 10)
const startOfMonth = (d: Date) => new Date(d.getFullYear(), d.getMonth(), 1)
const endOfMonth = (d: Date) => new Date(d.getFullYear(), d.getMonth() + 1, 0)

const SchedulePage: React.FC = () => {
  const queryClient = useQueryClient()
  const [activeTab, setActiveTab] = useState<'timetable' | 'exams' | 'events'>('timetable')
  const [filtersOpen, setFiltersOpen] = useState(false)

  const [academicYear, setAcademicYear] = useState('2024/2025')
  const [term, setTerm] = useState<'Term 1' | 'Term 2' | 'Term 3'>('Term 1')
  const [selectedClassId, setSelectedClassId] = useState<number | null>(null)

  const [calendarMonth, setCalendarMonth] = useState(() => new Date())
  const [selectedDay, setSelectedDay] = useState(() => new Date())

  const [lessonOpen, setLessonOpen] = useState(false)
  const [lessonForm, setLessonForm] = useState({
    day_of_week: 'Monday',
    period_id: '',
    subject_id: '',
    teacher_id: '',
    room_id: ''
  })

  const [examOpen, setExamOpen] = useState(false)
  const [examForm, setExamForm] = useState({
    title: '',
    description: '',
    exam_date: '',
    duration: String(DEFAULT_EXAM_VALUES.duration),
    total_marks: String(DEFAULT_EXAM_VALUES.total_marks),
    passing_marks: String(DEFAULT_EXAM_VALUES.passing_marks),
    subject_id: ''
  })

  const [eventOpen, setEventOpen] = useState(false)
  const [eventForm, setEventForm] = useState({
    title: '',
    date: '',
    type: 'meeting' as 'class' | 'exam' | 'meeting' | 'holiday',
    description: '',
    location: ''
  })

  const { data: classesResp } = useQuery({
    queryKey: ['schedule', 'classes'],
    queryFn: async () => {
      const res = await api.get('/classes', { params: { per_page: 200 } })
      return res.data
    }
  })

  const classes: ClassItem[] = useMemo(() => {
    const list = classesResp?.classes
    return Array.isArray(list) ? list : []
  }, [classesResp])

  React.useEffect(() => {
    if (selectedClassId) return
    if (classes.length > 0) setSelectedClassId(classes[0].id)
  }, [classes, selectedClassId])

  const { data: periodsResp } = useQuery({
    queryKey: ['schedule', 'periods'],
    queryFn: async () => {
      const res = await api.get('/timetable/periods')
      return res.data
    }
  })

  const periods: Period[] = useMemo(() => {
    const list = periodsResp?.data
    return Array.isArray(list) ? list : []
  }, [periodsResp])

  const { data: subjectsResp } = useQuery({
    queryKey: ['schedule', 'subjects', selectedClassId],
    queryFn: async () => {
      if (!selectedClassId) {
        return { subjects: [] }
      }
      const res = await api.get(`/subjects/class/${selectedClassId}`, { params: { per_page: 200 } })
      return res.data
    },
    enabled: Boolean(selectedClassId)
  })

  const subjects: SubjectItem[] = useMemo(() => {
    const list = subjectsResp?.subjects
    return Array.isArray(list) ? list : []
  }, [subjectsResp])

  const selectedLessonSubject = useMemo(() => {
    return subjects.find((subject) => subject.id === Number(lessonForm.subject_id)) || null
  }, [subjects, lessonForm.subject_id])

  const allowedTeacherIds = useMemo(() => {
    return new Set((selectedLessonSubject?.teachers || []).map((teacher) => Number(teacher.id)))
  }, [selectedLessonSubject])

  const { data: teachersResp } = useQuery({
    queryKey: ['schedule', 'teachers'],
    queryFn: async () => {
      const res = await api.get('/teachers', { params: { per_page: 200 } })
      return res.data
    }
  })

  const teachers: TeacherItem[] = useMemo(() => {
    const list = teachersResp?.teachers
    const rawTeachers = Array.isArray(list) ? list : []
    if (allowedTeacherIds.size === 0) {
      return rawTeachers
    }
    return rawTeachers.filter((teacher) => allowedTeacherIds.has(Number(teacher.id)))
  }, [teachersResp, allowedTeacherIds])

  React.useEffect(() => {
    setLessonForm((prev) => ({ ...prev, subject_id: '', teacher_id: '' }))
    setExamForm((prev) => ({ ...prev, subject_id: '' }))
  }, [selectedClassId])

  React.useEffect(() => {
    if (!selectedLessonSubject) {
      return
    }

    const teacherIds = (selectedLessonSubject.teachers || []).map((teacher) => Number(teacher.id))
    if (teacherIds.length === 1) {
      setLessonForm((prev) => ({ ...prev, teacher_id: String(teacherIds[0]) }))
      return
    }

    if (lessonForm.teacher_id && !teacherIds.includes(Number(lessonForm.teacher_id))) {
      setLessonForm((prev) => ({ ...prev, teacher_id: '' }))
    }
  }, [selectedLessonSubject, lessonForm.teacher_id])

  const { data: timetableResp } = useQuery({
    queryKey: ['schedule', 'timetable', selectedClassId, academicYear, term],
    queryFn: async () => {
      const res = await api.get(`/timetable/class/${selectedClassId}`, {
        params: { academic_year: academicYear, term }
      })
      return res.data
    },
    enabled: Boolean(selectedClassId)
  })

  const timetable = timetableResp?.data || {}

  const { data: examsResp } = useQuery({
    queryKey: ['schedule', 'exams', selectedClassId],
    queryFn: () => examService.getExams({ page: 1, per_page: 50, class_id: selectedClassId || undefined }),
    enabled: Boolean(selectedClassId)
  })

  const exams = useMemo(() => {
    return extractExamRows(examsResp)
  }, [examsResp])

  const checkExamConflicts = async () => {
    if (!selectedClassId || !examForm.exam_date) {
      return []
    }

    const examsResponse = await examService.getExams({
      class_id: selectedClassId,
      date_from: examForm.exam_date.split('T')[0],
      date_to: examForm.exam_date.split('T')[0]
    })

    const sameDayExams = extractExamRows(examsResponse)
    const examStart = new Date(examForm.exam_date)
    const examEnd = new Date(examStart.getTime() + Number(examForm.duration || DEFAULT_EXAM_VALUES.duration) * 60000)

    return sameDayExams.filter((exam) => {
      const existingStart = new Date(exam.exam_date)
      const existingEnd = new Date(existingStart.getTime() + Number(exam.duration || DEFAULT_EXAM_VALUES.duration) * 60000)
      return examStart < existingEnd && examEnd > existingStart
    })
  }

  const monthStart = startOfMonth(calendarMonth)
  const monthEnd = endOfMonth(calendarMonth)

  const { data: eventsResp } = useQuery({
    queryKey: ['schedule', 'events', ymd(monthStart), ymd(monthEnd)],
    queryFn: () => calendarService.getEvents({ start_date: ymd(monthStart), end_date: ymd(monthEnd) })
  })

  const events = Array.isArray(eventsResp) ? eventsResp : []
  const upcomingEvents = useMemo(() => {
    const now = new Date()
    return [...events]
      .filter((e) => {
        const d = new Date(e.date)
        return d >= new Date(now.toISOString().slice(0, 10))
      })
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(0, 4)
  }, [events])

  const selectedDayKey = ymd(selectedDay)
  const selectedDayEvents = useMemo(() => {
    return events.filter((e: any) => String(e.date).slice(0, 10) === selectedDayKey)
  }, [events, selectedDayKey])

  const createLessonMutation = useMutation({
    mutationFn: async () => {
      if (!selectedClassId) throw new Error('Select a class')
      const period_id = Number(lessonForm.period_id)
      const subject_id = Number(lessonForm.subject_id)
      const teacher_id = Number(lessonForm.teacher_id)
      if (!period_id || !subject_id || !teacher_id) throw new Error('Fill all required fields')

      const room_id_val = lessonForm.room_id ? Number(lessonForm.room_id) : null
      const payload: any = {
        class_id: selectedClassId,
        day_of_week: lessonForm.day_of_week,
        period_id,
        subject_id,
        teacher_id,
        term,
        academic_year: academicYear
      }
      if (room_id_val && Number.isFinite(room_id_val)) payload.room_id = room_id_val
      const res = await api.post('/timetable/slots', payload)
      return res.data
    },
    onSuccess: () => {
      toast.success('Lesson added')
      setLessonOpen(false)
      queryClient.invalidateQueries({ queryKey: ['schedule', 'timetable'] })
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || e?.message || 'Failed to add lesson')
  })

  const createExamMutation = useMutation({
    mutationFn: async () => {
      if (!selectedClassId) throw new Error('Select a class')
      const subject_id = Number(examForm.subject_id)
      if (!subject_id) throw new Error('Select a subject')
      if (!examForm.title.trim()) throw new Error('Title is required')
      if (!examForm.exam_date) throw new Error('Exam date is required')

      const conflicts = await checkExamConflicts()
      if (conflicts.length > 0) {
        throw new Error('Exam conflicts with an existing class exam on the same time window')
      }

      const payload: any = {
        title: examForm.title.trim(),
        description: examForm.description.trim() || undefined,
        exam_date: new Date(examForm.exam_date).toISOString(),
        duration: Number(examForm.duration || DEFAULT_EXAM_VALUES.duration),
        total_marks: Number(examForm.total_marks || DEFAULT_EXAM_VALUES.total_marks),
        passing_marks: Number(examForm.passing_marks || DEFAULT_EXAM_VALUES.passing_marks),
        class_id: selectedClassId,
        subject_id,
        status: DEFAULT_EXAM_VALUES.status
      }
      return examService.createExam(payload)
    },
    onSuccess: () => {
      toast.success('Exam scheduled')
      setExamOpen(false)
      queryClient.invalidateQueries({ queryKey: ['schedule', 'exams'] })
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || e?.message || 'Failed to schedule exam')
  })

  const createEventMutation = useMutation({
    mutationFn: async () => {
      if (!eventForm.title.trim()) throw new Error('Title is required')
      if (!eventForm.date) throw new Error('Date is required')
      return calendarService.createEvent({
        title: eventForm.title.trim(),
        date: new Date(eventForm.date).toISOString(),
        type: eventForm.type,
        description: eventForm.description.trim() || undefined,
        location: eventForm.location.trim() || undefined,
        send_notification: true
      })
    },
    onSuccess: () => {
      toast.success('Event added')
      setEventOpen(false)
      queryClient.invalidateQueries({ queryKey: ['schedule', 'events'] })
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || e?.message || 'Failed to add event')
  })

  const exportTimetable = () => {
    if (!selectedClassId) return
    const className = classes.find((c) => c.id === selectedClassId)?.name || `class_${selectedClassId}`
    const rows: Array<Record<string, any>> = []
    for (const p of periods) {
      const row: any = { Time: `${p.start} - ${p.end}` }
      for (const d of days) {
        const cell = timetable?.[d]?.[p.id]
        row[d] = cell ? `${cell.subject} (${cell.teacher}) ${cell.room ? `Room ${cell.room}` : ''}`.trim() : ''
      }
      rows.push(row)
    }
    const csv = toCsv(rows)
    downloadBlob(`timetable_${className}_${academicYear}_${term}.csv`, new Blob([csv], { type: 'text/csv;charset=utf-8;' }))
    toast.success('Exported timetable')
  }

  const openLesson = () => {
    setLessonForm({ day_of_week: 'Monday', period_id: '', subject_id: '', teacher_id: '', room_id: '' })
    setLessonOpen(true)
  }

  const openExam = () => {
    setExamForm({
      title: '',
      description: '',
      exam_date: '',
      duration: String(DEFAULT_EXAM_VALUES.duration),
      total_marks: String(DEFAULT_EXAM_VALUES.total_marks),
      passing_marks: String(DEFAULT_EXAM_VALUES.passing_marks),
      subject_id: ''
    })
    setExamOpen(true)
  }

  const openEvent = (date?: Date) => {
    setEventForm({ title: '', date: date ? date.toISOString().slice(0, 16) : '', type: 'meeting', description: '', location: '' })
    setEventOpen(true)
  }

  const calendarCells = useMemo(() => {
    const first = startOfMonth(calendarMonth)
    const last = endOfMonth(calendarMonth)
    const startDayIndex = first.getDay()
    const daysInMonth = last.getDate()
    const cells: Array<{ date: Date | null; inMonth: boolean }>
      = []

    for (let i = 0; i < startDayIndex; i++) cells.push({ date: null, inMonth: false })
    for (let d = 1; d <= daysInMonth; d++) cells.push({ date: new Date(first.getFullYear(), first.getMonth(), d), inMonth: true })
    while (cells.length % 7 !== 0) cells.push({ date: null, inMonth: false })
    return cells
  }, [calendarMonth])

  return (
    <div className="p-6 bg-gradient-to-br from-indigo-50 to-white dark:from-slate-900 dark:to-slate-800 min-h-screen">
      <div className="max-w-7xl mx-auto flex flex-col lg:flex-row gap-6">
        <div className="w-full lg:w-80 space-y-6">
          <Card className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border border-indigo-100 dark:border-slate-700">
            <CardHeader>
              <CardTitle className="text-indigo-900 dark:text-white">Upcoming Events</CardTitle>
              <CardDescription className="text-indigo-600 dark:text-indigo-400">School events and activities</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {upcomingEvents.length === 0 ? (
                <div className="text-sm text-muted-foreground">No upcoming events this month.</div>
              ) : (
                upcomingEvents.map((e: any) => (
                  <div key={e.id} className="flex items-start">
                    <div className="bg-indigo-100 dark:bg-indigo-900/50 p-3 rounded-full mr-4">
                      <Calendar className="h-5 w-5 text-indigo-700 dark:text-indigo-400" />
                    </div>
                    <div className="min-w-0">
                      <div className="font-medium text-indigo-900 dark:text-white truncate">{e.title}</div>
                      <div className="text-xs text-indigo-600 dark:text-indigo-400 mt-1">{String(e.date).slice(0, 10)}</div>
                      {e.location ? (
                        <div className="flex items-center text-xs text-indigo-600 dark:text-indigo-400 mt-1">
                          <MapPin className="h-3 w-3 mr-1" />
                          <span className="truncate">{e.location}</span>
                        </div>
                      ) : null}
                    </div>
                  </div>
                ))
              )}

              <Button
                variant="outline"
                className="w-full"
                onClick={() => {
                  setActiveTab('events')
                }}
              >
                View Calendar
              </Button>
            </CardContent>
          </Card>
        </div>

        <div className="flex-1">
          <Card className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border border-indigo-100 dark:border-slate-700">
            <CardHeader>
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                <div>
                  <CardTitle className="text-indigo-900 dark:text-white">Schedule</CardTitle>
                  <CardDescription className="text-indigo-600 dark:text-indigo-400">Class timetables, exams, and events</CardDescription>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Select
                    value={selectedClassId ? String(selectedClassId) : ''}
                    onValueChange={(v) => setSelectedClassId(Number(v))}
                  >
                    <SelectTrigger className="w-[180px]">
                      <SelectValue placeholder="Select class" />
                    </SelectTrigger>
                    <SelectContent>
                      {classes.map((c) => (
                        <SelectItem key={c.id} value={String(c.id)}>
                          {c.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Button variant="outline" onClick={() => setFiltersOpen(true)}>
                    <Filter className="h-4 w-4 mr-2" />
                    Filters
                  </Button>
                </div>
              </div>
            </CardHeader>

            <CardContent>
              <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
                <TabsList className="mb-4 bg-indigo-100 dark:bg-slate-700">
                  <TabsTrigger value="timetable" className="data-[state=active]:bg-white dark:data-[state=active]:bg-slate-800">
                    Timetable
                  </TabsTrigger>
                  <TabsTrigger value="exams" className="data-[state=active]:bg-white dark:data-[state=active]:bg-slate-800">
                    Exams
                  </TabsTrigger>
                  <TabsTrigger value="events" className="data-[state=active]:bg-white dark:data-[state=active]:bg-slate-800">
                    Events
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="timetable" className="mt-0 space-y-4">
                  {periods.length === 0 ? (
                    <div className="text-sm text-muted-foreground">No periods configured yet.</div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full border-collapse">
                        <thead>
                          <tr>
                            <th className="p-3 text-left text-indigo-900 dark:text-white font-medium">Time</th>
                            {days.map((d) => (
                              <th key={d} className="p-3 text-left text-indigo-900 dark:text-white font-medium">{d}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {periods.map((p) => (
                            <tr key={p.id} className="border-t border-indigo-100 dark:border-slate-700">
                              <td className="p-3 text-indigo-700 dark:text-indigo-300 font-medium whitespace-nowrap">{p.start} - {p.end}</td>
                              {days.map((d) => {
                                const cell = timetable?.[d]?.[p.id]
                                return (
                                  <td key={d} className="p-3 align-top">
                                    {cell ? (
                                      <div className="bg-indigo-50 dark:bg-slate-700 p-3 rounded-lg border border-indigo-100 dark:border-slate-600">
                                        <div className="font-medium text-indigo-900 dark:text-white">{cell.subject}</div>
                                        <div className="text-sm text-indigo-600 dark:text-indigo-400 mt-1">{cell.teacher}</div>
                                        <div className="text-xs text-indigo-500 dark:text-indigo-300 mt-1">{cell.room ? `Room: ${cell.room}` : ''}</div>
                                      </div>
                                    ) : (
                                      <div className="h-14 rounded-lg border border-dashed border-indigo-200 dark:border-slate-600" />
                                    )}
                                  </td>
                                )
                              })}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}

                  <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={exportTimetable}>
                      <Download className="h-4 w-4 mr-2" />
                      Export
                    </Button>
                    <Button className="bg-indigo-600 hover:bg-indigo-700 text-white" onClick={openLesson}>
                      <Plus className="h-4 w-4 mr-2" />
                      Add Lesson
                    </Button>
                  </div>
                </TabsContent>

                <TabsContent value="exams" className="mt-0 space-y-4">
                  {exams.length === 0 ? (
                    <div className="text-sm text-muted-foreground">No exams scheduled for this class.</div>
                  ) : (
                    <div className="space-y-3">
                      {exams.map((x: any) => (
                        <Card key={x.id} className="bg-white dark:bg-slate-800 border border-indigo-100 dark:border-slate-700">
                          <CardContent className="p-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                            <div>
                              <div className="font-medium text-indigo-900 dark:text-white">{x.title}</div>
                              <div className="text-xs text-indigo-600 dark:text-indigo-400 mt-1">{String(x.exam_date).slice(0, 10)}</div>
                            </div>
                            <div className="flex items-center gap-2">
                              <Badge className="bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300">{x.status}</Badge>
                              <Badge className="bg-slate-100 text-slate-800 dark:bg-slate-700 dark:text-slate-200">{x.duration} min</Badge>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}

                  <div className="flex justify-end">
                    <Button className="bg-indigo-600 hover:bg-indigo-700 text-white" onClick={openExam}>
                      <Plus className="h-4 w-4 mr-2" />
                      Schedule Exam
                    </Button>
                  </div>
                </TabsContent>

                <TabsContent value="events" className="mt-0">
                  <div className="flex flex-col lg:flex-row gap-6">
                    <div className="flex-1">
                      <Card className="bg-white dark:bg-slate-800 border border-indigo-100 dark:border-slate-700">
                        <CardHeader>
                          <div className="flex items-center justify-between">
                            <CardTitle className="text-indigo-900 dark:text-white">{monthLabel(calendarMonth)}</CardTitle>
                            <div className="flex gap-1">
                              <Button
                                variant="outline"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() - 1, 1))}
                              >
                                <ChevronLeft className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="outline"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1, 1))}
                              >
                                <ChevronRight className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        </CardHeader>
                        <CardContent>
                          <div className="grid grid-cols-7 gap-1">
                            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
                              <div key={d} className="text-center text-sm font-medium text-indigo-900 dark:text-white py-2">{d}</div>
                            ))}
                            {calendarCells.map((c, idx) => {
                              const key = c.date ? ymd(c.date) : ''
                              const hasEvent = c.date ? events.some((e: any) => String(e.date).slice(0, 10) === key) : false
                              const isSelected = c.date ? ymd(c.date) === selectedDayKey : false
                              return (
                                <div
                                  key={idx}
                                  className={`aspect-square flex flex-col items-center justify-center rounded-md text-sm cursor-pointer hover:bg-indigo-50 dark:hover:bg-slate-700 ${
                                    c.inMonth ? 'text-indigo-900 dark:text-white' : 'text-indigo-400 dark:text-slate-500'
                                  } ${isSelected ? 'bg-indigo-100 dark:bg-indigo-900/30 font-medium' : ''} ${
                                    hasEvent && c.inMonth ? 'border-2 border-indigo-300 dark:border-indigo-700' : ''
                                  }`}
                                  onClick={() => {
                                    if (!c.date) return
                                    setSelectedDay(c.date)
                                  }}
                                >
                                  {c.date ? c.date.getDate() : ''}
                                  {hasEvent && c.inMonth ? <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full mt-1" /> : null}
                                </div>
                              )
                            })}
                          </div>
                        </CardContent>
                      </Card>
                    </div>

                    <div className="lg:w-96">
                      <Card className="bg-white dark:bg-slate-800 border border-indigo-100 dark:border-slate-700">
                        <CardHeader>
                          <div className="flex items-center justify-between">
                            <CardTitle className="text-indigo-900 dark:text-white">Events</CardTitle>
                            <Button
                              size="sm"
                              className="bg-indigo-600 hover:bg-indigo-700 text-white"
                              onClick={() => openEvent(selectedDay)}
                            >
                              <Plus className="h-4 w-4 mr-2" />
                              Add
                            </Button>
                          </div>
                          <CardDescription className="text-indigo-600 dark:text-indigo-400">{selectedDayKey}</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-3">
                          {selectedDayEvents.length === 0 ? (
                            <div className="text-sm text-muted-foreground">No events for this day.</div>
                          ) : (
                            selectedDayEvents.map((e: any) => (
                              <div key={e.id} className="rounded-lg border p-4 bg-indigo-50 dark:bg-slate-700">
                                <div className="font-medium text-indigo-900 dark:text-white">{e.title}</div>
                                {e.location ? (
                                  <div className="flex items-center text-sm text-indigo-600 dark:text-indigo-300 mt-2">
                                    <MapPin className="h-4 w-4 mr-2" />
                                    <span className="truncate">{e.location}</span>
                                  </div>
                                ) : null}
                                {e.description ? (
                                  <div className="text-sm text-indigo-700 dark:text-indigo-200 mt-2">{e.description}</div>
                                ) : null}
                              </div>
                            ))
                          )}
                        </CardContent>
                      </Card>
                    </div>
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>
      </div>

      <Dialog open={filtersOpen} onOpenChange={setFiltersOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Schedule filters</DialogTitle>
            <DialogDescription>Set academic year and term for timetable/exams.</DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Academic year</Label>
              <Input value={academicYear} onChange={(e) => setAcademicYear(e.target.value)} placeholder="2024/2025" />
            </div>
            <div className="space-y-2">
              <Label>Term</Label>
              <Select value={term} onValueChange={(v) => setTerm(v as any)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Term 1">Term 1</SelectItem>
                  <SelectItem value="Term 2">Term 2</SelectItem>
                  <SelectItem value="Term 3">Term 3</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setFiltersOpen(false)}>Close</Button>
            <Button className="bg-indigo-600 hover:bg-indigo-700 text-white" onClick={() => setFiltersOpen(false)}>
              <Save className="h-4 w-4 mr-2" />
              Apply
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={lessonOpen} onOpenChange={setLessonOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Add lesson</DialogTitle>
            <DialogDescription>Create a timetable slot for the selected class.</DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Day</Label>
              <Select value={lessonForm.day_of_week} onValueChange={(v) => setLessonForm((p) => ({ ...p, day_of_week: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {days.map((d) => (
                    <SelectItem key={d} value={d}>{d}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Period</Label>
              <Select value={lessonForm.period_id} onValueChange={(v) => setLessonForm((p) => ({ ...p, period_id: v }))}>
                <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>
                  {periods.map((p) => (
                    <SelectItem key={p.id} value={String(p.id)}>{p.name} ({p.start}-{p.end})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Subject</Label>
              <Select value={lessonForm.subject_id} onValueChange={(v) => setLessonForm((p) => ({ ...p, subject_id: v, teacher_id: '' }))}>
                <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>
                  {subjects.map((s) => (
                    <SelectItem key={s.id} value={String(s.id)}>{s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedClassId && subjects.length === 0 ? (
                <p className="text-xs text-amber-700">
                  No subjects are assigned to this class yet. Configure them in Settings &gt; Academic &gt; Subjects first.
                </p>
              ) : null}
            </div>

            <div className="space-y-2">
              <Label>Teacher</Label>
              <Select value={lessonForm.teacher_id} onValueChange={(v) => setLessonForm((p) => ({ ...p, teacher_id: v }))}>
                <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>
                  {teachers.map((t) => {
                    const fn = t.user?.first_name || t.first_name || ''
                    const ln = t.user?.last_name || t.last_name || ''
                    const label = `${fn} ${ln}`.trim() || `Teacher ${t.id}`
                    return (
                      <SelectItem key={t.id} value={String(t.id)}>{label}</SelectItem>
                    )
                  })}
                </SelectContent>
              </Select>
              {lessonForm.subject_id && teachers.length === 0 ? (
                <p className="text-xs text-amber-700">
                  No teachers are assigned to this subject yet. Update the subject setup before saving the slot.
                </p>
              ) : null}
            </div>

            <div className="space-y-2">
              <Label>Room (optional)</Label>
              <Input value={lessonForm.room_id} onChange={(e) => setLessonForm((p) => ({ ...p, room_id: e.target.value }))} placeholder="101" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setLessonOpen(false)}>
              <X className="h-4 w-4 mr-2" />
              Cancel
            </Button>
            <Button className="bg-indigo-600 hover:bg-indigo-700 text-white" disabled={createLessonMutation.isPending} onClick={() => createLessonMutation.mutate()}>
              {createLessonMutation.isPending ? 'Saving…' : 'Save lesson'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={examOpen} onOpenChange={setExamOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Schedule exam</DialogTitle>
            <DialogDescription>Create a new exam for the selected class.</DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2 md:col-span-2">
              <Label>Title</Label>
              <Input value={examForm.title} onChange={(e) => setExamForm((p) => ({ ...p, title: e.target.value }))} placeholder="Mid-Term Mathematics" />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label>Description (optional)</Label>
              <Textarea value={examForm.description} onChange={(e) => setExamForm((p) => ({ ...p, description: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Date & time</Label>
              <Input type="datetime-local" value={examForm.exam_date} onChange={(e) => setExamForm((p) => ({ ...p, exam_date: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Duration (min)</Label>
              <Input type="number" value={examForm.duration} onChange={(e) => setExamForm((p) => ({ ...p, duration: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Total marks</Label>
              <Input type="number" value={examForm.total_marks} onChange={(e) => setExamForm((p) => ({ ...p, total_marks: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Passing marks</Label>
              <Input type="number" value={examForm.passing_marks} onChange={(e) => setExamForm((p) => ({ ...p, passing_marks: e.target.value }))} />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label>Subject</Label>
              <Select value={examForm.subject_id} onValueChange={(v) => setExamForm((p) => ({ ...p, subject_id: v }))}>
                <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>
                  {subjects.map((s) => (
                    <SelectItem key={s.id} value={String(s.id)}>{s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedClassId && subjects.length === 0 ? (
                <p className="text-xs text-amber-700">
                  Add and assign subjects to this class before scheduling exams.
                </p>
              ) : null}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setExamOpen(false)}>Cancel</Button>
            <Button className="bg-indigo-600 hover:bg-indigo-700 text-white" disabled={createExamMutation.isPending} onClick={() => createExamMutation.mutate()}>
              {createExamMutation.isPending ? 'Saving…' : 'Schedule'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={eventOpen} onOpenChange={setEventOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Add event</DialogTitle>
            <DialogDescription>Create a calendar event.</DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2 md:col-span-2">
              <Label>Title</Label>
              <Input value={eventForm.title} onChange={(e) => setEventForm((p) => ({ ...p, title: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Date & time</Label>
              <Input type="datetime-local" value={eventForm.date} onChange={(e) => setEventForm((p) => ({ ...p, date: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Type</Label>
              <Select value={eventForm.type} onValueChange={(v) => setEventForm((p) => ({ ...p, type: v as any }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="meeting">Meeting</SelectItem>
                  <SelectItem value="class">Class</SelectItem>
                  <SelectItem value="exam">Exam</SelectItem>
                  <SelectItem value="holiday">Holiday</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label>Location (optional)</Label>
              <Input value={eventForm.location} onChange={(e) => setEventForm((p) => ({ ...p, location: e.target.value }))} />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label>Description (optional)</Label>
              <Textarea value={eventForm.description} onChange={(e) => setEventForm((p) => ({ ...p, description: e.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEventOpen(false)}>Cancel</Button>
            <Button className="bg-indigo-600 hover:bg-indigo-700 text-white" disabled={createEventMutation.isPending} onClick={() => createEventMutation.mutate()}>
              {createEventMutation.isPending ? 'Saving…' : 'Add event'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default SchedulePage
