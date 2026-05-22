import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Badge } from '../../components/ui/badge';
import { BadgeCheck, Award, TrendingUp, AlertTriangle, RefreshCw, BookOpen } from 'lucide-react';
import studentService from '../../services/studentService';

const StudentGradesPage: React.FC = () => {
  const { t } = useTranslation();
  const [term, setTerm] = useState<string>('Term 1');

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['student-grades', term],
    queryFn: () => studentService.getGrades(term),
    staleTime: 15_000,
  });

  const getGradeBadgeClass = (letter: string) => {
    const l = letter.toUpperCase();
    if (l.startsWith('A')) {
      return 'bg-emerald-100 hover:bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800/40 font-bold';
    }
    if (l.startsWith('B')) {
      return 'bg-teal-100 hover:bg-teal-100 text-teal-800 border-teal-200 dark:bg-teal-950/40 dark:text-teal-400 dark:border-teal-800/40 font-semibold';
    }
    if (l.startsWith('C')) {
      return 'bg-amber-100 hover:bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800/40 font-semibold';
    }
    return 'bg-rose-100 hover:bg-rose-100 text-rose-800 border-rose-200 dark:bg-rose-950/40 dark:text-rose-400 dark:border-rose-800/40 font-bold animate-pulse';
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
            Could not fetch grades. Please try again.
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
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
          <div className="space-y-2">
            <div className="h-8 w-48 bg-slate-200 dark:bg-slate-800 rounded-lg"></div>
            <div className="h-4 w-64 bg-slate-200 dark:bg-slate-800 rounded-lg"></div>
          </div>
          <div className="h-10 w-56 bg-slate-200 dark:bg-slate-800 rounded-lg"></div>
        </div>

        {/* Overview cards skeletal */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="h-32 bg-slate-100 dark:bg-slate-800/50 rounded-2xl"></div>
          <div className="h-32 bg-slate-100 dark:bg-slate-800/50 rounded-2xl"></div>
        </div>

        {/* Table skeletal */}
        <div className="h-96 bg-slate-100 dark:bg-slate-800/50 rounded-2xl"></div>
      </div>
    );
  }

  const grades = data?.grades || [];
  const cumulativeAverage = data?.cumulative_average ?? 0;
  const classRank = data?.class_rank ?? 1;
  const totalStudents = data?.total_students ?? 1;

  return (
    <div className="p-4 sm:p-6 space-y-6">
      {/* Page Header and Filtering Dropdown */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-slate-100 tracking-tight">
            {t('student_portal.grades.title')}
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            {t('student_portal.grades.subtitle')}
          </p>
        </div>
        <div className="w-full sm:w-56">
          <Select value={term} onValueChange={setTerm}>
            <SelectTrigger className="bg-white/60 dark:bg-slate-900/60 border-slate-200/50 dark:border-slate-800/50 backdrop-blur-md shadow-sm rounded-xl">
              <SelectValue placeholder={t('student_portal.grades.select_term')} />
            </SelectTrigger>
            <SelectContent className="bg-white/90 dark:bg-slate-900/90 border-slate-200/50 dark:border-slate-800/50 backdrop-blur-lg">
              <SelectItem value="Term 1">{t('schedule.terms.term_1')}</SelectItem>
              <SelectItem value="Term 2">{t('schedule.terms.term_2')}</SelectItem>
              <SelectItem value="Term 3">{t('schedule.terms.term_3')}</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Overview Analytics KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Card className="bg-white/60 dark:bg-slate-900/60 backdrop-blur-md border border-slate-200/50 dark:border-slate-800/50 shadow-sm relative overflow-hidden group hover:shadow-md transition-shadow">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform duration-300">
            <Award className="h-24 w-24 text-emerald-500" />
          </div>
          <CardHeader className="pb-2">
            <CardDescription className="text-slate-500 font-semibold tracking-wide text-xs uppercase flex items-center gap-1.5">
              <Award className="h-4 w-4 text-emerald-500" />
              {t('student_portal.grades.cumulative_average')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-slate-100 flex items-baseline gap-1">
              {cumulativeAverage}%
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Active term performance baseline score
            </p>
          </CardContent>
        </Card>

        <Card className="bg-white/60 dark:bg-slate-900/60 backdrop-blur-md border border-slate-200/50 dark:border-slate-800/50 shadow-sm relative overflow-hidden group hover:shadow-md transition-shadow">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform duration-300">
            <TrendingUp className="h-24 w-24 text-indigo-500" />
          </div>
          <CardHeader className="pb-2">
            <CardDescription className="text-slate-500 font-semibold tracking-wide text-xs uppercase flex items-center gap-1.5">
              <TrendingUp className="h-4 w-4 text-indigo-500" />
              {t('student_portal.grades.rank_in_class')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-slate-100 flex items-baseline gap-1">
              {classRank} <span className="text-sm font-semibold text-slate-500">/ {totalStudents}</span>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Current academic rank standing in class
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Grades Matrix Table */}
      <Card className="bg-white/60 dark:bg-slate-900/60 backdrop-blur-md border border-slate-200/50 dark:border-slate-800/50 shadow-sm overflow-hidden">
        <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800/60">
          <CardTitle className="flex items-center gap-2.5 font-bold text-base sm:text-lg text-slate-900 dark:text-slate-100">
            <BadgeCheck className="h-5 w-5 text-indigo-600 dark:text-indigo-400 shrink-0" />
            {t('student_portal.grades.results')}
          </CardTitle>
          <CardDescription className="text-xs text-slate-500">
            {t('student_portal.grades.read_only_for')} {term}
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {grades.length > 0 ? (
            <div className="overflow-x-auto w-full">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="bg-slate-50/55 dark:bg-slate-900/40 text-slate-500 font-semibold text-xs border-b border-slate-100 dark:border-slate-800/60">
                    <th className="py-3 px-4 text-left">{t('student_portal.grades.columns.subject')}</th>
                    <th className="py-3 px-4 text-center">{t('student_portal.grades.columns.ca')} (40%)</th>
                    <th className="py-3 px-4 text-center">{t('student_portal.grades.columns.exam')} (60%)</th>
                    <th className="py-3 px-4 text-center">{t('student_portal.grades.columns.total')}</th>
                    <th className="py-3 px-4 text-center">{t('student_portal.grades.columns.grade_letter')}</th>
                    <th className="py-3 px-4 text-left">{t('student_portal.grades.columns.remarks')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                  {grades.map((r) => (
                    <tr 
                      key={r.id} 
                      className="hover:bg-slate-50/30 dark:hover:bg-slate-900/30 transition-colors"
                    >
                      <td className="py-3.5 px-4 font-bold text-slate-900 dark:text-slate-100">
                        <div className="flex flex-col">
                          <span>{r.subject.name}</span>
                          <span className="text-xxs text-slate-400 font-medium tracking-wider uppercase mt-0.5">{r.subject.code}</span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-center text-slate-700 dark:text-slate-300 font-medium">
                        {r.ca_score}%
                      </td>
                      <td className="py-3.5 px-4 text-center text-slate-700 dark:text-slate-300 font-medium">
                        {r.exam_score}%
                      </td>
                      <td className="py-3.5 px-4 text-center text-slate-900 dark:text-slate-100 font-extrabold text-base">
                        {r.total_score}%
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <Badge 
                          variant="outline"
                          className={`px-3 py-0.5 rounded-full text-xs font-extrabold shadow-sm ${getGradeBadgeClass(r.grade_letter)}`}
                        >
                          {r.grade_letter}
                        </Badge>
                      </td>
                      <td className="py-3.5 px-4 text-slate-600 dark:text-slate-400 font-medium">
                        {t(`student_portal.grades.remarks_lookup.${r.remarks}`, { defaultValue: r.remarks }) || '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-16 text-slate-500 bg-slate-50/20 dark:bg-slate-900/10">
              <div className="p-4 bg-slate-100 dark:bg-slate-800/40 rounded-full w-fit mx-auto text-slate-400 mb-3 animate-pulse">
                <BookOpen className="h-8 w-8" />
              </div>
              <div className="text-base font-semibold text-slate-700 dark:text-slate-300">
                {t('student_portal.grades.no_grades')}
              </div>
              <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
                No active results recorded in this scope. Ensure all continuous assessment scripts are uploaded by your subject facilitator.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default StudentGradesPage;

