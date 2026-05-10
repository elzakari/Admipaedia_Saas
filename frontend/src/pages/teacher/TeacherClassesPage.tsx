import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { BookOpen, ChevronRight, Search } from 'lucide-react';
import teacherService from '../../services/teacherService';

const TeacherClassesPage: React.FC = () => {
  const [q, setQ] = useState('');

  const { data: teacher } = useQuery({
    queryKey: ['teacher-profile'],
    queryFn: () => teacherService.getOwnProfile(),
    staleTime: 60_000
  });

  const teacherId = (teacher as any)?.id;

  const { data, isLoading, error } = useQuery({
    queryKey: ['teacher-classes', teacherId],
    queryFn: () => teacherService.getTeacherClasses(Number(teacherId), { page: 1, per_page: 50 }),
    enabled: !!teacherId,
    staleTime: 60_000
  });

  const classes = useMemo(() => (data as any)?.classes || [], [data]);

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();
    if (!query) return classes;
    return classes.filter((c: any) => {
      const hay = `${c.name ?? ''} ${c.academic_year ?? ''} ${c.status ?? ''}`.toLowerCase();
      return hay.includes(query);
    });
  }, [classes, q]);

  return (
    <div className="p-4 sm:p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">My Classes</h1>
          <p className="text-sm text-slate-600 dark:text-slate-400">Only classes assigned to you</p>
        </div>
        <div className="relative w-full sm:w-80">
          <Search className="h-4 w-4 text-slate-400 absolute left-3 top-3" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search class or subject…"
            className="w-full h-10 pl-9 pr-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {isLoading ? (
          <div className="text-sm text-slate-600">Loading…</div>
        ) : error ? (
          <div className="text-sm text-slate-600">Failed to load classes.</div>
        ) : (
          filtered.map((c: any) => (
            <Link key={c.id} to={`/teacher/classes/${c.id}`} className="block">
            <Card className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <BookOpen className="h-5 w-5 text-indigo-600" />
                    {c.name}
                  </span>
                  <ChevronRight className="h-4 w-4 text-slate-400" />
                </CardTitle>
                <CardDescription>
                  {c.academic_year ?? '—'}{c.status ? ` • ${c.status}` : ''}
                </CardDescription>
              </CardHeader>
              <CardContent className="text-sm text-slate-600 dark:text-slate-400">
                Open class workspace
              </CardContent>
            </Card>
          </Link>
          ))
        )}
      </div>
    </div>
  );
};

export default TeacherClassesPage;

