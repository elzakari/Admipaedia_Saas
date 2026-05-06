import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  ArrowLeft, 
  BookOpen, 
  Calendar, 
  FileText, 
  Users, 
  Plus, 
  MoreVertical, 
  Download,
  Video,
  Image as ImageIcon,
  File,
  Megaphone
} from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';

import { Button } from '../ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Badge } from '../ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { 
  DropdownMenu, 
  DropdownMenuTrigger 
} from '../ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../ui/dialog";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Textarea } from "../ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";

import { academicService, Lesson, Announcement } from '../../services/academicService';
import authService from '../../services/authService';

interface ClassDetailsProps {
  classId: number;
  onBack: () => void;
}

export default function ClassDetails({ classId, onBack }: ClassDetailsProps) {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('overview');

  // Queries
  const { data: classData, isLoading: classLoading } = useQuery({
    queryKey: ['class', classId],
    queryFn: () => academicService.getClassById(classId),
  });

  const { data: lessonsData, isLoading: lessonsLoading } = useQuery({
    queryKey: ['class-lessons', classId],
    queryFn: () => academicService.getLessonsByClass(classId),
  });

  const { data: resourcesData, isLoading: resourcesLoading } = useQuery({
    queryKey: ['class-resources', classId],
    queryFn: () => academicService.getResourcesByClass(classId),
  });

  const { data: announcementsData, isLoading: announcementsLoading } = useQuery({
    queryKey: ['class-announcements', classId],
    queryFn: () => academicService.getAnnouncementsByClass(classId),
  });

  const { data: subjectsData, isLoading: subjectsLoading } = useQuery({
    queryKey: ['class-subjects', classId],
    queryFn: async () => {
        try {
            const data = await academicService.getClassSubjects(classId);
            return Array.isArray(data) ? data : [];
        } catch (error) {
            console.error("Failed to fetch subjects:", error);
            return [];
        }
    },
  });

  const { data: studentsData, isLoading: studentsLoading } = useQuery({
    queryKey: ['class-students', classId],
    queryFn: () => academicService.getStudentsByClass(classId),
  });

  const { data: currentUser } = useQuery({
    queryKey: ['current-user'],
    queryFn: authService.getCurrentUser,
  });

  // Mutations
  const createLessonMutation = useMutation({
    mutationFn: (data: Partial<Lesson>) => academicService.createLesson(classId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['class-lessons', classId] });
      toast.success('Lesson created successfully');
      setIsLessonModalOpen(false);
    },
    onError: (error: any) => toast.error(error.message || 'Failed to create lesson'),
  });

  const createAnnouncementMutation = useMutation({
    mutationFn: (data: Partial<Announcement>) => academicService.createAnnouncement(classId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['class-announcements', classId] });
      toast.success('Announcement created successfully');
      setIsAnnouncementModalOpen(false);
    },
    onError: (error: any) => toast.error(error.message || 'Failed to create announcement'),
  });

  const createResourceMutation = useMutation({
    mutationFn: (data: FormData) => academicService.createResource(classId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['class-resources', classId] });
      toast.success('Resource uploaded successfully');
      setIsResourceModalOpen(false);
    },
    onError: (error: any) => toast.error(error.message || 'Failed to upload resource'),
  });

  // Modal States
  const [isLessonModalOpen, setIsLessonModalOpen] = useState(false);
  const [isResourceModalOpen, setIsResourceModalOpen] = useState(false);
  const [isAnnouncementModalOpen, setIsAnnouncementModalOpen] = useState(false);

  // Form States
  const [newLesson, setNewLesson] = useState<Partial<Lesson>>({
    title: '',
    description: '',
    content: '',
    subject_id: 0,
    start_time: '',
    end_time: '',
  });

  const [newAnnouncement, setNewAnnouncement] = useState<Partial<Announcement>>({
    title: '',
    content: '',
  });

  const [newResource, setNewResource] = useState<{
    title: string;
    description: string;
    file: File | null;
    subject_id: number;
  }>({
    title: '',
    description: '',
    file: null,
    subject_id: 0,
  });

  if (classLoading) {
    return <div className="flex justify-center items-center h-96">Loading class details...</div>;
  }

  if (!classData) {
    return <div className="flex justify-center items-center h-96">Class not found</div>;
  }

  const handleCreateLesson = (e: React.FormEvent) => {
    e.preventDefault();
    createLessonMutation.mutate({
      ...newLesson,
      class_id: classId,
      teacher_id: currentUser?.id || 1, 
    });
  };

  const handleCreateAnnouncement = (e: React.FormEvent) => {
    e.preventDefault();
    createAnnouncementMutation.mutate({
      ...newAnnouncement,
      class_id: classId,
      teacher_id: currentUser?.id || 1, 
    });
  };

  const handleCreateResource = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newResource.file) {
      toast.error('Please select a file');
      return;
    }

    const formData = new FormData();
    formData.append('title', newResource.title);
    formData.append('description', newResource.description);
    formData.append('file', newResource.file);
    if (newResource.subject_id) {
      formData.append('subject_id', newResource.subject_id.toString());
    }
    formData.append('class_id', classId.toString());
    formData.append('teacher_id', (currentUser?.id || 1).toString()); 

    createResourceMutation.mutate(formData);
  };

  const getFileIcon = (type?: string) => {
    if (!type) return <File className="h-5 w-5" />;
    if (type.includes('image')) return <ImageIcon className="h-5 w-5 text-purple-500" />;
    if (type.includes('video')) return <Video className="h-5 w-5 text-red-500" />;
    if (type.includes('pdf')) return <FileText className="h-5 w-5 text-red-400" />;
    return <File className="h-5 w-5 text-blue-500" />;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4">
        <Button 
          variant="ghost" 
          className="w-fit pl-0 hover:bg-transparent hover:text-primary" 
          onClick={onBack}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Classes
        </Button>
        
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">{classData.name}</h1>
            <p className="text-muted-foreground mt-1">
              {classData.grade_level} • {classData.academic_year_name || 'Current Year'} • Room {classData.room_number || 'N/A'}
            </p>
          </div>
          <Badge variant={classData.status === 'active' || !classData.status ? 'default' : 'secondary'}>
            {classData.status || 'Active'}
          </Badge>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="lessons">Lessons</TabsTrigger>
          <TabsTrigger value="resources">Resources</TabsTrigger>
          <TabsTrigger value="announcements">Announcements</TabsTrigger>
          <TabsTrigger value="students">Students</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Students</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{classData.current_enrollment}</div>
                <p className="text-xs text-muted-foreground">/{classData.capacity} capacity</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Class Teacher</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-lg truncate">{classData.class_teacher_name || 'Not Assigned'}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Subjects</CardTitle>
                <BookOpen className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{subjectsData?.length || 0}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Lessons This Week</CardTitle>
                <Calendar className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">0</div>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
            <Card className="col-span-4">
              <CardHeader>
                <CardTitle>Recent Activity</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {/* Activity items placeholder */}
                  <p className="text-sm text-muted-foreground">No recent activity.</p>
                </div>
              </CardContent>
            </Card>
            <Card className="col-span-3">
              <CardHeader>
                <CardTitle>Upcoming Schedule</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {/* Schedule items placeholder */}
                  <p className="text-sm text-muted-foreground">No upcoming classes scheduled.</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Lessons Tab */}
        <TabsContent value="lessons" className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold">Lessons</h2>
            <Dialog open={isLessonModalOpen} onOpenChange={setIsLessonModalOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Create Lesson
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                  <DialogTitle>Create New Lesson</DialogTitle>
                  <DialogDescription>
                    Schedule a new lesson for this class.
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleCreateLesson} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="title">Title</Label>
                    <Input 
                      id="title" 
                      value={newLesson.title} 
                      onChange={(e) => setNewLesson({...newLesson, title: e.target.value})}
                      required 
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="subject">Subject</Label>
                    <Select 
                      onValueChange={(value) => setNewLesson({...newLesson, subject_id: parseInt(value)})}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select a subject" />
                      </SelectTrigger>
                      <SelectContent>
                        {subjectsData?.map((subject) => (
                          <SelectItem key={subject.id} value={subject.id.toString()}>
                            {subject.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="start_time">Start Time</Label>
                      <Input 
                        id="start_time" 
                        type="datetime-local"
                        value={newLesson.start_time} 
                        onChange={(e) => setNewLesson({...newLesson, start_time: e.target.value})}
                        required 
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="end_time">End Time</Label>
                      <Input 
                        id="end_time" 
                        type="datetime-local"
                        value={newLesson.end_time} 
                        onChange={(e) => setNewLesson({...newLesson, end_time: e.target.value})}
                        required 
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="description">Description</Label>
                    <Textarea 
                      id="description" 
                      value={newLesson.description} 
                      onChange={(e) => setNewLesson({...newLesson, description: e.target.value})}
                    />
                  </div>
                  <DialogFooter>
                    <Button type="submit" disabled={createLessonMutation.isPending}>
                      {createLessonMutation.isPending ? 'Creating...' : 'Create Lesson'}
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {lessonsLoading ? (
              <p>Loading lessons...</p>
            ) : lessonsData?.data?.length === 0 ? (
              <div className="col-span-full text-center py-10 text-muted-foreground">
                No lessons found. Create one to get started.
              </div>
            ) : (
              lessonsData?.data?.map((lesson) => (
                <Card key={lesson.id}>
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <CardTitle className="text-lg">{lesson.title}</CardTitle>
                      <Badge variant="outline">{lesson.subject_name}</Badge>
                    </div>
                    <CardDescription>
                      {format(new Date(lesson.start_time), 'PPP p')}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground line-clamp-3">
                      {lesson.description || 'No description provided.'}
                    </p>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>

        {/* Resources Tab */}
        <TabsContent value="resources" className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold">Resources</h2>
            <Dialog open={isResourceModalOpen} onOpenChange={setIsResourceModalOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Upload Resource
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                  <DialogTitle>Upload Resource</DialogTitle>
                  <DialogDescription>
                    Share documents, images, or other files with the class.
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleCreateResource} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="resource-title">Title</Label>
                    <Input 
                      id="resource-title" 
                      value={newResource.title} 
                      onChange={(e) => setNewResource({...newResource, title: e.target.value})}
                      required 
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="resource-subject">Subject (Optional)</Label>
                    <Select 
                      onValueChange={(value) => setNewResource({...newResource, subject_id: parseInt(value)})}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select a subject" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="0">General (No Subject)</SelectItem>
                        {subjectsData?.map((subject) => (
                          <SelectItem key={subject.id} value={subject.id.toString()}>
                            {subject.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="resource-file">File</Label>
                    <Input 
                      id="resource-file" 
                      type="file"
                      onChange={(e) => setNewResource({...newResource, file: e.target.files?.[0] || null})}
                      required 
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="resource-desc">Description</Label>
                    <Textarea 
                      id="resource-desc" 
                      value={newResource.description} 
                      onChange={(e) => setNewResource({...newResource, description: e.target.value})}
                    />
                  </div>
                  <DialogFooter>
                    <Button type="submit" disabled={createResourceMutation.isPending}>
                      {createResourceMutation.isPending ? 'Uploading...' : 'Upload Resource'}
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </div>

          <Card>
            <CardContent className="p-0">
              {resourcesLoading ? (
                <div className="p-4">Loading resources...</div>
              ) : resourcesData?.data?.length === 0 ? (
                <div className="text-center py-10 text-muted-foreground">
                  No resources uploaded yet.
                </div>
              ) : (
                <div className="divide-y">
                  {resourcesData?.data?.map((resource) => (
                    <div key={resource.id} className="flex items-center justify-between p-4 hover:bg-muted/50">
                      <div className="flex items-center gap-4">
                        <div className="p-2 bg-muted rounded-lg">
                          {getFileIcon(resource.file_type)}
                        </div>
                        <div>
                          <h3 className="font-medium">{resource.title}</h3>
                          <p className="text-sm text-muted-foreground">
                            {resource.teacher_name} • {format(new Date(resource.created_at), 'PPP')}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {resource.file_url && (
                          <a href={resource.file_url} target="_blank" rel="noopener noreferrer">
                            <Button variant="ghost" size="sm">
                              <Download className="h-4 w-4" />
                            </Button>
                          </a>
                        )}
                        <Button variant="ghost" size="sm">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Announcements Tab */}
        <TabsContent value="announcements" className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold">Announcements</h2>
            <Dialog open={isAnnouncementModalOpen} onOpenChange={setIsAnnouncementModalOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Post Announcement
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                  <DialogTitle>Post Announcement</DialogTitle>
                  <DialogDescription>
                    Send an announcement to students and parents of this class.
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleCreateAnnouncement} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="announcement-title">Title</Label>
                    <Input 
                      id="announcement-title" 
                      value={newAnnouncement.title} 
                      onChange={(e) => setNewAnnouncement({...newAnnouncement, title: e.target.value})}
                      required 
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="announcement-content">Content</Label>
                    <Textarea 
                      id="announcement-content" 
                      value={newAnnouncement.content} 
                      onChange={(e) => setNewAnnouncement({...newAnnouncement, content: e.target.value})}
                      required
                      rows={4}
                    />
                  </div>
                  <DialogFooter>
                    <Button type="submit" disabled={createAnnouncementMutation.isPending}>
                      {createAnnouncementMutation.isPending ? 'Posting...' : 'Post Announcement'}
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </div>

          <div className="space-y-4">
            {announcementsLoading ? (
              <p>Loading announcements...</p>
            ) : announcementsData?.data?.length === 0 ? (
              <div className="text-center py-10 text-muted-foreground">
                No announcements posted yet.
              </div>
            ) : (
              announcementsData?.data?.map((announcement) => (
                <Card key={announcement.id}>
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-100 rounded-full">
                          <Megaphone className="h-4 w-4 text-blue-600" />
                        </div>
                        <div>
                          <CardTitle className="text-lg">{announcement.title}</CardTitle>
                          <CardDescription>
                            Posted by {announcement.teacher_name} on {format(new Date(announcement.created_at), 'PPP')}
                          </CardDescription>
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="whitespace-pre-wrap">{announcement.content}</p>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>

        {/* Students Tab */}
        <TabsContent value="students" className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold">Students</h2>
            <Button variant="outline" onClick={() => window.location.href = '/students'}>
              <Users className="mr-2 h-4 w-4" />
              Manage All Students
            </Button>
          </div>
          
          <Card>
            <CardContent className="p-0">
              {studentsLoading ? (
                <div className="p-4 text-center">Loading students...</div>
              ) : !studentsData || studentsData.data.length === 0 ? (
                <div className="text-center py-10 text-muted-foreground">
                  No students enrolled in this class yet.
                </div>
              ) : (
                <div className="divide-y">
                  {studentsData.data.map((student) => (
                    <div key={student.id} className="flex items-center justify-between p-4 hover:bg-muted/50">
                      <div className="flex items-center gap-4">
                        <Avatar className="h-10 w-10">
                          <AvatarImage src={student.profile_picture} />
                          <AvatarFallback>{student.first_name[0]}{student.last_name[0]}</AvatarFallback>
                        </Avatar>
                        <div>
                          <h3 className="font-medium">{student.full_name}</h3>
                          <p className="text-sm text-muted-foreground">
                            {student.admission_number} • {student.gender}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={student.status === 'active' ? 'default' : 'secondary'}>
                          {student.status}
                        </Badge>
                        <Button variant="ghost" size="sm" onClick={() => window.location.href = `/students/${student.id}`}>
                          <FileText className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
