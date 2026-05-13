import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { teacherClasses } from './teacherMockData';
import { BookOpen, ChevronRight, Search } from 'lucide-react';

const TeacherClassesPage: React.FC = () => {
  const [q, setQ] = useState('');
  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();
    if (!query) return teacherClasses;
    return teacherClasses.filter((c) => {
      const hay = `${c.className} ${c.subject} ${c.term ?? ''}`.toLowerCase();
      return hay.includes(query);
    });
  }, [q]);

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
        {filtered.map((c) => (
          <Link key={c.id} to={`/teacher/classes/${c.id}`} className="block">
            <Card className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <BookOpen className="h-5 w-5 text-indigo-600" />
                    {c.subject} — {c.className}
                  </span>
                  <ChevronRight className="h-4 w-4 text-slate-400" />
                </CardTitle>
                <CardDescription>
                  {c.term ?? '—'}{c.room ? ` • ${c.room}` : ''} • {c.roster.length} student(s)
                </CardDescription>
              </CardHeader>
              <CardContent className="text-sm text-slate-600 dark:text-slate-400">
                Open class workspace
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
};

export default TeacherClassesPage;

