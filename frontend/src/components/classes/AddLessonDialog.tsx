import React, { useEffect, useMemo, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "../ui/dialog";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Textarea } from "../ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { DatePicker } from "../ui/date-picker";
import { BookOpen, FileText, Target } from 'lucide-react';
import { format } from "date-fns";
import { toast } from 'sonner';
import classService from "../../services/classService";
import { buildLessonMaterials, getLessonMaterialValue } from '../../utils/lessonMaterials';

interface AddLessonDialogProps {
  isOpen: boolean;
  onClose: () => void;
  classId: number;
  subjects?: Array<{ id: number; name: string }>;
  lesson?: any | null;
}

const createInitialFormState = (lesson?: any | null) => ({
  title: lesson?.title || '',
  description: lesson?.description || '',
  date: lesson?.date ? new Date(lesson.date) : new Date(),
  status: lesson?.status || 'planned',
  subject_id: lesson?.subject_id ? String(lesson.subject_id) : '',
  objectives: lesson?.objectives || getLessonMaterialValue(lesson?.materials, 'objectives', ''),
  classwork: lesson?.classwork || getLessonMaterialValue(lesson?.materials, 'classwork', ''),
  homework: lesson?.homework || getLessonMaterialValue(lesson?.materials, 'homework', ''),
  notes: lesson?.notes || getLessonMaterialValue(lesson?.materials, 'notes', ''),
  resources: Array.isArray(lesson?.resources)
    ? lesson.resources.join('\n')
    : Array.isArray(getLessonMaterialValue<any[]>(lesson?.materials, 'resources', []))
    ? getLessonMaterialValue<any[]>(lesson?.materials, 'resources', []).join('\n')
    : ''
})

export function AddLessonDialog({ isOpen, onClose, classId, subjects = [], lesson = null }: AddLessonDialogProps) {
  const queryClient = useQueryClient();
  const [lessonForm, setLessonForm] = useState(createInitialFormState(lesson));

  useEffect(() => {
    if (isOpen) {
      setLessonForm(createInitialFormState(lesson));
    }
  }, [isOpen, lesson]);

  const selectedSubject = useMemo(
    () => subjects.find((item) => String(item.id) === lessonForm.subject_id),
    [subjects, lessonForm.subject_id]
  );

  const saveLessonMutation = useMutation({
    mutationFn: async (data: any) => {
      if (lesson?.id) {
        return classService.updateClassLesson(classId, lesson.id, data);
      }
      return classService.createClassLesson(classId, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['class-lessons', classId] });
      toast.success(lesson?.id ? 'Lesson log updated successfully' : 'Lesson log created successfully');
      onClose();
    },
    onError: (error: any) => {
      toast.error(error?.message || 'Failed to save lesson log');
    },
  });

  const handleLessonInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setLessonForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleLessonSelectChange = (name: string, value: string) => {
    setLessonForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmitLesson = (e: React.FormEvent) => {
    e.preventDefault();

    if (!lessonForm.title.trim()) {
      toast.error('Lesson topic is required');
      return;
    }

    const resources = lessonForm.resources
      .split('\n')
      .map((item) => item.trim())
      .filter(Boolean);

    const dataToSubmit = {
      title: lessonForm.title.trim(),
      description: lessonForm.description.trim(),
      date: format(lessonForm.date, 'yyyy-MM-dd'),
      status: lessonForm.status,
      materials: buildLessonMaterials({
        subjectId: lessonForm.subject_id ? Number(lessonForm.subject_id) : undefined,
        subjectName: selectedSubject?.name,
        objectives: lessonForm.objectives,
        classwork: lessonForm.classwork,
        homework: lessonForm.homework,
        notes: lessonForm.notes,
        resources,
      }),
    };

    saveLessonMutation.mutate(dataToSubmit);
  };
  
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{lesson?.id ? 'Update Daily Lesson Log' : 'Add Daily Lesson Log'}</DialogTitle>
          <DialogDescription>
            Capture the topic taught, key objectives, classwork, homework, and support notes for families and absent learners.
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmitLesson}>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="title">Lesson Topic</Label>
              <Input 
                id="title" 
                name="title"
                value={lessonForm.title}
                onChange={handleLessonInputChange}
                placeholder="e.g., Fractions on the number line"
              />
            </div>
            
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Subject</Label>
                <Select
                  value={lessonForm.subject_id}
                  onValueChange={(value) => handleLessonSelectChange('subject_id', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select subject" />
                  </SelectTrigger>
                  <SelectContent>
                    {subjects.map((subject) => (
                      <SelectItem key={subject.id} value={String(subject.id)}>
                        {subject.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Date</Label>
                <DatePicker
                  date={lessonForm.date}
                  setDate={(date) => setLessonForm(prev => ({ ...prev, date: date || new Date() }))}
                  className="w-full"
                />
              </div>
              
              <div className="space-y-2">
                <Label>Status</Label>
                <Select 
                  value={lessonForm.status}
                  onValueChange={(value) => handleLessonSelectChange('status', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="planned">Planned</SelectItem>
                    <SelectItem value="in-progress">In Progress</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description" className="flex items-center gap-2">
                <BookOpen className="h-4 w-4" />
                Lesson Summary
              </Label>
              <Textarea 
                id="description" 
                name="description"
                value={lessonForm.description}
                onChange={handleLessonInputChange}
                placeholder="Summarize what was covered in class today"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="objectives" className="flex items-center gap-2">
                <Target className="h-4 w-4" />
                Learning Objectives
              </Label>
              <Textarea
                id="objectives"
                name="objectives"
                value={lessonForm.objectives}
                onChange={handleLessonInputChange}
                placeholder="List the key concepts or outcomes taught today"
              />
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="classwork">Classwork / Exercises</Label>
                <Textarea
                  id="classwork"
                  name="classwork"
                  value={lessonForm.classwork}
                  onChange={handleLessonInputChange}
                  placeholder="Describe class practice or board work"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="homework">Homework / Follow-up</Label>
                <Textarea
                  id="homework"
                  name="homework"
                  value={lessonForm.homework}
                  onChange={handleLessonInputChange}
                  placeholder="Add take-home exercise, revision task, or reading"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Support Notes for Parents and Absent Students</Label>
              <Textarea
                id="notes"
                name="notes"
                value={lessonForm.notes}
                onChange={handleLessonInputChange}
                placeholder="Explain how to catch up, what to revise, or what support is needed at home"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="resources" className="flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Resource Links
              </Label>
              <Textarea
                id="resources"
                name="resources"
                value={lessonForm.resources}
                onChange={handleLessonInputChange}
                placeholder="Paste one resource link per line"
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={saveLessonMutation.isPending}>
              {saveLessonMutation.isPending ? 'Saving...' : lesson?.id ? 'Update Lesson' : 'Save Lesson'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
