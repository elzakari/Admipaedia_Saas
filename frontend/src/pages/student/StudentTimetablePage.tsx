import React, { useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { studentTimetable } from './studentMockData';
import { CalendarClock } from 'lucide-react';

const days: Array<'Mon' | 'Tue' | 'Wed' | 'Thu' | 'Fri'> = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];

const StudentTimetablePage: React.FC = () => {
  const byDay = useMemo(() => {
    const map: Record<string, typeof studentTimetable> = { Mon: [], Tue: [], Wed: [], Thu: [], Fri: [] };
    for (const item of studentTimetable) map[item.day].push(item);
    for (const d of days) map[d].sort((a, b) => a.start.localeCompare(b.start));
    return map;
  }, []);

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
              <CardDescription>{byDay[d].length ? `${byDay[d].length} session(s)` : 'No sessions'}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {byDay[d].length ? byDay[d].map((s) => (
                  <div key={s.id} className="rounded-lg border border-slate-200 dark:border-slate-700 p-3">
                    <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">{s.subject}</div>
                    <div className="text-xs text-slate-500">{s.start}–{s.end}{s.room ? ` • ${s.room}` : ''}</div>
                  </div>
                )) : (
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

