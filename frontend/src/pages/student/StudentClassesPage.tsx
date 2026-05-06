import React from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { studentClasses } from './studentMockData';
import { BookOpen, ChevronRight } from 'lucide-react';

const StudentClassesPage: React.FC = () => {
  return (
    <div className="p-4 sm:p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">My Classes</h1>
        <p className="text-sm text-slate-600 dark:text-slate-400">Subjects you’re enrolled in</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {studentClasses.map((c) => (
          <Link key={c.id} to={`/student/classes/${c.id}`} className="block">
            <Card className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <BookOpen className="h-5 w-5 text-indigo-600" />
                    {c.subject}
                  </span>
                  <ChevronRight className="h-4 w-4 text-slate-400" />
                </CardTitle>
                <CardDescription>{c.teacher}{c.room ? ` • ${c.room}` : ''}</CardDescription>
              </CardHeader>
              <CardContent className="text-sm text-slate-600 dark:text-slate-400">
                {c.nextSession ? `Next session: ${c.nextSession}` : 'No upcoming session info'}
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
};

export default StudentClassesPage;

