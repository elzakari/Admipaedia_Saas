import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { ClipboardList, ChevronRight, AlertTriangle, RefreshCw, Calendar, FileText } from 'lucide-react';
import studentService from '../../services/studentService';

type FilterType = 'all' | 'open' | 'submitted' | 'graded';

const StudentAssignmentsPage: React.FC = () => {
  const { t, i18n } = useTranslation();
  const currentLocale = i18n.language || 'en';
  const [filter, setFilter] = useState<FilterType>('all');

  const { data: assignments = [], isLoading, isError, refetch } = useQuery({
    queryKey: ['student-assignments', filter],
    queryFn: () => studentService.getAssignments(filter === 'all' ? undefined : filter),
    staleTime: 15_000
  });

  const formatDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString(currentLocale === 'fr' ? 'fr-FR' : 'en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (e) {
      return dateStr;
    }
  };

  const getBadgeConfig = (status: string, score: number | null, maxPoints: number) => {
    switch (status) {
      case 'graded':
        return {
          label: score !== null 
            ? `${t('student.assignments.status.graded')}: ${score}/${maxPoints}` 
            : t('student.assignments.status.graded'),
          className: 'bg-emerald-100 hover:bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800/40 font-bold'
        };
      case 'submitted':
        return {
          label: t('student.assignments.status.submitted'),
          className: 'bg-teal-100 hover:bg-teal-100 text-teal-800 border-teal-200 dark:bg-teal-950/40 dark:text-teal-400 dark:border-teal-800/40 font-semibold'
        };
      case 'overdue':
        return {
          label: t('student.assignments.status.overdue'),
          className: 'bg-rose-100 hover:bg-rose-100 text-rose-800 border-rose-200 dark:bg-rose-950/40 dark:text-rose-400 dark:border-rose-800/40 font-bold animate-pulse'
        };
      case 'open':
      case 'pending':
      default:
        return {
          label: t('student.assignments.status.open'),
          className: 'bg-amber-100 hover:bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800/40 font-semibold'
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
            {t('student.assignments.error_loading')}
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            Could not fetch assignments. Please try again.
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
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
          <div className="space-y-2">
            <div className="h-8 w-48 bg-slate-200 dark:bg-slate-800 rounded-lg"></div>
            <div className="h-4 w-64 bg-slate-200 dark:bg-slate-800 rounded-lg"></div>
          </div>
          <div className="flex gap-2">
            <div className="h-9 w-20 bg-slate-200 dark:bg-slate-800 rounded-lg"></div>
            <div className="h-9 w-20 bg-slate-200 dark:bg-slate-800 rounded-lg"></div>
            <div className="h-9 w-20 bg-slate-200 dark:bg-slate-800 rounded-lg"></div>
          </div>
        </div>
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-28 bg-slate-100 dark:bg-slate-800/50 border border-slate-200/50 dark:border-slate-800/50 rounded-2xl"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 space-y-6">
      {/* Page Header and Filtering Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-slate-100 tracking-tight">
            {t('student.assignments.title')}
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            {t('student.assignments.subtitle')}
          </p>
        </div>
        <div className="flex bg-slate-100/80 dark:bg-slate-900/60 p-1 rounded-xl border border-slate-200/50 dark:border-slate-800/50 backdrop-blur-md self-start sm:self-auto shadow-sm">
          {(['all', 'open', 'submitted', 'graded'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold tracking-wide transition-all duration-200 ${
                filter === f
                  ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-sm border border-slate-200/20 dark:border-slate-700/20'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              {t(`student_portal.assignments.filter.${f}`)}
            </button>
          ))}
        </div>
      </div>

      {/* Assignments List Grid */}
      <div className="grid grid-cols-1 gap-4">
        {assignments.length > 0 ? (
          assignments.map((a) => {
            const badge = getBadgeConfig(a.status, a.score, a.max_points);
            return (
              <Link 
                key={a.id} 
                to={`/student/assignments/${a.id}`} 
                className="block transform hover:-translate-y-0.5 transition-all duration-200"
              >
                <Card className="bg-white/60 dark:bg-slate-900/60 backdrop-blur-md border border-slate-200/50 dark:border-slate-800/50 shadow-sm hover:shadow-md transition-shadow">
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-start justify-between text-slate-900 dark:text-slate-100">
                      <span className="flex items-center gap-2.5 font-bold text-base sm:text-lg pr-4">
                        <ClipboardList className="h-5 w-5 text-indigo-600 dark:text-indigo-400 shrink-0 mt-0.5" />
                        {a.title}
                      </span>
                      <ChevronRight className="h-4 w-4 text-slate-400 shrink-0 mt-1" />
                    </CardTitle>
                    <CardDescription className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-slate-500 mt-2">
                      <span className="font-semibold text-slate-700 dark:text-slate-300">
                        {a.subject_name}
                      </span>
                      <span className="text-slate-300 dark:text-slate-700">•</span>
                      <span className="flex items-center gap-1 font-medium text-amber-600 dark:text-amber-400">
                        <Calendar className="h-3.5 w-3.5 shrink-0" />
                        {t('student_portal.assignments.due')}: {formatDate(a.dueAt || a.due_date)}
                      </span>
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-t border-slate-100 dark:border-slate-800/60 pt-3">
                    <div className="flex items-start gap-2 text-xs sm:text-sm text-slate-600 dark:text-slate-400 line-clamp-2 sm:line-clamp-1 max-w-2xl">
                      <FileText className="h-4 w-4 text-slate-400 shrink-0 mt-0.5" />
                      {a.description || 'No description provided.'}
                    </div>
                    <Badge 
                      variant="outline"
                      className={`px-3 py-1 rounded-full text-xs font-semibold border transition-all ${badge.className} self-start sm:self-auto shadow-sm`}
                    >
                      {badge.label}
                    </Badge>
                  </CardContent>
                </Card>
              </Link>
            );
          })
        ) : (
          <div className="text-center py-16 text-slate-500 border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl bg-slate-50/50 dark:bg-slate-900/20">
            <div className="p-4 bg-slate-100 dark:bg-slate-800/40 rounded-full w-fit mx-auto text-slate-400 mb-3">
              <ClipboardList className="h-8 w-8" />
            </div>
            <div className="text-base font-semibold text-slate-700 dark:text-slate-300">
              {t('student.assignments.no_assignments')}
            </div>
            <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
              There are no tasks matching the selected filter right now.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default StudentAssignmentsPage;
