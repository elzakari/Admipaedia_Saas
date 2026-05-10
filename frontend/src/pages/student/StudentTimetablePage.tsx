import React, { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { CalendarClock } from 'lucide-react';
import studentService from '../../services/studentService';
import timetableService from '../../services/timetableService';

const days: Array<'Mon' | 'Tue' | 'Wed' | 'Thu' | 'Fri'> = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];

const StudentTimetablePage: React.FC = () => {
  const { data: profile } = useQuery({
    queryKey: ['student-profile'],
    queryFn: () => studentService.getOwnProfile(),
    staleTime: 60_000
  });

  const classId = Number((profile as any)?.class_id);

  const { data: weekly, isLoading, error } = useQuery({
    queryKey: ['class-timetable', classId],
    queryFn: () => timetableService.getClassTimetable(classId),
    enabled: Number.isFinite(classId) && classId > 0,
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
        <p className="text-sm text-slate-600 dark:text-slate-400">Your weekly schedule</p>
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
                    <div key={s.id} className="rounded-lg border border-slate-200 dark:border-slate-700 p-3">
                      <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">{s.subject_name || s.subject || 'Lesson'}</div>
                      <div className="text-xs text-slate-500">{s.start_time}–{s.end_time}{s.room ? ` • ${s.room}` : ''}</div>
                    </div>
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

export default StudentTimetablePage;

