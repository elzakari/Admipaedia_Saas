import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../ui/table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "../ui/dropdown-menu";
import { DatePicker } from "../ui/date-picker";
import { Plus, MoreHorizontal, BookOpen, Calendar as CalendarIcon } from 'lucide-react';
import classService from "../../services/classService";
import { AddLessonDialog } from './AddLessonDialog';

interface ClassLessonsTabProps {
  classId: number;
}

interface Lesson {
  id: number;
  title: string;
  description: string;
  date: string;
  status: string;
  materials: any[];
}

export function ClassLessonsTab({ classId }: ClassLessonsTabProps) {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [isAddingLesson, setIsAddingLesson] = useState(false);
  
  // Fetch lessons for selected class
  const { data: lessonsData, isLoading } = useQuery({
    queryKey: ['class-lessons', classId],
    queryFn: () => classService.getClassLessons ? classService.getClassLessons(classId) : Promise.resolve([]),
    enabled: !!classId && !!classService.getClassLessons,
  });
  
  const lessons = lessonsData || [];
  
  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div className="flex items-center space-x-2">
          <DatePicker
            date={selectedDate}
            setDate={setSelectedDate}
            className="w-[240px]"
          />
          
          <Select>
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
        
        <Button onClick={() => setIsAddingLesson(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Add Lesson
        </Button>
      </div>
      
      {isLoading ? (
        <div className="text-center py-4">Loading lessons...</div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Lesson</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {lessons.map((lesson: Lesson) => (
              <TableRow key={lesson.id}>
                <TableCell>
                  <div className="flex items-center space-x-3">
                    <div className="p-2 rounded-full bg-blue-100">
                      <BookOpen className="h-4 w-4 text-blue-500" />
                    </div>
                    <div>
                      <p className="font-medium">{lesson.title}</p>
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center space-x-2">
                    <CalendarIcon className="h-4 w-4 text-muted-foreground" />
                    <span>{lesson.date}</span>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge 
                    variant={lesson.status === 'completed' ? 'default' : 
                           lesson.status === 'in-progress' ? 'secondary' : 'outline'}
                  >
                    {lesson.status === 'completed' ? 'Completed' : 
                     lesson.status === 'in-progress' ? 'In Progress' : 'Planned'}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem>Edit Lesson</DropdownMenuItem>
                      <DropdownMenuItem>View Materials</DropdownMenuItem>
                      <DropdownMenuItem>Mark as Completed</DropdownMenuItem>
                      <DropdownMenuItem>Delete</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
      
      <AddLessonDialog 
        isOpen={isAddingLesson} 
        onClose={() => setIsAddingLesson(false)} 
        classId={classId} 
      />
    </div>
  );
}