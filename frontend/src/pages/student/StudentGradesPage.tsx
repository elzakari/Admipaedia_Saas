import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { studentGradesByTerm } from './studentMockData';
import { BadgeCheck } from 'lucide-react';

const StudentGradesPage: React.FC = () => {
  const { t } = useTranslation();
  const terms = useMemo(() => Object.keys(studentGradesByTerm), []);
  const [term, setTerm] = useState<string>(terms[0] ?? 'Term 1');
  const rows = studentGradesByTerm[term] ?? [];

  return (
    <div className="p-4 sm:p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">{t('student_portal.grades.title')}</h1>
          <p className="text-sm text-slate-600 dark:text-slate-400">{t('student_portal.grades.subtitle')}</p>
        </div>
        <div className="w-full sm:w-56">
          <Select value={term} onValueChange={setTerm}>
            <SelectTrigger>
              <SelectValue placeholder={t('student_portal.grades.select_term')} />
            </SelectTrigger>
            <SelectContent>
              {terms.map((t) => (
                <SelectItem key={t} value={t}>{t}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><BadgeCheck className="h-5 w-5 text-indigo-600" /> {t('student_portal.grades.results')}</CardTitle>
          <CardDescription>{t('student_portal.grades.read_only_for')} {term}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-slate-500">
                  <th className="py-2">{t('student_portal.grades.columns.subject')}</th>
                  <th className="py-2">{t('student_portal.grades.columns.score')}</th>
                  <th className="py-2">{t('student_portal.grades.columns.grade')}</th>
                  <th className="py-2">{t('student_portal.grades.columns.remarks')}</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.subject} className="border-t border-slate-200 dark:border-slate-700">
                    <td className="py-2 font-medium text-slate-900 dark:text-slate-100">{r.subject}</td>
                    <td className="py-2 text-slate-700 dark:text-slate-300">{r.score}</td>
                    <td className="py-2 text-slate-700 dark:text-slate-300">{r.grade}</td>
                    <td className="py-2 text-slate-600 dark:text-slate-400">{r.remarks ?? '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default StudentGradesPage;

