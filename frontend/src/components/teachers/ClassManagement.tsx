// Enhance the existing ClassManagement component with more features
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "../ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Badge } from "../ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import { Progress } from "../ui/progress";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "../ui/dialog";
import { Label } from "../ui/label";
import { Textarea } from "../ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { Checkbox } from "../ui/checkbox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../ui/table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "../ui/dropdown-menu";
import { format } from "date-fns";
import { CalendarIcon, Plus, Search, MoreHorizontal, Users, BookOpen, Clock, Calendar as CalendarIcon2, FileText } from 'lucide-react';
import { DatePicker } from "../ui/date-picker";

// Add more comprehensive class management features
import classService from "../../services/classService";
import studentService from "../../services/studentService";
import attendanceService from "../../services/attendanceService";

// Import React Query
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

// Define interfaces for the data
interface Student {
  id: number;
  name: string;
  attendance: number;
  performance: number;
  status: string;
}

interface Lesson {
  id: number;
  title: string;
  description: string;
  date: string;
  status: string;
  materials: any[];
}

interface Announcement {
  id: number;
  title: string;
  content: string;
  date: string;
  recipients: string;
}

interface Resource {
  id: number;
  title: string;
  type: string;
  created_at: string;
}

// Add more comprehensive class management features
// Updated ClassManagement component that uses the modular components

import { ClassManagementContainer } from '../classes/ClassManagementContainer';

export function ClassManagement() {
  return <ClassManagementContainer />;
}
{
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('students');
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [isAddingLesson, setIsAddingLesson] = useState(false);
  const [isAddingAnnouncement, setIsAddingAnnouncement] = useState(false);
  const [selectedClassId, setSelectedClassId] = useState<number | null>(1); // Default to first class for demo
  
  // Form states
  const [lessonForm, setLessonForm] = useState({
    title: '',
    description: '',
    date: new Date(),
    status: 'planned',
    materials: []
  });
  
  const [announcementForm, setAnnouncementForm] = useState({
    title: '',
    content: '',
    recipients: 'all',
    sendEmail: false
  });
  
  // Fetch classes
  const { data: classesData } = useQuery({
    queryKey: ['classes'],
    queryFn: () => classService.getClasses(),
  });
  
  // Fetch students for selected class
  const { data: studentsData, isLoading: isLoadingStudents } = useQuery({
    queryKey: ['class-students', selectedClassId],
    queryFn: () => studentService.getStudentsByClass(selectedClassId!),
    enabled: !!selectedClassId,
  });
  
  // Fetch lessons for selected class
  const { data: lessonsData, isLoading: isLoadingLessons } = useQuery({
    queryKey: ['class-lessons', selectedClassId],
    queryFn: () => classService.getClassLessons ? classService.getClassLessons(selectedClassId!) : Promise.resolve([]),
    enabled: !!selectedClassId && !!classService.getClassLessons,
  });
  
  // Fetch announcements for selected class
  const { data: announcementsData, isLoading: isLoadingAnnouncements } = useQuery({
    queryKey: ['class-announcements', selectedClassId],
    queryFn: async () => {
      const res = await classService.getClassAnnouncements(selectedClassId!);
      return res?.data || [];
    },
    enabled: !!selectedClassId,
  });
  
  // Fetch resources for selected class
  const { data: resourcesData, isLoading: isLoadingResources } = useQuery({
    queryKey: ['class-resources', selectedClassId],
    queryFn: () => classService.getClassResources ? classService.getClassResources(selectedClassId!) : Promise.resolve([]),
    enabled: !!selectedClassId && !!classService.getClassResources,
  });
  
  // Create lesson mutation
  const createLessonMutation = useMutation({
    mutationFn: (data: any) => {
      if (!classService.createClassLesson) {
        return Promise.reject(new Error('createClassLesson not implemented'));
      }
      return classService.createClassLesson(selectedClassId!, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['class-lessons', selectedClassId] });
      setIsAddingLesson(false);
      setLessonForm({
        title: '',
        description: '',
        date: new Date(),
        status: 'planned',
        materials: []
      });
    }
  });
  
  // Create announcement mutation
  const createAnnouncementMutation = useMutation({
    mutationFn: (data: any) => {
      if (!classService.createClassAnnouncement) {
        return Promise.reject(new Error('createClassAnnouncement not implemented'));
      }
      return classService.createClassAnnouncement(selectedClassId!, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['class-announcements', selectedClassId] });
      setIsAddingAnnouncement(false);
      setAnnouncementForm({
        title: '',
        content: '',
        recipients: 'all',
        sendEmail: false
      });
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
  
  // Handle announcement form input changes
  const handleAnnouncementInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setAnnouncementForm(prev => ({ ...prev, [name]: value }));
  };
  
  // Handle announcement select changes
  const handleAnnouncementSelectChange = (name: string, value: string) => {
    setAnnouncementForm(prev => ({ ...prev, [name]: value }));
  };
  
  // Handle checkbox changes
  const handleCheckboxChange = (name: string, checked: boolean) => {
    setAnnouncementForm(prev => ({ ...prev, [name]: checked }));
  };
  
  // Submit lesson form
  const handleSubmitLesson = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClassId) return;
    
    const dataToSubmit = {
      ...lessonForm,
      date: format(lessonForm.date, 'yyyy-MM-dd')
    };
    
    createLessonMutation.mutate(dataToSubmit);
  };
  
  // Submit announcement form
  const handleSubmitAnnouncement = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClassId) return;
    
    createAnnouncementMutation.mutate(announcementForm);
  };

  // Use empty arrays as fallbacks for data
  const students = studentsData?.students || [];
  const lessons = lessonsData || [];
  const announcements = announcementsData || [];
  const resources = resourcesData || [];
  
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Class Management</CardTitle>
          <CardDescription>Manage your class, students, lessons, and resources</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="students">Students</TabsTrigger>
              <TabsTrigger value="lessons">Lessons</TabsTrigger>
              <TabsTrigger value="announcements">Announcements</TabsTrigger>
              <TabsTrigger value="resources">Resources</TabsTrigger>
            </TabsList>
            
            <TabsContent value="students" className="space-y-4">
              <div className="flex justify-between items-center">
                <div className="relative w-full max-w-sm">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input placeholder="Search students..." className="pl-8" />
                </div>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Student
                </Button>
              </div>
              
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
                  {students.map((student: Student) => (
                    <TableRow key={student.id}>
                      <TableCell>
                        <div className="flex items-center space-x-3">
                          <Avatar>
                            <AvatarFallback>{student.name ? student.name.toString().split(' ').map((n: string) => n[0]).join('') : 'S'}</AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium">{student.name}</p>
                            <p className="text-sm text-muted-foreground">Student ID: {student.id}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <p className="text-sm font-medium">{student.attendance}%</p>
                          <Progress 
                            value={student.attendance} 
                            className={`h-2 ${
                              student.attendance >= 90 ? "bg-green-500" :
                              student.attendance >= 80 ? "bg-blue-500" :
                              student.attendance >= 70 ? "bg-yellow-500" :
                              "bg-red-500"
                            }`} 
                          />
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <p className="text-sm font-medium">{student.performance}%</p>
                          <Progress 
                            value={student.performance} 
                            className={`h-2 ${
                              student.performance >= 90 ? "bg-green-500/20" :
                              student.performance >= 80 ? "bg-blue-500/20" :
                              student.performance >= 70 ? "bg-yellow-500/20" :
                              "bg-red-500/20"
                            }`} 
                          />
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge 
                          variant={student.status === 'active' ? 'default' : 'destructive'}
                          className={student.status === 'at-risk' ? 'bg-amber-500' : ''}
                        >
                          {student.status === 'active' ? 'Active' : 'At Risk'}
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
                            <DropdownMenuItem>View Profile</DropdownMenuItem>
                            <DropdownMenuItem>Contact Parent</DropdownMenuItem>
                            <DropdownMenuItem>View Grades</DropdownMenuItem>
                            <DropdownMenuItem>View Attendance</DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TabsContent>
            
            <TabsContent value="lessons" className="space-y-4">
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
                          <CalendarIcon2 className="h-4 w-4 text-muted-foreground" />
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
              
              <Dialog open={isAddingLesson} onOpenChange={setIsAddingLesson}>
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
                      <Button type="button" variant="outline" onClick={() => setIsAddingLesson(false)}>Cancel</Button>
                      <Button type="submit">Save Lesson</Button>
                    </DialogFooter>
                  </form>
                </DialogContent>
              </Dialog>
            </TabsContent>
            
            <TabsContent value="announcements" className="space-y-4">
              <div className="flex justify-end">
                <Button onClick={() => setIsAddingAnnouncement(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  New Announcement
                </Button>
              </div>
              
              <div className="space-y-4">
                {announcements.map((announcement) => (
                  <Card key={announcement.id}>
                    <CardHeader>
                      <CardTitle className="text-lg">{announcement.title}</CardTitle>
                      <CardDescription>
                        <div className="flex items-center space-x-2">
                          <CalendarIcon2 className="h-4 w-4" />
                          <span>{announcement.date}</span>
                        </div>
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <p>{announcement.content}</p>
                    </CardContent>
                    <CardFooter className="flex justify-between">
                      <div className="text-sm text-muted-foreground">
                        Sent to: All students
                      </div>
                      <div className="flex space-x-2">
                        <Button variant="outline" size="sm">Edit</Button>
                        <Button variant="outline" size="sm">Delete</Button>
                      </div>
                    </CardFooter>
                  </Card>
                ))}
              </div>
              
              <Dialog open={isAddingAnnouncement} onOpenChange={setIsAddingAnnouncement}>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>New Announcement</DialogTitle>
                    <DialogDescription>
                      Create a new announcement for your class.
                    </DialogDescription>
                  </DialogHeader>
                  
                  <form onSubmit={handleSubmitAnnouncement}>
                    <div className="space-y-4 py-4">
                      <div className="space-y-2">
                        <Label htmlFor="title">Title</Label>
                        <Input 
                          id="title" 
                          name="title"
                          value={announcementForm.title}
                          onChange={handleAnnouncementInputChange}
                          placeholder="Enter announcement title" 
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="content">Content</Label>
                        <Textarea 
                          id="content" 
                          name="content"
                          value={announcementForm.content}
                          onChange={handleAnnouncementInputChange}
                          placeholder="Enter announcement content" 
                          rows={5} 
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label>Recipients</Label>
                        <Select 
                          value={announcementForm.recipients}
                          onValueChange={(value) => handleAnnouncementSelectChange('recipients', value)}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select recipients" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All Students</SelectItem>
                            <SelectItem value="selected">Selected Students</SelectItem>
                            <SelectItem value="parents">Parents</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <Checkbox 
                          id="sendEmail" 
                          checked={announcementForm.sendEmail}
                          onCheckedChange={(checked) => handleCheckboxChange('sendEmail', checked as boolean)}
                        />
                        <Label htmlFor="sendEmail">Also send as email</Label>
                      </div>
                    </div>
                    
                    <DialogFooter>
                      <Button type="button" variant="outline" onClick={() => setIsAddingAnnouncement(false)}>Cancel</Button>
                      <Button type="submit">Post Announcement</Button>
                    </DialogFooter>
                  </form>
                </DialogContent>
              </Dialog>
            </TabsContent>
            
            <TabsContent value="resources" className="space-y-4">
              <div className="flex justify-between items-center">
                <div className="relative w-full max-w-sm">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input placeholder="Search resources..." className="pl-8" />
                </div>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Resource
                </Button>
              </div>
              
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Resource</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Date Added</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {resources.map((resource: Resource) => (
                    <TableRow key={resource.id}>
                      <TableCell>
                        <div className="flex items-center space-x-3">
                          <div className="p-2 rounded-full bg-purple-100">
                            <FileText className="h-4 w-4 text-purple-500" />
                          </div>
                          <div>
                            <p className="font-medium">{resource.title}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{resource.type}</Badge>
                      </TableCell>
                      <TableCell>{format(new Date(resource.created_at), 'PPP')}</TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem>View</DropdownMenuItem>
                            <DropdownMenuItem>Download</DropdownMenuItem>
                            <DropdownMenuItem>Share</DropdownMenuItem>
                            <DropdownMenuItem>Delete</DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}