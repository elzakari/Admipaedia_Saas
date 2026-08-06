import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  AlertTriangle,
  BookOpen,
  CalendarDays,
  Clock3,
  Search,
  Users,
  Radio,
  Eye,
  Bell,
  ShieldAlert,
  MoreVertical,
  Send,
  Loader2,
  TrendingUp,
  BarChart3,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/table';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { MultiSelect, MultiSelectOption } from '../../components/ui/multi-select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '../../components/ui/alert-dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../../components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../../components/ui/dialog';
import { Label } from '../../components/ui/label';
import { Checkbox } from '../../components/ui/checkbox';
import { Textarea } from '../../components/ui/textarea';
import { useToast } from '../../components/ui/use-toast';
import { useAuth } from '../../contexts/AuthContext';
import classService from '../../services/classService';
import subjectService from '../../services/subjectService';
import departmentService from '../../services/departmentService';
import { LessonVisibility, BroadcastStatus, LessonMonitoringKpis } from '../../types/lesson';

const TODAY = new Date().toISOString().slice(0, 10);

const VISIBILITY_OPTIONS: MultiSelectOption[] = [
  { label: 'Private', value: 'private' },
  { label: 'Class Only', value: 'class_only' },
  { label: 'School Wide', value: 'school_wide' },
  { label: 'Public', value: 'public' },
];

const BROADCAST_STATUS_OPTIONS: MultiSelectOption[] = [
  { label: 'Scheduled', value: 'scheduled' },
  { label: 'Live', value: 'live' },
  { label: 'Paused', value: 'paused' },
  { label: 'Ended', value: 'ended' },
  { label: 'Cancelled', value: 'cancelled' },
  { label: 'Rebroadcasting', value: 'rebroadcasting' },
];

const PERIOD_OPTIONS: MultiSelectOption[] = Array.from({ length: 12 }, (_, i) => ({
  label: `Period ${i + 1}`,
  value: String(i + 1),
}));

function humanizeStatus(status?: string) {
  if (!status) return 'Unknown';
  if (status === 'completed') return 'Completed';
  if (status === 'in-progress') return 'In Progress';
  if (status === 'planned') return 'Planned';
  return status
    .split('-')
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(' ');
}

function getStatusVariant(status?: string): 'default' | 'secondary' | 'outline' | 'destructive' {
  if (status === 'completed') return 'default';
  if (status === 'in-progress') return 'secondary';
  if (status === 'planned') return 'outline';
  return 'secondary';
}

function formatClassLabel(classItem: any) {
  return classItem?.display_name || [classItem?.name, classItem?.section].filter(Boolean).join(' ') || classItem?.name || `Class ${classItem?.id}`;
}

function humanizeVisibility(visibility?: LessonVisibility | string) {
  switch (visibility) {
    case 'private': return 'Private';
    case 'class_only': return 'Class Only';
    case 'school_wide': return 'School Wide';
    case 'public': return 'Public';
    default: return visibility || '—';
  }
}

function getVisibilityVariant(visibility?: LessonVisibility | string): 'default' | 'secondary' | 'outline' | 'destructive' {
  switch (visibility) {
    case 'public': return 'default';
    case 'school_wide': return 'secondary';
    case 'class_only': return 'outline';
    case 'private': return 'destructive';
    default: return 'outline';
  }
}

function humanizeBroadcast(status?: BroadcastStatus | string) {
  if (!status) return 'Not Broadcast';
  return status
    .split('-')
    .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
    .join(' ');
}

function getBroadcastVariant(status?: BroadcastStatus | string): 'default' | 'secondary' | 'outline' | 'destructive' {
  switch (status) {
    case 'live': return 'default';
    case 'scheduled': return 'secondary';
    case 'rebroadcasting': return 'secondary';
    case 'paused': return 'outline';
    case 'ended': return 'outline';
    case 'cancelled': return 'destructive';
    default: return 'outline';
  }
}

function isNonCompliant(lesson: any): boolean {
  if (!lesson) return false;
  const isPlannedOrMissing = lesson.status === 'planned' || !lesson.status;
  const hasNoContent = !lesson.title && !lesson.description && !lesson.classwork && !lesson.homework;
  const ackRateLow = typeof lesson.engagement_ack_count === 'number'
    && typeof lesson.engagement_seen_count === 'number'
    && lesson.engagement_seen_count > 0
    && (lesson.engagement_ack_count / lesson.engagement_seen_count) < 0.5;
  return isPlannedOrMissing || hasNoContent || ackRateLow;
}

interface ReminderDialogState {
  open: boolean;
  lesson: any;
  channels: ('email' | 'sms' | 'app')[];
  message: string;
}

interface EscalateDialogState {
  open: boolean;
  lesson: any;
  note: string;
}

const DailyLessonMonitoring: React.FC = () => {
  const { t } = useTranslation();
  const { hasRole } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const isSuperAdmin = hasRole(['super_admin', 'super_manager']);

  const [selectedClassId, setSelectedClassId] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [dateFrom, setDateFrom] = useState(TODAY);
  const [dateTo, setDateTo] = useState(TODAY);
  const [searchTerm, setSearchTerm] = useState('');

  const [selectedDepartments, setSelectedDepartments] = useState<string[]>([]);
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>([]);
  const [selectedPeriods, setSelectedPeriods] = useState<string[]>([]);
  const [selectedVisibilities, setSelectedVisibilities] = useState<string[]>([]);
  const [selectedBroadcastStatuses, setSelectedBroadcastStatuses] = useState<string[]>([]);
  const [homeworkDueFrom, setHomeworkDueFrom] = useState('');
  const [homeworkDueTo, setHomeworkDueTo] = useState('');

  const [reminderState, setReminderState] = useState<ReminderDialogState>({
    open: false,
    lesson: null,
    channels: ['app', 'email'],
    message: '',
  });

  const [escalateState, setEscalateState] = useState<EscalateDialogState>({
    open: false,
    lesson: null,
    note: '',
  });

  const { data: classesResponse, isLoading: classesLoading } = useQuery({
    queryKey: ['admin-monitoring-classes'],
    queryFn: () => classService.getClasses({ page: 1, per_page: 200 }),
    staleTime: 60_000,
  });

  const { data: departmentsResponse, isLoading: departmentsLoading } = useQuery({
    queryKey: ['admin-monitoring-departments'],
    queryFn: () => departmentService.getAllDepartments(),
    staleTime: 5 * 60_000,
  });

  const { data: subjectsResponse, isLoading: subjectsLoading } = useQuery({
    queryKey: ['admin-monitoring-subjects'],
    queryFn: () => subjectService.getSubjects({ page: 1, per_page: 200 }),
    staleTime: 5 * 60_000,
  });

  const kpiFilters = useMemo(() => ({
    class_id: selectedClassId !== 'all' ? Number(selectedClassId) : undefined,
    subject_id: selectedSubjects.length === 1 ? Number(selectedSubjects[0]) : undefined,
    date_from: dateFrom || undefined,
    date_to: dateTo || undefined,
    status: selectedStatus !== 'all' ? selectedStatus : undefined,
    department_id: selectedDepartments.length === 1 ? Number(selectedDepartments[0]) : selectedDepartments.length > 1 ? selectedDepartments.map(Number) : undefined,
    period_number: selectedPeriods.length === 1 ? Number(selectedPeriods[0]) : selectedPeriods.length > 1 ? selectedPeriods.map(Number) : undefined,
    visibility: selectedVisibilities.length === 1 ? selectedVisibilities[0] : selectedVisibilities.length > 1 ? selectedVisibilities : undefined,
    broadcast_status: selectedBroadcastStatuses.length === 1 ? selectedBroadcastStatuses[0] : selectedBroadcastStatuses.length > 1 ? selectedBroadcastStatuses : undefined,
    homework_due_from: homeworkDueFrom || undefined,
    homework_due_to: homeworkDueTo || undefined,
    page: 1,
    per_page: 200,
  }), [selectedClassId, selectedSubjects, selectedDepartments, selectedPeriods, selectedVisibilities, selectedBroadcastStatuses, dateFrom, dateTo, selectedStatus, homeworkDueFrom, homeworkDueTo]);

  const {
    data: kpisData,
    isLoading: kpisLoading,
  } = useQuery({
    queryKey: ['lesson-monitoring-kpis', kpiFilters],
    queryFn: () => classService.getLessonMonitoringKpis(kpiFilters),
    staleTime: 30_000,
  });

  const kpis: LessonMonitoringKpis = useMemo(() => ({
    total_lessons: 0,
    live_lessons: 0,
    completed_lessons: 0,
    planned_lessons: 0,
    total_viewers: 0,
    average_viewers_per_lesson: 0,
    total_acknowledgements: 0,
    acknowledgement_rate: 0,
    total_comments: 0,
    teachers_with_lessons: 0,
    classes_with_lessons: 0,
    lessons_without_logs_today: 0,
    live_count: 0,
    peak_viewers_today: 0,
    ...(kpisData?.data || {}),
  }), [kpisData]);

  const {
    data: monitoringResponse,
    isLoading: monitoringLoading,
    isFetching: monitoringRefreshing,
  } = useQuery({
    queryKey: ['daily-lesson-monitoring-v2', kpiFilters],
    queryFn: () =>
      classService.getLessonMonitoring({
        ...kpiFilters,
      }),
    staleTime: 30_000,
  });

  const classes = classesResponse?.data || [];
  const summary = monitoringResponse?.summary || {
    total_logs: 0,
    completed_logs: 0,
    in_progress_logs: 0,
    planned_logs: 0,
    today_logs: 0,
    classes_covered: 0,
    teachers_reporting: 0,
    classes_without_logs_today: 0,
  };
  const lessons = monitoringResponse?.lessons || [];

  const departmentOptions: MultiSelectOption[] = useMemo(() => {
    const depts = Array.isArray(departmentsResponse) ? departmentsResponse : (departmentsResponse as any)?.data || [];
    return depts.map((d: any) => ({
      label: d.name || d.display_name || `Dept ${d.id}`,
      value: String(d.id),
    }));
  }, [departmentsResponse]);

  const subjectOptions: MultiSelectOption[] = useMemo(() => {
    const subs = subjectsResponse?.data || [];
    return subs.map((s: any) => ({
      label: s.name || s.display_name || `Subject ${s.id}`,
      value: String(s.id),
    }));
  }, [subjectsResponse]);

  const perClassOpenHomework = useMemo(() => {
    const counts: Record<number, number> = {};
    lessons.forEach((lesson: any) => {
      const classId = lesson.class_id;
      if (!classId) return;
      if (lesson.homework_due_date && new Date(lesson.homework_due_date) >= new Date(TODAY)) {
        counts[classId] = (counts[classId] || 0) + 1;
      }
    });
    return counts;
  }, [lessons]);

  const teacherWorkload = useMemo(() => {
    const map: Record<number, { class_size: number; subject_load: number }> = {};
    lessons.forEach((lesson: any) => {
      const tid = lesson.teacher_id;
      if (!tid) return;
      if (!map[tid]) {
        map[tid] = { class_size: 0, subject_load: 0 };
      }
      const cls = classes.find((c: any) => c.id === lesson.class_id);
      if (cls && cls.current_enrollment > map[tid].class_size) {
        map[tid].class_size = cls.current_enrollment || cls.capacity || 0;
      }
      map[tid].subject_load = (map[tid].subject_load || 0) + 1;
    });
    return map;
  }, [lessons, classes]);

  const filteredLessons = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    if (!query) return lessons;

    return lessons.filter((lesson: any) => {
      const haystack = [
        lesson.title,
        lesson.description,
        lesson.subject_name,
        lesson.teacher_name,
        lesson.class_name,
        typeof lesson.classwork === 'string' ? lesson.classwork : JSON.stringify(lesson.classwork || ''),
        typeof lesson.homework === 'string' ? lesson.homework : JSON.stringify(lesson.homework || ''),
        lesson.notes,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return haystack.includes(query);
    });
  }, [lessons, searchTerm]);

  const sendReminderMutation = useMutation({
    mutationFn: ({ lessonId, channels, message }: { lessonId: number; channels: ('email' | 'sms' | 'app')[]; message?: string }) =>
      classService.sendTeacherReminder(lessonId, { channels, message }),
    onSuccess: () => {
      toast({ title: 'Reminder sent', description: 'Teacher has been notified via selected channels.', variant: 'default' });
      setReminderState({ open: false, lesson: null, channels: ['app', 'email'], message: '' });
      queryClient.invalidateQueries({ queryKey: ['daily-lesson-monitoring-v2'] });
    },
    onError: (err: any) => {
      toast({ title: 'Failed to send reminder', description: err?.message || 'Please try again.', variant: 'destructive' });
    },
  });

  const escalateMutation = useMutation({
    mutationFn: ({ lessonId, note }: { lessonId: number; note?: string }) =>
      classService.escalateToPrincipal(lessonId, { note }),
    onSuccess: () => {
      toast({ title: 'Escalated to principal', description: 'Principal has been notified.', variant: 'default' });
      setEscalateState({ open: false, lesson: null, note: '' });
      queryClient.invalidateQueries({ queryKey: ['daily-lesson-monitoring-v2'] });
    },
    onError: (err: any) => {
      toast({ title: 'Escalation failed', description: err?.message || 'Please try again.', variant: 'destructive' });
    },
  });

  const handleReset = () => {
    setSelectedClassId('all');
    setSelectedStatus('all');
    setDateFrom(TODAY);
    setDateTo(TODAY);
    setSearchTerm('');
    setSelectedDepartments([]);
    setSelectedSubjects([]);
    setSelectedPeriods([]);
    setSelectedVisibilities([]);
    setSelectedBroadcastStatuses([]);
    setHomeworkDueFrom('');
    setHomeworkDueTo('');
  };

  const handleSendReminder = () => {
    if (!reminderState.lesson || reminderState.channels.length === 0) return;
    sendReminderMutation.mutate({
      lessonId: reminderState.lesson.id,
      channels: reminderState.channels,
      message: reminderState.message || undefined,
    });
  };

  const handleEscalate = () => {
    if (!escalateState.lesson) return;
    escalateMutation.mutate({
      lessonId: escalateState.lesson.id,
      note: escalateState.note || undefined,
    });
  };

  const toggleChannel = (channel: 'email' | 'sms' | 'app') => {
    setReminderState((prev) => ({
      ...prev,
      channels: prev.channels.includes(channel)
        ? prev.channels.filter((c) => c !== channel)
        : [...prev.channels, channel],
    }));
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-col gap-2">
        <h3 className="text-xl font-semibold text-slate-900">{t('admin_lessons.title', 'Daily Lessons Monitoring')}</h3>
        <p className="text-sm text-slate-500">
          {t('admin_lessons.subtitle', 'Track daily teaching, class coverage, teacher reporting, and live engagement.')}
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardContent className="flex items-center justify-between p-5">
            <div>
              <div className="text-sm text-slate-500">{t('admin_lessons.journal_logs', 'Lesson Logs')}</div>
              <div className="mt-2 text-2xl font-semibold text-slate-900">{summary.total_logs}</div>
              <div className="text-xs text-slate-500">{t('admin_lessons.within_filters', 'Within current filters')}</div>
            </div>
            <BookOpen className="h-5 w-5 text-indigo-600" />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center justify-between p-5">
            <div>
              <div className="text-sm text-slate-500">Live Now</div>
              <div className="mt-2 text-2xl font-semibold text-slate-900">{kpis.live_count}</div>
              <div className="text-xs text-slate-500">{kpis.live_lessons} active broadcasts</div>
            </div>
            <Radio className="h-5 w-5 text-red-600 animate-pulse" />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center justify-between p-5">
            <div>
              <div className="text-sm text-slate-500">Peak Viewers Today</div>
              <div className="mt-2 text-2xl font-semibold text-slate-900">{kpis.peak_viewers_today}</div>
              <div className="text-xs text-slate-500">Avg {kpis.average_viewers_per_lesson?.toFixed?.(1) || 0} per lesson</div>
            </div>
            <TrendingUp className="h-5 w-5 text-emerald-600" />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center justify-between p-5">
            <div>
              <div className="text-sm text-slate-500">{t('admin_lessons.missing_today', 'Missing Today')}</div>
              <div className="mt-2 text-2xl font-semibold text-slate-900">{summary.classes_without_logs_today}</div>
              <div className="text-xs text-slate-500">{summary.planned_logs} still planned</div>
            </div>
            <Clock3 className="h-5 w-5 text-amber-600" />
          </CardContent>
        </Card>
      </div>

      {summary.classes_without_logs_today > 0 ? (
        <Card className="border-amber-200 bg-amber-50/70">
          <CardContent className="flex items-start gap-3 p-4">
            <AlertTriangle className="mt-0.5 h-5 w-5 text-amber-600" />
            <div>
              <div className="font-medium text-amber-900">{t('admin_lessons.coverage_attention', 'Coverage requires attention')}</div>
              <div className="text-sm text-amber-800">
                {summary.classes_without_logs_today} class slots missing lesson logs in the current monitoring scope. Use the reminder actions below.
              </div>
            </div>
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>{t('admin_lessons.monitoring_filters', 'Monitoring Filters')}</CardTitle>
          <CardDescription>Refine daily teaching feed by department, subject, period, visibility, broadcast status and homework due range.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <Select value={selectedClassId} onValueChange={setSelectedClassId} disabled={classesLoading}>
              <SelectTrigger>
                <SelectValue placeholder="All classes" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All classes</SelectItem>
                {classes.map((classItem: any) => (
                  <SelectItem key={classItem.id} value={String(classItem.id)}>
                    {formatClassLabel(classItem)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={selectedStatus} onValueChange={setSelectedStatus}>
              <SelectTrigger>
                <SelectValue placeholder="All statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="in-progress">In Progress</SelectItem>
                <SelectItem value="planned">Planned</SelectItem>
              </SelectContent>
            </Select>

            <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
            <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
          </div>

          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <MultiSelect
              options={departmentOptions}
              selected={selectedDepartments}
              onChange={setSelectedDepartments}
              placeholder={departmentsLoading ? 'Loading departments…' : 'Departments'}
            />
            <MultiSelect
              options={subjectOptions}
              selected={selectedSubjects}
              onChange={setSelectedSubjects}
              placeholder={subjectsLoading ? 'Loading subjects…' : 'Subjects'}
            />
            <MultiSelect
              options={PERIOD_OPTIONS}
              selected={selectedPeriods}
              onChange={setSelectedPeriods}
              placeholder="Period numbers"
            />
            <MultiSelect
              options={VISIBILITY_OPTIONS}
              selected={selectedVisibilities}
              onChange={setSelectedVisibilities}
              placeholder="Visibility"
            />
          </div>

          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <MultiSelect
              options={BROADCAST_STATUS_OPTIONS}
              selected={selectedBroadcastStatuses}
              onChange={setSelectedBroadcastStatuses}
              placeholder="Broadcast status"
            />
            <div className="flex flex-col gap-1">
              <Label className="text-xs text-slate-500">Homework due from</Label>
              <Input type="date" value={homeworkDueFrom} onChange={(e) => setHomeworkDueFrom(e.target.value)} />
            </div>
            <div className="flex flex-col gap-1">
              <Label className="text-xs text-slate-500">Homework due to</Label>
              <Input type="date" value={homeworkDueTo} onChange={(e) => setHomeworkDueTo(e.target.value)} />
            </div>
            <div className="relative flex items-end">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Search teacher, subject, topic…"
                className="pl-9"
              />
            </div>
          </div>

          <div className="flex items-center justify-between text-xs text-slate-500">
            <div className="flex items-center gap-2">
              <CalendarDays className="h-4 w-4" />
              {monitoringRefreshing ? 'Refreshing lesson intelligence…' : `${filteredLessons.length} lesson logs visible`}
            </div>
            <Button variant="outline" size="sm" onClick={handleReset}>
              Reset filters
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
          <div>
            <CardTitle>Daily Teaching Feed</CardTitle>
            <CardDescription>Review logged lessons, teacher workload context, live coverage, and follow-up homework.</CardDescription>
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <BarChart3 className="h-4 w-4" />
            <span>Ack rate shown alongside teacher class size & subject load context.</span>
          </div>
        </CardHeader>
        <CardContent>
          {monitoringLoading || kpisLoading ? (
            <div className="py-8 text-sm text-slate-500">Loading daily lesson monitoring...</div>
          ) : filteredLessons.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500">
              No daily lesson logs matched the current monitoring filters.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date / Period</TableHead>
                    <TableHead>Class</TableHead>
                    <TableHead>Subject</TableHead>
                    <TableHead>Teacher (Workload Context)</TableHead>
                    <TableHead>Lesson</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Visibility</TableHead>
                    <TableHead>Broadcast</TableHead>
                    <TableHead>Coverage + Ack</TableHead>
                    <TableHead>Open HW</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredLessons.map((lesson: any) => {
                    const nonCompliant = isNonCompliant(lesson);
                    const openHwCount = perClassOpenHomework[lesson.class_id] || 0;
                    const workload = teacherWorkload[lesson.teacher_id] || { class_size: 0, subject_load: 0 };
                    const coveragePct = typeof lesson.engagement_seen_count === 'number' && lesson.engagement_seen_count > 0
                      ? Math.round((lesson.engagement_ack_count || 0) / lesson.engagement_seen_count * 100)
                      : 0;
                    return (
                      <TableRow key={lesson.id} className={nonCompliant ? 'bg-rose-50/40 hover:bg-rose-50/60' : ''}>
                        <TableCell className="whitespace-nowrap text-sm text-slate-600">
                          <div>{lesson.date || '—'}</div>
                          {lesson.period_number ? <div className="text-xs text-slate-400">Period {lesson.period_number}</div> : null}
                        </TableCell>
                        <TableCell className="font-medium text-slate-900">
                          {lesson.class_name || `Class ${lesson.class_id}`}
                        </TableCell>
                        <TableCell>{lesson.subject_name || 'General'}</TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            <div className="font-medium text-slate-900">{lesson.teacher_name || '—'}</div>
                            <div className="flex flex-wrap gap-1">
                              <Badge variant="outline" className="text-[10px]">
                                <Users className="mr-1 h-3 w-3" />
                                {workload.class_size || '—'} class size
                              </Badge>
                              <Badge variant="secondary" className="text-[10px]">
                                <BookOpen className="mr-1 h-3 w-3" />
                                {workload.subject_load || 0} subject load
                              </Badge>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="min-w-[280px]">
                          <div className="space-y-1">
                            <div className="font-medium text-slate-900">{lesson.title || 'Untitled lesson'}</div>
                            {lesson.description ? (
                              <div className="line-clamp-2 text-sm text-slate-500">
                                {typeof lesson.description === 'string' ? lesson.description : JSON.stringify(lesson.description)}
                              </div>
                            ) : null}
                            {lesson.homework_due_date ? (
                              <div className="text-xs text-slate-500">HW due: {lesson.homework_due_date}</div>
                            ) : null}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={getStatusVariant(lesson.status)}>{humanizeStatus(lesson.status)}</Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant={getVisibilityVariant(lesson.visibility)}>
                            <Eye className="mr-1 h-3 w-3" />
                            {humanizeVisibility(lesson.visibility)}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant={getBroadcastVariant(lesson.broadcast_status)}>
                            {humanizeBroadcast(lesson.broadcast_status)}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1 text-xs">
                            <div className="flex items-center gap-1">
                              <span className="font-medium text-slate-700">Seen:</span>
                              <span>{lesson.engagement_seen_count || 0}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <span className="font-medium text-slate-700">Ack:</span>
                              <span>{lesson.engagement_ack_count || 0}</span>
                              <Badge variant={coveragePct >= 70 ? 'default' : coveragePct >= 40 ? 'secondary' : 'destructive'} className="text-[10px]">
                                {coveragePct}%
                              </Badge>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={openHwCount > 3 ? 'destructive' : openHwCount > 0 ? 'secondary' : 'outline'}>
                            {openHwCount} open
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            {nonCompliant && (
                              <AlertDialog open={reminderState.open && reminderState.lesson?.id === lesson.id}
                                onOpenChange={(open) => setReminderState({ open, lesson: open ? lesson : null, channels: ['app', 'email'], message: '' })}>
                                <AlertDialogTrigger asChild>
                                  <Button size="sm" variant="default" className="gap-1 bg-amber-600 hover:bg-amber-700">
                                    <Bell className="h-3.5 w-3.5" />
                                    <span className="hidden sm:inline">Remind teacher</span>
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle className="flex items-center gap-2">
                                      <Send className="h-5 w-5 text-amber-600" />
                                      Send reminder to assigned teacher
                                    </AlertDialogTitle>
                                    <AlertDialogDescription>
                                      Notify <span className="font-medium">{lesson.teacher_name || 'the assigned teacher'}</span> about the lesson log for{' '}
                                      <span className="font-medium">{lesson.class_name || `Class ${lesson.class_id}`}</span> on{' '}
                                      <span className="font-medium">{lesson.date || TODAY}</span>. No principal or admin escalation will be visible.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <div className="space-y-4 py-2">
                                    <div className="space-y-2">
                                      <Label>Notification channels</Label>
                                      <div className="flex flex-wrap gap-3">
                                        {(['email', 'sms', 'app'] as const).map((channel) => (
                                          <label key={channel} className="flex items-center gap-2 text-sm cursor-pointer">
                                            <Checkbox
                                              checked={reminderState.channels.includes(channel)}
                                              onCheckedChange={() => toggleChannel(channel)}
                                            />
                                            <span className="capitalize">{channel}</span>
                                          </label>
                                        ))}
                                      </div>
                                    </div>
                                    <div className="space-y-2">
                                      <Label htmlFor="reminder-msg">Optional message (appended to reminder)</Label>
                                      <Textarea
                                        id="reminder-msg"
                                        value={reminderState.message}
                                        onChange={(e) => setReminderState((prev) => ({ ...prev, message: e.target.value }))}
                                        placeholder="e.g. Please log the lesson plan and homework details before end of day."
                                        rows={3}
                                      />
                                    </div>
                                  </div>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction
                                      onClick={(e) => {
                                        e.preventDefault();
                                        handleSendReminder();
                                      }}
                                      disabled={sendReminderMutation.isPending || reminderState.channels.length === 0}
                                      className="bg-amber-600 hover:bg-amber-700"
                                    >
                                      {sendReminderMutation.isPending ? (
                                        <>
                                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                          Sending…
                                        </>
                                      ) : (
                                        <>Send reminder</>
                                      )}
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            )}

                            {isSuperAdmin && (
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button size="sm" variant="outline">
                                    <MoreVertical className="h-3.5 w-3.5" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-56">
                                  <DropdownMenuLabel>Admin actions</DropdownMenuLabel>
                                  {nonCompliant ? null : (
                                    <>
                                      <DropdownMenuItem
                                        onClick={() => setReminderState({ open: true, lesson, channels: ['app', 'email'], message: '' })}
                                        className="gap-2"
                                      >
                                        <Bell className="h-4 w-4 text-amber-600" />
                                        Send reminder to teacher
                                      </DropdownMenuItem>
                                      <DropdownMenuSeparator />
                                    </>
                                  )}
                                  <DropdownMenuItem
                                    onClick={() => setEscalateState({ open: true, lesson, note: '' })}
                                    className="gap-2 text-rose-700 focus:text-rose-700"
                                  >
                                    <ShieldAlert className="h-4 w-4 text-rose-600" />
                                    Escalate to principal
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog
        open={escalateState.open}
        onOpenChange={(open) => setEscalateState({ open, lesson: open ? escalateState.lesson : null, note: '' })}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShieldAlert className="h-5 w-5 text-rose-600" />
              Escalate to principal
            </DialogTitle>
            <DialogDescription>
              Notify the school principal about{' '}
              <span className="font-medium">{escalateState.lesson?.class_name || `Class ${escalateState.lesson?.class_id}`}</span> lesson on{' '}
              <span className="font-medium">{escalateState.lesson?.date || TODAY}</span> assigned to{' '}
              <span className="font-medium">{escalateState.lesson?.teacher_name || 'teacher'}</span>.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="escalate-note">Escalation note (optional)</Label>
              <Textarea
                id="escalate-note"
                value={escalateState.note}
                onChange={(e) => setEscalateState((prev) => ({ ...prev, note: e.target.value }))}
                placeholder="Describe the concern for the principal..."
                rows={4}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEscalateState({ open: false, lesson: null, note: '' })}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleEscalate}
              disabled={escalateMutation.isPending}
            >
              {escalateMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Escalating…
                </>
              ) : (
                <>Escalate to principal</>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default DailyLessonMonitoring;
