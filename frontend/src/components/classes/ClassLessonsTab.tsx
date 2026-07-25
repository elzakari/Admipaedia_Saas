import React, { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "../ui/dropdown-menu";
import { DatePicker } from "../ui/date-picker";
import { Card, CardContent } from "../ui/card";
import { MoreHorizontal, Plus, BookOpen, Calendar as CalendarIcon, ClipboardCheck, Target, CircleCheck, Link as LinkIcon } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import classService from "../../services/classService";
import { AddLessonDialog } from './AddLessonDialog';

interface ClassLessonsTabProps {
  classId: number;
  editable?: boolean;
}

export function ClassLessonsTab({ classId, editable = true }: ClassLessonsTabProps) {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [isAddingLesson, setIsAddingLesson] = useState(false);
  const [editingLesson, setEditingLesson] = useState<any | null>(null);
  
  const { data: lessonsData = [], isLoading, refetch } = useQuery({
    queryKey: ['class-lessons', classId],
    queryFn: () => classService.getClassLessons(classId),
    enabled: !!classId,
  });

  const { data: subjects = [] } = useQuery({
    queryKey: ['class-subjects', classId, 'lesson-dialog'],
    queryFn: () => classService.getClassSubjects(classId),
    enabled: !!classId,
  });

  const lessons = useMemo(() => {
    return lessonsData.filter((lesson: any) => {
      const matchesStatus = selectedStatus === 'all' || lesson.status === selectedStatus;
      const matchesDate = !selectedDate || lesson.date === format(selectedDate, 'yyyy-MM-dd');
      return matchesStatus && matchesDate;
    });
  }, [lessonsData, selectedDate, selectedStatus]);

  const todayCount = useMemo(
    () => lessonsData.filter((lesson: any) => lesson.date === format(new Date(), 'yyyy-MM-dd')).length,
    [lessonsData]
  );
  const completedCount = useMemo(
    () => lessonsData.filter((lesson: any) => lesson.status === 'completed').length,
    [lessonsData]
  );

  const handleDelete = async (lessonId: number) => {
    if (!window.confirm('Delete this daily lesson log?')) return;
    try {
      await classService.deleteClassLesson(classId, lessonId);
      toast.success('Lesson log deleted successfully');
      refetch();
    } catch (error: any) {
      toast.error(error?.message || 'Failed to delete lesson log');
    }
  };

  const handleMarkCompleted = async (lesson: any) => {
    try {
      await classService.updateClassLesson(classId, lesson.id, { status: 'completed' });
      toast.success('Lesson marked as completed');
      refetch();
    } catch (error: any) {
      toast.error(error?.message || 'Failed to update lesson status');
    }
  };
  
  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="p-4">
            <div className="text-sm text-muted-foreground">Today&apos;s Lessons</div>
            <div className="mt-2 text-2xl font-semibold">{todayCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-sm text-muted-foreground">Completed Logs</div>
            <div className="mt-2 text-2xl font-semibold">{completedCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-sm text-muted-foreground">Class Coverage</div>
            <div className="mt-2 text-2xl font-semibold">{lessonsData.length}</div>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="flex flex-col gap-2 md:flex-row md:items-center">
          <DatePicker
            date={selectedDate}
            setDate={setSelectedDate}
            className="w-[240px]"
          />
          
          <Select value={selectedStatus} onValueChange={setSelectedStatus}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Lessons</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="in-progress">In Progress</SelectItem>
              <SelectItem value="planned">Planned</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        {editable && (
          <Button onClick={() => { setEditingLesson(null); setIsAddingLesson(true); }}>
            <Plus className="h-4 w-4 mr-2" />
            Add Lesson
          </Button>
        )}
      </div>
      
      {isLoading ? (
        <div className="text-center py-4">Loading lessons...</div>
      ) : lessons.length === 0 ? (
        <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
          No lesson logs match the current filters.
        </div>
      ) : (
        <div className="space-y-4">
          {lessons.map((lesson: any) => (
            <Card key={lesson.id}>
              <CardContent className="p-5 space-y-4">
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="outline">{lesson.subject_name || 'General'}</Badge>
                      <Badge variant={lesson.status === 'completed' ? 'default' : lesson.status === 'in-progress' ? 'secondary' : 'outline'}>
                        {lesson.status}
                      </Badge>
                      <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                        <CalendarIcon className="h-3.5 w-3.5" />
                        {lesson.date}
                      </span>
                    </div>
                    <h3 className="text-lg font-semibold flex items-center gap-2">
                      <BookOpen className="h-4 w-4 text-indigo-600" />
                      {lesson.title}
                    </h3>
                    {lesson.description ? (
                      <p className="text-sm text-muted-foreground">{lesson.description}</p>
                    ) : null}
                  </div>

                  {editable ? (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => { setEditingLesson(lesson); setIsAddingLesson(true); }}>Edit Lesson</DropdownMenuItem>
                        {lesson.status !== 'completed' ? (
                          <DropdownMenuItem onClick={() => handleMarkCompleted(lesson)}>Mark as Completed</DropdownMenuItem>
                        ) : null}
                        <DropdownMenuItem onClick={() => handleDelete(lesson.id)} className="text-red-600">Delete</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  ) : null}
                </div>

                <div className="grid gap-3 md:grid-cols-2">
                  {lesson.objectives ? (
                    <div className="rounded-lg border bg-slate-50/70 p-3">
                      <div className="mb-1 flex items-center gap-2 text-sm font-medium">
                        <Target className="h-4 w-4 text-indigo-600" />
                        Objectives
                      </div>
                      <p className="text-sm text-muted-foreground whitespace-pre-wrap">{lesson.objectives}</p>
                    </div>
                  ) : null}

                  {lesson.classwork ? (
                    <div className="rounded-lg border bg-slate-50/70 p-3">
                      <div className="mb-1 flex items-center gap-2 text-sm font-medium">
                        <ClipboardCheck className="h-4 w-4 text-indigo-600" />
                        Classwork
                      </div>
                      <p className="text-sm text-muted-foreground whitespace-pre-wrap">{lesson.classwork}</p>
                    </div>
                  ) : null}

                  {lesson.homework ? (
                    <div className="rounded-lg border bg-slate-50/70 p-3">
                      <div className="mb-1 flex items-center gap-2 text-sm font-medium">
                        <CircleCheck className="h-4 w-4 text-indigo-600" />
                        Homework
                      </div>
                      <p className="text-sm text-muted-foreground whitespace-pre-wrap">{lesson.homework}</p>
                    </div>
                  ) : null}

                  {lesson.notes ? (
                    <div className="rounded-lg border bg-slate-50/70 p-3">
                      <div className="mb-1 text-sm font-medium">Support Notes</div>
                      <p className="text-sm text-muted-foreground whitespace-pre-wrap">{lesson.notes}</p>
                    </div>
                  ) : null}
                </div>

                {Array.isArray(lesson.resources) && lesson.resources.length > 0 ? (
                  <div className="rounded-lg border bg-slate-50/70 p-3">
                    <div className="mb-2 text-sm font-medium">Resources</div>
                    <div className="space-y-1">
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
                  </div>
                ) : null}
              </CardContent>
            </Card>
            ))}
        </div>
      )}
      
      <AddLessonDialog 
        isOpen={isAddingLesson} 
        onClose={() => { setIsAddingLesson(false); setEditingLesson(null); }} 
        classId={classId} 
        subjects={subjects}
        lesson={editingLesson}
      />
    </div>
  );
}
