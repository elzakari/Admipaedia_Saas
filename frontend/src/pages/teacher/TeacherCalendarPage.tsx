import React, { useMemo, useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { CalendarDays, CalendarClock, ChevronRight, Loader2, Calendar, MapPin, Info } from 'lucide-react';
import teacherService from '../../services/teacherService';

const days: Array<'Mon' | 'Tue' | 'Wed' | 'Thu' | 'Fri'> = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];

const dayMapping: Record<string, 'Mon' | 'Tue' | 'Wed' | 'Thu' | 'Fri'> = {
  monday: 'Mon', mon: 'Mon',
  tuesday: 'Tue', tue: 'Tue',
  wednesday: 'Wed', wed: 'Wed',
  thursday: 'Thu', thu: 'Thu',
  friday: 'Fri', fri: 'Fri'
};

const TeacherCalendarPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'term' | 'weekly'>('term'); // Default to term view for calendar
  const [timetable, setTimetable] = useState<any[]>([]);
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    async function loadScheduleAssets() {
      try {
        setLoading(true);
        const profile = await teacherService.getOwnProfile();
        if (profile && active) {
          const res = await teacherService.getTeacherScheduleAssets(profile.id);
          if (active) {
            const slots = res.timetable_slots || [];
            const mapped = slots.map((s: any) => {
              const day = dayMapping[s.day_of_week?.toLowerCase()] || 'Mon';
              return {
                id: s.id.toString(),
                day,
                start: s.start_time || '',
                end: s.end_time || '',
                classId: s.class_id?.toString() || '',
                label: `${s.subject_name || 'Class'} — ${s.class_name || ''}`
              };
            });
            setTimetable(mapped);
            setEvents(res.calendar_events || []);
          }
        }
      } catch (err: any) {
        if (active) {
          setError(err.message || 'Failed to load schedule assets.');
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }
    loadScheduleAssets();
    return () => { active = false; };
  }, []);

  const byDay = useMemo(() => {
    const map: Record<string, any[]> = { Mon: [], Tue: [], Wed: [], Thu: [], Fri: [] };
    for (const item of timetable) {
      if (map[item.day]) {
        map[item.day].push(item);
      }
    }
    for (const d of days) {
      map[d].sort((a, b) => a.start.localeCompare(b.start));
    }
    return map;
  }, [timetable]);

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
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100 bg-gradient-to-r from-indigo-500 to-indigo-600 bg-clip-text text-transparent">Calendar & Term Schedule</h1>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">View school-wide term calendar events and weekly schedules in one unified control</p>
        </div>

        {/* Tabs Controls */}
        <div className="flex p-1 bg-slate-100 dark:bg-slate-800 rounded-xl w-full sm:w-auto">
          <button
            onClick={() => setActiveTab('term')}
            className={`flex-1 sm:flex-none px-4 py-2 text-sm font-medium rounded-lg transition-all ${
              activeTab === 'term'
                ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            Term Schedule
          </button>
          <button
            onClick={() => setActiveTab('weekly')}
            className={`flex-1 sm:flex-none px-4 py-2 text-sm font-medium rounded-lg transition-all ${
              activeTab === 'weekly'
                ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            Weekly Grid
          </button>
        </div>
      </div>

      {activeTab === 'term' ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <div className="p-2 bg-indigo-50 dark:bg-indigo-900/30 rounded-lg text-indigo-600 dark:text-indigo-400">
                <CalendarDays className="h-5 w-5" />
              </div>
              <span className="font-bold">Term Schedule Events</span>
            </CardTitle>
            <CardDescription>Chronological listing of all school-wide active calendar events</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {events.length === 0 ? (
                <div className="text-center py-12 text-slate-500 dark:text-slate-400 border border-dashed rounded-lg border-slate-200 dark:border-slate-800">
                  <Info className="h-8 w-8 mx-auto text-slate-400 mb-2" />
                  <p className="font-medium">No upcoming calendar events</p>
                </div>
              ) : (
                events.map((e) => (
                  <div key={e.id} className="rounded-xl border border-slate-200 dark:border-slate-700 p-4 hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="space-y-1">
                      <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">{e.title}</div>
                      <div className="text-xs text-slate-500 flex flex-wrap items-center gap-x-3 gap-y-1">
                        <span className="flex items-center gap-1"><Calendar className="h-3.5 w-3.5" /> {e.date ? new Date(e.date).toLocaleDateString(undefined, { dateStyle: 'medium' }) : '—'}</span>
                        {e.location && <span className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5" /> {e.location}</span>}
                      </div>
                      {e.description && <p className="text-xs text-slate-600 dark:text-slate-400 mt-2">{e.description}</p>}
                    </div>
                    {e.type && (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-50 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300 self-start sm:self-center capitalize">
                        {e.type}
                      </span>
                    )}
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {days.map((d) => (
            <Card key={d} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <div className="p-2 bg-indigo-50 dark:bg-indigo-900/30 rounded-lg text-indigo-600 dark:text-indigo-400">
                    <CalendarClock className="h-5 w-5" />
                  </div>
                  <span className="font-bold text-slate-900 dark:text-slate-100">{d}</span>
                </CardTitle>
                <CardDescription>{byDay[d].length ? `${byDay[d].length} session(s)` : 'No sessions'}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {byDay[d].length ? byDay[d].map((s) => (
                    <Link
                      key={s.id}
                      to={`/teacher/classes/${s.classId}`}
                      className="block rounded-xl border border-slate-200 dark:border-slate-700 p-3 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors group"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="text-sm font-semibold text-slate-900 dark:text-slate-100 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">{s.label}</div>
                          <div className="text-xs text-slate-500 mt-1">{s.start}–{s.end}</div>
                        </div>
                        <ChevronRight className="h-4 w-4 text-slate-400 group-hover:translate-x-1 transition-transform" />
                      </div>
                    </Link>
                  )) : (
                    <div className="text-sm text-slate-400 dark:text-slate-500 italic py-2">No active teaching sessions scheduled</div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default TeacherCalendarPage;
