import React, { useMemo } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { AlertTriangle, BookOpen, ChevronRight, CheckCircle2, ClipboardCheck, Link as LinkIcon, Megaphone, FileText } from 'lucide-react';
import { Badge } from '../../components/ui/badge';
import studentService from '../../services/studentService';

const StudentClassDetailPage: React.FC = () => {
  const { classId } = useParams();
  const subjectId = Number(classId);

  const { data: courseData } = useQuery({
    queryKey: ['student-courses', 'detail'],
    queryFn: () => studentService.getCourses(),
    staleTime: 30_000
  });

  const { data: lessons = [], isLoading } = useQuery({
    queryKey: ['student-subject-lessons', subjectId],
    queryFn: () => studentService.getSubjectLessons(subjectId),
    enabled: Number.isFinite(subjectId) && subjectId > 0,
    staleTime: 30_000
  });

  const cls = useMemo(
    () => (courseData?.courses || []).find((course) => Number(course.id) === subjectId) ?? null,
    [courseData, subjectId]
  );

  if (!cls) {
    return (
      <div className="p-6">
        <Card>
          <CardHeader>
            <CardTitle>Classe introuvable</CardTitle>
            <CardDescription>La classe demandée n'est pas disponible.</CardDescription>
          </CardHeader>
          <CardContent>
            <Link to="/student/classes" className="text-indigo-600 hover:text-indigo-700">Retour à Mes classes</Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 space-y-6">
      <div className="flex items-center text-sm text-indigo-700">
        <Link to="/student/classes" className="hover:text-indigo-900">Mes classes</Link>
        <ChevronRight className="h-4 w-4 mx-2" />
        <span className="font-medium text-indigo-900">{cls.subject}</span>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{cls.subject}</CardTitle>
          <CardDescription>{cls.teacher}{cls.room ? ` • ${cls.room}` : ''}</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="lessons">
            <TabsList className="grid grid-cols-2 max-w-sm">
              <TabsTrigger value="lessons">Leçons quotidiennes</TabsTrigger>
              <TabsTrigger value="catchup">Rattrapage</TabsTrigger>
            </TabsList>

            <TabsContent value="lessons" className="mt-4">
              {isLoading ? (
                <div className="text-sm text-slate-600 dark:text-slate-400">Chargement de l'historique des leçons...</div>
              ) : (
                <div className="space-y-3">
                  {lessons.length === 0 ? (
                    <div className="text-sm text-slate-600 dark:text-slate-400">Aucune leçon quotidienne n'a encore été partagée pour cette matière.</div>
                  ) : (
                    lessons.map((lesson) => (
                      <div key={lesson.id} className="rounded-lg border border-slate-200 dark:border-slate-700 p-4 space-y-3">
                        <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                          <div>
                            <div className="flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-slate-100">
                              <FileText className="h-4 w-4 text-indigo-600" />
                              {lesson.title}
                            </div>
                            <div className="mt-1 text-xs text-slate-500">{lesson.date}</div>
                          </div>
                          {lesson.was_absent ? (
                            <Badge variant="destructive" className="w-fit">Vous étiez absent(e)</Badge>
                          ) : (
                            <Badge variant="secondary" className="w-fit">{lesson.status}</Badge>
                          )}
                        </div>

                        {lesson.description ? (
                          <p className="text-sm text-slate-700 dark:text-slate-300">{lesson.description}</p>
                        ) : null}

                        {lesson.objectives ? (
                          <div className="rounded-md bg-slate-50 dark:bg-slate-800 p-3 text-sm">
                            <div className="font-medium text-slate-900 dark:text-slate-100">Objectifs</div>
                            <div className="mt-1 whitespace-pre-wrap text-slate-600 dark:text-slate-300">{lesson.objectives}</div>
                          </div>
                        ) : null}

                        {lesson.classwork ? (
                          <div className="rounded-md bg-slate-50 dark:bg-slate-800 p-3 text-sm">
                            <div className="flex items-center gap-2 font-medium text-slate-900 dark:text-slate-100">
                              <ClipboardCheck className="h-4 w-4 text-indigo-600" />
                              Travail en classe
                            </div>
                            <div className="mt-1 whitespace-pre-wrap text-slate-600 dark:text-slate-300">{lesson.classwork}</div>
                          </div>
                        ) : null}

                        {lesson.homework ? (
                          <div className="rounded-md bg-amber-50 dark:bg-amber-950/30 p-3 text-sm">
                            <div className="flex items-center gap-2 font-medium text-amber-900 dark:text-amber-200">
                              <CheckCircle2 className="h-4 w-4" />
                              Devoirs
                            </div>
                            <div className="mt-1 whitespace-pre-wrap text-amber-800 dark:text-amber-100">{lesson.homework}</div>
                          </div>
                        ) : null}

                        {lesson.notes ? (
                          <div className="rounded-md bg-indigo-50 dark:bg-indigo-950/30 p-3 text-sm">
                            <div className="font-medium text-indigo-900 dark:text-indigo-100">Notes de rattrapage</div>
                            <div className="mt-1 whitespace-pre-wrap text-indigo-800 dark:text-indigo-100">{lesson.notes}</div>
                          </div>
                        ) : null}

                        {Array.isArray(lesson.resources) && lesson.resources.length > 0 ? (
                          <div className="space-y-1">
                            {lesson.resources.map((resource) => (
                              <a
                                key={resource}
                                href={resource}
                                target="_blank"
                                rel="noreferrer"
                                className="flex items-center gap-2 text-sm text-indigo-600 hover:underline"
                              >
                                <LinkIcon className="h-4 w-4" />
                                {resource}
                              </a>
                            ))}
                          </div>
                        ) : null}
                      </div>
                    ))
                  )}
                </div>
              )}
            </TabsContent>

            <TabsContent value="catchup" className="mt-4">
              <div className="space-y-3">
                {lessons.filter((lesson) => lesson.was_absent).length === 0 ? (
                  <div className="text-sm text-slate-600 dark:text-slate-400">Aucun journal de leçon manquée n'a été détecté pour cette matière.</div>
                ) : (
                  lessons.filter((lesson) => lesson.was_absent).map((lesson) => (
                    <div key={lesson.id} className="rounded-lg border border-amber-200 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-900 p-4">
                      <div className="flex items-center gap-2 font-semibold text-amber-900 dark:text-amber-100">
                        <AlertTriangle className="h-4 w-4" />
                        {lesson.title}
                      </div>
                      <div className="mt-1 text-xs text-amber-700 dark:text-amber-200">{lesson.date}</div>
                      <div className="mt-3 space-y-2 text-sm text-amber-900 dark:text-amber-50">
                        {lesson.description ? <p>{lesson.description}</p> : null}
                        {lesson.classwork ? <p><span className="font-medium">Travail en classe :</span> {lesson.classwork}</p> : null}
                        {lesson.homework ? <p><span className="font-medium">Devoirs :</span> {lesson.homework}</p> : null}
                        {lesson.notes ? <p><span className="font-medium">Rattrapage :</span> {lesson.notes}</p> : null}
                      </div>
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
