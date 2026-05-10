import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { BookOpen, CalendarClock, Bell, MessageSquare, ChevronRight } from 'lucide-react';
import teacherService from '../../services/teacherService';
import api from '../../lib/api';

const TeacherDashboard: React.FC = () => {
  const { data: teacher } = useQuery({
    queryKey: ['teacher-profile'],
    queryFn: () => teacherService.getOwnProfile(),
    staleTime: 60_000
  })

  const teacherId = teacher?.id

  const { data: classesData } = useQuery({
    queryKey: ['teacher-classes', teacherId],
    queryFn: async () => {
      if (!teacherId) return []
      const res = await api.get(`/teachers/${teacherId}/classes`, { params: { per_page: 50 } })
      return res.data?.classes || []
    },
    enabled: !!teacherId,
    staleTime: 60_000
  })

  const { data: notificationsData } = useQuery({
    queryKey: ['dashboard-notifications'],
    queryFn: async () => {
      const res = await api.get('/dashboard/notifications', { params: { limit: 20 } })
      return res.data?.notifications || []
    },
    staleTime: 30_000
  })

  const { data: analytics } = useQuery({
    queryKey: ['teacher-analytics', teacherId],
    queryFn: () => (teacherId ? teacherService.getTeacherDashboardAnalytics(teacherId) : Promise.resolve(null)),
    enabled: !!teacherId,
    staleTime: 60_000
  })

  const stats = useMemo(() => {
    const unread = (notificationsData || []).filter((n: any) => !n.read).length
    const lessons = (analytics?.upcomingLessons || []).slice(0, 4)
    return { unread, lessons }
  }, [analytics, notificationsData])

  return (
    <div className="p-4 sm:p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Teacher Dashboard</h1>
          <p className="text-sm text-slate-600 dark:text-slate-400">Your classes, schedule, and notifications</p>
        </div>
        <div className="flex gap-2">
          <Link to="/teacher/messages" className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-sm">
            <MessageSquare className="h-4 w-4" /> Messages
          </Link>
          <Link to="/teacher/timetable" className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm">
            <CalendarClock className="h-4 w-4" /> Timetable
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Link to="/teacher/classes" className="block">
          <Card className="hover:shadow-md transition-shadow">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2"><BookOpen className="h-4 w-4 text-indigo-600" /> My Classes</CardTitle>
              <CardDescription>Assigned to you</CardDescription>
            </CardHeader>
            <CardContent className="flex items-center justify-between">
              <div className="text-xl font-bold text-slate-900 dark:text-slate-100">{(classesData || []).length}</div>
              <ChevronRight className="h-4 w-4 text-slate-400" />
            </CardContent>
          </Card>
        </Link>
        <Link to="/teacher/notifications" className="block">
          <Card className="hover:shadow-md transition-shadow">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2"><Bell className="h-4 w-4 text-indigo-600" /> Unread</CardTitle>
              <CardDescription>Updates and notices</CardDescription>
            </CardHeader>
            <CardContent className="flex items-center justify-between">
              <div className="text-xl font-bold text-slate-900 dark:text-slate-100">{stats.unread}</div>
              <ChevronRight className="h-4 w-4 text-slate-400" />
            </CardContent>
          </Card>
        </Link>
        <Link to="/teacher/calendar" className="block">
          <Card className="hover:shadow-md transition-shadow">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Calendar</CardTitle>
              <CardDescription>School events</CardDescription>
            </CardHeader>
            <CardContent className="flex items-center justify-between">
              <div className="text-xl font-bold text-slate-900 dark:text-slate-100">View</div>
              <ChevronRight className="h-4 w-4 text-slate-400" />
            </CardContent>
          </Card>
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Today’s schedule</CardTitle>
            <CardDescription>Jump straight into a class</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {stats.lessons.length ? stats.lessons.map((t: any) => (
              <Link key={t.id} to="/teacher/timetable" className="block rounded-lg border border-slate-200 dark:border-slate-700 p-3 hover:bg-slate-50 dark:hover:bg-slate-800">
                <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">{t.title}</div>
                <div className="text-xs text-slate-500">{t.class_name}{t.room ? ` • ${t.room}` : ''}</div>
              </Link>
            )) : (
              <div className="text-sm text-slate-600 dark:text-slate-400">No timetable entries for today.</div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Quick access</CardTitle>
            <CardDescription>Common teacher actions</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {(classesData || []).slice(0, 4).map((c: any) => (
              <Link
                key={c.id}
                to={`/teacher/classes/${c.id}`}
                className="block rounded-lg border border-slate-200 dark:border-slate-700 p-3 hover:bg-slate-50 dark:hover:bg-slate-800"
              >
                <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">{c.name}</div>
                <div className="text-xs text-slate-500">{c.academic_year}</div>
              </Link>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default TeacherDashboard;
