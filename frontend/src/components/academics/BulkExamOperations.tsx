import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useQuery } from '@tanstack/react-query';
import { classService, subjectService } from '@/services';

interface ExamSchedule {
  id?: number;
  title: string;
  description?: string;
  exam_type: 'midterm' | 'final' | 'quiz' | 'assignment' | 'project';
  class_id: number;
  class_name: string;
  subject_id: number;
  subject_name: string;
  exam_date: string;
  start_time: string;
  end_time: string;
  duration_minutes: number;
  total_marks: number;
  venue?: string;
  instructions?: string;
  status: 'scheduled' | 'ongoing' | 'completed' | 'cancelled';
  academic_year: string;
  term: string;
}

interface BulkExamOperationsProps {
  onClose?: () => void;
}

export const BulkExamOperations: React.FC<BulkExamOperationsProps> = ({
  onClose
}) => {
  const [examSchedules, setExamSchedules] = useState<ExamSchedule[]>([]);

  // Fetch data
  const { data: classes } = useQuery({
    queryKey: ['classes'],
    queryFn: () => classService.getClasses()
  });

  const { data: subjects } = useQuery({
    queryKey: ['subjects'],
    queryFn: () => subjectService.getSubjects()
  });

  // Add new exam schedule
  const addExamSchedule = () => {
    const newSchedule: ExamSchedule = {
      title: '',
      description: '',
      exam_type: 'midterm',
      class_id: 0,
      class_name: '',
      subject_id: 0,
      subject_name: '',
      exam_date: new Date().toISOString().split('T')[0] || '',
      start_time: '09:00',
      end_time: '11:00',
      duration_minutes: 120,
      total_marks: 100,
      venue: '',
      instructions: '',
      status: 'scheduled',
      academic_year: new Date().getFullYear().toString(),
      term: '1'
    };
    setExamSchedules(prev => [...prev, newSchedule]);
  };

  // Update exam schedule
  const updateExamSchedule = (index: number, field: keyof ExamSchedule, value: any) => {
    setExamSchedules(prev => prev.map((schedule, i) => {
      if (i === index) {
        const updated = { ...schedule, [field]: value };

        // Auto-populate names when IDs are selected
        if (field === 'class_id' && classes?.data) {
          const classItem = (classes.data as any[]).find((c: any) => c.id === value);
          updated.class_name = classItem?.name || '';
        }
        if (field === 'subject_id' && subjects?.subjects) {
          const subject = (subjects.subjects as any[]).find((s: any) => s.id === value);
          updated.subject_name = subject?.name || '';
        }

        // Auto-calculate duration when times change
        if (field === 'start_time' || field === 'end_time') {
          const start = new Date(`2000-01-01T${updated.start_time}:00`);
          const end = new Date(`2000-01-01T${updated.end_time}:00`);
          if (end > start) {
            updated.duration_minutes = Math.round((end.getTime() - start.getTime()) / (1000 * 60));
          }
        }

        return updated;
      }
      return schedule;
    }));
  };

  // Remove exam schedule
  const removeExamSchedule = (index: number) => {
    setExamSchedules(prev => prev.filter((_, i) => i !== index));
  };

  // Duplicate exam schedule
  const duplicateExamSchedule = (index: number) => {
    const schedule = examSchedules[index];
    if (!schedule) return;
    const { id: _, ...rest } = schedule;
    const duplicated: ExamSchedule = { ...rest, title: `${schedule.title} (Copy)` };
    setExamSchedules(prev => [...prev, duplicated]);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Bulk Exam Operations</h2>
          <p className="text-gray-600">Manage multiple exams efficiently</p>
        </div>
        {onClose && (
          <Button variant="ghost" onClick={onClose}>Close</Button>
        )}
      </div>

      <div>
        <Button onClick={addExamSchedule}>Add Exam Schedule</Button>
      </div>

      {examSchedules.length > 0 && (
        <div className="space-y-4">
          {examSchedules.map((schedule, index) => (
            <Card key={index}>
              <CardContent className="p-4">
                <div className="flex justify-between items-start gap-4">
                  <div className="flex-1">
                    <Input
                      value={schedule.title}
                      onChange={(e) => updateExamSchedule(index, 'title', e.target.value)}
                      placeholder="Exam title"
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => duplicateExamSchedule(index)}>
                      Copy
                    </Button>
                    <Button size="sm" variant="destructive" onClick={() => removeExamSchedule(index)}>
                      Delete
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default BulkExamOperations;
