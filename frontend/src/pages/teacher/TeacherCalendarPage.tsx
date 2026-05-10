import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { CalendarDays } from 'lucide-react';
import api from '../../lib/api';

const TeacherCalendarPage: React.FC = () => {
  const now = new Date();
  const { data, isLoading, error } = useQuery({
    queryKey: ['dashboard-events', now.getMonth() + 1, now.getFullYear()],
    queryFn: async () => {
      const res = await api.get('/dashboard/events', { params: { month: now.getMonth() + 1, year: now.getFullYear() } });
      return res.data?.events || [];
    },
    staleTime: 30_000
  });

  const events = (data as any[]) || [];

  return (
    <div className="p-4 sm:p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Calendar</h1>
        <p className="text-sm text-slate-600 dark:text-slate-400">School events and staff activities</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><CalendarDays className="h-5 w-5 text-indigo-600" /> Upcoming</CardTitle>
          <CardDescription>Read-only events</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {isLoading ? (
              <div className="text-sm text-slate-600">Loading…</div>
            ) : error ? (
              <div className="text-sm text-slate-600">Failed to load events.</div>
            ) : !events.length ? (
              <div className="text-sm text-slate-600">No upcoming events.</div>
            ) : (
              events.map((e: any) => (
                <div key={e.id} className="rounded-lg border border-slate-200 dark:border-slate-700 p-3">
                  <div>
                    <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">{e.title}</div>
                    <div className="text-xs text-slate-500 mt-1">{e.date ? new Date(e.date).toLocaleString() : ''}{e.location ? ` • ${e.location}` : ''}</div>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default TeacherCalendarPage;

