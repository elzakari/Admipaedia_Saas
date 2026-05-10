import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { CalendarClock, ChevronRight } from 'lucide-react';
import teacherService from '../../services/teacherService';
import timetableService from '../../services/timetableService';

const days: Array<'Mon' | 'Tue' | 'Wed' | 'Thu' | 'Fri'> = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];

const TeacherTimetablePage: React.FC = () => {
  const { data: teacher } = useQuery({
    queryKey: ['teacher-profile'],
    queryFn: () => teacherService.getOwnProfile(),
    staleTime: 60_000
  });

  const teacherId = Number((teacher as any)?.id);

  const { data: weekly, isLoading, error } = useQuery({
    queryKey: ['teacher-timetable', teacherId],
    queryFn: () => timetableService.getTeacherTimetable(teacherId),
    enabled: Number.isFinite(teacherId) && teacherId > 0,
    staleTime: 30_000
  });

  const byDay = useMemo(() => {
    const map: Record<string, any[]> = { Mon: [], Tue: [], Wed: [], Thu: [], Fri: [] };
    const dayMap: Record<string, string> = { Monday: 'Mon', Tuesday: 'Tue', Wednesday: 'Wed', Thursday: 'Thu', Friday: 'Fri' };
    if (!weekly) return map;
    for (const [day, lessons] of Object.entries(weekly as any)) {
      const key = dayMap[day] || day;
      if (!map[key]) continue;
      map[key] = (lessons as any[]).slice().sort((a, b) => String(a.start_time || '').localeCompare(String(b.start_time || '')));
    }
    return map;
  }, [weekly]);

  return (
    <div className="p-4 sm:p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Timetable</h1>
        <p className="text-sm text-slate-600 dark:text-slate-400">Weekly view with quick links to classes</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {days.map((d) => (
          <Card key={d}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><CalendarClock className="h-5 w-5 text-indigo-600" /> {d}</CardTitle>
              <CardDescription>{isLoading ? 'Loading…' : error ? 'Failed to load' : (byDay[d].length ? `${byDay[d].length} session(s)` : 'No sessions')}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {isLoading ? (
                  <div className="text-sm text-slate-600 dark:text-slate-400">—</div>
                ) : error ? (
                  <div className="text-sm text-slate-600 dark:text-slate-400">—</div>
                ) : byDay[d].length ? (
                  byDay[d].map((s: any) => (
                    <Link
                      key={s.id}
                      to={s.class_id ? `/teacher/classes/${s.class_id}` : '/teacher/classes'}
                      className="block rounded-lg border border-slate-200 dark:border-slate-700 p-3 hover:bg-slate-50 dark:hover:bg-slate-800"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">{s.title || s.subject_name || 'Lesson'}</div>
                          <div className="text-xs text-slate-500">{s.start_time}–{s.end_time}{s.room ? ` • ${s.room}` : ''}</div>
                        </div>
                        <ChevronRight className="h-4 w-4 text-slate-400" />
                      </div>
                    </Link>
                  ))
                ) : (
                  <div className="text-sm text-slate-600 dark:text-slate-400">—</div>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default TeacherTimetablePage;

