import React, { useMemo } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { studentClasses } from './studentMockData';
import { ChevronRight, FileText, Link as LinkIcon, Megaphone } from 'lucide-react';

const StudentClassDetailPage: React.FC = () => {
  const { classId } = useParams();

  const cls = useMemo(() => studentClasses.find((c) => c.id === classId) ?? null, [classId]);

  if (!cls) {
    return (
      <div className="p-6">
        <Card>
          <CardHeader>
            <CardTitle>Class not found</CardTitle>
            <CardDescription>The class you requested isn’t available.</CardDescription>
          </CardHeader>
          <CardContent>
            <Link to="/student/classes" className="text-indigo-600 hover:text-indigo-700">Back to My Classes</Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 space-y-6">
      <div className="flex items-center text-sm text-indigo-700">
        <Link to="/student/classes" className="hover:text-indigo-900">My Classes</Link>
        <ChevronRight className="h-4 w-4 mx-2" />
        <span className="font-medium text-indigo-900">{cls.subject}</span>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{cls.subject}</CardTitle>
          <CardDescription>{cls.teacher}{cls.room ? ` • ${cls.room}` : ''}</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="materials">
            <TabsList className="grid grid-cols-2 max-w-sm">
              <TabsTrigger value="materials">Materials</TabsTrigger>
              <TabsTrigger value="announcements">Announcements</TabsTrigger>
            </TabsList>

            <TabsContent value="materials" className="mt-4">
              <div className="space-y-3">
                {cls.materials.length === 0 ? (
                  <div className="text-sm text-slate-600 dark:text-slate-400">No materials shared yet.</div>
                ) : (
                  cls.materials.map((m) => (
                    <a
                      key={m.id}
                      href={m.href}
                      target="_blank"
                      rel="noreferrer"
                      className="block rounded-lg border border-slate-200 dark:border-slate-700 p-3 hover:bg-slate-50 dark:hover:bg-slate-800"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-slate-100">
                          {m.kind === 'pdf' ? <FileText className="h-4 w-4" /> : <LinkIcon className="h-4 w-4" />}
                          {m.title}
                        </div>
                        <ChevronRight className="h-4 w-4 text-slate-400" />
                      </div>
                    </a>
                  ))
                )}
              </div>
            </TabsContent>

            <TabsContent value="announcements" className="mt-4">
              <div className="space-y-3">
                {cls.announcements.length === 0 ? (
                  <div className="text-sm text-slate-600 dark:text-slate-400">No announcements for this class.</div>
                ) : (
                  cls.announcements.map((a) => (
                    <div key={a.id} className="rounded-lg border border-slate-200 dark:border-slate-700 p-3">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-slate-100">
                            <Megaphone className="h-4 w-4 text-indigo-600" />
                            {a.title}
                          </div>
                          <div className="text-xs text-slate-500 mt-1">{a.createdAt}</div>
                        </div>
                      </div>
                      <div className="text-sm text-slate-700 dark:text-slate-300 mt-2">{a.body}</div>
                    </div>
                  ))
                )}
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

export default StudentClassDetailPage;

