import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { studentAssignments, studentClasses, studentNotifications, studentTimetable } from '../student/studentMockData';
import { BookOpen, CalendarClock, ClipboardList, Bell, MessageSquare, ChevronRight } from 'lucide-react';

const StudentDashboard: React.FC = () => {
  const stats = useMemo(() => {
    const openAssignments = studentAssignments.filter((a) => a.status === 'open').length;
    const unread = studentNotifications.filter((n) => n.unread).length;
    const today = new Date().toLocaleDateString(undefined, { weekday: 'short' });
    const todayKey = today === 'Mon' || today === 'Tue' || today === 'Wed' || today === 'Thu' || today === 'Fri' ? today : 'Mon';
    const todayClasses = studentTimetable.filter((t) => t.day === todayKey).slice(0, 3);
    return { openAssignments, unread, todayClasses };
  }, []);

  return (
    <div className="p-4 sm:p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Student Dashboard</h1>
          <p className="text-sm text-slate-600 dark:text-slate-400">Your classes, assignments, and updates</p>
        </div>
        <div className="flex gap-2">
          <Link to="/student/messages" className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-sm">
            <MessageSquare className="h-4 w-4" /> Messages
          </Link>
          <Link to="/student/timetable" className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm">
            <CalendarClock className="h-4 w-4" /> Timetable
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Link to="/student/classes" className="block">
          <Card className="hover:shadow-md transition-shadow">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2"><BookOpen className="h-4 w-4 text-indigo-600" /> My Classes</CardTitle>
              <CardDescription>{studentClasses.length} enrolled</CardDescription>
            </CardHeader>
            <CardContent className="flex items-center justify-between">
              <div className="text-xl font-bold text-slate-900 dark:text-slate-100">{studentClasses.length}</div>
              <ChevronRight className="h-4 w-4 text-slate-400" />
            </CardContent>
          </Card>
        </Link>
        <Link to="/student/assignments" className="block">
          <Card className="hover:shadow-md transition-shadow">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2"><ClipboardList className="h-4 w-4 text-indigo-600" /> Open Assignments</CardTitle>
              <CardDescription>Pending submissions</CardDescription>
            </CardHeader>
            <CardContent className="flex items-center justify-between">
              <div className="text-xl font-bold text-slate-900 dark:text-slate-100">{stats.openAssignments}</div>
              <ChevronRight className="h-4 w-4 text-slate-400" />
            </CardContent>
          </Card>
        </Link>
        <Link to="/student/notifications" className="block">
          <Card className="hover:shadow-md transition-shadow">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2"><Bell className="h-4 w-4 text-indigo-600" /> Unread</CardTitle>
              <CardDescription>Announcements & alerts</CardDescription>
            </CardHeader>
            <CardContent className="flex items-center justify-between">
              <div className="text-xl font-bold text-slate-900 dark:text-slate-100">{stats.unread}</div>
              <ChevronRight className="h-4 w-4 text-slate-400" />
            </CardContent>
          </Card>
        </Link>
        <Link to="/student/grades" className="block">
          <Card className="hover:shadow-md transition-shadow">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Grades</CardTitle>
              <CardDescription>Results overview</CardDescription>
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
            <CardTitle>Today’s classes</CardTitle>
            <CardDescription>Quick look at your day</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {stats.todayClasses.length ? stats.todayClasses.map((c) => (
              <div key={c.id} className="rounded-lg border border-slate-200 dark:border-slate-700 p-3">
                <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">{c.subject}</div>
                <div className="text-xs text-slate-500">{c.start}–{c.end}{c.room ? ` • ${c.room}` : ''}</div>
              </div>
            )) : (
              <div className="text-sm text-slate-600 dark:text-slate-400">No timetable entries for today.</div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Upcoming assignments</CardTitle>
            <CardDescription>Next deadlines</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {studentAssignments.slice(0, 4).map((a) => (
              <Link key={a.id} to={`/student/assignments/${a.id}`} className="block rounded-lg border border-slate-200 dark:border-slate-700 p-3 hover:bg-slate-50 dark:hover:bg-slate-800">
                <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">{a.title}</div>
                <div className="text-xs text-slate-500">Due {new Date(a.dueAt).toLocaleString()} • {a.status}</div>
              </Link>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default StudentDashboard;
