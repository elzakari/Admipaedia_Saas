import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { CalendarDays, Loader2 } from 'lucide-react';
import calendarService from '../../services/calendarService';

const TeacherCalendarPage: React.FC = () => {
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    async function loadEvents() {
      try {
        setLoading(true);
        const res = await calendarService.getEvents();
        if (active) {
          setEvents(res || []);
        }
      } catch (err: any) {
        if (active) {
          setError(err.message || 'Failed to load calendar events.');
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }
    loadEvents();
    return () => { active = false; };
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 text-center text-red-600 dark:text-red-400">
        <p className="font-medium">{error}</p>
      </div>
    );
  }

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
            {events.length === 0 ? (
              <div className="text-center py-6 text-slate-500 dark:text-slate-400 border border-dashed rounded-lg border-slate-200 dark:border-slate-800">
                No upcoming events
              </div>
            ) : (
              events.map((e) => (
                <div key={e.id} className="rounded-lg border border-slate-200 dark:border-slate-700 p-3">
                  <div>
                    <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">{e.title}</div>
                    <div className="text-xs text-slate-500 mt-1">
                      {e.date ? new Date(e.date).toLocaleDateString() : ''}
                      {e.location ? ` • ${e.location}` : ''}
                      {e.description ? ` — ${e.description}` : ''}
                    </div>
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

