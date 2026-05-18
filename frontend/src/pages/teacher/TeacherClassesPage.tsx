import React, { useMemo, useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { BookOpen, ChevronRight, Search, Loader2 } from 'lucide-react';
import teacherService from '../../services/teacherService';

const TeacherClassesPage: React.FC = () => {
  const [q, setQ] = useState('');
  const [classes, setClasses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    async function loadData() {
      try {
        setLoading(true);
        const profile = await teacherService.getOwnProfile();
        if (profile && active) {
          const res = await teacherService.getTeacherClasses(profile.id);
          if (active) {
            setClasses(res?.classes || []);
          }
        }
      } catch (err: any) {
        if (active) {
          setError(err.message || 'Failed to load classes.');
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }
    loadData();
    return () => { active = false; };
  }, []);

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();
    if (!query) return classes;
    return classes.filter((c) => {
      const className = c.name || '';
      const subject = c.grade_level_name || '';
      const term = c.academic_year || '';
      const hay = `${className} ${subject} ${term}`.toLowerCase();
      return hay.includes(query);
    });
  }, [q, classes]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 text-center text-red-600 dark:text-red-400">
        <p className="font-medium">{error}</p>
      </div>
    );
  }

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

      {filtered.length === 0 ? (
        <div className="text-center py-12 text-slate-500 dark:text-slate-400 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl">
          <BookOpen className="h-10 w-10 mx-auto text-slate-400 mb-3" />
          <p className="font-medium">No classes found</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {filtered.map((c) => (
            <Link key={c.id} to={`/teacher/classes/${c.id}`} className="block">
              <Card className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <BookOpen className="h-5 w-5 text-indigo-600" />
                      {c.grade_level_name || 'Class'} — {c.name}
                    </span>
                    <ChevronRight className="h-4 w-4 text-slate-400" />
                  </CardTitle>
                  <CardDescription>
                    {c.academic_year || '—'}{c.room ? ` • ${c.room}` : ''} • {c.current_enrollment ?? 0} student(s)
                  </CardDescription>
                </CardHeader>
                <CardContent className="text-sm text-slate-600 dark:text-slate-400">
                  Open class workspace
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
};

export default TeacherClassesPage;

