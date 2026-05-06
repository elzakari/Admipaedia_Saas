import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { teacherTimetable } from './teacherMockData';
import { CalendarClock, ChevronRight } from 'lucide-react';

const days: Array<'Mon' | 'Tue' | 'Wed' | 'Thu' | 'Fri'> = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];

const TeacherTimetablePage: React.FC = () => {
  const byDay = useMemo(() => {
    const map: Record<string, typeof teacherTimetable> = { Mon: [], Tue: [], Wed: [], Thu: [], Fri: [] };
    for (const item of teacherTimetable) map[item.day].push(item);
    for (const d of days) map[d].sort((a, b) => a.start.localeCompare(b.start));
    return map;
  }, []);

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
              <CardDescription>{byDay[d].length ? `${byDay[d].length} session(s)` : 'No sessions'}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {byDay[d].length ? byDay[d].map((s) => (
                  <Link
                    key={s.id}
                    to={`/teacher/classes/${s.classId}`}
                    className="block rounded-lg border border-slate-200 dark:border-slate-700 p-3 hover:bg-slate-50 dark:hover:bg-slate-800"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">{s.label}</div>
                        <div className="text-xs text-slate-500">{s.start}–{s.end}</div>
                      </div>
                      <ChevronRight className="h-4 w-4 text-slate-400" />
                    </div>
                  </Link>
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

export default TeacherTimetablePage;

