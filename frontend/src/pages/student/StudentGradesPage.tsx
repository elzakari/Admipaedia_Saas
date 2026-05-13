import React, { useMemo, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { studentGradesByTerm } from './studentMockData';
import { BadgeCheck } from 'lucide-react';

const StudentGradesPage: React.FC = () => {
  const terms = useMemo(() => Object.keys(studentGradesByTerm), []);
  const [term, setTerm] = useState<string>(terms[0] ?? 'Term 1');
  const rows = studentGradesByTerm[term] ?? [];

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
          <CardDescription>Read-only results for {term}</CardDescription>
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

