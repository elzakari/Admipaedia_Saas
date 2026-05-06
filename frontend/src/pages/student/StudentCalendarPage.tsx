import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { studentCalendarEvents } from './studentMockData';
import { CalendarDays } from 'lucide-react';

const StudentCalendarPage: React.FC = () => {
  return (
    <div className="p-4 sm:p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Calendar</h1>
        <p className="text-sm text-slate-600 dark:text-slate-400">School events relevant to you</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><CalendarDays className="h-5 w-5 text-indigo-600" /> Upcoming</CardTitle>
          <CardDescription>Read-only events</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {studentCalendarEvents.map((e) => (
              <div key={e.id} className="rounded-lg border border-slate-200 dark:border-slate-700 p-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">{e.title}</div>
                    <div className="text-xs text-slate-500 mt-1">{e.date}{e.location ? ` • ${e.location}` : ''}</div>
                  </div>
                </div>
                {e.description ? <div className="text-sm text-slate-700 dark:text-slate-300 mt-2">{e.description}</div> : null}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default StudentCalendarPage;

