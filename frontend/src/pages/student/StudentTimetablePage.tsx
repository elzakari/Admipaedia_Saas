import React, { useMemo, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { CalendarClock, AlertTriangle, RefreshCw, Clock, MapPin, User, Flame } from 'lucide-react';
import studentService from '../../services/studentService';

const weekdays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'] as const;

const StudentTimetablePage: React.FC = () => {
  const { t } = useTranslation();
  const [, setTick] = useState(0);

  // Trigger re-render every 30 seconds to keep the active lesson highlight fully live
  useEffect(() => {
    const timer = setInterval(() => {
      setTick((tick) => tick + 1);
    }, 30000);
    return () => clearInterval(timer);
  }, []);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['student-courses'],
    queryFn: () => studentService.getCourses(),
    staleTime: 30_000
  });

  // Dynamic day grouping and sorting
  const groupedTimetable = useMemo(() => {
    const timetable = data?.timetable || [];
    const initialMap: Record<string, typeof timetable> = {
      Mon: [],
      Tue: [],
      Wed: [],
      Thu: [],
      Fri: []
    };

    timetable.forEach((item) => {
      const normalizedDay = weekdays.includes(item.day as any) ? item.day : 'Mon';
      if (initialMap[normalizedDay]) {
        initialMap[normalizedDay].push(item);
      }
    });

    // Sort slots by period time ascending
    Object.keys(initialMap).forEach((day) => {
      initialMap[day].sort((a, b) => a.start.localeCompare(b.start));
    });

    return initialMap;
  }, [data]);

  // Live lesson slot matching logic
  const checkActiveLesson = (slotDay: string, startStr: string, endStr: string) => {
    try {
      const now = new Date();
      const daysAbbr = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      const currentDay = daysAbbr[now.getDay()]; // e.g. "Mon"
      
      if (slotDay !== currentDay) return false;

      const currentHours = now.getHours();
      const currentMinutes = now.getMinutes();
      const currentTotalMinutes = currentHours * 60 + currentMinutes;

      const [startH, startM] = startStr.split(':').map(Number);
      const [endH, endM] = endStr.split(':').map(Number);
      
      const startTotalMinutes = startH * 60 + startM;
      const endTotalMinutes = endH * 60 + endM;

      return currentTotalMinutes >= startTotalMinutes && currentTotalMinutes <= endTotalMinutes;
    } catch (e) {
      return false;
    }
  };

  if (isError) {
    return (
      <div className="p-6 flex flex-col items-center justify-center min-h-[50vh] space-y-4">
        <div className="p-4 bg-red-50 dark:bg-red-950/20 rounded-full text-red-600 dark:text-red-400">
          <AlertTriangle className="h-12 w-12" />
        </div>
        <div className="text-center">
          <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100">
            {t('student.timetable.error_loading')}
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            Could not fetch schedule details. Please try again.
          </p>
        </div>
        <button
          onClick={() => refetch()}
          className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 active:scale-95 transition text-white font-medium rounded-xl shadow-lg shadow-indigo-500/20"
        >
          <RefreshCw className="h-4 w-4" /> {t('student.dashboard.retry')}
        </button>
      </div>
    );
  }

  // Premium skeletal pulse loading
  if (isLoading) {
    return (
      <div className="p-4 sm:p-6 space-y-6 animate-pulse">
        <div className="space-y-2">
          <div className="h-8 w-48 bg-slate-200 dark:bg-slate-800 rounded-lg"></div>
          <div className="h-4 w-64 bg-slate-200 dark:bg-slate-800 rounded-lg"></div>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {weekdays.map((d) => (
            <div key={d} className="h-64 bg-slate-100 dark:bg-slate-800/50 border border-slate-200/50 dark:border-slate-800/50 rounded-2xl"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-slate-100 tracking-tight">
          {t('student.timetable.title')}
        </h1>
        <p className="text-sm text-slate-600 dark:text-slate-400">
          {t('student.timetable.subtitle')}
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {weekdays.map((d) => {
          const sessions = groupedTimetable[d] || [];
          return (
            <Card 
              key={d} 
              className="bg-white/60 dark:bg-slate-900/60 backdrop-blur-md border border-slate-200/50 dark:border-slate-800/50 shadow-sm"
            >
              <CardHeader className="border-b border-slate-100 dark:border-slate-800/60 pb-3 flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2 font-bold text-slate-900 dark:text-slate-100 text-lg">
                    <CalendarClock className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                    {t(`student.weekdays.${d}`)}
                  </CardTitle>
                  <CardDescription className="text-xs mt-0.5">
                    {sessions.length 
                      ? t('student.timetable.sessions_count', { count: sessions.length })
                      : t('student.timetable.no_sessions')}
                  </CardDescription>
                </div>
              </CardHeader>
              <CardContent className="pt-4 space-y-3">
                {sessions.length > 0 ? (
                  sessions.map((s) => {
                    const isActive = checkActiveLesson(s.day, s.start, s.end);
                    return (
                      <div 
                        key={s.id} 
                        className={`relative p-4 rounded-2xl border transition-all duration-300 ${
                          isActive 
                            ? 'bg-emerald-50/70 dark:bg-emerald-950/20 border-emerald-500/80 shadow-md ring-2 ring-emerald-500/10 scale-[1.01]' 
                            : 'bg-white dark:bg-slate-900/40 border-slate-200/50 dark:border-slate-800/50 hover:border-indigo-500/30'
                        }`}
                      >
                        {isActive && (
                          <span className="absolute top-3.5 right-4 inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 dark:bg-emerald-900/40 text-emerald-800 dark:text-emerald-400 animate-pulse">
                            <Flame className="h-3 w-3 fill-emerald-500" />
                            {t('student.timetable.active_lesson')}
                          </span>
                        )}
                        <div className="text-base font-bold text-slate-900 dark:text-slate-100">
                          {s.subject}
                        </div>
                        
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mt-3 text-xs text-slate-500 dark:text-slate-400">
                          <div className="flex items-center gap-1.5">
                            <Clock className="h-3.5 w-3.5 text-slate-400" />
                            <span className="font-semibold text-slate-700 dark:text-slate-300">
                              {s.start} – {s.end}
                            </span>
                          </div>
                          {s.teacher && (
                            <div className="flex items-center gap-1.5">
                              <User className="h-3.5 w-3.5 text-slate-400" />
                              <span className="truncate">{s.teacher}</span>
                            </div>
                          )}
                          {s.room && (
                            <div className="flex items-center gap-1.5">
                              <MapPin className="h-3.5 w-3.5 text-slate-400" />
                              <span>{s.room}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="text-center py-6 text-sm text-slate-400 border border-dashed border-slate-200 dark:border-slate-800 rounded-xl">
                    {t('student.timetable.no_sessions')}
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
};

export default StudentTimetablePage;
