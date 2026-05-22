import React from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { 
  BookOpen, 
  CalendarClock, 
  ClipboardList, 
  Bell, 
  MessageSquare, 
  ChevronRight, 
  AlertTriangle, 
  RefreshCw, 
  Award, 
  Percent,
  GraduationCap
} from 'lucide-react';
import studentService, { StudentDashboardSummary } from '../../services/studentService';

const StudentDashboard: React.FC = () => {
  const { t, i18n } = useTranslation();
  const currentLocale = i18n.language || 'en';

  const { data: dashboard, isLoading, isError, refetch } = useQuery<StudentDashboardSummary>({
    queryKey: ['student-dashboard-summary'],
    queryFn: () => studentService.getDashboardSummary(),
    staleTime: 30_000
  });

  const formatDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString(currentLocale === 'fr' ? 'fr-FR' : 'en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (e) {
      return dateStr;
    }
  };

  if (isError) {
    return (
      <div className="p-6 flex flex-col items-center justify-center min-h-[50vh] space-y-4">
        <div className="p-4 bg-red-50 dark:bg-red-950/20 rounded-full text-red-600 dark:text-red-400">
          <AlertTriangle className="h-12 w-12" />
        </div>
        <div className="text-center">
          <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100">
            {t('student.dashboard.error_loading')}
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            Please check your connection or try again.
          </p>
        </div>
        <button
          onClick={() => refetch()}
          className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 active:scale-95 transition text-white font-medium rounded-xl shadow-lg shadow-indigo-500/20"
        >
          <RefreshCw className="h-4 w-4" /> {t('student.dashboard.retry')}
        </button>
      </div>
    );
  }

  // Skeletal Loading State
  if (isLoading) {
    return (
      <div className="p-4 sm:p-6 space-y-6 animate-pulse">
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
          <div className="space-y-2">
            <div className="h-8 w-48 bg-slate-200 dark:bg-slate-800 rounded-lg"></div>
            <div className="h-4 w-64 bg-slate-200 dark:bg-slate-800 rounded-lg"></div>
          </div>
          <div className="flex gap-2">
            <div className="h-9 w-28 bg-slate-200 dark:bg-slate-800 rounded-lg"></div>
            <div className="h-9 w-28 bg-slate-200 dark:bg-slate-800 rounded-lg"></div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-28 bg-slate-100 dark:bg-slate-800/50 border border-slate-200/50 dark:border-slate-800/50 rounded-2xl"></div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="h-80 bg-slate-100 dark:bg-slate-800/50 border border-slate-200/50 dark:border-slate-800/50 rounded-2xl"></div>
          <div className="h-80 bg-slate-100 dark:bg-slate-800/50 border border-slate-200/50 dark:border-slate-800/50 rounded-2xl"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 space-y-6">
      {/* Header Info */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400 font-semibold text-sm mb-1">
            <GraduationCap className="h-4 w-4" />
            <span>{dashboard?.enrollment_scope?.class_name || 'Class'}</span>
            <span className="text-slate-300 dark:text-slate-700">•</span>
            <span>ID: {dashboard?.enrollment_scope?.admission_number || 'N/A'}</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-slate-100 tracking-tight">
            {t('student_portal.dashboard.title')}
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            {t('student_portal.dashboard.subtitle')}
          </p>
        </div>
        <div className="flex gap-2 self-start sm:self-auto">
          <Link 
            to="/student/messages" 
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white/60 dark:bg-slate-900/60 backdrop-blur-md border border-slate-200/50 dark:border-slate-800/50 shadow-sm hover:bg-slate-50 dark:hover:bg-slate-800 text-sm font-medium text-slate-700 dark:text-slate-300 transition-colors"
          >
            <MessageSquare className="h-4 w-4 text-indigo-500" /> {t('student_portal.dashboard.messages')}
          </Link>
          <Link 
            to="/student/timetable" 
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 hover:shadow-lg hover:shadow-indigo-500/20 active:scale-95 text-white text-sm font-medium transition-all"
          >
            <CalendarClock className="h-4 w-4" /> {t('student_portal.dashboard.timetable')}
          </Link>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* KPI 1: Enrolled Classes */}
        <Link to="/student/classes" className="block transform hover:-translate-y-1 transition-all duration-200">
          <Card className="bg-white/60 dark:bg-slate-900/60 backdrop-blur-md border border-slate-200/50 dark:border-slate-800/50 shadow-sm hover:shadow-md h-full">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2 font-semibold text-slate-700 dark:text-slate-300">
                <BookOpen className="h-4 w-4 text-indigo-600 dark:text-indigo-400" /> 
                {t('student_portal.dashboard.my_classes')}
              </CardTitle>
              <CardDescription className="text-xs text-slate-500">
                {t('student.classes.title')}
              </CardDescription>
            </CardHeader>
            <CardContent className="flex items-end justify-between">
              <div className="text-2xl font-extrabold text-slate-900 dark:text-slate-100">
                {dashboard?.enrollment_scope?.class_name ? 'Active' : '—'}
              </div>
              <ChevronRight className="h-5 w-5 text-slate-400" />
            </CardContent>
          </Card>
        </Link>

        {/* KPI 2: Attendance Rate */}
        <Link to="/student/attendance" className="block transform hover:-translate-y-1 transition-all duration-200">
          <Card className="bg-white/60 dark:bg-slate-900/60 backdrop-blur-md border border-slate-200/50 dark:border-slate-800/50 shadow-sm hover:shadow-md h-full">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2 font-semibold text-slate-700 dark:text-slate-300">
                <Percent className="h-4 w-4 text-teal-600 dark:text-teal-400" /> 
                {t('student.dashboard.attendance_rate')}
              </CardTitle>
              <CardDescription className="text-xs text-slate-500">
                Month to date rate
              </CardDescription>
            </CardHeader>
            <CardContent className="flex items-end justify-between">
              <div className="text-2xl font-extrabold text-slate-900 dark:text-slate-100">
                {dashboard?.attendance_percentage !== undefined ? `${dashboard.attendance_percentage}%` : '—'}
              </div>
              <ChevronRight className="h-5 w-5 text-slate-400" />
            </CardContent>
          </Card>
        </Link>

        {/* KPI 3: Assignments Due */}
        <Link to="/student/assignments" className="block transform hover:-translate-y-1 transition-all duration-200">
          <Card className="bg-white/60 dark:bg-slate-900/60 backdrop-blur-md border border-slate-200/50 dark:border-slate-800/50 shadow-sm hover:shadow-md h-full">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2 font-semibold text-slate-700 dark:text-slate-300">
                <ClipboardList className="h-4 w-4 text-amber-600 dark:text-amber-400" /> 
                {t('student.dashboard.assignments_due')}
              </CardTitle>
              <CardDescription className="text-xs text-slate-500">
                {t('student_portal.dashboard.pending_submissions')}
              </CardDescription>
            </CardHeader>
            <CardContent className="flex items-end justify-between">
              <div className="text-2xl font-extrabold text-slate-900 dark:text-slate-100">
                {dashboard?.pending_assignments_count ?? 0} <span className="text-xs font-normal text-slate-500">{t('student.dashboard.pending_tasks')}</span>
              </div>
              <ChevronRight className="h-5 w-5 text-slate-400" />
            </CardContent>
          </Card>
        </Link>

        {/* KPI 4: Current Term Average */}
        <Link to="/student/grades" className="block transform hover:-translate-y-1 transition-all duration-200">
          <Card className="bg-white/60 dark:bg-slate-900/60 backdrop-blur-md border border-slate-200/50 dark:border-slate-800/50 shadow-sm hover:shadow-md h-full">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2 font-semibold text-slate-700 dark:text-slate-300">
                <Award className="h-4 w-4 text-rose-600 dark:text-rose-400" /> 
                {t('student.dashboard.term_average')}
              </CardTitle>
              <CardDescription className="text-xs text-slate-500">
                Term Grade Baseline
              </CardDescription>
            </CardHeader>
            <CardContent className="flex items-end justify-between">
              <div className="text-2xl font-extrabold text-slate-900 dark:text-slate-100">
                {dashboard?.term_average_grade !== null && dashboard?.term_average_grade !== undefined 
                  ? `${dashboard.term_average_grade}%` 
                  : '—'}
              </div>
              <ChevronRight className="h-5 w-5 text-slate-400" />
            </CardContent>
          </Card>
        </Link>
      </div>

      {/* Main Content Body */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Today's Schedule */}
        <Card className="bg-white/60 dark:bg-slate-900/60 backdrop-blur-md border border-slate-200/50 dark:border-slate-800/50 shadow-sm">
          <CardHeader className="border-b border-slate-100 dark:border-slate-800/60 pb-3">
            <div className="flex items-center gap-2">
              <CalendarClock className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
              <div>
                <CardTitle className="text-lg font-bold text-slate-900 dark:text-slate-100">
                  {t('student.dashboard.today_schedule')}
                </CardTitle>
                <CardDescription className="text-xs">
                  {t('student_portal.dashboard.quick_look')}
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-4 space-y-3">
            {dashboard?.todays_classes && dashboard.todays_classes.length > 0 ? (
              dashboard.todays_classes.map((cls) => (
                <div 
                  key={cls.id} 
                  className="group relative flex items-center justify-between p-3.5 rounded-2xl bg-white dark:bg-slate-900/40 border border-slate-200/50 dark:border-slate-800/50 shadow-sm hover:border-indigo-500/30 transition-all duration-200"
                >
                  <div className="flex items-start gap-3">
                    <div className="w-1.5 h-10 rounded-full bg-indigo-500/80 mt-0.5"></div>
                    <div>
                      <div className="text-sm font-semibold text-slate-900 dark:text-slate-100 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                        {cls.subject}
                      </div>
                      <div className="text-xs text-slate-500 mt-0.5">
                        {cls.teacher}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="inline-flex px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-400">
                      {cls.time}
                    </span>
                    <div className="text-[10px] font-medium text-slate-400 dark:text-slate-500 mt-1">
                      {cls.room}
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-sm text-slate-500 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl">
                {t('student.dashboard.no_classes_today')}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Upcoming Deadlines */}
        <Card className="bg-white/60 dark:bg-slate-900/60 backdrop-blur-md border border-slate-200/50 dark:border-slate-800/50 shadow-sm">
          <CardHeader className="border-b border-slate-100 dark:border-slate-800/60 pb-3">
            <div className="flex items-center gap-2">
              <ClipboardList className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
              <div>
                <CardTitle className="text-lg font-bold text-slate-900 dark:text-slate-100">
                  {t('student.dashboard.upcoming_deadlines')}
                </CardTitle>
                <CardDescription className="text-xs">
                  {t('student_portal.dashboard.next_exams')}
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-4 space-y-3">
            {dashboard?.upcoming_deadlines && dashboard.upcoming_deadlines.length > 0 ? (
              dashboard.upcoming_deadlines.map((dl) => (
                <Link 
                  key={dl.id} 
                  to={`/student/assignments/${dl.id}`}
                  className="group relative flex items-center justify-between p-3.5 rounded-2xl bg-white dark:bg-slate-900/40 border border-slate-200/50 dark:border-slate-800/50 shadow-sm hover:border-indigo-500/30 transition-all duration-200 block"
                >
                  <div className="flex items-start gap-3">
                    <div className="w-1.5 h-10 rounded-full bg-amber-500/80 mt-0.5"></div>
                    <div>
                      <div className="text-sm font-semibold text-slate-900 dark:text-slate-100 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors line-clamp-1">
                        {dl.title}
                      </div>
                      <div className="text-xs text-slate-500 mt-0.5">
                        {dl.subject_name}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="inline-flex px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400">
                      {formatDate(dl.due_date)}
                    </span>
                  </div>
                </Link>
              ))
            ) : (
              <div className="text-center py-8 text-sm text-slate-500 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl">
                {t('student.dashboard.no_deadlines')}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default StudentDashboard;
