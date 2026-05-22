import React from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { BookOpen, ChevronRight, AlertTriangle, RefreshCw, User, MapPin } from 'lucide-react';
import studentService from '../../services/studentService';

const StudentClassesPage: React.FC = () => {
  const { t } = useTranslation();

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['student-courses'],
    queryFn: () => studentService.getCourses(),
    staleTime: 30_000
  });

  if (isError) {
    return (
      <div className="p-6 flex flex-col items-center justify-center min-h-[50vh] space-y-4">
        <div className="p-4 bg-red-50 dark:bg-red-950/20 rounded-full text-red-600 dark:text-red-400">
          <AlertTriangle className="h-12 w-12" />
        </div>
        <div className="text-center">
          <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100">
            {t('student.classes.error_loading')}
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            Could not fetch enrolled classes. Please try again.
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
        <div className="space-y-2">
          <div className="h-8 w-48 bg-slate-200 dark:bg-slate-800 rounded-lg"></div>
          <div className="h-4 w-64 bg-slate-200 dark:bg-slate-800 rounded-lg"></div>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-32 bg-slate-100 dark:bg-slate-800/50 border border-slate-200/50 dark:border-slate-800/50 rounded-2xl"></div>
          ))}
        </div>
      </div>
    );
  }

  const courses = data?.courses || [];

  return (
    <div className="p-4 sm:p-6 space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-slate-100 tracking-tight">
          {t('student.classes.title')}
        </h1>
        <p className="text-sm text-slate-600 dark:text-slate-400">
          {t('student_portal.dashboard.subtitle')}
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {courses.length > 0 ? (
          courses.map((c) => (
            <Link 
              key={c.id} 
              to={`/student/classes/${c.id}`} 
              className="block transform hover:-translate-y-0.5 transition-all duration-200"
            >
              <Card className="bg-white/60 dark:bg-slate-900/60 backdrop-blur-md border border-slate-200/50 dark:border-slate-800/50 shadow-sm hover:shadow-md h-full">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center justify-between text-slate-900 dark:text-slate-100">
                    <span className="flex items-center gap-2.5 font-bold text-base sm:text-lg">
                      <BookOpen className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                      {c.subject}
                    </span>
                    <ChevronRight className="h-4 w-4 text-slate-400" />
                  </CardTitle>
                  <CardDescription className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 text-xs text-slate-500 mt-1.5">
                    <span className="flex items-center gap-1">
                      <User className="h-3.5 w-3.5 text-slate-400" />
                      {c.teacher}
                    </span>
                    {c.room && c.room !== 'N/A' && (
                      <span className="flex items-center gap-1">
                        <MapPin className="h-3.5 w-3.5 text-slate-400" />
                        {c.room}
                      </span>
                    )}
                  </CardDescription>
                </CardHeader>
                <CardContent className="text-xs text-slate-600 dark:text-slate-400 border-t border-slate-100 dark:border-slate-800/60 pt-3">
                  {c.nextSession 
                    ? t('student.classes.next_session', { session: c.nextSession }) 
                    : t('student.classes.no_upcoming_session')}
                </CardContent>
              </Card>
            </Link>
          ))
        ) : (
          <div className="col-span-full text-center py-12 text-slate-500 border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl bg-slate-50/50 dark:bg-slate-900/20">
            {t('student.classes.no_upcoming_session')}
          </div>
        )}
      </div>
    </div>
  );
};

export default StudentClassesPage;
