import React from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { CalendarCheck2, CheckCircle2, XCircle, Clock, Info, AlertTriangle, RefreshCw } from 'lucide-react';
import studentService from '../../services/studentService';

const StudentAttendancePage: React.FC = () => {
  const { t, i18n } = useTranslation();
  const currentLocale = i18n.language || 'en';

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['student-attendance-summary'],
    queryFn: () => studentService.getAttendanceSummary(),
    staleTime: 15_000,
  });

  const formatDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString(currentLocale === 'fr' ? 'fr-FR' : 'en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    } catch (e) {
      return dateStr;
    }
  };

  const getStatusBadgeConfig = (status: string) => {
    switch (status) {
      case 'present':
        return {
          label: t('attendance.status.present'),
          className: 'bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800/40 font-bold',
          icon: <CheckCircle2 className="h-3.5 w-3.5 mr-1 shrink-0 text-emerald-600 dark:text-emerald-400" />
        };
      case 'absent':
        return {
          label: t('attendance.status.absent'),
          className: 'bg-rose-100 text-rose-800 border-rose-200 dark:bg-rose-950/40 dark:text-rose-400 dark:border-rose-800/40 font-bold',
          icon: <XCircle className="h-3.5 w-3.5 mr-1 shrink-0 text-rose-600 dark:text-rose-400" />
        };
      case 'late':
        return {
          label: t('attendance.status.late'),
          className: 'bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800/40 font-semibold',
          icon: <Clock className="h-3.5 w-3.5 mr-1 shrink-0 text-amber-600 dark:text-amber-400" />
        };
      case 'excused':
        return {
          label: t('attendance.status.excused'),
          className: 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-950/40 dark:text-blue-400 dark:border-blue-800/40 font-semibold',
          icon: <Info className="h-3.5 w-3.5 mr-1 shrink-0 text-blue-600 dark:text-blue-400" />
        };
      default:
        return {
          label: status,
          className: 'bg-slate-100 text-slate-800 border-slate-200 dark:bg-slate-850 dark:text-slate-400 dark:border-slate-800 font-medium',
          icon: null
        };
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
            {t('student.dashboard.error_loading')}
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            Could not fetch attendance. Please try again.
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

  if (isLoading) {
    return (
      <div className="p-4 sm:p-6 space-y-6 animate-pulse">
        <div className="space-y-2">
          <div className="h-8 w-48 bg-slate-200 dark:bg-slate-800 rounded-lg"></div>
          <div className="h-4 w-64 bg-slate-200 dark:bg-slate-800 rounded-lg"></div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="h-48 bg-slate-100 dark:bg-slate-800/50 rounded-2xl"></div>
          <div className="h-48 lg:col-span-2 bg-slate-100 dark:bg-slate-800/50 rounded-2xl"></div>
        </div>

        <div className="h-96 bg-slate-100 dark:bg-slate-800/50 rounded-2xl"></div>
      </div>
    );
  }

  const summary = data || {
    overall_percentage: 100,
    days_present: 0,
    days_absent: 0,
    days_late: 0,
    days_excused: 0,
    history: []
  };

  const percentage = summary.overall_percentage;
  const radius = 36;
  const strokeWidth = 6;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  return (
    <div className="p-4 sm:p-6 space-y-6">
      {/* Page Title */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-slate-100 tracking-tight">
          {t('student_portal.attendance.title')}
        </h1>
        <p className="text-sm text-slate-600 dark:text-slate-400">
          {t('student_portal.attendance.subtitle')}
        </p>
      </div>

      {/* Analytics Layout Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Radial Attendance ring */}
        <Card className="bg-white/60 dark:bg-slate-900/60 backdrop-blur-md border border-slate-200/50 dark:border-slate-800/50 shadow-sm flex flex-col items-center justify-center p-6 text-center">
          <CardHeader className="pb-3 pt-0 text-center">
            <CardTitle className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              {t('student_portal.attendance.attendance_pct')}
            </CardTitle>
          </CardHeader>
          <div className="relative flex items-center justify-center my-2">
            <svg className="w-32 h-32 transform -rotate-90">
              <circle
                className="text-slate-100 dark:text-slate-800/40"
                strokeWidth={strokeWidth}
                stroke="currentColor"
                fill="transparent"
                r={radius}
                cx="64"
                cy="64"
              />
              <circle
                className="text-emerald-500 dark:text-emerald-400 transition-all duration-500 ease-in-out"
                strokeWidth={strokeWidth}
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
                stroke="currentColor"
                fill="transparent"
                r={radius}
                cx="64"
                cy="64"
              />
            </svg>
            <div className="absolute text-2xl font-black text-slate-900 dark:text-slate-100">
              {percentage}%
            </div>
          </div>
          <CardDescription className="text-xs text-slate-500 mt-2">
            Overall presence metric calculated against all active terms
          </CardDescription>
        </Card>

        {/* Attendance Counter Grid */}
        <Card className="lg:col-span-2 bg-white/60 dark:bg-slate-900/60 backdrop-blur-md border border-slate-200/50 dark:border-slate-800/50 shadow-sm p-6">
          <CardHeader className="pb-4 pt-0 px-0">
            <CardTitle className="text-sm font-semibold text-slate-700 dark:text-slate-300">
              Attendance Analytics Summary
            </CardTitle>
            <CardDescription className="text-xs">
              Consolidated real database aggregates computed in real-time
            </CardDescription>
          </CardHeader>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 h-full">
            {/* Days Present */}
            <div className="bg-emerald-50/40 dark:bg-emerald-950/20 border border-emerald-100/50 dark:border-emerald-900/20 rounded-2xl p-4 flex flex-col justify-between shadow-xxs">
              <CheckCircle2 className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
              <div className="mt-4">
                <span className="text-2xl font-black text-slate-900 dark:text-slate-100 block">
                  {summary.days_present}
                </span>
                <span className="text-xxs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mt-1 block">
                  {t('student_portal.attendance.days_present')}
                </span>
              </div>
            </div>

            {/* Days Absent */}
            <div className="bg-rose-50/40 dark:bg-rose-950/20 border border-rose-100/50 dark:border-rose-900/20 rounded-2xl p-4 flex flex-col justify-between shadow-xxs">
              <XCircle className="h-6 w-6 text-rose-600 dark:text-rose-400" />
              <div className="mt-4">
                <span className="text-2xl font-black text-slate-900 dark:text-slate-100 block">
                  {summary.days_absent}
                </span>
                <span className="text-xxs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mt-1 block">
                  {t('student_portal.attendance.days_absent')}
                </span>
              </div>
            </div>

            {/* Late Logs */}
            <div className="bg-amber-50/40 dark:bg-amber-950/20 border border-amber-100/50 dark:border-amber-900/20 rounded-2xl p-4 flex flex-col justify-between shadow-xxs">
              <Clock className="h-6 w-6 text-amber-600 dark:text-amber-400" />
              <div className="mt-4">
                <span className="text-2xl font-black text-slate-900 dark:text-slate-100 block">
                  {summary.days_late}
                </span>
                <span className="text-xxs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mt-1 block">
                  {t('student_portal.attendance.days_late')}
                </span>
              </div>
            </div>

            {/* Excused Days */}
            <div className="bg-blue-50/40 dark:bg-blue-950/20 border border-blue-100/50 dark:border-blue-900/20 rounded-2xl p-4 flex flex-col justify-between shadow-xxs">
              <Info className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              <div className="mt-4">
                <span className="text-2xl font-black text-slate-900 dark:text-slate-100 block">
                  {summary.days_excused}
                </span>
                <span className="text-xxs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mt-1 block">
                  {t('student_portal.attendance.days_excused')}
                </span>
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* Attendance History Log Card */}
      <Card className="bg-white/60 dark:bg-slate-900/60 backdrop-blur-md border border-slate-200/50 dark:border-slate-800/50 shadow-sm overflow-hidden">
        <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800/60">
          <CardTitle className="flex items-center gap-2.5 font-bold text-base sm:text-lg text-slate-900 dark:text-slate-100">
            <CalendarCheck2 className="h-5 w-5 text-indigo-600 dark:text-indigo-400 shrink-0" />
            {t('student_portal.attendance.history')}
          </CardTitle>
          <CardDescription className="text-xs text-slate-500">
            {t('student_portal.attendance.most_recent')}
          </CardDescription>
        </CardHeader>
        <CardContent className="p-4 space-y-3">
          {summary.history.length > 0 ? (
            summary.history.map((e) => {
              const badge = getStatusBadgeConfig(e.status);
              return (
                <div 
                  key={e.id} 
                  className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-3.5 bg-white/40 dark:bg-slate-950/20 border border-slate-200/40 dark:border-slate-800/40 rounded-xl hover:shadow-xxs transition-shadow gap-3"
                >
                  <div className="flex flex-col">
                    <span className="text-sm font-bold text-slate-800 dark:text-slate-200">
                      {formatDate(e.date)}
                    </span>
                    <span className="text-xs text-slate-500 mt-0.5 flex items-center gap-1">
                      <span className="font-semibold text-slate-400">Remarks:</span>
                      {e.remarks || '-'}
                    </span>
                  </div>
                  <Badge 
                    variant="outline"
                    className={`px-3 py-1 rounded-full text-xs font-bold shadow-sm inline-flex items-center ${badge.className} self-start sm:self-auto`}
                  >
                    {badge.icon}
                    {badge.label}
                  </Badge>
                </div>
              );
            })
          ) : (
            <div className="text-center py-16 text-slate-500 bg-slate-50/20 dark:bg-slate-900/10 rounded-xl">
              <div className="p-4 bg-slate-100 dark:bg-slate-800/40 rounded-full w-fit mx-auto text-slate-400 mb-3 animate-pulse">
                <CalendarCheck2 className="h-8 w-8" />
              </div>
              <div className="text-base font-semibold text-slate-700 dark:text-slate-300">
                No history entries found.
              </div>
              <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
                No attendance checkpoints have been recorded yet. Talk to your homeroom instructor if you believe this is in error.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default StudentAttendancePage;

