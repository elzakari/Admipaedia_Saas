import React, { useMemo, useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { CalendarClock, ChevronRight, Loader2 } from 'lucide-react';
import teacherService from '../../services/teacherService';
import api from '../../lib/api';

const days: Array<'Mon' | 'Tue' | 'Wed' | 'Thu' | 'Fri'> = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];

const dayMapping: Record<string, 'Mon' | 'Tue' | 'Wed' | 'Thu' | 'Fri'> = {
  monday: 'Mon', mon: 'Mon',
  tuesday: 'Tue', tue: 'Tue',
  wednesday: 'Wed', wed: 'Wed',
  thursday: 'Thu', thu: 'Thu',
  friday: 'Fri', fri: 'Fri'
};

const TeacherTimetablePage: React.FC = () => {
  const [timetable, setTimetable] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    async function loadTimetable() {
      try {
        setLoading(true);
        const profile = await teacherService.getOwnProfile();
        if (profile && active) {
          const res = await api.get('/timetable', { params: { teacher_id: profile.id } });
          const slots = res.data?.data || res.data || [];
          
          if (active) {
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
          }
        }
      } catch (err: any) {
        if (active) {
          setError(err.message || 'Failed to load timetable.');
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }
    loadTimetable();
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

