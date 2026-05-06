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
          <div className="flex justify-between items-center">
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
              <SelectTrigger className="w-[200px]">
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
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="students">Students</TabsTrigger>
              <TabsTrigger value="lessons">Lessons</TabsTrigger>
              <TabsTrigger value="announcements">Announcements</TabsTrigger>
              <TabsTrigger value="resources">Resources</TabsTrigger>
              <TabsTrigger value="attendance">Attendance</TabsTrigger>
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