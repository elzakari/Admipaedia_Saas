import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { useQuery } from '@tanstack/react-query';
import classService from "../../services/classService";

// Import tab components
import { ClassStudentsTab } from './ClassStudentsTab';
import { ClassLessonsTab } from './ClassLessonsTab';
import { ClassAnnouncementsTab } from './ClassAnnouncementsTab';
import { ClassResourcesTab } from './ClassResourcesTab';
import { EnhancedAttendanceSystem } from './EnhancedAttendanceSystem';

interface ClassManagementContainerProps {
  classId?: number;
  onBack?: () => void;
}

export function ClassManagementContainer({ classId, onBack }: ClassManagementContainerProps) {
  const [activeTab, setActiveTab] = useState('students');
  const [selectedClassId, setSelectedClassId] = useState<number | null>(classId || null);
  
  // Fetch classes
  const { data: classesData } = useQuery({
    queryKey: ['classes'],
    queryFn: () => classService.getClasses(),
  });
  
  const classes = classesData?.classes || [];
  
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-3 sm:flex-row sm:justify-between sm:items-center">
            <div>
              <CardTitle className="flex items-center gap-2">
                <button 
                  onClick={onBack} 
                  className="p-1 rounded hover:bg-gray-200 transition-colors"
                  title="Back to class list"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M19 12H5M12 19l-7-7 7-7"/>
                  </svg>
                </button>
                Class Management
              </CardTitle>
              <CardDescription>Manage your class, students, lessons, and resources</CardDescription>
            </div>
            <Select 
              value={selectedClassId?.toString()} 
              onValueChange={(value) => setSelectedClassId(Number(value))}
            >
              <SelectTrigger className="w-full sm:w-[200px]">
                <SelectValue placeholder="Select class" />
              </SelectTrigger>
              <SelectContent>
                {classes.map((classItem: any) => (
                  <SelectItem key={classItem.id} value={classItem.id.toString()}>
                    {classItem.name}
                    {classItem.status && (
                      <span className="ml-2 text-xs">
                        ({classItem.status})
                      </span>
                    )}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="w-full justify-start overflow-x-auto">
              <TabsTrigger value="students" className="min-w-[120px]">Students</TabsTrigger>
              <TabsTrigger value="lessons" className="min-w-[120px]">Lessons</TabsTrigger>
              <TabsTrigger value="announcements" className="min-w-[140px]">Announcements</TabsTrigger>
              <TabsTrigger value="resources" className="min-w-[120px]">Resources</TabsTrigger>
              <TabsTrigger value="attendance" className="min-w-[120px]">Attendance</TabsTrigger>
            </TabsList>
            
            <TabsContent value="students">
              {selectedClassId && <ClassStudentsTab classId={selectedClassId} />}
            </TabsContent>
            
            <TabsContent value="lessons">
              {selectedClassId && <ClassLessonsTab classId={selectedClassId} />}
            </TabsContent>
            
            <TabsContent value="announcements">
              {selectedClassId && <ClassAnnouncementsTab classId={selectedClassId} />}
            </TabsContent>
            
            <TabsContent value="resources">
              {selectedClassId && <ClassResourcesTab classId={selectedClassId} />}
            </TabsContent>
            
            <TabsContent value="attendance">
              {selectedClassId && <EnhancedAttendanceSystem classId={selectedClassId} />}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
