import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "../ui/dialog";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Textarea } from "../ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { DatePicker } from "../ui/date-picker";
import { Plus } from 'lucide-react';
import { format } from "date-fns";
import classService from "../../services/classService";

interface AddLessonDialogProps {
  isOpen: boolean;
  onClose: () => void;
  classId: number;
}

export function AddLessonDialog({ isOpen, onClose, classId }: AddLessonDialogProps) {
  const queryClient = useQueryClient();
  
  const [lessonForm, setLessonForm] = useState({
    title: '',
    description: '',
    date: new Date(),
    status: 'planned',
    materials: []
  });
  
  // Create lesson mutation
  const createLessonMutation = useMutation({
    mutationFn: (data: any) => {
      if (!classService.createClassLesson) {
        return Promise.reject(new Error('createClassLesson not implemented'));
      }
      return classService.createClassLesson(classId, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['class-lessons', classId] });
      resetForm();
      onClose();
    }
  });
  
  // Handle lesson form input changes
  const handleLessonInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setLessonForm(prev => ({ ...prev, [name]: value }));
  };
  
  // Handle lesson select changes
  const handleLessonSelectChange = (name: string, value: string) => {
    setLessonForm(prev => ({ ...prev, [name]: value }));
  };
  
  // Submit lesson form
  const handleSubmitLesson = (e: React.FormEvent) => {
    e.preventDefault();
    
    const dataToSubmit = {
      ...lessonForm,
      date: format(lessonForm.date, 'yyyy-MM-dd')
    };
    
    createLessonMutation.mutate(dataToSubmit);
  };
  
  // Reset form
  const resetForm = () => {
    setLessonForm({
      title: '',
      description: '',
      date: new Date(),
      status: 'planned',
      materials: []
    });
  };
  
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add New Lesson</DialogTitle>
          <DialogDescription>
            Create a new lesson for your class. Add details, materials, and schedule.
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmitLesson}>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="title">Lesson Title</Label>
              <Input 
                id="title" 
                name="title"
                value={lessonForm.title}
                onChange={handleLessonInputChange}
                placeholder="Enter lesson title" 
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea 
                id="description" 
                name="description"
                value={lessonForm.description}
                onChange={handleLessonInputChange}
                placeholder="Enter lesson description" 
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
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
              <Label>Materials</Label>
              <div className="flex items-center space-x-2">
                <Input type="file" />
                <Button type="button" variant="outline" size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  Add
                </Button>
              </div>
            </div>
          </div>
          
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit">Save Lesson</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}