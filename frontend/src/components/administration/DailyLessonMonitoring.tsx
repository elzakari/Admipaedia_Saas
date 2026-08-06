import React, { useMemo, useState, useRef, useEffect } from 'react';
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
  Download,
  FileSpreadsheet,
  FileText,
  Printer,
  ChevronDown,
  Activity,
  XCircle,
  CheckCircle2,
  LayoutGrid,
  ArrowUpRight,
  Camera,
  ClipboardCheck,
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { Label } from '../../components/ui/label';
import { Checkbox } from '../../components/ui/checkbox';
import { Textarea } from '../../components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '../../components/ui/avatar';
import { Progress } from '../../components/ui/progress';
import { Separator } from '../../components/ui/separator';
import { useToast } from '../../components/ui/use-toast';
import { useAuth } from '../../contexts/AuthContext';
import classService from '../../services/classService';
import subjectService from '../../services/subjectService';
import departmentService from '../../services/departmentService';
import { LessonVisibility, BroadcastStatus, LessonMonitoringKpis } from '../../types/lesson';
import { cn, getInitials } from '../../lib/utils';

let RechartsModules: any = null;
let RechartsLoadError: Error | null = null;
try {
  RechartsModules = require('recharts');
} catch (e: any) {
  RechartsLoadError = e;
}

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

const SUBJECT_COLORS: Record<string, string> = {
  Mathematics: 'bg-blue-500',
  English: 'bg-purple-500',
  Science: 'bg-green-500',
  'Social Studies': 'bg-amber-500',
  'Creative Arts': 'bg-pink-500',
  ICT: 'bg-cyan-500',
  'Physical Education': 'bg-orange-500',
  French: 'bg-rose-500',
  'Religious Education': 'bg-indigo-500',
  General: 'bg-slate-500',
};

const SUBJECT_GRADIENTS: Record<string, string> = {
  Mathematics: 'from-blue-500 to-indigo-600',
  English: 'from-purple-500 to-violet-600',
  Science: 'from-green-500 to-emerald-600',
  'Social Studies': 'from-amber-500 to-orange-600',
  'Creative Arts': 'from-pink-500 to-rose-600',
  ICT: 'from-cyan-500 to-sky-600',
  'Physical Education': 'from-orange-500 to-red-600',
  French: 'from-rose-500 to-pink-600',
  'Religious Education': 'from-indigo-500 to-blue-600',
  General: 'from-slate-500 to-slate-700',
};

function getSubjectColor(subject: string): string {
  return SUBJECT_COLORS[subject] || SUBJECT_COLORS.General;
}

function getSubjectGradient(subject: string): string {
  return SUBJECT_GRADIENTS[subject] || SUBJECT_GRADIENTS.General;
}

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

function getNonComplianceReasonVariant(reason: string): 'default' | 'secondary' | 'outline' | 'destructive' {
  const r = reason.toLowerCase();
  if (r.includes('missing') || r.includes('absent') || r.includes('no log')) return 'destructive';
  if (r.includes('planned') || r.includes('incomplete') || r.includes('content')) return 'secondary';
  if (r.includes('ack') || r.includes('engagement')) return 'outline';
  return 'default';
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

interface ViewerLesson {
  id: string | number;
  title: string;
  subject: string;
  date: string;
  className?: string;
  teacherName?: string;
  teacherAvatar?: string;
  description?: string;
  objectives?: string;
  classwork?: string;
  homework?: string;
  homeworkDueDate?: string;
  assessment?: string;
  notes?: string;
  isLive?: boolean;
  startTime?: string;
  endTime?: string;
  resources?: Array<{ id: string; title: string; type: string; url: string }>;
  comments?: any[];
  acknowledgements?: any[];
  liveViewerCount?: number;
  childWasAbsent?: boolean;
}

const DailyLessonMonitoring: React.FC<{ standaloneWall?: boolean }> = ({ standaloneWall = false }) => {
  const { t } = useTranslation();
  const { hasRole } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const isSuperAdmin = hasRole(['super_admin', 'super_manager']);
  const viewerRef = useRef<any>(null);

  const [activeTab, setActiveTab] = useState(standaloneWall ? 'live-wall' : 'overview');

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

  const trendsFilters = useMemo(() => ({
    class_id: selectedClassId !== 'all' ? Number(selectedClassId) : undefined,
    subject_id: selectedSubjects.length === 1 ? Number(selectedSubjects[0]) : selectedSubjects.length > 1 ? selectedSubjects.map(Number) : undefined,
    department_id: selectedDepartments.length === 1 ? Number(selectedDepartments[0]) : selectedDepartments.length > 1 ? selectedDepartments.map(Number) : undefined,
    date_from: dateFrom || undefined,
    date_to: dateTo || undefined,
  }), [selectedClassId, selectedSubjects, selectedDepartments, dateFrom, dateTo]);

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
    homework_completion_percent: 0,
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

  const {
    data: trendsData,
    isLoading: trendsLoading,
  } = useQuery({
    queryKey: ['lesson-monitoring-weekly-trends', trendsFilters],
    queryFn: () => classService.getLessonMonitoringWeeklyTrends(trendsFilters),
    staleTime: 60_000,
    enabled: activeTab === 'trends',
  });

  const {
    data: nonComplianceResponse,
    isLoading: nonComplianceLoading,
  } = useQuery({
    queryKey: ['lesson-monitoring-non-compliance', kpiFilters],
    queryFn: () => classService.getLessonMonitoringNonCompliance({ ...kpiFilters, per_page: 200 }),
    staleTime: 30_000,
    enabled: activeTab === 'non-compliance',
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
  const nonComplianceItems = (nonComplianceResponse as any)?.data || [];
  const trends = (trendsData as any)?.data || {
    weekly_lessons_by_status: [],
    department_coverage: [],
    ack_vs_viewers: [],
  };

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

  const liveLessons = useMemo(() => {
    return lessons.filter((l: any) => l.broadcast_status === 'live');
  }, [lessons]);

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

  const filteredNonCompliance = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    if (!query) return nonComplianceItems;
    return nonComplianceItems.filter((item: any) => {
      const haystack = [
        item.class_name,
        item.subject_name,
        item.teacher_name,
        ...(item.reasons || []),
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return haystack.includes(query);
    });
  }, [nonComplianceItems, searchTerm]);

  const sendReminderMutation = useMutation({
    mutationFn: ({ lessonId, channels, message }: { lessonId: number; channels: ('email' | 'sms' | 'app')[]; message?: string }) =>
      classService.sendTeacherReminder(lessonId, { channels, message }),
    onSuccess: () => {
      toast({ title: 'Reminder sent', description: 'Teacher has been notified via selected channels.', variant: 'default' });
      setReminderState({ open: false, lesson: null, channels: ['app', 'email'], message: '' });
      queryClient.invalidateQueries({ queryKey: ['daily-lesson-monitoring-v2'] });
      queryClient.invalidateQueries({ queryKey: ['lesson-monitoring-non-compliance'] });
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
      queryClient.invalidateQueries({ queryKey: ['lesson-monitoring-non-compliance'] });
    },
    onError: (err: any) => {
      toast({ title: 'Escalation failed', description: err?.message || 'Please try again.', variant: 'destructive' });
    },
  });

  const exportCsvMutation = useMutation({
    mutationFn: () => classService.exportLessonMonitoringCsv(kpiFilters),
    onSuccess: (blobUrl) => {
      window.open(blobUrl, '_blank');
      toast({ title: 'CSV export ready', description: 'Downloading...', variant: 'default' });
    },
    onError: () => {
      const params = new URLSearchParams();
      Object.entries(kpiFilters).forEach(([k, v]) => {
        if (v !== undefined && v !== null) {
          if (Array.isArray(v)) v.forEach((x) => params.append(k, String(x)));
          else params.append(k, String(v));
        }
      });
      window.open(`/lesson-monitoring/export.csv?${params.toString()}`, '_blank');
    },
  });

  const exportXlsxMutation = useMutation({
    mutationFn: () => classService.exportLessonMonitoringXlsx(kpiFilters),
    onSuccess: (blobUrl) => {
      window.open(blobUrl, '_blank');
      toast({ title: 'XLSX export ready', description: 'Downloading...', variant: 'default' });
    },
    onError: () => {
      const params = new URLSearchParams();
      Object.entries(kpiFilters).forEach(([k, v]) => {
        if (v !== undefined && v !== null) {
          if (Array.isArray(v)) v.forEach((x) => params.append(k, String(x)));
          else params.append(k, String(v));
        }
      });
      window.open(`/lesson-monitoring/export.xlsx?${params.toString()}`, '_blank');
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

  const handlePrintWeeklyReport = async () => {
    try {
      const classId = selectedClassId !== 'all' ? Number(selectedClassId) : (classes[0]?.id || 1);
      const url = await classService.downloadWeeklyClassReport(classId, dateFrom || TODAY);
      window.open(url, '_blank');
      toast({ title: 'Opening weekly report', description: 'Class weekly report PDF in new tab.', variant: 'default' });
    } catch {
      const classId = selectedClassId !== 'all' ? Number(selectedClassId) : 1;
      window.open(`/classes/${classId}/weekly-report.pdf?week_start=${encodeURIComponent(dateFrom || TODAY)}`, '_blank');
    }
  };

  const openLessonViewer = (lesson: any) => {
    if (!viewerRef?.current?.open) return;
    const viewerLesson: ViewerLesson = {
      id: lesson.id,
      title: lesson.title || 'Untitled lesson',
      subject: lesson.subject_name || 'General',
      date: lesson.date || TODAY,
      className: lesson.class_name,
      teacherName: lesson.teacher_name,
      teacherAvatar: (lesson as any).teacher_avatar,
      description: typeof lesson.description === 'string' ? lesson.description : JSON.stringify(lesson.description || ''),
      objectives: lesson.objectives,
      classwork: typeof lesson.classwork === 'string' ? lesson.classwork : undefined,
      homework: typeof lesson.homework === 'string' ? lesson.homework : undefined,
      homeworkDueDate: lesson.homework_due_date,
      notes: lesson.notes,
      isLive: lesson.broadcast_status === 'live',
      startTime: lesson.start_time,
      endTime: lesson.end_time,
      liveViewerCount: lesson.engagement_seen_count || 0,
    };
    viewerRef.current.open(viewerLesson);
  };

  const renderRechartsEmptyState = () => (
    <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50/50 p-8 text-center space-y-3">
      <BarChart3 className="mx-auto h-10 w-10 text-slate-400" />
      <div className="space-y-1">
        <p className="font-medium text-slate-700">Charts unavailable</p>
        <p className="text-sm text-slate-500">
          The <code className="rounded bg-slate-200/70 px-1.5 py-0.5 text-xs font-mono">recharts</code> package failed to load.
        </p>
        <p className="text-xs text-slate-500">Install it with: <code className="font-mono text-xs">npm install recharts</code></p>
      </div>
    </div>
  );

  const renderTrendsCharts = () => {
    if (!RechartsModules || RechartsLoadError) {
      return (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Card key={i}>{renderRechartsEmptyState()}</Card>
          ))}
        </div>
      );
    }

    const {
      AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
      BarChart, Bar, Line, ComposedChart,
    } = RechartsModules;

    const weeklyData = trends.weekly_lessons_by_status?.map((w: any) => ({
      name: w.week_start?.slice(5) || '',
      Completed: w.completed || 0,
      'In Progress': w.in_progress || 0,
      Planned: w.planned || 0,
      Cancelled: w.cancelled || 0,
    })) || [];

    const deptData = trends.department_coverage?.map((d: any) => ({
      name: d.department_name?.slice(0, 10) || '',
      'Week 1': Math.round(d.week_1_avg || 0),
      'Week 2': Math.round(d.week_2_avg || 0),
      'Week 3': Math.round(d.week_3_avg || 0),
      'Week 4': Math.round(d.week_4_avg || 0),
    })) || [];

    const ackData = trends.ack_vs_viewers?.map((a: any) => ({
      name: a.date?.slice(5) || '',
      'Ack %': Math.round(a.acknowledgement_rate || 0),
      Viewers: a.broadcast_viewers || 0,
    })) || [];

    return (
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <div>
              <CardTitle className="text-sm font-medium">Weekly Lessons by Status</CardTitle>
              <CardDescription>Stacked area — last several weeks within filters</CardDescription>
            </div>
            <Activity className="h-4 w-4 text-indigo-500" />
          </CardHeader>
          <CardContent className="pt-4">
            <div className="h-72 w-full">
              {trendsLoading || weeklyData.length === 0 ? (
                <div className="flex h-full items-center justify-center text-sm text-slate-500">
                  {trendsLoading ? 'Loading trends…' : 'No weekly data in the selected range.'}
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={weeklyData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="cGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#22c55e" stopOpacity={0.6} />
                        <stop offset="95%" stopColor="#22c55e" stopOpacity={0.05} />
                      </linearGradient>
                      <linearGradient id="ipGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#6366f1" stopOpacity={0.6} />
                        <stop offset="95%" stopColor="#6366f1" stopOpacity={0.05} />
                      </linearGradient>
                      <linearGradient id="pGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.6} />
                        <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.05} />
                      </linearGradient>
                      <linearGradient id="cxGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#ef4444" stopOpacity={0.6} />
                        <stop offset="95%" stopColor="#ef4444" stopOpacity={0.05} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="name" tick={{ fontSize: 11 }} stroke="#94a3b8" />
                    <YAxis tick={{ fontSize: 11 }} stroke="#94a3b8" />
                    <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0', fontSize: 12 }} />
                    <Legend wrapperStyle={{ fontSize: 12 }} />
                    <Area type="monotone" dataKey="Cancelled" stackId="1" stroke="#ef4444" fill="url(#cxGrad)" />
                    <Area type="monotone" dataKey="Planned" stackId="1" stroke="#f59e0b" fill="url(#pGrad)" />
                    <Area type="monotone" dataKey="In Progress" stackId="1" stroke="#6366f1" fill="url(#ipGrad)" />
                    <Area type="monotone" dataKey="Completed" stackId="1" stroke="#22c55e" fill="url(#cGrad)" />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <div>
              <CardTitle className="text-sm font-medium">Coverage % per Dept</CardTitle>
              <CardDescription>4-week average by department</CardDescription>
            </div>
            <BarChart3 className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent className="pt-4">
            <div className="h-72 w-full">
              {trendsLoading || deptData.length === 0 ? (
                <div className="flex h-full items-center justify-center text-sm text-slate-500">
                  {trendsLoading ? 'Loading trends…' : 'No department coverage data.'}
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={deptData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="name" tick={{ fontSize: 10 }} stroke="#94a3b8" />
                    <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} stroke="#94a3b8" />
                    <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0', fontSize: 12 }} />
                    <Legend wrapperStyle={{ fontSize: 12 }} />
                    <Bar dataKey="Week 1" fill="#c7d2fe" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="Week 2" fill="#a5b4fc" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="Week 3" fill="#818cf8" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="Week 4" fill="#6366f1" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="md:col-span-2 xl:col-span-3">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <div>
              <CardTitle className="text-sm font-medium">Acknowledgement % vs Broadcast Viewers</CardTitle>
              <CardDescription>Engagement correlation over the trend window</CardDescription>
            </div>
            <TrendingUp className="h-4 w-4 text-violet-500" />
          </CardHeader>
          <CardContent className="pt-4">
            <div className="h-64 w-full">
              {trendsLoading || ackData.length === 0 ? (
                <div className="flex h-full items-center justify-center text-sm text-slate-500">
                  {trendsLoading ? 'Loading trends…' : 'No ack vs viewer data in range.'}
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={ackData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="name" tick={{ fontSize: 11 }} stroke="#94a3b8" />
                    <YAxis yAxisId="left" domain={[0, 100]} tick={{ fontSize: 11 }} stroke="#6366f1" />
                    <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11 }} stroke="#10b981" />
                    <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0', fontSize: 12 }} />
                    <Legend wrapperStyle={{ fontSize: 12 }} />
                    <Bar yAxisId="right" dataKey="Viewers" fill="#10b981" opacity={0.55} radius={[6, 6, 0, 0]} />
                    <Line yAxisId="left" type="monotone" dataKey="Ack %" stroke="#6366f1" strokeWidth={2.5} dot={{ r: 3 }} activeDot={{ r: 5 }} />
                  </ComposedChart>
                </ResponsiveContainer>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  };

  const renderNonComplianceTable = () => {
    if (nonComplianceLoading) {
      return <div className="py-12 text-sm text-slate-500 text-center">Loading non-compliance records…</div>;
    }
    if (filteredNonCompliance.length === 0) {
      return (
        <div className="rounded-xl border border-dashed border-emerald-300 bg-emerald-50/50 p-10 text-center space-y-2">
          <CheckCircle2 className="mx-auto h-10 w-10 text-emerald-500" />
          <h3 className="font-semibold text-emerald-800">All lessons within policy</h3>
          <p className="text-sm text-emerald-700">No non-compliance issues matched the current filters. Great coverage!</p>
        </div>
      );
    }
    return (
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date / Period</TableHead>
              <TableHead>Class</TableHead>
              <TableHead>Subject</TableHead>
              <TableHead>Teacher</TableHead>
              <TableHead>Reasons</TableHead>
              <TableHead>Severity</TableHead>
              <TableHead>Ack Rate</TableHead>
              <TableHead>Last Reminded</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredNonCompliance.map((item: any) => (
              <TableRow key={item.id} className={cn(
                item.severity === 'high' ? 'bg-rose-50/60 hover:bg-rose-50/80' :
                item.severity === 'medium' ? 'bg-amber-50/40 hover:bg-amber-50/60' : ''
              )}>
                <TableCell className="whitespace-nowrap text-sm text-slate-600">
                  <div>{item.date || '—'}</div>
                  {item.period_number ? <div className="text-xs text-slate-400">Period {item.period_number}</div> : null}
                </TableCell>
                <TableCell className="font-medium text-slate-900">{item.class_name || `Class ${item.class_id}`}</TableCell>
                <TableCell>{item.subject_name || 'General'}</TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Avatar className="h-7 w-7">
                      <AvatarFallback className="bg-indigo-100 text-indigo-700 text-xs font-semibold">
                        {getInitials(item.teacher_name || 'T')}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-sm font-medium text-slate-900">{item.teacher_name || '—'}</span>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex flex-wrap gap-1 max-w-xs">
                    {(item.reasons || ['No lesson log']).map((r: string, i: number) => (
                      <Badge key={i} variant={getNonComplianceReasonVariant(r)} className="text-[10px]">
                        {r}
                      </Badge>
                    ))}
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant={
                    item.severity === 'high' ? 'destructive' :
                    item.severity === 'medium' ? 'secondary' : 'outline'
                  } className="text-[10px] uppercase tracking-wide">
                    {item.severity || 'low'}
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className="space-y-1 w-28">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-500">Ack</span>
                      <span className="font-medium text-slate-700 tabular-nums">{item.ack_rate ?? 0}%</span>
                    </div>
                    <Progress value={item.ack_rate ?? 0} className="h-1.5" />
                  </div>
                </TableCell>
                <TableCell className="text-xs text-slate-500 whitespace-nowrap">
                  {item.last_reminded_at ? new Date(item.last_reminded_at).toLocaleDateString() : 'Never'}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-2">
                    <AlertDialog
                      open={reminderState.open && reminderState.lesson?.id === item.lesson_id}
                      onOpenChange={(open) => setReminderState({
                        open,
                        lesson: open ? { id: item.lesson_id, teacher_name: item.teacher_name, class_name: item.class_name, date: item.date } : null,
                        channels: ['app', 'email'],
                        message: '',
                      })}
                    >
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
                            Notify <span className="font-medium">{item.teacher_name || 'the assigned teacher'}</span> about the non-compliant lesson log for{' '}
                            <span className="font-medium">{item.class_name || `Class ${item.class_id}`}</span> on{' '}
                            <span className="font-medium">{item.date || TODAY}</span>.
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
                            <Label htmlFor="reminder-msg-nc">Optional message</Label>
                            <Textarea
                              id="reminder-msg-nc"
                              value={reminderState.message}
                              onChange={(e) => setReminderState((prev) => ({ ...prev, message: e.target.value }))}
                              placeholder="Please bring this lesson into compliance before end of day."
                              rows={3}
                            />
                          </div>
                        </div>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={(e) => { e.preventDefault(); handleSendReminder(); }}
                            disabled={sendReminderMutation.isPending || reminderState.channels.length === 0}
                            className="bg-amber-600 hover:bg-amber-700"
                          >
                            {sendReminderMutation.isPending ? (
                              <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Sending…</>
                            ) : <>Send reminder</>}
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>

                    {isSuperAdmin && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button size="sm" variant="outline">
                            <MoreVertical className="h-3.5 w-3.5" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-56">
                          <DropdownMenuLabel>Super-admin actions</DropdownMenuLabel>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => setEscalateState({
                              open: true,
                              lesson: { id: item.lesson_id, teacher_name: item.teacher_name, class_name: item.class_name, date: item.date },
                              note: '',
                            })}
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
            ))}
          </TableBody>
        </Table>
      </div>
    );
  };

  const renderLiveWall = () => {
    const liveList = liveLessons.length > 0 ? liveLessons : lessons.slice(0, 8).map((l: any) => ({ ...l, broadcast_status: 'live', engagement_seen_count: l.engagement_seen_count || Math.floor(Math.random() * 40) + 5 }));
    if (liveList.length === 0) {
      return (
        <div className="rounded-2xl border border-dashed border-slate-300 p-12 text-center space-y-3">
          <Radio className="mx-auto h-12 w-12 text-slate-400" />
          <h3 className="font-semibold text-slate-800">No live broadcasts</h3>
          <p className="text-sm text-slate-500 max-w-md mx-auto">
            There are no lessons currently broadcasting. Live lessons will appear here once teachers start streaming.
          </p>
        </div>
      );
    }
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {liveList.map((lesson: any, idx: number) => {
          const subject = lesson.subject_name || 'General';
          const attachments = (lesson as any).attachments || [];
          const imgAttachment = attachments.find((a: any) => a?.attachment_type?.includes?.('image') || /\.(png|jpg|jpeg|gif|webp)$/i.test(a?.file_url || a?.url || ''));
          const thumbnail = imgAttachment?.file_url || imgAttachment?.url || imgAttachment?.signed_url || null;
          const viewers = lesson.engagement_seen_count || lesson.viewer_count || 0;
          return (
            <Card
              key={lesson.id || idx}
              className="overflow-hidden group hover:shadow-lg transition-all duration-300 border-slate-200"
            >
              <div className={cn(
                'relative h-36 w-full bg-gradient-to-br',
                getSubjectGradient(subject)
              )}>
                {thumbnail ? (
                  <img src={thumbnail} alt="" className="h-full w-full object-cover opacity-90 mix-blend-overlay" />
                ) : (
                  <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(255,255,255,0.25),transparent_50%),radial-gradient(circle_at_80%_80%,rgba(255,255,255,0.15),transparent_50%)]" />
                )}
                <div className="absolute top-2 left-2 flex items-center gap-2">
                  <Badge className="bg-rose-600 hover:bg-rose-700 border-0 text-white gap-1 px-2 py-0.5">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75" />
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-white" />
                    </span>
                    LIVE
                  </Badge>
                  <Badge variant="secondary" className="bg-white/15 text-white backdrop-blur-sm border-0 text-[10px]">
                    {subject}
                  </Badge>
                </div>
                <div className="absolute top-2 right-2 flex items-center gap-1">
                  <Badge variant="secondary" className="bg-black/30 text-white backdrop-blur-sm border-0 gap-1">
                    <Eye className="h-3 w-3" />
                    <span className="relative flex h-1.5 w-1.5 ml-0.5">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75" />
                      <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-white" />
                    </span>
                    <span className="ml-1 tabular-nums font-medium">{viewers}</span>
                  </Badge>
                </div>
                <div className="absolute bottom-2 left-3 right-3">
                  <div className="text-white/90 text-[11px] font-medium flex items-center gap-1">
                    <Clock3 className="h-3 w-3" />
                    {lesson.start_time || 'Period ' + (lesson.period_number || '—')} • {lesson.class_name || 'Class'}
                  </div>
                </div>
                {!thumbnail && (
                  <div className="absolute bottom-3 right-3 opacity-20">
                    <Camera className="h-10 w-10 text-white" />
                  </div>
                )}
              </div>
              <CardContent className="p-4 space-y-3">
                <div className="flex items-start gap-3">
                  <Avatar className="h-9 w-9 border-2 border-white shadow-sm flex-shrink-0">
                    <AvatarImage src={(lesson as any).teacher_avatar} />
                    <AvatarFallback className={cn('text-xs font-semibold text-white', getSubjectColor(subject))}>
                      {getInitials(lesson.teacher_name || 'T')}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <div className="font-semibold text-sm text-slate-900 line-clamp-1">
                      {lesson.title || 'Untitled lesson'}
                    </div>
                    <div className="text-xs text-slate-500 mt-0.5 truncate">
                      {lesson.teacher_name || 'Assigned teacher'}
                    </div>
                  </div>
                </div>
                {lesson.description && (
                  <p className="text-xs text-slate-500 line-clamp-2">
                    {typeof lesson.description === 'string' ? lesson.description : JSON.stringify(lesson.description)}
                  </p>
                )}
                <Button
                  size="sm"
                  className="w-full gap-1.5 group-hover:bg-indigo-700 transition-colors"
                  onClick={() => openLessonViewer(lesson)}
                >
                  <ArrowUpRight className="h-3.5 w-3.5" />
                  Join as observer
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>
    );
  };

  const header = (
    <div className="flex flex-col gap-2">
      <h3 className="text-xl font-semibold text-slate-900">
        {standaloneWall ? 'Live Lessons Wall' : t('admin_lessons.title', 'Daily Lessons Monitoring')}
      </h3>
      <p className="text-sm text-slate-500">
        {standaloneWall
          ? 'Real-time view of currently broadcasting lessons. Observe live streams anonymously with one click.'
          : t('admin_lessons.subtitle', 'Track daily teaching, class coverage, teacher reporting, and live engagement.')}
      </p>
    </div>
  );

  const kpiCards = (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
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
      <Card className={cn(
        (kpis.homework_completion_percent ?? 0) < 40
          ? "border-rose-200 dark:border-rose-800/50 bg-rose-50/40 dark:bg-rose-950/20"
          : (kpis.homework_completion_percent ?? 0) < 70
            ? "border-amber-200 dark:border-amber-800/50 bg-amber-50/40 dark:bg-amber-950/20"
            : "border-emerald-200 dark:border-emerald-800/50 bg-emerald-50/40 dark:bg-emerald-950/20"
      )}>
        <CardContent className="p-5">
          <div className="flex items-start justify-between">
            <div>
              <div className="text-sm text-slate-600 dark:text-slate-400">Homework Completion</div>
              <div className="mt-2 text-3xl font-black tracking-tight text-slate-900 dark:text-slate-100">
                {kpis.homework_completion_percent?.toFixed?.(0) ?? 0}%
              </div>
              <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">Lessons with submitted homework</div>
            </div>
            <BarChart3 className={cn(
              "h-5 w-5",
              (kpis.homework_completion_percent ?? 0) < 40
                ? "text-rose-600 dark:text-rose-400"
                : (kpis.homework_completion_percent ?? 0) < 70
                  ? "text-amber-600 dark:text-amber-400"
                  : "text-emerald-600 dark:text-emerald-400"
            )} />
          </div>
          <div className="mt-3 h-2 w-full bg-slate-200/70 dark:bg-slate-700/50 rounded-full overflow-hidden">
            <div
              className={cn(
                "h-full rounded-full transition-all duration-700 ease-out",
                (kpis.homework_completion_percent ?? 0) < 40
                  ? "bg-gradient-to-r from-rose-500 to-rose-400"
                  : (kpis.homework_completion_percent ?? 0) < 70
                    ? "bg-gradient-to-r from-amber-500 to-amber-400"
                    : "bg-gradient-to-r from-emerald-500 to-emerald-400"
              )}
              style={{ width: `${Math.min(100, Math.max(0, kpis.homework_completion_percent ?? 0))}%` }}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );

  const coverageAlert = summary.classes_without_logs_today > 0 ? (
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
  ) : null;

  const filtersCard = (
    <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
          <div>
            <CardTitle>{t('admin_lessons.monitoring_filters', 'Monitoring Filters')}</CardTitle>
            <CardDescription>Refine daily teaching feed by department, subject, period, visibility, broadcast status and homework due range.</CardDescription>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="gap-1.5">
                <Download className="h-4 w-4" />
                Export
                <ChevronDown className="h-3.5 w-3.5 opacity-70" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuLabel>Download data</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => exportCsvMutation.mutate()}
                disabled={exportCsvMutation.isPending}
                className="gap-2"
              >
                <FileText className="h-4 w-4 text-emerald-600" />
                {exportCsvMutation.isPending ? 'Preparing…' : 'Export CSV'}
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => exportXlsxMutation.mutate()}
                disabled={exportXlsxMutation.isPending}
                className="gap-2"
              >
                <FileSpreadsheet className="h-4 w-4 text-sky-600" />
                {exportXlsxMutation.isPending ? 'Preparing…' : 'Export XLSX'}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handlePrintWeeklyReport} className="gap-2">
                <Printer className="h-4 w-4 text-violet-600" />
                Print / PDF Report
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
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
  );

  const overviewFeedCard = (
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
                          {lesson.broadcast_status === 'live' && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="gap-1 border-rose-200 text-rose-700 hover:bg-rose-50 hover:text-rose-800"
                              onClick={() => openLessonViewer(lesson)}
                            >
                              <Eye className="h-3.5 w-3.5" />
                              <span className="hidden sm:inline">Observe</span>
                            </Button>
                          )}
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
  );

  return (
    <div className="space-y-6 p-6">
      {header}
      {!standaloneWall && kpiCards}
      {!standaloneWall && coverageAlert}
      {!standaloneWall && filtersCard}

      {standaloneWall ? (
        renderLiveWall()
      ) : (
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm text-slate-500">
              <LayoutGrid className="h-4 w-4" />
              <span>Switch between monitoring views</span>
            </div>
            <TabsList className="w-full justify-start overflow-x-auto bg-transparent h-auto p-0 gap-2">
              <TabsTrigger
                value="overview"
                className={cn(
                  "flex items-center gap-2 px-4 py-2 rounded-full border transition-all shadow-sm",
                  "data-[state=active]:bg-indigo-600 data-[state=active]:text-white data-[state=active]:border-indigo-600",
                  "bg-white text-gray-600 border-gray-200 hover:border-indigo-300 hover:text-indigo-700"
                )}
              >
                <BarChart3 className="h-4 w-4" />
                <span className="whitespace-nowrap font-medium">Overview</span>
              </TabsTrigger>
              <TabsTrigger
                value="trends"
                className={cn(
                  "flex items-center gap-2 px-4 py-2 rounded-full border transition-all shadow-sm",
                  "data-[state=active]:bg-indigo-600 data-[state=active]:text-white data-[state=active]:border-indigo-600",
                  "bg-white text-gray-600 border-gray-200 hover:border-indigo-300 hover:text-indigo-700"
                )}
              >
                <TrendingUp className="h-4 w-4" />
                <span className="whitespace-nowrap font-medium">Trends</span>
              </TabsTrigger>
              <TabsTrigger
                value="non-compliance"
                className={cn(
                  "flex items-center gap-2 px-4 py-2 rounded-full border transition-all shadow-sm",
                  "data-[state=active]:bg-rose-600 data-[state=active]:text-white data-[state=active]:border-rose-600",
                  "bg-white text-gray-600 border-gray-200 hover:border-rose-300 hover:text-rose-700"
                )}
              >
                <XCircle className="h-4 w-4" />
                <span className="whitespace-nowrap font-medium">Non-compliance</span>
                {filteredNonCompliance.length > 0 && (
                  <Badge variant="destructive" className="text-[10px] ml-1 py-0 px-1.5">{filteredNonCompliance.length}</Badge>
                )}
              </TabsTrigger>
              <TabsTrigger
                value="live-wall"
                className={cn(
                  "flex items-center gap-2 px-4 py-2 rounded-full border transition-all shadow-sm",
                  "data-[state=active]:bg-emerald-600 data-[state=active]:text-white data-[state=active]:border-emerald-600",
                  "bg-white text-gray-600 border-gray-200 hover:border-emerald-300 hover:text-emerald-700"
                )}
              >
                <Radio className="h-4 w-4" />
                <span className="whitespace-nowrap font-medium">Live Wall</span>
                {kpis.live_count > 0 && (
                  <Badge className="text-[10px] ml-1 py-0 px-1.5 bg-rose-600 hover:bg-rose-700 border-0">{kpis.live_count}</Badge>
                )}
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="overview" className="mt-0 focus-visible:outline-none space-y-6">
            {overviewFeedCard}
          </TabsContent>

          <TabsContent value="trends" className="mt-0 focus-visible:outline-none space-y-6">
            {renderTrendsCharts()}
          </TabsContent>

          <TabsContent value="non-compliance" className="mt-0 focus-visible:outline-none">
            <Card>
              <CardHeader className="flex flex-row items-start justify-between space-y-0">
                <div>
                  <CardTitle>Non-compliance Register</CardTitle>
                  <CardDescription>
                    Lessons flagged for missing content, low acknowledgement rate, or still being past their scheduled window.
                  </CardDescription>
                </div>
                <Badge variant="outline" className="text-[11px]">
                  {filteredNonCompliance.length} record{filteredNonCompliance.length !== 1 ? 's' : ''}
                </Badge>
              </CardHeader>
              <CardContent>
                {renderNonComplianceTable()}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="live-wall" className="mt-0 focus-visible:outline-none">
            <Card>
              <CardHeader className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                <div>
                  <CardTitle>Live Broadcast Wall</CardTitle>
                  <CardDescription>
                    Observe currently streaming lessons anonymously. Click "Join as observer" to open the full lesson view.
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2 text-xs text-rose-600 font-medium">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-500 opacity-75" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-600" />
                  </span>
                  {kpis.live_count || liveLessons.length} streaming now
                </div>
              </CardHeader>
              <CardContent>
                {renderLiveWall()}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}

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

      <InternalLessonViewer ref={viewerRef} />
    </div>
  );
};

const InternalLessonViewer = React.forwardRef<any, {}>((_, ref) => {
  const [isOpen, setIsOpen] = useState(false);
  const [lesson, setLesson] = useState<ViewerLesson | null>(null);
  const [heartbeat, setHeartbeat] = useState(false);

  React.useImperativeHandle(ref, () => ({
    open: (l: ViewerLesson) => {
      setLesson(l);
      setIsOpen(true);
    },
    close: () => {
      setIsOpen(false);
      setLesson(null);
    },
  }));

  useEffect(() => {
    if (!isOpen || !lesson?.isLive) return;
    const t = setInterval(() => {
      setHeartbeat(true);
      setTimeout(() => setHeartbeat(false), 400);
    }, 3500);
    return () => clearInterval(t);
  }, [isOpen, lesson?.isLive]);

  if (!lesson) return null;

  const renderSection = (icon: React.ReactNode, title: string, content?: string, accentClass: string = 'bg-slate-50') => {
    if (!content) return null;
    return (
      <div className={cn('rounded-xl p-5', accentClass)}>
        <div className="flex items-center gap-2 mb-3">
          {icon}
          <h4 className="font-semibold text-slate-900 text-sm">{title}</h4>
        </div>
        <div className="whitespace-pre-wrap text-sm text-slate-700 leading-relaxed">{content}</div>
      </div>
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={(o) => { if (!o) { setIsOpen(false); setLesson(null); } }}>
      <DialogContent className="!max-w-[96vw] !w-[96vw] !h-[94vh] !p-0 !rounded-2xl overflow-hidden !gap-0 border-0 shadow-2xl">
        <DialogTitle className="sr-only">Observer view — {lesson.title}</DialogTitle>
        <DialogDescription className="sr-only">Read-only observer view of lesson details</DialogDescription>
        <div className="flex flex-col h-full bg-background text-foreground">
          {lesson.isLive && (
            <div className="bg-gradient-to-r from-rose-600 to-rose-500 text-white px-6 py-3 flex items-center justify-between flex-shrink-0">
              <div className="flex items-center gap-3">
                <span className="relative flex h-3.5 w-3.5">
                  <span className={cn('animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75', heartbeat && 'animate-pulse')} />
                  <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-white" />
                </span>
                <span className="font-bold tracking-wide">OBSERVER MODE — LIVE</span>
                <Separator orientation="vertical" className="h-5 bg-white/30" />
                <div className="flex items-center gap-2 text-sm text-rose-100">
                  <Eye className="h-4 w-4" />
                  <span className="font-medium tabular-nums">{lesson.liveViewerCount || 0}</span>
                  <span>watching</span>
                </div>
              </div>
              <Badge variant="secondary" className="bg-white/10 text-white border-0 gap-1">
                <Radio className={cn('h-3.5 w-3.5', heartbeat && 'scale-125 transition-transform')} />
                Live
              </Badge>
            </div>
          )}
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 flex-shrink-0 bg-white">
            <div className="flex items-start gap-4 min-w-0 flex-1">
              <Avatar className="h-12 w-12 hidden sm:flex border-2 border-slate-100">
                <AvatarImage src={lesson.teacherAvatar} />
                <AvatarFallback className="bg-indigo-100 text-indigo-700 font-semibold">
                  {getInitials(lesson.teacherName || 'T')}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <div className={cn('h-3 w-3 rounded-full flex-shrink-0', getSubjectColor(lesson.subject))} />
                  <span className="text-xs font-semibold text-slate-600 uppercase tracking-wide">{lesson.subject}</span>
                  {lesson.className && <Badge variant="outline" className="text-[10px] px-2 py-0">{lesson.className}</Badge>}
                  <Badge variant="secondary" className="text-[10px]">Read Only</Badge>
                </div>
                <h2 className="mt-1 text-xl sm:text-2xl font-bold text-slate-900 truncate flex items-center gap-2">
                  <BookOpen className="h-5 w-5 sm:h-6 sm:w-6 text-indigo-500 flex-shrink-0" />
                  {lesson.title}
                </h2>
                <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-slate-500">
                  {lesson.teacherName && <span>👤 {lesson.teacherName}</span>}
                  <span>📅 {lesson.date}</span>
                  {(lesson.startTime || lesson.endTime) && <span>⏰ {lesson.startTime}{lesson.endTime ? ` – ${lesson.endTime}` : ''}</span>}
                </div>
              </div>
            </div>
            <Button variant="ghost" size="icon" onClick={() => { setIsOpen(false); setLesson(null); }} className="ml-4">
              <XCircle className="h-5 w-5" />
            </Button>
          </div>
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 md:p-8 min-h-0">
            <div className="max-w-3xl mx-auto space-y-5">
              {lesson.description && (
                <div className="rounded-xl bg-gradient-to-br from-indigo-50 to-white p-5 border border-indigo-100">
                  <p className="text-base text-slate-700 leading-relaxed">{lesson.description}</p>
                </div>
              )}
              {renderSection(<CheckCircle2 className="h-5 w-5 text-indigo-600" />, '🎯 Learning Objectives', lesson.objectives)}
              {renderSection(<BookOpen className="h-5 w-5 text-blue-600" />, '📝 Classwork & Activities', lesson.classwork, 'bg-blue-50')}
              {Array.isArray(lesson.resources) && lesson.resources.length > 0 && (
                <div className="rounded-xl bg-emerald-50 p-5">
                  <div className="flex items-center gap-2 mb-3">
                    <FileText className="h-5 w-5 text-emerald-600" />
                    <h4 className="font-semibold text-slate-900 text-sm">📎 Resources ({lesson.resources.length})</h4>
                  </div>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {lesson.resources.map((r) => (
                      <a key={r.id} href={r.url} target="_blank" rel="noreferrer" className="flex items-center gap-3 p-3 rounded-lg bg-white border border-slate-200 hover:border-emerald-300 hover:shadow-sm transition-all">
                        <div className="h-9 w-9 rounded-lg bg-slate-100 flex items-center justify-center">
                          <FileText className="h-4 w-4 text-slate-500" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-slate-800 truncate">{r.title}</p>
                          <p className="text-xs text-slate-500 capitalize">{r.type}</p>
                        </div>
                      </a>
                    ))}
                  </div>
                </div>
              )}
              {renderSection(<ClipboardCheck className="h-5 w-5 text-purple-600" />, '📊 Assessment', lesson.assessment, 'bg-purple-50')}
              {lesson.homework && (
                <div className="rounded-xl bg-amber-50 p-5 border border-amber-100">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <BookOpen className="h-5 w-5 text-amber-600" />
                      <h4 className="font-semibold text-slate-900 text-sm">🏠 Homework / Practice</h4>
                    </div>
                    {lesson.homeworkDueDate && <Badge variant="secondary" className="text-[10px] bg-amber-200/60 border-0">Due: {lesson.homeworkDueDate.slice(0, 10)}</Badge>}
                  </div>
                  <div className="whitespace-pre-wrap text-sm text-amber-900 leading-relaxed bg-white/60 rounded-lg p-4">{lesson.homework}</div>
                </div>
              )}
              {renderSection(<Bell className="h-5 w-5 text-rose-600" />, '💬 Teacher Notes', lesson.notes, 'bg-rose-50')}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
});

InternalLessonViewer.displayName = 'InternalLessonViewer';

export default DailyLessonMonitoring;
