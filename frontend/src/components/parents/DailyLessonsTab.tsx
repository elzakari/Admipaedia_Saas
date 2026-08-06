import { useMemo, useRef, useState } from "react";
import {
  BookOpen,
  Calendar,
  Clock,
  ExternalLink,
  Home,
  Radio,
  AlertTriangle,
  CheckCircle2,
  User,
  Users,
  BarChart3,
  XCircle,
  Send,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import { Separator } from "../ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";
import { Progress } from "../ui/progress";
import { cn, getInitials, formatDate } from "../../lib/utils";
import type { LessonDetailViewerHandle } from "./LessonDetailViewer";
import LessonDetailViewer from "./LessonDetailViewer";

export interface Child {
  id: string;
  name: string;
  className?: string;
}

export interface LessonResource {
  id: string;
  title: string;
  url: string;
  type: "link" | "pdf" | "video" | "document";
}

export interface LessonComment {
  id: string;
  userId: string;
  userName: string;
  userRole: "parent" | "student" | "teacher";
  content: string;
  reaction?: "thumbsup" | "happy" | "question" | "thinking";
  timestamp: string;
}

export interface LessonAcknowledgement {
  id: string;
  userId: string;
  userName: string;
  role: "parent" | "student";
  timestamp: string;
}

export type HomeworkStatus = 'not-set' | 'pending' | 'submitted' | 'graded' | 'overdue';

export interface Lesson {
  id: string;
  title: string;
  subject: string;
  subjectColor?: string;
  date: string;
  startTime?: string;
  endTime?: string;
  teacherName?: string;
  teacherAvatar?: string;
  className?: string;
  description?: string;
  objectives?: string;
  classwork?: string;
  resources?: LessonResource[];
  assessment?: string;
  homework?: string;
  homeworkDueDate?: string;
  homeworkStatus?: HomeworkStatus;
  homeworkGrade?: number;
  homeworkFeedback?: string;
  homeworkSubmittedAt?: string;
  homeworkGradedAt?: string;
  notes?: string;
  isLive?: boolean;
  liveViewerCount?: number;
  childWasAbsent?: boolean;
  childId?: string;
  comments?: LessonComment[];
  acknowledgements?: LessonAcknowledgement[];
}

interface DailyLessonsTabProps {
  lessons: Lesson[];
  viewerRole: "parent" | "student";
  childIds?: Child[];
  selectedChildId?: string;
  onChildChange?: (childId: string) => void;
  onAcknowledge?: (lessonId: string, role: "parent" | "student") => void;
}

const SUBJECT_COLORS: Record<string, string> = {
  Mathematics: "bg-blue-500",
  English: "bg-purple-500",
  Science: "bg-green-500",
  "Social Studies": "bg-amber-500",
  "Creative Arts": "bg-pink-500",
  ICT: "bg-cyan-500",
  "Physical Education": "bg-orange-500",
  French: "bg-rose-500",
  "Religious Education": "bg-indigo-500",
  General: "bg-slate-500",
};

function getSubjectColor(subject: string): string {
  return SUBJECT_COLORS[subject] || SUBJECT_COLORS.General;
}

function isHomeworkDueSoon(lesson: Lesson): boolean {
  if (!lesson.homework || !lesson.homeworkDueDate) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const dueDate = new Date(lesson.homeworkDueDate);
  dueDate.setHours(0, 0, 0, 0);
  const diffTime = dueDate.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays >= 0 && diffDays <= 5;
}

function groupLessonsByDate(lessons: Lesson[]): Record<string, Lesson[]> {
  const groups: Record<string, Lesson[]> = {};
  for (const lesson of lessons) {
    const dateKey = lesson.date;
    if (!groups[dateKey]) {
      groups[dateKey] = [];
    }
    groups[dateKey].push(lesson);
  }
  const sortedKeys = Object.keys(groups).sort((a, b) => {
    return new Date(b).getTime() - new Date(a).getTime();
  });
  const result: Record<string, Lesson[]> = {};
  for (const key of sortedKeys) {
    result[key] = groups[key].sort((a, b) => {
      if (!a.startTime || !b.startTime) return 0;
      return a.startTime.localeCompare(b.startTime);
    });
  }
  return result;
}

export default function DailyLessonsTab({
  lessons,
  viewerRole,
  childIds = [],
  selectedChildId,
  onChildChange,
  onAcknowledge,
}: DailyLessonsTabProps) {
  const [activeChildId, setActiveChildId] = useState<string | undefined>(
    selectedChildId || (childIds.length > 0 ? childIds[0].id : undefined)
  );
  const detailViewerRef = useRef<LessonDetailViewerHandle>(null);

  const handleChildChange = (childId: string) => {
    setActiveChildId(childId);
    onChildChange?.(childId);
  };

  const filteredLessons = useMemo(() => {
    if (viewerRole === "parent" && activeChildId) {
      return lessons.filter((l) => l.childId === activeChildId);
    }
    return lessons;
  }, [lessons, viewerRole, activeChildId]);

  const homeworkDueSoon = useMemo(() => {
    return filteredLessons.filter(isHomeworkDueSoon).sort((a, b) => {
      if (!a.homeworkDueDate || !b.homeworkDueDate) return 0;
      return (
        new Date(a.homeworkDueDate).getTime() -
        new Date(b.homeworkDueDate).getTime()
      );
    });
  }, [filteredLessons]);

  const groupedLessons = useMemo(
    () => groupLessonsByDate(filteredLessons),
    [filteredLessons]
  );

  const scrollToLesson = (lessonId: string) => {
    const el = document.getElementById(`lesson-${lessonId}`);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      el.classList.add("ring-2", "ring-indigo-500", "ring-offset-2");
      setTimeout(() => {
        el.classList.remove(
          "ring-2",
          "ring-indigo-500",
          "ring-offset-2"
        );
      }, 2000);
    }
  };

  const openLessonDetail = (lesson: Lesson) => {
    detailViewerRef.current?.open(lesson);
  };

  const missedCount = useMemo(
    () => filteredLessons.filter((l) => l.childWasAbsent).length,
    [filteredLessons]
  );

  const liveLessons = useMemo(
    () => filteredLessons.filter((l) => l.isLive),
    [filteredLessons]
  );

  const lessonsWithHomework = useMemo(
    () => filteredLessons.filter((l) => l.homework),
    [filteredLessons]
  );

  const homeworkStats = useMemo(() => {
    const total = lessonsWithHomework.length;
    const submitted = lessonsWithHomework.filter((l) =>
      l.homeworkStatus === 'submitted' || l.homeworkStatus === 'graded'
    ).length;
    const graded = lessonsWithHomework.filter((l) => l.homeworkStatus === 'graded').length;
    const overdue = lessonsWithHomework.filter((l) => l.homeworkStatus === 'overdue').length;
    const pending = lessonsWithHomework.filter((l) => l.homeworkStatus === 'pending').length;
    const completionPct = total > 0 ? Math.round((submitted / total) * 100) : 0;
    const avgGrade = graded > 0
      ? Math.round(
          lessonsWithHomework
            .filter((l) => typeof l.homeworkGrade === 'number')
            .reduce((sum, l) => sum + (l.homeworkGrade || 0), 0) / graded
        )
      : null;
    return { total, submitted, graded, overdue, pending, completionPct, avgGrade };
  }, [lessonsWithHomework]);

  function getHomeworkStatusVariant(status?: HomeworkStatus): 'default' | 'secondary' | 'outline' | 'destructive' | 'success' | 'warning' {
    switch (status) {
      case 'graded': return 'success';
      case 'submitted': return 'secondary';
      case 'overdue': return 'destructive';
      case 'pending': return 'warning';
      default: return 'outline';
    }
  }

  function getHomeworkStatusText(status?: HomeworkStatus): string {
    switch (status) {
      case 'graded': return 'Graded';
      case 'submitted': return 'Submitted';
      case 'overdue': return 'Overdue';
      case 'pending': return 'Pending';
      case 'not-set': return 'Not assigned';
      default: return '—';
    }
  }

  const HomeworkStatusBadge = ({ status, grade }: { status?: HomeworkStatus; grade?: number }) => (
    <Badge variant={getHomeworkStatusVariant(status) as any} className="gap-1 text-[10px] h-5 px-2">
      {status === 'graded' && grade !== undefined && typeof grade === 'number' ? (
        <>
          <CheckCircle2 className="h-3 w-3" />
          Graded: {grade}%
        </>
      ) : status === 'submitted' ? (
        <>
          <Send className="h-3 w-3" />
          Submitted
        </>
      ) : status === 'overdue' ? (
        <>
          <XCircle className="h-3 w-3" />
          Overdue
        </>
      ) : status === 'pending' ? (
        <>
          <Clock className="h-3 w-3" />
          Pending
        </>
      ) : (
        getHomeworkStatusText(status)
      )}
    </Badge>
  );

  return (
    <div className="space-y-6">
      {viewerRole === "parent" && childIds.length > 0 && (
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100">
              Daily Lessons
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Select a child to view their lessons
            </p>
          </div>
          <div className="w-full sm:w-72">
            <Select
              value={activeChildId}
              onValueChange={handleChildChange}
            >
              <SelectTrigger>
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-slate-500" />
                  <SelectValue placeholder="Select child" />
                </div>
              </SelectTrigger>
              <SelectContent>
                {childIds.map((child) => (
                  <SelectItem key={child.id} value={child.id}>
                    <div className="flex flex-col">
                      <span className="font-medium">{child.name}</span>
                      {child.className && (
                        <span className="text-xs text-slate-500">
                          {child.className}
                        </span>
                      )}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      )}

      {viewerRole === "student" && (
        <div>
          <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100">
            My Daily Lessons
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            View lessons, homework, and resources
          </p>
        </div>
      )}

      <Tabs defaultValue="lessons" className="w-full">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="lessons" className="gap-1.5">
            <BookOpen className="h-4 w-4" />
            Lessons
          </TabsTrigger>
          <TabsTrigger value="homework" className="gap-1.5">
            <Home className="h-4 w-4" />
            Homework
            {lessonsWithHomework.length > 0 && (
              <Badge variant={homeworkStats.overdue > 0 ? 'destructive' : 'secondary'} className="ml-1 h-4 px-1.5 text-[9px]">
                {lessonsWithHomework.length}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="lessons" className="mt-6 space-y-6">

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="bg-gradient-to-br from-indigo-50 to-white dark:from-indigo-950/30 dark:bg-slate-900">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-indigo-700 dark:text-indigo-300">
                  Total Lessons
                </div>
                <div className="mt-1 text-2xl font-bold text-indigo-900 dark:text-indigo-100">
                  {filteredLessons.length}
                </div>
              </div>
              <div className="h-12 w-12 rounded-full bg-indigo-100 dark:bg-indigo-900/50 flex items-center justify-center">
                <BookOpen className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-amber-50 to-white dark:from-amber-950/30 dark:bg-slate-900">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-amber-700 dark:text-amber-300">
                  Missed (Absent)
                </div>
                <div className="mt-1 text-2xl font-bold text-amber-900 dark:text-amber-100">
                  {missedCount}
                </div>
              </div>
              <div className="h-12 w-12 rounded-full bg-amber-100 dark:bg-amber-900/50 flex items-center justify-center">
                <AlertTriangle className="h-6 w-6 text-amber-600 dark:text-amber-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-rose-50 to-white dark:from-rose-950/30 dark:bg-slate-900">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-rose-700 dark:text-rose-300">
                  Live Broadcasts
                </div>
                <div className="mt-1 text-2xl font-bold text-rose-900 dark:text-rose-100">
                  {liveLessons.length}
                </div>
              </div>
              <div className="h-12 w-12 rounded-full bg-rose-100 dark:bg-rose-900/50 flex items-center justify-center">
                <Radio className="h-6 w-6 text-rose-600 dark:text-rose-400" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {homeworkDueSoon.length > 0 && (
        <Card className="border-amber-200 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-950/20">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Home className="h-5 w-5 text-amber-600 dark:text-amber-400" />
              <CardTitle className="text-lg font-semibold text-amber-900 dark:text-amber-100">
                Homework Due Soon
              </CardTitle>
              <Badge variant="warning" className="ml-auto">
                {homeworkDueSoon.length} item{homeworkDueSoon.length !== 1 ? "s" : ""}
              </Badge>
            </div>
            <p className="text-sm text-amber-700 dark:text-amber-300">
              Homework due in the next 5 days
            </p>
          </CardHeader>
          <CardContent>
            <div className="flex gap-3 overflow-x-auto pb-2 -mx-1 px-1 snap-x">
              {homeworkDueSoon.map((lesson) => {
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                const dueDate = new Date(lesson.homeworkDueDate!);
                dueDate.setHours(0, 0, 0, 0);
                const daysLeft = Math.ceil(
                  (dueDate.getTime() - today.getTime()) /
                    (1000 * 60 * 60 * 24)
                );
                const isUrgent = daysLeft <= 1;
                return (
                  <button
                    key={lesson.id}
                    onClick={() => scrollToLesson(lesson.id)}
                    className="flex-shrink-0 w-64 snap-start text-left p-4 rounded-xl border bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-amber-400 dark:hover:border-amber-600 hover:shadow-md transition-all group"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <div
                          className={cn(
                            "h-2.5 w-2.5 rounded-full flex-shrink-0",
                            getSubjectColor(lesson.subject)
                          )}
                        />
                        <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                          {lesson.subject}
                        </span>
                      </div>
                      <Badge
                        variant={isUrgent ? "destructive" : "warning"}
                        className="text-[10px] px-2 py-0"
                      >
                        {daysLeft === 0
                          ? "Today"
                          : daysLeft === 1
                          ? "Tomorrow"
                          : `${daysLeft} days`}
                      </Badge>
                    </div>
                    <h4 className="mt-2 font-semibold text-slate-900 dark:text-slate-100 text-sm line-clamp-2 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                      {lesson.title}
                    </h4>
                    <p className="mt-2 text-xs text-slate-600 dark:text-slate-300 line-clamp-2">
                      {lesson.homework}
                    </p>
                    <div className="mt-3 flex items-center gap-1 text-xs text-indigo-600 dark:text-indigo-400 font-medium">
                      <span>Jump to lesson</span>
                      <ExternalLink className="h-3 w-3 transition-transform group-hover:translate-x-0.5" />
                    </div>
                  </button>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="space-y-8">
        {Object.entries(groupedLessons).length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-200 dark:border-slate-700 bg-white/50 dark:bg-slate-900/50 p-12 text-center">
            <BookOpen className="h-12 w-12 mx-auto text-slate-300 dark:text-slate-600 mb-4" />
            <h3 className="text-lg font-medium text-slate-900 dark:text-slate-100">
              No lessons yet
            </h3>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              {viewerRole === "parent"
                ? "No lessons available for the selected child."
                : "No lessons available yet."}
            </p>
          </div>
        ) : (
          Object.entries(groupedLessons).map(([date, dateLessons]) => (
            <div key={date} className="relative">
              <div className="flex items-center gap-4 mb-4">
                <div className="flex items-center gap-2">
                  <div className="h-10 w-10 rounded-full bg-indigo-100 dark:bg-indigo-900/50 flex items-center justify-center">
                    <Calendar className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-900 dark:text-slate-100">
                      {formatDate(date, {
                        weekday: "long",
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      })}
                    </h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                      {dateLessons.length} lesson
                      {dateLessons.length !== 1 ? "s" : ""}
                    </p>
                  </div>
                </div>
                <Separator className="flex-1" />
              </div>

              <div className="ml-5 pl-6 border-l-2 border-slate-200 dark:border-slate-700 space-y-4 relative">
                {dateLessons.map((lesson) => (
                  <div
                    key={lesson.id}
                    id={`lesson-${lesson.id}`}
                    className="relative transition-all duration-300"
                  >
                    <div className="absolute -left-[33px] top-6 z-10">
                      <div
                        className={cn(
                          "h-4 w-4 rounded-full border-4 border-white dark:border-slate-950 shadow-sm",
                          getSubjectColor(lesson.subject),
                          lesson.isLive && "animate-pulse ring-2 ring-rose-400"
                        )}
                      />
                    </div>

                    <Card
                      className={cn(
                        "overflow-hidden transition-all hover:shadow-md",
                        lesson.childWasAbsent &&
                          "border-2 border-amber-400 dark:border-amber-600 bg-amber-50/30 dark:bg-amber-950/10"
                      )}
                    >
                      {lesson.isLive && (
                        <div className="bg-gradient-to-r from-rose-600 to-rose-500 text-white px-6 py-2 flex items-center justify-between sticky top-0 z-20">
                          <div className="flex items-center gap-2">
                            <span className="relative flex h-3 w-3">
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75" />
                              <span className="relative inline-flex rounded-full h-3 w-3 bg-white" />
                            </span>
                            <span className="font-bold text-sm tracking-wide">
                              LIVE 🔴 BROADCAST
                            </span>
                            {lesson.liveViewerCount !== undefined && (
                              <span className="text-rose-100 text-xs ml-2">
                                {lesson.liveViewerCount} watching
                              </span>
                            )}
                          </div>
                          <Button
                            size="sm"
                            variant="secondary"
                            className="bg-white text-rose-600 hover:bg-rose-50 dark:bg-white dark:text-rose-600"
                            onClick={() => openLessonDetail(lesson)}
                          >
                            <Radio className="h-4 w-4 mr-1" />
                            Join
                          </Button>
                        </div>
                      )}

                      <CardHeader className="pb-3">
                        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start gap-3">
                              <div className="hidden sm:block flex-shrink-0">
                                <Avatar className="h-11 w-11 border-2 border-slate-100 dark:border-slate-800">
                                  {lesson.teacherAvatar ? (
                                    <AvatarImage
                                      src={lesson.teacherAvatar}
                                      alt={lesson.teacherName || "Teacher"}
                                    />
                                  ) : null}
                                  <AvatarFallback className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-sm font-semibold">
                                    {lesson.teacherName
                                      ? getInitials(lesson.teacherName)
                                      : <User className="h-5 w-5" />}
                                  </AvatarFallback>
                                </Avatar>
                              </div>
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <div
                                    className={cn(
                                      "h-2.5 w-2.5 rounded-full flex-shrink-0",
                                      getSubjectColor(lesson.subject)
                                    )}
                                  />
                                  <span className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wide">
                                    {lesson.subject}
                                  </span>
                                  {(lesson.startTime || lesson.endTime) && (
                                    <span className="inline-flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400">
                                      <Clock className="h-3 w-3" />
                                      {lesson.startTime}
                                      {lesson.endTime ? ` – ${lesson.endTime}` : ""}
                                    </span>
                                  )}
                                  {lesson.className && (
                                    <Badge variant="outline" className="text-[10px] px-2 py-0">
                                      {lesson.className}
                                    </Badge>
                                  )}
                                </div>
                                <CardTitle className="mt-1.5 text-lg flex items-center gap-2 text-slate-900 dark:text-slate-100">
                                  <BookOpen className="h-5 w-5 text-indigo-500 flex-shrink-0" />
                                  <span className="truncate">{lesson.title}</span>
                                </CardTitle>
                                {lesson.teacherName && (
                                  <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                                    with {lesson.teacherName}
                                  </p>
                                )}
                              </div>
                            </div>
                          </div>

                          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 flex-shrink-0">
                            {lesson.childWasAbsent && (
                              <Badge
                                variant="warning"
                                className="gap-1 justify-center"
                              >
                                <AlertTriangle className="h-3.5 w-3.5" />
                                Catch-up
                              </Badge>
                            )}
                            <div className="flex gap-2">
                              {lesson.homework && (
                                <Badge
                                  variant="outline"
                                  className="gap-1 border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/30 justify-center"
                                >
                                  <Home className="h-3 w-3" />
                                  Homework
                                </Badge>
                              )}
                              <Button
                                variant="default"
                                size="sm"
                                onClick={() => openLessonDetail(lesson)}
                              >
                                View Details
                                <ExternalLink className="h-4 w-4 ml-1" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      </CardHeader>

                      <CardContent className="space-y-4 pb-5">
                        {lesson.description && (
                          <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
                            {lesson.description}
                          </p>
                        )}

                        {lesson.objectives && (
                          <div className="rounded-xl bg-slate-50 dark:bg-slate-800/50 p-4 text-sm">
                            <div className="font-semibold text-slate-900 dark:text-slate-100 mb-2 flex items-center gap-2">
                              <CheckCircle2 className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                              Learning Objectives
                            </div>
                            <div className="whitespace-pre-wrap text-slate-600 dark:text-slate-300 leading-relaxed">
                              {lesson.objectives}
                            </div>
                          </div>
                        )}

                        {lesson.homework && (
                          <div className="rounded-xl bg-amber-50 dark:bg-amber-950/20 p-4 text-sm border border-amber-100 dark:border-amber-900/30">
                            <div className="flex items-center justify-between mb-2">
                              <div className="font-semibold text-amber-900 dark:text-amber-100 flex items-center gap-2">
                                <Home className="h-4 w-4" />
                                Homework / Practice
                              </div>
                              {lesson.homeworkDueDate && (
                                <Badge
                                  variant={
                                    isHomeworkDueSoon(lesson)
                                      ? "warning"
                                      : "outline"
                                  }
                                  className="text-[10px] px-2 py-0"
                                >
                                  Due:{" "}
                                  {formatDate(lesson.homeworkDueDate, {
                                    month: "short",
                                    day: "numeric",
                                  })}
                                </Badge>
                              )}
                            </div>
                            <div className="whitespace-pre-wrap text-amber-800 dark:text-amber-200 leading-relaxed">
                              {lesson.homework}
                            </div>
                          </div>
                        )}

                        <div className="flex items-center justify-between pt-1">
                          <div className="text-xs text-slate-500 dark:text-slate-400">
                            {lesson.comments && lesson.comments.length > 0 && (
                              <span className="inline-flex items-center gap-1 mr-4">
                                💬 {lesson.comments.length} comment
                                {lesson.comments.length !== 1 ? "s" : ""}
                              </span>
                            )}
                            {lesson.acknowledgements &&
                              lesson.acknowledgements.length > 0 && (
                                <span className="inline-flex items-center gap-1">
                                  ✓ {lesson.acknowledgements.length} reviewed
                                </span>
                              )}
                          </div>
                          {Array.isArray(lesson.resources) &&
                            lesson.resources.length > 0 && (
                              <Badge variant="outline" className="text-[10px]">
                                📎 {lesson.resources.length} resource
                                {lesson.resources.length !== 1 ? "s" : ""}
                              </Badge>
                            )}
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                ))}
              </div>
            </div>
          ))
        )}
      </div>

        </TabsContent>

        <TabsContent value="homework" className="mt-6 space-y-6">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <Card className="bg-gradient-to-br from-amber-50 to-white dark:from-amber-950/30 dark:bg-slate-900">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-amber-700 dark:text-amber-300">Total Homework</div>
                <div className="mt-1 text-2xl font-bold text-amber-900 dark:text-amber-100">{homeworkStats.total}</div>
              </div>
              <div className="h-12 w-12 rounded-full bg-amber-100 dark:bg-amber-900/50 flex items-center justify-center">
                <Home className="h-6 w-6 text-amber-600 dark:text-amber-400" />
              </div>
            </div>
            </CardContent>
            </Card>
            <Card className="bg-gradient-to-br from-emerald-50 to-white dark:from-emerald-950/30 dark:bg-slate-900">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-emerald-700 dark:text-emerald-300">Submitted</div>
                <div className="mt-1 text-2xl font-bold text-emerald-900 dark:text-emerald-100">
                  {homeworkStats.submitted}/{homeworkStats.total}
                </div>
              </div>
              <div className="h-12 w-12 rounded-full bg-emerald-100 dark:bg-emerald-900/50 flex items-center justify-center">
                <CheckCircle2 className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
              </div>
            </div>
            </CardContent>
            </Card>
            <Card className="bg-gradient-to-br from-rose-50 to-white dark:from-rose-950/30 dark:bg-slate-900">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-rose-700 dark:text-rose-300">Overdue</div>
                <div className="mt-1 text-2xl font-bold text-rose-900 dark:text-rose-100">{homeworkStats.overdue}</div>
              </div>
              <div className="h-12 w-12 rounded-full bg-rose-100 dark:bg-rose-900/50 flex items-center justify-center">
                <XCircle className="h-6 w-6 text-rose-600 dark:text-rose-400" />
              </div>
            </div>
            </CardContent>
            </Card>
            <Card className="bg-gradient-to-br from-indigo-50 to-white dark:from-indigo-950/30 dark:bg-slate-900">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-indigo-700 dark:text-indigo-300">Completion</div>
                <div className="mt-1 text-2xl font-bold text-indigo-900 dark:text-indigo-100">
                  {homeworkStats.completionPct}%
                  {homeworkStats.avgGrade !== null && (
                    <span className="ml-2 text-sm font-normal text-indigo-600 dark:text-indigo-400">
                      · Avg {homeworkStats.avgGrade}%
                    </span>
                  )}
                </div>
                <div className="mt-2">
                  <Progress value={homeworkStats.completionPct} className="h-2" />
                </div>
              </div>
              <div className="h-12 w-12 rounded-full bg-indigo-100 dark:bg-indigo-900/50 flex items-center justify-center">
                <BarChart3 className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
              </div>
            </div>
            </CardContent>
            </Card>
          </div>

          {lessonsWithHomework.length === 0 ? (
            <Card className="border-dashed border-slate-300 dark:border-slate-700">
              <CardContent className="p-12 text-center">
                <Home className="h-12 w-12 mx-auto text-slate-300 dark:text-slate-600 mb-4" />
                <h3 className="text-lg font-medium text-slate-900 dark:text-slate-100">No homework assigned</h3>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                  Homework assigned by teachers will appear here.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {lessonsWithHomework.map((lesson) => (
                <Card
                  key={lesson.id}
                  id={`hw-${lesson.id}`}
                  className={cn(
                    "overflow-hidden transition-all hover:shadow-md cursor-pointer",
                    lesson.homeworkStatus === 'overdue' && "border-2 border-rose-300 dark:border-rose-700 bg-rose-50/30 dark:bg-rose-950/10"
                  )}
                  onClick={() => openLessonDetail(lesson)}
                >
                  <CardHeader className="pb-3">
                    <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start gap-3">
                          <div className="hidden sm:block flex-shrink-0">
                            <Avatar className="h-11 w-11 border-2 border-slate-100 dark:border-slate-800">
                              {lesson.teacherAvatar ? (
                                <AvatarImage
                                  src={lesson.teacherAvatar}
                                  alt={lesson.teacherName || "Teacher"}
                                />
                              ) : null}
                              <AvatarFallback className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-sm font-semibold">
                                {lesson.teacherName
                                  ? getInitials(lesson.teacherName)
                                  : <User className="h-5 w-5" />}
                              </AvatarFallback>
                            </Avatar>
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <div
                                className={cn(
                                  "h-2.5 w-2.5 rounded-full flex-shrink-0",
                                  getSubjectColor(lesson.subject)
                                )}
                              />
                              <span className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wide">
                                {lesson.subject}
                              </span>
                              <span className="inline-flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400">
                                <Calendar className="h-3 w-3" />
                                Lesson: {formatDate(lesson.date, { month: "short", day: "numeric" })}
                              </span>
                              {lesson.homeworkDueDate && (
                                <span className="inline-flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400">
                                  <Clock className="h-3 w-3" />
                                  Due: {formatDate(lesson.homeworkDueDate, { month: "short", day: "numeric" })}
                                </span>
                              )}
                              {lesson.className && (
                                <Badge variant="outline" className="text-[10px] px-2 py-0">
                                  {lesson.className}
                                </Badge>
                              )}
                            </div>
                            <CardTitle className="mt-1.5 text-base flex items-center gap-2 text-slate-900 dark:text-slate-100">
                              <BookOpen className="h-5 w-5 text-amber-500 flex-shrink-0" />
                              <span className="truncate">{lesson.title}</span>
                            </CardTitle>
                          </div>
                        </div>
                      </div>
                      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 flex-shrink-0">
                        <HomeworkStatusBadge status={lesson.homeworkStatus} grade={lesson.homeworkGrade} />
                        <Button
                          variant="default"
                          size="sm"
                          onClick={(e) => { e.stopPropagation(); openLessonDetail(lesson); }}
                        >
                          <Send className="h-4 w-4 mr-1" />
                          {lesson.homeworkStatus === 'graded' ? 'View Grade' : 'View Task'}
                          <ExternalLink className="h-3.5 w-3.5 ml-1" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4 pb-5">
                    <div className="rounded-xl bg-amber-50 dark:bg-amber-950/20 p-4 text-sm border border-amber-100 dark:border-amber-900/30">
                      <div className="whitespace-pre-wrap text-amber-900 dark:text-amber-200 leading-relaxed">
                        {lesson.homework}
                      </div>
                    </div>

                    {lesson.homeworkStatus === 'graded' && (
                      <div className="rounded-xl bg-emerald-50 dark:bg-emerald-950/20 p-4 text-sm border border-emerald-100 dark:border-emerald-900/30">
                        <div className="flex flex-wrap items-center gap-4 mb-2">
                          <div>
                            <p className="text-xs uppercase tracking-wide text-emerald-600 dark:text-emerald-400 font-semibold mb-0.5">Grade</p>
                            <p className="text-2xl font-bold text-emerald-800 dark:text-emerald-200">
                              {lesson.homeworkGrade}%
                            </p>
                          </div>
                          {lesson.homeworkGradedAt && (
                            <div>
                              <p className="text-xs uppercase tracking-wide text-emerald-600 dark:text-emerald-400 font-semibold mb-0.5">Graded on</p>
                              <p className="text-sm font-medium text-emerald-800 dark:text-emerald-200">
                                {formatDate(lesson.homeworkGradedAt, { month: "short", day: "numeric", year: "numeric" })}
                              </p>
                            </div>
                          )}
                        </div>
                        {lesson.homeworkFeedback && (
                          <>
                            <Separator className="my-3 border-emerald-200 dark:border-emerald-800/50" />
                            <div>
                              <p className="text-xs uppercase tracking-wide text-emerald-600 dark:text-emerald-400 font-semibold mb-1">Teacher Feedback</p>
                              <p className="text-emerald-800 dark:text-emerald-200 whitespace-pre-wrap leading-relaxed">
                                {lesson.homeworkFeedback}
                              </p>
                            </div>
                          </>
                        )}
                      </div>
                    )}

                    {lesson.homeworkSubmittedAt && lesson.homeworkStatus !== 'graded' && (
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        Submitted on {formatDate(lesson.homeworkSubmittedAt, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })} · awaiting grade
                      </p>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      <LessonDetailViewer
        ref={detailViewerRef}
        viewerRole={viewerRole}
        onAcknowledge={onAcknowledge}
      />
    </div>
  );
}
