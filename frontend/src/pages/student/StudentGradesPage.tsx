import React, { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { BadgeCheck } from 'lucide-react';
import api from '../../lib/api';
import studentService from '../../services/studentService';

const StudentGradesPage: React.FC = () => {
  const { data: profile } = useQuery({
    queryKey: ['student-profile'],
    queryFn: () => studentService.getOwnProfile(),
    staleTime: 60_000
  });

  const studentId = Number((profile as any)?.id);

  const { data, isLoading, error } = useQuery({
    queryKey: ['student-grades', studentId],
    queryFn: async () => {
      const res = await api.get('/students/grades', { params: { page: 1, per_page: 100 } });
      return res.data;
    },
    enabled: Number.isFinite(studentId) && studentId > 0,
    staleTime: 30_000
  });

  const grades = useMemo(() => data?.grades || [], [data]);

  const terms = useMemo(() => {
    const labels = new Set<string>();
    for (const g of grades) {
      const label = g?.exam?.title || 'All'
      labels.add(label)
    }
    return ['All', ...Array.from(labels).slice(0, 20)];
  }, [grades]);

  const [term, setTerm] = useState<string>('All');

  const rows = useMemo(() => {
    if (term === 'All') return grades;
    return grades.filter((g: any) => (g?.exam?.title || '') === term);
  }, [grades, term]);

  return (
    <div className="p-4 sm:p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Grades & Results</h1>
          <p className="text-sm text-slate-600 dark:text-slate-400">View your results by term</p>
        </div>
        <div className="w-full sm:w-56">
          <Select value={term} onValueChange={setTerm}>
            <SelectTrigger>
              <SelectValue placeholder="Select term" />
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
          <CardTitle className="flex items-center gap-2"><BadgeCheck className="h-5 w-5 text-indigo-600" /> Results</CardTitle>
          <CardDescription>Latest results</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-slate-500">
                  <th className="py-2">Subject</th>
                  <th className="py-2">Score</th>
                  <th className="py-2">Grade</th>
                  <th className="py-2">Remarks</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr><td className="py-3 text-slate-600" colSpan={4}>Loading…</td></tr>
                ) : error ? (
                  <tr><td className="py-3 text-slate-600" colSpan={4}>Failed to load grades.</td></tr>
                ) : rows.length ? (
                  rows.map((g: any) => (
                    <tr key={g.id} className="border-t border-slate-200 dark:border-slate-700">
                      <td className="py-2 font-medium text-slate-900 dark:text-slate-100">{g?.exam?.subject?.name || 'Subject'}</td>
                      <td className="py-2 text-slate-700 dark:text-slate-300">{Number.isFinite(Number(g?.percentage)) ? `${g.percentage}%` : '-'}</td>
                      <td className="py-2 text-slate-700 dark:text-slate-300">{g?.grade_letter || '-'}</td>
                      <td className="py-2 text-slate-600 dark:text-slate-400">{g?.remarks ?? '-'}</td>
                    </tr>
                  ))
                ) : (
                  <tr><td className="py-3 text-slate-600" colSpan={4}>No grades found.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default StudentGradesPage;

