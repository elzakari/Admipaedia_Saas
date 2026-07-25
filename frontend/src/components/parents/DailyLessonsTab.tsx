import { useMemo, useState } from "react";
import { AlertTriangle, BookOpen, Calendar, CheckCircle2, ClipboardCheck, Link as LinkIcon } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";

interface DailyLessonsTabProps {
  lessons: any[];
}

export default function DailyLessonsTab({ lessons }: DailyLessonsTabProps) {
  const [showAbsenceOnly, setShowAbsenceOnly] = useState(false);

  const visibleLessons = useMemo(() => {
    if (!showAbsenceOnly) return lessons;
    return lessons.filter((lesson) => lesson.child_was_absent);
  }, [lessons, showAbsenceOnly]);

  const missedCount = useMemo(
    () => lessons.filter((lesson) => lesson.child_was_absent).length,
    [lessons]
  );

  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="glass-card">
          <CardContent className="p-4">
            <div className="text-sm text-indigo-700">Recent Lesson Logs</div>
            <div className="mt-2 text-2xl font-bold text-indigo-900">{lessons.length}</div>
          </CardContent>
        </Card>
        <Card className="glass-card">
          <CardContent className="p-4">
            <div className="text-sm text-indigo-700">Missed While Absent</div>
            <div className="mt-2 text-2xl font-bold text-amber-700">{missedCount}</div>
          </CardContent>
        </Card>
        <Card className="glass-card">
          <CardContent className="flex h-full items-center justify-between p-4">
            <div>
              <div className="text-sm text-indigo-700">Catch-up Filter</div>
              <div className="text-xs text-slate-500 mt-1">Focus on lesson logs your child likely missed.</div>
            </div>
            <Button variant={showAbsenceOnly ? "default" : "outline"} onClick={() => setShowAbsenceOnly((prev) => !prev)}>
              {showAbsenceOnly ? "Show All" : "Show Missed"}
            </Button>
          </CardContent>
        </Card>
      </div>

      {visibleLessons.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-200 bg-white/50 p-8 text-center text-sm text-slate-500">
          No daily lesson logs are available for the current selection.
        </div>
      ) : (
        <div className="space-y-4">
          {visibleLessons.map((lesson) => (
            <Card key={lesson.id} className="glass-card">
              <CardHeader className="pb-3">
                <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <BookOpen className="h-5 w-5 text-indigo-600" />
                      {lesson.title}
                    </CardTitle>
                    <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                      <Badge variant="outline">{lesson.subject_name || "General"}</Badge>
                      <span className="inline-flex items-center gap-1">
                        <Calendar className="h-3.5 w-3.5" />
                        {lesson.date}
                      </span>
                      {lesson.teacher_name ? <span>{lesson.teacher_name}</span> : null}
                    </div>
                  </div>
                  {lesson.child_was_absent ? (
                    <Badge variant="destructive" className="gap-1">
                      <AlertTriangle className="h-3.5 w-3.5" />
                      Missed while absent
                    </Badge>
                  ) : (
                    <Badge variant="secondary" className="gap-1">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      Shared for home support
                    </Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {lesson.description ? <p className="text-sm text-slate-700">{lesson.description}</p> : null}

                {lesson.objectives ? (
                  <div className="rounded-lg bg-slate-50 p-3 text-sm">
                    <div className="font-medium text-slate-900">Learning Objectives</div>
                    <div className="mt-1 whitespace-pre-wrap text-slate-600">{lesson.objectives}</div>
                  </div>
                ) : null}

                {lesson.classwork ? (
                  <div className="rounded-lg bg-slate-50 p-3 text-sm">
                    <div className="flex items-center gap-2 font-medium text-slate-900">
                      <ClipboardCheck className="h-4 w-4 text-indigo-600" />
                      Classwork
                    </div>
                    <div className="mt-1 whitespace-pre-wrap text-slate-600">{lesson.classwork}</div>
                  </div>
                ) : null}

                {lesson.homework ? (
                  <div className="rounded-lg bg-amber-50 p-3 text-sm">
                    <div className="font-medium text-amber-900">Homework / Practice</div>
                    <div className="mt-1 whitespace-pre-wrap text-amber-800">{lesson.homework}</div>
                  </div>
                ) : null}

                {lesson.notes ? (
                  <div className="rounded-lg bg-indigo-50 p-3 text-sm">
                    <div className="font-medium text-indigo-900">Parent Support Notes</div>
                    <div className="mt-1 whitespace-pre-wrap text-indigo-800">{lesson.notes}</div>
                  </div>
                ) : null}

                {Array.isArray(lesson.resources) && lesson.resources.length > 0 ? (
                  <div className="space-y-2">
                    <div className="text-sm font-medium text-slate-900">Resources</div>
                    {lesson.resources.map((resource: string) => (
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
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
