import React, { useMemo, useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { BookOpen, ChevronRight, Search, Loader2, Calendar } from 'lucide-react';
import teacherService from '../../services/teacherService';

const TeacherClassesPage: React.FC = () => {
  const [q, setQ] = useState('');
  const [classes, setClasses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'active' | 'past'>('active');

  useEffect(() => {
    let active = true;
    async function loadData() {
      try {
        setLoading(true);
        const profile = await teacherService.getOwnProfile();
        if (profile && active) {
          const res = await teacherService.getTeacherClasses(profile.id, { status: activeTab as any });
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
  }, [activeTab]);

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
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100 bg-gradient-to-r from-indigo-500 to-indigo-600 bg-clip-text text-transparent">My Classes</h1>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">Manage and access your assigned educational classes</p>
        </div>
        <div className="relative w-full sm:w-80">
          <Search className="h-4 w-4 text-slate-400 absolute left-3 top-3" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search class or subject…"
            className="w-full h-10 pl-9 pr-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all outline-none text-sm"
          />
        </div>
      </div>

      {/* Tabs Container */}
      <div className="flex p-1 bg-slate-100 dark:bg-slate-800 rounded-xl max-w-md">
        <button
          onClick={() => setActiveTab('active')}
          className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${
            activeTab === 'active'
              ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
          }`}
        >
          Active Allocations
        </button>
        <button
          onClick={() => setActiveTab('past')}
          className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${
            activeTab === 'past'
              ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
          }`}
        >
          Subject Log
        </button>
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-16 text-slate-500 dark:text-slate-400 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl bg-slate-50/50 dark:bg-slate-900/50">
          <BookOpen className="h-12 w-12 mx-auto text-slate-400 mb-4 animate-pulse" />
          <h3 className="font-semibold text-lg text-slate-800 dark:text-slate-200">No classes found</h3>
          <p className="text-sm mt-1 text-slate-500">There are no classes in the {activeTab === 'active' ? 'Active Allocations' : 'Subject Log'} category.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {filtered.map((c) => (
            <Link key={c.id} to={`/teacher/classes/${c.id}`} className="block group">
              <Card className="hover:shadow-lg hover:border-indigo-500/50 dark:hover:border-indigo-400/50 transition-all duration-300 transform group-hover:-translate-y-1">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center justify-between text-base">
                    <span className="flex items-center gap-3">
                      <div className="p-2 bg-indigo-50 dark:bg-indigo-900/30 rounded-lg text-indigo-600 dark:text-indigo-400">
                        <BookOpen className="h-5 w-5" />
                      </div>
                      <span className="font-bold text-slate-900 dark:text-slate-100">
                        {c.grade_level_name || 'Class'} — {c.name}
                      </span>
                    </span>
                    <ChevronRight className="h-5 w-5 text-slate-400 group-hover:text-indigo-500 dark:group-hover:text-indigo-400 transition-colors" />
                  </CardTitle>
                  <CardDescription className="flex items-center gap-2 mt-2">
                    <Calendar className="h-4 w-4 text-slate-400" />
                    <span>{c.academic_year || '—'}{c.room ? ` • ${c.room}` : ''} • {c.current_enrollment ?? 0} student(s)</span>
                  </CardDescription>
                </CardHeader>
                <CardContent className="text-sm text-slate-600 dark:text-slate-400 pt-1">
                  Click to open interactive class workspace and view resources, grades, and schedules.
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

