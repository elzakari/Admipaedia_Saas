import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { BookOpen, CalendarClock, ClipboardList, Bell, MessageSquare, ChevronRight } from 'lucide-react';
import studentService from '../../services/studentService';

const StudentDashboard: React.FC = () => {
  const { t } = useTranslation();
  const { data: dashboard, isLoading } = useQuery({
    queryKey: ['student-dashboard'],
    queryFn: () => studentService.getMyDashboard(),
    staleTime: 30_000
  })

  const stats = useMemo(() => {
    const unread = dashboard?.stats?.unread_notifications ?? 0
    const classesCount = dashboard?.stats?.classes_count ?? 0
    const upcomingExams = dashboard?.upcoming_exams || []
    return { unread, classesCount, upcomingExams }
  }, [dashboard])

  return (
    <div className="p-4 sm:p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">{t('student_portal.dashboard.title')}</h1>
          <p className="text-sm text-slate-600 dark:text-slate-400">{t('student_portal.dashboard.subtitle')}</p>
        </div>
        <div className="flex gap-2">
          <Link to="/student/messages" className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-sm">
            <MessageSquare className="h-4 w-4" /> {t('student_portal.dashboard.messages')}
          </Link>
          <Link to="/student/timetable" className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm">
            <CalendarClock className="h-4 w-4" /> {t('student_portal.dashboard.timetable')}
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Link to="/student/classes" className="block">
          <Card className="hover:shadow-md transition-shadow">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2"><BookOpen className="h-4 w-4 text-indigo-600" /> {t('student_portal.dashboard.my_classes')}</CardTitle>
              <CardDescription>{isLoading ? '—' : `${stats.classesCount} ${t('student_portal.enrolled')}`}</CardDescription>
            </CardHeader>
            <CardContent className="flex items-center justify-between">
              <div className="text-xl font-bold text-slate-900 dark:text-slate-100">{isLoading ? '—' : stats.classesCount}</div>
              <ChevronRight className="h-4 w-4 text-slate-400" />
            </CardContent>
          </Card>
        </Link>
        <Link to="/student/assignments" className="block">
          <Card className="hover:shadow-md transition-shadow">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2"><ClipboardList className="h-4 w-4 text-indigo-600" /> {t('student_portal.dashboard.open_assignments')}</CardTitle>
              <CardDescription>{t('student_portal.dashboard.pending_submissions')}</CardDescription>
            </CardHeader>
            <CardContent className="flex items-center justify-between">
              <div className="text-xl font-bold text-slate-900 dark:text-slate-100">0</div>
              <ChevronRight className="h-4 w-4 text-slate-400" />
            </CardContent>
          </Card>
        </Link>
        <Link to="/student/notifications" className="block">
          <Card className="hover:shadow-md transition-shadow">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2"><Bell className="h-4 w-4 text-indigo-600" /> {t('student_portal.dashboard.unread')}</CardTitle>
              <CardDescription>{t('student_portal.dashboard.announcements_alerts')}</CardDescription>
            </CardHeader>
            <CardContent className="flex items-center justify-between">
              <div className="text-xl font-bold text-slate-900 dark:text-slate-100">{isLoading ? '—' : stats.unread}</div>
              <ChevronRight className="h-4 w-4 text-slate-400" />
            </CardContent>
          </Card>
        </Link>
        <Link to="/student/grades" className="block">
          <Card className="hover:shadow-md transition-shadow">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">{t('student_portal.dashboard.grades')}</CardTitle>
              <CardDescription>{t('student_portal.dashboard.results_overview')}</CardDescription>
            </CardHeader>
            <CardContent className="flex items-center justify-between">
              <div className="text-xl font-bold text-slate-900 dark:text-slate-100">{t('student_portal.dashboard.view')}</div>
              <ChevronRight className="h-4 w-4 text-slate-400" />
            </CardContent>
          </Card>
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>{t('student_portal.dashboard.todays_classes')}</CardTitle>
            <CardDescription>{t('student_portal.dashboard.quick_look')}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="text-sm text-slate-600 dark:text-slate-400">{t('student_portal.dashboard.timetable_coming_soon')}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t('student_portal.dashboard.upcoming_exams')}</CardTitle>
            <CardDescription>{t('student_portal.dashboard.next_exams')}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {isLoading ? (
              <div className="text-sm text-slate-600 dark:text-slate-400">{t('student_portal.dashboard.loading')}</div>
            ) : (stats.upcomingExams.length ? stats.upcomingExams.slice(0, 4).map((e: any) => (
              <div key={e.id} className="rounded-lg border border-slate-200 dark:border-slate-700 p-3">
                <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">{e.title}</div>
                <div className="text-xs text-slate-500">{e.exam_date ? new Date(e.exam_date).toLocaleString() : ''}</div>
              </div>
            )) : (
              <div className="text-sm text-slate-600 dark:text-slate-400">{t('student_portal.dashboard.no_upcoming_exams')}</div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default StudentDashboard;
