import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { studentAssignments, studentClasses } from './studentMockData';
import { Badge } from '../../components/ui/badge';
import { ClipboardList, ChevronRight } from 'lucide-react';

type Filter = 'all' | 'open' | 'submitted' | 'graded';

const statusToBadgeVariant = (status: string) => {
  if (status === 'open') return 'default';
  if (status === 'submitted') return 'secondary';
  return 'outline';
};

const StudentAssignmentsPage: React.FC = () => {
  const [filter, setFilter] = useState<Filter>('all');

  const items = useMemo(() => {
    if (filter === 'all') return studentAssignments;
    return studentAssignments.filter((a) => a.status === filter);
  }, [filter]);

  const classNameById = useMemo(() => {
    const m = new Map<string, string>();
    for (const c of studentClasses) m.set(c.id, c.subject);
    return m;
  }, []);

  return (
    <div className="p-4 sm:p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Assignments</h1>
          <p className="text-sm text-slate-600 dark:text-slate-400">Track deadlines and submission status</p>
        </div>
        <div className="flex gap-2">
          {(['all', 'open', 'submitted', 'graded'] as const).map((f) => (
            <button
              key={f}
              className={`px-3 py-1.5 rounded-lg text-sm border ${filter === f ? 'bg-indigo-600 text-white border-indigo-600' : 'border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'}`}
              onClick={() => setFilter(f)}
            >
              {f === 'all' ? 'All' : f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {items.map((a) => (
          <Link key={a.id} to={`/student/assignments/${a.id}`} className="block">
            <Card className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <ClipboardList className="h-5 w-5 text-indigo-600" />
                    {a.title}
                  </span>
                  <ChevronRight className="h-4 w-4 text-slate-400" />
                </CardTitle>
                <CardDescription>
                  {classNameById.get(a.classId) ?? 'Class'} • Due {new Date(a.dueAt).toLocaleString()}
                </CardDescription>
              </CardHeader>
              <CardContent className="flex items-center justify-between">
                <div className="text-sm text-slate-600 dark:text-slate-400 line-clamp-1">{a.description}</div>
                <Badge variant={statusToBadgeVariant(a.status)} className="ml-3">{a.status}</Badge>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
};

export default StudentAssignmentsPage;

