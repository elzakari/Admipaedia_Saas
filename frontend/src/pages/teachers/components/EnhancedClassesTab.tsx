import React, { useState, useEffect } from 'react';
import { useTeacherClasses } from "../../../hooks/useTeachers";
import { Card, CardContent, CardHeader, CardTitle } from "../../../components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../../../components/ui/table";
import { Badge } from "../../../components/ui/badge";
import { Button } from "../../../components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../../components/ui/tabs";
import { BookOpen, Plus, Edit, Eye, Users, Calendar, Clock } from "lucide-react";
import { ClassFormModal } from "../../../components/classes/ClassFormModal";
import { useToast } from "../../../components/ui/use-toast";
import { useQueryClient } from '@tanstack/react-query';

interface EnhancedClassesTabProps {
  teacherId: number;
}

interface ClassData {
  id: string | number;
  name: string;
  studentCount?: number;
  schedule?: string;
  days?: string[];
  startTime?: string;
  endTime?: string;
  status?: 'active' | 'inactive';
}

interface TeacherClassesData {
  classes: ClassData[];
  pagination: {
    total: number;
    page: number;
    perPage: number;
  };
}

interface Student {
  id: number;
  name: string;
  attendance: number;
  performance: number;
  status: 'active' | 'at-risk';
}

export function EnhancedClassesTab({ teacherId }: EnhancedClassesTabProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("overview");
  const [selectedClass, setSelectedClass] = useState<ClassData | null>(null);
  const [showClassModal, setShowClassModal] = useState(false);
  const [showAddStudentModal, setShowAddStudentModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  
  const { data, isLoading, error } = useTeacherClasses(teacherId) as {
    data: TeacherClassesData | undefined;
    isLoading: boolean;
    error: Error | null;
  };

  // Mock students data for demonstration
  const students: Student[] = [
    { id: 1, name: "John Doe", attendance: 95, performance: 85, status: 'active' },
    { id: 2, name: "Jane Smith", attendance: 88, performance: 92, status: 'active' },
    { id: 3, name: "Michael Johnson", attendance: 75, performance: 68, status: 'at-risk' },
    { id: 4, name: "Emily Brown", attendance: 92, performance: 78, status: 'active' },
  ];

  // Helper function to format class days
  const formatClassDays = (days?: string[] | string) => {
    if (!days) return "N/A";
    if (typeof days === 'string') return days;
    if (Array.isArray(days) && days.length === 0) return "N/A";
    if (Array.isArray(days)) return days.join(", ");
    return "N/A";
  };

  // Helper function to format class schedule
  const formatClassSchedule = (startTime?: string, endTime?: string) => {
    if (!startTime || !endTime) return "N/A";
    return `${startTime} - ${endTime}`;
  };

  // Handle class schedule update
  const handleUpdateSchedule = () => {
    // Implementation would go here
    toast({
      title: "Schedule Updated",
      description: "Class schedule has been updated successfully."
    });
    // Refresh data
    queryClient.invalidateQueries({ queryKey: ['teacherClasses', teacherId] });
  };

  // Load students when a class is selected or add student modal is opened
  useEffect(() => {
    if (selectedClass || showAddStudentModal) {
      // In a real app, you would fetch students for the selected class
      // studentService.getStudentsByClass(selectedClass.id)
    }
  }, [selectedClass, showAddStudentModal]);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 text-red-600 bg-red-50 rounded-md">
        <p>Error loading classes: {error.message}</p>
        <button 
          onClick={() => window.location.reload()}
          className="mt-2 px-4 py-2 bg-red-100 hover:bg-red-200 rounded-md text-sm"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h2 className="text-2xl font-bold tracking-tight">Classes</h2>
        <Button onClick={() => setShowClassModal(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Add Class
        </Button>
      </div>

      {(!data?.classes || data.classes.length === 0) ? (
        <Card className="text-center p-8">
          <BookOpen className="mx-auto h-12 w-12 text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900">No classes found</h3>
          <p className="mt-1 text-sm text-gray-500">Get started by creating a new class.</p>
          <div className="mt-6">
            <Button onClick={() => setShowClassModal(true)}>
              <Plus className="-ml-1 mr-2 h-5 w-5" />
              New Class
            </Button>
          </div>
        </Card>
      ) : (
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="schedule">Schedule</TabsTrigger>
            <TabsTrigger value="students">Students</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
          </TabsList>
          
          <TabsContent value="overview" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Class Overview</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Class</TableHead>
                        <TableHead>Students</TableHead>
                        <TableHead>Schedule</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="w-[100px]">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {data?.classes?.map((cls) => (
                        <TableRow key={cls.id}>
                          <TableCell className="font-medium">{cls.name}</TableCell>
                          <TableCell>{cls.studentCount || 0} students</TableCell>
                          <TableCell>{formatClassSchedule(cls.startTime, cls.endTime)} ({formatClassDays(cls.days)})</TableCell>
                          <TableCell>
                            <Badge variant={cls.status === 'active' ? 'default' : 'secondary'}>
                              {cls.status || 'inactive'}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex space-x-2">
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                onClick={() => setSelectedClass(cls)}
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                              <Button 
                                variant="ghost" 
                                size="icon"
                                onClick={() => {
                                  setSelectedClass(cls);
                                  setShowClassModal(true);
                                }}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="schedule" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Class Schedule</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {data?.classes?.map((cls) => (
                      <Card key={cls.id} className="overflow-hidden">
                        <CardHeader className="pb-2">
                          <CardTitle className="text-lg">{cls.name}</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-2">
                            <div className="flex items-center">
                              <Clock className="h-4 w-4 mr-2 text-gray-500" />
                              <span>{formatClassSchedule(cls.startTime, cls.endTime)}</span>
                            </div>
                            <div className="flex items-center">
                              <Calendar className="h-4 w-4 mr-2 text-gray-500" />
                              <span>{formatClassDays(cls.days)}</span>
                            </div>
                            <div className="flex items-center">
                              <Users className="h-4 w-4 mr-2 text-gray-500" />
                              <span>{cls.studentCount || 0} students</span>
                            </div>
                          </div>
                          <div className="mt-4">
                            <Button 
                              size="sm" 
                              variant="outline"
                              onClick={() => {
                                setSelectedClass(cls);
                                // In a real app, you would open a schedule editing modal
                              }}
                            >
                              Edit Schedule
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="students" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <CardTitle>Class Students</CardTitle>
                  <Button size="sm" onClick={() => setShowAddStudentModal(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Student
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Student</TableHead>
                      <TableHead>Attendance</TableHead>
                      <TableHead>Performance</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {students.map((student) => (
                      <TableRow key={student.id}>
                        <TableCell>
                          <div className="font-medium">{student.name}</div>
                        </TableCell>
                        <TableCell>{student.attendance}%</TableCell>
                        <TableCell>{student.performance}%</TableCell>
                        <TableCell>
                          <Badge variant={student.status === 'active' ? 'default' : 'destructive'}>
                            {student.status === 'active' ? 'Active' : 'At Risk'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="sm">
                            View Details
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="analytics" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Class Analytics</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium">Average Attendance</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">87.5%</div>
                      <p className="text-xs text-muted-foreground">+2.5% from last month</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium">Average Performance</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">80.75%</div>
                      <p className="text-xs text-muted-foreground">+1.2% from last month</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium">At-Risk Students</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">1</div>
                      <p className="text-xs text-muted-foreground">-2 from last month</p>
                    </CardContent>
                  </Card>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}

      <ClassFormModal
        isOpen={showClassModal}
        onClose={() => {
          setShowClassModal(false);
          setSelectedClass(null);
        }}
        classData={selectedClass}
        onSuccess={() => {
          // In a real app, you would invalidate the query cache here
          queryClient.invalidateQueries({ queryKey: ['teacherClasses', teacherId] });
          toast({
            title: selectedClass ? "Class Updated" : "Class Created",
            description: `The class has been ${selectedClass ? 'updated' : 'created'} successfully.`
          });
          setShowClassModal(false);
          setSelectedClass(null);
        }}
      />
    </div>
  );
}
